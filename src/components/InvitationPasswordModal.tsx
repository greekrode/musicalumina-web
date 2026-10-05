import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle, Loader2 } from "lucide-react";
import { edgeFunctions } from "../lib/supabase";
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
  /** Receives the verified plaintext code; it is redeemed on submit. */
  onSuccess: (invitationCode: string) => void;
}

/**
 * InvitationPasswordModal — checks an invitation code with the
 * invitation-code edge function. Hashes never reach the browser.
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

      const { data: result, error: verifyError } = await edgeFunctions.invoke<{ valid?: boolean }>(
        "invitation-code",
        { body: { action: "verify", eventId, code: data.password } }
      );

      if (verifyError) {
        throw new Error("Failed to verify invitation code");
      }

      if (!result?.valid) {
        setError("Invalid invitation code or no available slots");
        return;
      }

      onSuccess(data.password);
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
