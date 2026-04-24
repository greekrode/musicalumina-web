import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { InvitationCodeCrypto } from "../../lib/crypto";
import Modal from "../Modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

/**
 * InvitationCodesModal — admin creates a new invitation code for an event.
 *
 * Editorial shell via the shared Modal. Boxed inputs fit the admin form
 * density. The code is hashed client-side before it ever reaches Supabase —
 * that crypto path is preserved 1:1.
 */

const invitationCodeSchema = z.object({
  code: z
    .string()
    .min(4, "Code must be at least 4 characters")
    .max(50, "Code must be less than 50 characters"),
  max_uses: z
    .number()
    .min(1, "Max uses must be at least 1")
    .max(1000, "Max uses cannot exceed 1000"),
  expires_at: z
    .string()
    .optional()
    .refine((val) => {
      if (!val) return true;
      return new Date(val) > new Date();
    }, "Expiry date must be in the future"),
});

type InvitationCodeForm = z.infer<typeof invitationCodeSchema>;

interface InvitationCodesModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  eventTitle: string;
}

export default function InvitationCodesModal({
  isOpen,
  onClose,
  eventId,
  eventTitle,
}: InvitationCodesModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Default expiry: end of day three days from now, shaped for datetime-local.
  const getDefaultExpiry = () => {
    const now = new Date();
    const threeDaysFromNow = new Date(now);
    threeDaysFromNow.setDate(now.getDate() + 3);
    threeDaysFromNow.setHours(23, 59, 59, 999);

    const year = threeDaysFromNow.getFullYear();
    const month = String(threeDaysFromNow.getMonth() + 1).padStart(2, "0");
    const day = String(threeDaysFromNow.getDate()).padStart(2, "0");
    const hours = String(threeDaysFromNow.getHours()).padStart(2, "0");
    const minutes = String(threeDaysFromNow.getMinutes()).padStart(2, "0");

    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<InvitationCodeForm>({
    resolver: zodResolver(invitationCodeSchema),
    defaultValues: {
      max_uses: 1,
      expires_at: getDefaultExpiry(),
    },
  });

  const onSubmit = async (data: InvitationCodeForm) => {
    try {
      setIsLoading(true);
      setError(null);
      setSuccess(null);

      const { hash } = await InvitationCodeCrypto.hashCode(data.code);

      const { error: insertError } = await supabase
        .from("invitation_codes")
        .insert({
          event_id: eventId,
          code_hash: hash,
          max_uses: data.max_uses,
          expires_at: data.expires_at
            ? new Date(data.expires_at).toISOString()
            : null,
        });

      if (insertError) {
        throw new Error(insertError.message);
      }

      setSuccess("Invitation code created successfully.");
      reset();
    } catch (err) {
      console.error("Error creating invitation code:", err);
      setError(
        err instanceof Error ? err.message : "Failed to create invitation code"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    reset();
    setError(null);
    setSuccess(null);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={eventTitle}
      eyebrow="Codes · New invitation"
      maxWidth="md"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
        {/* Alerts */}
        {error && (
          <div className="flex items-start gap-3 border-l-2 border-[color:var(--status-error)] bg-[color:var(--status-error-bg)] px-4 py-3">
            <AlertCircle
              className="h-4 w-4 mt-0.5 text-[color:var(--status-error)] flex-shrink-0"
              aria-hidden
            />
            <p className="type-body-sm text-[color:var(--status-error)]">
              {error}
            </p>
          </div>
        )}
        {success && (
          <div className="flex items-start gap-3 border-l-2 border-[color:var(--status-success)] bg-[color:var(--status-success-bg)] px-4 py-3">
            <CheckCircle2
              className="h-4 w-4 mt-0.5 text-[color:var(--status-success)] flex-shrink-0"
              aria-hidden
            />
            <p className="type-body-sm text-[color:var(--status-success)]">
              {success}
            </p>
          </div>
        )}

        {/* Code */}
        <div className="flex flex-col gap-2">
          <Label htmlFor="code">Invitation code</Label>
          <Input
            id="code"
            type="text"
            variant="boxed"
            placeholder="e.g. music-lumina-2024"
            aria-invalid={!!errors.code}
            {...register("code")}
          />
          {errors.code ? (
            <p className="type-caption text-[color:var(--status-error)]">
              {errors.code.message}
            </p>
          ) : (
            <p className="type-caption text-ink-muted">
              Hashed client-side before storage. Pick something memorable for
              invitees.
            </p>
          )}
        </div>

        {/* Max uses */}
        <div className="flex flex-col gap-2">
          <Label htmlFor="max_uses">Maximum uses</Label>
          <Input
            id="max_uses"
            type="number"
            min={1}
            max={1000}
            variant="boxed"
            aria-invalid={!!errors.max_uses}
            {...register("max_uses", { valueAsNumber: true })}
          />
          {errors.max_uses ? (
            <p className="type-caption text-[color:var(--status-error)]">
              {errors.max_uses.message}
            </p>
          ) : (
            <p className="type-caption text-ink-muted">
              How many registrations this code can authorise.
            </p>
          )}
        </div>

        {/* Expiry */}
        <div className="flex flex-col gap-2">
          <Label htmlFor="expires_at">
            Expiry{" "}
            <span className="type-caption text-ink-muted font-normal">
              — optional
            </span>
          </Label>
          <Input
            id="expires_at"
            type="datetime-local"
            variant="boxed"
            aria-invalid={!!errors.expires_at}
            {...register("expires_at")}
          />
          {errors.expires_at ? (
            <p className="type-caption text-[color:var(--status-error)]">
              {errors.expires_at.message}
            </p>
          ) : (
            <p className="type-caption text-ink-muted">
              Leave empty for a code that never expires.
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2 border-t border-rule-hairline">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Creating…" : "Create code"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
