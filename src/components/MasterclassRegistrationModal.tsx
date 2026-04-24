import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle, Loader2, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";
import { z } from "zod";
import { useLanguage } from "../lib/LanguageContext";
import { LarkService } from "../lib/lark";
import { supabase } from "../lib/supabase";
import { EmailService } from "../lib/email";
import FileUpload from "./FileUpload";
import LoadingModal from "./LoadingModal";
import Modal from "./Modal";
import ThankYouModal from "./ThankYouModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eyebrow } from "@/components/ui/eyebrow";
import { cn } from "@/lib/utils";

/* ============================================================================
   Constants + types — preserved 1:1.
   ============================================================================ */

const MAX_FILE_SIZE = 5 * 1024 * 1024;

interface FileState {
  file: File | null;
  error?: string;
}

interface FileStates {
  song_pdfs: FileState[];
  payment_receipt: FileState;
}

function formatDateForDisplay(dateString: string): string {
  const date = new Date(dateString);
  const day = date.getDate();
  const month = date.toLocaleDateString("en-US", { month: "long" });
  const year = date.getFullYear();
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
    selected_duration: z.string().min(1, t("validation.selectDuration")),
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

/* ============================================================================
   Shared editorial classes (mirrors RegistrationModal)
   ============================================================================ */

const SELECT_CLASSES = [
  "w-full h-11 px-3 py-2 rounded-sm border border-burgundy/20 bg-surface-elevated",
  "font-sans text-body-md text-ink-body",
  "transition-[border-color,background-color,box-shadow] duration-fast ease-out-quart",
  "hover:border-burgundy/40",
  "focus:outline-none focus:border-marigold focus:ring-2 focus:ring-marigold/20",
  "aria-[invalid=true]:border-[color:var(--status-error)]",
  "appearance-none bg-no-repeat bg-[right_0.75rem_center]",
  "bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%2212%22 viewBox=%220 0 12 12%22 fill=%22none%22 stroke=%22%23491822%22 stroke-width=%221.5%22><path d=%22M3 5l3 3 3-3%22/></svg>')]",
  "pr-10",
].join(" ");

const FIELD_ERROR_CLASS =
  "mt-2 type-caption text-[color:var(--status-error)]";

const REQ = (
  <span className="text-[color:var(--status-error)]" aria-hidden>
    *
  </span>
);

/* ============================================================================
   Page component
   ============================================================================ */

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
  const [eventDurations, setEventDurations] = useState<number[]>([]);
  const [registrationFees, setRegistrationFees] = useState<
    { uom: string; price: number }[]
  >([]);
  const [files, setFiles] = useState<FileStates>({
    song_pdfs: [{ file: null }],
    payment_receipt: { file: null },
  });
  const [submitError, setSubmitError] = useState<string | null>(null);

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
  const selectedDuration = watch("selected_duration");
  const selectedSlots = watch("number_of_slots");

  const matchedFee = (() => {
    if (!selectedDuration) return null;
    const durationMinutes = parseInt(selectedDuration, 10);
    if (isNaN(durationMinutes)) return null;
    for (const fee of registrationFees) {
      const n = parseInt(String(fee.uom).replace(/[^0-9]/g, ""), 10);
      if (!isNaN(n) && n === durationMinutes) return fee;
    }
    return null;
  })();

  const computedTotal = (() => {
    if (!matchedFee) return null;
    const slots = parseInt(selectedSlots || "1", 10);
    if (isNaN(slots)) return null;
    return matchedFee.price * slots;
  })();

  // Fetch event dates + durations
  useEffect(() => {
    const fetchEventData = async () => {
      try {
        const { data: eventData, error } = await supabase
          .from("events")
          .select("event_date, event_duration")
          .eq("id", eventId)
          .single();
        if (error) throw error;
        if (eventData?.event_date) setEventDates(eventData.event_date);
        if (eventData?.event_duration)
          setEventDurations(eventData.event_duration as number[]);
      } catch (error) {
        console.error("Error fetching event data:", error);
      }
    };
    if (eventId && isOpen) fetchEventData();
  }, [eventId, isOpen]);

  // Fetch fees
  useEffect(() => {
    const fetchFees = async () => {
      try {
        if (!eventId || !isOpen) return;
        const { data, error } = await supabase
          .from("event_registration_fees")
          .select("uom, price")
          .eq("event_id", eventId)
          .order("price");
        if (error) throw error;
        setRegistrationFees(data || []);
      } catch (err) {
        console.error("Error fetching registration fees:", err);
      }
    };
    fetchFees();
  }, [eventId, isOpen]);

  const handleClose = () => {
    setRepertoireList([""]);
    setFiles({
      song_pdfs: [{ file: null }],
      payment_receipt: { file: null },
    });
    setShowThankYou(false);
    setSubmitError(null);
    reset();
    onClose();
  };

  const addRepertoire = () => setRepertoireList([...repertoireList, ""]);
  const removeRepertoire = (index: number) => {
    if (repertoireList.length > 1) {
      setRepertoireList(repertoireList.filter((_, i) => i !== index));
    }
  };
  const updateRepertoire = (index: number, value: string) => {
    const next = [...repertoireList];
    next[index] = value;
    setRepertoireList(next);
  };

  const handleFileChange =
    (type: keyof FileStates, index?: number) => (file: File | null) => {
      if (file && file.size > MAX_FILE_SIZE) {
        if (type === "song_pdfs" && index !== undefined) {
          setFiles((prev) => ({
            ...prev,
            song_pdfs: prev.song_pdfs.map((item, i) =>
              i === index
                ? { file: null, error: t("validation.fileSizeLimit") }
                : item
            ),
          }));
        } else if (type === "payment_receipt") {
          setFiles((prev) => ({
            ...prev,
            payment_receipt: {
              file: null,
              error: t("validation.fileSizeLimit"),
            },
          }));
        }
        return;
      }
      if (type === "song_pdfs" && index !== undefined) {
        setFiles((prev) => ({
          ...prev,
          song_pdfs: prev.song_pdfs.map((item, i) =>
            i === index ? { file, error: undefined } : item
          ),
        }));
      } else if (type === "payment_receipt") {
        setFiles((prev) => ({
          ...prev,
          payment_receipt: { file, error: undefined },
        }));
      }
    };

  const addFileUpload = () =>
    setFiles((prev) => ({
      ...prev,
      song_pdfs: [...prev.song_pdfs, { file: null }],
    }));
  const removeFileUpload = (index: number) => {
    if (files.song_pdfs.length > 1) {
      setFiles((prev) => ({
        ...prev,
        song_pdfs: prev.song_pdfs.filter((_, i) => i !== index),
      }));
    }
  };

  const uploadFile = async (file: File, path: string) => {
    const fileExt = file.name.split(".").pop();
    const fileName = `${Math.random().toString(36).slice(2)}.${fileExt}`;
    const filePath = `${path}/${fileName}`;
    const { error: uploadError, data } = await supabase.storage
      .from("registration-documents")
      .upload(filePath, file, { cacheControl: "3600", upsert: false });
    if (uploadError) {
      throw new Error(`Error uploading ${path}: ${uploadError.message}`);
    }
    if (!data?.path) throw new Error("Upload succeeded but no path returned");
    const { data: signedUrlData, error: signedUrlError } =
      await supabase.storage
        .from("registration-documents")
        .createSignedUrl(data.path, 31536000);
    if (signedUrlError || !signedUrlData?.signedUrl) {
      throw new Error("Failed to generate signed URL for uploaded file");
    }
    return signedUrlData.signedUrl;
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

  const onSubmit = async (data: MasterclassForm) => {
    try {
      setIsSubmitting(true);
      setShowLoadingModal(true);
      setSubmitError(null);

      const filteredRepertoire = repertoireList.filter(
        (title) => title.trim() !== ""
      );

      if (filteredRepertoire.length === 0) {
        setSubmitError(t("masterclass.registration.addAtLeastOneRepertoire"));
        setIsSubmitting(false);
        setShowLoadingModal(false);
        return;
      }

      if (!validateFiles()) {
        setIsSubmitting(false);
        setShowLoadingModal(false);
        return;
      }

      const uploadPromises = [
        uploadFile(files.payment_receipt.file!, "payment-receipts"),
      ];

      const pdfFiles = files.song_pdfs.filter((s) => s.file !== null);
      let songPdfUrls: string[] = [];
      let paymentReceiptUrl: string;

      if (pdfFiles.length > 0) {
        const pdfUploadPromises = pdfFiles.map((s) =>
          uploadFile(s.file!, "song-pdfs")
        );
        uploadPromises.push(...pdfUploadPromises);
      }

      try {
        const uploadedFiles = await Promise.all(uploadPromises);
        paymentReceiptUrl = uploadedFiles[0];
        songPdfUrls = uploadedFiles.slice(1);
      } catch (error) {
        console.error("Error uploading files:", error);
        setSubmitError(t("registration.errorSubmitting"));
        setIsSubmitting(false);
        setShowLoadingModal(false);
        return;
      }

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
          song_duration: `${data.selected_duration} minutes`,
          bank_name: data.bank_name,
          bank_account_number: data.bank_account_number,
          bank_account_name: data.bank_account_name,
          song_pdf_url: songPdfUrls.length > 0 ? songPdfUrls : null,
          payment_receipt_url: paymentReceiptUrl,
          status: "pending",
        })
        .select()
        .single();

      if (error) throw error;

      const { error: participantError } = await supabase
        .from("masterclass_participants")
        .insert({
          event_id: eventId,
          name: data.participant_name,
          repertoire: filteredRepertoire,
          duration: parseInt(data.selected_duration),
          number_of_slots: parseInt(data.number_of_slots),
        });

      if (participantError) {
        console.error("Error saving participant data:", participantError);
      }

      const uuid = registration.id;
      const phone = data.registrant_whatsapp.replace(/\D/g, "");
      const refNumber = `${uuid.slice(-4)}-${phone.slice(-4)}`;

      if (!import.meta.env.DEV) {
        window.umami?.track("masterclass_registration_submitted", { eventId });
      }

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
              duration: parseInt(data.selected_duration),
              repertoire: filteredRepertoire.join("; "),
              song_pdf_url: songPdfUrls.length > 0 ? songPdfUrls : null,
              payment_receipt_url: paymentReceiptUrl,
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

      try {
        await EmailService.sendMasterclassRegistrationEmail({
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
          duration: parseInt(data.selected_duration),
          repertoire: filteredRepertoire,
          registration_ref_code: refNumber,
          event_name: eventName,
          language,
        });
      } catch (error) {
        console.error("Error sending email:", error);
      }

      setRegistrationRef(refNumber);
      setRegisteredName(data.participant_name);
      setShowThankYou(true);
      reset();
      setRepertoireList([""]);
      setFiles({
        song_pdfs: [{ file: null }],
        payment_receipt: { file: null },
      });
    } catch (error) {
      console.error("Error submitting registration:", error);
      setSubmitError(t("registration.errorSubmitting"));
    } finally {
      setIsSubmitting(false);
      setShowLoadingModal(false);
    }
  };

  if (showThankYou) {
    return (
      <ThankYouModal
        isOpen
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
        eyebrow="Masterclass entry"
        title={t("masterclass.registration.title")}
        maxWidth="3xl"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-10">
          {submitError && (
            <div className="border-l-2 border-[color:var(--status-error)] bg-[color:var(--status-error-bg)] text-[color:var(--status-error)] px-5 py-4 flex items-start gap-3">
              <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <span className="type-body-sm">{submitError}</span>
            </div>
          )}

          {/* Registrant */}
          <Section eyebrow="01 · Registrant">
            <Field>
              <Label variant="editorial" htmlFor="m_registrant_status">
                {t("registration.registrantStatus")}
              </Label>
              <select
                id="m_registrant_status"
                {...register("registrant_status")}
                className={SELECT_CLASSES}
              >
                <option value="personal">{t("registration.personal")}</option>
                <option value="parents">{t("registration.parents")}</option>
                <option value="teacher">{t("registration.teacher")}</option>
              </select>
            </Field>

            {registrantStatus !== "personal" && (
              <Field>
                <Label variant="editorial" htmlFor="m_registrant_name">
                  {t("registration.registrantName")}
                </Label>
                <Input
                  variant="boxed"
                  id="m_registrant_name"
                  type="text"
                  {...register("registrant_name")}
                />
                {errors.registrant_name && (
                  <p className={FIELD_ERROR_CLASS}>
                    {errors.registrant_name.message}
                  </p>
                )}
              </Field>
            )}

            <Field>
              <Label variant="editorial" htmlFor="m_registrant_whatsapp">
                {t("registration.whatsappNumber")} {REQ}
              </Label>
              <Controller
                name="registrant_whatsapp"
                control={control}
                render={({ field: { onChange, value } }) => (
                  <PhoneInput
                    country="id"
                    preferredCountries={["id", "sg", "my"]}
                    enableSearch
                    searchPlaceholder="Search country..."
                    inputClass={cn(
                      "!w-full !h-11 !text-base !rounded-sm",
                      "!border !border-burgundy/20 !bg-surface-elevated",
                      "focus:!border-marigold focus:!ring-2 focus:!ring-marigold/20"
                    )}
                    buttonClass="!border !border-burgundy/20 !rounded-l-sm !bg-surface-canvas-warm hover:!bg-surface-canvas-mist"
                    dropdownClass="!text-base"
                    value={value}
                    onChange={(phone) => onChange(`+${phone}`)}
                    placeholder={t("registration.whatsappPlaceholder")}
                    inputProps={{ id: "m_registrant_whatsapp" }}
                  />
                )}
              />
              {errors.registrant_whatsapp && (
                <p className={FIELD_ERROR_CLASS}>
                  {errors.registrant_whatsapp.message}
                </p>
              )}
              <p className="mt-2 type-caption text-ink-muted">
                {t("registration.whatsappHelp")}
              </p>
            </Field>

            <Field>
              <Label variant="editorial" htmlFor="m_registrant_email">
                {t("registration.email")} {REQ}
              </Label>
              <Input
                variant="boxed"
                id="m_registrant_email"
                type="email"
                autoComplete="email"
                {...register("registrant_email")}
              />
              {errors.registrant_email && (
                <p className={FIELD_ERROR_CLASS}>
                  {errors.registrant_email.message}
                </p>
              )}
            </Field>
          </Section>

          {/* Participant */}
          <Section eyebrow="02 · Participant & session">
            <div className="grid grid-cols-1 sm:grid-cols-[2fr_1fr] gap-6">
              <Field>
                <Label variant="editorial" htmlFor="m_participant_name">
                  {t("registration.fullName")} {REQ}
                </Label>
                <Input
                  variant="boxed"
                  id="m_participant_name"
                  type="text"
                  {...register("participant_name")}
                />
                {errors.participant_name && (
                  <p className={FIELD_ERROR_CLASS}>
                    {errors.participant_name.message}
                  </p>
                )}
              </Field>
              <Field>
                <Label variant="editorial" htmlFor="m_participant_age">
                  {t("registration.participantAge")} {REQ}
                </Label>
                <Input
                  variant="boxed"
                  id="m_participant_age"
                  type="number"
                  min="1"
                  max="100"
                  {...register("participant_age")}
                />
                {errors.participant_age && (
                  <p className={FIELD_ERROR_CLASS}>
                    {errors.participant_age.message}
                  </p>
                )}
              </Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <Field>
                <Label variant="editorial" htmlFor="m_selected_date">
                  Select date {REQ}
                </Label>
                <select
                  id="m_selected_date"
                  {...register("selected_date")}
                  className={SELECT_CLASSES}
                >
                  <option value="">Select a date…</option>
                  {eventDates.map((date, index) => (
                    <option key={index} value={date}>
                      {formatDateForDisplay(date)}
                    </option>
                  ))}
                </select>
                {errors.selected_date && (
                  <p className={FIELD_ERROR_CLASS}>
                    {errors.selected_date.message}
                  </p>
                )}
              </Field>
              <Field>
                <Label variant="editorial" htmlFor="m_selected_duration">
                  Duration (min) {REQ}
                </Label>
                <select
                  id="m_selected_duration"
                  {...register("selected_duration")}
                  className={SELECT_CLASSES}
                >
                  <option value="">Select duration…</option>
                  {eventDurations.map((d, index) => (
                    <option key={index} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
                {errors.selected_duration && (
                  <p className={FIELD_ERROR_CLASS}>
                    {errors.selected_duration.message}
                  </p>
                )}
              </Field>
              <Field>
                <Label variant="editorial" htmlFor="m_number_of_slots">
                  {t("masterclass.registration.numberOfSlots")} {REQ}
                </Label>
                <select
                  id="m_number_of_slots"
                  {...register("number_of_slots")}
                  className={SELECT_CLASSES}
                >
                  {[1, 2, 3].map((num) => (
                    <option key={num} value={num}>
                      {num}
                    </option>
                  ))}
                </select>
                {errors.number_of_slots && (
                  <p className={FIELD_ERROR_CLASS}>
                    {errors.number_of_slots.message}
                  </p>
                )}
              </Field>
            </div>

            {/* Computed price */}
            <div className="bg-surface-canvas-warm border-l-2 border-marigold px-5 py-4 flex items-baseline justify-between gap-4">
              <span className="type-label text-ink-accent">Total price</span>
              <span className="type-headline-sm font-serif text-burgundy">
                {computedTotal !== null
                  ? `IDR ${computedTotal.toLocaleString()}`
                  : "—"}
              </span>
            </div>

            {/* Repertoire */}
            <div className="flex flex-col gap-3">
              <Label variant="editorial">
                {t("masterclass.registration.repertoire")} {REQ}
              </Label>
              <div className="flex flex-col gap-2">
                {repertoireList.map((repertoire, index) => (
                  <div key={index} className="flex gap-2 items-start">
                    <Input
                      variant="boxed"
                      type="text"
                      value={repertoire}
                      onChange={(e) => updateRepertoire(index, e.target.value)}
                      placeholder={t(
                        "masterclass.registration.repertoirePlaceholder"
                      )}
                      required
                    />
                    {repertoireList.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeRepertoire(index)}
                        className="h-11 w-11 flex items-center justify-center text-ink-muted hover:text-[color:var(--status-error)] hover:bg-[color:var(--status-error-bg)] rounded-sm transition-colors"
                        aria-label="Remove repertoire"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={addRepertoire}
                className="self-start type-label inline-flex items-center gap-2 text-burgundy hover:text-marigold transition-colors"
              >
                <Plus className="h-4 w-4" />
                {t("masterclass.registration.addRepertoire")}
              </button>
            </div>

            {/* PDF uploads */}
            <div className="flex flex-col gap-3">
              <Label variant="editorial">
                {t("masterclass.registration.repertoirePdf")}
              </Label>
              <p className="type-caption text-ink-muted">
                {t("masterclass.registration.repertoirePdfHelp")}
              </p>
              {files.song_pdfs.map((fileState, index) => (
                <div key={index} className="flex gap-2 items-start">
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
                      onFileChange={handleFileChange("song_pdfs", index)}
                    />
                  </div>
                  {files.song_pdfs.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeFileUpload(index)}
                      className="mt-7 h-11 w-11 flex items-center justify-center text-ink-muted hover:text-[color:var(--status-error)] hover:bg-[color:var(--status-error-bg)] rounded-sm transition-colors"
                      aria-label="Remove PDF"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={addFileUpload}
                className="self-start type-label inline-flex items-center gap-2 text-burgundy hover:text-marigold transition-colors"
              >
                <Plus className="h-4 w-4" />
                {t("masterclass.registration.addPdf")}
              </button>
            </div>
          </Section>

          {/* Payment */}
          <Section eyebrow="03 · Payment">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <PaymentInfoCard label={t("registration.bankTransferDetails")}>
                <p className="type-body-md text-burgundy">
                  Bank Central Asia (BCA)
                </p>
                <p className="type-headline-sm text-burgundy font-serif tracking-wide mt-1">
                  3720421151
                </p>
                <p className="type-caption text-ink-muted mt-2">
                  RODERICK OR NICHOLAS
                </p>
              </PaymentInfoCard>
              <PaymentInfoCard label={t("registration.qris")}>
                <img
                  src="/Musica-Lumina_QR.jpeg"
                  alt="QRIS"
                  className="w-full h-auto"
                  loading="lazy"
                />
              </PaymentInfoCard>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <Field>
                <Label variant="editorial" htmlFor="m_bank_name">
                  {t("registration.bankName")} {REQ}
                </Label>
                <Input
                  variant="boxed"
                  id="m_bank_name"
                  type="text"
                  {...register("bank_name")}
                />
                {errors.bank_name && (
                  <p className={FIELD_ERROR_CLASS}>
                    {errors.bank_name.message}
                  </p>
                )}
              </Field>
              <Field>
                <Label variant="editorial" htmlFor="m_bank_account_number">
                  {t("registration.accountNumber")} {REQ}
                </Label>
                <Input
                  variant="boxed"
                  id="m_bank_account_number"
                  type="text"
                  inputMode="numeric"
                  {...register("bank_account_number")}
                />
                {errors.bank_account_number && (
                  <p className={FIELD_ERROR_CLASS}>
                    {errors.bank_account_number.message}
                  </p>
                )}
              </Field>
            </div>

            <Field>
              <Label variant="editorial" htmlFor="m_bank_account_name">
                {t("registration.accountHolderName")} {REQ}
              </Label>
              <Input
                variant="boxed"
                id="m_bank_account_name"
                type="text"
                {...register("bank_account_name")}
              />
              {errors.bank_account_name && (
                <p className={FIELD_ERROR_CLASS}>
                  {errors.bank_account_name.message}
                </p>
              )}
            </Field>

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
          </Section>

          {/* Terms */}
          <div className="border-t border-rule-hairline pt-6">
            <label className="flex items-start gap-3 cursor-pointer">
              <span className="flex items-center h-6 mt-0.5">
                <input
                  type="checkbox"
                  {...register("terms_accepted")}
                  className="h-4 w-4 rounded-sm border-burgundy/30 text-marigold focus:ring-2 focus:ring-marigold focus:ring-offset-2"
                />
              </span>
              <span className="type-body-sm text-ink-body">
                {t("registration.termsAndConditions")}{" "}
                <button
                  type="button"
                  onClick={onOpenTerms}
                  className="text-burgundy underline underline-offset-2 hover:text-marigold transition-colors"
                >
                  {t("registration.termsLink")}
                </button>
              </span>
            </label>
            {errors.terms_accepted && (
              <p className={cn(FIELD_ERROR_CLASS, "ml-7")}>
                {errors.terms_accepted.message}
              </p>
            )}
          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              {t("registration.cancel")}
            </Button>
            <Button type="submit" size="lg" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {isSubmitting
                ? t("registration.submitting")
                : t("registration.submit")}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}

function Section({
  eyebrow,
  children,
}: {
  eyebrow: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-6">
      <Eyebrow withRule>{eyebrow}</Eyebrow>
      <div className="flex flex-col gap-5">{children}</div>
    </section>
  );
}

function Field({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col">{children}</div>;
}

function PaymentInfoCard({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-surface-canvas-warm border border-rule-hairline p-5 flex flex-col gap-3">
      <Eyebrow>{label}</Eyebrow>
      <div className="flex flex-col">{children}</div>
    </div>
  );
}

export default MasterclassRegistrationModal;
