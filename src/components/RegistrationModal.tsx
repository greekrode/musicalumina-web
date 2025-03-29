import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { supabase } from "../lib/supabase";
import FileUpload from "./FileUpload";
import Modal from "./Modal";
import ThankYouModal from "./ThankYouModal";
import LoadingModal from "./LoadingModal";
import { useState } from "react";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";
import { useLanguage } from "../lib/LanguageContext";
import { track } from "@vercel/analytics";
import { loadEmailTemplate } from "../lib/emailTemplates";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

interface FileState {
  file: File | null;
  error?: string;
}

interface FileStates {
  birth_certificate: FileState;
  song_pdf: FileState;
  payment_receipt: FileState;
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
    category_id: z.string().uuid(t("validation.selectCategory")),
    subcategory_id: z.string().uuid(t("validation.selectSubCategory")),
    song_title: z
      .string()
      .min(1, t("validation.enterSongTitle"))
      .max(150, t("validation.maxSongTitleLength")),
    song_duration: z.string().max(10, t("validation.maxDurationLength")),
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

interface Category {
  id: string;
  name: string;
  repertoire?: string[];
  event_subcategories: Array<{
    id: string;
    name: string;
    age_requirement: string;
    repertoire?: string[];
  }>;
}

interface RegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  eventName: string;
  categories: Category[];
  onOpenTerms: () => void;
}

