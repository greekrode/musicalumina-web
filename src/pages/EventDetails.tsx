import { useState, Suspense } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Calendar,
  MapPin,
  ArrowLeft,
  BookOpen,
  Trophy,
  Users,
  Award,
  FileDown,
} from "lucide-react";
import TermsModal from "../components/TermsModal";
import RegistrationModal from "../components/RegistrationModal";
import InvitationPasswordModal from "../components/InvitationPasswordModal";
import { useEvent } from "../hooks/useEvent";
import {
  formatDateWithLocale,
  formatMultipleDatesWithLocale,
  translateDuration,
  translateAgeRequirement,
} from "../lib/utils";
import LoadingSpinner from "../components/LoadingSpinner";
import type { Database } from "../lib/database.types";
import type { EventType } from "../lib/database.types";
import { usePageTitle } from "../hooks/usePageTitle";
import type { PostgrestError } from "@supabase/supabase-js";
import { useRepertoirePdf } from "../hooks/useRepertoirePdf";
import { useLanguage } from "../lib/LanguageContext";

type EventCategory = Database["public"]["Tables"]["event_categories"]["Row"] & {
  event_subcategories: (Database["public"]["Tables"]["event_subcategories"]["Row"] & {
    repertoire?: string[];
    foreign_registration_fee?: Array<{ country: string; fee: string }>;
    foreign_final_registration_fee?: Array<{ country: string; fee: string }>;
  })[];
  repertoire?: string[];
  prizes: Array<{
    id: string;
    title: string;
    amount?: number;
    description?: string;
  }>;
  global_prizes: Array<{
    id: string;
    title: string;
    amount?: number;
    description?: string;
  }>;
};

type Event = Database["public"]["Tables"]["events"]["Row"] & {
  event_categories: EventCategory[];
  event_jury: EventJuror[];
  registration_count?: number;
};

type EventJuror = Omit<
  Database["public"]["Tables"]["event_jury"]["Row"],
  "credentials"
> & {
  credentials: Record<string, string> | null;
};

type JuryPanelProps = {
  juryMembers: EventJuror[];
};

type EventCategoriesProps = {
  categories: EventCategory[];
};

type CategoryCardProps = {
  category: EventCategory;
};

