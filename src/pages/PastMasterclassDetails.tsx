import { useNavigate, useParams } from "react-router-dom";
import {
  Calendar,
  MapPin,
  ArrowLeft,
  Users,
  ChevronLeft,
  ChevronRight,
  Music,
} from "lucide-react";
import { useEvent } from "../hooks/useEvent";
import { formatDateWithLocale, formatMultipleDatesWithLocale } from "../lib/utils";
import LoadingSpinner from "../components/LoadingSpinner";
import { usePageTitle } from "../hooks/usePageTitle";
import type { Database } from "../lib/database.types";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { useLanguage } from "../lib/LanguageContext";

type EventJuror = Omit<
  Database["public"]["Tables"]["event_jury"]["Row"],
  "credentials"
> & {
  credentials: string | null;
};

type MasterclassParticipant = {
  id: string;
  name: string;
  repertoire: string[];
};

type PastEvent = Database["public"]["Tables"]["events"]["Row"] & {
  event_jury: EventJuror[];
  masterclass_participants?: MasterclassParticipant[];
};

function preloadImage(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    img.src = src;
  });
}

function EventHighlightsCarousel({
  images,
  isLoading,
}: {
  images: string[];
  isLoading: boolean;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [imagesLoaded, setImagesLoaded] = useState(false);

  const nextSlide = useCallback(() => {
    setCurrentIndex((prevIndex) =>
      prevIndex === images.length - 1 ? 0 : prevIndex + 1
    );
  }, [images.length]);

  const prevSlide = () => {
    setCurrentIndex((prevIndex) =>
      prevIndex === 0 ? images.length - 1 : prevIndex - 1
    );
  };

  useEffect(() => {
    // Reset loaded state when images change
    setImagesLoaded(false);

    // Preload all images
    if (images.length > 0) {
      Promise.all(images.map(preloadImage))
        .then(() => setImagesLoaded(true))
        .catch((error) => {
          console.error("Failed to preload images:", error);
          // Still set as loaded to show whatever images we have
          setImagesLoaded(true);
        });
    }
  }, [images]);

  useEffect(() => {
    if (images.length > 1 && imagesLoaded) {
      const timer = setInterval(nextSlide, 5000);
      return () => clearInterval(timer);
    }
  }, [nextSlide, images.length, imagesLoaded]);

  if (isLoading || !imagesLoaded) {
    return (
      <div className="relative w-full h-[600px] mb-8 bg-[#F7E7CE]/30 rounded-lg flex items-center justify-center">
        <LoadingSpinner
          message={
            isLoading ? "Loading event photos..." : "Preparing photos..."
          }
        />
      </div>
    );
  }

  if (images.length === 0) {
    return (
      <div className="relative w-full h-[400px] mb-8 bg-[#F7E7CE]/30 rounded-lg flex items-center justify-center">
        <p className="text-black/60 text-lg">
          No photos available for this event
        </p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-[600px] mb-8 group">
      <div className="relative h-full overflow-hidden rounded-lg">
        {images.map((image, index) => (
          <div
            key={index}
            className={`absolute w-full h-full transition-opacity duration-700 ease-in-out ${
              index === currentIndex ? "opacity-100" : "opacity-0"
            }`}
          >
            <img
              src={image}
              alt={`Event highlight ${index + 1}`}
              className="absolute block w-full h-full object-cover"
            />
          </div>
        ))}
      </div>

      {images.length > 1 && (
        <>
          {/* Navigation Buttons */}
          <button
            onClick={prevSlide}
            className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button
            onClick={nextSlide}
            className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          >
            <ChevronRight className="h-6 w-6" />
          </button>

          {/* Dots Indicator */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex space-x-2">
            {images.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  index === currentIndex
                    ? "bg-white w-4"
                    : "bg-white/50 hover:bg-white/80"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function useEventPhotos(eventId: string) {
  const [photos, setPhotos] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;

    async function fetchEventPhotos() {
      try {
        setLoading(true);

        // List all files in the event's directory
        const { data: files, error } = await supabase.storage
          .from("event-photos")
          .list(eventId);

        if (error) throw error;

        if (!files || files.length === 0) {
          if (mounted) setPhotos([]);
          return;
        }

        // Get signed URLs for all photos
        const photoUrls = await Promise.all(
          files
            .filter((file) => file.name.match(/\.(jpg|jpeg|png|gif|webp)$/i))
            .map(async (file) => {
              const signedUrlResult = await supabase.storage
                .from("event-photos")
                .createSignedUrl(`${eventId}/${file.name}`, 3600); // 1 hour expiry

              if (signedUrlResult.error) throw signedUrlResult.error;
              return signedUrlResult.data?.signedUrl;
            })
        );

        if (mounted) setPhotos(photoUrls.filter(Boolean) as string[]);
      } catch (err) {
        console.error("Error fetching event photos:", err);
        if (mounted) {
          setError(
            err instanceof Error
              ? err
              : new Error("Failed to fetch event photos")
          );
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    if (eventId) {
      fetchEventPhotos();
    }

    return () => {
      mounted = false;
    };
  }, [eventId]);

  // Refresh signed URLs periodically (every 45 minutes)
  useEffect(() => {
    if (photos.length === 0) return;

    const refreshInterval = setInterval(async () => {
      try {
        const { data: files, error } = await supabase.storage
          .from("event-photos")
          .list(eventId);

        if (error) throw error;

        if (!files || files.length === 0) return;

        const newPhotoUrls = await Promise.all(
          files
            .filter((file) => file.name.match(/\.(jpg|jpeg|png|gif|webp)$/i))
            .map(async (file) => {
              const signedUrlResult = await supabase.storage
                .from("event-photos")
                .createSignedUrl(`${eventId}/${file.name}`, 3600);

              if (signedUrlResult.error) throw signedUrlResult.error;
              return signedUrlResult.data?.signedUrl;
            })
        );

        setPhotos(newPhotoUrls.filter(Boolean) as string[]);
      } catch (err) {
        console.error("Error refreshing signed URLs:", err);
      }
    }, 45 * 60 * 1000); // 45 minutes

    return () => clearInterval(refreshInterval);
  }, [eventId, photos.length]);

  return { photos, loading, error };
}

const PastMasterclassDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const {
    event,
    loading: eventLoading,
    error: eventError,
  } = useEvent(id || "") as {
    event: PastEvent | null;
    loading: boolean;
    error: Error | null;
  };
  const { photos, loading: photosLoading } = useEventPhotos(id || "");
  const [participants, setParticipants] = useState<MasterclassParticipant[]>([]);
  const [participantsLoading, setParticipantsLoading] = useState(true);

  usePageTitle(event?.title ? `Past Masterclass | ${event.title}` : undefined);

  const handleBackClick = (e: React.MouseEvent) => {
    e.preventDefault();
    navigate("/events");
  };

  // Fetch masterclass participants
  useEffect(() => {
    async function fetchParticipants() {
      if (!event?.id) return;

      try {
        setParticipantsLoading(true);
        const { data, error } = await supabase
          .from("masterclass_participants")
          .select("*")
          .eq("event_id", event.id)
          .order("name");

        if (error) throw error;

        if (data) {
          setParticipants(data);
        }
      } catch (err) {
        console.error("Error fetching masterclass participants:", err);
      } finally {
        setParticipantsLoading(false);
      }
    }

    fetchParticipants();
  }, [event?.id]);

  if (eventLoading) {
    return <LoadingSpinner message={t("loading.loadingEventDetails")} />;
  }

  if (eventError || !event) {
    return (
      <div className="pt-20 pb-12 bg-[#FFFFF0] min-h-screen animate-fadeIn">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 mt-8">
          <button
            onClick={handleBackClick}
            className="inline-flex items-center text-marigold hover:text-marigold/90 mb-8"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t("eventDetails.backToEvents")}
          </button>
          <div className="text-center py-12">
            <h2 className="text-3xl font-playfair text-[#808080] mb-4">
              {eventError ? t("eventDetails.errorLoading") : t("eventDetails.notFound")}
            </h2>
            <p className="text-lg text-black/60 mb-6">
              {eventError
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

  // Get the instructor (first juror)
  const instructor = event.event_jury[0];

  return (
    <div className="pt-20 pb-12 bg-[#FFFFF0] animate-fadeIn">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        <button
          onClick={handleBackClick}
          className="inline-flex items-center text-marigold hover:text-marigold/90 mb-8"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t("eventDetails.backToEvents")}
        </button>

        <EventHighlightsCarousel images={photos} isLoading={photosLoading} />

        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <h1 className="text-4xl font-serif text-black mb-8">{event.title}</h1>
          <p className="text-black/80 mb-8">
            {event.description?.[language] || event.description?.en}
          </p>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="flex items-center space-x-3">
              <Calendar className="h-5 w-5 text-marigold" />
              <div>
                <h3 className="font-medium text-black">{t("eventDetails.eventDate")}</h3>
                <div className="text-black/80 whitespace-pre-line">
                  {event.event_date
                    ? formatMultipleDatesWithLocale(event.event_date, language)
                    : t("common.tbd")}
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <MapPin className="h-5 w-5 text-marigold" />
              <div>
                <h3 className="font-medium text-black">{t("eventDetails.venue")}</h3>
                <p className="text-black/80">{event.location}</p>
              </div>
            </div>
          </div>
        </div>

        {instructor && (
          <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
            <div className="flex items-center space-x-3 mb-6">
              <Users className="h-6 w-6 text-marigold" />
              <h2 className="text-2xl font-serif text-black">
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

        {participants.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="flex items-center space-x-3 mb-6">
              <Music className="h-6 w-6 text-marigold" />
              <h2 className="text-2xl font-serif text-black">
                {t("masterclass.participants")}
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {participants.map((participant) => (
                <div
                  key={participant.id}
                  className="bg-[#F7E7CE]/30 p-6 rounded-lg"
                >
                  <h3 className="text-xl font-playfair text-black mb-4">
                    {participant.name}
                  </h3>
                  <div className="space-y-2">
                    <h4 className="font-medium text-marigold">
                      {t("masterclass.repertoire")}
                    </h4>
                    <ul className="list-disc list-inside text-sm text-black/80">
                      {participant.repertoire.map((piece, index) => (
                        <li key={index} className="mb-1">
                          {piece}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export { PastMasterclassDetails };
export default PastMasterclassDetails; 