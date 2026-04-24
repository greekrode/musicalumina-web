import { useEffect, useRef, useState } from "react";
import { sanitizeHtml } from "@/lib/sanitize";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowUpRight, ChevronDown } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import LoadingSpinner from "../components/LoadingSpinner";
import { cn } from "@/lib/utils";
import { useEvent } from "../hooks/useEvent";
import { useEventPhotos } from "../hooks/useEventPhotos";
import { usePageTitle } from "../hooks/usePageTitle";
import type { Database } from "../lib/database.types";
import { useLanguage } from "../lib/LanguageContext";
import { formatMultipleDatesWithLocale } from "../lib/utils";
import { Section, Container } from "@/components/ui/section";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Image } from "@/components/ui/image";
import { NoteGlyph } from "@/components/ui/wireframe-wave";
import { EventGallery } from "@/components/EventGallery";

type EventJuror = Omit<
  Database["public"]["Tables"]["event_jury"]["Row"],
  "credentials"
> & {
  credentials: string | null;
};

type PastEvent = Database["public"]["Tables"]["events"]["Row"] & {
  event_jury: EventJuror[];
  winners?: {
    [category: string]: {
      [subcategory: string]: Array<{
        prize_title: string;
        participant_name: string;
      }>;
    };
  };
};

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


function PastEventDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const initial = reduceMotion ? false : "hidden";

  const { t, language } = useLanguage();
  const {
    event,
    loading: eventLoading,
    error: eventError,
  } = useEvent(id || "") as {
    event: PastEvent | null;
    loading: boolean;
    error: Error | null;
  };
  const { photos, loading: photosLoading } = useEventPhotos(id || "");

  usePageTitle(event?.title ? `Past Event | ${event.title}` : undefined);

  const handleBackClick = (e: React.MouseEvent) => {
    e.preventDefault();
    navigate("/events");
  };

  if (eventLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-canvas pt-20">
        <LoadingSpinner message={t("loading.loadingEventDetails")} />
      </div>
    );
  }

  if (eventError || !event) {
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
            <Eyebrow withRule>{t("pageCopy.pastEvents.eyebrow")}</Eyebrow>
            <h2 className="type-display-md text-burgundy">
              {eventError
                ? t("eventDetails.errorLoading")
                : t("eventDetails.notFound")}
            </h2>
            <p className="type-body-lg text-ink-muted">
              {eventError
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

  return (
    <div className="bg-surface-canvas">
      {/* ================================================================
          HERO — editorial header for the archive entry
          ================================================================ */}
      <section className="pt-28 md:pt-28 lg:pt-32 pb-10 md:pb-12 lg:pb-16">
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
            className="flex flex-col gap-6 max-w-4xl"
          >
            <motion.div variants={fadeUpSoft}>
              <Eyebrow withRule tone="muted">
                {t("pageCopy.pastEvents.eyebrow")}
              </Eyebrow>
            </motion.div>
            <motion.h1
              variants={fadeUp}
              className="type-display-lg text-burgundy text-balance"
            >
              {event.title}
            </motion.h1>
            <motion.div variants={fadeUpSoft}>
              <Badge status="ended" dot>
                {t("eventCard.statusConcluded")}
              </Badge>
            </motion.div>
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
            </motion.dl>
          </motion.div>
        </Container>
      </section>

      {/* ================================================================
          GALLERY — editorial photo essay
          ================================================================ */}
      <section className="pb-12 lg:pb-16">
        <Container>
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={viewportOnce}
            transition={{ duration: 0.7, ease: EASE }}
            className="flex flex-col gap-5"
          >
            <Eyebrow withRule>{t("pageCopy.pastEvents.galleryEyebrow")}</Eyebrow>
            <EventGallery images={photos} isLoading={photosLoading} />
          </motion.div>
        </Container>
      </section>

      {/* ================================================================
          NARRATIVE — long-form description
          ================================================================ */}
      {event.description && (
        <Section tone="canvas" pause="sm" rule="top">
          <Container>
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={viewportOnce}
              transition={{ duration: 0.8, ease: EASE }}
              className="max-w-prose mx-auto type-body-lg text-ink-body prose prose-sm"
              dangerouslySetInnerHTML={{
                __html: sanitizeHtml(
                  event.description?.[language] ||
                    event.description?.en ||
                    ""
                ),
              }}
            />
          </Container>
        </Section>
      )}

      {/* ================================================================
          WINNERS — accordion + pill rail (same grammar as EventDetails
          categories), with rebuilt subcategory cards: eyebrow + serif name
          stacked vertically per the reference design.
          ================================================================ */}
      {event.winners && Object.keys(event.winners).length > 0 && (
        <Section tone="warm" pause="sm" rule="top">
          <Container>
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={viewportOnce}
              transition={{ duration: 0.6, ease: EASE }}
              className="max-w-3xl mb-8 lg:mb-10"
            >
              <Eyebrow withRule>{t("eventDetails.prizes")}</Eyebrow>
              <h2 className="type-headline-lg text-burgundy mt-3 mb-2">
                {t("pageCopy.pastEvents.winnersHeading")}
              </h2>
              <p className="type-body-md text-ink-muted">{t("pageCopy.pastEvents.winnersLede")}</p>
            </motion.div>

            <WinnersAccordion
              winners={event.winners}
              reduceMotion={Boolean(reduceMotion)}
            />
          </Container>
        </Section>
      )}

      {/* ================================================================
          JURY — who adjudicated this edition
          ================================================================ */}
      {event.event_jury.length > 0 && (
        <Section tone="canvas" pause="md" rule="top">
          <Container>
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={viewportOnce}
              transition={{ duration: 0.6, ease: EASE }}
              className="max-w-3xl mb-10 lg:mb-12"
            >
              <Eyebrow withRule>{t("eventDetails.juryPanel")}</Eyebrow>
              <h2 className="type-headline-lg text-burgundy mt-3">
                Adjudicators
              </h2>
            </motion.div>

            <motion.div
              variants={reduceMotion ? undefined : stagger}
              initial={initial}
              whileInView="visible"
              viewport={viewportOnce}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
            >
              {event.event_jury.map((juror) => (
                <motion.article
                  key={juror.id}
                  variants={fadeUp}
                  className="flex flex-col gap-5 border-t border-rule-hairline pt-6"
                >
                  {juror.avatar_url && (
                    <Image
                      src={juror.avatar_url}
                      alt={juror.name}
                      aspect="3/4"
                      containerClassName="bg-surface-canvas-warm"
                      fit="cover"
                    />
                  )}
                  <div className="flex flex-col gap-2">
                    <Eyebrow>{juror.title}</Eyebrow>
                    <h3 className="type-headline-md text-burgundy">
                      {juror.name}
                    </h3>
                    {juror.description && (
                      <div
                        className="type-body-sm text-ink-body prose prose-sm max-w-none mt-2"
                        dangerouslySetInnerHTML={{
                          __html: sanitizeHtml(juror.description),
                        }}
                      />
                    )}
                  </div>
                </motion.article>
              ))}
            </motion.div>
          </Container>
        </Section>
      )}
    </div>
  );
}

function MetaItem({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="type-label text-ink-accent">{label}</dt>
      <dd className="type-body-md text-burgundy">{children}</dd>
    </div>
  );
}

// Suppress unused-import lint while NoteGlyph stays available for future fallbacks.
void NoteGlyph;

/* ============================================================================
   WinnersAccordion — owns open state + desktop pill rail. Mirrors the
   accordion pattern used on the live EventDetails categories so users get the
   same interaction grammar across the site.
   ============================================================================ */

type WinnersData = NonNullable<PastEvent["winners"]>;

function slugifyCategory(name: string): string {
  return `winners-${name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")}`;
}

function WinnersAccordion({
  winners,
  reduceMotion,
}: {
  winners: WinnersData;
  reduceMotion: boolean;
}) {
  const categories = Object.entries(winners);
  const [openIds, setOpenIds] = useState<Set<string>>(
    () => new Set(categories[0]?.[0] ? [categories[0][0]] : [])
  );
  const [activeId, setActiveId] = useState<string | null>(
    categories[0]?.[0] ?? null
  );
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Scroll-based active-pill tracking.
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
          // Pull the original category name back from the slug id we set on
          // the wrapper — match against the slugified form.
          const matchedCategory = categories.find(
            ([cat]) => slugifyCategory(cat) === visible[0].target.id
          );
          if (matchedCategory) {
            setActiveId(matchedCategory[0]);
          }
        }
      },
      { rootMargin: "-160px 0px -55% 0px", threshold: 0 }
    );

    categories.forEach(([cat]) => {
      const el = cardRefs.current[cat];
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [categories]);

  const toggleOpen = (category: string) => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  };

  const handleJumpTo = (category: string) => {
    setOpenIds((prev) => {
      if (prev.has(category)) return prev;
      const next = new Set(prev);
      next.add(category);
      return next;
    });
    setActiveId(category);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const el = cardRefs.current[category];
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
  };

  const showPillRail = categories.length > 1;

  return (
    <>
      {/* "Jump to" pill rail — mobile gets a non-sticky TOC above the cards,
          desktop gets the same rail stickied below the main nav. Mirrors the
          live-event EventDetails behaviour. */}
      {showPillRail && (
        <div
          className={cn(
            "lg:sticky lg:top-20 z-30 -mx-4 sm:-mx-8 lg:-mx-12 mb-6 lg:mb-8",
            "bg-surface-canvas-warm/90 backdrop-blur-md border-y border-rule-hairline"
          )}
        >
          <div className="px-4 sm:px-8 lg:px-12">
            <div className="flex items-center gap-5 lg:gap-8 py-3 lg:py-3.5 overflow-x-auto no-scrollbar">
              <span className="type-label text-ink-muted flex items-center gap-3 shrink-0">
                <span aria-hidden className="inline-block w-5 h-px bg-marigold" />
                Jump to
              </span>
              {categories.map(([category]) => {
                const active = activeId === category;
                return (
                  <button
                    key={category}
                    type="button"
                    onClick={() => handleJumpTo(category)}
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
                    {category}
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
        viewport={viewportOnce}
        className="flex flex-col gap-4 lg:gap-5"
      >
        {categories.map(([category, subcategories], idx) => {
          const slug = slugifyCategory(category);
          return (
            <motion.div
              key={category}
              variants={fadeUp}
              id={slug}
              ref={(el) => {
                cardRefs.current[category] = el as HTMLDivElement | null;
              }}
              className="scroll-mt-40"
            >
              <WinnerCategoryAccordion
                category={category}
                subcategories={subcategories}
                index={idx}
                isOpen={openIds.has(category)}
                onToggle={() => toggleOpen(category)}
              />
            </motion.div>
          );
        })}
      </motion.div>
    </>
  );
}

/* ============================================================================
   WinnerCategoryAccordion — a single collapsible category. Closed state shows
   a preview ("4 subcategories · 18 winners"). Open state reveals a grid of
   subcategory cards.
   ============================================================================ */

function WinnerCategoryAccordion({
  category,
  subcategories,
  index,
  isOpen,
  onToggle,
}: {
  category: string;
  subcategories: WinnersData[string];
  index: number;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const subcategoryEntries = Object.entries(subcategories);
  const totalWinners = subcategoryEntries.reduce(
    (sum, [, list]) => sum + list.length,
    0
  );
  const accentColor = index === 0 ? "bg-marigold" : "bg-burgundy/40";
  const slug = slugifyCategory(category);
  const panelId = `${slug}-panel`;
  const headerId = `${slug}-header`;

  const previewParts = [
    `${subcategoryEntries.length} ${subcategoryEntries.length === 1 ? "subcategory" : "subcategories"}`,
    `${totalWinners} ${totalWinners === 1 ? "honoured performer" : "honoured performers"}`,
  ];

  return (
    <article
      className={cn(
        "relative bg-surface-elevated border transition-colors duration-base ease-out-quart",
        isOpen
          ? "border-burgundy/25"
          : "border-rule-hairline hover:border-burgundy/20"
      )}
    >
      <span
        aria-hidden
        className={cn(
          "absolute inset-x-0 top-0 h-[2px] transition-colors duration-base ease-out-quart",
          isOpen ? "bg-marigold" : accentColor
        )}
      />

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
            {category}
          </h3>
          <p className="type-caption text-ink-muted">{previewParts.join(" · ")}</p>
        </div>
        <ChevronDown
          className={cn(
            "h-5 w-5 flex-shrink-0 transition-[transform,color] duration-base ease-out-quart",
            isOpen ? "rotate-180 text-marigold" : "text-burgundy/60"
          )}
        />
      </button>

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
              height: { duration: 0.45, ease: EASE },
              opacity: { duration: 0.3, ease: EASE },
            }}
            className="overflow-hidden border-t border-rule-hairline"
          >
            <div className="p-6 lg:p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {subcategoryEntries.map(([subcategory, list]) => (
                  <SubcategoryWinners
                    key={subcategory}
                    name={subcategory}
                    winners={list}
                  />
                ))}
              </div>
            </div>
          </motion.section>
        )}
      </AnimatePresence>
    </article>
  );
}

/* ============================================================================
   SubcategoryWinners — the rebuilt prize card per the reference design.
   Eyebrow (rank) + serif name stacked vertically, generous spacing,
   no dotted leaders.
   ============================================================================ */

function SubcategoryWinners({
  name,
  winners,
}: {
  name: string;
  winners: Array<{ prize_title: string; participant_name: string }>;
}) {
  return (
    <article className="bg-surface-canvas-warm border border-rule-hairline p-6 lg:p-7 flex flex-col gap-5">
      <h4 className="type-headline-sm text-burgundy">{name}</h4>
      <ul className="flex flex-col gap-4 pt-4 border-t border-rule-hairline">
        {winners.map((winner, i) => (
          <li key={i} className="flex flex-col gap-1">
            <Eyebrow>{winner.prize_title}</Eyebrow>
            <span className="font-serif text-title-lg text-burgundy leading-tight text-balance">
              {winner.participant_name}
            </span>
          </li>
        ))}
      </ul>
    </article>
  );
}

export default PastEventDetails;
