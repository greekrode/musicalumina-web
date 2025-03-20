import { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import logo from "../assets/ML-LogoColor.png";

function Navigation() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

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
    return location.pathname === path;
  };

  const isHomePage = location.pathname === "/";

  const getNavLinkClass = (path: string) => {
    const isCurrentPage = isActive(path);
    if (isHomePage) {
      return `text-offWhite hover:text-[#CFB53B] transition-colors duration-300 ${
        isCurrentPage ? "text-[#CFB53B]" : ""
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex justify-between items-center">
          <Link to="/" className="flex items-center space-x-2 hover-scale">
            <img src={logo} alt="MusicaLumina Logo" className="h-10 w-auto" />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex space-x-8">
            <button
              onClick={handleNavigation("/events")}
              className={getNavLinkClass("/events")}
            >
              Events
            </button>
            <button
              onClick={handleNavigation("/about")}
              className={getNavLinkClass("/about")}
            >
              About
            </button>
            <button
              onClick={handleNavigation("/contact")}
              className={getNavLinkClass("/contact")}
            >
              Contact
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2"
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

        {/* Mobile Menu */}
        <div
          className={`md:hidden transition-all duration-300 overflow-hidden ${
            isMenuOpen
              ? `max-h-64 opacity-100 mt-4 rounded-lg `
              : "max-h-0 opacity-0"
          }`}
        >
          <div className="py-6 px-4 space-y-6">
            <button
              onClick={handleNavigation("/events")}
              className={`block w-full text-left ${
                isHomePage
                  ? getNavLinkClass("/events").replace(
                      "text-burgundy",
                      "text-offWhite"
                    )
                  : getNavLinkClass("/events")
              }`}
            >
              Events
            </button>
            <button
              onClick={handleNavigation("/about")}
              className={`block w-full text-left ${
                isHomePage
                  ? getNavLinkClass("/about").replace(
                      "text-burgundy",
                      "text-offWhite"
                    )
                  : getNavLinkClass("/about")
              }`}
            >
              About
            </button>
            <button
              onClick={handleNavigation("/contact")}
              className={`block w-full text-left ${
                isHomePage
                  ? getNavLinkClass("/contact").replace(
                      "text-burgundy",
                      "text-offWhite"
                    )
                  : getNavLinkClass("/contact")
              }`}
            >
              Contact
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}

export default Navigation;
