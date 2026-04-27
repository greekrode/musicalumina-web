import { useEffect, useRef, useState, Suspense } from "react";
import { sanitizeHtml } from "@/lib/sanitize";
import moment from "moment";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ArrowUpRight, ChevronDown, FileDown } from "lucide-react";
import TermsModal from "../components/TermsModal";
import RegistrationModal from "../components/RegistrationModal";
import InvitationPasswordModal from "../components/InvitationPasswordModal";
import { useEvent } from "../hooks/useEvent";
import {
  formatDateWithLocale,
  formatMultipleDatesWithLocale,
  translateDuration,
  translateAgeRequirement,
} from "../lib/utils";
import LoadingSpinner from "../components/LoadingSpinner";
import type { Database } from "../lib/database.types";
import { usePageTitle } from "../hooks/usePageTitle";
import type { PostgrestError } from "@supabase/supabase-js";
import { useRepertoirePdf } from "../hooks/useRepertoirePdf";
import { useLanguage } from "../lib/LanguageContext";
import { Section, Container } from "@/components/ui/section";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eyebrow } from "@/components/ui/eyebrow";
import { NoteGlyph } from "@/components/ui/wireframe-wave";
import { cn } from "@/lib/utils";
import {
  MetaItem,
  PrizesSection,
  JuryPanel,
} from "./EventDetails.sections";

/* ============================================================================
   Types — preserved from original implementation.
   ============================================================================ */

type EventCategory = Database["public"]["Tables"]["event_categories"]["Row"] & {
  event_subcategories: (Database["public"]["Tables"]["event_subcategories"]["Row"] & {
    repertoire?: string[];
    foreign_registration_fee?: Array<{ country: string; fee: string }>;
    foreign_final_registration_fee?: Array<{ country: string; fee: string }>;
    early_bird_foreign_registration_fee?: Array<{ country: string; fee: string }>;
  })[];
  repertoire?: string[];
  prizes: Array<{
    id: string;
    title: string;
    amount?: number | null;
    description?: string | null;
  }>;
  global_prizes: Array<{
    id: string;
    title: string;
    amount?: number | null;
    description?: string | null;
  }>;
};

type EventJuror = Omit<
  Database["public"]["Tables"]["event_jury"]["Row"],
  "credentials"
> & {
  credentials: Record<string, string> | null;
};

