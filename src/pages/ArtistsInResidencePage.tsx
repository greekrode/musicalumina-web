import { motion, useReducedMotion } from "framer-motion";
import { startTransition, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { usePageTitle } from "../hooks/usePageTitle";
import { useLanguage } from "../lib/LanguageContext";
import { getArtistsInResidence } from "../lib/supabase";
import LoadingSpinner from "../components/LoadingSpinner";
import ArtistProfileModal, {
  type ArtistProfile,
} from "../components/ArtistProfileModal";
import { Section, Container } from "@/components/ui/section";
import {
  PageHeader,
  PageHeaderEyebrow,
  PageHeaderLede,
  PageHeaderTitle,
} from "@/components/ui/page-header";
import { WireframeWave, NoteGlyph } from "@/components/ui/wireframe-wave";
import { Image } from "@/components/ui/image";
import { Eyebrow } from "@/components/ui/eyebrow";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";

/**
 * ArtistsInResidencePage — Musical Lumina
 *
 * Dedicated page for the artists Musica Lumina represents in residence.
 *  1. Hero — eyebrow + editorial headline + lede over a wireframe wave
 *  2. Artist grid — portrait, title, name, and a Profile cue
 *
 * Credentials and biography open in ArtistProfileModal so the grid stays
 * scannable. `?artist=<id>` keeps the open profile in the URL.
 *
 * HERO: each card is a single quiet hit-target — portrait, title, name,
 * Profile — no résumé on the floor.
 *
 * Data comes from the standalone `artists_in_residence` table via
 * `getArtistsInResidence()`.
 */

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
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: EASE } },
};

const fadeUpSoft = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
};

const gridStagger = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.1 },
  },
};

const viewportOnce = { once: true, margin: "-80px" } as const;

