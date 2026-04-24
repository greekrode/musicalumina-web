import { useEffect, useState } from "react";
import { Pencil, Plus, Trash2, Users } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Database } from "@/lib/database.types";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Image } from "@/components/ui/image";
import { NoteGlyph } from "@/components/ui/wireframe-wave";
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
import { cn } from "@/lib/utils";

/**
 * JuryPage — admin management for event jury members.
 *
 * Groups jury members by event. Each event is a bordered block with an
 * editorial heading + Add Member button, and a responsive grid of juror
 * cards below. Delete requires confirmation via AlertDialog.
 *
 * All Supabase wiring + toast feedback preserved.
 */

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
      const { data: eventsData, error: eventsError } = await supabase
        .from("events")
        .select(`id, title`)
        .order("start_date", { ascending: false });
      if (eventsError) throw eventsError;

      const { data: juryData, error: juryError } = await supabase
        .from("event_jury")
        .select("*")
        .order("created_at", { ascending: false });
      if (juryError) throw juryError;

      const eventsWithJury = eventsData.map((event) => ({
        id: event.id,
        title: event.title,
        jury: juryData.filter((j) => j.event_id === event.id) || [],
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
      const { error: deleteError } = await supabase
        .from("event_jury")
        .delete()
        .eq("id", juryToDelete.id);
      if (deleteError) throw deleteError;
      toast({
        title: "Deleted",
        description: "Jury member removed successfully.",
      });
      fetchEvents();
    } catch (err) {
      console.error("Error deleting jury member:", err);
      toast({
        title: "Error",
        description: "Failed to delete jury member.",
        variant: "destructive",
      });
    } finally {
      setIsDeleteDialogOpen(false);
      setJuryToDelete(undefined);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <NoteGlyph size={32} className="text-marigold animate-pulse" />
          <p className="type-caption text-ink-muted">Loading jury panels…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="border-l-2 border-[color:var(--status-error)] bg-[color:var(--status-error-bg)] px-6 py-5 max-w-prose">
        <Eyebrow tone="muted">Error</Eyebrow>
        <p className="type-body-md text-[color:var(--status-error)] mt-2">
          {error}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <header className="flex flex-col gap-2">
        <Eyebrow withRule>Manage · Jury</Eyebrow>
        <h1 className="type-display-md text-burgundy">Event jury</h1>
        <p className="type-body-sm text-ink-muted">
          {events.length} {events.length === 1 ? "event" : "events"} across the
          calendar.
        </p>
      </header>

      {/* One block per event */}
      <div className="flex flex-col gap-6">
        {events.map((event) => (
          <section
            key={event.id}
            className="bg-surface-elevated border border-rule-hairline"
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-5 lg:p-6 border-b border-rule-hairline">
              <div className="flex flex-col gap-1">
                <Eyebrow>Event</Eyebrow>
                <h2 className="type-headline-sm text-burgundy">
                  {event.title}
                </h2>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleAddJury(event.id)}
              >
                <Plus className="h-3.5 w-3.5" />
                Add member
              </Button>
            </div>

            <div className="p-5 lg:p-6">
              {event.jury.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {event.jury.map((jury) => (
                    <JurorCard
                      key={jury.id}
                      jury={jury}
                      onEdit={() => handleEditJury(jury)}
                      onDelete={() => handleDeleteJury(jury)}
                    />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 py-8 text-center">
                  <Users className="h-6 w-6 text-ink-subtle" aria-hidden />
                  <p className="type-body-sm text-ink-muted">
                    No jury members yet.
                  </p>
                  <p className="type-caption text-ink-muted">
                    Use <strong>Add member</strong> to invite one.
                  </p>
                </div>
              )}
            </div>
          </section>
        ))}
      </div>

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
            <AlertDialogTitle>Delete this jury member?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The member will be removed from the
              event permanently.
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

/* ============================================================================
   JurorCard
   ============================================================================ */

function JurorCard({
  jury,
  onEdit,
  onDelete,
}: {
  jury: EventJury;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const credentialsEntries =
    jury.credentials && typeof jury.credentials === "object"
      ? Object.entries(jury.credentials as Record<string, string>)
      : [];

  return (
    <article className="bg-surface-canvas-warm border border-rule-hairline p-4 flex flex-col gap-3">
      <div className="flex items-start gap-3">
        {jury.avatar_url ? (
          <Image
            src={jury.avatar_url}
            alt={jury.name}
            aspect="1/1"
            containerClassName="w-14 h-14 flex-shrink-0"
            fit="cover"
            hideSkeleton
          />
        ) : (
          <div className="w-14 h-14 flex items-center justify-center bg-surface-canvas border border-rule-hairline flex-shrink-0">
            <NoteGlyph size={20} className="text-marigold/40" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="type-title-md text-burgundy truncate">{jury.name}</h3>
          <p className="type-caption text-ink-accent">{jury.title}</p>
        </div>
      </div>

      {jury.description && (
        <div
          className="type-caption text-ink-muted line-clamp-3"
          dangerouslySetInnerHTML={{ __html: jury.description }}
        />
      )}

      {credentialsEntries.length > 0 && (
        <div className="pt-2 border-t border-rule-hairline">
          <Eyebrow className="mb-1.5 text-[10px]">Credentials</Eyebrow>
          <ul className="type-caption text-ink-muted space-y-0.5">
            {credentialsEntries.slice(0, 3).map(([key, value]) => (
              <li key={key} className="truncate">
                <span className="text-ink-accent not-italic">{key}:</span>{" "}
                {String(value)}
              </li>
            ))}
            {credentialsEntries.length > 3 && (
              <li className="italic">
                +{credentialsEntries.length - 3} more
              </li>
            )}
          </ul>
        </div>
      )}

      <div className="flex gap-2 pt-3 border-t border-rule-hairline">
        <button
          type="button"
          onClick={onEdit}
          className={cn(
            "flex-1 inline-flex items-center justify-center gap-1.5 h-8 type-label",
            "text-burgundy hover:bg-burgundy/[0.06] transition-colors rounded-sm",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marigold focus-visible:ring-offset-2"
          )}
        >
          <Pencil className="h-3 w-3" />
          Edit
        </button>
        <button
          type="button"
          onClick={onDelete}
          className={cn(
            "flex-1 inline-flex items-center justify-center gap-1.5 h-8 type-label",
            "text-ink-muted hover:text-[color:var(--status-error)] hover:bg-[color:var(--status-error-bg)] transition-colors rounded-sm",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marigold focus-visible:ring-offset-2"
          )}
        >
          <Trash2 className="h-3 w-3" />
          Delete
        </button>
      </div>
    </article>
  );
}
