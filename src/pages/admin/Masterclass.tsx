import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/lib/database.types";
import { cn } from "@/lib/utils";
import {
  CALENDAR_HOUR_HEIGHT,
  getCalendarBlockPosition,
} from "@/lib/masterclassCalendar";

type MasterclassParticipant =
  Database["public"]["Tables"]["masterclass_participants"]["Row"] & {
    events?: { title: string; status: "upcoming" | "ongoing" | "completed" };
  };

type MasterclassEvent = Pick<
  Database["public"]["Tables"]["events"]["Row"],
  "id" | "title" | "event_schedule" | "event_duration"
>;

type AvailableSlot = { slot_start: string; slot_end: string };

function jakartaDate(value: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date(value));
}

function formatTimeRange(slot: AvailableSlot) {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Jakarta",
  });
  return `${formatter.format(new Date(slot.slot_start))}–${formatter.format(new Date(slot.slot_end))} WIB`;
}

function jakartaMinutes(value: string) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: "Asia/Jakarta",
  }).formatToParts(new Date(value));
  const hour = Number(parts.find((part) => part.type === "hour")?.value || 0);
  const minute = Number(parts.find((part) => part.type === "minute")?.value || 0);
  return hour * 60 + minute;
}

/**
 * AdminMasterclass — each row is one requested masterclass date. A
 * multi-date registration therefore remains schedulable and auditable here.
 */
