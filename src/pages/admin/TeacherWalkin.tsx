import { useCallback, useEffect, useState } from "react";
import { Copy, Download, LocateFixed, Loader2 } from "lucide-react";
import QRCode from "qrcode";
import { toast } from "sonner";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/lib/database.types";
import { cn } from "@/lib/utils";

type ActiveEvent = { id: string; title: string; event_date: unknown };
type Customer = Database["public"]["Tables"]["customers"]["Row"];
type Submission = {
  usedAt: string;
  newCustomer: boolean;
  isTest: boolean;
  customer: Pick<Customer, "name" | "whatsapp" | "email"> | null;
};
type GateDraft = { latitude: string; longitude: string; radius: string; enabled: boolean };

const EMPTY_GATE: GateDraft = { latitude: "", longitude: "", radius: "300", enabled: true };

const SELECT_CLASSES =
  "h-11 px-3 py-2 rounded-sm border border-burgundy/20 bg-surface-elevated font-sans text-body-sm text-ink-body focus:outline-none focus:border-marigold focus:ring-2 focus:ring-marigold/20";

const jakartaDate = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Jakarta",
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric",
});
const jakartaTime = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Jakarta",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

/**
 * AdminTeacherWalkin — the walk-in teacher QR for one event. Admins set the
 * venue location and radius (teacher_walkin_gates), download the QR that
 * opens /teacher-walkin/<event id>, and see who submitted the form. The form
 * itself only opens on the event's days, inside the radius. "Start test" also
 * opens it on other days for 2 hours so the real flow can be tried early.
 */
