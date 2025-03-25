import { useEvents } from "../hooks/useEvents";
import EventCard from "./EventCard";
import LoadingSpinner from "./LoadingSpinner";
import { formatDateWithIntl } from "../lib/utils";

interface EventListProps {
  status?: "upcoming" | "completed";
}

function EventList({ status }: EventListProps) {
  const { events, loading, error } = useEvents({ status });

  if (loading) {
    return <LoadingSpinner message={`Loading ${status || ""} events...`} />;
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">
          Failed to load events. Please try again later.
        </p>
      </div>
    );
  }

  if (!events.length) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">No events found.</p>
      </div>
    );
  }

  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
      {events.map((event) => (
        <EventCard
          key={event.id}
          id={event.id}
          title={event.title}
          type={event.type}
          date={formatDateWithIntl(event.start_date)}
          location={event.location}
          status={event.status}
          image={
            event.poster_image ||
            "https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?auto=format&fit=crop&q=80"
          }
        />
      ))}
    </div>
  );
}

export default EventList;
