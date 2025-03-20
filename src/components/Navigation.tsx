import { useState, useEffect } from 'react';
import { Music, Menu, X } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

function Navigation() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setIsMenuOpen(false);
  }, [location]);

  const handleNavigation = (path: string, section?: string) => () => {
    if (section) {
      if (location.pathname === '/') {
        const element = document.getElementById(section);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      } else {
        navigate('/', { state: { scrollToSection: section } });
      }
    } else {
      navigate(path);
    }
    setIsMenuOpen(false);
  };

  return (
    <nav 
      className={`fixed w-full z-50 transition-all duration-300 ${
        isScrolled ? 'bg-offWhite shadow-md' : 'bg-offWhite/90 backdrop-blur-sm'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex justify-between items-center">
          <Link to="/" className="flex items-center space-x-2 hover-scale">
            <Music className="h-6 w-6 text-marigold" />
            <span className="text-xl font-playfair text-burgundy">MusicaLumina</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex space-x-8">
            <button onClick={handleNavigation('/')} className="nav-link">Home</button>
            <button onClick={handleNavigation('/', 'upcoming-events')} className="nav-link">Events</button>
            <button onClick={handleNavigation('/about')} className="nav-link">About</button>
            <button onClick={handleNavigation('/contact')} className="nav-link">Contact</button>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2"
            aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={isMenuOpen}
          >
            {isMenuOpen ? (
              <X className="h-6 w-6 text-burgundy" />
            ) : (
              <Menu className="h-6 w-6 text-burgundy" />
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        <div
          className={`md:hidden transition-all duration-300 overflow-hidden ${
            isMenuOpen ? 'max-h-48 opacity-100' : 'max-h-0 opacity-0'
          }`}
        >
          <div className="py-4 space-y-4">
            <button onClick={handleNavigation('/')} className="block w-full text-left nav-link">Home</button>
            <button onClick={handleNavigation('/', 'upcoming-events')} className="block w-full text-left nav-link">Events</button>
            <button onClick={handleNavigation('/about')} className="block w-full text-left nav-link">About</button>
            <button onClick={handleNavigation('/contact')} className="block w-full text-left nav-link">Contact</button>
          </div>
        </div>
      </div>
    </nav>
  );
}

export default Navigation;