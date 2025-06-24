import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "../../lib/supabase";
import { InvitationCodeCrypto } from "../../lib/crypto";
import Modal from "../Modal";
import { useLanguage } from "../../lib/LanguageContext";

const invitationCodeSchema = z.object({
  code: z.string().min(4, "Code must be at least 4 characters").max(50, "Code must be less than 50 characters"),
  max_uses: z.number().min(1, "Max uses must be at least 1").max(1000, "Max uses cannot exceed 1000"),
  expires_at: z.string().optional().refine((val) => {
    if (!val) return true;
    return new Date(val) > new Date();
  }, "Expiry date must be in the future")
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
  eventTitle
}: InvitationCodesModalProps) {
  const { t } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Calculate default expiry: 3 days from today at end of day
  const getDefaultExpiry = () => {
    const now = new Date();
    const threeDaysFromNow = new Date(now);
    threeDaysFromNow.setDate(now.getDate() + 3);
    threeDaysFromNow.setHours(23, 59, 59, 999); // End of day
    
    // Format for datetime-local input (YYYY-MM-DDTHH:MM)
    const year = threeDaysFromNow.getFullYear();
    const month = String(threeDaysFromNow.getMonth() + 1).padStart(2, '0');
    const day = String(threeDaysFromNow.getDate()).padStart(2, '0');
    const hours = String(threeDaysFromNow.getHours()).padStart(2, '0');
    const minutes = String(threeDaysFromNow.getMinutes()).padStart(2, '0');
    
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<InvitationCodeForm>({
    resolver: zodResolver(invitationCodeSchema),
    defaultValues: {
      max_uses: 1,
      expires_at: getDefaultExpiry()
    }
  });

  const onSubmit = async (data: InvitationCodeForm) => {
    try {
      setIsLoading(true);
      setError(null);
      setSuccess(null);

      // Hash the invitation code
      const { hash } = await InvitationCodeCrypto.hashCode(data.code);

      // Insert into database
      const { error: insertError } = await supabase
        .from("invitation_codes")
        .insert({
          event_id: eventId,
          code_hash: hash,
          max_uses: data.max_uses,
          expires_at: data.expires_at ? new Date(data.expires_at).toISOString() : null
        });

      if (insertError) {
        throw new Error(insertError.message);
      }

      setSuccess("Invitation code created successfully!");
      reset();
    } catch (err) {
      console.error("Error creating invitation code:", err);
      setError(err instanceof Error ? err.message : "Failed to create invitation code");
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
      title={`Create Invitation Code - ${eventTitle}`}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {error && (
          <div className="rounded-md bg-red-50 p-4">
            <div className="text-sm text-red-800">{error}</div>
          </div>
        )}

        {success && (
          <div className="rounded-md bg-green-50 p-4">
            <div className="text-sm text-green-800">{success}</div>
          </div>
        )}

        <div>
          <label htmlFor="code" className="block text-sm font-medium text-gray-700">
            Invitation Code
          </label>
          <input
            type="text"
            id="code"
            {...register("code")}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-marigold focus:ring focus:ring-marigold focus:ring-opacity-50"
            placeholder="Enter memorable phrase (e.g., 'music-lumina-2024')"
          />
          {errors.code && (
            <p className="mt-1 text-sm text-red-600">{errors.code.message}</p>
          )}
          <p className="mt-1 text-xs text-gray-500">
            This will be securely hashed and stored. Make it memorable for your invitees.
          </p>
        </div>

        <div>
          <label htmlFor="max_uses" className="block text-sm font-medium text-gray-700">
            Maximum Uses
          </label>
          <input
            type="number"
            id="max_uses"
            min="1"
            max="1000"
            {...register("max_uses", { valueAsNumber: true })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-marigold focus:ring focus:ring-marigold focus:ring-opacity-50"
          />
          {errors.max_uses && (
            <p className="mt-1 text-sm text-red-600">{errors.max_uses.message}</p>
          )}
          <p className="mt-1 text-xs text-gray-500">
            How many people can use this invitation code to register.
          </p>
        </div>

        <div>
          <label htmlFor="expires_at" className="block text-sm font-medium text-gray-700">
            Expiry Date (Optional)
          </label>
          <input
            type="datetime-local"
            id="expires_at"
            {...register("expires_at")}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-marigold focus:ring focus:ring-marigold focus:ring-opacity-50"
          />
          {errors.expires_at && (
            <p className="mt-1 text-sm text-red-600">{errors.expires_at.message}</p>
          )}
          <p className="mt-1 text-xs text-gray-500">
            Leave empty if the code should never expire.
          </p>
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
            {isLoading ? "Creating..." : "Create Code"}
          </button>
        </div>
      </form>
    </Modal>
  );
} 