export default function AdminTeacherWalkin() {
  const [events, setEvents] = useState<ActiveEvent[]>([]);
  const [eventId, setEventId] = useState("");
  const [gate, setGate] = useState<GateDraft>(EMPTY_GATE);
  const [hasGate, setHasGate] = useState(false);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [testUntil, setTestUntil] = useState<string | null>(null);
  const [isSettingTest, setIsSettingTest] = useState(false);

  const event = events.find((e) => e.id === eventId);
  const link = eventId ? `${window.location.origin}/teacher-walkin/${eventId}` : "";

  useEffect(() => {
    supabase
      .from("events")
      .select("id, title, event_date")
      .in("status", ["ongoing", "upcoming"])
      .order("start_date", { ascending: true })
      .then(({ data, error }) => {
        if (error) {
          toast.error("Failed to load events");
          return;
        }
        const rows = (data || []) as ActiveEvent[];
        setEvents(rows);
        setEventId((prev) => prev || rows[0]?.id || "");
        if (rows.length === 0) setIsLoading(false);
      });
  }, []);

  const loadEvent = useCallback(async (id: string) => {
    setIsLoading(true);
    try {
      const [gateRes, linksRes] = await Promise.all([
        supabase.from("teacher_walkin_gates").select("*").eq("event_id", id).maybeSingle(),
        supabase
          .from("teacher_walkin_links")
          .select("used_at, new_customer, customer_id, is_test")
          .eq("event_id", id)
          .not("used_at", "is", null)
          .order("used_at", { ascending: false }),
      ]);
      if (gateRes.error) throw gateRes.error;
      if (linksRes.error) throw linksRes.error;

      const row = gateRes.data;
      setHasGate(Boolean(row));
      setTestUntil(row?.test_until ?? null);
      setGate(
        row
          ? {
              latitude: String(row.latitude),
              longitude: String(row.longitude),
              radius: String(row.radius_m),
              enabled: row.enabled,
            }
          : EMPTY_GATE
      );

      const links = linksRes.data || [];
      const customerIds = [...new Set(links.map((l) => l.customer_id).filter((v): v is string => Boolean(v)))];
      const customersRes = customerIds.length
        ? await supabase.from("customers").select("id, name, whatsapp, email").in("id", customerIds)
        : { data: [], error: null };
      if (customersRes.error) throw customersRes.error;
      const byId = new Map((customersRes.data || []).map((c) => [c.id, c]));
      setSubmissions(
        links.map((l) => ({
          usedAt: l.used_at ?? "",
          newCustomer: Boolean(l.new_customer),
          isTest: l.is_test,
          customer: (l.customer_id && byId.get(l.customer_id)) || null,
        }))
      );
    } catch (error) {
      console.error("Error loading teacher walk-in:", error);
      toast.error("Failed to load the walk-in settings");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (eventId) loadEvent(eventId);
  }, [eventId, loadEvent]);

  useEffect(() => {
    if (!link) {
      setQrDataUrl("");
      return;
    }
    let cancelled = false;
    QRCode.toDataURL(link, { width: 1200, margin: 2, errorCorrectionLevel: "M" })
      .then((url) => {
        if (!cancelled) setQrDataUrl(url);
      })
      .catch((error) => console.error("QR generation failed:", error));
    return () => {
      cancelled = true;
    };
  }, [link]);

  const fillCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error("This browser can't share its location");
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGate((prev) => ({
          ...prev,
          latitude: position.coords.latitude.toFixed(6),
          longitude: position.coords.longitude.toFixed(6),
        }));
        toast.success(`Location set (±${Math.round(position.coords.accuracy)} m)`);
        setIsLocating(false);
      },
      () => {
        toast.error("Couldn't get your location");
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 20_000, maximumAge: 0 }
    );
  };

  const save = async () => {
    const latitude = Number(gate.latitude);
    const longitude = Number(gate.longitude);
    const radius = Number(gate.radius);
    if (
      gate.latitude.trim() === "" || !Number.isFinite(latitude) || Math.abs(latitude) > 90 ||
      gate.longitude.trim() === "" || !Number.isFinite(longitude) || Math.abs(longitude) > 180
    ) {
      toast.error("Enter the venue latitude and longitude");
      return;
    }
    if (!Number.isInteger(radius) || radius < 50 || radius > 5000) {
      toast.error("Radius must be a whole number between 50 and 5000 m");
      return;
    }
    setIsSaving(true);
    try {
      const { error } = await supabase.from("teacher_walkin_gates").upsert({
        event_id: eventId,
        latitude,
        longitude,
        radius_m: radius,
        enabled: gate.enabled,
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
      setHasGate(true);
      toast.success("Walk-in settings saved");
    } catch (error) {
      console.error("Error saving teacher walk-in gate:", error);
      toast.error("Failed to save (admin role required)");
    } finally {
      setIsSaving(false);
    }
  };

  const changeTestWindow = async (until: string | null) => {
    setIsSettingTest(true);
    try {
      const { error } = await supabase
        .from("teacher_walkin_gates")
        .update({ test_until: until, updated_at: new Date().toISOString() })
        .eq("event_id", eventId);
      if (error) throw error;
      setTestUntil(until);
      toast.success(until ? "Test mode on for 2 hours" : "Test mode ended");
    } catch (error) {
      console.error("Error changing teacher walk-in test mode:", error);
      toast.error("Failed to change test mode (admin role required)");
    } finally {
      setIsSettingTest(false);
    }
  };

  const eventDays = Array.isArray(event?.event_date)
    ? event.event_date
        .filter((d): d is string => typeof d === "string")
        .map((d) => jakartaDate.format(new Date(d)))
    : [];
  const testActive = testUntil !== null && new Date(testUntil).getTime() > Date.now();
  const fileSlug = (event?.title ?? "event").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  return (
    <AdminLayout>
      <div className="flex flex-col gap-8">
        <header className="flex flex-col gap-2">
          <Eyebrow withRule>Manage · Teacher Walk-in</Eyebrow>
          <h1 className="type-display-md text-burgundy">Teacher Walk-in</h1>
          <p className="type-body-sm text-ink-muted max-w-2xl">
            Teachers who did not register scan this QR at the venue to watch for free. The form
            only opens on the event day, within the radius below. Each verified scan gets a
            single-use link, and a teacher already in Customers (same WhatsApp or email) is not
            added again.
          </p>
        </header>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <Label htmlFor="walkin-event" className="sm:w-24">Event</Label>
          <select
            id="walkin-event"
            className={cn(SELECT_CLASSES, "min-w-[20rem]")}
            value={eventId}
            onChange={(e) => setEventId(e.target.value)}
            disabled={events.length === 0}
          >
            {events.length === 0 ? (
              <option value="">No active events</option>
            ) : (
              events.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.title}
                </option>
              ))
            )}
          </select>
        </div>

        {eventId && (
          <div className="grid gap-8 lg:grid-cols-[1fr_auto]">
            <section className="bg-surface-elevated border border-rule-hairline p-6 flex flex-col gap-5">
              <Eyebrow>Venue gate</Eyebrow>
              <p className="type-body-sm text-ink-muted">
                Event day{eventDays.length === 1 ? "" : "s"} (WIB): {eventDays.join(" · ") || "—"}
              </p>
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <Label htmlFor="walkin-lat">Latitude</Label>
                  <Input
                    id="walkin-lat"
                    inputMode="decimal"
                    value={gate.latitude}
                    onChange={(e) => setGate((prev) => ({ ...prev, latitude: e.target.value }))}
                    placeholder="-6.200000"
                  />
                </div>
                <div>
                  <Label htmlFor="walkin-lng">Longitude</Label>
                  <Input
                    id="walkin-lng"
                    inputMode="decimal"
                    value={gate.longitude}
                    onChange={(e) => setGate((prev) => ({ ...prev, longitude: e.target.value }))}
                    placeholder="106.800000"
                  />
                </div>
                <div>
                  <Label htmlFor="walkin-radius">Radius (m)</Label>
                  <Input
                    id="walkin-radius"
                    inputMode="numeric"
                    value={gate.radius}
                    onChange={(e) => setGate((prev) => ({ ...prev, radius: e.target.value }))}
                  />
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Button type="button" variant="outline" size="sm" onClick={fillCurrentLocation} disabled={isLocating}>
                  {isLocating ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <LocateFixed className="h-4 w-4 mr-1.5" />}
                  Use my current location
                </Button>
                {gate.latitude && gate.longitude && (
                  <a
                    href={`https://www.google.com/maps?q=${encodeURIComponent(gate.latitude)},${encodeURIComponent(gate.longitude)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="type-body-sm text-burgundy underline underline-offset-2"
                  >
                    Check on Google Maps
                  </a>
                )}
              </div>
              <label className="inline-flex items-center gap-2 type-body-sm text-ink-body">
                <input
                  type="checkbox"
                  checked={gate.enabled}
                  onChange={(e) => setGate((prev) => ({ ...prev, enabled: e.target.checked }))}
                  className="h-4 w-4 accent-burgundy"
                />
                Form open (untick to close it early)
              </label>
              <div>
                <Button variant="elegant" onClick={save} disabled={isSaving || isLoading}>
                  {isSaving && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
                  Save
                </Button>
              </div>
              {!hasGate && !isLoading && (
                <p className="type-caption text-[color:var(--status-error)]">
                  Not set yet: the form stays closed until the venue location is saved.
                </p>
              )}
            {hasGate && (
              <div className="border-t border-rule-hairline pt-5 flex flex-col gap-3">
                <Eyebrow>Test mode</Eyebrow>
                {testActive ? (
                  <p className="type-body-sm text-[color:var(--status-upcoming)]">
                    On until {jakartaTime.format(new Date(testUntil))} WIB: the form opens today
                    even though it is not an event day. Submissions are real and marked Test.
                  </p>
                ) : (
                  <p className="type-body-sm text-ink-muted">
                    Opens the form outside the event days for 2 hours so you can try the real flow.
                    The radius still applies: to test away from the venue, save your current
                    location first, then set the venue back before the event.
                  </p>
                )}
                <div>
                  {testActive ? (
                    <Button variant="outline" size="sm" onClick={() => changeTestWindow(null)} disabled={isSettingTest}>
                      End test
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => changeTestWindow(new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString())}
                      disabled={isSettingTest}
                    >
                      Start test (2 hours)
                    </Button>
                  )}
                </div>
              </div>
            )}
            </section>

            <section className="bg-surface-elevated border border-rule-hairline p-6 flex flex-col items-center gap-4 lg:w-80">
              <Eyebrow>QR code</Eyebrow>
              {qrDataUrl ? (
                <img src={qrDataUrl} alt="Teacher walk-in QR code" className="w-64 h-64" />
              ) : (
                <div className="w-64 h-64 bg-surface-canvas-warm" />
              )}
              <p className="type-caption text-ink-muted break-all text-center">{link}</p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    navigator.clipboard.writeText(link).then(
                      () => toast.success("Link copied"),
                      () => toast.error("Couldn't copy the link")
                    )
                  }
                >
                  <Copy className="h-4 w-4 mr-1.5" />
                  Copy link
                </Button>
                <Button asChild size="sm" variant="elegant">
                  <a href={qrDataUrl} download={`teacher-walkin-${fileSlug}.png`}>
                    <Download className="h-4 w-4 mr-1.5" />
                    PNG
                  </a>
                </Button>
              </div>
            </section>
          </div>
        )}

        {eventId && (
          <section className="flex flex-col gap-3">
            <Eyebrow withRule>Submissions ({submissions.length})</Eyebrow>
            <div className="bg-surface-elevated border border-rule-hairline overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-surface-canvas-warm">
                  <tr className="text-left text-body-sm font-bold text-ink-body">
                    <th className="px-4 py-3">Time (WIB)</th>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">WhatsApp</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Customer</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center type-body-sm text-ink-muted">Loading…</td>
                    </tr>
                  ) : submissions.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center type-body-sm text-ink-muted">No submissions yet.</td>
                    </tr>
                  ) : (
                    submissions.map((s, i) => (
                      <tr key={`${s.usedAt}-${i}`} className="border-t border-rule-hairline type-body-sm text-ink-body">
                        <td className="px-4 py-3 whitespace-nowrap">{jakartaTime.format(new Date(s.usedAt))}</td>
                        <td className="px-4 py-3">{s.customer?.name ?? "(deleted)"}</td>
                        <td className="px-4 py-3 whitespace-nowrap">{s.customer?.whatsapp ?? "—"}</td>
                        <td className="px-4 py-3">{s.customer?.email ?? "—"}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {s.newCustomer ? "New" : "Already listed"}
                          {s.isTest && <span className="ml-2 type-caption text-[color:var(--status-upcoming)]">Test</span>}
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
