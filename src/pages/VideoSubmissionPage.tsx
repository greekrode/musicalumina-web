import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  Loader2,
  X,
} from "lucide-react";
import { useLanguage } from "../lib/LanguageContext";
import PageTransition from "../components/PageTransition";
import { LarkService } from "../lib/lark";
import { Section, Container } from "@/components/ui/section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eyebrow } from "@/components/ui/eyebrow";
import { WireframeWave } from "@/components/ui/wireframe-wave";
import {
  PageHeader,
  PageHeaderEyebrow,
  PageHeaderLede,
  PageHeaderTitle,
} from "@/components/ui/page-header";
import { cn } from "@/lib/utils";
import { usePageTitle } from "../hooks/usePageTitle";

/* ============================================================================
   Schema + types — preserved 1:1 from original implementation.
   ============================================================================ */

function createVideoSubmissionSchema(t: (key: string) => string) {
  return z.object({
    registration_reference: z
      .string()
      .min(1, t("validation.enterReferenceCode"))
      .max(50, t("validation.maxReferenceLength"))
      .trim(),
    video_url: z
      .string()
      .min(1, t("validation.enterVideoUrl"))
      .url(t("validation.invalidUrl"))
      .trim(),
  });
}

type VideoSubmissionForm = z.infer<
  ReturnType<typeof createVideoSubmissionSchema>
>;

interface ParticipantData {
  participantName: string;
  category: string;
  subCategory: string;
  songTitle: string;
  hasVideoSubmitted: boolean;
  existingVideoUrl?: string;
  recordId: string;
}

/* ============================================================================
   Motion primitives — same cadence as the rest of the editorial system.
   ============================================================================ */

const EASE = [0.19, 1, 0.22, 1] as const;

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
};

const stagger = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.08 },
  },
};


/* ============================================================================
   Page
   ============================================================================ */

