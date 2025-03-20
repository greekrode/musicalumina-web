import { Calendar, MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import type { EventStatus, EventType } from "../lib/database.types";

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
  const getButtonConfig = () => {
    switch (status) {
      case "ongoing":
        return {
          text: "View Details",
          disabled: false,
          className: "bg-[#CFB53B] hover:bg-[#CFB53B]/90",
        };
      case "upcoming":
        return {
          text: "Coming Soon",
          disabled: true,
          className: "bg-gray-400 cursor-not-allowed",
        };
      default:
        return {
          text: "View Results",
          disabled: false,
          className: "bg-[#CFB53B] hover:bg-[#CFB53B]/90",
        };
    }
  };

  const formatEventType = (type: EventType) => {
    return type.charAt(0).toUpperCase() + type.slice(1);
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
            <Calendar className="h-4 w-4 text-[#CFB53B]" />
            <span className="text-sm text-[#808080]">{date}</span>
          </div>
          <div className="flex items-center space-x-2">
            <MapPin className="h-4 w-4 text-[#CFB53B]" />
            <span className="text-sm text-[#808080]">{location}</span>
          </div>
        </div>
        <div className="mt-auto">
          <Link
            to={status === "completed" ? `/past-event/${id}` : `/event/${id}`}
            className={`block w-full text-[#FFFFF0] px-4 py-2 rounded-md transition-colors text-center ${buttonConfig.className}`}
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
