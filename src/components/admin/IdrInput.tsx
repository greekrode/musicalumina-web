import * as React from "react";
import { Input, type InputProps } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const MAX_DIGITS = 9;

type IdrInputProps = Omit<InputProps, "value" | "onChange" | "type" | "inputMode"> & {
  value: number | null | undefined;
  /** Whole rupiah; null when the field is empty. */
  onChange: (value: number | null) => void;
};

/**
 * Whole-rupiah amount shown with thousands separators ("50,000") while typing.
 * The caret stays after the digit it followed when separators shift.
 */
export const IdrInput = React.forwardRef<HTMLInputElement, IdrInputProps>(
  ({ value, onChange, className, ...props }, ref) => {
    const inner = React.useRef<HTMLInputElement>(null);
    const digitsBeforeCaret = React.useRef<number | null>(null);
    React.useImperativeHandle(ref, () => inner.current as HTMLInputElement);

    const text = value == null ? "" : value.toLocaleString("en-US");
    React.useLayoutEffect(() => {
      const input = inner.current;
      const digits = digitsBeforeCaret.current;
      if (!input || digits === null || document.activeElement !== input) return;
      digitsBeforeCaret.current = null;
      let caret = 0;
      for (let seen = 0; caret < text.length && seen < digits; caret++) {
        if (/\d/.test(text[caret])) seen++;
      }
      input.setSelectionRange(caret, caret);
    }, [text]);

    return (
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 type-caption text-ink-muted">IDR</span>
        <Input
          ref={inner}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          value={text}
          onChange={(event) => {
            const { value: raw, selectionStart } = event.target;
            digitsBeforeCaret.current = raw.slice(0, selectionStart ?? raw.length).replace(/\D/g, "").length;
            const digits = raw.replace(/\D/g, "").replace(/^0+/, "").slice(0, MAX_DIGITS);
            onChange(digits ? Number(digits) : null);
          }}
          className={cn("pl-12 tabular-nums", className)}
          {...props}
        />
      </div>
    );
  }
);
IdrInput.displayName = "IdrInput";
