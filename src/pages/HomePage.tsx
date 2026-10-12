import { ArrowRight } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import heroBg from "../assets/hero-bg.webp";
import { useLatestEvent } from "../hooks/useLatestEvent";
import { useEvents } from "../hooks/useEvents";
import { usePageTitle } from "../hooks/usePageTitle";
import LoadingSpinner from "../components/LoadingSpinner";
import EventCard from "../components/EventCard";
import { useLanguage } from "../lib/LanguageContext";
import { Section, Container } from "@/components/ui/section";
import {
  PageHeader,
  PageHeaderEyebrow,
  PageHeaderLede,
  PageHeaderTitle,
} from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { WaveDivider, WireframeWave } from "@/components/ui/wireframe-wave";
import { cn } from "@/lib/utils";

/**
 * HomePage — Musical Lumina
 *
 * Editorial composition with measured luxury motion:
 *   1. Hero — staggered fade-up on mount (eyebrow → title → lede → CTA pair)
 *   2. The house — artists in residence and partners, first scroll on mobile
 *   3. Featured events — scroll-triggered with card stagger
 *   4. Three movements — scroll-triggered with step stagger
 *   5. Closing CTA — scroll-triggered
 *
 * All motion uses ease-out-expo (0.19, 1, 0.22, 1) with 600–800ms durations —
 * the pace of a confident curtain rise rather than a UI flourish. Reduced-
 * motion users get static content via `useReducedMotion()`.
 */


/* ============================================================================
   Motion primitives — shared editorial cadence.
   ============================================================================ */

const EASE = [0.19, 1, 0.22, 1] as const;

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.12, delayChildren: 0.1 },
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, ease: EASE },
  },
};

const fadeUpSoft = {
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
    transition: { staggerChildren: 0.1, delayChildren: 0.1 },
  },
};

const viewportOnce = { once: true, margin: "-80px" };

