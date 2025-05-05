import { useState } from "react";
import { Dialog } from "@headlessui/react";
import { X } from "lucide-react";
import { useLanguage } from "../lib/LanguageContext";
import type { RegistrationStatus } from "../lib/database.types";
import { supabase } from "../lib/supabase";

interface MasterclassRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  eventName: string;
  onOpenTerms: () => void;
}

function MasterclassRegistrationModal({
  isOpen,
  onClose,
  eventId,
  eventName,
  onOpenTerms,
}: MasterclassRegistrationModalProps) {
  const { t } = useLanguage();
  const [registrationStatus, setRegistrationStatus] =
    useState<RegistrationStatus>("personal");
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    registrantName: "",
    registrantWhatsapp: "",
    registrantEmail: "",
    participantName: "",
    bankName: "",
    bankAccountNumber: "",
    bankAccountName: "",
  });

  const handleClose = () => {
    setStep(1);
    setFormData({
      registrantName: "",
      registrantWhatsapp: "",
      registrantEmail: "",
      participantName: "",
      bankName: "",
      bankAccountNumber: "",
      bankAccountName: "",
    });
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase.from("registrations").insert({
        event_id: eventId,
        registrant_status: registrationStatus,
        registrant_name: formData.registrantName,
        registrant_whatsapp: formData.registrantWhatsapp,
        registrant_email: formData.registrantEmail,
        participant_name: formData.participantName,
        bank_name: formData.bankName,
        bank_account_number: formData.bankAccountNumber,
        bank_account_name: formData.bankAccountName,
        status: "pending",
      });

      if (error) throw error;

      if (!import.meta.env.DEV) {
        window.umami?.track("masterclass_registration_submitted", {
          eventId,
        });
      }

      handleClose();
    } catch (error) {
      console.error("Error submitting registration:", error);
    }
  };

  return (
    <Dialog open={isOpen} onClose={handleClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />

      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="mx-auto max-w-2xl w-full rounded-xl bg-white">
          <div className="flex items-center justify-between border-b border-gray-200 p-4">
            <Dialog.Title className="text-xl font-playfair text-black">
              {t("masterclass.registration.title")}
            </Dialog.Title>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="p-6">
            <div className="mb-6">
              <h3 className="font-medium text-black mb-2">{eventName}</h3>
              <p className="text-sm text-black/60">
                {t("masterclass.registration.description")}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-black mb-2">
                  {t("registration.registrationType")}
                </label>
                <div className="grid grid-cols-3 gap-4">
                  {["personal", "parents", "teacher"].map((status) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() =>
                        setRegistrationStatus(status as RegistrationStatus)
                      }
                      className={`p-3 text-sm rounded-lg border ${
                        registrationStatus === status
                          ? "border-marigold bg-marigold/10 text-marigold"
                          : "border-gray-200 text-gray-700 hover:border-marigold/50"
                      }`}
                    >
                      {t(`registration.types.${status}`)}
                    </button>
                  ))}
                </div>
              </div>

              {step === 1 ? (
                <>
                  <div className="space-y-4">
                    {registrationStatus !== "personal" && (
                      <div>
                        <label className="block text-sm font-medium text-black mb-2">
                          {t("registration.registrantName")}
                        </label>
                        <input
                          type="text"
                          value={formData.registrantName}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              registrantName: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-marigold"
                          required
                        />
                      </div>
                    )}
                    <div>
                      <label className="block text-sm font-medium text-black mb-2">
                        {t("registration.whatsapp")}
                      </label>
                      <input
                        type="tel"
                        value={formData.registrantWhatsapp}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            registrantWhatsapp: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-marigold"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-black mb-2">
                        {t("registration.email")}
                      </label>
                      <input
                        type="email"
                        value={formData.registrantEmail}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            registrantEmail: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-marigold"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-black mb-2">
                        {t("registration.participantName")}
                      </label>
                      <input
                        type="text"
                        value={formData.participantName}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            participantName: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-marigold"
                        required
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4">
                    <button
                      type="button"
                      onClick={onOpenTerms}
                      className="text-sm text-marigold hover:text-marigold/90"
                    >
                      {t("registration.viewTerms")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      className="px-6 py-2 bg-marigold text-white rounded-lg hover:bg-marigold/90"
                    >
                      {t("registration.next")}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-black mb-2">
                        {t("registration.bankName")}
                      </label>
                      <input
                        type="text"
                        value={formData.bankName}
                        onChange={(e) =>
                          setFormData({ ...formData, bankName: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-marigold"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-black mb-2">
                        {t("registration.accountNumber")}
                      </label>
                      <input
                        type="text"
                        value={formData.bankAccountNumber}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            bankAccountNumber: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-marigold"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-black mb-2">
                        {t("registration.accountName")}
                      </label>
                      <input
                        type="text"
                        value={formData.bankAccountName}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            bankAccountName: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-marigold"
                        required
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="text-sm text-marigold hover:text-marigold/90"
                    >
                      {t("registration.back")}
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-2 bg-marigold text-white rounded-lg hover:bg-marigold/90"
                    >
                      {t("registration.submit")}
                    </button>
                  </div>
                </>
              )}
            </form>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}

export default MasterclassRegistrationModal;