export function AdminMasterclass() {
  const [participants, setParticipants] = useState<MasterclassParticipant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortByTime, setSortByTime] = useState(true);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [masterclassEvents, setMasterclassEvents] = useState<MasterclassEvent[]>([]);
  const [isHoldFormOpen, setIsHoldFormOpen] = useState(false);
  const [holdEventId, setHoldEventId] = useState("");
  const [holdDate, setHoldDate] = useState("");
  const [holdDuration, setHoldDuration] = useState("");
  const [holdSlots, setHoldSlots] = useState("1");
  const [holdStart, setHoldStart] = useState("");
  const [holdLabel, setHoldLabel] = useState("");
  const [holdNotes, setHoldNotes] = useState("");
  const [availableHoldSlots, setAvailableHoldSlots] = useState<AvailableSlot[]>([]);
  const [holdError, setHoldError] = useState<string | null>(null);
  const [isCreatingHold, setIsCreatingHold] = useState(false);

  const selectedHoldEvent = useMemo(
    () => masterclassEvents.find((event) => event.id === holdEventId),
    [holdEventId, masterclassEvents]
  );
  const holdDates = useMemo(
    () => [...new Set((selectedHoldEvent?.event_schedule || []).map((session) => jakartaDate(session.start_at)))],
    [selectedHoldEvent]
  );

  const groupedParticipants = useMemo(() => {
    const ordered = [...participants].sort((a, b) => sortByTime
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
    fetchMasterclassEvents();
  }, []);

  useEffect(() => {
    setHoldDate("");
    setHoldDuration("");
    setHoldStart("");
    setAvailableHoldSlots([]);
  }, [holdEventId]);

  useEffect(() => {
    setHoldStart("");
  }, [holdDate, holdDuration, holdSlots]);

  useEffect(() => {
    const duration = Number(holdDuration);
    const slots = Number(holdSlots);
    if (!holdEventId || !holdDate || !duration || !slots) {
      setAvailableHoldSlots([]);
      return;
    }
    const loadAvailableSlots = async () => {
      const { data, error } = await supabase.rpc("get_masterclass_available_slots", {
        p_event_id: holdEventId,
        p_session_date: holdDate,
        p_duration_minutes: duration,
        p_number_of_slots: slots,
      });
      if (error) {
        console.error("Error loading hold availability:", error);
        setAvailableHoldSlots([]);
        return;
      }
      setAvailableHoldSlots(data || []);
    };
    loadAvailableSlots();
  }, [holdDate, holdDuration, holdEventId, holdSlots]);

  const fetchParticipants = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("masterclass_participants")
        .select(
          `
          *,
          events!inner (
            title,
            status,
            type
          )
        `
        )
        .eq("events.type", "masterclass")
        .eq("events.status", "ongoing")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setParticipants((data as MasterclassParticipant[]) || []);
    } catch (error) {
      console.error("Error fetching masterclass participants:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMasterclassEvents = async () => {
    const { data, error } = await supabase
      .from("events")
      .select("id, title, event_schedule, event_duration")
      .eq("type", "masterclass")
      .eq("status", "ongoing")
      .order("start_date", { ascending: false });
    if (error) {
      console.error("Error loading masterclass events:", error);
      return;
    }
    setMasterclassEvents((data as MasterclassEvent[]) || []);
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

  const resetHoldForm = () => {
    setHoldEventId("");
    setHoldDate("");
    setHoldDuration("");
    setHoldSlots("1");
    setHoldStart("");
    setHoldLabel("");
    setHoldNotes("");
    setAvailableHoldSlots([]);
    setHoldError(null);
  };

  const handleCreateHold = async () => {
    if (!holdEventId || !holdDate || !holdDuration || !holdStart || !holdLabel.trim()) {
      setHoldError("Choose an event, date, duration, slots, available time, and a hold label.");
      return;
    }
    try {
      setIsCreatingHold(true);
      setHoldError(null);
      const { error } = await supabase.rpc("create_masterclass_hold", {
        p_event_id: holdEventId,
        p_session_date: holdDate,
        p_preferred_start_at: holdStart,
        p_duration_minutes: Number(holdDuration),
        p_number_of_slots: Number(holdSlots),
        p_hold_label: holdLabel.trim(),
        p_hold_notes: holdNotes.trim() || null,
      });
      if (error) {
        if (error.code === "23P01") {
          setHoldStart("");
          setHoldError("That time is no longer available. Choose another time.");
          return;
        }
        throw error;
      }
      resetHoldForm();
      setIsHoldFormOpen(false);
      await fetchParticipants();
    } catch (error) {
      console.error("Error creating masterclass hold:", error);
      setHoldError(error instanceof Error ? error.message : "Unable to create the hold.");
    } finally {
      setIsCreatingHold(false);
    }
  };

  const moveToTimeSlot = async (target: MasterclassParticipant) => {
    const source = participants.find((participant) => participant.id === draggedId);
    if (!source?.preferred_start_at || !source.preferred_end_at || !target.preferred_start_at || source.id === target.id) return;
    const nextStart = target.preferred_start_at;
    const nextEnd = new Date(new Date(nextStart).getTime() + new Date(source.preferred_end_at).getTime() - new Date(source.preferred_start_at).getTime()).toISOString();
    const overlaps = participants.some((participant) => participant.id !== source.id && participant.event_id === source.event_id && participant.preferred_start_at && participant.preferred_end_at && new Date(participant.preferred_start_at) < new Date(nextEnd) && new Date(participant.preferred_end_at) > new Date(nextStart));
    if (overlaps && !window.confirm("This move overlaps another participant. Continue anyway?")) return;
    const sessionDate = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date(nextStart));
    const { error } = await supabase.from("masterclass_participants").update({ preferred_start_at: nextStart, preferred_end_at: nextEnd, session_date: sessionDate }).eq("id", source.id);
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
              Every row is one selected date. Drag a session onto another time to reschedule it.
            </p>
          </div>
          <Button type="button" onClick={() => setIsHoldFormOpen((open) => !open)}>
            <Plus className="h-4 w-4" />
            Reserve a hold
          </Button>
        </header>

        {isHoldFormOpen && (
          <section className="flex flex-col gap-5 border border-rule-hairline bg-surface-elevated p-5 lg:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <Eyebrow withRule>Schedule hold</Eyebrow>
                <p className="mt-2 type-body-sm text-ink-muted">Reserve a session for a prospective participant without creating a registration.</p>
              </div>
              <button type="button" onClick={() => { resetHoldForm(); setIsHoldFormOpen(false); }} className="type-label text-ink-muted hover:text-burgundy">Cancel</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              <Field label="Masterclass">
                <select value={holdEventId} onChange={(event) => setHoldEventId(event.target.value)} className={SELECT_CLASSES}>
                  <option value="">Select a masterclass…</option>
                  {masterclassEvents.map((event) => <option key={event.id} value={event.id}>{event.title}</option>)}
                </select>
              </Field>
              <Field label="Date">
                <select value={holdDate} onChange={(event) => setHoldDate(event.target.value)} disabled={!selectedHoldEvent?.event_schedule?.length} className={SELECT_CLASSES}>
                  <option value="">{selectedHoldEvent && !selectedHoldEvent.event_schedule?.length ? "Configure this event's dates first…" : "Select a date…"}</option>
                  {holdDates.map((date) => <option key={date} value={date}>{new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeZone: "Asia/Jakarta" }).format(new Date(`${date}T12:00:00+07:00`))}</option>)}
                </select>
              </Field>
              <Field label="Duration">
                <select value={holdDuration} onChange={(event) => setHoldDuration(event.target.value)} disabled={!selectedHoldEvent} className={SELECT_CLASSES}>
                  <option value="">Select duration…</option>
                  {(selectedHoldEvent?.event_duration || []).map((duration) => <option key={duration} value={duration}>{duration} minutes</option>)}
                </select>
              </Field>
              <Field label="Consecutive slots">
                <select value={holdSlots} onChange={(event) => setHoldSlots(event.target.value)} className={SELECT_CLASSES}>
                  {[1, 2, 3].map((slots) => <option key={slots} value={slots}>{slots}</option>)}
                </select>
              </Field>
              <Field label="Time">
                <select value={holdStart} onChange={(event) => setHoldStart(event.target.value)} disabled={!holdDate || !holdDuration} className={SELECT_CLASSES}>
                  <option value="">Select an available time…</option>
                  {availableHoldSlots.map((slot) => <option key={slot.slot_start} value={slot.slot_start}>{formatTimeRange(slot)}</option>)}
                </select>
              </Field>
              <Field label="Hold for">
                <Input value={holdLabel} onChange={(event) => setHoldLabel(event.target.value)} placeholder="e.g. Maya Tan — pending confirmation" variant="boxed" />
              </Field>
            </div>
            <Field label="Internal note · optional">
              <textarea value={holdNotes} onChange={(event) => setHoldNotes(event.target.value)} className="min-h-20 w-full border border-burgundy/20 bg-surface-canvas-warm px-3 py-2 text-body-sm text-ink-body focus:outline-none focus:border-marigold focus:ring-2 focus:ring-marigold/20" placeholder="Reason for the reservation, expiry, or follow-up details" />
            </Field>
            {holdError && <p className="type-body-sm text-[color:var(--status-error)]">{holdError}</p>}
            <div className="flex justify-end">
              <Button type="button" onClick={handleCreateHold} disabled={isCreatingHold}>{isCreatingHold ? "Reserving…" : "Reserve hold"}</Button>
            </div>
          </section>
        )}

        <section className="bg-surface-elevated border border-rule-hairline p-5 lg:p-6">
          <div className="flex flex-col gap-1">
            <Eyebrow withRule>Schedule calendar</Eyebrow>
            <p className="type-caption text-ink-muted">WIB day view with scheduled sessions, reserved holds, and configured unavailable times.</p>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 type-caption text-ink-muted">
            <CalendarLegend className="bg-burgundy/15" label="Registration" />
            <CalendarLegend className="bg-marigold/50" label="Reserved hold" />
            <CalendarLegend className="border border-burgundy/15 bg-surface-canvas-warm" label="Unavailable" />
            <CalendarLegend className="border border-dashed border-ink-muted/40 bg-ink-muted/10" label="Automatic break" />
          </div>
          <div className="mt-5 flex flex-col gap-6">
            {masterclassEvents.map((event) => (
              <MasterclassDayCalendar key={event.id} event={event} participants={participants.filter((participant) => participant.event_id === event.id)} />
            ))}
            {masterclassEvents.length === 0 && <p className="py-10 text-center type-body-sm text-ink-muted">No ongoing masterclass schedule.</p>}
          </div>
        </section>

        <section className="bg-surface-elevated border border-rule-hairline overflow-hidden">
          <p className="px-5 pt-3 type-caption text-ink-muted lg:hidden">
            Swipe horizontally to view all columns and actions.
          </p>
          <div className="overflow-x-auto overscroll-x-contain pb-2">
          <table className="min-w-[52rem] w-full">
            <thead className="bg-surface-canvas-warm border-b border-rule-hairline">
              <tr>
                <Th>Event</Th>
                <Th>Participant</Th>
                <Th>Date</Th>
                <Th>
                  <button type="button" onClick={() => setSortByTime((value) => !value)} className="hover:text-burgundy transition-colors">
                    Time slot {sortByTime ? "↑" : "↓"}
                  </button>
                </Th>
                <Th>Slots</Th>
                <Th className="sticky right-0 z-20 bg-surface-canvas-warm text-right">Actions</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rule-hairline">
              {isLoading ? (
                <TableMessageRow colSpan={6}>Loading participants…</TableMessageRow>
              ) : Object.keys(groupedParticipants).length === 0 ? (
                <TableMessageRow colSpan={6}>
                  No masterclass participants registered yet.
                </TableMessageRow>
              ) : (
                Object.entries(groupedParticipants).flatMap(([eventTitle, eventParticipants]) => [
                  <tr key={`group-${eventTitle}`} className="bg-surface-canvas-warm">
                    <td colSpan={6} className="px-5 py-2 type-label text-burgundy">{eventTitle}</td>
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
                    <Td className="text-burgundy font-medium">
                      <div className="flex flex-col gap-1">
                        <span>{participant.is_hold ? participant.hold_label || participant.name : participant.name}</span>
                        {participant.is_hold && <span className="type-caption text-marigold">Reserved hold{participant.hold_notes ? ` · ${participant.hold_notes}` : ""}</span>}
                      </div>
                    </Td>
                    <Td className="text-ink-muted">
                      {participant.session_date
                        ? new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeZone: "Asia/Jakarta" }).format(new Date(`${participant.session_date}T12:00:00+07:00`))
                        : "—"}
                    </Td>
                    <Td className="text-ink-muted">
                      {participant.preferred_start_at && participant.preferred_end_at
                        ? `${new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" }).format(new Date(participant.preferred_start_at))}–${new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" }).format(new Date(participant.preferred_end_at))} WIB`
                        : "Not scheduled"}
                    </Td>
                    <Td className="text-ink-muted">{participant.number_of_slots || 1}</Td>
                    <Td className="sticky right-0 z-10 bg-surface-elevated text-right">
                      <div className="inline-flex items-center gap-1">
                        <IconAction
                          destructive
                          label={participant.is_hold ? "Release hold" : "Delete"}
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
        </section>
      </div>
    </AdminLayout>
  );
}