function HomePage() {
  const { t } = useLanguage();
  usePageTitle(t("home.title"));
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();

  const { events: latestEvents, loading: latestLoading } = useLatestEvent();
  const { events: upcomingEvents, loading: upcomingLoading } = useEvents({
    status: "upcoming",
    limit: 6,
  });

  const loading = latestLoading || upcomingLoading;

  const handleEventClick = (eventId: string, eventType: string) => {
    const formatted =
      eventType === "competition" || eventType === "festival"
        ? "event"
        : eventType.replace(/\s+/g, "-");
    navigate(`/${formatted}/${eventId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-canvas">
        <LoadingSpinner message={t("home.loading")} />
      </div>
    );
  }

  const featured = upcomingEvents.slice(0, 3);
  const initial = reduceMotion ? false : "hidden";

  return (
    <div className="bg-surface-canvas">
      {/* ====================================================================
          HERO
          ==================================================================== */}
      <section className="relative min-h-[72vh] lg:min-h-[75vh] flex items-center overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={heroBg}
            alt=""
            aria-hidden
            className="h-full w-full object-cover"
          />
          <div
            aria-hidden
            className="absolute inset-0 bg-gradient-to-br from-burgundy-700/85 via-burgundy/60 to-burgundy-700/75"
          />
          <WireframeWave
            color="#E2A225"
            opacity={0.06}
            amplitude={0.9}
            lines={7}
          />
        </div>

        {/* Slow background zoom for luxury breathing — skipped when reduced */}
        {!reduceMotion && (
          <motion.div
            aria-hidden
            className="absolute inset-0 pointer-events-none"
            initial={{ scale: 1.06 }}
            animate={{ scale: 1 }}
            transition={{ duration: 2.4, ease: EASE }}
          />
        )}

        <Container className="relative pt-24 pb-6 md:pt-24 md:pb-16 lg:pt-28 lg:pb-20">
          <motion.div
            variants={reduceMotion ? undefined : staggerContainer}
            initial={initial}
            animate="visible"
            className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-end"
          >
            {/* Left column */}
            <div className="lg:col-span-8 flex flex-col gap-7">
              <motion.div variants={fadeUpSoft}>
                <Eyebrow tone="inverse" withRule>
                  {t("pageCopy.home.heroMeta")}
                </Eyebrow>
              </motion.div>
              <motion.h1
                variants={fadeUp}
                className="type-display-xl text-offWhite text-balance whitespace-pre-line"
              >
                {t("home.mainHeading")}
              </motion.h1>
              <motion.p
                variants={fadeUpSoft}
                className="type-body-lg text-offWhite/80 max-w-xl text-pretty"
              >
                {t("home.subtitle")}
              </motion.p>
            </div>

            {/* Right column — latest event pill + CTA */}
            <motion.div
              variants={fadeUpSoft}
              className="lg:col-span-4 flex flex-col gap-4 lg:items-end"
            >
              {latestEvents.length > 0 && (
                <div className="flex flex-col gap-3 w-full lg:max-w-sm">
                  {latestEvents.map((event) => (
                    <button
                      key={event.id}
                      onClick={() => handleEventClick(event.id, event.type)}
                      className={cn(
                        "group flex items-center justify-between gap-4 w-full",
                        "bg-offWhite/10 border border-offWhite/25 backdrop-blur-sm",
                        "px-5 py-4 rounded-sm",
                        "transition-[background-color,border-color,transform] duration-base ease-out-quart",
                        "hover:bg-offWhite/20 hover:border-marigold/60",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marigold focus-visible:ring-offset-2 focus-visible:ring-offset-burgundy-700",
                        "text-left"
                      )}
                    >
                      <div className="flex flex-col gap-1 min-w-0">
                        <span className="type-label text-marigold">
                          {t("pageCopy.home.heroNowBooking")}
                        </span>
                        <span className="type-body-md text-offWhite truncate">
                          {event.title}
                        </span>
                      </div>
                      <ArrowRight className="h-5 w-5 text-marigold flex-shrink-0 transition-transform duration-base ease-out-quart group-hover:translate-x-1" />
                    </button>
                  ))}
                </div>
              )}
              <Button
                size="lg"
                onClick={() => navigate("/events")}
                className="w-full lg:w-auto"
              >
                {t("home.exploreEvents")}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </motion.div>
          </motion.div>
        </Container>
      </section>

      {/* ====================================================================
          THE HOUSE — visible without the mobile menu.
          Two tiles side by side on a phone so both pages show together.
          Editorial cards from md up.
          ==================================================================== */}
      <Section tone="warm" pause="none" className="py-4 md:py-[var(--pause-section)]">
        <Container>
          <PageHeader
            align="start"
            className="mb-10 lg:mb-14 max-w-3xl hidden md:flex"
          >
            <PageHeaderEyebrow>
              {t("pageCopy.home.companyEyebrow")}
            </PageHeaderEyebrow>
            <PageHeaderTitle as="h2" size="lg">
              {t("pageCopy.home.companyHeading")}
            </PageHeaderTitle>
          </PageHeader>

          <motion.div
            variants={reduceMotion ? undefined : gridStagger}
            initial={initial}
            whileInView="visible"
            viewport={{ once: true, margin: "120px" }}
            className="grid grid-cols-2 gap-3 lg:gap-8"
          >
            {(
              [
                {
                  to: "/artists-in-residence",
                  eyebrow: t("artistsInResidence.title"),
                  heading: t("artistsInResidence.subtitle"),
                  lede: t("artistsInResidence.lede"),
                  cta: t("pageCopy.home.artistsCta"),
                  inverse: true,
                },
                {
                  to: "/partners",
                  eyebrow: t("footer.partners"),
                  heading: t("partners.title"),
                  lede: t("partners.subtitle"),
                  cta: t("pageCopy.home.partnersCta"),
                  inverse: false,
                },
              ] as const
            ).map((door) => (
              <motion.div key={door.to} variants={fadeUp}>
                <button
                  type="button"
                  onClick={() => navigate(door.to)}
                  className={cn(
                    "group relative w-full h-full text-left overflow-hidden",
                    "flex flex-col items-start justify-between gap-4",
                    "min-h-[7.25rem] px-4 py-4 rounded-sm border",
                    "md:min-h-[280px] md:gap-10 md:p-8 lg:p-10",
                    "transition-[background-color,border-color] duration-base ease-out-quart",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marigold focus-visible:ring-offset-2",
                    door.inverse
                      ? "bg-burgundy-700 border-burgundy-700 text-offWhite hover:border-marigold/70 focus-visible:ring-offset-burgundy-700"
                      : "bg-surface-canvas border-rule-hairline text-ink-body hover:border-marigold/80 focus-visible:ring-offset-surface-canvas"
                  )}
                >
                  {door.inverse && (
                    <WireframeWave
                      color="#E2A225"
                      opacity={0.07}
                      amplitude={0.6}
                      lines={5}
                      className="hidden md:block"
                    />
                  )}
                  <h3
                    className={cn(
                      "relative type-headline-sm text-balance md:hidden",
                      door.inverse ? "text-offWhite" : "text-burgundy"
                    )}
                  >
                    {door.eyebrow}
                  </h3>
                  <div className="relative hidden md:flex flex-col gap-5 min-w-0">
                    <Eyebrow tone={door.inverse ? "inverse" : "accent"} withRule>
                      {door.eyebrow}
                    </Eyebrow>
                    <h3
                      className={cn(
                        "type-headline-md text-balance",
                        door.inverse ? "text-offWhite" : "text-burgundy"
                      )}
                    >
                      {door.heading}
                    </h3>
                    <p
                      className={cn(
                        "type-body-md text-pretty max-w-prose",
                        door.inverse ? "text-offWhite/75" : "text-ink-body"
                      )}
                    >
                      {door.lede}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "relative inline-flex items-center gap-2 shrink-0 type-label",
                      door.inverse ? "text-marigold" : "text-burgundy"
                    )}
                  >
                    <span className="hidden md:inline">{door.cta}</span>
                    <ArrowRight className="h-4 w-4 transition-transform duration-base ease-out-quart group-hover:translate-x-1" />
                  </span>
                </button>
              </motion.div>
            ))}
          </motion.div>
        </Container>
      </Section>

      {/* ====================================================================
          IN-SEASON — featured events, scroll-triggered stagger
          ==================================================================== */}
      <Section tone="canvas" pause="lg">
        <Container>
          <motion.div
            variants={reduceMotion ? undefined : staggerContainer}
            initial={initial}
            whileInView="visible"
            viewport={viewportOnce}
          >
            <PageHeader align="split" className="mb-14 lg:mb-20">
              <div className="flex flex-col gap-5">
                <motion.div variants={fadeUpSoft}>
                  <PageHeaderEyebrow>{t("pageCopy.home.featuredEyebrow")}</PageHeaderEyebrow>
                </motion.div>
                <motion.div variants={fadeUp}>
                  <PageHeaderTitle size="lg">
                    {t("pageCopy.home.featuredHeading")}
                  </PageHeaderTitle>
                </motion.div>
                <motion.div variants={fadeUpSoft}>
                  <PageHeaderLede>{t("pageCopy.home.featuredLede")}</PageHeaderLede>
                </motion.div>
              </div>
              <motion.div
                variants={fadeUpSoft}
                className="flex lg:justify-end lg:items-end"
              >
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => navigate("/events")}
                >
                  {t("events.upcomingEvents")}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </motion.div>
            </PageHeader>
          </motion.div>

          <AnimatePresence mode="wait">
            {featured.length > 0 ? (
              <motion.div
                key="featured-grid"
                variants={reduceMotion ? undefined : gridStagger}
                initial={initial}
                whileInView="visible"
                viewport={viewportOnce}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8"
              >
                {featured.map((event) => (
                  <motion.div key={event.id} variants={fadeUp}>
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
            ) : (
              <motion.div
                key="featured-empty"
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={viewportOnce}
                transition={{ duration: 0.7, ease: EASE }}
                className="max-w-prose type-body-lg text-ink-muted border-l-2 border-marigold pl-6 py-4"
              >
                {t("pageCopy.home.featuredEmpty")}
              </motion.div>
            )}
          </AnimatePresence>
        </Container>
      </Section>

      <Container>
        <WaveDivider />
      </Container>

      {/* ====================================================================
          HOW IT WORKS — three movements
          ==================================================================== */}
      <Section tone="warm" pause="lg" rule="top">
        <Container>
          <motion.div
            variants={reduceMotion ? undefined : staggerContainer}
            initial={initial}
            whileInView="visible"
            viewport={viewportOnce}
          >
            <PageHeader align="start" className="mb-14 lg:mb-20 max-w-3xl">
              <motion.div variants={fadeUpSoft}>
                <PageHeaderEyebrow>{t("pageCopy.home.howItWorksEyebrow")}</PageHeaderEyebrow>
              </motion.div>
              <motion.div variants={fadeUp}>
                <PageHeaderTitle size="lg">
                  {t("pageCopy.home.howItWorksHeading")}
                </PageHeaderTitle>
              </motion.div>
              <motion.div variants={fadeUpSoft}>
                <PageHeaderLede>{t("pageCopy.home.howItWorksLede")}</PageHeaderLede>
              </motion.div>
            </PageHeader>
          </motion.div>

          <motion.div
            variants={reduceMotion ? undefined : gridStagger}
            initial={initial}
            whileInView="visible"
            viewport={viewportOnce}
            className="grid grid-cols-1 md:grid-cols-3 gap-px bg-rule-hairline"
          >
            {(["One", "Two", "Three"] as const).map((ordinal, i) => {
              const n = `0${i + 1}`;
              return (
                <motion.article
                  key={n}
                  variants={fadeUp}
                  className="bg-surface-canvas-warm p-7 md:p-8 lg:p-10 flex flex-col gap-5 md:min-h-[240px]"
                >
                  <span className="type-display-md text-marigold font-serif tracking-[-0.02em]">
                    {n}
                  </span>
                  <h3 className="type-headline-md text-burgundy">
                    {t(`pageCopy.home.step${ordinal}Title`)}
                  </h3>
                  <p className="type-body-md text-ink-body text-pretty">
                    {t(`pageCopy.home.step${ordinal}Body`)}
                  </p>
                </motion.article>
              );
            })}
          </motion.div>
        </Container>
      </Section>

      {/* ====================================================================
          CLOSING CTA
          ==================================================================== */}
      <Section
        tone="inverse"
        pause="lg"
        className="relative overflow-hidden"
      >
        <WireframeWave
          color="#E2A225"
          opacity={0.05}
          amplitude={0.7}
          lines={6}
        />
        <Container>
          <motion.div
            variants={reduceMotion ? undefined : staggerContainer}
            initial={initial}
            whileInView="visible"
            viewport={viewportOnce}
            className="relative grid grid-cols-1 lg:grid-cols-12 gap-8 items-center"
          >
            <div className="lg:col-span-8 flex flex-col gap-6">
              <motion.div variants={fadeUpSoft}>
                <Eyebrow tone="inverse" withRule>
                  {t("pageCopy.home.closingEyebrow")}
                </Eyebrow>
              </motion.div>
              <motion.h2
                variants={fadeUp}
                className="type-display-md text-offWhite text-balance"
              >
                {t("pageCopy.home.closingHeading")}
              </motion.h2>
              <motion.p
                variants={fadeUpSoft}
                className="type-body-lg text-offWhite/75 max-w-xl text-pretty"
              >
                {t("pageCopy.home.closingLede")}
              </motion.p>
            </div>
            <motion.div
              variants={fadeUpSoft}
              className="lg:col-span-4 flex lg:justify-end"
            >
              <Button
                variant="elegant"
                size="xl"
                onClick={() => navigate("/events")}
              >
                {t("home.exploreEvents")}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </motion.div>
          </motion.div>
        </Container>
      </Section>
    </div>
  );
}

export default HomePage;
