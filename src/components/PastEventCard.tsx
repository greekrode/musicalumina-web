import { Calendar, MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import { useLanguage } from "../lib/LanguageContext";
import { formatDateWithLocale } from "../lib/utils";

interface PastEventCardProps {
  id: string;
  title: string;
  date: string;
  location: string;
  image: string;
}

function PastEventCard({
  id,
  title,
  date,
  location,
  image,
}: PastEventCardProps) {
  const { t, language } = useLanguage();
  const formattedDate = formatDateWithLocale(date, language);

  return (
    <div className="bg-offWhite rounded-lg overflow-hidden shadow-lg h-full flex flex-col">
      <img src={image} alt={title} className="w-full h-48 object-cover" />
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
            to={`/past-event/${id}`}
            className="block w-full bg-marigold text-offWhite px-4 py-2 rounded-md hover:bg-marigold/90 transition-colors text-center"
          >
            {t("eventCard.viewResults")}
          </Link>
        </div>
      </div>
    </div>
  );
}

export default PastEventCard;
