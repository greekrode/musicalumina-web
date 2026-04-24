import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";
import EventCard from "../components/EventCard";
import { usePageTitle } from "../hooks/usePageTitle";
import LoadingSpinner from "../components/LoadingSpinner";
import { useEvents } from "../hooks/useEvents";
import { useLanguage } from "../lib/LanguageContext";
import { formatDateWithLocale } from "../lib/utils";
import { Section, Container } from "@/components/ui/section";
import {
  PageHeader,
  PageHeaderEyebrow,
  PageHeaderLede,
  PageHeaderTitle,
} from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Eyebrow } from "@/components/ui/eyebrow";
import { NoteGlyph, WaveDivider } from "@/components/ui/wireframe-wave";
import { cn } from "@/lib/utils";
import type { EventType } from "../lib/database.types";

/**
 * EventsPage — Musical Lumina
 *
 * Editorial directory with measured, luxurious motion. All transitions use
 * ease-out-expo (0.19, 1, 0.22, 1) and durations in the 400–700ms range — a
 * pace that reads as considered, not flashy. Reduced-motion users get an
 * instant, static version via useReducedMotion().
 */


const TYPE_FILTERS: readonly {
  value: EventType | "all";
  labelKey?: string;
  fallback: string;
}[] = [
  { value: "all", fallback: "All" },
  { value: "competition", labelKey: "eventCard.eventTypes.competition", fallback: "Competitions" },
  { value: "festival", labelKey: "eventCard.eventTypes.festival", fallback: "Festivals" },
  { value: "masterclass", labelKey: "eventCard.eventTypes.masterclass", fallback: "Masterclasses" },
  { value: "group class", labelKey: "eventCard.eventTypes.group class", fallback: "Group Classes" },
];

/* ============================================================================
   Motion primitives — shared easing, consistent rhythm across the page.
   ============================================================================ */

const EASE = [0.19, 1, 0.22, 1] as const;

const headerStagger = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.09,
      delayChildren: 0.08,
    },
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: EASE },
  },
};

const gridStagger = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.15,
    },
  },
};

const cardIn = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: EASE },
  },
};

const archiveRowIn = {
  hidden: { opacity: 0, x: -8 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.55, ease: EASE },
  },
};

