import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";
import { z } from "zod";
import { useLanguage } from "../lib/LanguageContext";
import { LarkService } from "../lib/lark";
import { supabase } from "../lib/supabase";
import { WhatsAppService } from "../lib/whatsapp";
import FileUpload from "./FileUpload";
import LoadingModal from "./LoadingModal";
import Modal from "./Modal";
import ThankYouModal from "./ThankYouModal";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

interface FileState {
  file: File | null;
  error?: string;
}

interface FileStates {
  song_pdfs: FileState[];
}

// Helper function to format date for display
function formatDateForDisplay(dateString: string): string {
  const date = new Date(dateString);
  const day = date.getDate();
  const month = date.toLocaleDateString("en-US", { month: "long" });
  const year = date.getFullYear();

  // Add ordinal suffix to day
  const getOrdinal = (n: number) => {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };

  return `${getOrdinal(day)} ${month} ${year}`;
}

function createMasterclassSchema(t: (key: string) => string) {
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
      .min(1, t("validation.enterAge"))
      .refine((val) => {
        const age = parseInt(val);
        return !isNaN(age) && age >= 1 && age <= 100;
      }, t("validation.invalidAge")),
    selected_date: z.string().min(1, t("validation.selectDate")),
    number_of_slots: z
      .string()
      .min(1, t("validation.selectSlots"))
      .refine((val) => {
        const slots = parseInt(val);
        return !isNaN(slots) && slots >= 1 && slots <= 3;
      }, t("validation.invalidSlots")),
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

type MasterclassForm = z.infer<ReturnType<typeof createMasterclassSchema>>;

interface MasterclassRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  eventName: string;
  onOpenTerms: () => void;
}

