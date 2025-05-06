import { Award, Heart, Music } from "lucide-react";
import { usePageTitle } from "../hooks/usePageTitle";
import { useImagePreloader } from "../hooks/useImagePreloader";
import heroBg from "../assets/about-hero-bg.webp";
import LoadingSpinner from "../components/LoadingSpinner";
import { useLanguage } from "../lib/LanguageContext";

function AboutPage() {
  const { t } = useLanguage();
  usePageTitle(t("about.title"));
  const isLoading = useImagePreloader(heroBg);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FFFFF0]">
        <LoadingSpinner message={t("loading.message")} />
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
            alt="Piano performance"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/70"></div>
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center">
          <div className="text-center w-full">
            <h1 className="text-4xl md:text-5xl font-playfair text-[#FFFFF0] mb-4">
              {t("about.title")}
            </h1>
            <p className="text-xl text-[#F7E7CE]">{t("about.subtitle")}</p>
          </div>
        </div>
      </section>

      {/* About Content */}
      <section className="py-20 bg-[#FFFFF0]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="prose prose-lg text-[#808080] mx-auto">
            {t("about.description").split("\n").map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </div>
        </div>
      </section>

      {/* Core Values */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-playfair text-[#808080] text-center mb-16">
            {t("about.coreValues.title")}
          </h2>
          <div className="grid md:grid-cols-3 gap-12">
            {/* Excellence */}
            <div className="bg-[#FFFFF0] p-6 rounded-lg shadow-lg text-center">
              <Music className="h-8 w-8 text-[#CFB53B] mx-auto mb-4" />
              <h3 className="text-xl font-playfair text-[#808080] mb-2">
                {t("about.coreValues.excellence.title")}
              </h3>
              <p className="text-charcoal/50">
                {t("about.coreValues.excellence.description")}
              </p>
            </div>

            {/* Innovation */}
            <div className="bg-[#FFFFF0] p-6 rounded-lg shadow-lg text-center">
              <Award className="h-8 w-8 text-[#CFB53B] mx-auto mb-4" />
              <h3 className="text-xl font-playfair text-[#808080] mb-2">
                {t("about.coreValues.innovation.title")}
              </h3>
              <p className="text-charcoal/50">
                {t("about.coreValues.innovation.description")}
              </p>
            </div>

            {/* Passion */}
            <div className="bg-[#FFFFF0] p-6 rounded-lg shadow-lg text-center">
              <Heart className="h-8 w-8 text-[#CFB53B] mx-auto mb-4" />
              <h3 className="text-xl font-playfair text-[#808080] mb-2">
                {t("about.coreValues.passion.title")}
              </h3>
              <p className="text-charcoal/50">
                {t("about.coreValues.passion.description")}
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default AboutPage;
