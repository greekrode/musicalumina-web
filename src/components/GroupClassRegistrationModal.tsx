import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { AlertTriangle, Loader2 } from "lucide-react";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";
import { z } from "zod";
import { useLanguage } from "../lib/LanguageContext";
import { supabase } from "../lib/supabase";
import { EmailService } from "../lib/email";
import FileUpload from "./FileUpload";
import LoadingModal from "./LoadingModal";
import Modal from "./Modal";
import ThankYouModal from "./ThankYouModal";
import { LarkService } from "@/lib/lark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eyebrow } from "@/components/ui/eyebrow";
import { cn } from "@/lib/utils";

const MAX_FILE_SIZE = 5 * 1024 * 1024;

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

const SELECT_CLASSES = [
  "w-full h-11 px-3 py-2 rounded-sm border border-burgundy/20 bg-surface-elevated",
  "font-sans text-body-md text-ink-body",
  "transition-[border-color,background-color,box-shadow] duration-fast ease-out-quart",
  "hover:border-burgundy/40",
  "focus:outline-none focus:border-marigold focus:ring-2 focus:ring-marigold/20",
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
    watch,
    formState: { errors },
  } = useForm<RegistrationForm>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      registrant_status: "personal",
      registrant_whatsapp: "",
    },
  });

  const registrantStatus = watch("registrant_status");

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

  const onSubmit = async (data: RegistrationForm) => {
    try {
      setIsSubmitting(true);
      setShowLoadingModal(true);

      if (!validateFiles()) {
        setIsSubmitting(false);
        setShowLoadingModal(false);
        return;
      }

      const uploadPromises = [
        uploadFile(files.payment_receipt.file!, "payment-receipts"),
      ];
      const uploadedFiles = await Promise.all(uploadPromises);
      const [paymentReceiptUrl] = uploadedFiles;

      if (!data.registrant_name || data.registrant_name === "") {
        data.registrant_name = data.participant_name;
      }

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

      if (registrationError) throw registrationError;

      const uuid = registration.id;
      const phone = data.registrant_whatsapp.replace(/\D/g, "");
      const refNumber = `${uuid.slice(-4)}-${phone.slice(-4)}`;

      if (!import.meta.env.DEV) {
        window.umami?.track("group_class_registration_submitted", { eventId });
      }

      // Fetch event with `type` so the Lark payload includes it.
      // (This was a pre-existing TS error in the original implementation.)
      const { data: eventData, error: eventError } = await supabase
        .from("events")
        .select("lark_base, lark_table, type")
        .eq("id", eventId)
        .single();

      if (eventError) {
        console.error("Error fetching event data for Lark:", eventError);
      } else if (eventData.lark_base && eventData.lark_table) {
        try {
          await new Promise((resolve) => setTimeout(resolve, 500));
          await LarkService.sendRegistrationData({
            event: {
              id: eventId,
              lark_base: eventData.lark_base,
              lark_table: eventData.lark_table,
              type: eventData.type,
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
        await EmailService.sendGroupClassRegistrationEmail({
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
        console.error("Error sending email:", error);
      }

      setRegistrationRef(refNumber);
      setRegisteredName(data.participant_name);
      setShowThankYou(true);
      reset();
      setFiles({ payment_receipt: { file: null } });
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
        eyebrow="Group class entry"
        title={t("groupClass.registration.title")}
        maxWidth="2xl"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-10">
          {errors.root && (
            <div className="border-l-2 border-[color:var(--status-error)] bg-[color:var(--status-error-bg)] text-[color:var(--status-error)] px-5 py-4 flex items-start gap-3">
              <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <span className="type-body-sm">{errors.root.message}</span>
            </div>
          )}

          {/* Registrant */}
          <Section eyebrow="01 · Registrant">
            <Field>
              <Label variant="editorial" htmlFor="g_registrant_status">
                {t("registration.registrantStatus")}
              </Label>
              <select
                id="g_registrant_status"
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
                <Label variant="editorial" htmlFor="g_registrant_name">
                  {t("registration.registrantName")}
                </Label>
                <Input
                  variant="boxed"
                  id="g_registrant_name"
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
              <Label variant="editorial" htmlFor="g_registrant_whatsapp">
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
                    inputProps={{ id: "g_registrant_whatsapp" }}
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
              <Label variant="editorial" htmlFor="g_registrant_email">
                {t("registration.email")} {REQ}
              </Label>
              <Input
                variant="boxed"
                id="g_registrant_email"
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
          <Section eyebrow="02 · Participant">
            <div className="grid grid-cols-1 sm:grid-cols-[2fr_1fr] gap-6">
              <Field>
                <Label variant="editorial" htmlFor="g_participant_name">
                  {t("registration.fullName")} {REQ}
                </Label>
                <Input
                  variant="boxed"
                  id="g_participant_name"
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
                <Label variant="editorial" htmlFor="g_participant_age">
                  {t("groupClass.registration.participantAge")} {REQ}
                </Label>
                <Input
                  variant="boxed"
                  id="g_participant_age"
                  type="number"
                  {...register("participant_age")}
                />
                {errors.participant_age && (
                  <p className={FIELD_ERROR_CLASS}>
                    {errors.participant_age.message}
                  </p>
                )}
              </Field>
            </div>
          </Section>

          {/* Payment */}
          <Section eyebrow="03 · Payment">
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
                <Label variant="editorial" htmlFor="g_bank_name">
                  {t("registration.bankName")} {REQ}
                </Label>
                <Input
                  variant="boxed"
                  id="g_bank_name"
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
                <Label variant="editorial" htmlFor="g_bank_account_number">
                  {t("registration.accountNumber")} {REQ}
                </Label>
                <Input
                  variant="boxed"
                  id="g_bank_account_number"
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
              <Label variant="editorial" htmlFor="g_bank_account_name">
                {t("registration.accountHolderName")} {REQ}
              </Label>
              <Input
                variant="boxed"
                id="g_bank_account_name"
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
                {onOpenTerms && (
                  <button
                    type="button"
                    onClick={onOpenTerms}
                    className="text-burgundy underline underline-offset-2 hover:text-marigold transition-colors"
                  >
                    {t("registration.termsLink")}
                  </button>
                )}
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
