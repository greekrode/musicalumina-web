import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, Pencil, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/lib/database.types";
import { cn } from "@/lib/utils";

type Customer = Database["public"]["Tables"]["customers"]["Row"];
type ActiveEvent = { id: string; title: string; status: string };
type OutreachFlags = { poster: boolean; broadcast: boolean };
type FlagKey = keyof OutreachFlags;

type CustomerDraft = {
  name: string;
  whatsapp: string;
  email: string;
  type: string;
  address: string;
};

const KNOWN_CUSTOMER_TYPES = [
  "personal",
  "teacher",
  "parents",
  "music school/institution",
] as const;

const EMPTY_DRAFT: CustomerDraft = {
  name: "",
  whatsapp: "",
  email: "",
  type: "teacher",
  address: "",
};

const SELECT_CLASSES = [
  "h-11 px-3 py-2 rounded-sm border border-burgundy/20 bg-surface-elevated",
  "font-sans text-body-sm text-ink-body",
  "transition-[border-color,background-color,box-shadow] duration-fast ease-out-quart",
  "hover:border-burgundy/40",
  "focus:outline-none focus:border-marigold focus:ring-2 focus:ring-marigold/20",
  "appearance-none bg-no-repeat bg-[right_0.75rem_center] pr-10",
  "bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%2212%22 viewBox=%220 0 12 12%22 fill=%22none%22 stroke=%22%23491822%22 stroke-width=%221.5%22><path d=%22M3 5l3 3 3-3%22/></svg>')]",
].join(" ");

const INLINE_INPUT_CLASSES =
  "h-9 w-full min-w-[8rem] px-2 py-1 rounded-sm border border-burgundy/25 bg-surface-elevated text-body-sm text-ink-body focus:outline-none focus:border-marigold focus:ring-2 focus:ring-marigold/20";

const INLINE_SELECT_CLASSES = [
  "h-9 w-full min-w-[9rem] px-2 py-1 rounded-sm border border-burgundy/25 bg-surface-elevated",
  "font-sans text-body-sm text-ink-body",
  "focus:outline-none focus:border-marigold focus:ring-2 focus:ring-marigold/20",
  "appearance-none bg-no-repeat bg-[right_0.5rem_center] pr-7",
  "bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%2212%22 viewBox=%220 0 12 12%22 fill=%22none%22 stroke=%22%23491822%22 stroke-width=%221.5%22><path d=%22M3 5l3 3 3-3%22/></svg>')]",
].join(" ");

function outreachKey(customerId: string, eventId: string) {
  return `${customerId}:${eventId}`;
}

function draftFromCustomer(customer: Customer): CustomerDraft {
  return {
    name: customer.name,
    whatsapp: customer.whatsapp,
    email: customer.email || "",
    type: customer.type || "",
    address: customer.address || "",
  };
}

