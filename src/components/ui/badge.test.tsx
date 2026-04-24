import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Badge } from "./badge";

/**
 * Badge component test — also serves as the pattern reference for future
 * component tests in this repo. React + happy-dom + testing-library is the
 * full stack; no providers needed for a Badge.
 */

describe("<Badge />", () => {
  it("renders its children as visible text", () => {
    render(<Badge>Open</Badge>);
    expect(screen.getByText("Open")).toBeInTheDocument();
  });

  it("renders a leading decorative dot when dot is set", () => {
    const { container } = render(<Badge dot>Live</Badge>);
    // The dot is a span with aria-hidden so assistive tech skips it.
    const dot = container.querySelector('span[aria-hidden="true"]');
    expect(dot).not.toBeNull();
  });

  it("omits the dot span when dot is false/undefined", () => {
    const { container } = render(<Badge>Quiet</Badge>);
    expect(container.querySelector('span[aria-hidden="true"]')).toBeNull();
  });

  it("applies the status tint class for a matched status", () => {
    const { container } = render(<Badge status="open">Open</Badge>);
    const el = container.firstChild as HTMLElement;
    expect(el.className).toMatch(/status-open-bg/);
    expect(el.className).toMatch(/status-open-fg/);
  });

  it("merges a caller-supplied className without clobbering variants", () => {
    const { container } = render(<Badge className="mt-4">x</Badge>);
    const el = container.firstChild as HTMLElement;
    expect(el.className).toMatch(/mt-4/);
    // Base token still present.
    expect(el.className).toMatch(/inline-flex/);
  });
});
