import { motion, useReducedMotion } from "framer-motion";
import { Mail, Phone, MapPin } from "lucide-react";
import { usePageTitle } from "../hooks/usePageTitle";
import { useLanguage } from "../lib/LanguageContext";
import { Container } from "@/components/ui/section";
import { Eyebrow } from "@/components/ui/eyebrow";
import { WireframeWave } from "@/components/ui/wireframe-wave";

/**
 * ContactPage — Musical Lumina
 *
 * Simple two-column landscape: editorial header on the left, contact details
 * and office hours on the right. No form — the email, WhatsApp, and in-person
 * channels are the interface. Sized to fit 1920×1080 without scroll with the
 * footer visible.
 */

const EASE = [0.19, 1, 0.22, 1] as const;

const staggerIn = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.08 },
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
};

const fadeUpSoft = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
};

function ContactPage() {
  const { t } = useLanguage();
  usePageTitle(t("contact.title"));
  const reduceMotion = useReducedMotion();
  const initial = reduceMotion ? false : "hidden";

  return (
    // Outer wrapper fills whatever space sits between the fixed nav and the
    // footer. `min-h` reserves roughly (viewport − nav − footer), so on 1080p
    // the footer still hits the fold and on a 4K display the content gets
    // hundreds of px of centered breathing room instead of clamping to the top.
    <div className="bg-surface-canvas flex items-center min-h-[calc(100vh-500px)]">
      <section className="relative overflow-hidden w-full pt-24 lg:pt-10 pb-10 lg:pb-8">
        <WireframeWave opacity={0.03} amplitude={0.5} lines={5} />
        <Container className="relative">
          <motion.div
            variants={reduceMotion ? undefined : staggerIn}
            initial={initial}
            animate="visible"
            className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16"
          >
            {/* ─────── Left: editorial header ─────── */}
            <div className="lg:col-span-7 flex flex-col gap-5">
              <motion.div variants={fadeUpSoft}>
                <Eyebrow withRule>{t("contact.title")}</Eyebrow>
              </motion.div>
              <motion.h1
                variants={fadeUp}
                className="type-display-lg text-burgundy text-balance"
              >
                {t("contact.howCanWeHelp")}
              </motion.h1>
              <motion.p
                variants={fadeUpSoft}
                className="type-body-lg text-ink-muted max-w-xl text-pretty"
              >
                {t("contact.inquiryText")}
              </motion.p>
            </div>

            {/* ─────── Right: contact details + office hours ─────── */}
            <motion.aside
              variants={fadeUp}
              className="lg:col-span-5 flex flex-col gap-8"
            >
              <div className="flex flex-col gap-4">
                <Eyebrow withRule>{t("contact.info.title")}</Eyebrow>
                <ul className="flex flex-col gap-4">
                  <InfoRow
                    icon={<Mail className="h-4 w-4" />}
                    label={t("contact.info.email")}
                  >
                    <a
                      href="mailto:contact@musicalumina.com"
                      className="type-body-md text-burgundy hover:text-marigold transition-colors duration-fast ease-out-quart break-all"
                    >
                      contact@musicalumina.com
                    </a>
                  </InfoRow>
                  <InfoRow
                    icon={<Phone className="h-4 w-4" />}
                    label={t("contact.info.phone")}
                  >
                    <a
                      href="https://wa.me/628211720765"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="type-body-md text-burgundy hover:text-marigold transition-colors duration-fast ease-out-quart"
                    >
                      +62 821 1720 765
                    </a>
                  </InfoRow>
                  <InfoRow
                    icon={<MapPin className="h-4 w-4" />}
                    label={t("contact.info.location")}
                  >
                    <p className="type-body-md text-burgundy">
                      Jakarta, Indonesia
                    </p>
                  </InfoRow>
                </ul>
              </div>

              <div className="flex flex-col gap-4 pt-5 border-t border-rule-hairline">
                <Eyebrow withRule>
                  {t("contact.info.officeHours.title")}
                </Eyebrow>
                <dl className="flex flex-col gap-2.5">
                  <HoursRow
                    label={t("contact.info.officeHours.weekdays")}
                    value={t("contact.info.officeHours.weekdayHours")}
                  />
                  <HoursRow
                    label={t("contact.info.officeHours.saturday")}
                    value={t("contact.info.officeHours.saturdayHours")}
                  />
                  <HoursRow
                    label={t("contact.info.officeHours.sunday")}
                    value={t("contact.info.officeHours.closed")}
                    muted
                  />
                </dl>
              </div>
            </motion.aside>
          </motion.div>
        </Container>
      </section>
    </div>
  );
}

function InfoRow({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <li className="grid grid-cols-[28px_1fr] gap-3 items-start">
      <span
        aria-hidden
        className="flex h-7 w-7 items-center justify-center text-marigold mt-0.5"
      >
        {icon}
      </span>
      <div className="flex flex-col gap-0.5 min-w-0">
        <span className="type-label text-ink-muted">{label}</span>
        {children}
      </div>
    </li>
  );
}

function HoursRow({
  label,
  value,
  muted,
}: {
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div className="grid grid-cols-[120px_1fr] gap-4 items-baseline">
      <dt className="type-label text-ink-muted">{label}</dt>
      <dd
        className={
          muted ? "type-body-md text-ink-muted" : "type-body-md text-burgundy"
        }
      >
        {value}
      </dd>
    </div>
  );
}

export default ContactPage;