/**
 * AdminCustomers — contact list with per-event Poster / Broadcast checkboxes
 * for every ongoing (and upcoming) event. Sticky identity columns + horizontal
 * scroll for event groups; header + toolbar support check-all / uncheck-all.
 * Supports inline edit and adding customers via dialog.
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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<CustomerDraft>(EMPTY_DRAFT);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [addDraft, setAddDraft] = useState<CustomerDraft>(EMPTY_DRAFT);
  const [isAdding, setIsAdding] = useState(false);

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
    const set = new Set<string>(KNOWN_CUSTOMER_TYPES);
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

  const startEdit = (customer: Customer) => {
    setEditingId(customer.id);
    setEditDraft(draftFromCustomer(customer));
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditDraft(EMPTY_DRAFT);
  };

  const saveEdit = async () => {
    if (!editingId) return;

    const name = editDraft.name.trim();
    const whatsapp = editDraft.whatsapp.trim();
    if (!name || !whatsapp) {
      toast.error("Name and WhatsApp are required");
      return;
    }

    setIsSavingEdit(true);
    try {
      const payload = {
        name,
        whatsapp,
        email: editDraft.email.trim() || null,
        type: editDraft.type.trim() || null,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from("customers")
        .update(payload)
        .eq("id", editingId)
        .select("*")
        .single();

      if (error) throw error;

      setCustomers((prev) =>
        prev
          .map((customer) =>
            customer.id === editingId ? (data as Customer) : customer
          )
          .sort((a, b) => a.name.localeCompare(b.name))
      );
      cancelEdit();
      toast.success("Customer updated");
    } catch (error) {
      console.error("Error updating customer:", error);
      toast.error("Failed to update customer");
    } finally {
      setIsSavingEdit(false);
    }
  };

  const openAddDialog = () => {
    setAddDraft(EMPTY_DRAFT);
    setIsAddOpen(true);
  };

  const addCustomer = async () => {
    const name = addDraft.name.trim();
    const whatsapp = addDraft.whatsapp.trim();
    if (!name || !whatsapp) {
      toast.error("Name and WhatsApp are required");
      return;
    }

    setIsAdding(true);
    try {
      const { data, error } = await supabase
        .from("customers")
        .insert({
          name,
          whatsapp,
          email: addDraft.email.trim() || null,
          address: addDraft.address.trim() || null,
          type: addDraft.type.trim() || null,
        })
        .select("*")
        .single();

      if (error) throw error;

      setCustomers((prev) =>
        [...prev, data as Customer].sort((a, b) => a.name.localeCompare(b.name))
      );
      setIsAddOpen(false);
      setAddDraft(EMPTY_DRAFT);
      toast.success("Customer added");
    } catch (error) {
      console.error("Error adding customer:", error);
      toast.error("Failed to add customer");
    } finally {
      setIsAdding(false);
    }
  };

  const colSpan = 5 + events.length * 2;

  return (
    <AdminLayout>
      <div className="flex flex-col gap-8">
        <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div className="flex flex-col gap-2">
            <Eyebrow withRule>Manage · Customers</Eyebrow>
            <h1 className="type-display-md text-burgundy">Customers</h1>
            <p className="type-body-sm text-ink-muted max-w-2xl">
              Contact list with Poster and Broadcast tracking per active event
              ({events.length} ongoing/upcoming).
            </p>
          </div>
          <Button variant="elegant" onClick={openAddDialog}>
            <Plus className="h-4 w-4 mr-1.5" />
            Add Customer
          </Button>
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
                  {toTitleCase(type)}
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
                disabled={
                  !bulkEventId || bulkSaving || filteredCustomers.length === 0
                }
                onClick={() => setAllForEvent(bulkEventId, "poster", true)}
              >
                Check all Poster
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={
                  !bulkEventId || bulkSaving || filteredCustomers.length === 0
                }
                onClick={() => setAllForEvent(bulkEventId, "poster", false)}
              >
                Uncheck all Poster
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={
                  !bulkEventId || bulkSaving || filteredCustomers.length === 0
                }
                onClick={() => setAllForEvent(bulkEventId, "broadcast", true)}
              >
                Check all Broadcast
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={
                  !bulkEventId || bulkSaving || filteredCustomers.length === 0
                }
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
                  <Th
                    sticky
                    rowSpan={2}
                    className="left-0 z-30 min-w-[14rem] border-b border-rule-hairline align-middle"
                  >
                    Name
                  </Th>
                  <Th
                    sticky
                    rowSpan={2}
                    className="left-[14rem] z-30 min-w-[9rem] border-b border-l border-rule-hairline align-middle"
                  >
                    WhatsApp
                  </Th>
                  <Th
                    sticky
                    rowSpan={2}
                    className="left-[23rem] z-30 min-w-[9rem] border-b border-l border-rule-hairline align-middle"
                  >
                    Type
                  </Th>
                  <Th
                    rowSpan={2}
                    className="min-w-[12rem] border-b border-l border-rule-hairline align-middle"
                  >
                    Email
                  </Th>
                  <Th
                    rowSpan={2}
                    className="min-w-[5.5rem] border-b border-l border-rule-hairline align-middle text-center"
                  >
                    Actions
                  </Th>
                  {events.map((event) => (
                    <th
                      key={event.id}
                      colSpan={2}
                      className="px-3 py-3 text-center text-body-sm font-bold text-burgundy border-b border-l border-rule-hairline bg-surface-canvas-warm"
                    >
                      <div className="flex flex-col items-center gap-1 max-w-[16rem] mx-auto">
                        <span className="whitespace-normal leading-snug">
                          {event.title}
                        </span>
                        <span className="type-caption font-semibold text-ink-muted uppercase tracking-wide">
                          {event.status}
                        </span>
                      </div>
                    </th>
                  ))}
                </tr>
                <tr>
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
                            disabled={
                              bulkSaving || filteredCustomers.length === 0
                            }
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
                            disabled={
                              bulkSaving || filteredCustomers.length === 0
                            }
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
                  filteredCustomers.map((customer) => {
                    const isEditing = editingId === customer.id;
                    return (
                      <tr
                        key={customer.id}
                        className="hover:bg-surface-canvas-warm/40 transition-colors align-middle"
                      >
                        <Td
                          sticky
                          className="left-0 z-20 min-w-[14rem] border-b border-rule-hairline font-medium text-burgundy bg-surface-elevated"
                        >
                          {isEditing ? (
                            <input
                              className={INLINE_INPUT_CLASSES}
                              value={editDraft.name}
                              onChange={(e) =>
                                setEditDraft((prev) => ({
                                  ...prev,
                                  name: e.target.value,
                                }))
                              }
                              aria-label="Edit name"
                            />
                          ) : (
                            customer.name
                          )}
                        </Td>
                        <Td
                          sticky
                          className="left-[14rem] z-20 min-w-[9rem] border-b border-l border-rule-hairline bg-surface-elevated"
                        >
                          {isEditing ? (
                            <input
                              className={INLINE_INPUT_CLASSES}
                              value={editDraft.whatsapp}
                              onChange={(e) =>
                                setEditDraft((prev) => ({
                                  ...prev,
                                  whatsapp: e.target.value,
                                }))
                              }
                              aria-label="Edit WhatsApp"
                            />
                          ) : (
                            customer.whatsapp
                          )}
                        </Td>
                        <Td
                          sticky
                          className="left-[23rem] z-20 min-w-[9rem] border-b border-l border-rule-hairline bg-surface-elevated"
                        >
                          {isEditing ? (
                            <select
                              className={INLINE_SELECT_CLASSES}
                              value={editDraft.type}
                              onChange={(e) =>
                                setEditDraft((prev) => ({
                                  ...prev,
                                  type: e.target.value,
                                }))
                              }
                              aria-label="Edit type"
                            >
                              <option value="">—</option>
                              {typeOptions.map((type) => (
                                <option key={type} value={type}>
                                  {toTitleCase(type)}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <TypeBadge type={customer.type} />
                          )}
                        </Td>
                        <Td className="min-w-[12rem] border-b border-l border-rule-hairline text-ink-muted">
                          {isEditing ? (
                            <input
                              className={INLINE_INPUT_CLASSES}
                              type="email"
                              value={editDraft.email}
                              onChange={(e) =>
                                setEditDraft((prev) => ({
                                  ...prev,
                                  email: e.target.value,
                                }))
                              }
                              aria-label="Edit email"
                            />
                          ) : (
                            customer.email || "—"
                          )}
                        </Td>
                        <Td className="border-b border-l border-rule-hairline text-center">
                          {isEditing ? (
                            <div className="inline-flex items-center gap-1">
                              <IconAction
                                label="Save"
                                icon={<Check className="h-3.5 w-3.5" />}
                                disabled={isSavingEdit}
                                onClick={saveEdit}
                              />
                              <IconAction
                                label="Cancel"
                                destructive
                                icon={<X className="h-3.5 w-3.5" />}
                                disabled={isSavingEdit}
                                onClick={cancelEdit}
                              />
                            </div>
                          ) : (
                            <IconAction
                              label="Edit"
                              icon={<Pencil className="h-3.5 w-3.5" />}
                              disabled={editingId !== null}
                              onClick={() => startEdit(customer)}
                            />
                          )}
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
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="bg-surface-elevated border border-rule-hairline sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-serif text-burgundy">
              Add Customer
            </DialogTitle>
            <DialogDescription className="text-ink-muted">
              Create a new contact for outreach tracking.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <Field
              label="Name"
              required
              value={addDraft.name}
              onChange={(value) =>
                setAddDraft((prev) => ({ ...prev, name: value }))
              }
            />
            <Field
              label="WhatsApp"
              required
              value={addDraft.whatsapp}
              onChange={(value) =>
                setAddDraft((prev) => ({ ...prev, whatsapp: value }))
              }
            />
            <Field
              label="Email"
              type="email"
              value={addDraft.email}
              onChange={(value) =>
                setAddDraft((prev) => ({ ...prev, email: value }))
              }
            />
            <div className="grid gap-2">
              <Label htmlFor="add-customer-type">Type</Label>
              <select
                id="add-customer-type"
                className={cn(SELECT_CLASSES, "w-full")}
                value={addDraft.type}
                onChange={(e) =>
                  setAddDraft((prev) => ({ ...prev, type: e.target.value }))
                }
              >
                <option value="">—</option>
                {typeOptions.map((type) => (
                  <option key={type} value={type}>
                    {toTitleCase(type)}
                  </option>
                ))}
              </select>
            </div>
            <Field
              label="Address"
              value={addDraft.address}
              onChange={(value) =>
                setAddDraft((prev) => ({ ...prev, address: value }))
              }
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsAddOpen(false)}
              disabled={isAdding}
            >
              Cancel
            </Button>
            <Button variant="elegant" onClick={addCustomer} disabled={isAdding}>
              {isAdding ? "Adding…" : "Add Customer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}

function Field({
  label,
  value,
  onChange,
  required,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  type?: string;
}) {
  const id = `add-customer-${label.toLowerCase()}`;
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>
        {label}
        {required ? " *" : ""}
      </Label>
      <Input
        id={id}
        variant="boxed"
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
      />
    </div>
  );
}

function FragmentPair({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

function toTitleCase(value: string) {
  return value
    .split(" ")
    .map((word) =>
      word
        .split("/")
        .map((part) =>
          part
            ? part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
            : part
        )
        .join("/")
    )
    .join(" ");
}

const TYPE_BADGE_STYLES: Record<string, string> = {
  teacher: "bg-burgundy/12 text-burgundy border-burgundy/20",
  parents: "bg-marigold/20 text-[#8a5a12] border-marigold/35",
  personal:
    "bg-[color:var(--status-open-bg)] text-[color:var(--status-open)] border-[color:var(--status-open)]/25",
  "music school/institution":
    "bg-[#1f4f46]/12 text-[#1f4f46] border-[#1f4f46]/20",
};

function TypeBadge({ type }: { type: string | null }) {
  if (!type?.trim()) {
    return <span className="text-ink-muted">—</span>;
  }

  const normalized = type.trim().toLowerCase();
  const styles =
    TYPE_BADGE_STYLES[normalized] ||
    "bg-surface-canvas-warm text-ink-muted border-rule-hairline";

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-1 rounded-sm border text-body-sm font-medium whitespace-nowrap",
        styles
      )}
    >
      {toTitleCase(type.trim())}
    </span>
  );
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
      <span className="type-caption font-semibold text-ink-muted">{label}</span>
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

function IconAction({
  onClick,
  label,
  icon,
  destructive,
  disabled,
}: {
  onClick?: () => void;
  label: string;
  icon: React.ReactNode;
  destructive?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      disabled={disabled}
      className={cn(
        "h-8 w-8 flex items-center justify-center rounded-sm transition-colors duration-fast ease-out-quart",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marigold focus-visible:ring-offset-2",
        disabled && "opacity-40 cursor-not-allowed",
        destructive
          ? "text-ink-muted hover:text-[color:var(--status-error)] hover:bg-[color:var(--status-error-bg)]"
          : "text-ink-muted hover:text-burgundy hover:bg-surface-canvas-warm"
      )}
    >
      {icon}
    </button>
  );
}

function Th({
  children,
  className,
  sticky,
  rowSpan,
}: {
  children?: React.ReactNode;
  className?: string;
  sticky?: boolean;
  rowSpan?: number;
}) {
  return (
    <th
      rowSpan={rowSpan}
      className={cn(
        "px-4 py-3.5 text-left text-body-sm font-bold tracking-wide text-ink-body whitespace-nowrap bg-surface-canvas-warm",
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
