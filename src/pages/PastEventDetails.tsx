import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Calendar, MapPin, ArrowLeft, Camera, Users, Trophy } from 'lucide-react';
import JuryModal from '../components/JuryModal';
import { useEvent } from '../hooks/useEvent';
import { formatDate } from '../utils/date';
import LoadingSpinner from '../components/LoadingSpinner';

function PastEventDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [selectedJuror, setSelectedJuror] = useState(null);
  const { event, loading, error } = useEvent(id);

  const handleBackClick = (e: React.MouseEvent) => {
    e.preventDefault();
    const section = document.getElementById('past-events');
    if (section && window.location.pathname === '/') {
      section.scrollIntoView({ behavior: 'smooth' });
    } else {
      navigate('/', { state: { scrollToSection: 'past-events' } });
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading past event details..." />;
  }

  if (error || !event) {
    return (
      <div className="pt-20 pb-12 bg-[#FFFFF0] min-h-screen animate-fadeIn">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <button 
            onClick={handleBackClick}
            className="inline-flex items-center text-[#CFB53B] hover:text-[#CFB53B]/90 mb-8"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to all events
          </button>
          <div className="text-center py-12">
            <h2 className="text-2xl font-playfair text-[#808080]">Event not found</h2>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-20 pb-12 bg-[#FFFFF0] animate-fadeIn">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <button 
          onClick={handleBackClick}
          className="inline-flex items-center text-[#CFB53B] hover:text-[#CFB53B]/90 mb-8"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to all events
        </button>

        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <h1 className="text-4xl font-serif text-black mb-8">{event.title}</h1>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="flex items-center space-x-3">
              <Calendar className="h-5 w-5 text-[#CFB53B]" />
              <div>
                <h3 className="font-medium text-black">Event Date</h3>
                <p className="text-black/80">{formatDate(event.start_date)}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <MapPin className="h-5 w-5 text-[#CFB53B]" />
              <div>
                <h3 className="font-medium text-black">Venue</h3>
                <p className="text-black/80">{event.location}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <div className="flex items-center space-x-3 mb-6">
            <Camera className="h-6 w-6 text-[#CFB53B]" />
            <h2 className="text-2xl font-serif text-black">Event Highlights</h2>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {[
              "https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?auto=format&fit=crop&q=80",
              "https://images.unsplash.com/photo-1511735111819-9a3f7709049c?auto=format&fit=crop&q=80",
              "https://images.unsplash.com/photo-1552422535-c45813c61732?auto=format&fit=crop&q=80"
            ].map((image, index) => (
              <img 
                key={index}
                src={image}
                alt={`Event highlight ${index + 1}`}
                className="rounded-lg w-full h-48 object-cover"
              />
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <div className="flex items-center space-x-3 mb-6">
            <Users className="h-6 w-6 text-[#CFB53B]" />
            <h2 className="text-2xl font-serif text-black">Distinguished Jury Panel</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-8">
            {event.event_jury.map((juror) => (
              <div 
                key={juror.id} 
                className="bg-[#F7E7CE]/20 p-6 rounded-lg text-center cursor-pointer hover:bg-[#F7E7CE]/30 transition-colors"
                onClick={() => setSelectedJuror(juror)}
              >
                <img 
                  src={juror.avatar_url}
                  alt={juror.name}
                  className="w-32 h-32 rounded-full object-cover mx-auto mb-4"
                />
                <h3 className="text-xl font-serif text-black">{juror.name}</h3>
                <p className="text-sm text-black/80">{juror.title}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="flex items-center space-x-3 mb-6">
            <Trophy className="h-6 w-6 text-[#CFB53B]" />
            <h2 className="text-2xl font-serif text-black">Competition Winners</h2>
          </div>
          <div className="space-y-8">
            {Object.entries(event.winners || {}).map(([category, subcategories]) => (
              <div key={category} className="bg-[#F7E7CE]/20 p-6 rounded-lg">
                <h3 className="text-2xl font-serif text-black mb-6">{category}</h3>
                <div className="space-y-6">
                  {Object.entries(subcategories).map(([subcategory, winners]) => (
                    <div key={subcategory} className="bg-white p-6 rounded-lg shadow-sm">
                      <h4 className="text-xl font-serif text-black mb-4">{subcategory}</h4>
                      <div className="space-y-3">
                        {winners.map((winner, index) => (
                          <div key={index} className="flex items-center space-x-3">
                            <Trophy className="h-5 w-5 text-[#CFB53B]" />
                            <span className="font-medium text-[#CFB53B] w-24">{winner.prize_title}:</span>
                            <span className="text-black/80">{winner.participant_name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <JuryModal
        isOpen={!!selectedJuror}
        onClose={() => setSelectedJuror(null)}
        juror={selectedJuror}
      />
    </div>
  );
}

export default PastEventDetails;