const CategoryCard = ({ category }: CategoryCardProps) => {
  const { t, language } = useLanguage();
  const { pdfUrl } = useRepertoirePdf(category.id);

  return (
    <div className="bg-[#F7E7CE]/30 p-6 rounded-lg">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
        <h2 className="text-xl font-playfair text-black">{category.name}</h2>
        {pdfUrl && (
          <a
            href={pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center px-3 py-1.5 text-sm bg-marigold text-white rounded-md hover:bg-marigold/90 transition-colors w-fit"
          >
            <FileDown className="h-3.5 w-3.5 mr-1.5" />
            {t("eventDetails.downloadRepertoire")}
          </a>
        )}
      </div>
      {category.description && (
        <div
          className="text-black/80 mb-6 text-sm"
          dangerouslySetInnerHTML={{ __html: category.description }}
        />
      )}
      {category.repertoire &&
        Array.isArray(category.repertoire) &&
        category.repertoire.length > 0 && (
          <div className="mb-6">
            <p className="text-sm font-medium text-black mb-2">
              {t("eventDetails.categoryRepertoire")}:
            </p>
            <div
              className={`space-y-1 ${
                category.repertoire.length > 3
                  ? "md:space-y-0 md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-4"
                  : ""
              }`}
            >
              {category.repertoire.length <= 3 ? (
                <ul className="list-disc list-inside text-sm text-black/80">
                  {(category.repertoire as string[]).map((rep, i) => (
                    <li key={i} className="text-sm mb-1">
                      {rep}
                    </li>
                  ))}
                </ul>
              ) : (
                Array.from({
                  length: Math.min(
                    3,
                    Math.ceil(category.repertoire.length / 3)
                  ),
                }).map((_, colIndex) => (
                  <ul
                    key={colIndex}
                    className="list-disc list-inside text-sm text-black/80"
                  >
                    {(category.repertoire as string[])
                      .filter((_, i) => i % 3 === colIndex)
                      .map((rep, i) => (
                        <li key={i} className="text-sm mb-1">
                          {rep}
                        </li>
                      ))}
                  </ul>
                ))
              )}
            </div>
          </div>
        )}
      <div className="grid md:grid-cols-3 gap-4">
        {category.event_subcategories.map((subCategory) => (
          <div
            key={subCategory.id}
            className="bg-white p-4 rounded-lg shadow-sm"
          >
            <h3 className="text-xl font-playfair text-black mb-3">
              {subCategory.name}
            </h3>
            <div className="space-y-3">
              <div
                className="text-black/80 text-sm"
                dangerouslySetInnerHTML={{
                  __html: subCategory.requirements || "",
                }}
              />

              <div>
                <p className="text-sm font-medium text-black">
                  {t("eventDetails.ageRequirement")}:
                </p>
                <p className="text-sm text-black/80">
                  {translateAgeRequirement(
                    subCategory.age_requirement,
                    language
                  )}
                </p>
              </div>
              <div>
                {subCategory.final_registration_fee ? (
                  <p className="text-sm font-medium text-black">
                    {t("eventDetails.prelimRegistrationFee")}:
                  </p>
                ) : (
                  <p className="text-sm font-medium text-black">
                    {t("eventDetails.registrationFee")}:
                  </p>
                )}
                <div className="space-y-2">
                  <p className="text-sm text-black/80">
                    IDR {subCategory.registration_fee.toLocaleString()}
                  </p>

                  {subCategory.final_registration_fee && (
                    <div>
                      <p className="text-sm font-medium text-black">
                        {t("eventDetails.finalRegistrationFee")}:
                      </p>
                      <p className="text-sm text-black/80">
                        IDR{" "}
                        {subCategory.final_registration_fee.toLocaleString()}
                      </p>
                    </div>
                  )}

                  {((subCategory.foreign_registration_fee &&
                    Array.isArray(subCategory.foreign_registration_fee) &&
                    subCategory.foreign_registration_fee.length > 0) ||
                    (subCategory.foreign_final_registration_fee &&
                      Array.isArray(
                        subCategory.foreign_final_registration_fee
                      ) &&
                      subCategory.foreign_final_registration_fee.length >
                        0)) && (
                    <div>
                      <p className="text-sm font-medium text-black mb-2">
                        {t("eventDetails.foreignRegistrationFees")}:
                      </p>
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                          <thead>
                            <tr className="border-b border-gray-200">
                              <th className="text-left py-2 px-3 font-medium text-black">
                                {t("eventDetails.country")}
                              </th>
                              {subCategory.foreign_registration_fee &&
                                Array.isArray(
                                  subCategory.foreign_registration_fee
                                ) &&
                                subCategory.foreign_registration_fee.length >
                                  0 && subCategory.final_registration_fee ? (
                                  <th className="text-left py-2 px-3 font-medium text-black">
                                    {t("eventDetails.prelimRegistrationFee")}
                                  </th>
                                ):(
                                  <th className="text-left py-2 px-3 font-medium text-black">
                                    {t("eventDetails.registrationFee")}
                                  </th>
                                )}
                              {subCategory.foreign_final_registration_fee &&
                                Array.isArray(
                                  subCategory.foreign_final_registration_fee
                                ) &&
                                subCategory.foreign_final_registration_fee
                                  .length > 0 && (
                                  <th className="text-left py-2 px-3 font-medium text-black">
                                    {t("eventDetails.finalRegistrationFee")}
                                  </th>
                                )}
                            </tr>
                          </thead>
                          <tbody>
                            {/* Create a combined list of all countries */}
                            {(() => {
                              const allCountries = new Set();
                              const regFees =
                                (subCategory.foreign_registration_fee as Array<{
                                  country: string;
                                  fee: string;
                                }>) || [];
                              const finalFees =
                                (subCategory.foreign_final_registration_fee as Array<{
                                  country: string;
                                  fee: string;
                                }>) || [];

                              regFees.forEach((fee) =>
                                allCountries.add(fee.country)
                              );
                              finalFees.forEach((fee) =>
                                allCountries.add(fee.country)
                              );

                              return Array.from(allCountries).map((country) => {
                                const regFee = regFees.find(
                                  (f) => f.country === country
                                );
                                const finalFee = finalFees.find(
                                  (f) => f.country === country
                                );

                                return (
                                  <tr
                                    key={country as string}
                                    className="border-b border-gray-100"
                                  >
                                    <td className="py-2 px-3 text-black/80">
                                      {country as string}
                                    </td>
                                    {subCategory.foreign_registration_fee &&
                                      Array.isArray(
                                        subCategory.foreign_registration_fee
                                      ) &&
                                      subCategory.foreign_registration_fee
                                        .length > 0 && (
                                        <td className="py-2 px-3 text-black/80">
                                          {regFee ? regFee.fee : "-"}
                                        </td>
                                      )}
                                    {subCategory.foreign_final_registration_fee &&
                                      Array.isArray(
                                        subCategory.foreign_final_registration_fee
                                      ) &&
                                      subCategory.foreign_final_registration_fee
                                        .length > 0 && (
                                        <td className="py-2 px-3 text-black/80">
                                          {finalFee ? finalFee.fee : "-"}
                                        </td>
                                      )}
                                  </tr>
                                );
                              });
                            })()}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              {subCategory.repertoire &&
                Array.isArray(subCategory.repertoire) &&
                subCategory.repertoire.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-black mb-2">
                      {t("eventDetails.repertoire")}:
                    </p>
                    <ul className="list-disc text-sm text-black/80 pl-5 space-y-2">
                      {(subCategory.repertoire as string[]).map((rep, i) => (
                        <li key={i} className="text-sm leading-relaxed">
                          <span className="pl-1">{rep}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              {subCategory.performance_duration && (
                <div>
                  <p className="text-sm font-medium text-black">
                    {t("eventDetails.duration")}:
                  </p>
                  <p className="text-sm text-black/80">
                    {translateDuration(
                      subCategory.performance_duration,
                      language
                    )}
                  </p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const EventCategories = ({ categories }: EventCategoriesProps) => (
  <div className="space-y-8">
    {categories.map((category) => (
      <CategoryCard key={category.id} category={category} />
    ))}
  </div>
);

type PrizesSectionProps = {
  categories: EventCategory[];
};

const PrizesSection = ({ categories }: PrizesSectionProps) => {
  const { t } = useLanguage();
  // Collect all global prizes from the first category (they're the same for all)
  const globalPrizes = categories[0]?.global_prizes || [];

  return (
    <div className="space-y-8">
      {/* Overall Prizes */}
      {globalPrizes.length > 0 && (
        <div className="bg-[#F7E7CE]/20 p-6 rounded-lg">
          <h3 className="text-xl font-playfair text-black mb-4">
            {t("eventDetails.overallPrizes")}
          </h3>
          <div className="grid md:grid-cols-2 gap-6">
            {globalPrizes.map((prize) => (
              <div key={prize.id} className="bg-white p-4 rounded-lg shadow-sm">
                <div className="flex items-start space-x-4">
                  <Award className="h-6 w-6 text-marigold mt-1" />
                  <div>
                    <h4 className="text-lg font-medium text-black">
                      {prize.title}
                    </h4>
                    {prize.amount && (
                      <p className="text-marigold font-medium mt-1">
                        IDR {prize.amount.toLocaleString()}
                      </p>
                    )}
                    {prize.description && (
                      <div
                        className="prose prose-sm mt-2 text-black/80"
                        dangerouslySetInnerHTML={{ __html: prize.description }}
                      />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Category Prizes */}
      {categories.map(
        (category) =>
          category.prizes &&
          category.prizes.length > 0 && (
            <div key={category.id} className="bg-[#F7E7CE]/20 p-6 rounded-lg">
              <h3 className="text-xl font-playfair text-black mb-4">
                {category.name} {t("eventDetails.prizes")}
              </h3>
              <div className="grid md:grid-cols-2 gap-6">
                {category.prizes.map((prize) => (
                  <div
                    key={prize.id}
                    className="bg-white p-4 rounded-lg shadow-sm"
                  >
                    <div className="flex items-start space-x-4">
                      <Award className="h-6 w-6 text-marigold mt-1" />
                      <div>
                        <h4 className="text-lg font-medium text-black">
                          {prize.title}
                        </h4>
                        {prize.amount && (
                          <p className="text-marigold font-medium mt-1">
                            IDR {prize.amount.toLocaleString()}
                          </p>
                        )}
                        {prize.description && (
                          <div
                            className="prose prose-sm mt-2 text-black/80"
                            dangerouslySetInnerHTML={{
                              __html: prize.description,
                            }}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
      )}
    </div>
  );
};

const JuryPanel = ({ juryMembers }: JuryPanelProps) => {
  return (
    <div className="grid md:grid-cols-2 gap-8">
      {[...juryMembers]
        .sort((a, b) => {
          const dateA = new Date(a.created_at);
          const dateB = new Date(b.created_at);
          return dateA.getTime() - dateB.getTime();
        })
        .map((juror) => (
          <div key={juror.id} className="bg-[#F7E7CE]/30 p-6 rounded-lg">
            <div className="flex flex-col items-center space-y-4">
              <img
                src={juror.avatar_url || ""}
                alt={juror.name}
                className="w-48 h-48 rounded-full object-cover shadow-lg"
              />
              <div className="text-center">
                <h2 className="text-2xl font-playfair text-black mb-2">
                  {juror.name}
                </h2>
                <p className="text-lg font-medium text-marigold mb-2">
                  {juror.title}
                </p>
                {juror.credentials && (
                  <div className="text-sm text-black/60 mb-3 italic space-y-1">
                    {Object.entries(juror.credentials).map(([key, value]) => (
                      <p key={key} className="font-light">
                        {key}: {value}
                      </p>
                    ))}
                  </div>
                )}
                {juror.description && (
                  <div
                    className="text-sm text-black/80 mb-3 space-y-2 text-left"
                    dangerouslySetInnerHTML={{
                      __html: juror.description,
                    }}
                  />
                )}
              </div>
            </div>
          </div>
        ))}
    </div>
  );
};

function EventDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);
  const [isRegistrationModalOpen, setIsRegistrationModalOpen] = useState(false);
  const [isInvitationPasswordModalOpen, setIsInvitationPasswordModalOpen] =
    useState(false);
  const [validInvitationCodeId, setValidInvitationCodeId] = useState<
    string | null
  >(null);
  const { event, loading, error } = useEvent(id || "") as {
    event: Event | null;
    loading: boolean;
    error: PostgrestError | null;
  };
  const { t, language } = useLanguage();

  usePageTitle(event?.title || "");

  const handleBackClick = (e: React.MouseEvent) => {
    e.preventDefault();
    navigate("/events");
  };

  const handleRegistrationClick = () => {
    if (!import.meta.env.DEV) {
      window.umami?.track("register_now_click", {
        type: "competition",
        eventId: id,
      });
    }
    // Normal registration - no invitation code needed
    setIsRegistrationModalOpen(true);
  };

  const handleWaitlistRegistrationClick = () => {
    if (!import.meta.env.DEV) {
      window.umami?.track("waitlist_register_click", {
        type: "competition",
        eventId: id,
      });
    }
    // Waitlist registration - requires invitation code
    setIsInvitationPasswordModalOpen(true);
  };

  const handleInvitationPasswordSuccess = (invitationCodeId: string) => {
    setValidInvitationCodeId(invitationCodeId);
    setIsInvitationPasswordModalOpen(false);
    setIsRegistrationModalOpen(true);
  };

  const handleRegistrationModalClose = () => {
    setIsRegistrationModalOpen(false);
    setValidInvitationCodeId(null);
  };

  const isQuotaFull =
    event?.max_quota &&
    event.registration_count !== undefined &&
    event.registration_count >= event.max_quota;

  const isRegistrationClosed =
    event?.registration_deadline &&
    new Date() >= new Date(event.registration_deadline);

  const formatEventType = (type: EventType) => {
    return t(`eventCard.eventTypes.${type}`);
  };

  const getTypeColor = (type: EventType) => {
    switch (type) {
      case "festival":
        return "bg-purple-100/90 text-purple-800";
      case "competition":
        return "bg-blue-100/90 text-blue-800";
      case "masterclass":
        return "bg-green-100/90 text-green-800";
      default:
        return "bg-gray-100/90 text-gray-800";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FFFFF0]">
        <LoadingSpinner message={t("loading.loadingEventDetails")} />
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-[#FFFFF0] animate-fadeIn">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 pt-20 mt-8">
          <button
            onClick={handleBackClick}
            className="inline-flex items-center text-marigold hover:text-marigold/90 mb-8"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t("eventDetails.backToEvents")}
          </button>
          <div className="text-center py-12">
            <h2 className="text-3xl font-playfair text-[#808080] mb-4">
              {error
                ? t("eventDetails.errorLoading")
                : t("eventDetails.notFound")}
            </h2>
            <p className="text-lg text-black/60 mb-6">
              {error
                ? t("eventDetails.errorMessage")
                : t("eventDetails.notFoundMessage")}
            </p>
            <button
              onClick={() => navigate("/events")}
              className="inline-flex items-center px-6 py-3 bg-marigold text-white rounded-lg hover:bg-marigold/90 transition-colors"
            >
              {t("eventDetails.viewAllEvents")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const hasAnyPrizes = event.event_categories.some(
    (category) =>
      (category.prizes && category.prizes.length > 0) ||
      (category.global_prizes && category.global_prizes.length > 0)
  );

  return (
    <div className="min-h-screen bg-[#FFFFF0] animate-fadeIn">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-12 mt-8">
        <button
          onClick={handleBackClick}
          className="inline-flex items-center text-marigold hover:text-marigold/90 mb-8"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t("eventDetails.backToEvents")}
        </button>

        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <div className="flex items-start justify-between mb-6">
            <h1 className="text-4xl font-playfair text-black">{event.title}</h1>
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium ${getTypeColor(
                event.type
              )}`}
            >
              {formatEventType(event.type)}
            </span>
          </div>
          <p
            className="text-black/80 mb-8"
            dangerouslySetInnerHTML={{
              __html:
                event.description?.[language] || event.description?.en || "",
            }}
          />

          <div className="grid md:grid-cols-3 gap-6">
            <div className="flex items-start space-x-3">
              <Calendar className="h-5 w-5 text-marigold mt-1" />
              <div>
                <h3 className="font-medium text-black">
                  {t("eventDetails.eventDate")}
                </h3>
                <div className="text-black/80 whitespace-pre-line">
                  {formatMultipleDatesWithLocale(event.event_date, language)}
                </div>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <MapPin className="h-5 w-5 text-marigold mt-1" />
              <div>
                <h3 className="font-medium text-black">
                  {t("eventDetails.venue")}
                </h3>
                <p className="text-black/80">{event.location}</p>
              </div>
            </div>
            {event.registration_deadline && (
              <div className="flex items-start space-x-3">
                <Calendar className="h-5 w-5 text-marigold mt-1" />
                <div>
                  <h3 className="font-medium text-black">
                    {t("eventDetails.registrationDeadline")}
                  </h3>
                  <p className="text-black/80">
                    {formatDateWithLocale(
                      event.registration_deadline,
                      language
                    )}
                  </p>
                </div>
              </div>
            )}
          </div>

          {event.status === "ongoing" && (
            <div className="mt-8 space-y-4">
              {/* Normal Registration Button */}
              <button
                onClick={handleRegistrationClick}
                disabled={Boolean(
                  !event.registration_deadline ||
                    isRegistrationClosed ||
                    isQuotaFull
                )}
                className={`${
                  !event.registration_deadline ||
                  isRegistrationClosed ||
                  isQuotaFull
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-marigold hover:bg-marigold/90"
                } text-white px-6 py-3 rounded-lg transition-colors w-full md:w-auto`}
              >
                {!event.registration_deadline
                  ? t("eventDetails.comingSoon")
                  : isQuotaFull
                  ? t("eventDetails.quotaFull")
                  : isRegistrationClosed
                  ? t("eventDetails.registrationClosed")
                  : t("eventDetails.registerNow")}
              </button>

              {/* Waitlist Registration Button - only show when quota is full */}
              {isQuotaFull && !isRegistrationClosed && (
                <button
                  onClick={handleWaitlistRegistrationClick}
                  className="bg-marigold hover:bg-marigold/90 text-white px-6 py-3 rounded-lg transition-colors w-full md:w-auto ml-0 md:ml-4"
                >
                  Waitlist Registration
                </button>
              )}
            </div>
          )}
        </div>

        <div className="bg-[#F7E7CE]/50 rounded-lg p-8 mb-8">
          <div className="flex items-center space-x-3 mb-6">
            <BookOpen className="h-6 w-6 text-marigold" />
            <h2 className="text-2xl font-playfair text-black">
              {t("eventDetails.importantInfo")}
            </h2>
          </div>
          <p className="text-black/80 mb-4">{t("eventDetails.reviewTerms")}</p>
          <button
            onClick={() => setIsTermsModalOpen(true)}
            className="bg-marigold text-[#FFFFF0] px-6 py-2 rounded-lg hover:bg-marigold/90 transition-colors inline-flex items-center"
          >
            {t("eventDetails.viewTerms")}
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <div className="flex items-center space-x-3 mb-6">
            <Trophy className="h-6 w-6 text-marigold" />
            <h2 className="text-2xl font-playfair text-black">
              {t("eventDetails.categories")}
            </h2>
          </div>
          <Suspense
            fallback={
              <LoadingSpinner message={t("loading.loadingCategories")} />
            }
          >
            <EventCategories categories={event.event_categories} />
          </Suspense>
        </div>

        {hasAnyPrizes && (
          <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
            <div className="flex items-center space-x-3 mb-6">
              <Award className="h-6 w-6 text-marigold" />
              <h2 className="text-2xl font-playfair text-black">
                {t("eventDetails.prizes")}
              </h2>
            </div>
            <Suspense
              fallback={<LoadingSpinner message={t("loading.loadingPrizes")} />}
            >
              <PrizesSection categories={event.event_categories} />
            </Suspense>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="flex items-center space-x-3 mb-6">
            <Users className="h-6 w-6 text-marigold" />
            <h2 className="text-2xl font-playfair text-black">
              {t("eventDetails.juryPanel")}
            </h2>
          </div>
          <Suspense
            fallback={<LoadingSpinner message={t("loading.loadingJury")} />}
          >
            <JuryPanel juryMembers={event.event_jury} />
          </Suspense>
        </div>
      </div>

      <InvitationPasswordModal
        isOpen={isInvitationPasswordModalOpen}
        onClose={() => setIsInvitationPasswordModalOpen(false)}
        eventId={event.id}
        onSuccess={handleInvitationPasswordSuccess}
      />

      <RegistrationModal
        isOpen={isRegistrationModalOpen}
        onClose={handleRegistrationModalClose}
        eventId={event.id}
        eventName={event.title}
        eventVenue={event.location}
        categories={event.event_categories}
        maxQuota={
          validInvitationCodeId ? undefined : event.max_quota || undefined
        } // Remove quota limit for waitlist registrations
        registrationCount={event.registration_count || 0}
        invitationCodeId={validInvitationCodeId}
        onOpenTerms={() => {
          setIsTermsModalOpen(true);
        }}
      />

      <TermsModal
        isOpen={isTermsModalOpen}
        onClose={() => setIsTermsModalOpen(false)}
        terms={
          event?.terms_and_conditions?.[language] ||
          event?.terms_and_conditions?.en
        }
      />
    </div>
  );
}

export default EventDetails;
