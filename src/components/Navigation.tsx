import { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import logo from "../assets/ML-LogoColor.png";
import LanguageSwitcher from "./LanguageSwitcher";
import { useLanguage } from "../lib/LanguageContext";

function Navigation() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useLanguage();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setIsMenuOpen(false);
  }, [location]);

  const handleNavigation = (path: string) => () => {
    navigate(path);
    setIsMenuOpen(false);
  };

  const isActive = (path: string) => {
    return (
      location.pathname === path || location.pathname.startsWith(`${path}/`)
    );
  };

  const isHomePage = location.pathname === "/";

  const getNavLinkClass = (path: string) => {
    const isCurrentPage = isActive(path);
    if (isHomePage) {
      return `text-offWhite hover:text-marigold transition-colors duration-300 ${
        isCurrentPage ? "text-marigold" : ""
      }`;
    }
    return `text-burgundy hover:text-marigold transition-colors duration-300 ${
      isCurrentPage ? "text-marigold" : ""
    }`;
  };

  return (
    <nav
      className={`fixed w-full z-50 transition-all duration-300 ${
        isScrolled || !isHomePage ? "bg-offWhite shadow-md" : "bg-transparent"
      }`}
    >
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex justify-between items-center">
          <Link to="/" className="flex items-center space-x-2 hover-scale">
            <img src={logo} alt="MusicaLumina Logo" className="h-10 w-auto" />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8 font-playfair text-lg">
            <button
              onClick={handleNavigation("/events")}
              className={getNavLinkClass("/events")}
              aria-current={isActive("/events") ? "page" : undefined}
            >
              {t("navigation.events")}
            </button>
            <button
              onClick={handleNavigation("/about")}
              className={getNavLinkClass("/about")}
              aria-current={isActive("/about") ? "page" : undefined}
            >
              {t("navigation.about")}
            </button>
            <button
              onClick={handleNavigation("/partners")}
              className={getNavLinkClass("/partners")}
              aria-current={isActive("/partners") ? "page" : undefined}
            >
              {t("navigation.partners")}
            </button>
            <button
              onClick={handleNavigation("/contact")}
              className={getNavLinkClass("/contact")}
              aria-current={isActive("/contact") ? "page" : undefined}
            >
              {t("navigation.contact")}
            </button>
            <LanguageSwitcher />
          </div>

          {/* Mobile Navigation */}
          <div className="md:hidden flex items-center space-x-4">
            <LanguageSwitcher />
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2"
              aria-label={isMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={isMenuOpen}
            >
              {isMenuOpen ? (
                <X
                  className={`h-6 w-6 ${
                    isHomePage ? "text-offWhite" : "text-burgundy"
                  }`}
                />
              ) : (
                <Menu
                  className={`h-6 w-6 ${
                    isHomePage ? "text-offWhite" : "text-burgundy"
                  }`}
                />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        <div
          className={`md:hidden transition-all duration-300 overflow-hidden ${
            isMenuOpen
              ? `max-h-64 opacity-100 mt-4 rounded-lg bg-offWhite`
              : "max-h-0 opacity-0"
          }`}
        >
          <div className="py-6 px-4 space-y-6">
            <button
              onClick={handleNavigation("/events")}
              className={`block w-full text-left ${getNavLinkClass("/events")}`}
              aria-current={isActive("/events") ? "page" : undefined}
            >
              {t("navigation.events")}
            </button>
            <button
              onClick={handleNavigation("/about")}
              className={`block w-full text-left ${getNavLinkClass("/about")}`}
              aria-current={isActive("/about") ? "page" : undefined}
            >
              {t("navigation.about")}
            </button>
            <button
              onClick={handleNavigation("/partners")}
              className={`block w-full text-left ${getNavLinkClass("/partners")}`}
              aria-current={isActive("/partners") ? "page" : undefined}
            >
              {t("navigation.partners")}
            </button>
            <button
              onClick={handleNavigation("/contact")}
              className={`block w-full text-left ${getNavLinkClass("/contact")}`}
              aria-current={isActive("/contact") ? "page" : undefined}
            >
              {t("navigation.contact")}
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}

export default Navigation;
