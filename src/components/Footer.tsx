import { Facebook, Instagram, Mail, Phone, Youtube } from "lucide-react";
import { useNavigate } from "react-router-dom";
import logo from "../assets/ML-LogoColor.png";
import lomlOneLogo from "../assets/loml_1.png";
import lomlTwoLogo from "../assets/loml_2.png";
import gopcLogo from "../assets/gopc.png";
import vipcfLogo from "../assets/vipcf.png";
import { useLanguage } from "../lib/LanguageContext";

function Footer() {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const handleNavigation = (path: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    navigate(path);
  };

  return (
    <footer className="bg-charcoal text-offWhite py-12 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center space-x-2 mb-4 hover-scale">
              <img src={logo} alt="MusicaLumina Logo" className="h-12 w-auto" />
            </div>
            <p className="text-sm text-offWhite/80 font-light"></p>
          </div>
          <div>
            <h2 className="text-2xl font-playfair mb-4 text-offWhite/90">
              {t("footer.quickLinks")}
            </h2>
            <ul className="space-y-2">
              <li>
                <a
                  href="#"
                  onClick={handleNavigation("/")}
                  className="text-offWhite/80 hover:text-marigold transition-colors duration-300"
                >
                  {t("footer.home")}
                </a>
              </li>
              <li>
                <a
                  href="#"
                  onClick={handleNavigation("/events")}
                  className="text-offWhite/80 hover:text-marigold transition-colors duration-300"
                >
                  {t("footer.events")}
                </a>
              </li>
              <li>
                <a
                  href="#"
                  onClick={handleNavigation("/about")}
                  className="text-offWhite/80 hover:text-marigold transition-colors duration-300"
                >
                  {t("footer.about")}
                </a>
              </li>
              <li>
                <a
                  href="#"
                  onClick={handleNavigation("/contact")}
                  className="text-offWhite/80 hover:text-marigold transition-colors duration-300"
                >
                  {t("footer.contact")}
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-2xl font-playfair mb-4 text-offWhite/80">
              {t("footer.contactUs")}
            </h3>
            <div className="flex space-x-6">
              <a
                href="https://www.instagram.com/musicalumina/"
                className="text-offWhite/80 hover:text-marigold transition-colors duration-300"
                aria-label="Instagram"
              >
                <Instagram className="h-6 w-6" />
              </a>
              <a
                href="https://wa.me/6282161505577"
                className="text-offWhite/80 hover:text-marigold transition-colors duration-300"
                aria-label="WhatsApp"
              >
                <Phone className="h-6 w-6" />
              </a>
              <a
                href="mailto:contact@musicalumina.com"
                className="text-offWhite/80 hover:text-marigold transition-colors duration-300"
                aria-label="Email"
              >
                <Mail className="h-6 w-6" />
              </a>
            </div>
          </div>
        </div>
      </div>
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="border-t border-offWhite/20 pt-10 mb-8 mt-10">
          <h3 className="text-2xl font-playfair mb-6 text-center text-offWhite/90">
            {t("footer.partners")}
          </h3>
          <div className="flex flex-row flex-wrap md:flex-nowrap items-center justify-center gap-4 lg:gap-8">
            <a
              href="http://loml.org.uk/"
              target="_blank"
              rel="noopener noreferrer"
              className="block group focus-visible:outline-none"
            >
              <div className="flex h-20 w-20 cursor-pointer md:h-24 md:w-24 lg:h-28 lg:w-28 items-center justify-center rounded-lg bg-white/10 p-3 md:p-4 transition-[transform,box-shadow] motion-reduce:transition-none duration-300 hover:bg-white/20 motion-safe:hover:scale-110 motion-safe:active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marigold group-focus-visible:ring-2 group-focus-visible:ring-marigold group-focus-visible:outline-none">
                <img
                  src={lomlOneLogo}
                  alt="Legacy of Music Learning logo"
                  className="h-full w-full object-contain"
                  loading="lazy"
                />
              </div>
            </a>
            <a
              href="http://loml.org.uk/"
              target="_blank"
              rel="noopener noreferrer"
              className="block group focus-visible:outline-none"
            >
              <div className="flex h-20 w-20 cursor-pointer md:h-24 md:w-24 lg:h-28 lg:w-28 items-center justify-center rounded-lg bg-white/10 p-3 md:p-4 transition-[transform,box-shadow] motion-reduce:transition-none duration-300 hover:bg-white/20 motion-safe:hover:scale-110 motion-safe:active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marigold group-focus-visible:ring-2 group-focus-visible:ring-marigold group-focus-visible:outline-none">
                <img
                  src={lomlTwoLogo}
                  alt="Legacy of Music Learning emblem"
                  className="h-full w-full object-contain"
                  loading="lazy"
                />
              </div>
            </a>
            <a
              href="https://gopc.vn/en"
              target="_blank"
              rel="noopener noreferrer"
              className="block group focus-visible:outline-none"
            >
              <div className="flex h-20 md:h-24 lg:h-28 w-auto max-w-[14rem] cursor-pointer md:max-w-[14rem] lg:max-w-[18rem] items-center justify-center rounded-lg bg-white/10 p-4 md:p-5 transition-[transform,box-shadow] motion-reduce:transition-none duration-300 hover:bg-white/20 motion-safe:hover:scale-105 motion-safe:active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marigold group-focus-visible:ring-2 group-focus-visible:ring-marigold group-focus-visible:outline-none">
                <img
                  src={gopcLogo}
                  alt="Gathering of Pastors and Churches logo"
                  className="h-full w-full object-contain"
                  loading="lazy"
                />
              </div>
            </a>
            <div className="flex h-20 md:h-24 lg:h-28 w-auto max-w-[14rem] md:max-w-[14rem] lg:max-w-[18rem] items-center justify-center rounded-lg bg-white/10 p-4 md:p-5 transition-[transform,box-shadow] motion-reduce:transition-none duration-300 hover:bg-white/20 motion-safe:hover:scale-[1.02]">
              <img
                src={vipcfLogo}
                alt="Valley International Pastors Christian Fellowship logo"
                className="h-full w-full object-contain"
                loading="lazy"
              />
            </div>
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        <p className="text-sm text-offWhite/80 font-light text-center">
          {t("footer.copyright").replace("{year}", new Date().getFullYear().toString())}
        </p>
      </div>
    </footer>
  );
}

export default Footer;
