import { Facebook, Instagram, Mail, Phone, Youtube } from "lucide-react";
import { useNavigate } from "react-router-dom";
import logo from "../assets/ML-LogoColor.png";
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
        <div className="mt-8">
          <p className="text-sm text-offWhite/80 font-light text-center">
            {t("footer.copyright").replace("{year}", new Date().getFullYear().toString())}
          </p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
