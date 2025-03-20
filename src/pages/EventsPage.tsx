import EventList from "../components/EventList";
import { usePageTitle } from "../hooks/usePageTitle";
import heroBg from "../assets/hero-bg.jpg";

function EventsPage() {
  usePageTitle("Events");

  return (
    <div className="min-h-screen animate-fadeIn">
      {/* Small Hero Section */}
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
              Our Events
            </h1>
            <p className="text-xl text-[#F7E7CE]">
              Discover upcoming events and past achievements
            </p>
          </div>
        </div>
      </section>

      {/* Upcoming Events */}
      <section className="py-20 bg-[#F7E7CE]/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-playfair text-[#808080] mb-12 text-center">
            Upcoming Events
          </h2>
          <EventList status="upcoming" />
        </div>
      </section>

      {/* Past Events */}
      <section className="py-20 bg-[#FFFFF0]">
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

export default EventsPage;