function RegistrationModal({
  isOpen,
  onClose,
  eventId,
  eventName,
  categories = [],
  onOpenTerms,
}: RegistrationModalProps) {
  const { t, language } = useLanguage();
  const [showThankYou, setShowThankYou] = useState(false);
  const [registrationRef, setRegistrationRef] = useState("");
  const [registeredName, setRegisteredName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showLoadingModal, setShowLoadingModal] = useState(false);
  const [files, setFiles] = useState<FileStates>({
    birth_certificate: { file: null },
    song_pdf: { file: null },
    payment_receipt: { file: null },
  });

  const registrationSchema = createRegistrationSchema(t);

  const {
    register,
    handleSubmit,
    watch,
    setError,
    control,
    reset,
    formState: { errors },
  } = useForm<RegistrationForm>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      registrant_status: "personal",
      registrant_whatsapp: "",
      song_duration: "",
    },
  });

  const registrantStatus = watch("registrant_status") as
    | "personal"
    | "parents"
    | "teacher";
  const categoryId = watch("category_id") as string;

  const selectedCategory = categories.find((cat) => cat.id === categoryId);
  const hasRepertoire =
    (selectedCategory?.repertoire && selectedCategory.repertoire.length > 0) ||
    selectedCategory?.event_subcategories.some(
      (sub: { repertoire?: string[] }) =>
        sub.repertoire && sub.repertoire.length > 0
    );

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

    if (!files.birth_certificate.file) {
      newFiles.birth_certificate.error = t("validation.uploadBirthCert");
      isValid = false;
    }

    if (!files.payment_receipt.file) {
      newFiles.payment_receipt.error = t("validation.uploadPayment");
      isValid = false;
    }

    if (!hasRepertoire && !files.song_pdf.file) {
      newFiles.song_pdf.error = t("validation.uploadSongPdf");
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

      // Validate song duration if no repertoire
      if (!hasRepertoire && !data.song_duration) {
        setError("song_duration", {
          type: "manual",
          message: "Please enter the song duration",
        });
        setIsSubmitting(false);
        setShowLoadingModal(false);
        return;
      }

      // Upload files to storage
      const uploadPromises = [
        uploadFile(files.birth_certificate.file!, "birth-certificates"),
        uploadFile(files.payment_receipt.file!, "payment-receipts"),
      ];

      if (files.song_pdf.file) {
        uploadPromises.push(uploadFile(files.song_pdf.file, "song-pdfs"));
      }

      const uploadedFiles = await Promise.all(uploadPromises);
      const [birthCertUrl, paymentReceiptUrl, songPdfUrl] = uploadedFiles;

      if (!data.registrant_name || data.registrant_name === "") {
        data.registrant_name = data.participant_name;
      }

      // Get category and subcategory names
      const category = categories.find((cat) => cat.id === data.category_id);
      const subCategory = category?.event_subcategories.find(
        (sub) => sub.id === data.subcategory_id
      );

      // Submit registration data
      const { data: registration, error: registrationError } = await supabase
        .from("registrations")
        .insert({
          event_id: eventId,
          registrant_status: data.registrant_status,
          registrant_name: data.registrant_name,
          registrant_whatsapp: data.registrant_whatsapp,
          registrant_email: data.registrant_email,
          participant_name: data.participant_name,
          category_id: data.category_id,
          subcategory_id: data.subcategory_id,
          song_title: data.song_title,
          song_duration: data.song_duration,
          birth_certificate_url: birthCertUrl,
          song_pdf_url: songPdfUrl || null,
          bank_name: data.bank_name,
          bank_account_number: data.bank_account_number,
          bank_account_name: data.bank_account_name,
          payment_receipt_url: paymentReceiptUrl,
          status: "pending",
        })
        .select()
        .single();

      if (registrationError) {
        throw new Error(`Registration failed: ${registrationError.message}`);
      }

      // Generate reference number (last 4 of UUID - last 4 of phone)
      const uuid = registration.id;
      const phone = data.registrant_whatsapp.replace(/\D/g, "");
      const refNumber = `${uuid.slice(-4)}-${phone.slice(-4)}`;

      // Add analytics tracking
      track("event_registration", {
        eventId,
        categoryId: data.category_id,
        subcategoryId: data.subcategory_id,
      });

      // Track with Umami
      (window as any).umami?.track('registration_submitted', { 
        eventId,
        registrantStatus: data.registrant_status,
        categoryId: data.category_id,
        subcategoryId: data.subcategory_id
      });

      // Get event details for Lark integration
      const { data: eventData, error: eventError } = await supabase
        .from("events")
        .select("lark_base, lark_table")
        .eq("id", eventId)
        .single();

      if (eventError) {
        console.error("Error fetching event data for Lark:", eventError);
      } else if (eventData.lark_base && eventData.lark_table) {
        // Send data to Lark form
        try {
          const { error: larkError } = await supabase.functions.invoke("send-to-lark", {
            body: {
              data: {
                event: {
                  id: eventId,
                  lark_base: eventData.lark_base,
                  lark_table: eventData.lark_table,
                },
                registration: {
                  ref_code: refNumber,
                  registrant_status: data.registrant_status,
                  registrant_name: data.registrant_name,
                  registrant_email: data.registrant_email,
                  registrant_whatsapp: data.registrant_whatsapp,
                  participant_name: data.participant_name,
                  category_name: category?.name || "",
                  subcategory_name: subCategory?.name || "",
                  song_title: data.song_title,
                  song_duration: data.song_duration || "",
                  birth_certificate_url: birthCertUrl,
                  song_pdf_url: songPdfUrl,
                  bank_name: data.bank_name,
                  bank_account_name: data.bank_account_name,
                  bank_account_number: data.bank_account_number,
                  payment_receipt_url: paymentReceiptUrl,
                  created_at: registration.created_at,
                },
              },
            },
          });

          if (larkError) {
            console.error("Error sending data to Lark:", larkError);
          }
        } catch (error) {
          console.error("Error sending data to Lark:", error);
        }
      }

      // Send confirmation email
      try {
        console.log('Current language:', language);
        const templateData = {
          registrant_status: data.registrant_status,
          registrant_name: data.registrant_name || data.participant_name,
          registrant_email: data.registrant_email,
          registrant_whatsapp: data.registrant_whatsapp,
          participant_name: data.participant_name,
          song_title: data.song_title,
          song_duration: data.song_duration || '',
          category: category?.name || '',
          sub_category: subCategory?.name || '',
          registration_ref_code: refNumber,
          event_name: eventName
        };
        
        const templateHtml = loadEmailTemplate(language, templateData);
        console.log('Template loaded successfully');
        
        const { error: emailError } = await supabase.functions.invoke('send-registration-email', {
          body: {
            data: {
              ...templateData,
              registrationId: registration.id,
              language,
              template_html: templateHtml
            }
          }
        });

        if (emailError) {
          console.error("Error sending confirmation email:", emailError);
        }
      } catch (error) {
        console.error("Error sending confirmation email:", error);
      }

      setRegistrationRef(refNumber);
      setRegisteredName(data.participant_name);
      setShowThankYou(true);
      reset();
      setFiles({
        birth_certificate: { file: null },
        song_pdf: { file: null },
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
      <>
        <ThankYouModal
          isOpen={true}
          onClose={handleClose}
          participantName={registeredName}
          referenceNumber={registrationRef}
        />
      </>
    );
  }

  return (
    <>
      <LoadingModal isOpen={showLoadingModal} />
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={t("registration.title")}
        maxWidth="2xl"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          {errors.root && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="flex">
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">
                    {errors.root.message}
                  </h3>
                </div>
              </div>
            </div>
          )}

          {/* Registrant's Data */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">
              {t("registration.registrantData")}
            </h3>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                {t("registration.registrantStatus")}
              </label>
              <select
                {...register("registrant_status")}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-marigold focus:ring focus:ring-marigold focus:ring-opacity-50"
              >
                <option value="personal">{t("registration.personal")}</option>
                <option value="parents">{t("registration.parents")}</option>
                <option value="teacher">{t("registration.teacher")}</option>
              </select>
            </div>

            {registrantStatus !== "personal" && (
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  {t("registration.registrantName")}
                </label>
                <input
                  type="text"
                  {...register("registrant_name")}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-marigold focus:ring focus:ring-marigold focus:ring-opacity-50"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700">
                {t("registration.whatsappNumber")}
              </label>
              <div className="mt-1">
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
                <p className="mt-1 text-xs text-gray-500">
                  {t("registration.whatsappHelp")}
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                {t("registration.email")}
              </label>
              <input
                type="email"
                {...register("registrant_email")}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-marigold focus:ring focus:ring-marigold focus:ring-opacity-50"
              />
              {errors.registrant_email && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.registrant_email.message}
                </p>
              )}
            </div>
          </div>

          {/* Participant's Data */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">
              {t("registration.participantData")}
            </h3>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                {t("registration.fullName")}
              </label>
              <input
                type="text"
                {...register("participant_name")}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-marigold focus:ring focus:ring-marigold focus:ring-opacity-50"
              />
              {errors.participant_name && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.participant_name.message}
                </p>
              )}
            </div>

            <div className="flex gap-4">
              <div className="w-[40%]">
                <label className="block text-sm font-medium text-gray-700">
                  {t("registration.category")}
                </label>
                <select
                  {...register("category_id")}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-marigold focus:ring focus:ring-marigold focus:ring-opacity-50"
                >
                  <option value="">{t("registration.selectCategory")}</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
                {errors.category_id && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.category_id.message}
                  </p>
                )}
              </div>

              {selectedCategory && selectedCategory.event_subcategories && (
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700">
                    {t("registration.subCategory")}
                  </label>
                  <select
                    {...register("subcategory_id")}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-marigold focus:ring focus:ring-marigold focus:ring-opacity-50"
                  >
                    <option value="">
                      {t("registration.selectSubCategory")}
                    </option>
                    {selectedCategory.event_subcategories.map((sub) => (
                      <option key={sub.id} value={sub.id}>
                        {`${sub.name} (${sub.age_requirement})`}
                      </option>
                    ))}
                  </select>
                  {errors.subcategory_id && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.subcategory_id.message}
                    </p>
                  )}
                </div>
              )}
            </div>

            {hasRepertoire ? (
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  {t("registration.songSelection")}
                </label>
                <select
                  {...register("song_title")}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-marigold focus:ring focus:ring-marigold focus:ring-opacity-50"
                >
                  <option value="">{t("registration.selectSong")}</option>
                  {(selectedCategory?.repertoire || []).map((song, index) => (
                    <option key={index} value={song}>
                      {song}
                    </option>
                  ))}
                  {selectedCategory?.event_subcategories.map((sub) =>
                    (sub.repertoire || []).map((song, index) => (
                      <option key={`${sub.id}-${index}`} value={song}>
                        {song}
                      </option>
                    ))
                  )}
                </select>
                {errors.song_title && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.song_title.message}
                  </p>
                )}
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    {t("registration.songTitle")}
                  </label>
                  <input
                    type="text"
                    {...register("song_title")}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-marigold focus:ring focus:ring-marigold focus:ring-opacity-50"
                  />
                  {errors.song_title && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.song_title.message}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    {t("registration.songDuration")}
                  </label>
                  <input
                    type="text"
                    {...register("song_duration")}
                    placeholder={t("registration.songDurationPlaceholder")}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-marigold focus:ring focus:ring-marigold focus:ring-opacity-50"
                  />
                  {errors.song_duration && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.song_duration.message}
                    </p>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Document Uploads */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">
              {t("registration.documents")}
            </h3>

            <FileUpload
              label={t("registration.birthCertificate")}
              accept=".pdf,.jpg,.jpeg,.png"
              registration={{
                name: "birth_certificate",
                onChange: async () => true,
                onBlur: async () => true,
              }}
              error={files.birth_certificate.error}
              onFileChange={handleFileChange("birth_certificate")}
            />

            {!hasRepertoire && (
              <FileUpload
                label={t("registration.songPdf")}
                accept=".pdf"
                registration={{
                  name: "song_pdf",
                  onChange: async () => true,
                  onBlur: async () => true,
                }}
                error={files.song_pdf.error}
                onFileChange={handleFileChange("song_pdf")}
              />
            )}
          </div>

          {/* Payment Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">
              {t("registration.paymentInfo")}
            </h3>
            <div className="bg-gray-200 p-4 rounded-md">
              <p className="font-medium">
                {t("registration.bankTransferDetails")}
              </p>
              <p>Bank Central Asia (BCA)</p>
              <p>3720421151</p>
              <p>RODERICK OR NICHOLAS</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                {t("registration.bankName")}
              </label>
              <input
                type="text"
                {...register("bank_name")}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-marigold focus:ring focus:ring-marigold focus:ring-opacity-50"
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
              <input
                type="text"
                {...register("bank_account_number")}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-marigold focus:ring focus:ring-marigold focus:ring-opacity-50"
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
              <input
                type="text"
                {...register("bank_account_name")}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-marigold focus:ring focus:ring-marigold focus:ring-opacity-50"
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
          <div className="space-y-4">
            <div className="flex items-start">
              <div className="flex items-center h-5">
                <input
                  type="checkbox"
                  {...register("terms_accepted")}
                  className="h-4 w-4 text-marigold border-gray-300 rounded focus:ring-marigold"
                />
              </div>
              <div className="ml-3">
                <label className="text-sm text-gray-700">
                  {t("registration.termsAndConditions")}{" "}
                  <button
                    type="button"
                    onClick={onOpenTerms}
                    className="text-marigold hover:text-marigold/90 underline"
                  >
                    {t("registration.termsLink")}
                  </button>
                </label>
                {errors.terms_accepted && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.terms_accepted.message}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              {t("registration.cancel")}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-marigold text-white rounded-md hover:bg-marigold/90 disabled:opacity-50 disabled:cursor-not-allowed"
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

export default RegistrationModal;
