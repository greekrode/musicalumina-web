import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AdminMasterclass } from "./Masterclass";

const updates: unknown[] = [];

const participant = {
  id: "p1",
  event_id: "e1",
  name: "Maya Tan",
  repertoire: [],
  duration: 45,
  number_of_slots: 1,
  registration_id: null,
  session_date: "2026-10-15",
  is_hold: false,
  hold_label: null,
  hold_notes: null,
  preferred_start_at: "2026-10-15T02:00:00.000Z",
  preferred_end_at: "2026-10-15T02:45:00.000Z",
  created_at: "2026-10-01T00:00:00.000Z",
  updated_at: "2026-10-01T00:00:00.000Z",
  events: { title: "Piano Masterclass", status: "ongoing" as const, type: "masterclass" },
};

const event = {
  id: "e1",
  title: "Piano Masterclass",
  event_duration: [45],
  event_schedule: [
    { start_at: "2026-10-15T01:00:00.000Z", end_at: "2026-10-15T10:00:00.000Z" },
    { start_at: "2026-10-16T01:00:00.000Z", end_at: "2026-10-16T10:00:00.000Z" },
  ],
};

vi.mock("@/components/admin/AdminLayout", () => ({
  AdminLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: (table: string) => {
      let op = "read";
      const builder = {
        select: () => (op === "update" ? Promise.resolve({ data: [{ id: "p1" }], error: null }) : builder),
        eq: () => (op === "delete" ? Promise.resolve({ error: null }) : builder),
        order: () => Promise.resolve(
          table === "events"
            ? { data: [event], error: null }
            : { data: [participant], error: null }
        ),
        update: (payload: unknown) => {
          op = "update";
          updates.push(payload);
          return builder;
        },
        delete: () => {
          op = "delete";
          return builder;
        },
      };
      return builder;
    },
    rpc: vi.fn(async (_name: string, args: { p_session_date: string }) => ({
      data: args.p_session_date === "2026-10-16"
        ? [{ slot_start: "2026-10-16T02:00:00.000Z", slot_end: "2026-10-16T02:45:00.000Z" }]
        : [],
      error: null,
    })),
  },
}));

describe("AdminMasterclass schedule edit", () => {
  it("saves a new date and time for a session", async () => {
    updates.length = 0;
    render(<AdminMasterclass />);

    fireEvent.click(await screen.findByRole("button", { name: "Edit schedule" }));

    const date = await screen.findByRole("combobox", { name: "Date" });
    expect(date).toHaveValue("2026-10-15");
    fireEvent.change(date, { target: { value: "2026-10-16" } });

    const time = screen.getByRole("combobox", { name: "Time" });
    await waitFor(() => {
      expect(screen.getByRole("option", { name: "09:00–09:45 WIB" })).toBeInTheDocument();
    });
    fireEvent.change(time, { target: { value: "2026-10-16T02:00:00.000Z" } });
    fireEvent.click(screen.getByRole("button", { name: "Save schedule" }));

    await waitFor(() => {
      expect(updates).toContainEqual({
        preferred_start_at: "2026-10-16T02:00:00.000Z",
        preferred_end_at: "2026-10-16T02:45:00.000Z",
        session_date: "2026-10-16",
      });
    });
  });
});
