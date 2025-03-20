import { Music, Facebook, Instagram, Youtube } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

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
              <Music className="h-6 w-6 text-marigold" />
              <span className="text-xl font-playfair">MusicaLumina</span>
            </div>
            <p className="text-sm text-offWhite/80 font-light">
              Celebrating musical excellence and nurturing young talents since 1999.
            </p>
          </div>
          <div>
            <h3 className="text-lg font-playfair mb-4 text-offWhite/80">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <a 
                  href="#" 
                  onClick={handleNavigation('/')}
                  className="text-offWhite/80 hover:text-marigold transition-colors duration-300"
                >
                  Home
                </a>
              </li>
              <li>
                <a 
                  href="#" 
                  onClick={handleNavigation('/about')}
                  className="text-offWhite/80 hover:text-marigold transition-colors duration-300"
                >
                  About
                </a>
              </li>
              <li>
                <a 
                  href="#" 
                  onClick={handleNavigation('/contact')}
                  className="text-offWhite/80 hover:text-marigold transition-colors duration-300"
                >
                  Contact
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-playfair mb-4 text-offWhite/80">Follow Us</h3>
            <div className="flex space-x-6">
              <a 
                href="#" 
                className="text-offWhite/80 hover:text-marigold transition-colors duration-300"
                aria-label="Facebook"
              >
                <Facebook className="h-6 w-6" />
              </a>
              <a 
                href="#" 
                className="text-offWhite/80 hover:text-marigold transition-colors duration-300"
                aria-label="Instagram"
              >
                <Instagram className="h-6 w-6" />
              </a>
              <a 
                href="#" 
                className="text-offWhite/80 hover:text-marigold transition-colors duration-300"
                aria-label="YouTube"
              >
                <Youtube className="h-6 w-6" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;