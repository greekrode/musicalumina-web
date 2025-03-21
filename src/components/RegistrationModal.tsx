import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { supabase } from "../lib/supabase";
import FileUpload from "./FileUpload";
import Modal from "./Modal";
import ThankYouModal from "./ThankYouModal";
import { useState } from "react";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

interface FileState {
  file: File | null;
  error?: string;
}

interface FileStates {
  birth_certificate: FileState;
  song_pdf: FileState;
  payment_receipt: FileState;
}

const registrationSchema = z.object({
  registrant_status: z.enum(["personal", "parents", "teacher"]),
  registrant_name: z.string().optional(),
  registrant_whatsapp: z
    .string()
    .regex(
      /^\+[1-9]\d{1,14}$/,
      "Please enter a valid phone number with country code"
    ),
  registrant_email: z.string().email("Please enter a valid email address"),
  participant_name: z
    .string()
    .min(3, "Please enter the participant's full name"),
  category_id: z.string().uuid("Please select a category"),
  subcategory_id: z.string().uuid("Please select a subcategory"),
  song_title: z.string().min(1, "Please enter the song title"),
  song_duration: z.string().optional(),
  bank_name: z.string().min(1, "Please enter the bank name"),
  bank_account_number: z.string().min(1, "Please enter the account number"),
  bank_account_name: z.string().min(1, "Please enter the account holder name"),
  terms_accepted: z.literal(true, {
    errorMap: () => ({ message: "You must accept the terms and conditions" }),
  }),
});

type RegistrationForm = z.infer<typeof registrationSchema>;

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
  categories: Category[];
  onOpenTerms: () => void;
}

function RegistrationModal({
  isOpen,
  onClose,
  eventId,
  categories = [],
  onOpenTerms,
}: RegistrationModalProps) {
  const [showThankYou, setShowThankYou] = useState(false);
  const [registrationRef, setRegistrationRef] = useState("");
  const [registeredName, setRegisteredName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [files, setFiles] = useState<FileStates>({
    birth_certificate: { file: null },
    song_pdf: { file: null },
    payment_receipt: { file: null },
  });

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
    },
  });

  const registrantStatus = watch("registrant_status");
  const categoryId = watch("category_id");

  const selectedCategory = categories.find((cat) => cat.id === categoryId);
  const hasRepertoire =
    (selectedCategory?.repertoire && selectedCategory.repertoire.length > 0) ||
    selectedCategory?.event_subcategories.some(
      (sub) => sub.repertoire && sub.repertoire.length > 0
    );

  const handleFileChange = (type: keyof FileStates) => (file: File | null) => {
    if (file && file.size > MAX_FILE_SIZE) {
      setFiles((prev) => ({
        ...prev,
        [type]: { file: null, error: "File size must be less than 10MB" },
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

    // Validate birth certificate
    if (!files.birth_certificate.file) {
      newFiles.birth_certificate.error =
        "Please upload your birth certificate or passport";
      isValid = false;
    }

    // Validate payment receipt
    if (!files.payment_receipt.file) {
      newFiles.payment_receipt.error = "Please upload your payment receipt";
      isValid = false;
    }

    // Validate song PDF only if no repertoire
    if (!hasRepertoire && !files.song_pdf.file) {
      newFiles.song_pdf.error = "Please upload your song PDF";
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

      const { error: uploadError } = await supabase.storage
        .from("registration-documents")
        .upload(filePath, file);

      if (uploadError) {
        throw new Error(`Error uploading ${path}: ${uploadError.message}`);
      }

      const {
        data: { publicUrl },
      } = supabase.storage
        .from("registration-documents")
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error("Error uploading file:", error);
      throw new Error(`Failed to upload file to ${path}`);
    }
  };

  const onSubmit = async (data: RegistrationForm) => {
    try {
      setIsSubmitting(true);

      // Validate files first
      if (!validateFiles()) {
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

      if (data.registrant_name === null) {
        data.registrant_name = data.participant_name;
      }

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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Event Registration"
      maxWidth="4xl"
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
            Registrant's Data
          </h3>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Registrant Status
            </label>
            <select
              {...register("registrant_status")}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-marigold focus:ring focus:ring-marigold focus:ring-opacity-50"
            >
              <option value="personal">Personal</option>
              <option value="parents">Parents</option>
              <option value="teacher">Teacher</option>
            </select>
          </div>

          {registrantStatus !== "personal" && (
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Registrant Full Name
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
              WhatsApp Number
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
                    placeholder="Enter phone number without country code"
                  />
                )}
              />
              {errors.registrant_whatsapp && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.registrant_whatsapp.message}
                </p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                Please select your country code and enter your phone number
              </p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Email
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
            Participant's Data
          </h3>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Full Name
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

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Category
            </label>
            <select
              {...register("category_id")}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-marigold focus:ring focus:ring-marigold focus:ring-opacity-50"
            >
              <option value="">Select a category</option>
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
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Sub Category
              </label>
              <select
                {...register("subcategory_id")}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-marigold focus:ring focus:ring-marigold focus:ring-opacity-50"
              >
                <option value="">Select a sub category</option>
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

          {hasRepertoire ? (
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Song Selection
              </label>
              <select
                {...register("song_title")}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-marigold focus:ring focus:ring-marigold focus:ring-opacity-50"
              >
                <option value="">Select a song</option>
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
                  Song Title
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
                  Song Duration
                </label>
                <input
                  type="text"
                  {...register("song_duration")}
                  placeholder="e.g., 3:30"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-marigold focus:ring focus:ring-marigold focus:ring-opacity-50"
                />
              </div>
            </>
          )}
        </div>

        {/* Document Uploads */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Documents</h3>

          <FileUpload
            label="Birth Certificate/Passport"
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
              label="Song PDF"
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
            Payment Information
          </h3>
          <div className="bg-gray-50 p-4 rounded-md">
            <p className="font-medium">Bank Transfer Details:</p>
            <p>Bank Central Asia (BCA)</p>
            <p>3720421151</p>
            <p>RODERICK OR NICHOLAS</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Bank Name
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
              Account Number
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
              Account Holder Name
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
            label="Payment Receipt"
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
                By registering, I agree to all the{" "}
                <button
                  type="button"
                  onClick={onOpenTerms}
                  className="text-marigold hover:text-marigold/90 underline"
                >
                  terms & conditions
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
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 bg-marigold text-white rounded-md hover:bg-marigold/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Submitting..." : "Submit Registration"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default RegistrationModal;
