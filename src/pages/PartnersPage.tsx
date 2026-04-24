import { motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import gopcLogo from "../assets/gopc.png";
import lomlOneLogo from "../assets/loml_1.png";
import lomlTwoLogo from "../assets/loml_2.png";
import vipcfLogo from "../assets/vipcf.png";
import { usePageTitle } from "../hooks/usePageTitle";
import { useLanguage } from "../lib/LanguageContext";
import { Section, Container } from "@/components/ui/section";
import {
  PageHeader,
  PageHeaderEyebrow,
  PageHeaderLede,
  PageHeaderTitle,
} from "@/components/ui/page-header";
import { WireframeWave } from "@/components/ui/wireframe-wave";
import { cn } from "@/lib/utils";

/**
 * PartnersPage — Musical Lumina
 *
 * Just the logos. Three partner identities:
 *   - LOML  — London Overseas Musician League (two logo marks)
 *   - GOPC  — Grand Opus International Piano Competition
 *   - VIPCF — Vietnam International Piano Competition & Festival
 *
 * Logo assets are light-on-dark, so the logo band sits on an inverse burgundy
 * surface where they read cleanly — no cream tiles that wash them out.
 */

const EASE = [0.19, 1, 0.22, 1] as const;

const staggerIn = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.12, delayChildren: 0.1 },
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

/**
 * Partner identities — grouped so LOML's two marks sit together rather than
 * being treated as two separate partners.
 */
interface PartnerGroup {
  key: string;
  shortName: string;
  fullName: string;
  href?: string;
  logos: { key: string; src: string; alt: string }[];
}

const PARTNERS: readonly PartnerGroup[] = [
  {
    key: "loml",
    shortName: "LOML",
    fullName: "London Overseas Musician League",
    href: "http://loml.org.uk/",
    logos: [
      {
        key: "loml-1",
        src: lomlOneLogo,
        alt: "London Overseas Musician League primary mark",
      },
      {
        key: "loml-2",
        src: lomlTwoLogo,
        alt: "London Overseas Musician League secondary mark",
      },
    ],
  },
  {
    key: "gopc",
    shortName: "GOPC",
    fullName: "Grand Opus International Piano Competition",
    href: "https://gopc.vn/en",
    logos: [
      {
        key: "gopc",
        src: gopcLogo,
        alt: "Grand Opus International Piano Competition",
      },
    ],
  },
  {
    key: "vipcf",
    shortName: "VIPCF",
    fullName: "Vietnam International Piano Competition & Festival",
    logos: [
      {
        key: "vipcf",
        src: vipcfLogo,
        alt: "Vietnam International Piano Competition & Festival",
      },
    ],
  },
];

function PartnerCard({ partner }: { partner: PartnerGroup }) {
  const card = (
    <article
      className={cn(
        "relative h-full flex flex-col",
        "bg-offWhite/[0.04] border border-offWhite/10",
        "transition-[background-color,border-color] duration-base ease-out-quart",
        partner.href && "group-hover:bg-offWhite/[0.08] group-hover:border-marigold/40"
      )}
    >
      {/* Logos row — evenly spaced inside a padded dark tile */}
      <div
        className={cn(
          "flex-1 flex items-center justify-center gap-6 lg:gap-8",
          "min-h-[180px] lg:min-h-[220px] p-8 lg:p-10"
        )}
      >
        {partner.logos.map((logo) => (
          <img
            key={logo.key}
            src={logo.src}
            alt={logo.alt}
            loading="lazy"
            className="max-h-24 lg:max-h-32 w-auto max-w-full object-contain"
          />
        ))}
      </div>

      {/* Footer — short name + full name + visit arrow */}
      <div className="flex items-start justify-between gap-4 px-6 lg:px-8 py-5 border-t border-offWhite/10">
        <div className="flex flex-col gap-1 min-w-0">
          <span className="type-label text-marigold">{partner.shortName}</span>
          <span className="type-body-sm text-offWhite/85 leading-snug">
            {partner.fullName}
          </span>
        </div>
        {partner.href && (
          <ArrowUpRight
            aria-hidden
            className={cn(
              "h-4 w-4 text-offWhite/50 flex-shrink-0 mt-0.5",
              "transition-[color,transform] duration-base ease-out-quart",
              "group-hover:text-marigold motion-safe:group-hover:translate-x-0.5 motion-safe:group-hover:-translate-y-0.5"
            )}
          />
        )}
      </div>
    </article>
  );

  return partner.href ? (
    <a
      href={partner.href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "group block h-full",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marigold focus-visible:ring-offset-2 focus-visible:ring-offset-burgundy-700"
      )}
    >
      {card}
    </a>
  ) : (
    <div className="group h-full">{card}</div>
  );
}

function PartnersPage() {
  const { t } = useLanguage();
  usePageTitle(t("partners.title"));
  const reduceMotion = useReducedMotion();
  const initial = reduceMotion ? false : "hidden";

  return (
    <div className="bg-surface-canvas">
      {/* Header */}
      <Section
        tone="canvas"
        pause="lg"
        className="pt-28 md:pt-32 lg:pt-36 relative overflow-hidden"
      >
        <WireframeWave opacity={0.04} amplitude={0.7} lines={6} />
        <Container className="relative">
          <motion.div
            variants={reduceMotion ? undefined : staggerIn}
            initial={initial}
            animate="visible"
          >
            <PageHeader align="start" className="max-w-4xl">
              <motion.div variants={fadeUpSoft}>
                <PageHeaderEyebrow>Partnerships</PageHeaderEyebrow>
              </motion.div>
              <motion.div variants={fadeUp}>
                <PageHeaderTitle size="xl">
                  {t("partners.title")}
                </PageHeaderTitle>
              </motion.div>
              <motion.div variants={fadeUpSoft}>
                <PageHeaderLede>{t("partners.subtitle")}</PageHeaderLede>
              </motion.div>
            </PageHeader>
          </motion.div>
        </Container>
      </Section>

      {/* Logo band — inverse burgundy so light-on-dark logos render correctly */}
      <Section tone="inverse" pause="lg" className="relative overflow-hidden">
        <WireframeWave
          color="#E2A225"
          opacity={0.05}
          amplitude={0.7}
          lines={6}
        />
        <Container className="relative">
          <motion.div
            variants={reduceMotion ? undefined : staggerIn}
            initial={initial}
            whileInView="visible"
            viewport={viewportOnce}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-6"
          >
            {PARTNERS.map((partner) => (
              <motion.div
                key={partner.key}
                variants={fadeUp}
                className="h-full"
              >
                <PartnerCard partner={partner} />
              </motion.div>
            ))}
          </motion.div>
        </Container>
      </Section>
    </div>
  );
}

export default PartnersPage;
