import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Database } from "@/lib/database.types";
import { Button } from "@/components/ui/button";
import { JuryModal } from "./JuryModal";
import { useToast } from "@/components/ui/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type Event = {
  id: string;
  title: string;
  jury: EventJury[];
};

type EventJury = Database["public"]["Tables"]["event_jury"]["Row"];

export default function JuryPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<Event[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedJury, setSelectedJury] = useState<EventJury | undefined>();
  const [selectedEventId, setSelectedEventId] = useState<string | undefined>();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [juryToDelete, setJuryToDelete] = useState<EventJury | undefined>();

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      // First fetch all events
      const { data: eventsData, error: eventsError } = await supabase
        .from("events")
        .select(
          `
          id,
          title
        `
        )
        .order("start_date", { ascending: false });

      if (eventsError) throw eventsError;

      // Then fetch all jury members
      const { data: juryData, error: juryError } = await supabase
        .from("event_jury")
        .select("*")
        .order("created_at", { ascending: false });

      if (juryError) throw juryError;

      // Combine the data
      const eventsWithJury = eventsData.map((event) => ({
        id: event.id,
        title: event.title,
        jury: juryData.filter((jury) => jury.event_id === event.id) || [],
      }));

      setEvents(eventsWithJury);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleAddJury = (eventId: string) => {
    setSelectedJury(undefined);
    setSelectedEventId(eventId);
    setIsModalOpen(true);
  };

  const handleEditJury = (jury: EventJury) => {
    setSelectedJury(jury);
    setIsModalOpen(true);
  };

  const handleDeleteJury = (jury: EventJury) => {
    setJuryToDelete(jury);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!juryToDelete) return;

    try {
      const { error } = await supabase
        .from("event_jury")
        .delete()
        .eq("id", juryToDelete.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Jury member deleted successfully",
      });

      fetchEvents();
    } catch (err) {
      console.error("Error deleting jury member:", err);
      toast({
        title: "Error",
        description: "Failed to delete jury member",
        variant: "destructive",
      });
    } finally {
      setIsDeleteDialogOpen(false);
      setJuryToDelete(undefined);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-500">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Event Jury Management</h1>
      </div>

      {events.map((event) => (
        <div key={event.id} className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">{event.title}</h2>
            <Button onClick={() => handleAddJury(event.id)}>
              Add Jury Member
            </Button>
          </div>
          {event.jury.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {event.jury.map((jury) => (
                <div
                  key={jury.id}
                  className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow"
                >
                  <div className="flex items-center space-x-4">
                    {jury.avatar_url && (
                      <img
                        src={jury.avatar_url}
                        alt={jury.name}
                        className="w-16 h-16 rounded-full object-cover"
                      />
                    )}
                    <div className="flex-1">
                      <h3 className="font-semibold">{jury.name}</h3>
                      <p className="text-sm text-gray-600">{jury.title}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditJury(jury)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteJury(jury)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                  {jury.description && (
                    <p
                      className="mt-2 text-sm text-gray-600"
                      dangerouslySetInnerHTML={{
                        __html: jury.description,
                      }}
                    ></p>
                  )}
                  {jury.credentials && (
                    <div className="mt-2">
                      <h4 className="text-sm font-semibold">Credentials:</h4>
                      <ul className="text-sm text-gray-600">
                        {Object.entries(
                          jury.credentials as Record<string, string>
                        ).map(([key, value]) => (
                          <li key={key}>
                            {key}: {value}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-gray-50 rounded-lg p-8 text-center">
              <p className="text-gray-600">No jury members added yet.</p>
              <p className="text-sm text-gray-500 mt-2">
                Click the "Add Jury Member" button to add one.
              </p>
            </div>
          )}
        </div>
      ))}

      <JuryModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedJury(undefined);
          setSelectedEventId(undefined);
        }}
        juryMember={selectedJury}
        eventId={selectedEventId}
        onSuccess={fetchEvents}
      />

      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              jury member.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
