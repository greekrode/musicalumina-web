import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import TermsModal from "../components/TermsModal";
import GroupClassRegistrationModal from "../components/GroupClassRegistrationModal";
import { useEvent } from "../hooks/useEvent";
import {
  formatDateWithLocale,
  formatMultipleDatesWithLocale,
} from "../lib/utils";
import LoadingSpinner from "../components/LoadingSpinner";
import type { Database } from "../lib/database.types";
import { usePageTitle } from "../hooks/usePageTitle";
import type { PostgrestError } from "@supabase/supabase-js";
import { useLanguage } from "../lib/LanguageContext";
import { supabase } from "../lib/supabase";
import { Section, Container } from "@/components/ui/section";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eyebrow } from "@/components/ui/eyebrow";
import { NoteGlyph } from "@/components/ui/wireframe-wave";

/* ============================================================================
   Types — preserved from original implementation.
   ============================================================================ */

type EventJuror = Omit<
  Database["public"]["Tables"]["event_jury"]["Row"],
  "credentials"
> & {
  credentials: string | null;
};

type RegistrationFee =
  Database["public"]["Tables"]["event_registration_fees"]["Row"];

type Event = Database["public"]["Tables"]["events"]["Row"] & {
  event_jury: EventJuror[];
  event_registration_fees?: RegistrationFee[];
};

/* ============================================================================
   Motion primitives.
   ============================================================================ */

const EASE = [0.19, 1, 0.22, 1] as const;

const stagger = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.1 },
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE } },
};

const fadeUpSoft = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
};

const viewportOnce = { once: true, margin: "-80px" } as const;


/* ============================================================================
   Page
   ============================================================================ */

function GroupClassDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const initial = reduceMotion ? false : "hidden";

  const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);
  const [isRegistrationModalOpen, setIsRegistrationModalOpen] = useState(false);

  const { event, loading, error } = useEvent(id || "") as {
    event: Event | null;
    loading: boolean;
    error: PostgrestError | null;
  };
  const { t, language } = useLanguage();

  const [registrationFees, setRegistrationFees] = useState<RegistrationFee[]>(
    []
  );
  const [feesLoading, setFeesLoading] = useState(true);

  usePageTitle(event?.title || "");

  useEffect(() => {
    async function fetchRegistrationFees() {
      if (!event?.id) return;
      try {
        setFeesLoading(true);
        const { data, error: fetchError } = await supabase
          .from("event_registration_fees")
          .select("*")
          .eq("event_id", event.id)
          .order("price");
        if (fetchError) throw fetchError;
        if (data) setRegistrationFees(data);
      } catch (err) {
        console.error("Error fetching registration fees:", err);
      } finally {
        setFeesLoading(false);
      }
    }
    fetchRegistrationFees();
  }, [event?.id]);

  const handleBackClick = (e: React.MouseEvent) => {
    e.preventDefault();
    navigate("/events");
  };

  const handleRegistrationClick = () => {
    if (!import.meta.env.DEV) {
      window.umami?.track("register_now_click", {
        type: "group_class",
        eventId: id,
      });
    }
    setIsRegistrationModalOpen(true);
  };

  if (loading || feesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-canvas pt-20">
        <LoadingSpinner message={t("loading.loadingEventDetails")} />
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-surface-canvas pt-32">
        <Container>
          <button
            onClick={handleBackClick}
            className="type-label inline-flex items-center gap-2 text-ink-accent hover:text-marigold transition-colors mb-10"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("eventDetails.backToEvents")}
          </button>
          <div className="flex flex-col gap-5 max-w-prose border-l-2 border-marigold pl-8 py-8">
            <Eyebrow withRule>{t("pageCopy.groupClass.importantLabel")}</Eyebrow>
            <h2 className="type-display-md text-burgundy">
              {error
                ? t("eventDetails.errorLoading")
                : t("eventDetails.notFound")}
            </h2>
            <p className="type-body-lg text-ink-muted">
              {error
                ? t("eventDetails.errorMessage")
                : t("eventDetails.notFoundMessage")}
            </p>
            <div>
              <Button size="lg" onClick={() => navigate("/events")}>
                {t("eventDetails.viewAllEvents")}
                <ArrowUpRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Container>
      </div>
    );
  }

  const instructor = event.event_jury[0];
  const statusBadge =
    event.status === "ongoing"
      ? { status: "open" as const, label: t("eventCard.statusOpen") }
      : event.status === "completed"
        ? { status: "ended" as const, label: t("eventCard.statusConcluded") }
        : { status: "upcoming" as const, label: t("eventCard.statusUpcoming") };

  return (
    <div className="bg-surface-canvas">
      {/* ================================================================
          HERO
          ================================================================ */}
      <section className="pt-28 md:pt-28 lg:pt-32 pb-10 md:pb-16 lg:pb-24">
        <Container>
          <motion.button
            onClick={handleBackClick}
            className="type-label inline-flex items-center gap-2 text-ink-accent hover:text-marigold transition-colors mb-10"
            initial={reduceMotion ? false : { opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, ease: EASE }}
          >
            <ArrowLeft className="h-4 w-4" />
            {t("eventDetails.backToEvents")}
          </motion.button>

          <motion.div
            variants={reduceMotion ? undefined : stagger}
            initial={initial}
            animate="visible"
            className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-start"
          >
            <div className="lg:col-span-6 flex flex-col gap-6">
              <motion.div variants={fadeUpSoft}>
                <Eyebrow withRule>{t("pageCopy.groupClass.eyebrow")}</Eyebrow>
              </motion.div>
              <motion.h1
                variants={fadeUp}
                className="type-display-lg text-burgundy text-balance"
              >
                {event.title}
              </motion.h1>
              <motion.div variants={fadeUpSoft}>
                <Badge status={statusBadge.status} dot>
                  {statusBadge.label}
                </Badge>
              </motion.div>
              {event.description && (
                <motion.div
                  variants={fadeUpSoft}
                  className="type-body-lg text-ink-body prose prose-sm max-w-prose"
                  dangerouslySetInnerHTML={{
                    __html:
                      event.description[language] ||
                      event.description.en ||
                      "",
                  }}
                />
              )}

              <motion.dl
                variants={fadeUpSoft}
                className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6"
              >
                <MetaItem label={t("eventDetails.eventDate")}>
                  <span className="whitespace-pre-line">
                    {event.event_date
                      ? formatMultipleDatesWithLocale(event.event_date, language)
                      : t("common.tbd")}
                  </span>
                </MetaItem>
                <MetaItem label={t("eventDetails.venue")}>
                  {event.location}
                  {event.venue_details && (
                    <span className="block type-caption text-ink-muted mt-1">
                      {event.venue_details}
                    </span>
                  )}
                </MetaItem>
                {event.registration_deadline && (
                  <MetaItem label={t("eventDetails.registrationDeadline")}>
                    {formatDateWithLocale(
                      event.registration_deadline,
                      language
                    )}
                  </MetaItem>
                )}
                {registrationFees.length > 0 && (
                  <MetaItem
                    label={t("groupClass.registrationFees")}
                    className="sm:col-span-2"
                  >
                    <ul className="flex flex-col gap-1">
                      {registrationFees.map((fee) => (
                        <li
                          key={fee.id}
                          className="type-body-md text-burgundy"
                        >
                          IDR {fee.price.toLocaleString()}
                          <span className="text-ink-muted"> / {fee.uom}</span>
                        </li>
                      ))}
                    </ul>
                  </MetaItem>
                )}
              </motion.dl>

              {event.status === "ongoing" && (
                <motion.div
                  variants={fadeUpSoft}
                  className="mt-6 flex flex-wrap items-center gap-3"
                >
                  <Button size="lg" onClick={handleRegistrationClick}>
                    {t("eventDetails.registerNow")}
                  </Button>
                </motion.div>
              )}
            </div>

            <motion.div
              variants={fadeUp}
              className="hidden lg:block lg:col-span-6 relative aspect-[3/4] overflow-hidden bg-surface-canvas-warm border border-rule-hairline"
            >
              {event.poster_image ? (
                <img
                  src={event.poster_image}
                  alt={event.title}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="h-full w-full flex items-center justify-center text-ink-subtle">
                  <NoteGlyph size={96} className="text-marigold/20" />
                </div>
              )}
              <span
                aria-hidden
                className="absolute inset-x-0 top-0 h-[2px] bg-marigold"
              />
            </motion.div>
          </motion.div>
        </Container>
      </section>

      {/* ================================================================
          IMPORTANT INFO — terms
          ================================================================ */}
      {event.terms_and_conditions && (
        <Section tone="warm" pause="sm" rule="top">
          <Container>
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={viewportOnce}
              transition={{ duration: 0.7, ease: EASE }}
              className="flex flex-col md:flex-row md:items-center md:justify-between gap-5"
            >
              <div className="flex flex-col gap-2 max-w-2xl">
                <Eyebrow withRule>{t("pageCopy.groupClass.importantLabel")}</Eyebrow>
                <p className="type-body-md text-ink-body">
                  {t("eventDetails.reviewTerms")}
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => setIsTermsModalOpen(true)}
              >
                {t("eventDetails.viewTerms")}
              </Button>
            </motion.div>
          </Container>
        </Section>
      )}

      {/* ================================================================
          INSTRUCTOR — single featured profile.
          GroupClass description preserves the explicit \n splitting from the
          original implementation (different from masterclass which renders
          HTML directly).
          ================================================================ */}
      {instructor && (
        <Section tone="canvas" pause="md" rule="top">
          <Container>
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={viewportOnce}
              transition={{ duration: 0.6, ease: EASE }}
              className="max-w-3xl mb-10 lg:mb-12"
            >
              <Eyebrow withRule>{t("pageCopy.groupClass.instructorEyebrow")}</Eyebrow>
              <h2 className="type-headline-lg text-burgundy mt-3">
                {t("masterclass.instructor")}
              </h2>
            </motion.div>

            <InstructorCard instructor={instructor} reduceMotion={reduceMotion} />
          </Container>
        </Section>
      )}

      {/* ================================================================
          MODALS
          ================================================================ */}
      <GroupClassRegistrationModal
        isOpen={isRegistrationModalOpen}
        onClose={() => setIsRegistrationModalOpen(false)}
        eventId={event.id}
        eventName={event.title}
        onOpenTerms={() => setIsTermsModalOpen(true)}
      />

      <TermsModal
        isOpen={isTermsModalOpen}
        onClose={() => setIsTermsModalOpen(false)}
        terms={
          event?.terms_and_conditions?.[language] ||
          event?.terms_and_conditions?.en
        }
      />
    </div>
  );
}

