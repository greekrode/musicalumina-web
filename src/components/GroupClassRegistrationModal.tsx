import { zodResolver } from "@hookform/resolvers/zod";
import { track } from "@vercel/analytics";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";
import { z } from "zod";
import { useLanguage } from "../lib/LanguageContext";
import { supabase } from "../lib/supabase";
import { WhatsAppService } from "../lib/whatsapp";
import FileUpload from "./FileUpload";
import LoadingModal from "./LoadingModal";
import Modal from "./Modal";
import ThankYouModal from "./ThankYouModal";
import { Input } from "./ui/input";
import { LarkService } from "@/lib/lark";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

interface FileState {
  file: File | null;
  error?: string;
}

interface FileStates {
  birth_certificate?: FileState;
  payment_receipt: FileState;
}

interface GroupClassRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  eventName: string;
  onOpenTerms?: () => void;
}

function createRegistrationSchema(t: (key: string) => string) {
  return z.object({
    registrant_status: z.enum(["personal", "parents", "teacher"]),
    registrant_name: z
      .string()
      .optional()
      .transform((val) => val || "")
      .pipe(z.string().max(100, t("validation.maxNameLength"))),
    registrant_whatsapp: z
      .string()
      .regex(/^\+[1-9]\d{1,14}$/, t("validation.invalidPhone")),
    registrant_email: z.string().email(t("validation.invalidEmail")),
    participant_name: z
      .string()
      .min(3, t("validation.minName"))
      .max(100, t("validation.maxNameLength")),
    participant_age: z
      .string()
      .min(1, "Please enter participant's age")
      .max(3, "Age cannot exceed 3 digits"),
    bank_name: z
      .string()
      .min(1, t("validation.enterBankName"))
      .max(100, t("validation.maxBankNameLength")),
    bank_account_number: z
      .string()
      .regex(/^\d+$/, t("validation.onlyNumbers"))
      .min(1, t("validation.enterAccountNumber"))
      .max(25, t("validation.maxAccountLength")),
    bank_account_name: z
      .string()
      .min(1, t("validation.enterAccountName"))
      .max(100, t("validation.maxAccountNameLength")),
    terms_accepted: z.literal(true, {
      errorMap: () => ({ message: t("validation.acceptTerms") }),
    }),
  });
}

type RegistrationForm = z.infer<ReturnType<typeof createRegistrationSchema>>;