function MasterclassRegistrationModal({
  isOpen,
  onClose,
  eventId,
  eventName,
  onOpenTerms,
}: MasterclassRegistrationModalProps) {
  const { t, language } = useLanguage();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showLoadingModal, setShowLoadingModal] = useState(false);
  const [showThankYou, setShowThankYou] = useState(false);
  const [registrationRef, setRegistrationRef] = useState("");
  const [registeredName, setRegisteredName] = useState("");
  const [repertoireList, setRepertoireList] = useState<string[]>([""]);
  const [eventDates, setEventDates] = useState<string[]>([]);
  const [files, setFiles] = useState<FileStates>({
    song_pdfs: [{ file: null }],
  });

  const masterclassSchema = createMasterclassSchema(t);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    control,
    formState: { errors },
  } = useForm<MasterclassForm>({
    resolver: zodResolver(masterclassSchema),
    defaultValues: {
      registrant_status: "personal",
      registrant_whatsapp: "",
      number_of_slots: "1",
      selected_date: "",
    },
  });

  const registrantStatus = watch("registrant_status");

  // Fetch event data to get event_date array
  useEffect(() => {
    const fetchEventData = async () => {
      try {
        const { data: eventData, error } = await supabase
          .from("events")
          .select("event_date")
          .eq("id", eventId)
          .single();

        if (error) throw error;

        if (eventData?.event_date) {
          setEventDates(eventData.event_date);
        }
      } catch (error) {
        console.error("Error fetching event data:", error);
      }
    };

    if (eventId && isOpen) {
      fetchEventData();
    }
  }, [eventId, isOpen]);

  const handleClose = () => {
    setRepertoireList([""]);
    setFiles({
      song_pdfs: [{ file: null }],
    });
    setShowThankYou(false);
    reset();
    onClose();
  };

  const addRepertoire = () => {
    setRepertoireList([...repertoireList, ""]);
  };

  const removeRepertoire = (index: number) => {
    if (repertoireList.length > 1) {
      const newList = repertoireList.filter((_, i) => i !== index);
      setRepertoireList(newList);
    }
  };

  const updateRepertoire = (index: number, value: string) => {
    const newList = [...repertoireList];
    newList[index] = value;
    setRepertoireList(newList);
  };

  const handleFileChange = (index: number) => (file: File | null) => {
    if (file && file.size > MAX_FILE_SIZE) {
      setFiles((prev) => ({
        ...prev,
        song_pdfs: prev.song_pdfs.map((item, i) =>
          i === index
            ? { file: null, error: t("validation.fileSizeLimit") }
            : item
        ),
      }));
      return;
    }

    setFiles((prev) => ({
      ...prev,
      song_pdfs: prev.song_pdfs.map((item, i) =>
        i === index ? { file, error: undefined } : item
      ),
    }));
  };

  const addFileUpload = () => {
    setFiles((prev) => ({
      ...prev,
      song_pdfs: [...prev.song_pdfs, { file: null }],
    }));
  };

  const removeFileUpload = (index: number) => {
    if (files.song_pdfs.length > 1) {
      setFiles((prev) => ({
        ...prev,
        song_pdfs: prev.song_pdfs.filter((_, i) => i !== index),
      }));
    }
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

  const onSubmit = async (data: MasterclassForm) => {
    try {
      setIsSubmitting(true);
      setShowLoadingModal(true);

      // Filter out empty repertoire entries
      const filteredRepertoire = repertoireList.filter(
        (title) => title.trim() !== ""
      );

      if (filteredRepertoire.length === 0) {
        alert(t("masterclass.registration.addAtLeastOneRepertoire"));
        setIsSubmitting(false);
        setShowLoadingModal(false);
        return;
      }

      // Upload PDF files
      const pdfFiles = files.song_pdfs.filter(
        (fileState) => fileState.file !== null
      );
      let songPdfUrls: string[] = [];

      if (pdfFiles.length > 0) {
        try {
          const uploadPromises = pdfFiles.map((fileState) =>
            uploadFile(fileState.file!, "song-pdfs")
          );
          songPdfUrls = await Promise.all(uploadPromises);
        } catch (error) {
          console.error("Error uploading PDF files:", error);
          alert(t("registration.errorSubmitting"));
          setIsSubmitting(false);
          setShowLoadingModal(false);
          return;
        }
      }

      // Create registration
      const { data: registration, error } = await supabase
        .from("registrations")
        .insert({
          event_id: eventId,
          registrant_status: data.registrant_status,
          registrant_name:
            data.registrant_status === "personal"
              ? data.participant_name
              : data.registrant_name,
          registrant_whatsapp: data.registrant_whatsapp,
          registrant_email: data.registrant_email,
          participant_name: data.participant_name,
          participant_age: parseInt(data.participant_age),
          selected_date: data.selected_date,
          number_of_slots: parseInt(data.number_of_slots),
          bank_name: data.bank_name,
          bank_account_number: data.bank_account_number,
          bank_account_name: data.bank_account_name,
          song_pdf_url: songPdfUrls.length > 0 ? songPdfUrls : null,
          payment_receipt_url: "", // Will be handled separately if needed
          status: "pending",
        })
        .select()
        .single();

      if (error) throw error;

      // Save repertoire to masterclass_participants
      const { error: participantError } = await supabase
        .from("masterclass_participants")
        .insert({
          event_id: eventId,
          name: data.participant_name,
          repertoire: filteredRepertoire,
        });

      if (participantError) {
        console.error("Error saving participant data:", participantError);
      }

      // Generate reference number
      const uuid = registration.id;
      const phone = data.registrant_whatsapp.replace(/\D/g, "");
      const refNumber = `${uuid.slice(-4)}-${phone.slice(-4)}`;

      // Track event
      if (!import.meta.env.DEV) {
        window.umami?.track("masterclass_registration_submitted", {
          eventId,
        });
      }

      // Send to Lark if configured
      const { data: eventData } = await supabase
        .from("events")
        .select("lark_base, lark_table, type")
        .eq("id", eventId)
        .single();

      if (eventData?.lark_base && eventData?.lark_table) {
        try {
          await LarkService.sendRegistrationData({
            event: {
              id: eventId,
              lark_base: eventData.lark_base,
              lark_table: eventData.lark_table,
              type: eventData.type,
            },
            registration: {
              ref_code: refNumber,
              registrant_status:
                data.registrant_status.charAt(0).toUpperCase() +
                data.registrant_status.slice(1),
              registrant_name:
                data.registrant_status === "personal"
                  ? data.participant_name
                  : data.registrant_name,
              registrant_email: data.registrant_email,
              registrant_whatsapp: data.registrant_whatsapp,
              participant_name: data.participant_name,
              participant_age: parseInt(data.participant_age),
              selected_date: data.selected_date,
              number_of_slots: parseInt(data.number_of_slots),
              repertoire: filteredRepertoire.join("; "),
              song_pdf_url: songPdfUrls.length > 0 ? songPdfUrls : null,
              bank_name: data.bank_name,
              bank_account_name: data.bank_account_name,
              bank_account_number: data.bank_account_number,
              created_at: registration.created_at,
            },
          });
        } catch (error) {
          console.error("Error sending data to Lark:", error);
        }
      }

      // Send WhatsApp message
      try {
        await WhatsAppService.sendMasterclassRegistrationMessage({
          registrant_status: data.registrant_status,
          registrant_name:
            data.registrant_status === "personal"
              ? data.participant_name
              : data.registrant_name,
          registrant_email: data.registrant_email,
          registrant_whatsapp: data.registrant_whatsapp,
          participant_name: data.participant_name,
          participant_age: parseInt(data.participant_age),
          selected_date: data.selected_date,
          number_of_slots: parseInt(data.number_of_slots),
          repertoire: filteredRepertoire,
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
      setRepertoireList([""]);
      setFiles({
        song_pdfs: [{ file: null }],
      });
    } catch (error) {
      console.error("Error submitting registration:", error);
      alert(t("registration.errorSubmitting"));
    } finally {
      setIsSubmitting(false);
      setShowLoadingModal(false);
    }
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
        title={t("masterclass.registration.title")}
        maxWidth="2xl"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
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
                {errors.registrant_name && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.registrant_name.message}
                  </p>
                )}
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

            <div>
              <label className="block text-sm font-medium text-gray-700">
                {t("registration.participantAge")}
              </label>
              <input
                type="number"
                min="1"
                max="100"
                {...register("participant_age")}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-marigold focus:ring focus:ring-marigold focus:ring-opacity-50"
              />
              {errors.participant_age && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.participant_age.message}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Select Date
                </label>
                <select
                  {...register("selected_date")}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-marigold focus:ring focus:ring-marigold focus:ring-opacity-50"
                >
                  <option value="">Select a date...</option>
                  {eventDates.map((date, index) => (
                    <option key={index} value={date}>
                      {formatDateForDisplay(date)}
                    </option>
                  ))}
                </select>
                {errors.selected_date && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.selected_date.message}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  {t("masterclass.registration.numberOfSlots")}
                </label>
                <select
                  {...register("number_of_slots")}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-marigold focus:ring focus:ring-marigold focus:ring-opacity-50"
                >
                  {[1, 2, 3].map((num) => (
                    <option key={num} value={num}>
                      {num}
                    </option>
                  ))}
                </select>
                {errors.number_of_slots && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.number_of_slots.message}
                  </p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                {t("masterclass.registration.repertoire")}
              </label>
              {repertoireList.map((repertoire, index) => (
                <div key={index} className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={repertoire}
                    onChange={(e) => updateRepertoire(index, e.target.value)}
                    placeholder={t(
                      "masterclass.registration.repertoirePlaceholder"
                    )}
                    className="flex-1 mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-marigold focus:ring focus:ring-marigold focus:ring-opacity-50"
                    required
                  />
                  {repertoireList.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeRepertoire(index)}
                      className="mt-1 p-2 text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={addRepertoire}
                className="flex items-center gap-2 text-sm text-marigold hover:text-marigold/90"
              >
                <Plus className="h-4 w-4" />
                {t("masterclass.registration.addRepertoire")}
              </button>
            </div>

            {/* PDF Upload Section */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t("masterclass.registration.repertoirePdf")}
              </label>
              <p className="text-xs text-gray-500 mb-3">
                {t("masterclass.registration.repertoirePdfHelp")}
              </p>
              {files.song_pdfs.map((fileState, index) => (
                <div key={index} className="mb-3">
                  <div className="flex gap-2 items-start">
                    <div className="flex-1">
                      <FileUpload
                        label={`PDF ${index + 1}`}
                        accept=".pdf"
                        registration={{
                          name: `song_pdf_${index}`,
                          onChange: async () => true,
                          onBlur: async () => true,
                        }}
                        error={fileState.error}
                        onFileChange={handleFileChange(index)}
                      />
                    </div>
                    {files.song_pdfs.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeFileUpload(index)}
                        className="mt-6 p-2 text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={addFileUpload}
                className="flex items-center gap-2 text-sm text-marigold hover:text-marigold/90"
              >
                <Plus className="h-4 w-4" />
                {t("masterclass.registration.addPdf")}
              </button>
            </div>
          </div>

          {/* Payment Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">
              {t("registration.paymentInfo")}
            </h3>

            <div className="bg-gray-200 p-4 rounded-md">
              <p className="text-center font-bold text-lg mb-4">
                {t("registration.bankTransferDetails")}
              </p>
              <p>Bank Central Asia (BCA)</p>
              <p>3720421151</p>
              <p>RODERICK OR NICHOLAS</p>
            </div>

            <div className="bg-gray-200 p-4 rounded-md">
              <p className="text-center font-bold text-lg mb-4">
                {t("registration.qris")}
              </p>
              <img src="/Musica-Lumina_QR.jpeg" alt="QRIS" className="w-full" />
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

export default MasterclassRegistrationModal;
