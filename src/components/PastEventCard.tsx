import { Calendar, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';

interface PastEventCardProps {
  id: string;
  title: string;
  date: string;
  location: string;
  image: string;
}

function PastEventCard({ id, title, date, location, image }: PastEventCardProps) {
  return (
    <div className="bg-[#FFFFF0] rounded-lg overflow-hidden shadow-lg h-full flex flex-col">
      <img src={image} alt={title} className="w-full h-48 object-cover" />
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
            to={`/past-event/${id}`}
            className="block w-full bg-[#CFB53B] text-[#FFFFF0] px-4 py-2 rounded-md hover:bg-[#CFB53B]/90 transition-colors text-center"
          >
            View Results
          </Link>
        </div>
      </div>
    </div>
  );
}

export default PastEventCard;