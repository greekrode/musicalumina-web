import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";
import { usePageTitle } from "../hooks/usePageTitle";
import { useLanguage } from "../lib/LanguageContext";
import { getArtistsInResidence } from "../lib/supabase";
import { sanitizeHtml } from "../lib/sanitize";
import LoadingSpinner from "../components/LoadingSpinner";
import { Section, Container } from "@/components/ui/section";
import {
  PageHeader,
  PageHeaderEyebrow,
  PageHeaderLede,
  PageHeaderTitle,
} from "@/components/ui/page-header";
import { WireframeWave } from "@/components/ui/wireframe-wave";
import { Eyebrow } from "@/components/ui/eyebrow";
import { cn } from "@/lib/utils";

/**
 * ArtistsInResidencePage — Musical Lumina
 *
 * Dedicated page for the artists Musica Lumina represents in residence.
 *  1. Hero — eyebrow + editorial headline + lede over a wireframe wave
 *  2. Artist grid — editorial cards (portrait, title, credentials, bio)
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

interface ArtistProfile {
  id: string;
  name: string;
  title: string;
  description: string | null;
  avatar_url: string | null;
  credentials: Record<string, string> | null;
}

function ArtistsInResidencePage() {
  const { t } = useLanguage();
  usePageTitle(t("artistsInResidence.title"));
  const reduceMotion = useReducedMotion();
  const initial = reduceMotion ? false : "hidden";

  const [artists, setArtists] = useState<ArtistProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getArtistsInResidence()
      .then(({ artists }) => {
        setArtists(
          artists.map((a) => ({
            id: a.id,
            name: a.name,
            title: a.title,
            description: a.description,
            avatar_url: a.avatar_url,
            credentials: a.credentials as Record<string, string> | null,
          }))
        );
      })
      .catch(() => {
        // Silently fail — artists section is non-critical
      })
      .finally(() => setLoading(false));
  }, []);

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
                  "grid gap-8",
                  artists.length === 1
                    ? "grid-cols-1 max-w-2xl mx-auto"
                    : artists.length === 2
                      ? "grid-cols-1 md:grid-cols-2 max-w-4xl mx-auto"
                      : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
                )}
              >
                {artists.map((artist) => (
                  <motion.article
                    key={artist.id}
                    variants={fadeUp}
                    className="flex flex-col gap-6 border-t border-rule-hairline pt-8"
                  >
                    {artist.avatar_url && (
                      <div className="aspect-[3/4] overflow-hidden bg-surface-canvas-warm border border-rule-hairline">
                        <img
                          src={artist.avatar_url}
                          alt={artist.name}
                          loading="lazy"
                          className="h-full w-full object-cover"
                        />
                      </div>
                    )}
                    <div className="flex flex-col gap-2">
                      <Eyebrow>{artist.title}</Eyebrow>
                      <h3 className="type-headline-md text-burgundy">
                        {artist.name}
                      </h3>
                      {artist.credentials && (
                        <ul className="flex flex-col gap-1 mt-1">
                          {Object.entries(artist.credentials).map(([k, v]) => (
                            <li
                              key={k}
                              className="type-caption text-ink-muted italic"
                            >
                              {k}: {v}
                            </li>
                          ))}
                        </ul>
                      )}
                      {artist.description && (
                        <div
                          className="type-body-sm text-ink-body prose prose-sm max-w-none mt-3"
                          dangerouslySetInnerHTML={{
                            __html: sanitizeHtml(artist.description),
                          }}
                        />
                      )}
                    </div>
                  </motion.article>
                ))}
              </motion.div>
            )
          )}
        </Container>
      </Section>
    </div>
  );
}

export default ArtistsInResidencePage;