export default function GroupClassRegistrationModal({
  isOpen,
  onClose,
  eventId,
  eventName,
  onOpenTerms,
}: GroupClassRegistrationModalProps) {
  const { t, language } = useLanguage();
  const [showThankYou, setShowThankYou] = useState(false);
  const [registrationRef, setRegistrationRef] = useState("");
  const [registeredName, setRegisteredName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showLoadingModal, setShowLoadingModal] = useState(false);
  const [files, setFiles] = useState<FileStates>({
    payment_receipt: { file: null },
  });

  const registrationSchema = createRegistrationSchema(t);

  const {
    register,
    handleSubmit,
    setError,
    control,
    reset,
    formState: { errors },
  } = useForm<RegistrationForm>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      registrant_status: "personal",
      registrant_whatsapp: "",
    },
  });

  const handleFileChange = (type: keyof FileStates) => (file: File | null) => {
    if (file && file.size > MAX_FILE_SIZE) {
      setFiles((prev) => ({
        ...prev,
        [type]: { file: null, error: t("validation.fileSizeLimit") },
      }));
      return;
    }

    setFiles((prev) => ({
      ...prev,
      [type]: { file, error: undefined },
    }));
  };

  const validateFiles = () => {
    let isValid = true;
    const newFiles = { ...files };

    if (!files.payment_receipt.file) {
      newFiles.payment_receipt.error = t("validation.uploadPayment");
      isValid = false;
    }

    setFiles(newFiles);
    return isValid;
  };

  const uploadFile = async (file: File, path: string) => {
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Math.random().toString(36).slice(2)}.${fileExt}`;
      const filePath = `${path}/${fileName}`;

      const { error: uploadError, data } = await supabase.storage
        .from("registration-documents")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        console.error("Upload error:", uploadError);
        throw new Error(`Error uploading ${path}: ${uploadError.message}`);
      }

      if (!data?.path) {
        throw new Error("Upload succeeded but no path returned");
      }

      const { data: signedUrlData, error: signedUrlError } =
        await supabase.storage
          .from("registration-documents")
          .createSignedUrl(data.path, 31536000); // 1 year expiry

      if (signedUrlError || !signedUrlData?.signedUrl) {
        console.error("Signed URL error:", signedUrlError);
        throw new Error("Failed to generate signed URL for uploaded file");
      }

      return signedUrlData.signedUrl;
    } catch (error) {
      console.error("Error uploading file:", error);
      throw error;
    }
  };

  const onSubmit = async (data: RegistrationForm) => {
    try {
      setIsSubmitting(true);
      setShowLoadingModal(true);

      // Validate files first
      if (!validateFiles()) {
        setIsSubmitting(false);
        setShowLoadingModal(false);
        return;
      }

      // Upload files to storage
      const uploadPromises = [
        uploadFile(files.payment_receipt.file!, "payment-receipts"),
      ];

      const uploadedFiles = await Promise.all(uploadPromises);
      const [paymentReceiptUrl] = uploadedFiles;

      if (!data.registrant_name || data.registrant_name === "") {
        data.registrant_name = data.participant_name;
      }

      // Insert registration data
      const { data: registration, error: registrationError } = await supabase
        .from("registrations")
        .insert([
          {
            event_id: eventId,
            registrant_name: data.registrant_name,
            registrant_whatsapp: data.registrant_whatsapp,
            registrant_email: data.registrant_email,
            participant_name: data.participant_name,
            participant_age: parseInt(data.participant_age),
            bank_name: data.bank_name,
            bank_account_number: data.bank_account_number,
            bank_account_name: data.bank_account_name,
            payment_receipt_url: paymentReceiptUrl,
            status: "pending",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (registrationError) {
        throw registrationError;
      }

      // Generate reference number (last 4 of UUID - last 4 of phone)
      const uuid = registration.id;
      const phone = data.registrant_whatsapp.replace(/\D/g, "");
      const refNumber = `${uuid.slice(-4)}-${phone.slice(-4)}`;

      // Track registration
      track("group_class_registration", {
        eventId,
        eventName,
      });

      // Track with Umami
      (window as any).umami?.track("group_class_registration_submitted", {
        eventId,
        registrantStatus: data.registrant_status,
      });

      const { data: eventData, error: eventError } = await supabase
        .from("events")
        .select("lark_base, lark_table")
        .eq("id", eventId)
        .single();

      if (eventError) {
        console.error("Error fetching event data for Lark:", eventError);
      } else if (eventData.lark_base && eventData.lark_table) {
        // Send data to Lark
        try {
          // Add a small delay to ensure URLs are propagated
          await new Promise((resolve) => setTimeout(resolve, 500));

          await LarkService.sendRegistrationData({
            event: {
              id: eventId,
              lark_base: eventData.lark_base,
              lark_table: eventData.lark_table,
            },
            registration: {
              ref_code: refNumber,
              registrant_name: data.registrant_name,
              registrant_email: data.registrant_email,
              registrant_whatsapp: data.registrant_whatsapp,
              participant_name: data.participant_name,
              participant_age: parseInt(data.participant_age),
              bank_name: data.bank_name,
              bank_account_name: data.bank_account_name,
              bank_account_number: data.bank_account_number,
              payment_receipt_url: paymentReceiptUrl,
              created_at: registration.created_at,
            },
          });
        } catch (error) {
          console.error("Error sending data to Lark:", error);
        }
      }

      try {
        // Send WhatsApp notification
        await WhatsAppService.sendGroupClassRegistrationMessage({
          registrant_name: data.registrant_name,
          registrant_email: data.registrant_email,
          registrant_whatsapp: data.registrant_whatsapp,
          participant_name: data.participant_name,
          participant_age: parseInt(data.participant_age),
          registration_ref_code: refNumber,
          event_name: eventName,
          language,
        });
      } catch (error) {
        console.error("Error sending WhatsApp message:", error);
      }

      setRegistrationRef(refNumber);
      setRegisteredName(data.participant_name);
      setShowThankYou(true);
      reset();
      setFiles({
        payment_receipt: { file: null },
      });
    } catch (error) {
      console.error("Registration failed:", error);
      setError("root", {
        type: "manual",
        message:
          error instanceof Error
            ? error.message
            : "Registration failed. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
      setShowLoadingModal(false);
    }
  };

  const handleClose = () => {
    setShowThankYou(false);
    onClose();
  };

  if (showThankYou) {
    return (
      <ThankYouModal
        isOpen={true}
        onClose={handleClose}
        participantName={registeredName}
        referenceNumber={registrationRef}
      />
    );
  }

  return (
    <>
      <LoadingModal isOpen={showLoadingModal} />
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={t("groupClass.registration.title")}
        maxWidth="2xl"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Registrant Data */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">
              {t("registration.registrantData")}
            </h3>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                {t("registration.registrantName")}
              </label>
              <Input
                type="text"
                {...register("registrant_name")}
                className="mt-1 block w-full"
              />
              {errors.registrant_name && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.registrant_name.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                {t("registration.whatsappNumber")}
              </label>
              <Controller
                name="registrant_whatsapp"
                control={control}
                render={({ field: { onChange, value } }) => (
                  <PhoneInput
                    country="id"
                    preferredCountries={["id", "sg", "my"]}
                    enableSearch
                    searchPlaceholder="Search country..."
                    inputClass="!w-full !py-2 !text-base !rounded-md !border-gray-300 focus:!border-marigold focus:!ring focus:!ring-marigold focus:!ring-opacity-50"
                    buttonClass="!border-gray-300 !rounded-l-md hover:!bg-gray-50"
                    dropdownClass="!text-base"
                    value={value}
                    onChange={(phone) => {
                      onChange(`+${phone}`);
                    }}
                    placeholder={t("registration.whatsappPlaceholder")}
                  />
                )}
              />
              {errors.registrant_whatsapp && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.registrant_whatsapp.message}
                </p>
              )}
              <p className="mt-1 text-sm text-gray-500">
                {t("registration.whatsappHelp")}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                {t("registration.email")}
              </label>
              <Input
                type="email"
                {...register("registrant_email")}
                className="mt-1 block w-full"
              />
              {errors.registrant_email && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.registrant_email.message}
                </p>
              )}
            </div>
          </div>

          {/* Participant Data */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">
              {t("registration.participantData")}
            </h3>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                {t("registration.fullName")}
              </label>
              <Input
                type="text"
                {...register("participant_name")}
                className="mt-1 block w-full"
              />
              {errors.participant_name && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.participant_name.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                {t("groupClass.registration.participantAge")}
              </label>
              <Input
                type="number"
                {...register("participant_age")}
                className="mt-1 block w-full"
              />
              {errors.participant_age && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.participant_age.message}
                </p>
              )}
            </div>
          </div>

          {/* Document Uploads */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">
              {t("registration.documents")}
            </h3>
          </div>
          {/* Payment Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">
              {t("registration.paymentInfo")}
            </h3>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                {t("registration.bankName")}
              </label>
              <Input
                type="text"
                {...register("bank_name")}
                className="mt-1 block w-full"
              />
              {errors.bank_name && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.bank_name.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                {t("registration.accountNumber")}
              </label>
              <Input
                type="text"
                {...register("bank_account_number")}
                className="mt-1 block w-full"
              />
              {errors.bank_account_number && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.bank_account_number.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                {t("registration.accountHolderName")}
              </label>
              <Input
                type="text"
                {...register("bank_account_name")}
                className="mt-1 block w-full"
              />
              {errors.bank_account_name && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.bank_account_name.message}
                </p>
              )}
            </div>

            <FileUpload
              label={t("registration.paymentReceipt")}
              accept=".pdf,.jpg,.jpeg,.png"
              registration={{
                name: "payment_receipt",
                onChange: async () => true,
                onBlur: async () => true,
              }}
              error={files.payment_receipt.error}
              onFileChange={handleFileChange("payment_receipt")}
            />
          </div>

          {/* Terms and Conditions */}
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              {...register("terms_accepted")}
              className="h-4 w-4 rounded border-gray-300 text-marigold focus:ring-marigold"
            />
            <label className="text-sm text-gray-600">
              {t("registration.termsAndConditions")}{" "}
              <button
                type="button"
                onClick={onOpenTerms}
                className="text-marigold hover:text-marigold/90"
              >
                {t("registration.termsLink")}
              </button>
            </label>
          </div>
          {errors.terms_accepted && (
            <p className="mt-1 text-sm text-red-600">
              {errors.terms_accepted.message}
            </p>
          )}

          {/* Error Message */}
          {errors.root && (
            <p className="text-sm text-red-600">{errors.root.message}</p>
          )}

          {/* Form Actions */}
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-marigold focus:ring-offset-2"
            >
              {t("registration.cancel")}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-md border border-transparent bg-marigold px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-marigold/90 focus:outline-none focus:ring-2 focus:ring-marigold focus:ring-offset-2 disabled:opacity-50"
            >
              {isSubmitting
                ? t("registration.submitting")
                : t("registration.submit")}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
