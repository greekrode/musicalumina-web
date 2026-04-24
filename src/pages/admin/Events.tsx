import { useEffect, useState } from "react";
import { Pencil, Ticket, Trash2 } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Badge, type BadgeStatus } from "@/components/ui/badge";
import { Eyebrow } from "@/components/ui/eyebrow";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/lib/database.types";
import { AddEventModal } from "@/components/admin/AddEventModal";
import { EditEventModal } from "@/components/admin/EditEventModal";
import InvitationCodesModal from "@/components/admin/InvitationCodesModal";
import { cn } from "@/lib/utils";

type Event = Database["public"]["Tables"]["events"]["Row"];

/**
 * AdminEvents — table of every event with inline edit, invitation code
 * management, and delete actions. Desktop shows the full table; narrow
 * viewports collapse to card stack. Supabase wiring + modal triggers
 * unchanged.
 */
export function AdminEvents() {
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [invitationCodesEvent, setInvitationCodesEvent] =
    useState<Event | null>(null);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .order("start_date", { ascending: false });
      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error("Error fetching events:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AdminLayout>
      <div className="flex flex-col gap-8">
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div className="flex flex-col gap-2">
            <Eyebrow withRule>Manage · Events</Eyebrow>
            <h1 className="type-display-md text-burgundy">Events</h1>
            <p className="type-body-sm text-ink-muted">
              {events.length} {events.length === 1 ? "event" : "events"} in the
              calendar.
            </p>
          </div>
          <Button onClick={() => setIsAddModalOpen(true)}>Add Event</Button>
        </header>

        {/* Desktop table */}
        <div className="hidden lg:block bg-surface-elevated border border-rule-hairline overflow-hidden">
          <table className="min-w-full">
            <thead className="bg-surface-canvas-warm border-b border-rule-hairline">
              <tr>
                <Th>Title</Th>
                <Th>Type</Th>
                <Th>Status</Th>
                <Th>Date</Th>
                <Th>Location</Th>
                <Th className="text-right">Quota</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rule-hairline">
              {isLoading ? (
                <TableMessageRow colSpan={7}>Loading events…</TableMessageRow>
              ) : events.length === 0 ? (
                <TableMessageRow colSpan={7}>
                  No events yet. Use <strong>Add Event</strong> to create one.
                </TableMessageRow>
              ) : (
                events.map((event) => (
                  <tr
                    key={event.id}
                    className="hover:bg-surface-canvas-warm/40 transition-colors"
                  >
                    <Td className="text-burgundy font-medium">
                      {event.title}
                    </Td>
                    <Td>{titleCase(event.type)}</Td>
                    <Td>
                      <StatusBadge status={event.status} />
                    </Td>
                    <Td>{formatEventDates(event)}</Td>
                    <Td>{event.location}</Td>
                    <Td className="text-right">
                      {event.max_quota
                        ? event.max_quota.toLocaleString()
                        : "—"}
                    </Td>
                    <Td className="text-right">
                      <div className="inline-flex items-center gap-1">
                        <IconAction
                          onClick={() => setEditingEvent(event)}
                          label="Edit"
                          icon={<Pencil className="h-3.5 w-3.5" />}
                        />
                        <IconAction
                          onClick={() => setInvitationCodesEvent(event)}
                          label="Invite codes"
                          icon={<Ticket className="h-3.5 w-3.5" />}
                        />
                        <IconAction
                          destructive
                          label="Delete"
                          icon={<Trash2 className="h-3.5 w-3.5" />}
                        />
                      </div>
                    </Td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="lg:hidden flex flex-col gap-3">
          {isLoading ? (
            <EmptyCard>Loading events…</EmptyCard>
          ) : events.length === 0 ? (
            <EmptyCard>
              No events yet. Use <strong>Add Event</strong> to create one.
            </EmptyCard>
          ) : (
            events.map((event) => (
              <article
                key={event.id}
                className="bg-surface-elevated border border-rule-hairline p-4 flex flex-col gap-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 className="type-title-md text-burgundy leading-tight text-balance flex-1">
                    {event.title}
                  </h3>
                  <StatusBadge status={event.status} />
                </div>
                <dl className="grid grid-cols-2 gap-3 type-caption">
                  <div>
                    <dt className="type-label text-ink-muted">Type</dt>
                    <dd className="text-burgundy mt-0.5">
                      {titleCase(event.type)}
                    </dd>
                  </div>
                  <div>
                    <dt className="type-label text-ink-muted">Date</dt>
                    <dd className="text-burgundy mt-0.5">
                      {formatEventDates(event)}
                    </dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="type-label text-ink-muted">Location</dt>
                    <dd className="text-burgundy mt-0.5">{event.location}</dd>
                  </div>
                  <div>
                    <dt className="type-label text-ink-muted">Quota</dt>
                    <dd className="text-burgundy mt-0.5">
                      {event.max_quota
                        ? event.max_quota.toLocaleString()
                        : "Unlimited"}
                    </dd>
                  </div>
                </dl>
                <div className="flex gap-2 pt-2 border-t border-rule-hairline">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => setEditingEvent(event)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => setInvitationCodesEvent(event)}
                  >
                    Codes
                  </Button>
                  <Button variant="destructive" size="sm" className="flex-1">
                    Delete
                  </Button>
                </div>
              </article>
            ))
          )}
        </div>
      </div>

      <AddEventModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onEventAdded={fetchEvents}
      />

      <EditEventModal
        isOpen={!!editingEvent}
        onClose={() => setEditingEvent(null)}
        onEventUpdated={fetchEvents}
        event={editingEvent}
      />

      <InvitationCodesModal
        isOpen={!!invitationCodesEvent}
        onClose={() => setInvitationCodesEvent(null)}
        eventId={invitationCodesEvent?.id || ""}
        eventTitle={invitationCodesEvent?.title || ""}
      />
    </AdminLayout>
  );
}

/* ============================================================================
   Editorial table primitives — shared across admin list pages.
   ============================================================================ */

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

function EmptyCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-surface-elevated border border-rule-hairline p-6 text-center type-body-sm text-ink-muted">
      {children}
    </div>
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

/* ============================================================================
   Small helpers
   ============================================================================ */

function titleCase(value: string): string {
  return value
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function formatEventDates(event: Event): string {
  if (event.event_date && event.event_date.length > 0) {
    return event.event_date
      .map((d) => new Date(d).toLocaleDateString())
      .join(", ");
  }
  return new Date(event.start_date).toLocaleDateString();
}

function StatusBadge({ status }: { status: string }) {
  const mapping: Record<string, BadgeStatus> = {
    upcoming: "upcoming",
    ongoing: "open",
    completed: "ended",
  };
  const badgeStatus = mapping[status] ?? "closed";
  return (
    <Badge status={badgeStatus} dot size="sm">
      {status}
    </Badge>
  );
}
