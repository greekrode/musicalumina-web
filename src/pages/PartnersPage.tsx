import heroBg from "../assets/about-hero-bg.webp";
import gopcLogo from "../assets/gopc.png";
import lomlOneLogo from "../assets/loml_1.png";
import lomlTwoLogo from "../assets/loml_2.png";
import vipcfLogo from "../assets/vipcf.png";
import LoadingSpinner from "../components/LoadingSpinner";
import { useImagePreloader } from "../hooks/useImagePreloader";
import { usePageTitle } from "../hooks/usePageTitle";
import { useLanguage } from "../lib/LanguageContext";

function PartnersPage() {
  const { t } = useLanguage();
  usePageTitle(t("partners.title"));
  const isLoading = useImagePreloader(heroBg);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FFFFF0]">
        <LoadingSpinner message={t("loading.message")} />
      </div>
    );
  }

  return (
    <div className="min-h-screen animate-fadeIn bg-[#FFFFF0]">
      {/* Hero Section */}
      <section className="relative h-[40vh]">
        <div className="absolute inset-0">
          <img
            src={heroBg}
            alt="Partners collaboration background"
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-black/70" />
        </div>
        <div className="relative mx-auto flex h-full max-w-7xl items-center px-4 sm:px-6 lg:px-8">
          <div className="w-full text-center">
            <h1 className="mb-4 font-playfair text-4xl text-[#FFFFF0] md:text-5xl">
              {t("partners.title")}
            </h1>
            <p className="text-xl text-[#F7E7CE]">{t("partners.subtitle")}</p>
          </div>
        </div>
      </section>

      {/* Partners Section */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mt-16 space-y-16">
            <div className="flex flex-col items-center justify-center gap-10 md:flex-row">
              <a
                href="http://loml.org.uk/"
                target="_blank"
                rel="noopener noreferrer"
                className="block group focus-visible:outline-none"
              >
                <div className="flex h-32 w-32 cursor-pointer items-center justify-center rounded-lg bg-charcoal p-6 shadow-lg transition-[transform,box-shadow] motion-reduce:transition-none duration-300 hover:shadow-xl motion-safe:hover:scale-110 motion-safe:active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marigold group-focus-visible:ring-2 group-focus-visible:ring-marigold group-focus-visible:outline-none md:h-40 md:w-40 lg:h-48 lg:w-48">
                  <img
                    src={lomlOneLogo}
                    alt="Legacy of Music Learning logo"
                    className="h-full w-full object-contain"
                    loading="lazy"
                  />
                </div>
              </a>
              <a
                href="http://loml.org.uk/"
                target="_blank"
                rel="noopener noreferrer"
                className="block group focus-visible:outline-none"
              >
                <div className="flex h-32 w-32 cursor-pointer items-center justify-center rounded-lg bg-charcoal p-6 shadow-lg transition-[transform,box-shadow] motion-reduce:transition-none duration-300 hover:shadow-xl motion-safe:hover:scale-110 motion-safe:active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marigold group-focus-visible:ring-2 group-focus-visible:ring-marigold group-focus-visible:outline-none md:h-40 md:w-40 lg:h-48 lg:w-48">
                  <img
                    src={lomlTwoLogo}
                    alt="Legacy of Music Learning emblem"
                    className="h-full w-full object-contain"
                    loading="lazy"
                  />
                </div>
              </a>
            </div>

            <div className="flex flex-col items-center gap-12">
              <a
                href="https://gopc.vn/en"
                target="_blank"
                rel="noopener noreferrer"
                className="block group focus-visible:outline-none"
              >
                <div className="flex w-full max-w-[20rem] cursor-pointer items-center justify-center rounded-lg bg-charcoal p-8 shadow-lg transition-[transform,box-shadow] motion-reduce:transition-none duration-300 hover:shadow-xl motion-safe:hover:scale-105 motion-safe:active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marigold group-focus-visible:ring-2 group-focus-visible:ring-marigold group-focus-visible:outline-none md:max-w-[24rem] lg:max-w-[28rem]">
                  <img
                    src={gopcLogo}
                    alt="Gathering of Pastors and Churches logo"
                    className="w-full object-contain"
                    loading="lazy"
                  />
                </div>
              </a>
              <div className="flex w-full max-w-[20rem] items-center justify-center rounded-lg bg-charcoal p-8 shadow-lg transition-[transform,box-shadow] motion-reduce:transition-none duration-300 hover:shadow-xl motion-safe:hover:scale-[1.02] md:max-w-[24rem] lg:max-w-[28rem]">
                <img
                  src={vipcfLogo}
                  alt="Valley International Pastors Christian Fellowship logo"
                  className="w-full object-contain"
                  loading="lazy"
                />
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default PartnersPage;
