import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import {
  CircleAlert,
  CircleCheck,
  CircleDashed,
  Clock,
  GraduationCap,
  Loader2,
  type LucideIcon,
  MailCheck,
  PenLine,
  Send,
  User,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Badge, type BadgeStatus } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { invokeRemarksSheets, supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

type EventOption = { id: string; title: string };
type JudgeStatus = "final" | "draft" | "none";
type RegistrantType = "teacher" | "parents" | "personal";
type Participant = {
  registrationId: string;
  name: string;
  category: string;
  song: string;
  /** Per judge, in Status.judges order. */
  judgeStatus: JudgeStatus[];
  sentAt: string | null;
};
type Registrant = {
  email: string;
  type: RegistrantType;
  name: string;
  participants: Participant[];
  ready: boolean;
  sentAt: string | null;
  resentAt: string | null;
  lastError: { at: string; message: string } | null;
};
type Status = { judges: string[]; registrants: Registrant[]; unknownJudges: string[] };
type TestResult = { sent: string[]; failed: { email: string; error: string }[] };

/** While a background send runs, refresh the list this often (and stop after the cap). */
const POLL_MS = 10_000;
const POLL_MAX_MS = 20 * 60_000;

const SELECT_CLASSES =
  "h-11 px-3 py-2 rounded-sm border border-burgundy/20 bg-surface-elevated font-sans text-body-sm text-ink-body focus:outline-none focus:border-marigold focus:ring-2 focus:ring-marigold/20";

/** YYYY-MM-DD in Jakarta time (en-CA formats dates that way). */
const jakartaDay = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" });

const jakartaTime = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Jakarta",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

const TYPE_META: Record<RegistrantType, { label: string; icon: LucideIcon }> = {
  teacher: { label: "Teacher", icon: GraduationCap },
  parents: { label: "Parent", icon: Users },
  personal: { label: "Personal", icon: User },
};

const JUDGE_META: Record<JudgeStatus, { label: string; status: BadgeStatus; icon: LucideIcon }> = {
  final: { label: "Finalized", status: "open", icon: CircleCheck },
  draft: { label: "Not finalized", status: "upcoming", icon: PenLine },
  none: { label: "No remarks", status: "closed", icon: CircleDashed },
};

/** A sheet can go out once every judge's remarks are finalized. */
function isSendable(p: Participant): boolean {
  return p.judgeStatus.every((s) => s === "final");
}

/** Recipient-level status pill, plus resend / error detail under it. */
function RecipientStatus({ r }: { r: Registrant }) {
  if (r.sentAt) {
    return (
      <div className="flex flex-col gap-1">
        <Badge size="sm" status="open" className="normal-case tracking-normal w-fit">
          <MailCheck className="h-3.5 w-3.5" aria-hidden />
          Sent
        </Badge>
        <span className="type-caption text-ink-muted whitespace-nowrap">{jakartaTime.format(new Date(r.sentAt))}</span>
        {r.resentAt && (
          <span className="type-caption text-ink-muted whitespace-nowrap">Resent {jakartaTime.format(new Date(r.resentAt))}</span>
        )}
      </div>
    );
  }
  if (r.ready && r.lastError) {
    return (
      <div className="flex flex-col gap-1 max-w-56">
        <Badge size="sm" status="error" className="normal-case tracking-normal w-fit">
          <CircleAlert className="h-3.5 w-3.5" aria-hidden />
          Failed
        </Badge>
        <span className="type-caption text-[color:var(--status-error)]">{r.lastError.message}</span>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-1">
      {r.ready ? (
        <Badge size="sm" status="upcoming" className="normal-case tracking-normal w-fit">
          <Send className="h-3.5 w-3.5" aria-hidden />
          Ready
        </Badge>
      ) : (
        <Badge size="sm" status="closed" className="normal-case tracking-normal w-fit">
          <Clock className="h-3.5 w-3.5" aria-hidden />
          Waiting
        </Badge>
      )}
      {r.resentAt && (
        <span className="type-caption text-ink-muted whitespace-nowrap">Partly sent {jakartaTime.format(new Date(r.resentAt))}</span>
      )}
    </div>
  );
}

/**
 * AdminRemarksSheets — emails each registrant their adjudicator remarks PDFs
 * (one per participant + category) via the remarks-sheets edge function.
 * One email per registrant email + type (teacher / parents / personal), with
 * every sheet attached as a PDF. A recipient becomes ready once both judges'
 * scores, with remarks, are finalized for every one of its registrations.
 * "Send test" works any time: it mails one recipient's email (the ready one
 * with the longest remarks, else the first with sample remarks) to the given
 * address only. "Send to all ready" queues every ready recipient on the
 * server (sent in the background, each once); the page only polls progress.
 */
export default function AdminRemarksSheets() {
  const [events, setEvents] = useState<EventOption[]>([]);
  const [eventId, setEventId] = useState("");
  const [status, setStatus] = useState<Status | null>(null);
  const [loadError, setLoadError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [backgroundSince, setBackgroundSince] = useState<number | null>(null);
  // Resend panel: which recipient is open and which of its participants are ticked.
  const [resendKey, setResendKey] = useState<string | null>(null);
  const [resendIds, setResendIds] = useState<string[]>([]);
  const [isResending, setIsResending] = useState(false);

  function openResend(r: Registrant) {
    const key = `${r.email} ${r.type}`;
    if (resendKey === key) {
      setResendKey(null);
      return;
    }
    setResendKey(key);
    setResendIds(r.participants.filter(isSendable).map((p) => p.registrationId));
  }

  async function resend(r: Registrant) {
    setIsResending(true);
    try {
      const result = await invokeRemarksSheets<TestResult>({
        action: "resend",
        eventId,
        email: r.email,
        type: r.type,
        registrationIds: resendIds,
      });
      if (result.sent.length) {
        toast.success(`Sent ${resendIds.length} sheet${resendIds.length === 1 ? "" : "s"} to ${r.email}`);
        setResendKey(null);
      } else {
        toast.error(`Failed: ${result.failed[0]?.error ?? "unknown error"}`);
      }
      load(eventId, true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    } finally {
      setIsResending(false);
    }
  }

  // Only events happening within a week either side of today (Jakarta dates):
  // remarks go out right after an event, so older and later ones are noise.
  useEffect(() => {
    supabase
      .from("events")
      .select("id, title, start_date, event_date")
      .order("start_date", { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          toast.error("Failed to load events");
          return;
        }
        const dayMs = 24 * 60 * 60 * 1000;
        const from = jakartaDay.format(new Date(Date.now() - 7 * dayMs));
        const to = jakartaDay.format(new Date(Date.now() + 7 * dayMs));
        const rows = (data || []).filter((e) => {
          const days = (Array.isArray(e.event_date) && e.event_date.length ? e.event_date : [e.start_date])
            .filter(Boolean)
            .map((d) => String(d).slice(0, 10));
          return days.some((d) => d >= from && d <= to);
        });
        setEvents(rows.map(({ id, title }) => ({ id, title })));
        setEventId((prev) => prev || rows[0]?.id || "");
      });
  }, []);

  // One request returns judges, template check and every registrant's data
  // together. Only the latest request may update the page, so a slow answer
  // for a previously selected event can never overwrite the current one.
  const latestLoad = useRef(0);
  const load = useCallback(async (id: string, quiet = false) => {
    const seq = ++latestLoad.current;
    if (!quiet) {
      setIsLoading(true);
      setLoadError("");
      setStatus(null);
    }
    try {
      const next = await invokeRemarksSheets<Status>({ action: "status", eventId: id });
      if (seq !== latestLoad.current) return;
      setStatus(next);
      setLoadError("");
    } catch (error) {
      if (seq !== latestLoad.current || quiet) return;
      setStatus(null);
      setLoadError(error instanceof Error ? error.message : String(error));
    } finally {
      if (seq === latestLoad.current) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    setBackgroundSince(null);
    setResendKey(null);
    if (eventId) load(eventId);
  }, [eventId, load]);

  const registrants = status?.registrants ?? [];
  const sentCount = registrants.filter((r) => r.sentAt).length;
  const readyCount = registrants.filter((r) => r.ready && !r.sentAt).length;
  const waitingCount = registrants.filter((r) => !r.ready).length;
  const failedCount = registrants.filter((r) => r.ready && !r.sentAt && r.lastError).length;
  // Still working while some ready recipient has neither been sent nor failed since the run started.
  const isBackgroundRunning =
    backgroundSince !== null &&
    Date.now() - backgroundSince < POLL_MAX_MS &&
    registrants.some((r) => r.ready && !r.sentAt && !(r.lastError && new Date(r.lastError.at).getTime() >= backgroundSince));

  useEffect(() => {
    if (!isBackgroundRunning) return;
    const timer = window.setInterval(() => load(eventId, true), POLL_MS);
    return () => window.clearInterval(timer);
  }, [isBackgroundRunning, eventId, load]);

  async function sendTest() {
    setIsSending(true);
    try {
      const result = await invokeRemarksSheets<TestResult>({ action: "send-test", eventId, testEmail });
      if (result.sent.length) toast.success(`Test email sent to ${testEmail} (sheets of ${result.sent[0]})`);
      else if (result.failed.length) toast.error(`Test failed: ${result.failed[0].error}`);
      else toast.error("No registrants for this event");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    } finally {
      setIsSending(false);
    }
  }

  async function sendAll() {
    if (!window.confirm(`Email remarks to ${readyCount} recipient${readyCount === 1 ? "" : "s"}? Each is only emailed once.`)) return;
    setIsSending(true);
    try {
      const { queued } = await invokeRemarksSheets<{ queued: number }>({ action: "send-all", eventId });
      setBackgroundSince(Date.now());
      toast.success(`Sending ${queued} email${queued === 1 ? "" : "s"} in the background. You can close this page.`);
      load(eventId, true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    } finally {
      setIsSending(false);
    }
  }

  return (
    <AdminLayout>
      <div className="flex flex-col gap-8">
        <header className="flex flex-col gap-2">
          <Eyebrow withRule>Manage · Remarks Sheets</Eyebrow>
          <h1 className="type-display-md text-burgundy">Remarks Sheets</h1>
          <p className="type-body-sm text-ink-muted max-w-2xl">
            Emails each registrant a thank-you note with the jury comment sheets attached as PDFs, one
            per participant and category. Someone registered as both teacher and parent gets one
            email for each role. A recipient is ready once both judges' scores (with remarks) are
            finalized for all of its participants, and is only emailed once. Send a test to yourself
            first: it uses the ready recipient with the longest remarks, or sample remarks before any
            scores are finalized.
          </p>
        </header>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <Label htmlFor="remarks-event" className="sm:w-24">Event</Label>
          <select
            id="remarks-event"
            className={cn(SELECT_CLASSES, "min-w-[20rem]")}
            value={eventId}
            onChange={(e) => setEventId(e.target.value)}
            disabled={events.length === 0 || isSending}
          >
            {events.length === 0 ? (
              <option value="">No events within 7 days of today</option>
            ) : (
              events.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.title}
                </option>
              ))
            )}
          </select>
        </div>

        {loadError && <p className="type-body-sm text-[color:var(--status-error)]">{loadError}</p>}

        {status && (
          <section className="bg-surface-elevated border border-rule-hairline p-6 flex flex-col gap-5">
            <p className="type-body-sm text-ink-body">
              Judges: {status.judges.join(" & ")} · {registrants.length} recipients ·{" "}
              <strong>{readyCount} ready</strong> · {waitingCount} waiting for finalized remarks · {sentCount} sent
              {failedCount > 0 && <span className="text-[color:var(--status-error)]"> · {failedCount} failed</span>}
            </p>
            {status.unknownJudges.length > 0 && (
              <p className="type-body-sm text-[color:var(--status-error)]">
                Scores from {status.unknownJudges.join(", ")} don't match a judge on the template and are ignored.
              </p>
            )}
            <div className="flex flex-col sm:flex-row sm:items-end gap-3">
              <div className="sm:w-80">
                <Label htmlFor="remarks-test-email">Test email</Label>
                <Input
                  id="remarks-test-email"
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="you@example.com"
                />
              </div>
              <Button variant="outline" onClick={sendTest} disabled={isSending || !testEmail || registrants.length === 0}>
                Send test
              </Button>
              <Button variant="elegant" onClick={sendAll} disabled={isSending || isBackgroundRunning || readyCount === 0}>
                {isSending || isBackgroundRunning ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Send className="h-4 w-4 mr-1.5" />}
                {failedCount > 0 && !isBackgroundRunning ? "Retry / send to all ready" : "Send to all ready"} ({readyCount})
              </Button>
              {isBackgroundRunning && (
                <span className="type-body-sm text-ink-muted">Sending in the background ({sentCount} sent so far). You can close this page.</span>
              )}
            </div>
          </section>
        )}

        {eventId && !loadError && (
          <section className="flex flex-col gap-3">
            <Eyebrow withRule>Registrants ({registrants.length})</Eyebrow>
            <div className="bg-surface-elevated border border-rule-hairline overflow-x-auto">
              <table className="min-w-full border-collapse type-body-sm text-ink-body">
                <thead className="bg-surface-canvas-warm">
                  <tr className="text-left font-bold">
                    <th className="px-4 py-3">Registrant</th>
                    <th className="px-4 py-3">Participant</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Judges</th>
                    <th className="px-4 py-3">Sheet</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-ink-muted">Loading…</td>
                    </tr>
                  ) : registrants.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-ink-muted">No registrants.</td>
                    </tr>
                  ) : (
                    registrants.map((r) => {
                      const key = `${r.email} ${r.type}`;
                      const sendable = r.participants.filter(isSendable);
                      const span = r.participants.length;
                      const TypeIcon = TYPE_META[r.type].icon;
                      return (
                        <Fragment key={key}>
                          {r.participants.map((p, i) => (
                            <tr
                              key={p.registrationId}
                              className={cn("align-top", i === 0 ? "border-t-2 border-rule-subtle" : "border-t border-rule-hairline")}
                            >
                              {i === 0 && (
                                <td rowSpan={span} className="px-4 py-3 border-r border-rule-hairline">
                                  <div className="w-52">
                                    <div className="font-bold text-ink-primary">{r.name}</div>
                                    <div className="type-caption text-ink-muted break-words">{r.email}</div>
                                    <Badge size="sm" className="mt-2 normal-case tracking-normal">
                                      <TypeIcon className="h-3.5 w-3.5" aria-hidden />
                                      {TYPE_META[r.type].label}
                                    </Badge>
                                  </div>
                                </td>
                              )}
                              <td className="px-4 py-3 font-medium">{p.name}</td>
                              <td className="px-4 py-3">
                                <div className="whitespace-nowrap">{p.category}</div>
                                {p.song && <div className="type-caption text-ink-muted italic">{p.song}</div>}
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex flex-col gap-1">
                                  {(status?.judges ?? []).map((judge, j) => {
                                    const meta = JUDGE_META[p.judgeStatus[j]];
                                    const JudgeIcon = meta.icon;
                                    return (
                                      <Badge
                                        key={judge}
                                        size="sm"
                                        status={meta.status}
                                        className="normal-case tracking-normal w-fit"
                                        title={`${judge}: ${meta.label}`}
                                      >
                                        <JudgeIcon className="h-3.5 w-3.5" aria-hidden />
                                        {judge.split(" ")[0]}
                                      </Badge>
                                    );
                                  })}
                                </div>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                {p.sentAt ? (
                                  <span className="inline-flex items-center gap-1.5 text-[color:var(--status-open)]">
                                    <MailCheck className="h-4 w-4" aria-hidden />
                                    {jakartaTime.format(new Date(p.sentAt))}
                                  </span>
                                ) : (
                                  <span className="text-ink-muted">Not sent</span>
                                )}
                              </td>
                              {i === 0 && (
                                <>
                                  <td rowSpan={span} className="px-4 py-3 border-l border-rule-hairline">
                                    <RecipientStatus r={r} />
                                  </td>
                                  <td rowSpan={span} className="px-4 py-3 text-right">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => openResend(r)}
                                      disabled={sendable.length === 0}
                                      title={sendable.length === 0 ? "No participant has finalized remarks yet" : undefined}
                                    >
                                      {r.sentAt || r.resentAt ? "Resend…" : "Send…"}
                                    </Button>
                                  </td>
                                </>
                              )}
                            </tr>
                          ))}
                          {resendKey === key && (
                            <tr className="bg-surface-canvas-warm">
                              <td colSpan={7} className="px-4 py-4">
                                <div className="flex flex-col gap-3">
                                  <div className="flex flex-wrap items-center gap-3">
                                    <span className="font-bold">Send to {r.email} with:</span>
                                    <button
                                      type="button"
                                      className="type-caption text-burgundy underline underline-offset-2"
                                      onClick={() => setResendIds(sendable.map((p) => p.registrationId))}
                                    >
                                      Select all
                                    </button>
                                    <button
                                      type="button"
                                      className="type-caption text-burgundy underline underline-offset-2"
                                      onClick={() => setResendIds([])}
                                    >
                                      Clear all
                                    </button>
                                  </div>
                                  {r.participants.map((p) => (
                                    <label
                                      key={p.registrationId}
                                      className={cn("inline-flex items-center gap-2", !isSendable(p) && "opacity-50")}
                                    >
                                      <input
                                        type="checkbox"
                                        className="h-4 w-4 accent-burgundy"
                                        disabled={!isSendable(p)}
                                        checked={resendIds.includes(p.registrationId)}
                                        onChange={(e) =>
                                          setResendIds((prev) =>
                                            e.target.checked
                                              ? [...prev, p.registrationId]
                                              : prev.filter((id) => id !== p.registrationId)
                                          )
                                        }
                                      />
                                      {p.name} · {p.category}
                                      {!isSendable(p) && <span className="type-caption text-ink-muted">(remarks not finalized)</span>}
                                    </label>
                                  ))}
                                  <div className="flex gap-2">
                                    <Button variant="elegant" size="sm" onClick={() => resend(r)} disabled={isResending || resendIds.length === 0}>
                                      {isResending && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
                                      Send {resendIds.length} sheet{resendIds.length === 1 ? "" : "s"}
                                    </Button>
                                    <Button variant="outline" size="sm" onClick={() => setResendKey(null)} disabled={isResending}>
                                      Cancel
                                    </Button>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap items-center gap-4 type-caption text-ink-muted">
              <span>Judges:</span>
              {(Object.keys(JUDGE_META) as JudgeStatus[]).map((s) => {
                const LegendIcon = JUDGE_META[s].icon;
                return (
                  <Badge key={s} size="sm" status={JUDGE_META[s].status} className="normal-case tracking-normal">
                    <LegendIcon className="h-3.5 w-3.5" aria-hidden />
                    {JUDGE_META[s].label}
                  </Badge>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </AdminLayout>
  );
}
