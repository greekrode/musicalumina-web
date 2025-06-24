import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "../lib/supabase";
import { InvitationCodeCrypto } from "../lib/crypto";
import Modal from "./Modal";
import { useLanguage } from "../lib/LanguageContext";

const invitationPasswordSchema = z.object({
  password: z.string().min(1, "Please enter the invitation code")
});

type InvitationPasswordForm = z.infer<typeof invitationPasswordSchema>;

interface InvitationPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  onSuccess: (invitationCodeId: string) => void;
}

export default function InvitationPasswordModal({
  isOpen,
  onClose,
  eventId,
  onSuccess
}: InvitationPasswordModalProps) {
  const { t } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<InvitationPasswordForm>({
    resolver: zodResolver(invitationPasswordSchema)
  });

  const onSubmit = async (data: InvitationPasswordForm) => {
    try {
      setIsLoading(true);
      setError(null);

      // Get all active invitation codes for this event
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

      // Filter codes that have available uses and haven't expired
      const now = new Date();
      const invitationCodes = allCodes.filter(code => {
        const hasAvailableUses = code.current_uses < code.max_uses;
        const notExpired = !code.expires_at || new Date(code.expires_at) > now;
        return hasAvailableUses && notExpired;
      });

      if (invitationCodes.length === 0) {
        setError("Invalid invitation code or no available slots");
        return;
      }

      // Check each invitation code
      let validCodeId: string | null = null;
      for (const code of invitationCodes) {
        const isValid = await InvitationCodeCrypto.verifyCode(data.password, code.code_hash);
        if (isValid) {
          validCodeId = code.id;
          break;
        }
      }

      if (!validCodeId) {
        setError("Invalid invitation code");
        return;
      }

      // Code is valid, proceed with registration
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
      title="Enter Invitation Code"
      maxWidth="md"
    >
      <div className="space-y-6">
        <div className="text-center">
          <p className="text-gray-600">
            This event requires an invitation code to register. Please enter the code provided to you.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="text-sm text-red-800">{error}</div>
            </div>
          )}

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Invitation Code
            </label>
            <input
              type="text"
              id="password"
              {...register("password")}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-marigold focus:ring focus:ring-marigold focus:ring-opacity-50"
              placeholder="Enter your invitation code"
              autoComplete="off"
            />
            {errors.password && (
              <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
            )}
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-marigold text-white rounded-md hover:bg-marigold/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "Verifying..." : "Continue"}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
} 