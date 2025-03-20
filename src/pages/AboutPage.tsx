import { Music, Award, Users, Heart } from 'lucide-react';

function AboutPage() {
  return (
    <div className="pt-20 pb-12 bg-[#FFFFF0]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-4xl font-playfair text-[#808080] mb-4">About MusicaLumina</h1>
          <p className="text-lg text-[#808080]/80 max-w-2xl mx-auto">
            Celebrating 25 years of musical excellence and nurturing young talents in Indonesia
          </p>
        </div>

        {/* Mission & Vision */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-12">
          <div className="grid md:grid-cols-2 gap-12">
            <div>
              <h2 className="text-2xl font-playfair text-[#808080] mb-4">Our Mission</h2>
              <p className="text-[#808080]/80">
                To discover, nurture, and promote exceptional musical talent while fostering a deep appreciation
                for classical music in Indonesia. We strive to create opportunities for young musicians to
                showcase their abilities and grow as artists.
              </p>
            </div>
            <div>
              <h2 className="text-2xl font-playfair text-[#808080] mb-4">Our Vision</h2>
              <p className="text-[#808080]/80">
                To be the premier platform for musical excellence in Southeast Asia, recognized globally
                for our commitment to artistic development and cultural enrichment through music education
                and performance.
              </p>
            </div>
          </div>
        </div>

        {/* Core Values */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
          <div className="bg-white p-6 rounded-lg shadow-lg text-center">
            <Music className="h-8 w-8 text-[#CFB53B] mx-auto mb-4" />
            <h3 className="text-xl font-playfair text-[#808080] mb-2">Excellence</h3>
            <p className="text-[#808080]/80">
              Maintaining the highest standards in musical education and performance
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-lg text-center">
            <Award className="h-8 w-8 text-[#CFB53B] mx-auto mb-4" />
            <h3 className="text-xl font-playfair text-[#808080] mb-2">Innovation</h3>
            <p className="text-[#808080]/80">
              Embracing new approaches to music education and performance
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-lg text-center">
            <Users className="h-8 w-8 text-[#CFB53B] mx-auto mb-4" />
            <h3 className="text-xl font-playfair text-[#808080] mb-2">Community</h3>
            <p className="text-[#808080]/80">
              Building a supportive network of musicians, educators, and enthusiasts
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-lg text-center">
            <Heart className="h-8 w-8 text-[#CFB53B] mx-auto mb-4" />
            <h3 className="text-xl font-playfair text-[#808080] mb-2">Passion</h3>
            <p className="text-[#808080]/80">
              Inspiring a lifelong love for music in every participant
            </p>
          </div>
        </div>

        {/* History */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-12">
          <h2 className="text-2xl font-playfair text-[#808080] mb-6">Our History</h2>
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-playfair text-[#808080] mb-2">1999 - The Beginning</h3>
              <p className="text-[#808080]/80">
                Founded by a group of passionate musicians and educators with a vision to elevate
                Indonesia's classical music scene.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-playfair text-[#808080] mb-2">2005 - Growing Impact</h3>
              <p className="text-[#808080]/80">
                Expanded our programs to include international competitions and masterclasses,
                attracting participants from across Southeast Asia.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-playfair text-[#808080] mb-2">2015 - Innovation</h3>
              <p className="text-[#808080]/80">
                Introduced new competition categories and educational programs to adapt to the
                evolving musical landscape.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-playfair text-[#808080] mb-2">2024 - Present Day</h3>
              <p className="text-[#808080]/80">
                Celebrating 25 years of excellence with expanded programs and a growing community
                of alumni making their mark in the global music scene.
              </p>
            </div>
          </div>
        </div>

        {/* Team */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-2xl font-playfair text-[#808080] mb-6">Our Team</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <img
                src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80"
                alt="Sarah Chen"
                className="w-32 h-32 rounded-full mx-auto mb-4 object-cover"
              />
              <h3 className="text-xl font-playfair text-[#808080]">Sarah Chen</h3>
              <p className="text-[#CFB53B] font-medium">Artistic Director</p>
            </div>
            <div className="text-center">
              <img
                src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80"
                alt="David Mueller"
                className="w-32 h-32 rounded-full mx-auto mb-4 object-cover"
              />
              <h3 className="text-xl font-playfair text-[#808080]">David Mueller</h3>
              <p className="text-[#CFB53B] font-medium">Educational Director</p>
            </div>
            <div className="text-center">
              <img
                src="https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80"
                alt="Maria Rodriguez"
                className="w-32 h-32 rounded-full mx-auto mb-4 object-cover"
              />
              <h3 className="text-xl font-playfair text-[#808080]">Maria Rodriguez</h3>
              <p className="text-[#CFB53B] font-medium">Competition Director</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AboutPage;