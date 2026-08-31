import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MasterclassSlotField } from "./MasterclassRegistrationModal";

describe("MasterclassSlotField", () => {
  it("only offers values up to the configured daily maximum", () => {
    const onChange = vi.fn();

    render(
      <MasterclassSlotField
        id="slots"
        label="Number of Slots"
        selectedDate="2026-10-24"
        value="1"
        maximum={2}
        onChange={onChange}
      />
    );

    const select = screen.getByRole("combobox", { name: "Number of Slots" });
    expect(select).toHaveDisplayValue("1");
    expect(screen.getAllByRole("option")).toHaveLength(2);
    expect(screen.getByRole("option", { name: "1" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "2" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "3" })).not.toBeInTheDocument();
    expect(screen.getByText("Maximum 2 consecutive slots for this date.")).toBeInTheDocument();

    fireEvent.change(select, { target: { value: "2" } });
    expect(onChange).toHaveBeenCalledWith("2");
  });

  it("keeps a positive number input for an unlimited date", () => {
    render(
      <MasterclassSlotField
        id="slots"
        label="Number of Slots"
        selectedDate="2026-10-26"
        value="4"
        maximum={null}
        onChange={() => undefined}
      />
    );

    const input = screen.getByRole("spinbutton", { name: "Number of Slots" });
    expect(input).toHaveAttribute("min", "1");
    expect(input).not.toHaveAttribute("max");
    expect(screen.getByText("No booking limit for this date.")).toBeInTheDocument();
  });
});
