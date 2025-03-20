import { Facebook, Instagram, Youtube } from "lucide-react";
import { useNavigate } from "react-router-dom";
import logo from "../assets/ML-LogoColor.png";

function Footer() {
  const navigate = useNavigate();

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
            <h2 className="text-lg font-playfair mb-4 text-offWhite/90">
              Quick Links
            </h2>
            <ul className="space-y-2">
              <li>
                <a
                  href="#"
                  onClick={handleNavigation("/")}
                  className="text-offWhite/80 hover:text-marigold transition-colors duration-300"
                >
                  Home
                </a>
              </li>
              <li>
                <a
                  href="#"
                  onClick={handleNavigation("/events")}
                  className="text-offWhite/80 hover:text-marigold transition-colors duration-300"
                >
                  Events
                </a>
              </li>
              <li>
                <a
                  href="#"
                  onClick={handleNavigation("/about")}
                  className="text-offWhite/80 hover:text-marigold transition-colors duration-300"
                >
                  About
                </a>
              </li>
              <li>
                <a
                  href="#"
                  onClick={handleNavigation("/contact")}
                  className="text-offWhite/80 hover:text-marigold transition-colors duration-300"
                >
                  Contact
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-playfair mb-4 text-offWhite/80">
              Follow Us
            </h3>
            <div className="flex space-x-6">
              <a
                href="https://www.instagram.com/musicalumina/"
                className="text-offWhite/80 hover:text-marigold transition-colors duration-300"
                aria-label="Instagram"
              >
                <Instagram className="h-6 w-6" />
              </a>
            </div>
          </div>
        </div>
        <div className="mt-8">
          <p className="text-sm text-offWhite/80 font-light text-center">
            Copyright &copy; {new Date().getFullYear()} MusicaLumina. All rights
            reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
