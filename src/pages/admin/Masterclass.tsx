import { useEffect, useMemo, useState } from "react";
import { Trash2 } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Eyebrow } from "@/components/ui/eyebrow";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/lib/database.types";
import { cn } from "@/lib/utils";

type MasterclassParticipant =
  Database["public"]["Tables"]["masterclass_participants"]["Row"] & {
    events?: { title: string; status: "upcoming" | "ongoing" | "completed" };
  };

/**
 * AdminMasterclass — table of every masterclass participant registered
 * across events. Delete action wired to the existing Supabase row delete.
 * Add is still a placeholder (same as original).
 */
export function AdminMasterclass() {
  const [participants, setParticipants] = useState<MasterclassParticipant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortByTime, setSortByTime] = useState(true);
  const [draggedId, setDraggedId] = useState<string | null>(null);

  const groupedParticipants = useMemo(() => {
    const ordered = participants.filter((participant) => participant.events?.status !== "upcoming").sort((a, b) => sortByTime
      ? (a.preferred_start_at || "").localeCompare(b.preferred_start_at || "")
      : a.name.localeCompare(b.name));
    return ordered.reduce<Record<string, MasterclassParticipant[]>>((groups, participant) => {
      const key = participant.events?.title || "Unknown event";
      (groups[key] ||= []).push(participant);
      return groups;
    }, {});
  }, [participants, sortByTime]);

  useEffect(() => {
    fetchParticipants();
  }, []);

  const fetchParticipants = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("masterclass_participants")
        .select(
          `
          *,
          events (
            title,
            status
          )
        `
        )
        .order("created_at", { ascending: false });
      if (error) throw error;
      setParticipants((data as MasterclassParticipant[]) || []);
    } catch (error) {
      console.error("Error fetching masterclass participants:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("masterclass_participants")
        .delete()
        .eq("id", id);
      if (error) throw error;
      await fetchParticipants();
    } catch (error) {
      console.error("Error deleting participant:", error);
    }
  };

  const moveToTimeSlot = async (target: MasterclassParticipant) => {
    const source = participants.find((participant) => participant.id === draggedId);
    if (!source?.preferred_start_at || !source.preferred_end_at || !target.preferred_start_at || source.id === target.id) return;
    const nextStart = target.preferred_start_at;
    const nextEnd = new Date(new Date(nextStart).getTime() + new Date(source.preferred_end_at).getTime() - new Date(source.preferred_start_at).getTime()).toISOString();
    const overlaps = participants.some((participant) => participant.id !== source.id && participant.event_id === source.event_id && participant.preferred_start_at && participant.preferred_end_at && new Date(participant.preferred_start_at) < new Date(nextEnd) && new Date(participant.preferred_end_at) > new Date(nextStart));
    if (overlaps && !window.confirm("This move overlaps another participant. Continue anyway?")) return;
    const { error } = await supabase.from("masterclass_participants").update({ preferred_start_at: nextStart, preferred_end_at: nextEnd }).eq("id", source.id);
    if (error) { console.error("Error moving participant:", error); return; }
    setDraggedId(null);
    fetchParticipants();
  };

  return (
    <AdminLayout>
      <div className="flex flex-col gap-8">
        <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div className="flex flex-col gap-2">
            <Eyebrow withRule>Manage · Masterclass</Eyebrow>
            <h1 className="type-display-md text-burgundy">
              Masterclass participants
            </h1>
            <p className="type-body-sm text-ink-muted">
              Schedule for ongoing and completed masterclasses. Drag a slot onto another slot to reschedule it.
            </p>
          </div>
        </header>

        <div className="bg-surface-elevated border border-rule-hairline overflow-hidden">
          <table className="min-w-full">
            <thead className="bg-surface-canvas-warm border-b border-rule-hairline">
              <tr>
                <Th>Event</Th>
                <Th>
                  <button type="button" onClick={() => setSortByTime((value) => !value)} className="hover:text-burgundy transition-colors">
                    Time slot {sortByTime ? "↑" : "↓"}
                  </button>
                </Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rule-hairline">
              {isLoading ? (
                <TableMessageRow colSpan={3}>Loading participants…</TableMessageRow>
              ) : Object.keys(groupedParticipants).length === 0 ? (
                <TableMessageRow colSpan={3}>
                  No masterclass participants registered yet.
                </TableMessageRow>
              ) : (
                Object.entries(groupedParticipants).flatMap(([eventTitle, eventParticipants]) => [
                  <tr key={`group-${eventTitle}`} className="bg-surface-canvas-warm">
                    <td colSpan={3} className="px-5 py-2 type-label text-burgundy">{eventTitle}</td>
                  </tr>,
                  ...eventParticipants.map((participant) => (
                  <tr
                    key={participant.id}
                    draggable={!!participant.preferred_start_at}
                    onDragStart={() => setDraggedId(participant.id)}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={() => moveToTimeSlot(participant)}
                    className="hover:bg-surface-canvas-warm/40 transition-colors align-top"
                  >
                    <Td className="text-ink-muted">
                      {participant.events?.title ?? "—"}
                    </Td>
                    <Td className="text-ink-muted">
                      {participant.preferred_start_at && participant.preferred_end_at
                        ? `${new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" }).format(new Date(participant.preferred_start_at))}–${new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" }).format(new Date(participant.preferred_end_at))} WIB`
                        : "Not scheduled"}
                    </Td>
                    <Td className="text-right">
                      <div className="inline-flex items-center gap-1">
                        <IconAction
                          destructive
                          label="Delete"
                          icon={<Trash2 className="h-3.5 w-3.5" />}
                          onClick={() => handleDelete(participant.id)}
                        />
                      </div>
                    </Td>
                  </tr>
                  )),
                ])
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}

/* Shared editorial table primitives (duplicated per file so each page stays
   self-contained — small enough that a shared helper file isn't warranted yet). */

function Th({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <th
      className={cn(
        "px-5 py-3 text-left type-label text-ink-muted whitespace-nowrap",
        className
      )}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <td
      className={cn(
        "px-5 py-3 type-body-sm text-ink-body whitespace-nowrap",
        className
      )}
    >
      {children}
    </td>
  );
}

function TableMessageRow({
  children,
  colSpan,
}: {
  children: React.ReactNode;
  colSpan: number;
}) {
  return (
    <tr>
      <td
        colSpan={colSpan}
        className="px-5 py-10 text-center type-body-sm text-ink-muted"
      >
        {children}
      </td>
    </tr>
  );
}

function IconAction({
  onClick,
  label,
  icon,
  destructive,
}: {
  onClick?: () => void;
  label: string;
  icon: React.ReactNode;
  destructive?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={cn(
        "h-8 w-8 flex items-center justify-center rounded-sm transition-colors duration-fast ease-out-quart",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marigold focus-visible:ring-offset-2",
        destructive
          ? "text-ink-muted hover:text-[color:var(--status-error)] hover:bg-[color:var(--status-error-bg)]"
          : "text-ink-muted hover:text-burgundy hover:bg-surface-canvas-warm"
      )}
    >
      {icon}
    </button>
  );
}
