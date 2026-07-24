import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/lib/database.types";
import { cn } from "@/lib/utils";

type Customer = Database["public"]["Tables"]["customers"]["Row"];
type ActiveEvent = { id: string; title: string; status: string };
type OutreachFlags = { poster: boolean; broadcast: boolean };
type FlagKey = keyof OutreachFlags;

const SELECT_CLASSES = [
  "h-11 px-3 py-2 rounded-sm border border-burgundy/20 bg-surface-elevated",
  "font-sans text-body-sm text-ink-body",
  "transition-[border-color,background-color,box-shadow] duration-fast ease-out-quart",
  "hover:border-burgundy/40",
  "focus:outline-none focus:border-marigold focus:ring-2 focus:ring-marigold/20",
  "appearance-none bg-no-repeat bg-[right_0.75rem_center] pr-10",
  "bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%2212%22 viewBox=%220 0 12 12%22 fill=%22none%22 stroke=%22%23491822%22 stroke-width=%221.5%22><path d=%22M3 5l3 3 3-3%22/></svg>')]",
].join(" ");

function outreachKey(customerId: string, eventId: string) {
  return `${customerId}:${eventId}`;
}

/**
 * AdminCustomers — contact list with per-event Poster / Broadcast checkboxes
 * for every ongoing (and upcoming) event. Sticky identity columns + horizontal
 * scroll for event groups; header + toolbar support check-all / uncheck-all.
 */
