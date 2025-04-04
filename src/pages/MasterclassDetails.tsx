import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Calendar,
  MapPin,
  ArrowLeft,
  BookOpen,
  Users,
  Clock,
  Coins,
} from "lucide-react";
import TermsModal from "../components/TermsModal";
import MasterclassRegistrationModal from "../components/MasterclassRegistrationModal";
import { useEvent } from "../hooks/useEvent";
import { formatDateWithLocale } from "../lib/utils";
import LoadingSpinner from "../components/LoadingSpinner";
import type { Database } from "../lib/database.types";
import { usePageTitle } from "../hooks/usePageTitle";
import type { PostgrestError } from "@supabase/supabase-js";
import { useLanguage } from "../lib/LanguageContext";

type Event = Database["public"]["Tables"]["events"]["Row"] & {
  event_jury: EventJuror[];
};

type EventJuror = Omit<
  Database["public"]["Tables"]["event_jury"]["Row"],
  "credentials"
> & {
  credentials: string | null;
};

function MasterclassDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);
  const [isRegistrationModalOpen, setIsRegistrationModalOpen] = useState(false);
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

  const instructor = event.event_jury[0]; // Masterclass has only one instructor

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
          <h1 className="text-4xl font-playfair text-black mb-8">
            {event.title}
          </h1>

          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div className="flex items-start space-x-3">
              <Calendar className="h-5 w-5 text-marigold mt-1" />
              <div>
                <h3 className="font-medium text-black">
                  {t("eventDetails.eventDate")}
                </h3>
                <p className="text-black/80">
                  {event.start_date
                    ? formatDateWithLocale(event.start_date, language)
                    : t("common.tbd")}
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <MapPin className="h-5 w-5 text-marigold mt-1" />
              <div>
                <h3 className="font-medium text-black">
                  {t("eventDetails.venue")}
                </h3>
                <p className="text-black/80">{event.location}</p>
                {event.venue_details && (
                  <p className="text-sm text-black/60 mt-1">
                    {event.venue_details}
                  </p>
                )}
              </div>
            </div>
            {event.registration_deadline && (
              <div className="flex items-start space-x-3">
                <Clock className="h-5 w-5 text-marigold mt-1" />
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
            <div className="flex items-start space-x-3">
              <Coins className="h-5 w-5 text-marigold mt-1" />
              <div>
                <h3 className="font-medium text-black">
                  {t("masterclass.registrationFee")}
                </h3>
                <p className="text-black/80">
                  {event.registration_fee
                    ? `IDR ${event.registration_fee.toLocaleString()}`
                    : t("common.tbd")}
                </p>
              </div>
            </div>
          </div>

          {event.status === "ongoing" && (
            <div className="mt-8">
              <button
                onClick={() => {
                  (window as any).umami?.track('register_now_click', { type: 'masterclass', eventId: id });
                  setIsRegistrationModalOpen(true);
                }}
                className="bg-marigold text-white px-6 py-3 rounded-lg hover:bg-marigold/90 transition-colors w-full md:w-auto"
              >
                {t("eventDetails.registerNow")}
              </button>
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

        {instructor && (
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="flex items-center space-x-3 mb-6">
              <Users className="h-6 w-6 text-marigold" />
              <h2 className="text-2xl font-playfair text-black">
                {t("masterclass.instructor")}
              </h2>
            </div>
            <div className="bg-[#F7E7CE]/30 p-6 rounded-lg">
              <div className="flex flex-col items-center space-y-4">
                <img
                  src={instructor.avatar_url || ""}
                  alt={instructor.name}
                  className="w-48 h-48 rounded-full object-cover shadow-lg"
                />
                <div className="text-center">
                  <h2 className="text-2xl font-playfair text-black mb-2">
                    {instructor.name}
                  </h2>
                  <p className="text-lg font-medium text-marigold mb-4">
                    {instructor.title}
                  </p>
                  {instructor.description && (
                    <div className="text-sm text-black/80 mb-3 space-y-2 text-left">
                      {instructor.description
                        .replace(/\\n/g, "\n")
                        .split("\n")
                        .map((line, index) => (
                          <p key={index}>{line}</p>
                        ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <MasterclassRegistrationModal
        isOpen={isRegistrationModalOpen}
        onClose={() => setIsRegistrationModalOpen(false)}
        eventId={event.id}
        eventName={event.title}
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

export default MasterclassDetails;
