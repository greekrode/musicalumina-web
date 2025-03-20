import { Music, Award, Users, Heart } from "lucide-react";

function AboutPage() {
  return (
    <div className="pt-20 pb-12 bg-[#FFFFF0]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-4xl font-playfair text-[#808080] mb-8">
            About Musica Lumina
          </h1>
          <p className="text-lg text-[#808080]/80 max-w-2xl mx-auto mt-5">
            Founded in Mar 2024, by a group of passionate musicians and
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
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
          <div className="bg-white p-6 rounded-lg shadow-lg text-center">
            <Music className="h-8 w-8 text-[#CFB53B] mx-auto mb-4" />
            <h3 className="text-xl font-playfair text-[#808080] mb-2">
              Excellence
            </h3>
            <p className="text-[#808080]/80">
              Maintaining the highest standards in musical education and
              performance
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-lg text-center">
            <Award className="h-8 w-8 text-[#CFB53B] mx-auto mb-4" />
            <h3 className="text-xl font-playfair text-[#808080] mb-2">
              Innovation
            </h3>
            <p className="text-[#808080]/80">
              Embracing new approaches to music education and performance
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-lg text-center">
            <Users className="h-8 w-8 text-[#CFB53B] mx-auto mb-4" />
            <h3 className="text-xl font-playfair text-[#808080] mb-2">
              Community
            </h3>
            <p className="text-[#808080]/80">
              Building a supportive network of musicians, educators, and
              enthusiasts
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-lg text-center">
            <Heart className="h-8 w-8 text-[#CFB53B] mx-auto mb-4" />
            <h3 className="text-xl font-playfair text-[#808080] mb-2">
              Passion
            </h3>
            <p className="text-[#808080]/80">
              Inspiring a lifelong love for music in every participant
            </p>
          </div>
        </div>

        {/* Team */}
        {/* <div className="bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-2xl font-playfair text-[#808080] mb-6">
            Our Team
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <img
                src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80"
                alt="Sarah Chen"
                className="w-32 h-32 rounded-full mx-auto mb-4 object-cover"
              />
              <h3 className="text-xl font-playfair text-[#808080]">
                Sarah Chen
              </h3>
              <p className="text-[#CFB53B] font-medium">Artistic Director</p>
            </div>
            <div className="text-center">
              <img
                src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80"
                alt="David Mueller"
                className="w-32 h-32 rounded-full mx-auto mb-4 object-cover"
              />
              <h3 className="text-xl font-playfair text-[#808080]">
                David Mueller
              </h3>
              <p className="text-[#CFB53B] font-medium">Educational Director</p>
            </div>
            <div className="text-center">
              <img
                src="https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80"
                alt="Maria Rodriguez"
                className="w-32 h-32 rounded-full mx-auto mb-4 object-cover"
              />
              <h3 className="text-xl font-playfair text-[#808080]">
                Maria Rodriguez
              </h3>
              <p className="text-[#CFB53B] font-medium">Competition Director</p>
            </div>
          </div>
        </div> */}
      </div>
    </div>
  );
}

export default AboutPage;