/* ============================================================================
   MetaItem
   ============================================================================ */

function MetaItem({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-col gap-1 ${className ?? ""}`}>
      <dt className="type-label text-ink-accent">{label}</dt>
      <dd className="type-body-md text-burgundy">{children}</dd>
    </div>
  );
}

/* ============================================================================
   InstructorCard — preserves the original \n-split rendering for GroupClass
   instructor descriptions (which arrive as plain text, not HTML).
   ============================================================================ */

function InstructorCard({
  instructor,
  reduceMotion,
}: {
  instructor: EventJuror;
  reduceMotion: boolean | null;
}) {
  const lines = instructor.description
    ? instructor.description.replace(/\\n/g, "\n").split("\n").filter(Boolean)
    : [];

  return (
    <motion.article
      initial={reduceMotion ? false : { opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={viewportOnce}
      transition={{ duration: 0.7, ease: EASE }}
      className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start"
    >
      <div className="lg:col-span-5 relative">
        <span
          aria-hidden
          className="absolute inset-x-0 top-0 h-[2px] bg-marigold z-10"
        />
        <div className="aspect-[4/5] overflow-hidden bg-surface-canvas-warm border border-rule-hairline">
          {instructor.avatar_url ? (
            <img
              src={instructor.avatar_url}
              alt={instructor.name}
              loading="lazy"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center text-ink-subtle">
              <NoteGlyph size={64} className="text-marigold/20" />
            </div>
          )}
        </div>
      </div>

      <div className="lg:col-span-7 flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <Eyebrow>{instructor.title}</Eyebrow>
          <h3 className="type-display-md text-burgundy">{instructor.name}</h3>
        </div>
        {lines.length > 0 && (
          <div className="flex flex-col gap-3 max-w-none">
            {lines.map((line, i) => (
              <p key={i} className="type-body-md text-ink-body">
                {line}
              </p>
            ))}
          </div>
        )}
      </div>
    </motion.article>
  );
}

export default GroupClassDetails;