export default function VideoSubmissionPage() {
  const { t } = useLanguage();
  const reduceMotion = useReducedMotion();
  const initial = reduceMotion ? false : "hidden";

  usePageTitle(t("videoSubmissionForm.title"));

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [participantData, setParticipantData] =
    useState<ParticipantData | null>(null);
  const [isLoadingParticipant, setIsLoadingParticipant] = useState(false);
  const [loadParticipantError, setLoadParticipantError] = useState<
    string | null
  >(null);

  const videoSubmissionSchema = createVideoSubmissionSchema(t);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    watch,
    formState: { errors },
  } = useForm<VideoSubmissionForm>({
    resolver: zodResolver(videoSubmissionSchema),
    defaultValues: {
      registration_reference: "",
      video_url: "",
    },
  });

  const registrationReference = watch("registration_reference");

  // Reset participant data when reference changes — preserved.
  useEffect(() => {
    if (!registrationReference || registrationReference.trim() === "") {
      setParticipantData(null);
      setLoadParticipantError(null);
    }
  }, [registrationReference]);

  const loadParticipantData = async () => {
    if (!registrationReference || registrationReference.trim() === "") return;

    try {
      setIsLoadingParticipant(true);
      setLoadParticipantError(null);

      const data = await LarkService.searchParticipantData(
        registrationReference.trim()
      );
      setParticipantData(data);
    } catch (error) {
      console.error("Failed to load participant data:", error);
      setLoadParticipantError(t("videoSubmissionForm.invalidReferenceCode"));
      setParticipantData(null);
    } finally {
      setIsLoadingParticipant(false);
    }
  };

  const onSubmit = async (data: VideoSubmissionForm) => {
    if (!participantData) {
      setError("root", {
        type: "manual",
        message:
          "Participant data not loaded. Please load participant data first.",
      });
      return;
    }

    try {
      setIsSubmitting(true);

      await LarkService.updateParticipantVideo(
        participantData.recordId,
        data.video_url,
        participantData.participantName,
        participantData.category,
        participantData.subCategory
      );

      setSubmitSuccess(true);
      reset();
      setParticipantData(null);

      setTimeout(() => setSubmitSuccess(false), 3000);
    } catch (error) {
      console.error("Video submission failed:", error);
      setError("root", {
        type: "manual",
        message:
          error instanceof Error
            ? error.message
            : "Submission failed. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const showVideoStep =
    participantData !== null && !participantData.hasVideoSubmitted;
  const alreadySubmitted =
    participantData !== null && participantData.hasVideoSubmitted;
  const hasReference =
    registrationReference !== undefined &&
    registrationReference.trim() !== "";

  return (
    <PageTransition>
      <div className="bg-surface-canvas">
        {/* ============================================================
            HEADER
            ============================================================ */}
        <section className="relative overflow-hidden pt-28 md:pt-32 lg:pt-36 pb-10 md:pb-12 lg:pb-16">
          <WireframeWave opacity={0.04} amplitude={0.7} lines={6} />
          <Container className="relative">
            <motion.div
              variants={reduceMotion ? undefined : stagger}
              initial={initial}
              animate="visible"
            >
              <PageHeader align="start" className="max-w-3xl">
                <motion.div variants={fadeUp}>
                  <PageHeaderEyebrow>{t("pageCopy.videoSubmission.eyebrow")}</PageHeaderEyebrow>
                </motion.div>
                <motion.div variants={fadeUp}>
                  <PageHeaderTitle size="xl">
                    {t("videoSubmissionForm.title")}
                  </PageHeaderTitle>
                </motion.div>
                <motion.div variants={fadeUp}>
                  <PageHeaderLede>
                    {t("videoSubmissionForm.description")}
                  </PageHeaderLede>
                </motion.div>
              </PageHeader>
            </motion.div>
          </Container>
        </section>

        {/* ============================================================
            FORM
            ============================================================ */}
        <Section tone="canvas" pause="md" rule="top">
          <Container>
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.6, ease: EASE }}
              className="max-w-2xl mx-auto"
            >
              {/* Success banner — appears for 3s after submission */}
              {submitSuccess && (
                <StatusBanner kind="success" className="mb-8">
                  <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                  {t("videoSubmissionForm.successMessage")}
                </StatusBanner>
              )}

              <form
                onSubmit={handleSubmit(onSubmit)}
                noValidate
                className="flex flex-col gap-10"
              >
                {/* ─── Step 1: Reference code ─── */}
                <FormStep label={t("pageCopy.videoSubmission.step1")}>
                  <div>
                    <Label variant="editorial" htmlFor="registration_reference">
                      {t("videoSubmissionForm.referenceCode")}{" "}
                      <span className="text-[color:var(--status-error)]">
                        *
                      </span>
                    </Label>
                    <div className="relative">
                      <Input
                        variant="boxed"
                        id="registration_reference"
                        type="text"
                        {...register("registration_reference")}
                        placeholder={t(
                          "videoSubmissionForm.referenceCodePlaceholder"
                        )}
                        className="pr-10"
                        required
                        aria-invalid={
                          errors.registration_reference ? true : undefined
                        }
                      />
                      {hasReference && (
                        <button
                          type="button"
                          aria-label="Clear reference code"
                          onClick={() => {
                            reset({
                              registration_reference: "",
                              video_url: "",
                            });
                            setParticipantData(null);
                            setLoadParticipantError(null);
                          }}
                          className={cn(
                            "absolute inset-y-0 right-0 flex items-center pr-3",
                            "text-ink-muted hover:text-burgundy transition-colors duration-fast",
                            "focus-visible:outline-none focus-visible:text-burgundy"
                          )}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    {errors.registration_reference && (
                      <p className="mt-2 type-caption text-[color:var(--status-error)]">
                        {errors.registration_reference.message}
                      </p>
                    )}
                    <p className="mt-2 type-caption text-ink-muted">
                      {t("videoSubmissionForm.referenceCodeHelp")}
                    </p>
                  </div>

                  {/* Load participant button — only when reference entered AND no participant loaded */}
                  {hasReference && !participantData && (
                    <div>
                      <Button
                        type="button"
                        variant="elegant"
                        onClick={loadParticipantData}
                        disabled={isLoadingParticipant}
                      >
                        {isLoadingParticipant && (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        )}
                        {isLoadingParticipant
                          ? t("videoSubmissionForm.loadingParticipantData")
                          : t("videoSubmissionForm.loadParticipantData")}
                      </Button>
                    </div>
                  )}

                  {loadParticipantError && (
                    <StatusBanner kind="error">
                      <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                      {loadParticipantError}
                    </StatusBanner>
                  )}
                </FormStep>

                {/* ─── Step 2: Confirm participant (read-only fields) ─── */}
                {participantData && (
                  <FormStep label={t("pageCopy.videoSubmission.step2")}>
                    <div className="bg-surface-canvas-warm border border-rule-hairline p-6 lg:p-7">
                      <Eyebrow className="mb-5">
                        {t("pageCopy.videoSubmission.participantInfoHeading")}
                      </Eyebrow>
                      <dl className="flex flex-col gap-4">
                        <ReadOnlyRow
                          label={t("videoSubmissionForm.participantName")}
                          value={participantData.participantName}
                        />
                        <ReadOnlyRow
                          label={t("videoSubmissionForm.category")}
                          value={participantData.category}
                        />
                        <ReadOnlyRow
                          label={t("videoSubmissionForm.subCategory")}
                          value={participantData.subCategory}
                        />
                        <ReadOnlyRow
                          label={t("videoSubmissionForm.songTitle")}
                          value={participantData.songTitle}
                        />
                      </dl>
                    </div>
                  </FormStep>
                )}

                {/* ─── Already submitted state ─── */}
                {alreadySubmitted && (
                  <StatusBanner kind="error">
                    <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                    <div className="flex flex-col gap-2">
                      <span className="type-body-md font-semibold">
                        {t("videoSubmissionForm.unableToSubmit")}
                      </span>
                      {participantData?.existingVideoUrl && (
                        <div className="flex flex-col gap-1">
                          <span className="type-label opacity-80">
                            {t("videoSubmissionForm.existingVideoUrl")}
                          </span>
                          <a
                            href={participantData.existingVideoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={cn(
                              "type-body-sm underline underline-offset-2 break-all",
                              "hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current rounded-sm",
                              "inline-flex items-start gap-1.5"
                            )}
                          >
                            <span className="break-all">
                              {participantData.existingVideoUrl}
                            </span>
                            <ArrowUpRight className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                          </a>
                        </div>
                      )}
                    </div>
                  </StatusBanner>
                )}

                {/* ─── Step 3: Video URL + submit (only when not already submitted) ─── */}
                {showVideoStep && (
                  <FormStep label={t("pageCopy.videoSubmission.step3")}>
                    <div>
                      <Label variant="editorial" htmlFor="video_url">
                        {t("videoSubmissionForm.videoUrl")}{" "}
                        <span className="text-[color:var(--status-error)]">
                          *
                        </span>
                      </Label>
                      <Input
                        variant="boxed"
                        id="video_url"
                        type="url"
                        {...register("video_url")}
                        placeholder={t(
                          "videoSubmissionForm.videoUrlPlaceholder"
                        )}
                        required
                        aria-invalid={errors.video_url ? true : undefined}
                      />
                      {errors.video_url && (
                        <p className="mt-2 type-caption text-[color:var(--status-error)]">
                          {errors.video_url.message}
                        </p>
                      )}
                      <p className="mt-2 type-caption text-ink-muted">
                        {t("videoSubmissionForm.videoUrlHelp")}
                      </p>
                    </div>

                    <StatusBanner kind="warn">
                      <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                      <span className="type-body-sm">
                        {t("videoSubmissionForm.warningMessage")}
                      </span>
                    </StatusBanner>

                    {errors.root && (
                      <StatusBanner kind="error">
                        <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                        {errors.root.message}
                      </StatusBanner>
                    )}

                    <Button
                      type="submit"
                      size="lg"
                      disabled={isSubmitting}
                      className="w-full"
                    >
                      {isSubmitting && (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      )}
                      {isSubmitting
                        ? t("videoSubmissionForm.submitting")
                        : t("videoSubmissionForm.submit")}
                    </Button>
                  </FormStep>
                )}
              </form>
            </motion.div>
          </Container>
        </Section>
      </div>
    </PageTransition>
  );
}

/* ============================================================================
   FormStep — wraps each step in an eyebrow-labelled block. Cascades in with
   a soft fade so newly-revealed steps feel intentional.
   ============================================================================ */

function FormStep({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE }}
      className="flex flex-col gap-5"
    >
      <Eyebrow withRule>{label}</Eyebrow>
      {children}
    </motion.div>
  );
}

/* ============================================================================
   ReadOnlyRow — displays loaded participant data as a definition row.
   ============================================================================ */

function ReadOnlyRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-[180px_1fr] gap-1 sm:gap-4 items-baseline">
      <dt className="type-label text-ink-muted">{label}</dt>
      <dd className="type-body-md text-burgundy">{value || "—"}</dd>
    </div>
  );
}

/* ============================================================================
   StatusBanner — semantic status block (success / error / warn) using the
   design system's status tokens. Replaces the original `bg-red-50` /
   `bg-green-50` ad-hoc utility classes.
   ============================================================================ */

function StatusBanner({
  kind,
  children,
  className,
}: {
  kind: "success" | "error" | "warn";
  children: React.ReactNode;
  className?: string;
}) {
  const palette =
    kind === "success"
      ? "border-[color:var(--status-open)] bg-[color:var(--status-open-bg)] text-[color:var(--status-open)]"
      : kind === "warn"
        ? "border-[color:var(--status-upcoming)] bg-[color:var(--status-upcoming-bg)] text-[color:var(--status-upcoming)]"
        : "border-[color:var(--status-error)] bg-[color:var(--status-error-bg)] text-[color:var(--status-error)]";

  return (
    <div
      role="status"
      className={cn(
        "border-l-2 px-5 py-4",
        "flex items-start gap-3",
        "type-body-sm",
        palette,
        className
      )}
    >
      {children}
    </div>
  );
}
