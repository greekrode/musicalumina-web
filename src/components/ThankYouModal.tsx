import Modal from "./Modal";
import { useLanguage } from "../lib/LanguageContext";

interface ThankYouModalProps {
  isOpen: boolean;
  onClose: () => void;
  participantName: string;
  referenceNumber: string;
}

function ThankYouModal({
  isOpen,
  onClose,
  participantName,
  referenceNumber,
}: ThankYouModalProps) {
  const { t } = useLanguage();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t("thankYou.title")}
      maxWidth="2xl"
    >
      <div className="space-y-6">
        <h2 className="text-3xl font-serif text-center">
          {t("thankYou.message")} {participantName}
        </h2>

        <div className="text-center">
          <p className="text-2xl font-medium mb-2 text-burgundy">
            {t("thankYou.referenceNumber")}: {referenceNumber}
          </p>
        </div>

        <p className="text-gray-700 text-center">{t("thankYou.accepted")}</p>

        <p className="text-sm text-gray-600 italic font-semibold text-center">
          {t("thankYou.screenshotReminder")}
        </p>

        <div className="flex justify-center pt-4">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-marigold text-white rounded-md hover:bg-marigold/90 transition-colors"
          >
            {t("thankYou.close")}
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default ThankYouModal;
