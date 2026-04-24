import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle, Loader2 } from "lucide-react";
import { supabase } from "../lib/supabase";
import { InvitationCodeCrypto } from "../lib/crypto";
import Modal from "./Modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const invitationPasswordSchema = z.object({
  password: z.string().min(1, "Please enter the invitation code"),
});

type InvitationPasswordForm = z.infer<typeof invitationPasswordSchema>;

interface InvitationPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  onSuccess: (invitationCodeId: string) => void;
}

/**
 * InvitationPasswordModal — verifies an invitation code against the event's
 * active codes table. Editorial styling, same crypto + Supabase wiring.
 */
export default function InvitationPasswordModal({
  isOpen,
  onClose,
  eventId,
  onSuccess,
}: InvitationPasswordModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<InvitationPasswordForm>({
    resolver: zodResolver(invitationPasswordSchema),
  });

  const onSubmit = async (data: InvitationPasswordForm) => {
    try {
      setIsLoading(true);
      setError(null);

      const { data: allCodes, error: fetchError } = await supabase
        .from("invitation_codes")
        .select("*")
        .eq("event_id", eventId)
        .eq("active", true);

      if (fetchError) {
        throw new Error("Failed to verify invitation code");
      }

      if (!allCodes || allCodes.length === 0) {
        setError("Invalid invitation code or no available slots");
        return;
      }

      const now = new Date();
      const invitationCodes = allCodes.filter((code) => {
        const hasAvailableUses = code.current_uses < code.max_uses;
        const notExpired =
          !code.expires_at || new Date(code.expires_at) > now;
        return hasAvailableUses && notExpired;
      });

      if (invitationCodes.length === 0) {
        setError("Invalid invitation code or no available slots");
        return;
      }

      let validCodeId: string | null = null;
      for (const code of invitationCodes) {
        const isValid = await InvitationCodeCrypto.verifyCode(
          data.password,
          code.code_hash
        );
        if (isValid) {
          validCodeId = code.id;
          break;
        }
      }

      if (!validCodeId) {
        setError("Invalid invitation code");
        return;
      }

      onSuccess(validCodeId);
      reset();
    } catch (err) {
      console.error("Error verifying invitation code:", err);
      setError("Failed to verify invitation code. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    reset();
    setError(null);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      eyebrow="Restricted access"
      title="Enter Invitation Code"
      maxWidth="md"
    >
      <div className="flex flex-col gap-7">
        <p className="type-body-md text-ink-muted">
          This event requires an invitation code to register. Enter the code
          provided to you to continue.
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
          {error && (
            <div className="border-l-2 border-[color:var(--status-error)] bg-[color:var(--status-error-bg)] text-[color:var(--status-error)] px-5 py-4 flex items-start gap-3">
              <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <span className="type-body-sm">{error}</span>
            </div>
          )}

          <div>
            <Label variant="editorial" htmlFor="password">
              Invitation Code{" "}
              <span className="text-[color:var(--status-error)]">*</span>
            </Label>
            <Input
              variant="boxed"
              id="password"
              type="text"
              {...register("password")}
              placeholder="Enter your invitation code"
              autoComplete="off"
              aria-invalid={errors.password ? true : undefined}
            />
            {errors.password && (
              <p className="mt-2 type-caption text-[color:var(--status-error)]">
                {errors.password.message}
              </p>
            )}
          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              {isLoading ? "Verifying…" : "Continue"}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
