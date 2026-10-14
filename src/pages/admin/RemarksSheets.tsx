import { useCallback, useEffect, useState } from "react";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { invokeRemarksSheets, supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

type EventOption = { id: string; title: string };
type Participant = { registrationId: string; name: string; category: string; song: string; missing: string[] };
type Registrant = {
  email: string;
  type: "teacher" | "parents" | "personal";
  name: string;
  participants: Participant[];
  ready: boolean;
  sentAt: string | null;
  lastError: { at: string; message: string } | null;
};
type Status = { judges: string[]; registrants: Registrant[]; unknownJudges: string[] };
type TestResult = { sent: string[]; failed: { email: string; error: string }[] };

/** While a background send runs, refresh the list this often (and stop after the cap). */
const POLL_MS = 10_000;
const POLL_MAX_MS = 20 * 60_000;

const SELECT_CLASSES =
  "h-11 px-3 py-2 rounded-sm border border-burgundy/20 bg-surface-elevated font-sans text-body-sm text-ink-body focus:outline-none focus:border-marigold focus:ring-2 focus:ring-marigold/20";

const jakartaTime = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Jakarta",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

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

  useEffect(() => {
    supabase
      .from("events")
      .select("id, title")
      .order("start_date", { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          toast.error("Failed to load events");
          return;
        }
        const rows = data || [];
        setEvents(rows);
        setEventId((prev) => prev || rows[0]?.id || "");
      });
  }, []);

  // quiet: refresh in place (background progress) without blanking the table.
  const load = useCallback(async (id: string, quiet = false) => {
    if (!quiet) {
      setIsLoading(true);
      setLoadError("");
      setStatus(null);
    }
    try {
      setStatus(await invokeRemarksSheets<Status>({ action: "status", eventId: id }));
    } catch (error) {
      if (!quiet) setLoadError(error instanceof Error ? error.message : String(error));
    } finally {
      if (!quiet) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    setBackgroundSince(null);
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
            {events.map((e) => (
              <option key={e.id} value={e.id}>
                {e.title}
              </option>
            ))}
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

        {eventId && (
          <section className="flex flex-col gap-3">
            <Eyebrow withRule>Registrants ({registrants.length})</Eyebrow>
            <div className="bg-surface-elevated border border-rule-hairline overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-surface-canvas-warm">
                  <tr className="text-left text-body-sm font-bold text-ink-body">
                    <th className="px-4 py-3">Registrant</th>
                    <th className="px-4 py-3">Participants</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={3} className="px-4 py-8 text-center type-body-sm text-ink-muted">Loading…</td>
                    </tr>
                  ) : registrants.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-4 py-8 text-center type-body-sm text-ink-muted">No registrants.</td>
                    </tr>
                  ) : (
                    registrants.map((r) => (
                      <tr key={`${r.email} ${r.type}`} className="border-t border-rule-hairline type-body-sm text-ink-body align-top">
                        <td className="px-4 py-3">
                          <div>{r.name}</div>
                          <div className="type-caption text-ink-muted">{r.email} · {r.type}</div>
                        </td>
                        <td className="px-4 py-3">
                          {r.participants.map((p) => (
                            <div key={p.registrationId}>
                              {p.name} · {p.category}
                              {p.missing.length > 0 && (
                                <span className="ml-2 type-caption text-ink-muted">needs {p.missing.join(", ")}</span>
                              )}
                            </div>
                          ))}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {r.sentAt ? (
                            `Sent ${jakartaTime.format(new Date(r.sentAt))}`
                          ) : r.ready && r.lastError ? (
                            <span className="text-[color:var(--status-error)] whitespace-normal" title={r.lastError.message}>
                              Failed {jakartaTime.format(new Date(r.lastError.at))}: {r.lastError.message}
                            </span>
                          ) : r.ready ? (
                            <span className="text-[color:var(--status-upcoming)]">Ready</span>
                          ) : (
                            <span className="text-ink-muted">Waiting for finalized remarks</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </AdminLayout>
  );
}
