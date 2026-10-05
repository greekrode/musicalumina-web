import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { z } from "zod";
import { useEffect, useState, useRef } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";
import { edgeFunctions, notifyRegistration, signRegistrationUpload, supabase } from "../lib/supabase";
import { Turnstile, type TurnstileHandle } from "./Turnstile";
import FileUpload from "./FileUpload";
import Modal from "./Modal";
import ThankYouModal from "./ThankYouModal";
import LoadingModal from "./LoadingModal";
import { useLanguage } from "../lib/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eyebrow } from "@/components/ui/eyebrow";
import { cn } from "@/lib/utils";

/* ============================================================================
   Constants + types — preserved 1:1 from the original implementation.
   ============================================================================ */

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

interface FileState {
  file: File | null;
  error?: string;
}

interface FileStates {
  song_pdf: FileState;
  payment_receipt: FileState;
}

function createRegistrationSchema(
  t: (key: string) => string,
  isOnlineEvent: boolean
) {
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
    participants: z
      .array(
        z.object({
          name: z
            .string()
            .min(3, t("validation.minName"))
            .max(100, t("validation.maxNameLength")),
        })
      )
      .min(1),
    category_id: z.string().uuid(t("validation.selectCategory")),
    subcategory_id: z.string().uuid(t("validation.selectSubCategory")),
    song_title: z
      .string()
      .min(1, t("validation.enterSongTitle"))
      .max(150, t("validation.maxSongTitleLength")),
    song_duration: z.string().max(10, t("validation.maxDurationLength")),
    video_url: isOnlineEvent
      ? z
          .string()
          .trim()
          .min(1, t("validation.enterVideoUrl"))
          .url(t("validation.invalidUrl"))
      : z.string().refine((val) => {
          if (!val || val === "") return true;
          try {
            new URL(val);
            return true;
          } catch {
            return false;
          }
        }, t("validation.invalidUrl")),
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
  participant_count?: number;
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
  eventVenue: string;
  eventType: string;
  categories: Category[];
  onOpenTerms: () => void;
  maxQuota?: number;
  registrationCount?: number;
  /** Verified invitation code (plaintext); redeemed server-side on submit. */
  invitationCode?: string | null;
}