type Event = Database["public"]["Tables"]["events"]["Row"] & {
  event_categories: EventCategory[];
  event_jury: EventJuror[];
  registration_count?: number;
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


/* ============================================================================
   Page
   ============================================================================ */

function EventDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();

  const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);
  const [isRegistrationModalOpen, setIsRegistrationModalOpen] = useState(false);
  const [isInvitationPasswordModalOpen, setIsInvitationPasswordModalOpen] =
    useState(false);
  const [validInvitationCodeId, setValidInvitationCodeId] =
    useState<string | null>(null);

  const { event, loading, error } = useEvent(id || "") as {
    event: Event | null;
    loading: boolean;
    error: PostgrestError | null;
  };
  const { t, language } = useLanguage();

  usePageTitle(event?.title || "");

  const handleBackClick = (e: React.MouseEvent) => {
    e.preventDefault();
    navigate("/events");
  };

  const handleRegistrationClick = () => {
    if (!import.meta.env.DEV) {
      window.umami?.track("register_now_click", {
        type: "competition",
        eventId: id,
      });
    }
    setIsRegistrationModalOpen(true);
  };

  const handleWaitlistRegistrationClick = () => {
    if (!import.meta.env.DEV) {
      window.umami?.track("waitlist_register_click", {
        type: "competition",
        eventId: id,
      });
    }
    setIsInvitationPasswordModalOpen(true);
  };

  const handleInvitationPasswordSuccess = (invitationCodeId: string) => {
    setValidInvitationCodeId(invitationCodeId);
    setIsInvitationPasswordModalOpen(false);
    setIsRegistrationModalOpen(true);
  };

  const handleRegistrationModalClose = () => {
    setIsRegistrationModalOpen(false);
    setValidInvitationCodeId(null);
  };

  if (loading) {
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
            <Eyebrow withRule>{t("pageCopy.eventDetails.importantLabel")}</Eyebrow>
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

  const isQuotaFull =
    event.max_quota &&
    event.registration_count !== undefined &&
    event.registration_count >= event.max_quota;

  const isRegistrationClosed =
    event.registration_deadline &&
    moment().isSameOrAfter(moment(event.registration_deadline));

  const hasAnyPrizes = event.event_categories.some(
    (category) =>
      (category.prizes && category.prizes.length > 0) ||
      (category.global_prizes && category.global_prizes.length > 0)
  );

  const registerDisabled = Boolean(
    !event.registration_deadline || isRegistrationClosed || isQuotaFull
  );

  const registerLabel = !event.registration_deadline
    ? t("eventDetails.comingSoon")
    : isQuotaFull
      ? t("eventDetails.quotaFull")
      : isRegistrationClosed
        ? t("eventDetails.registrationClosed")
        : t("eventDetails.registerNow");

  const statusBadge = isQuotaFull
    ? { status: "closed" as const, label: t("eventDetails.quotaFull") }
    : isRegistrationClosed
      ? { status: "ended" as const, label: t("eventCard.statusConcluded") }
      : event.status === "ongoing"
        ? { status: "open" as const, label: t("eventCard.statusOpen") }
        : { status: "upcoming" as const, label: t("eventCard.statusUpcoming") };

  const typeLabel = t(`eventCard.eventTypes.${event.type}`);
  const initial = reduceMotion ? false : "hidden";

  return (
    <div className="bg-surface-canvas">
      {/* ================================================================
          HERO — editorial two-column (content left, image right).
          ================================================================ */}
      <section className="pt-28 md:pt-28 lg:pt-32 pb-10 md:pb-16 lg:pb-24">
        <Container>
          <motion.button
            onClick={handleBackClick}
            className="type-label inline-flex items-center gap-2 text-ink-accent hover:text-marigold transition-colors mb-6 md:mb-10"
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
            {/* Content column */}
            <div className="lg:col-span-6 flex flex-col gap-6">
              <motion.div variants={fadeUpSoft}>
                <Eyebrow withRule>{typeLabel}</Eyebrow>
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
                    __html: sanitizeHtml(
                      event.description[language] ||
                        event.description.en ||
                        ""
                    ),
                  }}
                />
              )}

              {/* Date / Venue / Deadline — editorial grid */}
              <motion.dl
                variants={fadeUpSoft}
                className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6"
              >
                <MetaItem label={t("eventDetails.eventDate")}>
                  <span className="whitespace-pre-line">
                    {formatMultipleDatesWithLocale(event.event_date, language)}
                  </span>
                </MetaItem>
                <MetaItem label={t("eventDetails.venue")}>
                  {event.location}
                </MetaItem>
                {event.registration_deadline && (
                  <MetaItem label={t("eventDetails.registrationDeadline")}>
                    {formatDateWithLocale(
                      event.registration_deadline,
                      language
                    )}
                  </MetaItem>
                )}
                {/* Registration quota intentionally not displayed —
                    `event.max_quota` + `registration_count` are used only for
                    button state (lock + "Quota Full" label). Showing the raw
                    count is poor UX when numbers are low. */}
              </motion.dl>

              {/* Action cluster — terms button intentionally omitted here;
                  the dedicated "Before you register" block below owns that CTA
                  so we don't duplicate it. */}
              {event.status === "ongoing" && (
                <motion.div variants={fadeUpSoft} className="mt-6 flex flex-wrap items-center gap-3">
                  <Button
                    size="lg"
                    onClick={handleRegistrationClick}
                    disabled={registerDisabled}
                  >
                    {registerLabel}
                  </Button>
                  {isQuotaFull && !isRegistrationClosed && (
                    <Button
                      variant="elegant"
                      size="lg"
                      onClick={handleWaitlistRegistrationClick}
                    >
                      Waitlist Registration
                    </Button>
                  )}
                </motion.div>
              )}
            </div>

            {/* Image column — desktop only. On mobile we drop the poster
                entirely so the content fits a phone without a redundant hero
                image eating half the viewport. */}
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
          IMPORTANT INFO — terms block (only shown when terms exist)
          ================================================================ */}
      {event.terms_and_conditions && (
        <Section tone="warm" pause="sm" rule="top">
          <Container>
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.7, ease: EASE }}
              className="flex flex-col md:flex-row md:items-center md:justify-between gap-5"
            >
              <div className="flex flex-col gap-2 max-w-2xl">
                <Eyebrow withRule>{t("pageCopy.eventDetails.importantLabel")}</Eyebrow>
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
          CATEGORIES — proper title (not eyebrow) so the section announces
          itself clearly, and pause reduced to `sm` so the terms block flows
          directly into it.
          ================================================================ */}
      {event.event_categories.length > 0 && (
        <Section tone="canvas" pause="sm" rule="top">
          <Container>
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.6, ease: EASE }}
              className="max-w-3xl mb-8 lg:mb-10"
            >
              <h2 className="type-headline-lg text-burgundy">
                {t("eventDetails.categories")}
              </h2>
              <p className="type-body-lg text-ink-muted mt-3">
                {t("pageCopy.eventDetails.tiersLede")}
              </p>
            </motion.div>

            <Suspense
              fallback={<LoadingSpinner message={t("loading.loadingCategories")} />}
            >
              <AccordionCategories
                categories={event.event_categories}
                eventStartDate={event.start_date}
                earlyBirdEndDate={event.early_bird_end_date}
                reduceMotion={Boolean(reduceMotion)}
              />
            </Suspense>
          </Container>
        </Section>
      )}

      {/* ================================================================
          PRIZES — eyebrow removed (it duplicated the heading), section
          pause reduced to `sm` so prizes sit snugly below categories.
          ================================================================ */}
      {hasAnyPrizes && (
        <Section tone="warm" pause="sm" rule="top">
          <Container>
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.6, ease: EASE }}
              className="max-w-3xl mb-8"
            >
              <h2 className="type-headline-lg text-burgundy mb-3">
                {t("eventDetails.prizes")}
              </h2>
              <p className="type-body-md text-ink-muted">{t("pageCopy.eventDetails.prizesLede")}</p>
            </motion.div>
            <Suspense
              fallback={<LoadingSpinner message={t("loading.loadingPrizes")} />}
            >
              <PrizesSection categories={event.event_categories} />
            </Suspense>
          </Container>
        </Section>
      )}

      {/* ================================================================
          JURY
          ================================================================ */}
      {event.event_jury.length > 0 && (
        <Section tone="canvas" pause="lg" rule="top">
          <Container>
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.7, ease: EASE }}
              className="max-w-3xl mb-12"
            >
              <Eyebrow withRule>{t("eventDetails.juryPanel")}</Eyebrow>
              <h2 className="type-display-md text-burgundy mt-4 mb-5">
                {t("pageCopy.eventDetails.juryHeading")}
              </h2>
              <p className="type-body-lg text-ink-muted">{t("pageCopy.eventDetails.juryLede")}</p>
            </motion.div>
            <Suspense
              fallback={<LoadingSpinner message={t("loading.loadingJury")} />}
            >
              <JuryPanel juryMembers={event.event_jury} />
            </Suspense>
          </Container>
        </Section>
      )}

      {/* ================================================================
          MODALS — wiring preserved 1:1 from original implementation
          ================================================================ */}
      <InvitationPasswordModal
        isOpen={isInvitationPasswordModalOpen}
        onClose={() => setIsInvitationPasswordModalOpen(false)}
        eventId={event.id}
        onSuccess={handleInvitationPasswordSuccess}
      />

      <RegistrationModal
        isOpen={isRegistrationModalOpen}
        onClose={handleRegistrationModalClose}
        eventId={event.id}
        eventName={event.title}
        eventVenue={event.location}
        eventType={event.type}
        categories={event.event_categories}
        maxQuota={validInvitationCodeId ? undefined : event.max_quota || undefined}
        registrationCount={event.registration_count || 0}
        invitationCodeId={validInvitationCodeId}
        onOpenTerms={() => setIsTermsModalOpen(true)}
      />

      <TermsModal
        isOpen={isTermsModalOpen}
        onClose={() => setIsTermsModalOpen(false)}
        terms={
          event.terms_and_conditions?.[language] ||
          event.terms_and_conditions?.en
        }
      />
    </div>
  );
}