function formatWindow(value: string) {
  return new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Jakarta" }).format(new Date(value));
}

function formatDateForTimeline(value: string) {
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeZone: "Asia/Jakarta" }).format(new Date(`${value}T12:00:00+07:00`));
}

function CalendarLegend({ className, label }: { className: string; label: string }) {
  return <span className="inline-flex items-center gap-2"><span className={cn("h-3 w-3", className)} />{label}</span>;
}

function MasterclassDayCalendar({ event, participants }: { event: MasterclassEvent; participants: MasterclassParticipant[] }) {
  const windows = [...(event.event_schedule || [])].sort((a, b) => a.start_at.localeCompare(b.start_at));
  if (windows.length === 0) return null;
  const calendarStart = Math.floor(Math.min(...windows.map((window) => jakartaMinutes(window.start_at))) / 60) * 60;
  const calendarEnd = Math.ceil(Math.max(...windows.map((window) => jakartaMinutes(window.end_at))) / 60) * 60;
  const calendarHeight = ((calendarEnd - calendarStart) / 60) * CALENDAR_HOUR_HEIGHT;
  const ticks = Array.from({ length: Math.floor((calendarEnd - calendarStart) / 60) + 1 }, (_, index) => calendarStart + index * 60);
  const columns = `5rem repeat(${windows.length}, minmax(15rem, 1fr))`;

  return (
    <article className="overflow-hidden border border-rule-hairline bg-surface-canvas-warm">
      <div className="border-b border-rule-hairline px-4 py-3">
        <p className="type-label text-burgundy">{event.title}</p>
      </div>
      <div className="max-w-full overflow-x-auto overscroll-x-contain">
        <div className="grid min-w-max" style={{ gridTemplateColumns: columns, width: `max(100%, ${80 + windows.length * 240}px)` }}>
          <div className="sticky left-0 z-30 border-b border-r border-rule-hairline bg-surface-elevated" />
          {windows.map((window) => {
            const date = jakartaDate(window.start_at);
            return (
              <div key={`header-${date}`} className="sticky top-0 z-20 border-b border-r border-rule-hairline bg-surface-elevated px-3 py-3 text-center last:border-r-0">
                <p className="type-label text-burgundy">{formatDateForTimeline(date)}</p>
                <p className="mt-0.5 type-caption text-ink-muted">{formatWindow(window.start_at)}–{formatWindow(window.end_at)} WIB</p>
              </div>
            );
          })}

          <div className="sticky left-0 z-20 border-r border-rule-hairline bg-surface-elevated" style={{ height: calendarHeight }}>
            {ticks.map((minute, index) => (
              <span key={minute} className="absolute right-3 type-caption tabular-nums text-ink-muted" style={{ top: Math.min((minute - calendarStart) / 60 * CALENDAR_HOUR_HEIGHT, calendarHeight - 16), transform: index === 0 ? "none" : "translateY(-50%)" }}>{formatMinuteOfDay(minute)}</span>
            ))}
          </div>

          {windows.map((window) => {
            const date = jakartaDate(window.start_at);
            const windowStart = jakartaMinutes(window.start_at);
            const windowEnd = jakartaMinutes(window.end_at);
            const scheduled = participants.filter((participant) => participant.session_date === date && participant.preferred_start_at && participant.preferred_end_at).sort((a, b) => (a.preferred_start_at || "").localeCompare(b.preferred_start_at || ""));
            const automaticBreaks = buildAutomaticBreaks(window, event.event_duration?.length === 1 ? event.event_duration[0] : null);
            return (
              <div key={`day-${date}`} className="relative border-r border-rule-hairline bg-surface-elevated last:border-r-0" style={{ height: calendarHeight }}>
                {ticks.map((minute) => <div key={minute} className="absolute inset-x-0 border-t border-rule-hairline" style={{ top: (minute - calendarStart) / 60 * CALENDAR_HOUR_HEIGHT }} />)}
                {windowStart > calendarStart && <div className="absolute inset-x-0 bg-surface-canvas-warm/80" style={{ top: 0, height: (windowStart - calendarStart) / 60 * CALENDAR_HOUR_HEIGHT }} />}
                {windowEnd < calendarEnd && <div className="absolute inset-x-0 bg-surface-canvas-warm/80" style={{ top: (windowEnd - calendarStart) / 60 * CALENDAR_HOUR_HEIGHT, bottom: 0 }} />}
                {(window.unavailable_blocks || []).map((block, index) => {
                  const start = jakartaMinutes(block.start_at);
                  const end = jakartaMinutes(block.end_at);
                  return (
                    <div key={`${block.start_at}-${index}`} className="absolute inset-x-2 z-10 overflow-hidden border border-burgundy/15 bg-surface-canvas-warm px-2 py-1 text-ink-muted" style={getCalendarBlockPosition(start, end, calendarStart)} title={`${block.label || "Unavailable"} · ${formatWindow(block.start_at)}–${formatWindow(block.end_at)} WIB`}>
                      <p className="type-label truncate">{block.label || "Unavailable"}</p>
                      <p className="type-caption tabular-nums">{formatWindow(block.start_at)}–{formatWindow(block.end_at)}</p>
                    </div>
                  );
                })}
                {automaticBreaks.map((block, index) => (
                  <div key={`break-${block.start}-${index}`} className="absolute inset-x-2 z-10 flex items-center overflow-hidden border border-dashed border-ink-muted/40 bg-ink-muted/10 px-2 text-ink-muted" style={getCalendarBlockPosition(block.start, block.end, calendarStart)} title={`Automatic break · ${formatMinuteOfDay(block.start)}–${formatMinuteOfDay(block.end)} WIB`}>
                    <p className="truncate text-[10px] leading-none tabular-nums">Break · {formatMinuteOfDay(block.start)}–{formatMinuteOfDay(block.end)}</p>
                  </div>
                ))}
                {scheduled.map((participant) => {
                  const start = jakartaMinutes(participant.preferred_start_at!);
                  const end = jakartaMinutes(participant.preferred_end_at!);
                  return (
                    <div key={participant.id} className={cn("absolute inset-x-2 z-20 overflow-hidden border-l-4 px-2 py-1.5 text-burgundy shadow-sm", participant.is_hold ? "border-marigold bg-marigold/50" : "border-burgundy bg-burgundy/15")} style={getCalendarBlockPosition(start, end, calendarStart)} title={`${participant.is_hold ? "Reserved hold" : "Registration"} · ${formatWindow(participant.preferred_start_at!)}–${formatWindow(participant.preferred_end_at!)} WIB`}>
                      <p className="type-label truncate">{participant.is_hold ? participant.hold_label || participant.name : participant.name}</p>
                      <p className="type-caption tabular-nums">{formatWindow(participant.preferred_start_at!)}–{formatWindow(participant.preferred_end_at!)} · {participant.number_of_slots || 1} slot{(participant.number_of_slots || 1) === 1 ? "" : "s"}</p>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </article>
  );
}

function formatMinuteOfDay(minutes: number) {
  const normalized = ((minutes % (24 * 60)) + 24 * 60) % (24 * 60);
  return `${String(Math.floor(normalized / 60)).padStart(2, "0")}:${String(normalized % 60).padStart(2, "0")}`;
}

function buildAutomaticBreaks(
  window: NonNullable<MasterclassEvent["event_schedule"]>[number],
  duration: number | null
) {
  const afterSlots = window.break_after_slots || 0;
  const breakMinutes = window.break_duration_minutes || 0;
  if (!duration || afterSlots <= 0 || breakMinutes <= 0) return [];
  const windowStart = jakartaMinutes(window.start_at);
  const windowEnd = jakartaMinutes(window.end_at);
  const unavailable = (window.unavailable_blocks || []).map((block) => ({ start: jakartaMinutes(block.start_at), end: jakartaMinutes(block.end_at) })).sort((a, b) => a.start - b.start);
  const segments: { start: number; end: number }[] = [];
  let segmentStart = windowStart;
  unavailable.forEach((block) => {
    if (block.start > segmentStart) segments.push({ start: segmentStart, end: Math.min(block.start, windowEnd) });
    segmentStart = Math.max(segmentStart, block.end);
  });
  if (segmentStart < windowEnd) segments.push({ start: segmentStart, end: windowEnd });
  return segments.flatMap((segment) => {
    const blocks: { start: number; end: number }[] = [];
    let start = segment.start + duration * afterSlots;
    while (start < segment.end) {
      const end = Math.min(start + breakMinutes, segment.end);
      blocks.push({ start, end });
      start = end + duration * afterSlots;
    }
    return blocks;
  });
}

const SELECT_CLASSES = "h-11 w-full appearance-none border border-burgundy/20 bg-surface-canvas-warm px-3 text-body-sm text-ink-body focus:outline-none focus:border-marigold focus:ring-2 focus:ring-marigold/20 disabled:cursor-not-allowed disabled:opacity-50";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="flex flex-col gap-2"><Label>{label}</Label>{children}</div>;
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