/* ============================================================================
   Shared editorial classes for native form elements that don't have a
   dedicated primitive (select). Mirrors Input variant="boxed".
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

function RegistrationModal({
  isOpen,
  onClose,
  eventId,
  eventVenue,
  eventType,
  categories = [],
  onOpenTerms,
  maxQuota,
  registrationCount = 0,
  invitationCode,
}: RegistrationModalProps) {
  const { t, language } = useLanguage();
  const turnstileRef = useRef<TurnstileHandle>(null);
  const [showThankYou, setShowThankYou] = useState(false);
  const [registrationRef, setRegistrationRef] = useState("");
  const [registeredName, setRegisteredName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showLoadingModal, setShowLoadingModal] = useState(false);
  const [files, setFiles] = useState<FileStates>({
    song_pdf: { file: null },
    payment_receipt: { file: null },
  });
  const [birthCertificates, setBirthCertificates] = useState<FileState[]>([
    { file: null },
  ]);
  const [activeParticipant, setActiveParticipant] = useState(0);

  const isOnlineEvent = eventVenue.toLowerCase() === "online";
  const registrationSchema = createRegistrationSchema(t, isOnlineEvent);

  const {
    register,
    handleSubmit,
    watch,
    setError,
    control,
    reset,
    getValues,
    formState: { errors },
  } = useForm<RegistrationForm>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      registrant_status: "personal",
      registrant_whatsapp: "",
      participants: [{ name: "" }],
      song_duration: "",
      video_url: "",
    },
  });
  const { fields, replace } = useFieldArray({
    control,
    name: "participants",
  });

  const registrantStatus = watch("registrant_status") as
    | "personal"
    | "parents"
    | "teacher";
  const categoryId = watch("category_id") as string;

  const selectedCategory = categories.find((cat) => cat.id === categoryId);
  const participantCount = Math.min(
    4,
    Math.max(1, selectedCategory?.participant_count ?? 1)
  );
  const hasRepertoire =
    (selectedCategory?.repertoire && selectedCategory.repertoire.length > 0) ||
    (selectedCategory?.event_subcategories.some(
      (sub: { repertoire?: string[] }) =>
        sub.repertoire && sub.repertoire.length > 0
    ) &&
      eventType === "festival");

  useEffect(() => {
    const current = getValues("participants");
    if (current.length === participantCount) return;
    replace(
      Array.from({ length: participantCount }, (_, index) => current[index] ?? { name: "" })
    );
    setBirthCertificates((prev) =>
      Array.from({ length: participantCount }, (_, index) => prev[index] ?? { file: null })
    );
    setActiveParticipant(0);
  }, [participantCount, getValues, replace]);

  useEffect(() => {
    if (!Array.isArray(errors.participants)) return;
    const index = errors.participants.findIndex((item) => item?.name);
    if (index >= 0) setActiveParticipant(index);
  }, [errors.participants]);

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

  const handleBirthCertificateChange = (index: number) => (file: File | null) => {
    if (file && file.size > MAX_FILE_SIZE) {
      setBirthCertificates((prev) => {
        const next = [...prev];
        next[index] = { file: null, error: t("validation.fileSizeLimit") };
        return next;
      });
      return;
    }
    setBirthCertificates((prev) => {
      const next = [...prev];
      next[index] = { file, error: undefined };
      return next;
    });
  };

  const validateFiles = () => {
    let isValid = true;
    let firstInvalidParticipant = -1;
    const nextCertificates = Array.from({ length: participantCount }, (_, index) => {
      const current = birthCertificates[index] ?? { file: null };
      if (!current.file) {
        isValid = false;
        if (firstInvalidParticipant < 0) firstInvalidParticipant = index;
        return { file: null, error: t("validation.uploadBirthCert") };
      }
      return { file: current.file, error: undefined };
    });
    setBirthCertificates(nextCertificates);
    if (firstInvalidParticipant >= 0) setActiveParticipant(firstInvalidParticipant);

    const newFiles = { ...files };
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
        .upload(filePath, file, { cacheControl: "3600", upsert: false });

      if (uploadError) {
        console.error("Upload error:", uploadError);
        throw new Error(`Error uploading ${path}: ${uploadError.message}`);
      }
      if (!data?.path) {
        throw new Error("Upload succeeded but no path returned");
      }

      // Visitors cannot read the bucket; a function signs this fresh upload.
      return await signRegistrationUpload(data.path);
    } catch (error) {
      console.error("Error uploading file:", error);
      throw error;
    }
  };

  const onSubmit = async (data: RegistrationForm) => {
    try {
      setIsSubmitting(true);
      setShowLoadingModal(true);

      const turnstileToken = turnstileRef.current?.getToken() ?? null;
      if (!turnstileToken) {
        setError("root", { type: "manual", message: language === "id" ? "Mohon selesaikan verifikasi keamanan terlebih dahulu." : "Please complete the security check first." });
        setIsSubmitting(false);
        setShowLoadingModal(false);
        return;
      }

      if (maxQuota && registrationCount >= maxQuota) {
        setError("root", {
          type: "manual",
          message: t("registration.quotaExceeded"),
        });
        setIsSubmitting(false);
        setShowLoadingModal(false);
        return;
      }

      if (!validateFiles()) {
        setIsSubmitting(false);
        setShowLoadingModal(false);
        return;
      }

      if (!hasRepertoire && !data.song_duration) {
        setError("song_duration", {
          type: "manual",
          message: "Please enter the song duration",
        });
        setIsSubmitting(false);
        setShowLoadingModal(false);
        return;
      }

      const registrationId = crypto.randomUUID();
      const phone = data.registrant_whatsapp.replace(/\D/g, "");
      const refNumber = `${registrationId.slice(-4)}-${
        phone.slice(-4) || phone
      }`;

      const performers = data.participants.slice(0, participantCount);
      const uploadPromises = [
        ...performers.map((_, index) =>
          uploadFile(birthCertificates[index].file!, "birth-certificates")
        ),
        uploadFile(files.payment_receipt.file!, "payment-receipts"),
      ];
      if (files.song_pdf.file) {
        uploadPromises.push(uploadFile(files.song_pdf.file, "song-pdfs"));
      }
      const uploadedFiles = await Promise.all(uploadPromises);
      const birthCertUrls = uploadedFiles.slice(0, performers.length);
      const paymentReceiptUrl = uploadedFiles[performers.length];
      const songPdfUrl = files.song_pdf.file
        ? uploadedFiles[performers.length + 1]
        : undefined;
      const primaryName = performers[0]?.name ?? "";

      if (!data.registrant_name || data.registrant_name === "") {
        data.registrant_name = primaryName;
      }


      // Insert only: visitors cannot read registrations back under RLS.
      const { error: registrationError } = await supabase
        .from("registrations")
        .insert({
          id: registrationId,
          event_id: eventId,
          registrant_status: data.registrant_status,
          registrant_name: data.registrant_name,
          registrant_whatsapp: data.registrant_whatsapp,
          registrant_email: data.registrant_email,
          participant_name: primaryName,
          category_id: data.category_id,
          subcategory_id: data.subcategory_id,
          song_title: data.song_title,
          song_duration: data.song_duration,
          birth_certificate_url: birthCertUrls[0],
          song_pdf_url: songPdfUrl ? [songPdfUrl] : null,
          video_url: data.video_url || null,
          bank_name: data.bank_name,
          bank_account_number: data.bank_account_number,
          bank_account_name: data.bank_account_name,
          payment_receipt_url: paymentReceiptUrl,
          status: "pending",
          ref_code: refNumber,
        });

      if (registrationError) {
        throw new Error(`Registration failed: ${registrationError.message}`);
      }

      const { error: participantError } = await supabase
        .from("registration_participants")
        .insert(
          performers.map((performer, index) => ({
            registration_id: registrationId,
            slot: index + 1,
            participant_name: performer.name,
            birth_certificate_url: birthCertUrls[index],
          }))
        );
      if (participantError) {
        throw new Error(`Registration failed: ${participantError.message}`);
      }

      if (!import.meta.env.DEV) {
        window.umami?.track("event_registration_submitted", {
          eventId,
          categoryId: data.category_id,
          subcategoryId: data.subcategory_id,
        });
      }

      // Confirmation email + Lark mirror are built server-side from the stored
      // registration (registration-notify); the browser sends no content.
      await notifyRegistration(registrationId, language, turnstileToken);
      turnstileRef.current?.reset();

      if (invitationCode) {
        try {
          // Server re-checks the code and this pending registration, then
          // increments the use count atomically.
          const { error: redeemError } = await edgeFunctions.invoke("invitation-code", {
            body: { action: "redeem", eventId, code: invitationCode, registrationId },
          });
          if (redeemError) {
            console.error("Error updating invitation code usage:", redeemError);
          }
        } catch (error) {
          console.error("Error incrementing invitation code usage:", error);
        }
      }

      setRegistrationRef(refNumber);
      setRegisteredName(performers.map((performer) => performer.name).join(" & "));
      setShowThankYou(true);
      reset();
      setActiveParticipant(0);
      setBirthCertificates([{ file: null }]);
      setFiles({
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
        eyebrow="Competition entry"
        title={t("registration.title")}
        maxWidth="3xl"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-10">
          {errors.root && (
            <div className="border-l-2 border-[color:var(--status-error)] bg-[color:var(--status-error-bg)] text-[color:var(--status-error)] px-5 py-4 flex items-start gap-3">
              <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <span className="type-body-sm">{errors.root.message}</span>
            </div>
          )}

          {/* ───────────────────────────────────────── REGISTRANT ───── */}
          <Section eyebrow="01 · Registrant">
            <Field>
              <Label variant="editorial" htmlFor="registrant_status">
                {t("registration.registrantStatus")}
              </Label>
              <select
                id="registrant_status"
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
                <Label variant="editorial" htmlFor="registrant_name">
                  {t("registration.registrantName")}
                </Label>
                <Input
                  variant="boxed"
                  id="registrant_name"
                  type="text"
                  {...register("registrant_name")}
                />
              </Field>
            )}

            <Field>
              <Label variant="editorial" htmlFor="registrant_whatsapp">
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
                    inputProps={{ id: "registrant_whatsapp" }}
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
              <Label variant="editorial" htmlFor="registrant_email">
                {t("registration.email")} {REQ}
              </Label>
              <Input
                variant="boxed"
                id="registrant_email"
                type="email"
                autoComplete="email"
                {...register("registrant_email")}
                aria-invalid={errors.registrant_email ? true : undefined}
              />
              {errors.registrant_email && (
                <p className={FIELD_ERROR_CLASS}>
                  {errors.registrant_email.message}
                </p>
              )}
              <p className="mt-2 type-caption text-ink-muted">
                Valid email for registration confirmation.
              </p>
            </Field>
          </Section>

          {/* ───────────────────────────────────────── CATEGORY ───── */}
          <Section eyebrow="02 · Category">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <Field>
                <Label variant="editorial" htmlFor="category_id">
                  {t("registration.category")} {REQ}
                </Label>
                <select
                  id="category_id"
                  {...register("category_id")}
                  className={SELECT_CLASSES}
                  aria-invalid={errors.category_id ? true : undefined}
                >
                  <option value="">{t("registration.selectCategory")}</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
                {errors.category_id && (
                  <p className={FIELD_ERROR_CLASS}>
                    {errors.category_id.message}
                  </p>
                )}
              </Field>

              {selectedCategory && selectedCategory.event_subcategories && (
                <Field>
                  <Label variant="editorial" htmlFor="subcategory_id">
                    {t("registration.subCategory")} {REQ}
                  </Label>
                  <select
                    id="subcategory_id"
                    {...register("subcategory_id")}
                    className={SELECT_CLASSES}
                    aria-invalid={errors.subcategory_id ? true : undefined}
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
                    <p className={FIELD_ERROR_CLASS}>
                      {errors.subcategory_id.message}
                    </p>
                  )}
                </Field>
              )}
            </div>
          </Section>

          {/* ───────────────────────────────────────── PARTICIPANTS ───── */}
          <Section eyebrow="03 · Participants">
            {participantCount > 1 && (
              <div role="tablist" aria-label={t("registration.participantData")} className="flex gap-2">
                {fields.map((field, index) => {
                  const tabInvalid = Boolean(
                    errors.participants?.[index]?.name || birthCertificates[index]?.error
                  );
                  return (
                    <button
                      key={field.id}
                      type="button"
                      role="tab"
                      aria-selected={activeParticipant === index}
                      onClick={() => setActiveParticipant(index)}
                      className={cn(
                        "h-10 px-4 type-label border-b-2",
                        activeParticipant === index
                          ? "border-marigold text-burgundy"
                          : "border-transparent text-ink-muted",
                        tabInvalid && "text-[color:var(--status-error)]"
                      )}
                    >
                      {t("registration.participant")} {index + 1}
                    </button>
                  );
                })}
              </div>
            )}

            {fields.map((field, index) => (
              <div
                key={field.id}
                hidden={participantCount > 1 && activeParticipant !== index}
                className="flex flex-col gap-5"
              >
                <Field>
                  <Label variant="editorial" htmlFor={`participant_name_${index}`}>
                    {t("registration.fullName")} {REQ}
                  </Label>
                  <Input
                    variant="boxed"
                    id={`participant_name_${index}`}
                    type="text"
                    {...register(`participants.${index}.name`)}
                    aria-invalid={errors.participants?.[index]?.name ? true : undefined}
                  />
                  {errors.participants?.[index]?.name && (
                    <p className={FIELD_ERROR_CLASS}>
                      {errors.participants[index]?.name?.message}
                    </p>
                  )}
                </Field>
                <FileUpload
                  label={t("registration.birthCertificate")}
                  accept=".pdf,.jpg,.jpeg,.png"
                  registration={{
                    name: `birth_certificate_${index}`,
                    onChange: async () => true,
                    onBlur: async () => true,
                  }}
                  error={birthCertificates[index]?.error}
                  onFileChange={handleBirthCertificateChange(index)}
                />
              </div>
            ))}

            {hasRepertoire ? (
              <Field>
                <Label variant="editorial" htmlFor="song_title">
                  {t("registration.songSelection")} {REQ}
                </Label>
                <select
                  id="song_title"
                  {...register("song_title")}
                  className={SELECT_CLASSES}
                  aria-invalid={errors.song_title ? true : undefined}
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
                  <p className={FIELD_ERROR_CLASS}>{errors.song_title.message}</p>
                )}
              </Field>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_180px] gap-6">
                <Field>
                  <Label variant="editorial" htmlFor="song_title">
                    {t("registration.songTitle")} {REQ}
                  </Label>
                  <Input
                    variant="boxed"
                    id="song_title"
                    type="text"
                    {...register("song_title")}
                    aria-invalid={errors.song_title ? true : undefined}
                  />
                  {errors.song_title && (
                    <p className={FIELD_ERROR_CLASS}>
                      {errors.song_title.message}
                    </p>
                  )}
                </Field>
                <Field>
                  <Label variant="editorial" htmlFor="song_duration">
                    {t("registration.songDuration")} {REQ}
                  </Label>
                  <Input
                    variant="boxed"
                    id="song_duration"
                    type="text"
                    {...register("song_duration")}
                    placeholder={t("registration.songDurationPlaceholder")}
                    aria-invalid={errors.song_duration ? true : undefined}
                  />
                  {errors.song_duration && (
                    <p className={FIELD_ERROR_CLASS}>
                      {errors.song_duration.message}
                    </p>
                  )}
                </Field>
              </div>
            )}
          </Section>

          {/* ───────────────────────────────────────── DOCUMENTS ───── */}
          {(!hasRepertoire || isOnlineEvent) && (
          <Section eyebrow="04 · Documents">
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

            {isOnlineEvent && (
              <Field>
                <Label variant="editorial" htmlFor="registration-video-url">
                  {t("registration.videoUrl")} {REQ}
                </Label>
                <Input
                  variant="boxed"
                  id="registration-video-url"
                  type="url"
                  required
                  aria-required="true"
                  aria-invalid={errors.video_url ? true : false}
                  aria-describedby={
                    errors.video_url
                      ? "registration-video-url-error registration-video-url-help"
                      : "registration-video-url-help"
                  }
                  {...register("video_url")}
                  placeholder={t("registration.videoUrlPlaceholder")}
                />
                {errors.video_url && (
                  <p
                    id="registration-video-url-error"
                    role="alert"
                    className={FIELD_ERROR_CLASS}
                  >
                    {errors.video_url.message}
                  </p>
                )}
                <p
                  id="registration-video-url-help"
                  className="mt-2 type-caption text-ink-muted"
                >
                  {t("registration.videoUrlHelp")}
                </p>
              </Field>
            )}
          </Section>
          )}

          {/* ───────────────────────────────────────── PAYMENT ───── */}
          <Section eyebrow={`${!hasRepertoire || isOnlineEvent ? "05" : "04"} · Payment`}>
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <Field>
                <Label variant="editorial" htmlFor="bank_name">
                  {t("registration.bankName")} {REQ}
                </Label>
                <Input
                  variant="boxed"
                  id="bank_name"
                  type="text"
                  {...register("bank_name")}
                  aria-invalid={errors.bank_name ? true : undefined}
                />
                {errors.bank_name && (
                  <p className={FIELD_ERROR_CLASS}>{errors.bank_name.message}</p>
                )}
              </Field>
              <Field>
                <Label variant="editorial" htmlFor="bank_account_number">
                  {t("registration.accountNumber")} {REQ}
                </Label>
                <Input
                  variant="boxed"
                  id="bank_account_number"
                  type="text"
                  inputMode="numeric"
                  {...register("bank_account_number")}
                  aria-invalid={errors.bank_account_number ? true : undefined}
                />
                {errors.bank_account_number && (
                  <p className={FIELD_ERROR_CLASS}>
                    {errors.bank_account_number.message}
                  </p>
                )}
              </Field>
            </div>

            <Field>
              <Label variant="editorial" htmlFor="bank_account_name">
                {t("registration.accountHolderName")} {REQ}
              </Label>
              <Input
                variant="boxed"
                id="bank_account_name"
                type="text"
                {...register("bank_account_name")}
                aria-invalid={errors.bank_account_name ? true : undefined}
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

          {/* ───────────────────────────────────────── TERMS ───── */}
          <div className="border-t border-rule-hairline pt-6">
            <label className="flex items-start gap-3 cursor-pointer group">
              <span className="flex items-center h-6 mt-0.5">
                <input
                  type="checkbox"
                  {...register("terms_accepted")}
                  className={cn(
                    "h-4 w-4 rounded-sm border-burgundy/30 text-marigold",
                    "focus:ring-2 focus:ring-marigold focus:ring-offset-2",
                    "transition-colors"
                  )}
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

          {/* ───────────────────────────────────────── ACTIONS ───── */}
          <Turnstile ref={turnstileRef} action="register" className="flex justify-center" />
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

/* ============================================================================
   Section — eyebrow + grouped content. Cleaner than h3 headings inside a long
   form, and consistent with the editorial system used elsewhere.
   ============================================================================ */

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

/* ============================================================================
   PaymentInfoCard — replaces the original `bg-gray-200 rounded` boxes with
   editorial cards.
   ============================================================================ */

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

export default RegistrationModal;
