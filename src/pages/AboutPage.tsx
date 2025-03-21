import { Award, Heart, Music } from "lucide-react";
import heroBg from "../assets/about-hero-bg.jpg";
import LoadingSpinner from "../components/LoadingSpinner";
import { useImagePreloader } from "../hooks/useImagePreloader";
import { usePageTitle } from "../hooks/usePageTitle";

function AboutPage() {
  usePageTitle("About");
  const isLoading = useImagePreloader(heroBg);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FFFFF0]">
        <LoadingSpinner message="Loading about page..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen animate-fadeIn">
      {/* Hero Section */}
      <section className="relative h-[40vh]">
        <div className="absolute inset-0">
          <img
            src={heroBg}
            alt="Piano keys"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/70"></div>
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center">
          <div className="text-center w-full">
            <h1 className="text-4xl md:text-5xl font-playfair text-[#FFFFF0] mb-4">
              About Us
            </h1>
            <p className="text-xl text-[#F7E7CE]">
              Discover our story and mission
            </p>
          </div>
        </div>
      </section>

      <div className="py-20 bg-[#FFFFF0]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* About Content */}
          <div className="text-center mb-16">
            <p className="text-lg text-[#808080]/80 max-w-2xl mx-auto">
              Founded in March 2024, by a group of passionate musicians and
              educators.
              <br />
              <br />
              Musica Lumina is not just a brand; it is a celestial symphony, a
              harmonious fusion of melody and radiance. Rooted in the timeless
              essence of Latin, Musica signifies the divine art of music, while
              Lumina embodies the ethereal glow of illumination.
              <br />
              <br />
              Together, they create a luminous journey where every note blooms
              like delicate flowers under a moonlit sky, weaving an invisible
              thread that binds hearts, cultures, and generations. Musica Lumina
              invites you to a world where music transcends boundaries, stirring
              emotions and kindling inspiration, guiding us through the darkness
              with its radiant glow.
            </p>
          </div>

          {/* Core Values */}
          <div className="grid grid-cols-3 gap-8 mb-12">
            <div className="bg-white p-6 rounded-lg shadow-lg text-center">
              <Music className="h-8 w-8 text-[#CFB53B] mx-auto mb-4" />
              <h3 className="text-xl font-playfair text-[#808080] mb-2">
                Excellence
              </h3>
              <p className="text-[#808080]/80">
                Setting the highest standards in musical education and
                competition
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-lg text-center">
              <Award className="h-8 w-8 text-[#CFB53B] mx-auto mb-4" />
              <h3 className="text-xl font-playfair text-[#808080] mb-2">
                Innovation
              </h3>
              <p className="text-[#808080]/80">
                Pioneering fresh approaches to musical development and
                performance
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-lg text-center">
              <Heart className="h-8 w-8 text-[#CFB53B] mx-auto mb-4" />
              <h3 className="text-xl font-playfair text-[#808080] mb-2">
                Passion
              </h3>
              <p className="text-[#808080]/80">
                Nurturing the love of music in every student and participant
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AboutPage;
