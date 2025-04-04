import { Calendar, MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import type { EventStatus, EventType } from "../lib/database.types";
import { useLanguage } from "../lib/LanguageContext";
import { formatDateWithLocale } from "../lib/utils";

interface EventCardProps {
  id: string;
  title: string;
  type: EventType;
  date: string;
  location: string;
  status: EventStatus;
  image: string;
}

function EventCard({
  id,
  title,
  type,
  date,
  location,
  status,
  image,
}: EventCardProps) {
  const { t, language } = useLanguage();

  const getButtonConfig = () => {
    switch (status) {
      case "ongoing":
        return {
          text: t("eventCard.viewDetails"),
          disabled: false,
          className: "bg-marigold hover:bg-marigold/90",
        };
      case "upcoming":
        return {
          text: t("eventCard.comingSoon"),
          disabled: true,
          className: "bg-gray-400 cursor-not-allowed",
        };
      default:
        return {
          text: t("eventCard.viewResults"),
          disabled: false,
          className: "bg-marigold hover:bg-marigold/90",
        };
    }
  };

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

  const buttonConfig = getButtonConfig();
  const typeColor = getTypeColor(type);
  const formattedDate = formatDateWithLocale(date, language);

  return (
    <div className="bg-[#FFFFF0] rounded-lg overflow-hidden shadow-lg h-full flex flex-col">
      <div className="relative">
        <img src={image} alt={title} className="w-full h-48 object-cover" />
        <span
          className={`absolute top-4 right-4 px-3 py-1.5 rounded-full text-xs font-medium ${typeColor}`}
        >
          {formatEventType(type)}
        </span>
      </div>
      <div className="p-6 flex flex-col flex-grow">
        <h3 className="text-xl font-serif text-[#808080] mb-4">{title}</h3>
        <div className="space-y-2 mb-6">
          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4 text-marigold" />
            <span className="text-sm text-[#808080]">{formattedDate}</span>
          </div>
          <div className="flex items-center space-x-2">
            <MapPin className="h-4 w-4 text-marigold" />
            <span className="text-sm text-[#808080]">{location}</span>
          </div>
        </div>
        <div className="mt-auto">
          <Link
            to={
              status === "completed"
                ? type === "masterclass"
                  ? `/past-masterclass/${id}`
                  : `/past-event/${id}`
                : type === "masterclass"
                ? `/masterclass/${id}`
                : `/event/${id}`
            }
            className={`block w-full text-[#FFFFF0] px-4 py-2 rounded-lg transition-colors text-center ${buttonConfig.className}`}
            onClick={(e) => buttonConfig.disabled && e.preventDefault()}
          >
            {buttonConfig.text}
          </Link>
        </div>
      </div>
    </div>
  );
}

export default EventCard;
