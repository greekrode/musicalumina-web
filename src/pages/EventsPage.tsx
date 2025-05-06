import EventList from "../components/EventList";
import { usePageTitle } from "../hooks/usePageTitle";
import { useImagePreloader } from "../hooks/useImagePreloader";
import heroBg from "../assets/hero-bg.webp";
import LoadingSpinner from "../components/LoadingSpinner";
import { useEvents } from "../hooks/useEvents";
import { useLanguage } from "../lib/LanguageContext";

function EventsPage() {
  const { t } = useLanguage();
  usePageTitle(t("events.title"));
  const { loading: eventsLoading } = useEvents();
  const isLoading = useImagePreloader(heroBg, eventsLoading);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FFFFF0]">
        <LoadingSpinner message={t("events.loading")} />
      </div>
    );
  }

  return (
    <div className="min-h-screen animate-fadeIn">
      {/* Small Hero Section */}
      <section className="relative h-[40vh]">
        <div className="absolute inset-0">
          <img
            src={heroBg}
            alt="Piano performance"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/70"></div>
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center">
          <div className="text-center w-full">
            <h1 className="text-4xl md:text-5xl font-playfair text-[#FFFFF0] mb-4">
              {t("events.title")}
            </h1>
            <p className="text-xl text-[#F7E7CE]">
              {t("events.subtitle")}
            </p>
          </div>
        </div>
      </section>

      {/* Upcoming Events */}
      <section className="py-20 bg-[#F7E7CE]/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-playfair text-[#808080] mb-12 text-center">
            {t("events.upcomingEvents")}
          </h2>
          <EventList status="upcoming" />
        </div>
      </section>

      {/* Past Events */}
      <section className="py-20 bg-[#FFFFF0]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-playfair text-[#808080] mb-12 text-center">
            {t("events.pastEvents")}
          </h2>
          <EventList status="completed" />
        </div>
      </section>
    </div>
  );
}

export default EventsPage;