function ArtistsInResidencePage() {
  const { t } = useLanguage();
  usePageTitle(t("artistsInResidence.title"));
  const reduceMotion = useReducedMotion();
  const initial = reduceMotion ? false : "hidden";
  const [searchParams, setSearchParams] = useSearchParams();

  const [artists, setArtists] = useState<ArtistProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [displayedArtist, setDisplayedArtist] = useState<ArtistProfile | null>(
    null
  );
  const [profileOpen, setProfileOpen] = useState(false);
  const skipUrlHydrate = useRef(false);

  useEffect(() => {
    getArtistsInResidence()
      .then(({ artists: rows }) => {
        setArtists(
          rows.map((artist) => ({
            id: artist.id,
            name: artist.name,
            title: artist.title,
            description: artist.description,
            avatar_url: artist.avatar_url,
            credentials: artist.credentials as Record<string, string> | null,
          }))
        );
      })
      .catch(() => {
        // Silently fail — artists section is non-critical
      })
      .finally(() => setLoading(false));
  }, []);

  const selectedId = searchParams.get("artist");

  useEffect(() => {
    if (skipUrlHydrate.current) {
      skipUrlHydrate.current = false;
      return;
    }
    if (!selectedId) {
      setProfileOpen(false);
      return;
    }
    const found = artists.find((artist) => artist.id === selectedId);
    if (found) {
      setDisplayedArtist(found);
      setProfileOpen(true);
    }
  }, [artists, selectedId]);

  const syncArtistParam = (id: string | null) => {
    skipUrlHydrate.current = true;
    const next = new URLSearchParams(searchParams);
    if (id) next.set("artist", id);
    else next.delete("artist");
    startTransition(() => {
      setSearchParams(next, { replace: true });
    });
  };

  const openArtist = (artist: ArtistProfile) => {
    setDisplayedArtist(artist);
    setProfileOpen(true);
    syncArtistParam(artist.id);
  };

  const closeArtist = () => {
    setProfileOpen(false);
    syncArtistParam(null);
  };

  return (
    <div className="bg-surface-canvas">
      {/* ================================================================
          HERO
          ================================================================ */}
      <section className="relative overflow-hidden bg-surface-canvas pt-28 md:pt-32 lg:pt-36 pb-10 md:pb-16 lg:pb-24">
        <WireframeWave opacity={0.04} amplitude={0.7} lines={6} />
        <Container className="relative">
          <motion.div
            variants={reduceMotion ? undefined : staggerContainer}
            initial={initial}
            animate="visible"
          >
            <PageHeader align="start" className="max-w-3xl">
              <motion.div variants={fadeUpSoft}>
                <PageHeaderEyebrow>
                  {t("artistsInResidence.title")}
                </PageHeaderEyebrow>
              </motion.div>
              <motion.div variants={fadeUp}>
                <PageHeaderTitle size="xl">
                  {t("artistsInResidence.subtitle")}
                </PageHeaderTitle>
              </motion.div>
              <motion.div variants={fadeUpSoft}>
                <PageHeaderLede>
                  {t("artistsInResidence.lede")}
                </PageHeaderLede>
              </motion.div>
            </PageHeader>
          </motion.div>
        </Container>
      </section>

      {/* ================================================================
          ARTIST GRID
          ================================================================ */}
      <Section tone="canvas" pause="lg" rule="top">
        <Container>
          {loading ? (
            <LoadingSpinner message={t("home.loading")} />
          ) : (
            artists.length > 0 && (
              <motion.div
                variants={reduceMotion ? undefined : gridStagger}
                initial={initial}
                whileInView="visible"
                viewport={viewportOnce}
                className={cn(
                  "grid gap-10 md:gap-12",
                  artists.length === 1
                    ? "grid-cols-1 max-w-sm mx-auto"
                    : artists.length === 2
                      ? "grid-cols-1 md:grid-cols-2 max-w-3xl mx-auto"
                      : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
                )}
              >
                {artists.map((artist) => (
                  <motion.article key={artist.id} variants={fadeUp}>
                    <button
                      type="button"
                      onClick={() => openArtist(artist)}
                      aria-haspopup="dialog"
                      aria-expanded={profileOpen && displayedArtist?.id === artist.id}
                      className={cn(
                        "group flex w-full flex-col gap-5 text-left",
                        "border-t border-rule-hairline pt-8",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marigold focus-visible:ring-offset-4 focus-visible:ring-offset-surface-canvas"
                      )}
                    >
                      {artist.avatar_url ? (
                        <Image
                          src={artist.avatar_url}
                          alt=""
                          aspect="3/4"
                          containerClassName="w-full border border-rule-hairline outline outline-1 outline-black/10"
                          className="motion-safe:transition-transform motion-safe:duration-700 motion-safe:ease-out-quart group-hover:scale-[1.04]"
                          fit="cover"
                        />
                      ) : (
                        <div className="flex aspect-[3/4] w-full items-center justify-center bg-surface-canvas-warm border border-rule-hairline outline outline-1 outline-black/10">
                          <NoteGlyph
                            size={48}
                            className="text-marigold/25"
                            aria-hidden
                          />
                        </div>
                      )}
                      <div className="flex flex-col items-center gap-2 text-center">
                        <Eyebrow>{artist.title}</Eyebrow>
                        <h3 className="type-headline-md text-burgundy text-balance">
                          {artist.name}
                        </h3>
                        <span
                          className={cn(
                            buttonVariants({
                              variant: "secondary",
                              size: "sm",
                            }),
                            "mt-3 uppercase tracking-[0.16em] active:scale-[0.96]"
                          )}
                        >
                          {t("artistsInResidence.profile")}
                        </span>
                      </div>
                    </button>
                  </motion.article>
                ))}
              </motion.div>
            )
          )}
        </Container>
      </Section>

      <ArtistProfileModal
        isOpen={profileOpen}
        onClose={closeArtist}
        artist={displayedArtist}
      />
    </div>
  );
}

export default ArtistsInResidencePage;
