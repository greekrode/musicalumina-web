import { useState, Suspense } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Calendar, MapPin, ArrowLeft, BookOpen, Trophy, Users, Award } from 'lucide-react';
import JuryModal from '../components/JuryModal';
import TermsModal from '../components/TermsModal';
import RegistrationModal from '../components/RegistrationModal';
import { useEvent } from '../hooks/useEvent';
import { formatDate } from '../utils/date';
import LoadingSpinner from '../components/LoadingSpinner';
import type { EventType } from '../lib/database.types';

const EventCategories = ({ categories }) => (
  <div className="space-y-8">
    {categories.map((category) => (
      <div key={category.id} className="bg-[#F7E7CE]/20 p-6 rounded-lg">
        <h3 className="text-xl font-playfair text-black mb-4">{category.name}</h3>
        {category.description && (
          <p className="text-black/80 mb-6">{category.description}</p>
        )}
        <div className="grid md:grid-cols-3 gap-4">
          {category.event_subcategories.map((subCategory) => (
            <div key={subCategory.id} className="bg-white p-4 rounded-lg shadow-sm">
              <h4 className="text-lg font-playfair text-black mb-3">{subCategory.name}</h4>
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-black">Age Requirement:</p>
                  <p className="text-sm text-black/80">{subCategory.age_requirement}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-black">Registration Fee:</p>
                  <p className="text-sm text-black/80">
                    IDR {subCategory.registration_fee.toLocaleString()}
                  </p>
                </div>
                {subCategory.repertoire && subCategory.repertoire.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-black">Repertoire:</p>
                    <ul className="list-disc list-inside text-sm text-black/80 space-y-1">
                      {subCategory.repertoire.map((rep, i) => (
                        <li key={i} className="text-sm">{rep}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {subCategory.performance_duration && (
                  <div>
                    <p className="text-sm font-medium text-black">Duration:</p>
                    <p className="text-sm text-black/80">{subCategory.performance_duration}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    ))}
  </div>
);

const PrizesSection = ({ categories }) => {
  // Collect all global prizes from the first category (they're the same for all)
  const globalPrizes = categories[0]?.global_prizes || [];

  return (
    <div className="space-y-8">
      {/* Overall Prizes */}
      {globalPrizes.length > 0 && (
        <div className="bg-[#F7E7CE]/20 p-6 rounded-lg">
          <h3 className="text-xl font-playfair text-black mb-4">Overall Prizes</h3>
          <div className="grid md:grid-cols-2 gap-6">
            {globalPrizes.map((prize) => (
              <div key={prize.id} className="bg-white p-4 rounded-lg shadow-sm">
                <div className="flex items-start space-x-4">
                  <Award className="h-6 w-6 text-[#CFB53B] mt-1" />
                  <div>
                    <h4 className="text-lg font-medium text-black">{prize.title}</h4>
                    {prize.amount && (
                      <p className="text-[#CFB53B] font-medium mt-1">
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
      {categories.map((category) => (
        category.prizes && category.prizes.length > 0 && (
          <div key={category.id} className="bg-[#F7E7CE]/20 p-6 rounded-lg">
            <h3 className="text-xl font-playfair text-black mb-4">
              {category.name} Prizes
            </h3>
            <div className="grid md:grid-cols-2 gap-6">
              {category.prizes.map((prize) => (
                <div key={prize.id} className="bg-white p-4 rounded-lg shadow-sm">
                  <div className="flex items-start space-x-4">
                    <Award className="h-6 w-6 text-[#CFB53B] mt-1" />
                    <div>
                      <h4 className="text-lg font-medium text-black">{prize.title}</h4>
                      {prize.amount && (
                        <p className="text-[#CFB53B] font-medium mt-1">
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
        )
      ))}
    </div>
  );
};

const JuryPanel = ({ juryMembers, onJurorClick }) => (
  <div className="grid md:grid-cols-2 gap-8">
    {juryMembers.map((juror) => (
      <div 
        key={juror.id}
        className="bg-[#F7E7CE]/20 p-6 rounded-lg cursor-pointer hover:bg-[#F7E7CE]/30 transition-colors"
        onClick={() => onJurorClick(juror)}
      >
        <div className="flex items-center space-x-4">
          <img 
            src={juror.avatar_url}
            alt={juror.name}
            className="w-16 h-16 rounded-full object-cover"
          />
          <div>
            <h3 className="text-xl font-playfair text-black">{juror.name}</h3>
            <p className="text-sm font-medium text-[#CFB53B]">{juror.title}</p>
          </div>
        </div>
      </div>
    ))}
  </div>
);

function EventDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [selectedJuror, setSelectedJuror] = useState(null);
  const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);
  const [isRegistrationModalOpen, setIsRegistrationModalOpen] = useState(false);
  const { event, loading, error } = useEvent(id);

  const handleBackClick = (e: React.MouseEvent) => {
    e.preventDefault();
    const section = document.getElementById('upcoming-events');
    if (section && window.location.pathname === '/') {
      section.scrollIntoView({ behavior: 'smooth' });
    } else {
      navigate('/', { state: { scrollToSection: 'upcoming-events' } });
    }
  };

  const formatEventType = (type: EventType) => {
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  const getTypeColor = (type: EventType) => {
    switch (type) {
      case 'festival':
        return 'bg-purple-100/90 text-purple-800';
      case 'competition':
        return 'bg-blue-100/90 text-blue-800';
      case 'masterclass':
        return 'bg-green-100/90 text-green-800';
      default:
        return 'bg-gray-100/90 text-gray-800';
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading event details..." />;
  }

  if (error || !event) {
    return (
      <div className="pt-20 pb-12 bg-[#FFFFF0] min-h-screen animate-fadeIn">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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

  const hasAnyPrizes = event.event_categories.some(
    category => (category.prizes && category.prizes.length > 0) || 
                (category.global_prizes && category.global_prizes.length > 0)
  );

  return (
    <div className="pt-20 pb-12 bg-[#FFFFF0] animate-fadeIn">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <button 
          onClick={handleBackClick}
          className="inline-flex items-center text-[#CFB53B] hover:text-[#CFB53B]/90 mb-8"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to all events
        </button>

        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <div className="flex items-start justify-between mb-6">
            <h1 className="text-4xl font-playfair text-black">{event.title}</h1>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getTypeColor(event.type)}`}>
              {formatEventType(event.type)}
            </span>
          </div>
          <p className="text-black/80 mb-8">{event.overview}</p>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="flex items-start space-x-3">
              <Calendar className="h-5 w-5 text-[#CFB53B] mt-1" />
              <div>
                <h3 className="font-medium text-black">Event Date</h3>
                <p className="text-black/80">{formatDate(event.start_date)}</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <MapPin className="h-5 w-5 text-[#CFB53B] mt-1" />
              <div>
                <h3 className="font-medium text-black">Venue</h3>
                <p className="text-black/80">{event.location}</p>
              </div>
            </div>
            {event.registration_deadline && (
              <div className="flex items-start space-x-3">
                <Calendar className="h-5 w-5 text-[#CFB53B] mt-1" />
                <div>
                  <h3 className="font-medium text-black">Registration Deadline</h3>
                  <p className="text-black/80">{formatDate(event.registration_deadline)}</p>
                </div>
              </div>
            )}
          </div>

          {event.status === 'ongoing' && (
            <div className="mt-8">
              <button
                onClick={() => setIsRegistrationModalOpen(true)}
                className="bg-[#CFB53B] text-white px-6 py-3 rounded-md hover:bg-[#CFB53B]/90 transition-colors w-full md:w-auto"
              >
                Register Now
              </button>
            </div>
          )}
        </div>

        <div className="bg-[#F7E7CE]/30 rounded-lg p-8 mb-8">
          <div className="flex items-center space-x-3 mb-6">
            <BookOpen className="h-6 w-6 text-[#CFB53B]" />
            <h2 className="text-2xl font-playfair text-black">Important Information</h2>
          </div>
          <p className="text-black/80 mb-4">
            Please review our terms and conditions before proceeding with registration.
          </p>
          <button 
            onClick={() => setIsTermsModalOpen(true)}
            className="bg-[#CFB53B] text-[#FFFFF0] px-6 py-2 rounded-md hover:bg-[#CFB53B]/90 transition-colors inline-flex items-center"
          >
            View Terms & Conditions
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <div className="flex items-center space-x-3 mb-6">
            <Trophy className="h-6 w-6 text-[#CFB53B]" />
            <h2 className="text-2xl font-playfair text-black">Categories</h2>
          </div>
          <Suspense fallback={<LoadingSpinner message="Loading categories..." />}>
            <EventCategories categories={event.event_categories} />
          </Suspense>
        </div>

        {hasAnyPrizes && (
          <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
            <div className="flex items-center space-x-3 mb-6">
              <Award className="h-6 w-6 text-[#CFB53B]" />
              <h2 className="text-2xl font-playfair text-black">Prizes</h2>
            </div>
            <Suspense fallback={<LoadingSpinner message="Loading prizes..." />}>
              <PrizesSection categories={event.event_categories} />
            </Suspense>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="flex items-center space-x-3 mb-6">
            <Users className="h-6 w-6 text-[#CFB53B]" />
            <h2 className="text-2xl font-playfair text-black">Jury Panel</h2>
          </div>
          <Suspense fallback={<LoadingSpinner message="Loading jury panel..." />}>
            <JuryPanel 
              juryMembers={event.event_jury} 
              onJurorClick={setSelectedJuror}
            />
          </Suspense>
        </div>
      </div>

      <RegistrationModal
        isOpen={isRegistrationModalOpen}
        onClose={() => setIsRegistrationModalOpen(false)}
        eventId={event.id}
        eventType={event.type}
        categories={event.event_categories}
        onOpenTerms={() => {
          setIsTermsModalOpen(true);
        }}
      />

      <TermsModal
        isOpen={isTermsModalOpen}
        onClose={() => setIsTermsModalOpen(false)}
        terms={event?.terms_and_conditions}
      />

      <JuryModal
        isOpen={!!selectedJuror}
        onClose={() => setSelectedJuror(null)}
        juror={{
          name: selectedJuror?.name || '',
          title: selectedJuror?.title || '',
          avatar: selectedJuror?.avatar_url || '',
          description: selectedJuror?.description || ''
        }}
      />
    </div>
  );
}

export default EventDetails;