function EventsPage() {
  const { t, language } = useLanguage();
  usePageTitle(t("events.title"));
  const reduceMotion = useReducedMotion();

  const { events: upcoming, loading: upcomingLoading } = useEvents({
    status: "upcoming",
    limit: 24,
  });
  const { events: past, loading: pastLoading } = useEvents({
    status: "completed",
    limit: 24,
  });

  const [typeFilter, setTypeFilter] = useState<EventType | "all">("all");

  const filteredUpcoming =
    typeFilter === "all"
      ? upcoming
      : upcoming.filter((e) => e.type === typeFilter);
  const filteredPast =
    typeFilter === "all" ? past : past.filter((e) => e.type === typeFilter);

  const loading = upcomingLoading || pastLoading;
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-canvas pt-20">
        <LoadingSpinner message={t("events.loading")} />
      </div>
    );
  }

  const [featured, ...rest] = filteredUpcoming;

  // If a user prefers reduced motion, framer-motion still honors it globally,
  // but we skip the stagger delays so content appears immediately.
  const effectiveHeaderStagger = reduceMotion ? undefined : headerStagger;
  const effectiveGridStagger = reduceMotion ? undefined : gridStagger;

  return (
    <div className="bg-surface-canvas">
      {/* ====================================================================
          SEASON — header, filters, and upcoming grid in ONE tight section.
          Combined so the filter shelf flows directly into the event listing
          without a viewport-height gap on 1366/1920 displays.
          ==================================================================== */}
      <section className="pt-28 md:pt-28 lg:pt-32 pb-10 md:pb-16 lg:pb-24">
        <Container>
          {/* Header block — staggered entrance on mount */}
          <motion.div
            variants={effectiveHeaderStagger}
            initial={reduceMotion ? false : "hidden"}
            animate="visible"
          >
            <motion.div variants={fadeUp}>
              <PageHeader align="start" className="max-w-4xl">
                <PageHeaderEyebrow>{t("pageCopy.events.eyebrow")}</PageHeaderEyebrow>
                <PageHeaderTitle size="xl">{t("events.title")}</PageHeaderTitle>
                <PageHeaderLede>{t("pageCopy.events.lede")}</PageHeaderLede>
              </PageHeader>
            </motion.div>

            {/* Filter shelf */}
            <motion.div
              variants={fadeUp}
              className="mt-6 md:mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 pb-4 md:pb-5 border-b border-rule-hairline"
            >
              <Eyebrow withRule>{t("pageCopy.events.filterLabel")}</Eyebrow>
              <div className="flex flex-wrap items-center gap-2">
                {TYPE_FILTERS.map((f) => {
                  const active = typeFilter === f.value;
                  const label = f.labelKey ? t(f.labelKey) : f.fallback;
                  return (
                    <button
                      key={f.value}
                      type="button"
                      onClick={() => setTypeFilter(f.value)}
                      aria-pressed={active}
                      className={cn(
                        "type-label px-3 py-1.5 rounded-sm transition-colors duration-fast ease-out-quart",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marigold focus-visible:ring-offset-2",
                        active
                          ? "bg-burgundy text-offWhite"
                          : "text-ink-muted hover:text-burgundy hover:bg-burgundy/[0.06]"
                      )}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </motion.div>

            {/* Upcoming heading — tight spacing so the grid lands above the fold */}
            <motion.div
              variants={fadeUp}
              className="mt-8 lg:mt-10 flex items-baseline justify-between mb-6 lg:mb-8"
            >
              <h2 className="type-headline-lg text-burgundy">
                {t("pageCopy.events.upcomingHeading")}
              </h2>
              <span className="type-caption text-ink-muted">
                {filteredUpcoming.length}{" "}
                {filteredUpcoming.length === 1 ? "event" : "events"}
              </span>
            </motion.div>
          </motion.div>

          {/* Grid — re-animates on filter change via AnimatePresence key */}
          <AnimatePresence mode="wait">
            <motion.div
              key={typeFilter}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.4, ease: EASE }}
            >
              {filteredUpcoming.length === 0 ? (
                <EmptySeason
                  title={t("pageCopy.events.emptySeasonTitle")}
                  body={t("pageCopy.events.emptySeasonBody")}
                />
              ) : (
                <motion.div
                  variants={effectiveGridStagger}
                  initial={reduceMotion ? false : "hidden"}
                  animate="visible"
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8"
                >
                  {featured && (
                    <motion.div variants={cardIn} className="md:col-span-2">
                      <FeaturedEventRow
                        event={featured}
                        language={language}
                        t={t}
                      />
                    </motion.div>
                  )}
                  {rest.map((event) => (
                    <motion.div key={event.id} variants={cardIn}>
                      <EventCard
                        id={event.id}
                        title={event.title}
                        type={event.type}
                        dates={
                          event.event_date && event.event_date.length > 0
                            ? (event.event_date as string[])
                            : [event.start_date]
                        }
                        location={event.location}
                        status={event.status}
                        image={
                          event.poster_image ||
                          "https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?auto=format&fit=crop&q=80"
                        }
                      />
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </motion.div>
          </AnimatePresence>
        </Container>
      </section>

      <Container>
        <WaveDivider />
      </Container>

      {/* ====================================================================
          ARCHIVE — compact list, scroll-triggered entrance
          ==================================================================== */}
      <Section tone="canvas" pause="lg">
        <Container>
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.75, ease: EASE }}
            className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-10"
          >
            <div className="flex flex-col gap-3 max-w-2xl">
              <Eyebrow withRule tone="muted">
                {t("events.pastEvents")}
              </Eyebrow>
              <h2 className="type-headline-lg text-burgundy">
                {t("pageCopy.events.archiveHeading")}
              </h2>
              <p className="type-body-md text-ink-muted">{t("pageCopy.events.archiveLede")}</p>
            </div>
            <span className="type-caption text-ink-muted">
              {filteredPast.length}{" "}
              {filteredPast.length === 1 ? "entry" : "entries"}
            </span>
          </motion.div>

          {/* AnimatePresence keyed by typeFilter so the archive list fully
              remounts on filter change — framer-motion's stagger bookkeeping
              doesn't track mid-life child swaps reliably, which left rows at
              opacity: 0 on some filters. Fresh remount = fresh animation. */}
          <AnimatePresence mode="wait">
            {filteredPast.length === 0 ? (
              <motion.p
                key={`archive-empty-${typeFilter}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.35, ease: EASE }}
                className="type-body-md text-ink-muted border-l-2 border-rule-subtle pl-6 py-4"
              >
                {t("pageCopy.events.emptyArchiveBody")}
              </motion.p>
            ) : (
              <motion.ul
                key={`archive-list-${typeFilter}`}
                role="list"
                variants={effectiveGridStagger}
                initial={reduceMotion ? false : "hidden"}
                animate="visible"
                exit={{ opacity: 0, transition: { duration: 0.2 } }}
                className="flex flex-col border-t border-rule-hairline"
              >
                {filteredPast.map((event) => (
                  <motion.li
                    key={event.id}
                    variants={archiveRowIn}
                    className="border-b border-rule-hairline"
                  >
                    <ArchiveRow
                      id={event.id}
                      title={event.title}
                      type={event.type}
                      startDate={event.start_date}
                      language={language}
                      t={t}
                    />
                  </motion.li>
                ))}
              </motion.ul>
            )}
          </AnimatePresence>
        </Container>
      </Section>
    </div>
  );
}

/* ============================================================================
   FeaturedEventRow
   Two-column spread: image left, content right. Spans two columns of the 3-col
   grid on desktop; stacks cleanly on mobile.
   ============================================================================ */

interface FeaturedEventRowProps {
  event: {
    id: string;
    title: string;
    type: EventType;
    start_date: string;
    event_date: string[] | null;
    location: string;
    status: "upcoming" | "ongoing" | "completed";
    poster_image: string | null;
  };
  language: string;
  t: (key: string) => string;
}

function FeaturedEventRow({ event, language, t }: FeaturedEventRowProps) {
  const dates =
    event.event_date && event.event_date.length > 0
      ? event.event_date
      : [event.start_date];
  const formattedDates = dates
    .map((d) => formatDateWithLocale(d, language))
    .join(" · ");

  const accent =
    event.type === "masterclass"
      ? "bg-marigold"
      : event.type === "group class"
        ? "bg-charcoal"
        : "bg-burgundy";

  const href =
    event.status === "completed"
      ? event.type === "masterclass"
        ? `/past-masterclass/${event.id}`
        : `/past-event/${event.id}`
      : event.type === "masterclass"
        ? `/masterclass/${event.id}`
        : event.type === "group class"
          ? `/group-class/${event.id}`
          : `/event/${event.id}`;

  const statusLabel =
    event.status === "completed"
      ? t("eventCard.statusConcluded")
      : event.status === "upcoming"
        ? t("eventCard.statusUpcoming")
        : t("eventCard.statusOpen");

  const statusType =
    event.status === "completed"
      ? ("ended" as const)
      : event.status === "upcoming"
        ? ("upcoming" as const)
        : ("open" as const);

  return (
    <article
      className={cn(
        "group relative h-full bg-surface-elevated border border-rule-hairline overflow-hidden",
        "transition-colors duration-base ease-out-quart hover:border-burgundy/25",
        "flex flex-col lg:grid lg:grid-cols-[1fr_1fr]"
      )}
    >
      <span
        aria-hidden
        className={cn("absolute inset-x-0 top-0 h-[2px] z-10", accent)}
      />
      <div className="relative aspect-[16/10] lg:aspect-auto lg:h-full overflow-hidden bg-surface-canvas-warm">
        <img
          src={
            event.poster_image ||
            "https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?auto=format&fit=crop&q=80"
          }
          alt={event.title}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-slower ease-out-quart motion-safe:group-hover:scale-[1.03]"
        />
      </div>
      <div className="flex flex-col p-8 lg:p-10 gap-5">
        <div className="flex flex-wrap items-center gap-3">
          <span className="type-label text-ink-accent">
            {t(`eventCard.eventTypes.${event.type}`)}
          </span>
          <span aria-hidden className="type-label text-burgundy/20">
            ·
          </span>
          <Badge status={statusType} dot>
            {statusLabel}
          </Badge>
        </div>
        <h3 className="type-display-md text-burgundy text-balance">
          {event.title}
        </h3>
        <div className="flex flex-col gap-2">
          <div className="flex items-start gap-2.5 type-body-sm text-ink-muted">
            <NoteGlyph size={14} className="text-marigold mt-1 flex-shrink-0" />
            <span>{formattedDates}</span>
          </div>
          <div className="flex items-start gap-2.5 type-body-sm text-ink-muted">
            <NoteGlyph size={14} className="text-marigold mt-1 flex-shrink-0" />
            <span>{event.location}</span>
          </div>
        </div>
        <div className="mt-auto pt-4">
          <Link
            to={href}
            className={cn(
              "type-label text-burgundy inline-flex items-center gap-3",
              "transition-colors duration-fast ease-out-quart hover:text-marigold",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marigold focus-visible:ring-offset-2 rounded-sm"
            )}
          >
            {t("eventCard.viewDetails")}
            <span aria-hidden className="inline-block w-8 h-px bg-current" />
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </article>
  );
}

/* ============================================================================
   ArchiveRow
   Single-line list row: date · title · type · arrow. Full-row clickable.
   Renders the Link only — the <li> wrapper is provided by the parent
   <motion.ul> so framer-motion can animate each row without nesting.
   ============================================================================ */

interface ArchiveRowProps {
  id: string;
  title: string;
  type: EventType;
  startDate: string;
  language: string;
  t: (key: string) => string;
}

function ArchiveRow({ id, title, type, startDate, language, t }: ArchiveRowProps) {
  const href =
    type === "masterclass" ? `/past-masterclass/${id}` : `/past-event/${id}`;
  const formattedDate = formatDateWithLocale(startDate, language).toUpperCase();
  const typeLabel = t(`eventCard.eventTypes.${type}`);

  return (
    <Link
      to={href}
      className={cn(
        // Mobile: content column + arrow. Title + date stack inside the
        // content column so the title gets full width instead of wrapping
        // into a narrow 160-ish px slot.
        // Desktop: four-column editorial list (date / title / type / arrow).
        "group grid grid-cols-[1fr_auto] md:grid-cols-[140px_1fr_120px_auto] items-center gap-3 md:gap-8",
        "py-4 md:py-6 px-2",
        "transition-colors duration-fast ease-out-quart",
        "hover:bg-surface-canvas-warm",
        "focus-visible:outline-none focus-visible:bg-surface-canvas-warm focus-visible:ring-1 focus-visible:ring-marigold"
      )}
    >
      {/* Mobile: stacked meta + title. Desktop: individual cells below. */}
      <div className="md:contents flex flex-col gap-1.5 min-w-0">
        <div className="md:hidden flex items-center gap-2 type-label text-ink-accent">
          <span className="whitespace-nowrap">{formattedDate}</span>
          <span aria-hidden className="text-ink-subtle">·</span>
          <span className="text-ink-muted whitespace-nowrap">{typeLabel}</span>
        </div>
        <span className="hidden md:inline type-label text-ink-accent whitespace-nowrap">
          {formattedDate}
        </span>
        <span className="font-serif text-[1.0625rem] leading-snug md:text-headline-sm md:leading-tight text-burgundy text-balance">
          {title}
        </span>
        <span className="hidden md:inline type-label text-ink-muted whitespace-nowrap">
          {typeLabel}
        </span>
      </div>
      <ArrowUpRight
        className={cn(
          "h-4 w-4 md:h-5 md:w-5 text-burgundy/40 self-center",
          "transition-[color,transform] duration-base ease-out-quart",
          "group-hover:text-marigold motion-safe:group-hover:translate-x-0.5 motion-safe:group-hover:-translate-y-0.5"
        )}
      />
    </Link>
  );
}

function EmptySeason({ title, body }: { title: string; body: string }) {
  return (
    <div className="border-l-2 border-marigold pl-8 py-8 max-w-prose">
      <h3 className="type-headline-md text-burgundy mb-3">{title}</h3>
      <p className="type-body-lg text-ink-muted text-pretty">{body}</p>
    </div>
  );
}

export default EventsPage;
