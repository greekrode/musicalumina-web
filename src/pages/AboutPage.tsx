import { motion, useReducedMotion } from "framer-motion";
import logo from "../assets/ML-LogoColor.png";
import { usePageTitle } from "../hooks/usePageTitle";
import { useLanguage } from "../lib/LanguageContext";
import { Section, Container } from "@/components/ui/section";
import {
  PageHeader,
  PageHeaderEyebrow,
  PageHeaderTitle,
} from "@/components/ui/page-header";
import { WireframeWave } from "@/components/ui/wireframe-wave";
import { Eyebrow } from "@/components/ui/eyebrow";

/**
 * AboutPage — Musical Lumina
 *
 * Five-movement composition:
 *   1. Header — eyebrow + editorial subtitle as the display headline
 *   2. Story — three paragraphs of humanized editorial prose with a first-line
 *      drop-cap
 *   3. Brand mark band — the Musical Lumina logo on an inverse surface as a
 *      signing-off mark between story and principles
 *   4. Principles — three numbered values (Craft / Restraint / Attention)
 *   5. (Values section scroll-triggered)
 *
 * All translation keys preserved; copy values rewritten in both EN and ID in
 * `translations.ts` with humanizer voice.
 */

const EASE = [0.19, 1, 0.22, 1] as const;

const staggerIn = {
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

function AboutPage() {
  const { t } = useLanguage();
  usePageTitle(t("about.title"));
  const reduceMotion = useReducedMotion();
  const initial = reduceMotion ? false : "hidden";

  const paragraphs = t("about.description").split("\n").filter(Boolean);

  const values = [
    {
      n: "01",
      title: t("about.coreValues.excellence.title"),
      body: t("about.coreValues.excellence.description"),
    },
    {
      n: "02",
      title: t("about.coreValues.innovation.title"),
      body: t("about.coreValues.innovation.description"),
    },
    {
      n: "03",
      title: t("about.coreValues.passion.title"),
      body: t("about.coreValues.passion.description"),
    },
  ];

  return (
    <div className="bg-surface-canvas">
      {/* ================================================================
          HEADER + STORY — one continuous section, two columns.
          Left column: headline flows directly into long-form prose.
          Right column: logo + Est. label, vertically centered against the
          full height of the left column (anchors the eye between the
          headline and the prose).
          ================================================================ */}
      <section className="relative overflow-hidden bg-surface-canvas pt-28 md:pt-32 lg:pt-36 pb-10 md:pb-16 lg:pb-24">
        <WireframeWave opacity={0.04} amplitude={0.7} lines={6} />
        <Container className="relative">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-center">
            {/* Left column — headline + prose, continuous flow */}
            <div className="lg:col-span-8 flex flex-col gap-12 lg:gap-16">
              {/* Headline — PageHeaderTitle must sit inside PageHeader so it
                  picks up the composition's flex layout, alignment, and
                  max-width tokens. Each part still gets its own motion wrapper. */}
              <motion.div
                variants={reduceMotion ? undefined : staggerIn}
                initial={initial}
                animate="visible"
              >
                <PageHeader align="start" className="max-w-3xl">
                  <motion.div variants={fadeUpSoft}>
                    <PageHeaderEyebrow>{t("about.title")}</PageHeaderEyebrow>
                  </motion.div>
                  <motion.div variants={fadeUp}>
                    <PageHeaderTitle size="xl">
                      {t("about.subtitle")}
                    </PageHeaderTitle>
                  </motion.div>
                </PageHeader>
              </motion.div>

              {/* Prose */}
              <motion.div
                initial={reduceMotion ? false : { opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={viewportOnce}
                transition={{ duration: 0.8, ease: EASE, delay: 0.15 }}
                className="max-w-prose flex flex-col gap-6"
              >
                {paragraphs.map((paragraph, i) => (
                  <p
                    key={i}
                    className={
                      i === 0
                        ? "type-body-lg text-ink-primary first-letter:float-left first-letter:font-serif first-letter:text-[3rem] md:first-letter:text-[3.75rem] lg:first-letter:text-[4.5rem] first-letter:leading-[0.82] first-letter:pr-2 md:first-letter:pr-3 first-letter:pt-1 first-letter:text-burgundy"
                        : "type-body-lg text-ink-body"
                    }
                  >
                    {paragraph}
                  </p>
                ))}
              </motion.div>
            </div>

            {/* Right column — logo, vertically centered against the column.
                Sized by width (not height) so the wide MUSICA · harp · LUMINA
                wordmark renders at its natural aspect without compression. */}
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={viewportOnce}
              transition={{ duration: 0.7, ease: EASE, delay: 0.2 }}
              className="lg:col-span-4 flex flex-col items-start lg:items-end gap-3"
            >
              <img
                src={logo}
                alt="Musica Lumina"
                className="block w-full max-w-[260px] lg:max-w-[340px] h-auto object-contain"
              />
              <span className="type-label text-ink-accent">Est. 2024</span>
            </motion.div>
          </div>
        </Container>
      </section>

      {/* ================================================================
          PRINCIPLES — three numbered movements
          ================================================================ */}
      <Section tone="warm" pause="lg" rule="top">
        <Container>
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={viewportOnce}
            transition={{ duration: 0.7, ease: EASE }}
            className="max-w-3xl mb-14 lg:mb-20"
          >
            <Eyebrow withRule>Principles</Eyebrow>
            <h2 className="type-display-md text-burgundy mt-4">
              {t("about.coreValues.title")}
            </h2>
          </motion.div>

          <motion.div
            variants={reduceMotion ? undefined : staggerIn}
            initial={initial}
            whileInView="visible"
            viewport={viewportOnce}
            className="grid grid-cols-1 md:grid-cols-3 gap-px bg-rule-hairline"
          >
            {values.map((v) => (
              <motion.article
                key={v.n}
                variants={fadeUp}
                className="bg-surface-canvas-warm p-7 md:p-8 lg:p-10 flex flex-col gap-5 md:min-h-[260px]"
              >
                <span className="type-display-md text-marigold font-serif tracking-[-0.02em]">
                  {v.n}
                </span>
                <h3 className="type-headline-md text-burgundy">{v.title}</h3>
                <p className="type-body-md text-ink-body text-pretty">
                  {v.body}
                </p>
              </motion.article>
            ))}
          </motion.div>
        </Container>
      </Section>
    </div>
  );
}

export default AboutPage;
