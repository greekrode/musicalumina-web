import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import heroBg from "../assets/hero-bg.jpg";
import { useLatestEvent } from "../hooks/useLatestEvent";
import { usePageTitle } from "../hooks/usePageTitle";
import LoadingSpinner from "../components/LoadingSpinner";
import { useLanguage } from "../lib/LanguageContext";

function HomePage() {
  const { t } = useLanguage();
  usePageTitle(t("home.title"));
  const navigate = useNavigate();
  const { event, loading } = useLatestEvent();

  const handleExploreClick = () => {
    navigate("/events");
  };

  const handleEventClick = (eventId: string) => {
    navigate(`/event/${eventId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FFFFF0]">
        <LoadingSpinner message={t("home.loading")} />
      </div>
    );
  }

  return (
    <div className="min-h-screen animate-fadeIn">
      {/* Hero Section */}
      <section className="h-screen">
        <div className="absolute inset-0">
          <img
            src={heroBg}
            alt="Piano performance"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/70"></div>
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center">
          <div className="text-center md:text-left">
            <h1 className="text-4xl md:text-6xl font-playfair text-[#FFFFF0] mb-4 whitespace-pre-line">
              {t("home.mainHeading")}
            </h1>
            <p className="text-xl text-[#F7E7CE] mb-8">
              {t("home.subtitle")}
            </p>
            <div className="space-y-4">
              {event && (
                <button
                  onClick={() => handleEventClick(event.id)}
                  className="bg-marigold/60 text-[#FFFFF0] px-8 py-3 rounded-md hover:bg-marigold/50 transition-colors flex items-center justify-center md:justify-start w-full md:w-auto mb-4"
                >
                  <span className="flex-1 md:flex-none">
                    {t("home.latestEvent").replace("{title}", event.title)}
                  </span>
                  <ArrowRight className="h-5 w-5 ml-2" />
                </button>
              )}
              <button
                onClick={handleExploreClick}
                className="bg-marigold text-[#FFFFF0] px-8 py-3 rounded-md hover:bg-marigold/90 transition-colors w-full md:w-auto"
              >
                {t("home.exploreEvents")}
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default HomePage;