/* ============================================================================
   AccordionCategories — owns open/closed state, desktop pill rail, and
   scroll-based active-pill tracking via IntersectionObserver.

   UX contract:
   - First category is expanded on mount; all others start collapsed.
   - Clicking a card header toggles that category (multi-open allowed so
     participants can compare tiers without forced close).
   - On desktop (lg+), a sticky "Jump to" pill rail appears below the main
     nav. Clicking a pill opens that category and smooth-scrolls to it.
   - Active pill tracks the card closest to the top of the viewport.
   ============================================================================ */

function AccordionCategories({
  categories,
  eventStartDate,
  earlyBirdEndDate,
  reduceMotion,
}: {
  categories: EventCategory[];
  eventStartDate?: string;
  earlyBirdEndDate: string | null;
  reduceMotion: boolean;
}) {
  const [openIds, setOpenIds] = useState<Set<string>>(
    () => new Set(categories[0]?.id ? [categories[0].id] : [])
  );
  const [activeId, setActiveId] = useState<string | null>(
    categories[0]?.id ?? null
  );
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Scroll-based active state for the desktop pill rail.
  // Top-band detection: a card is "active" when its top sits in the first
  // third of the viewport.
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort(
            (a, b) =>
              a.boundingClientRect.top - b.boundingClientRect.top
          );
        if (visible.length > 0) {
          setActiveId(visible[0].target.id);
        }
      },
      { rootMargin: "-160px 0px -55% 0px", threshold: 0 }
    );

    categories.forEach((cat) => {
      const el = cardRefs.current[cat.id];
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [categories]);

  const toggleOpen = (id: string) => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleJumpTo = (id: string) => {
    // Ensure card is open before scrolling — collapsed headers are short so
    // scroll math is fine either way, but open state is the user's intent.
    setOpenIds((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    setActiveId(id);

    // Two RAFs gives React time to commit the state update + re-render before
    // we measure position.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const el = cardRefs.current[id];
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
  };

  const showPillRail = categories.length > 1;

  return (
    <>
      {/* "Jump to" pill rail — visible on every breakpoint when there are
          two or more categories. On desktop it becomes sticky under the main
          nav for persistent navigation while reading. On mobile it sits above
          the cards as a horizontal-scroll TOC so phones can see every
          category at a glance without scrolling through them all. */}
      {showPillRail && (
        <div
          className={cn(
            "lg:sticky lg:top-20 z-30 -mx-4 sm:-mx-8 lg:-mx-12 mb-6 lg:mb-8",
            "bg-surface-canvas/90 backdrop-blur-md border-y border-rule-hairline"
          )}
        >
          <div className="px-4 sm:px-8 lg:px-12">
            <div className="flex items-center gap-5 lg:gap-8 py-3 lg:py-3.5 overflow-x-auto no-scrollbar">
              <span className="type-label text-ink-muted flex items-center gap-3 shrink-0">
                <span
                  aria-hidden
                  className="inline-block w-5 h-px bg-marigold"
                />
                Jump to
              </span>
              {categories.map((cat) => {
                const active = activeId === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => handleJumpTo(cat.id)}
                    aria-current={active ? "true" : undefined}
                    className={cn(
                      "relative type-label whitespace-nowrap py-1 shrink-0",
                      "transition-colors duration-fast ease-out-quart",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marigold focus-visible:ring-offset-2 rounded-sm",
                      active
                        ? "text-marigold-700"
                        : "text-ink-muted hover:text-burgundy"
                    )}
                  >
                    {cat.name}
                    <span
                      aria-hidden
                      className={cn(
                        "absolute inset-x-0 -bottom-[12px] lg:-bottom-[14px] h-[2px] bg-marigold origin-left",
                        "transition-transform duration-base ease-out-quart",
                        active ? "scale-x-100" : "scale-x-0"
                      )}
                    />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <motion.div
        variants={reduceMotion ? undefined : stagger}
        initial={reduceMotion ? false : "hidden"}
        whileInView="visible"
        viewport={{ once: true, margin: "-80px" }}
        className="flex flex-col gap-4 lg:gap-5"
      >
        {categories.map((category, idx) => (
          <motion.div
            key={category.id}
            variants={fadeUp}
            id={category.id}
            ref={(el) => {
              cardRefs.current[category.id] = el as HTMLDivElement | null;
            }}
            className="scroll-mt-40"
          >
            <AccordionCategory
              category={category}
              index={idx}
              eventStartDate={eventStartDate}
              earlyBirdEndDate={earlyBirdEndDate}
              isOpen={openIds.has(category.id)}
              onToggle={() => toggleOpen(category.id)}
            />
          </motion.div>
        ))}
      </motion.div>
    </>
  );
}

/* ============================================================================
   getCategoryPreview — computes the collapsed-header subtitle:
   "{N} subcategories · From IDR {min fee}"
   ============================================================================ */

function getCategoryPreview(category: EventCategory): string {
  const parts: string[] = [];
  const subs = category.event_subcategories;
  const subCount = subs.length;

  if (subCount > 0) {
    parts.push(
      `${subCount} ${subCount === 1 ? "subcategory" : "subcategories"}`
    );

    const fees = subs
      .map((s) => s.registration_fee)
      .filter(
        (f): f is number => typeof f === "number" && !Number.isNaN(f) && f > 0
      );
    if (fees.length > 0) {
      const minFee = Math.min(...fees);
      parts.push(`From IDR ${minFee.toLocaleString()}`);
    }
  }

  return parts.join(" · ");
}

/* ============================================================================
   AccordionCategory — single collapsible category card.

   Collapsed:
     ┌────────────────────────────────────┐
     │ Preparatory                    ⌄   │
     │ 5 subcategories · From IDR …      │
     └────────────────────────────────────┘

   Expanded: header + description + category repertoire + subcategory cards.
   Height animated with AnimatePresence for a smooth magazine-drawer feel.
   ============================================================================ */

function AccordionCategory({
  category,
  index,
  eventStartDate,
  earlyBirdEndDate,
  isOpen,
  onToggle,
}: {
  category: EventCategory;
  index: number;
  eventStartDate?: string;
  earlyBirdEndDate: string | null;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const { t, language } = useLanguage();
  const { pdfUrl } = useRepertoirePdf(category.id, eventStartDate);

  const preview = getCategoryPreview(category);
  const panelId = `category-panel-${category.id}`;
  const headerId = `category-header-${category.id}`;

  const accentColor = index === 0 ? "bg-marigold" : "bg-burgundy/40";

  return (
    <article
      className={cn(
        "relative bg-surface-elevated border transition-colors duration-base ease-out-quart",
        isOpen
          ? "border-burgundy/25"
          : "border-rule-hairline hover:border-burgundy/20"
      )}
    >
      {/* Top accent rule — brightens to full marigold when open */}
      <span
        aria-hidden
        className={cn(
          "absolute inset-x-0 top-0 h-[2px] transition-colors duration-base ease-out-quart",
          isOpen ? "bg-marigold" : accentColor
        )}
      />

      {/* Clickable header */}
      <button
        type="button"
        id={headerId}
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-controls={panelId}
        className={cn(
          "w-full text-left p-6 lg:p-8",
          "flex items-center justify-between gap-6",
          "transition-colors duration-fast ease-out-quart",
          "hover:bg-surface-canvas-warm/40",
          "focus-visible:outline-none focus-visible:bg-surface-canvas-warm/60"
        )}
      >
        <div className="flex flex-col gap-1.5 min-w-0">
          <h3 className="type-headline-lg text-burgundy text-balance">
            {category.name}
          </h3>
          {preview && (
            <p className="type-caption text-ink-muted">{preview}</p>
          )}
        </div>
        <ChevronDown
          className={cn(
            "h-5 w-5 flex-shrink-0 transition-[transform,color] duration-base ease-out-quart",
            isOpen ? "rotate-180 text-marigold" : "text-burgundy/60"
          )}
        />
      </button>

      {/* Expandable panel */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.section
            key="panel"
            id={panelId}
            role="region"
            aria-labelledby={headerId}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{
              height: { duration: 0.45, ease: [0.19, 1, 0.22, 1] },
              opacity: { duration: 0.3, ease: [0.19, 1, 0.22, 1] },
            }}
            className="overflow-hidden border-t border-rule-hairline"
          >
            <div className="p-6 lg:p-8 flex flex-col gap-7">
              {/* Repertoire PDF — moved into the expanded body so the header
                  stays focused on name + preview. */}
              {pdfUrl && (
                <div>
                  <a
                    href={pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      "type-label inline-flex items-center gap-2 px-3 py-2 rounded-sm",
                      "border border-burgundy/25 text-burgundy",
                      "transition-colors duration-fast ease-out-quart",
                      "hover:bg-marigold hover:border-marigold hover:text-burgundy",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marigold focus-visible:ring-offset-2"
                    )}
                  >
                    <FileDown className="h-3.5 w-3.5" />
                    {t("eventDetails.downloadRepertoire")}
                  </a>
                </div>
              )}

              {category.description && (
                <div
                  className="type-body-md text-ink-body prose prose-sm max-w-prose"
                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(category.description) }}
                />
              )}

              {/* Category-level repertoire */}
              {category.repertoire &&
                Array.isArray(category.repertoire) &&
                category.repertoire.length > 0 && (
                  <div className="pt-5 border-t border-rule-hairline">
                    <Eyebrow className="mb-4">
                      {t("eventDetails.categoryRepertoire")}
                    </Eyebrow>
                    <div
                      className={cn(
                        "grid gap-x-8 gap-y-2",
                        (category.repertoire as string[]).length > 6
                          ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
                          : "grid-cols-1 md:grid-cols-2"
                      )}
                    >
                      {(category.repertoire as string[]).map((rep, i) => (
                        <div
                          key={i}
                          className="flex items-start gap-2.5 type-body-sm text-ink-body"
                        >
                          <NoteGlyph
                            size={14}
                            className="text-marigold mt-1 flex-shrink-0"
                          />
                          <span>{rep}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              {/* Subcategories */}
              {category.event_subcategories.length > 0 && (
                <div className="pt-5 border-t border-rule-hairline">
                  <Eyebrow className="mb-5">{t("pageCopy.eventDetails.subcategoriesLabel")}</Eyebrow>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                    {category.event_subcategories.map((sub) => (
                      <SubcategoryCard
                        key={sub.id}
                        sub={sub}
                        earlyBirdEndDate={earlyBirdEndDate}
                        t={t}
                        language={language}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.section>
        )}
      </AnimatePresence>
    </article>
  );
}

/* ============================================================================
   SubcategoryCard — inner detail tile within a category.
   All original data (age, fees, foreign fees table, repertoire, duration)
   is rendered; only styling has moved to the editorial system.
   ============================================================================ */

function SubcategoryCard({
  sub,
  earlyBirdEndDate,
  t,
  language,
}: {
  sub: EventCategory["event_subcategories"][number];
  earlyBirdEndDate: string | null;
  t: (key: string) => string;
  language: string;
}) {
  const earlyBirdDate = earlyBirdEndDate
    ? new Date(earlyBirdEndDate)
    : null;
  const isEarlyBirdActive =
    earlyBirdDate != null &&
    !isNaN(earlyBirdDate.getTime()) &&
    earlyBirdDate > new Date();

  const hasEarlyBirdForeignFees = Boolean(
    sub.early_bird_foreign_registration_fee &&
      Array.isArray(sub.early_bird_foreign_registration_fee) &&
      sub.early_bird_foreign_registration_fee.length > 0
  );

  const hasForeignFees = Boolean(
    (sub.foreign_registration_fee &&
      Array.isArray(sub.foreign_registration_fee) &&
      sub.foreign_registration_fee.length > 0) ||
      (sub.foreign_final_registration_fee &&
        Array.isArray(sub.foreign_final_registration_fee) &&
        sub.foreign_final_registration_fee.length > 0) ||
      (isEarlyBirdActive && hasEarlyBirdForeignFees)
  );

  return (
    <div className="bg-surface-canvas-warm border border-rule-hairline p-6 flex flex-col gap-4">
      <h4 className="type-headline-sm text-burgundy">{sub.name}</h4>

      {sub.requirements && (
        <div
          className="type-body-sm text-ink-body prose prose-sm"
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(sub.requirements) }}
        />
      )}

      <dl className="flex flex-col gap-3 pt-2 border-t border-rule-hairline">
        <div className="flex flex-col gap-1">
          <dt className="type-label text-ink-accent">
            {t("eventDetails.ageRequirement")}
          </dt>
          <dd className="type-body-sm text-ink-body">
            {translateAgeRequirement(sub.age_requirement, language)}
          </dd>
        </div>

        {isEarlyBirdActive && sub.early_bird_registration_fee != null && (
          <div className="flex flex-col gap-1">
            <dt className="type-label text-ink-accent flex items-baseline gap-2 flex-wrap">
              {t("eventDetails.earlyBirdFee")}
              <span className="type-caption text-marigold font-medium">
                {t("eventDetails.earlyBirdEnds")}{" "}
                {formatDateWithLocale(earlyBirdEndDate!, language)}
              </span>
            </dt>
            <dd className="type-title-md text-burgundy">
              IDR {sub.early_bird_registration_fee.toLocaleString()}
            </dd>
          </div>
        )}

        <div className="flex flex-col gap-1">
          <dt className="type-label text-ink-accent">
            {sub.final_registration_fee
              ? t("eventDetails.prelimRegistrationFee")
              : t("eventDetails.registrationFee")}
          </dt>
          <dd className="type-title-md text-burgundy">
            IDR {sub.registration_fee.toLocaleString()}
          </dd>
        </div>

        {sub.final_registration_fee && (
          <div className="flex flex-col gap-1">
            <dt className="type-label text-ink-accent">
              {t("eventDetails.finalRegistrationFee")}
            </dt>
            <dd className="type-title-md text-burgundy">
              IDR {sub.final_registration_fee.toLocaleString()}
            </dd>
          </div>
        )}

        {hasForeignFees && (
          <div className="flex flex-col gap-2">
            <dt className="type-label text-ink-accent">
              {t("eventDetails.foreignRegistrationFees")}
            </dt>
            <dd className="overflow-x-auto">
              <table className="w-full text-body-sm">
                <thead>
                  <tr className="border-b border-rule-hairline">
                    <th className="text-left py-2 pr-3 type-label text-ink-muted">
                      {t("eventDetails.country")}
                    </th>
                    {sub.foreign_registration_fee &&
                    Array.isArray(sub.foreign_registration_fee) &&
                    sub.foreign_registration_fee.length > 0 ? (
                      sub.final_registration_fee ? (
                        <th className="text-left py-2 pr-3 type-label text-ink-muted">
                          {t("eventDetails.prelimRegistrationFee")}
                        </th>
                      ) : (
                        <th className="text-left py-2 pr-3 type-label text-ink-muted">
                          {t("eventDetails.registrationFee")}
                        </th>
                      )
                    ) : null}
                    {sub.foreign_final_registration_fee &&
                      Array.isArray(sub.foreign_final_registration_fee) &&
                      sub.foreign_final_registration_fee.length > 0 && (
                        <th className="text-left py-2 pr-3 type-label text-ink-muted">
                          {t("eventDetails.finalRegistrationFee")}
                        </th>
                      )}
                    {isEarlyBirdActive && hasEarlyBirdForeignFees && (
                      <th className="text-left py-2 type-label text-ink-muted">
                        {t("eventDetails.earlyBirdForeignFees")}
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const regFees =
                      (sub.foreign_registration_fee as Array<{
                        country: string;
                        fee: string;
                      }>) || [];
                    const finalFees =
                      (sub.foreign_final_registration_fee as Array<{
                        country: string;
                        fee: string;
                      }>) || [];
                    const earlyBirdFees =
                      (sub.early_bird_foreign_registration_fee as Array<{
                        country: string;
                        fee: string;
                      }>) || [];
                    const allCountries = new Set<string>();
                    regFees.forEach((f) => allCountries.add(f.country));
                    finalFees.forEach((f) => allCountries.add(f.country));
                    if (isEarlyBirdActive) {
                      earlyBirdFees.forEach((f) =>
                        allCountries.add(f.country)
                      );
                    }

                    return Array.from(allCountries).map((country) => {
                      const regFee = regFees.find((f) => f.country === country);
                      const finalFee = finalFees.find(
                        (f) => f.country === country
                      );
                      const earlyBirdFee = earlyBirdFees.find(
                        (f) => f.country === country
                      );
                      return (
                        <tr
                          key={country}
                          className="border-b border-rule-hairline/60"
                        >
                          <td className="py-2 pr-3 text-ink-body">{country}</td>
                          {sub.foreign_registration_fee &&
                            Array.isArray(sub.foreign_registration_fee) &&
                            sub.foreign_registration_fee.length > 0 && (
                              <td className="py-2 pr-3 text-ink-body">
                                {regFee ? regFee.fee : "—"}
                              </td>
                            )}
                          {sub.foreign_final_registration_fee &&
                            Array.isArray(sub.foreign_final_registration_fee) &&
                            sub.foreign_final_registration_fee.length > 0 && (
                              <td className="py-2 pr-3 text-ink-body">
                                {finalFee ? finalFee.fee : "—"}
                              </td>
                            )}
                          {isEarlyBirdActive && hasEarlyBirdForeignFees && (
                            <td className="py-2 text-ink-body">
                              {earlyBirdFee ? earlyBirdFee.fee : "—"}
                            </td>
                          )}
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </dd>
          </div>
        )}

        {sub.repertoire &&
          Array.isArray(sub.repertoire) &&
          sub.repertoire.length > 0 && (
            <div className="flex flex-col gap-2">
              <dt className="type-label text-ink-accent">
                {t("eventDetails.repertoire")}
              </dt>
              <dd>
                <ul className="flex flex-col gap-1.5">
                  {(sub.repertoire as string[]).map((rep, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 type-body-sm text-ink-body"
                    >
                      <NoteGlyph
                        size={12}
                        className="text-marigold mt-1 flex-shrink-0"
                      />
                      <span>{rep}</span>
                    </li>
                  ))}
                </ul>
              </dd>
            </div>
          )}

        {sub.performance_duration && (
          <div className="flex flex-col gap-1">
            <dt className="type-label text-ink-accent">
              {t("eventDetails.duration")}
            </dt>
            <dd className="type-body-sm text-ink-body">
              {translateDuration(sub.performance_duration, language)}
            </dd>
          </div>
        )}
      </dl>
    </div>
  );
}

export default EventDetails;
