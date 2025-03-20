import EventList from "../components/EventList";

function HomePage() {
  const handleExploreClick = () => {
    const eventsSection = document.getElementById("upcoming-events");
    if (eventsSection) {
      eventsSection.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="animate-fadeIn">
      {/* Hero Section */}
      <section id="hero" className="relative h-screen">
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?auto=format&fit=crop&q=80"
            alt="Piano keys"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/50"></div>
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center">
          <div className="text-center md:text-left">
            <h1 className="text-4xl md:text-6xl font-playfair text-[#FFFFF0] mb-4">
              Where Musical Excellence
              <br />
              Takes Center Stage
            </h1>
            <p className="text-xl text-[#F7E7CE] mb-8">
              Celebrating the Virtuosity of Tomorrow's Musicians
            </p>
            <button
              onClick={handleExploreClick}
              className="bg-[#CFB53B] text-[#FFFFF0] px-8 py-3 rounded-md hover:bg-[#CFB53B]/90 transition-colors"
            >
              Explore Events
            </button>
          </div>
        </div>
      </section>

      {/* Upcoming Events */}
      <section id="upcoming-events" className="py-20 bg-[#F7E7CE]/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-playfair text-[#808080] mb-12 text-center">
            Upcoming Events
          </h2>
          <EventList status="upcoming" />
        </div>
      </section>

      {/* Past Events */}
      <section id="past-events" className="py-20 bg-[#FFFFF0]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-playfair text-[#808080] mb-12 text-center">
            Past Events
          </h2>
          <EventList status="completed" />
        </div>
      </section>
    </div>
  );
}

export default HomePage;
