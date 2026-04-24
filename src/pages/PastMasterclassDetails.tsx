import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import LoadingSpinner from "../components/LoadingSpinner";
import { useEvent } from "../hooks/useEvent";
import { useEventPhotos } from "../hooks/useEventPhotos";
import { usePageTitle } from "../hooks/usePageTitle";
import type { Database } from "../lib/database.types";
import { useLanguage } from "../lib/LanguageContext";
import { supabase } from "../lib/supabase";
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

type MasterclassParticipant = {
  id: string;
  name: string;
  repertoire: string[];
};

type PastEvent = Database["public"]["Tables"]["events"]["Row"] & {
  event_jury: EventJuror[];
  masterclass_participants?: MasterclassParticipant[];
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


function PastMasterclassDetails() {
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

  const [participants, setParticipants] = useState<MasterclassParticipant[]>(
    []
  );

  usePageTitle(event?.title ? `Past Masterclass | ${event.title}` : undefined);

  useEffect(() => {
    async function fetchParticipants() {
      if (!event?.id) return;
      try {
        const { data, error } = await supabase
          .from("masterclass_participants")
          .select("*")
          .eq("event_id", event.id)
          .order("name");
        if (error) throw error;
        if (data) setParticipants(data);
      } catch (err) {
        console.error("Error fetching masterclass participants:", err);
      }
    }
    fetchParticipants();
  }, [event?.id]);

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
            <Eyebrow withRule>Archive</Eyebrow>
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

  const instructor = event.event_jury[0];

  return (
    <div className="bg-surface-canvas">
      {/* ================================================================
          HERO
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
                {t("pageCopy.pastMasterclass.eyebrow")}
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
                  {event.event_date
                    ? formatMultipleDatesWithLocale(event.event_date, language)
                    : t("common.tbd")}
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
          GALLERY
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
            <Eyebrow withRule>{t("pageCopy.pastMasterclass.galleryEyebrow")}</Eyebrow>
            <EventGallery images={photos} isLoading={photosLoading} />
          </motion.div>
        </Container>
      </section>

      {/* ================================================================
          NARRATIVE
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
                __html:
                  event.description?.[language] ||
                  event.description?.en ||
                  "",
              }}
            />
          </Container>
        </Section>
      )}

      {/* ================================================================
          INSTRUCTOR — single featured profile
          ================================================================ */}
      {instructor && (
        <Section tone="warm" pause="md" rule="top">
          <Container>
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={viewportOnce}
              transition={{ duration: 0.6, ease: EASE }}
              className="max-w-3xl mb-10 lg:mb-12"
            >
              <Eyebrow withRule>{t("masterclass.instructor")}</Eyebrow>
              <h2 className="type-headline-lg text-burgundy mt-3">
                Led by {instructor.name}
              </h2>
            </motion.div>

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
                {instructor.avatar_url ? (
                  <Image
                    src={instructor.avatar_url}
                    alt={instructor.name}
                    aspect="4/5"
                    containerClassName="border border-rule-hairline"
                    fit="cover"
                  />
                ) : (
                  <div className="aspect-[4/5] flex items-center justify-center bg-surface-canvas-warm border border-rule-hairline">
                    <NoteGlyph size={64} className="text-marigold/20" />
                  </div>
                )}
              </div>

              <div className="lg:col-span-7 flex flex-col gap-5">
                <div className="flex flex-col gap-2">
                  <Eyebrow>{instructor.title}</Eyebrow>
                  <h3 className="type-display-md text-burgundy">
                    {instructor.name}
                  </h3>
                </div>
                {instructor.description && (
                  <div
                    className="type-body-md text-ink-body prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: instructor.description }}
                  />
                )}
              </div>
            </motion.article>
          </Container>
        </Section>
      )}

      {/* ================================================================
          PARTICIPANTS — performers and their repertoire
          ================================================================ */}
      {participants.length > 0 && (
        <Section tone="canvas" pause="md" rule="top">
          <Container>
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={viewportOnce}
              transition={{ duration: 0.6, ease: EASE }}
              className="max-w-3xl mb-10 lg:mb-12"
            >
              <Eyebrow withRule>{t("masterclass.participants")}</Eyebrow>
              <h2 className="type-headline-lg text-burgundy mt-3">
                {t("pageCopy.pastMasterclass.participantsHeading")}
              </h2>
            </motion.div>

            <motion.div
              variants={reduceMotion ? undefined : stagger}
              initial={initial}
              whileInView="visible"
              viewport={viewportOnce}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
            >
              {participants.map((participant) => (
                <motion.article
                  key={participant.id}
                  variants={fadeUp}
                  className="bg-surface-elevated border border-rule-hairline p-6 flex flex-col gap-4"
                >
                  <h3 className="type-headline-sm text-burgundy">
                    {participant.name}
                  </h3>
                  <div className="pt-3 border-t border-rule-hairline">
                    <Eyebrow className="mb-3">
                      {t("masterclass.repertoire")}
                    </Eyebrow>
                    <ul className="flex flex-col gap-2">
                      {participant.repertoire.map((piece, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-2.5 type-body-sm text-ink-body"
                        >
                          <NoteGlyph
                            size={12}
                            className="text-marigold mt-1 flex-shrink-0"
                          />
                          <span>{piece}</span>
                        </li>
                      ))}
                    </ul>
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

export { PastMasterclassDetails };
export default PastMasterclassDetails;
