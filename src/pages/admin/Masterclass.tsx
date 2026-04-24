import { useEffect, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/lib/database.types";
import { NoteGlyph } from "@/components/ui/wireframe-wave";
import { cn } from "@/lib/utils";

type MasterclassParticipant =
  Database["public"]["Tables"]["masterclass_participants"]["Row"] & {
    events?: { title: string };
  };

/**
 * AdminMasterclass — table of every masterclass participant registered
 * across events. Delete action wired to the existing Supabase row delete.
 * Add is still a placeholder (same as original).
 */
export function AdminMasterclass() {
  const [participants, setParticipants] = useState<MasterclassParticipant[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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
            title
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
              {participants.length}{" "}
              {participants.length === 1 ? "participant" : "participants"} across
              all masterclass events.
            </p>
          </div>
          <Button variant="elegant">Add Participant</Button>
        </header>

        <div className="bg-surface-elevated border border-rule-hairline overflow-hidden">
          <table className="min-w-full">
            <thead className="bg-surface-canvas-warm border-b border-rule-hairline">
              <tr>
                <Th>Event</Th>
                <Th>Name</Th>
                <Th>Repertoire</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rule-hairline">
              {isLoading ? (
                <TableMessageRow colSpan={4}>Loading participants…</TableMessageRow>
              ) : participants.length === 0 ? (
                <TableMessageRow colSpan={4}>
                  No masterclass participants registered yet.
                </TableMessageRow>
              ) : (
                participants.map((participant) => (
                  <tr
                    key={participant.id}
                    className="hover:bg-surface-canvas-warm/40 transition-colors align-top"
                  >
                    <Td className="text-ink-muted">
                      {participant.events?.title ?? "—"}
                    </Td>
                    <Td className="text-burgundy font-medium">
                      {participant.name}
                    </Td>
                    <td className="px-5 py-3 type-body-sm">
                      <ul className="flex flex-col gap-1.5">
                        {participant.repertoire.map((piece, index) => (
                          <li
                            key={index}
                            className="flex items-start gap-2 text-ink-body"
                          >
                            <NoteGlyph
                              size={12}
                              className="text-marigold mt-0.5 flex-shrink-0"
                            />
                            <span>{piece}</span>
                          </li>
                        ))}
                      </ul>
                    </td>
                    <Td className="text-right">
                      <div className="inline-flex items-center gap-1">
                        <IconAction
                          label="Edit"
                          icon={<Pencil className="h-3.5 w-3.5" />}
                        />
                        <IconAction
                          destructive
                          label="Delete"
                          icon={<Trash2 className="h-3.5 w-3.5" />}
                          onClick={() => handleDelete(participant.id)}
                        />
                      </div>
                    </Td>
                  </tr>
                ))
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