export default function AdminCustomers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [events, setEvents] = useState<ActiveEvent[]>([]);
  const [outreach, setOutreach] = useState<Record<string, OutreachFlags>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [bulkEventId, setBulkEventId] = useState("");

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);

      const [customersRes, eventsRes, outreachRes] = await Promise.all([
        supabase.from("customers").select("*").order("name", { ascending: true }),
        supabase
          .from("events")
          .select("id, title, status")
          .in("status", ["ongoing", "upcoming"])
          .order("created_at", { ascending: false }),
        supabase
          .from("customer_event_outreach")
          .select("customer_id, event_id, poster, broadcast"),
      ]);

      if (customersRes.error) throw customersRes.error;
      if (eventsRes.error) throw eventsRes.error;
      if (outreachRes.error) throw outreachRes.error;

      const eventRows = (eventsRes.data || []) as ActiveEvent[];
      setCustomers((customersRes.data as Customer[]) || []);
      setEvents(eventRows);
      setBulkEventId((prev) => prev || eventRows[0]?.id || "");

      const map: Record<string, OutreachFlags> = {};
      for (const row of outreachRes.data || []) {
        map[outreachKey(row.customer_id, row.event_id)] = {
          poster: Boolean(row.poster),
          broadcast: Boolean(row.broadcast),
        };
      }
      setOutreach(map);
    } catch (error) {
      console.error("Error loading customers:", error);
      toast.error("Failed to load customers");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const typeOptions = useMemo(() => {
    const set = new Set<string>();
    for (const customer of customers) {
      if (customer.type?.trim()) set.add(customer.type.trim());
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [customers]);

  const filteredCustomers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return customers.filter((customer) => {
      if (typeFilter !== "all" && (customer.type || "") !== typeFilter) {
        return false;
      }
      if (!q) return true;
      return (
        customer.name.toLowerCase().includes(q) ||
        customer.whatsapp.toLowerCase().includes(q) ||
        (customer.email || "").toLowerCase().includes(q) ||
        (customer.type || "").toLowerCase().includes(q)
      );
    });
  }, [customers, searchQuery, typeFilter]);

  const getFlags = (customerId: string, eventId: string): OutreachFlags =>
    outreach[outreachKey(customerId, eventId)] || {
      poster: false,
      broadcast: false,
    };

  const persistFlags = async (
    customerId: string,
    eventId: string,
    next: OutreachFlags
  ) => {
    const key = outreachKey(customerId, eventId);
    setSavingKey(key);
    setOutreach((prev) => ({ ...prev, [key]: next }));

    try {
      const { error } = await supabase.from("customer_event_outreach").upsert(
        {
          customer_id: customerId,
          event_id: eventId,
          poster: next.poster,
          broadcast: next.broadcast,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "customer_id,event_id" }
      );
      if (error) throw error;
    } catch (error) {
      console.error("Error saving outreach flag:", error);
      toast.error("Failed to save checkbox");
      await loadData();
    } finally {
      setSavingKey(null);
    }
  };

  const handleToggle = async (
    customerId: string,
    eventId: string,
    flag: FlagKey,
    checked: boolean
  ) => {
    const current = getFlags(customerId, eventId);
    await persistFlags(customerId, eventId, { ...current, [flag]: checked });
  };

  const setAllForEvent = async (
    eventId: string,
    flag: FlagKey,
    value: boolean,
    scope: Customer[] = filteredCustomers
  ) => {
    if (!eventId || scope.length === 0) return;

    setBulkSaving(true);
    const previous = outreach;

    const nextMap = { ...outreach };
    for (const customer of scope) {
      const key = outreachKey(customer.id, eventId);
      const current = nextMap[key] || { poster: false, broadcast: false };
      nextMap[key] = { ...current, [flag]: value };
    }
    setOutreach(nextMap);

    try {
      const payload = scope.map((customer) => {
        const key = outreachKey(customer.id, eventId);
        const flags = nextMap[key];
        return {
          customer_id: customer.id,
          event_id: eventId,
          poster: flags.poster,
          broadcast: flags.broadcast,
          updated_at: new Date().toISOString(),
        };
      });

      // Upsert in chunks to stay under payload limits
      const chunkSize = 100;
      for (let i = 0; i < payload.length; i += chunkSize) {
        const chunk = payload.slice(i, i + chunkSize);
        const { error } = await supabase
          .from("customer_event_outreach")
          .upsert(chunk, { onConflict: "customer_id,event_id" });
        if (error) throw error;
      }

      toast.success(
        value
          ? `Checked all ${flag} (${scope.length})`
          : `Unchecked all ${flag} (${scope.length})`
      );
    } catch (error) {
      console.error("Error bulk updating outreach:", error);
      setOutreach(previous);
      toast.error("Failed to update all checkboxes");
    } finally {
      setBulkSaving(false);
    }
  };

  const columnCheckedState = (eventId: string, flag: FlagKey) => {
    if (filteredCustomers.length === 0) {
      return { checked: false, indeterminate: false };
    }
    let checkedCount = 0;
    for (const customer of filteredCustomers) {
      if (getFlags(customer.id, eventId)[flag]) checkedCount += 1;
    }
    return {
      checked: checkedCount === filteredCustomers.length,
      indeterminate:
        checkedCount > 0 && checkedCount < filteredCustomers.length,
    };
  };

  const colSpan = 4 + events.length * 2;

  return (
    <AdminLayout>
      <div className="flex flex-col gap-8">
        <header className="flex flex-col gap-2">
          <Eyebrow withRule>Manage · Customers</Eyebrow>
          <h1 className="type-display-md text-burgundy">Customers</h1>
          <p className="type-body-sm text-ink-muted max-w-2xl">
            Contact list with Poster and Broadcast tracking per active event
            ({events.length} ongoing/upcoming).
          </p>
        </header>

        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-col sm:flex-row gap-3 flex-1">
            <Input
              placeholder="Search name, WhatsApp, email…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-sm"
            />
            <select
              className={cn(SELECT_CLASSES, "min-w-[12rem]")}
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              aria-label="Filter by type"
            >
              <option value="all">All types</option>
              {typeOptions.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            <select
              className={cn(SELECT_CLASSES, "min-w-[16rem]")}
              value={bulkEventId}
              onChange={(e) => setBulkEventId(e.target.value)}
              aria-label="Event for bulk actions"
              disabled={events.length === 0}
            >
              {events.length === 0 ? (
                <option value="">No active events</option>
              ) : (
                events.map((event) => (
                  <option key={event.id} value={event.id}>
                    {event.title}
                  </option>
                ))
              )}
            </select>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={!bulkEventId || bulkSaving || filteredCustomers.length === 0}
                onClick={() => setAllForEvent(bulkEventId, "poster", true)}
              >
                Check all Poster
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={!bulkEventId || bulkSaving || filteredCustomers.length === 0}
                onClick={() => setAllForEvent(bulkEventId, "poster", false)}
              >
                Uncheck all Poster
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={!bulkEventId || bulkSaving || filteredCustomers.length === 0}
                onClick={() => setAllForEvent(bulkEventId, "broadcast", true)}
              >
                Check all Broadcast
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={!bulkEventId || bulkSaving || filteredCustomers.length === 0}
                onClick={() => setAllForEvent(bulkEventId, "broadcast", false)}
              >
                Uncheck all Broadcast
              </Button>
            </div>
          </div>
        </div>

        <p className="type-caption text-ink-muted">
          Showing {filteredCustomers.length} of {customers.length} customers
          {bulkSaving ? " · Saving bulk update…" : ""}
        </p>

        <div className="bg-surface-elevated border border-rule-hairline overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-0">
              <thead className="bg-surface-canvas-warm">
                <tr>
                  <Th sticky className="left-0 z-30 min-w-[14rem] border-b border-rule-hairline">
                    Name
                  </Th>
                  <Th sticky className="left-[14rem] z-30 min-w-[9rem] border-b border-l border-rule-hairline">
                    WhatsApp
                  </Th>
                  <Th sticky className="left-[23rem] z-30 min-w-[8rem] border-b border-l border-rule-hairline">
                    Type
                  </Th>
                  <Th className="min-w-[12rem] border-b border-l border-rule-hairline">
                    Email
                  </Th>
                  {events.map((event) => (
                    <th
                      key={event.id}
                      colSpan={2}
                      className="px-3 py-2 text-center type-label text-burgundy border-b border-l border-rule-hairline bg-surface-canvas-warm"
                    >
                      <div className="flex flex-col items-center gap-1 max-w-[16rem] mx-auto">
                        <span className="whitespace-normal leading-snug">
                          {event.title}
                        </span>
                        <span className="type-caption text-ink-muted uppercase tracking-wide">
                          {event.status}
                        </span>
                      </div>
                    </th>
                  ))}
                </tr>
                <tr>
                  <Th sticky className="left-0 z-30 border-b border-rule-hairline" />
                  <Th sticky className="left-[14rem] z-30 border-b border-l border-rule-hairline" />
                  <Th sticky className="left-[23rem] z-30 border-b border-l border-rule-hairline" />
                  <Th className="border-b border-l border-rule-hairline" />
                  {events.map((event) => {
                    const posterState = columnCheckedState(event.id, "poster");
                    const broadcastState = columnCheckedState(
                      event.id,
                      "broadcast"
                    );
                    return (
                      <FragmentPair key={event.id}>
                        <Th className="border-b border-l border-rule-hairline text-center min-w-[6.5rem]">
                          <ColumnToggle
                            label="Poster"
                            checked={posterState.checked}
                            indeterminate={posterState.indeterminate}
                            disabled={bulkSaving || filteredCustomers.length === 0}
                            onChange={(checked) =>
                              setAllForEvent(event.id, "poster", checked)
                            }
                          />
                        </Th>
                        <Th className="border-b border-l border-rule-hairline text-center min-w-[7rem]">
                          <ColumnToggle
                            label="Broadcast"
                            checked={broadcastState.checked}
                            indeterminate={broadcastState.indeterminate}
                            disabled={bulkSaving || filteredCustomers.length === 0}
                            onChange={(checked) =>
                              setAllForEvent(event.id, "broadcast", checked)
                            }
                          />
                        </Th>
                      </FragmentPair>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <TableMessageRow colSpan={colSpan}>
                    Loading customers…
                  </TableMessageRow>
                ) : filteredCustomers.length === 0 ? (
                  <TableMessageRow colSpan={colSpan}>
                    No customers match the current filters.
                  </TableMessageRow>
                ) : (
                  filteredCustomers.map((customer) => (
                    <tr
                      key={customer.id}
                      className="hover:bg-surface-canvas-warm/40 transition-colors align-middle"
                    >
                      <Td sticky className="left-0 z-20 min-w-[14rem] border-b border-rule-hairline font-medium text-burgundy bg-surface-elevated">
                        {customer.name}
                      </Td>
                      <Td sticky className="left-[14rem] z-20 min-w-[9rem] border-b border-l border-rule-hairline bg-surface-elevated">
                        {customer.whatsapp}
                      </Td>
                      <Td sticky className="left-[23rem] z-20 min-w-[8rem] border-b border-l border-rule-hairline bg-surface-elevated text-ink-muted">
                        {customer.type || "—"}
                      </Td>
                      <Td className="min-w-[12rem] border-b border-l border-rule-hairline text-ink-muted">
                        {customer.email || "—"}
                      </Td>
                      {events.map((event) => {
                        const flags = getFlags(customer.id, event.id);
                        const key = outreachKey(customer.id, event.id);
                        const busy = savingKey === key || bulkSaving;
                        return (
                          <FragmentPair key={event.id}>
                            <Td className="border-b border-l border-rule-hairline text-center">
                              <FlagCheckbox
                                ariaLabel={`Poster for ${customer.name} · ${event.title}`}
                                checked={flags.poster}
                                disabled={busy}
                                onChange={(checked) =>
                                  handleToggle(
                                    customer.id,
                                    event.id,
                                    "poster",
                                    checked
                                  )
                                }
                              />
                            </Td>
                            <Td className="border-b border-l border-rule-hairline text-center">
                              <FlagCheckbox
                                ariaLabel={`Broadcast for ${customer.name} · ${event.title}`}
                                checked={flags.broadcast}
                                disabled={busy}
                                onChange={(checked) =>
                                  handleToggle(
                                    customer.id,
                                    event.id,
                                    "broadcast",
                                    checked
                                  )
                                }
                              />
                            </Td>
                          </FragmentPair>
                        );
                      })}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

function FragmentPair({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

function ColumnToggle({
  label,
  checked,
  indeterminate,
  disabled,
  onChange,
}: {
  label: string;
  checked: boolean;
  indeterminate: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="inline-flex flex-col items-center gap-1 cursor-pointer">
      <span className="type-caption text-ink-muted">{label}</span>
      <FlagCheckbox
        ariaLabel={`${checked ? "Uncheck" : "Check"} all ${label}`}
        checked={checked}
        indeterminate={indeterminate}
        disabled={disabled}
        onChange={onChange}
      />
    </label>
  );
}

function FlagCheckbox({
  checked,
  indeterminate = false,
  disabled,
  onChange,
  ariaLabel,
}: {
  checked: boolean;
  indeterminate?: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
  ariaLabel: string;
}) {
  return (
    <input
      type="checkbox"
      aria-label={ariaLabel}
      checked={checked}
      disabled={disabled}
      ref={(el) => {
        if (el) el.indeterminate = indeterminate && !checked;
      }}
      onChange={(e) => onChange(e.target.checked)}
      className={cn(
        "h-4 w-4 rounded-sm border border-burgundy/40 accent-burgundy",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marigold",
        disabled && "opacity-50 cursor-not-allowed"
      )}
    />
  );
}

function Th({
  children,
  className,
  sticky,
}: {
  children?: React.ReactNode;
  className?: string;
  sticky?: boolean;
}) {
  return (
    <th
      className={cn(
        "px-4 py-3 text-left type-label text-ink-muted whitespace-nowrap bg-surface-canvas-warm",
        sticky && "sticky",
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
  sticky,
}: {
  children?: React.ReactNode;
  className?: string;
  sticky?: boolean;
}) {
  return (
    <td
      className={cn(
        "px-4 py-3 type-body-sm text-ink-body whitespace-nowrap",
        sticky && "sticky",
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
