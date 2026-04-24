import { Instagram, Mail, Phone } from "lucide-react";
import { useNavigate } from "react-router-dom";
import logo from "../assets/ML-LogoColor.png";
import lomlOneLogo from "../assets/loml_1.png";
import lomlTwoLogo from "../assets/loml_2.png";
import gopcLogo from "../assets/gopc.png";
import vipcfLogo from "../assets/vipcf.png";
import { useLanguage } from "../lib/LanguageContext";
import { WireframeWave } from "@/components/ui/wireframe-wave";
import LanguageSwitcher from "./LanguageSwitcher";
import { cn } from "@/lib/utils";

/**
 * Footer — Musical Lumina
 *
 * Edge-to-edge layout with no inner container cap. Tightened vertical rhythm
 * (~half the height of the previous pass), centered copyright, "Musica Lumina"
 * rendered as the proper two-word brand mark. The "Crafted with care · Jakarta"
 * colophon was removed.
 */

interface PartnerLogo {
  key: string;
  src: string;
  alt: string;
  href?: string;
}

const PARTNERS: readonly PartnerLogo[] = [
  {
    key: "loml-1",
    src: lomlOneLogo,
    alt: "London Overseas Musician League",
    href: "http://loml.org.uk/",
  },
  {
    key: "loml-2",
    src: lomlTwoLogo,
    alt: "London Overseas Musician League",
    href: "http://loml.org.uk/",
  },
  {
    key: "gopc",
    src: gopcLogo,
    alt: "Grand Opus International Piano Competition",
    href: "https://gopc.vn/en",
  },
  {
    key: "vipcf",
    src: vipcfLogo,
    alt: "Vietnam International Piano Competition & Festival",
  },
];

function Footer() {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const handleNavigation = (path: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    navigate(path);
  };

  const quickLinks = [
    { path: "/", key: "footer.home" },
    { path: "/events", key: "footer.events" },
    { path: "/about", key: "footer.about" },
    { path: "/contact", key: "footer.contact" },
  ];

  return (
    <footer className="relative bg-[color:var(--surface-inverse)] text-offWhite overflow-hidden mt-auto">
      {/* Atmospheric wave backdrop */}
      <WireframeWave color="#E2A225" opacity={0.04} amplitude={0.6} lines={5} />

      {/* Top hairline accent — marigold gradient line */}
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-marigold/40 to-transparent"
      />

      {/* Edge-to-edge container — no max-w cap, just direct viewport padding */}
      <div className="relative px-6 sm:px-10 lg:px-16 pt-12 lg:pt-14 pb-6">
        {/* ============ Top row — brand + quick links + contact ============ */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-y-10 md:gap-x-12 lg:gap-x-16 mb-10 lg:mb-12">
          {/* Brand column — logo asset already contains the wordmark.
              `items-start` opts children out of the flex container's default
              `stretch` so the wide MUSICA · harp · LUMINA mark renders at
              its natural aspect instead of getting stretched to column width. */}
          <div className="md:col-span-5 flex flex-col items-start gap-4">
            <img
              src={logo}
              alt="Musica Lumina"
              loading="lazy"
              decoding="async"
              className="block h-12 w-auto max-w-[260px] brightness-0 invert"
            />
            <p className="type-body-sm text-offWhite/65 max-w-md text-pretty">
              An editorial home for musical events, masterclasses, and group
              classes — curated for musicians who care about craft.
            </p>
            <div className="pt-1">
              <LanguageSwitcher inverse />
            </div>
          </div>

          {/* Quick links */}
          <nav aria-label="Footer navigation" className="md:col-span-3">
            <span className="type-label text-marigold flex items-center gap-3 mb-4">
              <span aria-hidden className="inline-block h-px w-5 bg-marigold" />
              {t("footer.quickLinks")}
            </span>
            <ul className="flex flex-col gap-2.5">
              {quickLinks.map(({ path, key }) => (
                <li key={path}>
                  <a
                    href="#"
                    onClick={handleNavigation(path)}
                    className={cn(
                      "font-serif text-body-md text-offWhite/85",
                      "transition-colors duration-fast ease-out-quart hover:text-marigold",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marigold rounded-sm"
                    )}
                  >
                    {t(key)}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          {/* Contact */}
          <div className="md:col-span-4">
            <span className="type-label text-marigold flex items-center gap-3 mb-4">
              <span aria-hidden className="inline-block h-px w-5 bg-marigold" />
              {t("footer.contactUs")}
            </span>
            <ul className="flex flex-col gap-2.5">
              <li>
                <a
                  href="mailto:contact@musicalumina.com"
                  className={cn(
                    "inline-flex items-center gap-2.5 font-sans text-body-sm text-offWhite/85",
                    "transition-colors duration-fast ease-out-quart hover:text-marigold",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marigold rounded-sm"
                  )}
                >
                  <Mail className="h-3.5 w-3.5 flex-shrink-0 text-marigold/80" />
                  contact@musicalumina.com
                </a>
              </li>
              <li>
                <a
                  href="https://wa.me/628211720765"
                  className={cn(
                    "inline-flex items-center gap-2.5 font-sans text-body-sm text-offWhite/85",
                    "transition-colors duration-fast ease-out-quart hover:text-marigold",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marigold rounded-sm"
                  )}
                >
                  <Phone className="h-3.5 w-3.5 flex-shrink-0 text-marigold/80" />
                  +62 821 1720 765
                </a>
              </li>
              <li>
                <a
                  href="https://www.instagram.com/musicalumina/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    "inline-flex items-center gap-2.5 font-sans text-body-sm text-offWhite/85",
                    "transition-colors duration-fast ease-out-quart hover:text-marigold",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marigold rounded-sm"
                  )}
                >
                  <Instagram className="h-3.5 w-3.5 flex-shrink-0 text-marigold/80" />
                  @musicalumina
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* ============ Partners row — centered, stacked ============ */}
        <div className="border-t border-offWhite/10 pt-7 pb-7">
          <div className="flex flex-col items-center gap-6">
            <span className="type-label text-marigold flex items-center gap-3">
              <span aria-hidden className="inline-block h-px w-6 bg-marigold" />
              {t("footer.partners")}
              <span aria-hidden className="inline-block h-px w-6 bg-marigold" />
            </span>
            <div className="flex flex-wrap items-center justify-center gap-7 lg:gap-10">
              {PARTNERS.map((partner) => {
                const tile = (
                  <div
                    className={cn(
                      "h-12 lg:h-14 flex items-center justify-center px-2",
                      "opacity-70 transition-opacity duration-fast ease-out-quart",
                      partner.href && "group-hover:opacity-100"
                    )}
                  >
                    <img
                      src={partner.src}
                      alt={partner.alt}
                      className="max-h-full w-auto max-w-[110px] lg:max-w-[140px] object-contain"
                      loading="lazy"
                    />
                  </div>
                );

                return partner.href ? (
                  <a
                    key={partner.key}
                    href={partner.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      "group block",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marigold focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--surface-inverse)]"
                    )}
                  >
                    {tile}
                  </a>
                ) : (
                  <div key={partner.key} className="group">
                    {tile}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ============ Centered copyright ============ */}
        <div className="border-t border-offWhite/10 pt-6">
          <p className="type-caption text-offWhite/55 text-center">
            {t("footer.copyright").replace(
              "{year}",
              new Date().getFullYear().toString()
            )}
          </p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
