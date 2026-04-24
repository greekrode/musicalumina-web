import Modal from "./Modal";
import { useLanguage } from "../lib/LanguageContext";
import { Button } from "@/components/ui/button";
import { NoteGlyph } from "@/components/ui/wireframe-wave";

interface ThankYouModalProps {
  isOpen: boolean;
  onClose: () => void;
  participantName: string;
  referenceNumber: string;
}

/**
 * ThankYouModal — celebratory confirmation after a successful registration.
 * Editorial composition: small mark, headline name, prominent reference
 * number as the page's main object, supporting copy, then close action.
 */
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
      eyebrow="Confirmed"
      title={t("thankYou.title")}
      maxWidth="2xl"
    >
      <div className="flex flex-col items-center text-center gap-7">
        {/* Decorative mark */}
        <span
          aria-hidden
          className="flex items-center justify-center"
        >
          <NoteGlyph size={40} className="text-marigold" />
        </span>

        <div className="flex flex-col gap-2">
          <span className="type-label text-ink-accent">
            {t("thankYou.message")}
          </span>
          <h4 className="type-headline-lg text-burgundy text-balance">
            {participantName}
          </h4>
        </div>

        {/* Reference number — the main object on this card */}
        <div className="w-full max-w-md flex flex-col gap-2 pt-6 pb-7 border-y border-rule-hairline">
          <span className="type-label text-ink-muted">
            {t("thankYou.referenceNumber")}
          </span>
          <p className="type-display-md font-serif text-burgundy tracking-[-0.01em] break-all">
            {referenceNumber}
          </p>
        </div>

        <p className="type-body-md text-ink-body max-w-prose">
          {t("thankYou.accepted")}
        </p>

        <p className="type-caption text-ink-accent italic font-medium">
          {t("thankYou.screenshotReminder")}
        </p>

        <Button onClick={onClose} size="lg">
          {t("thankYou.close")}
        </Button>
      </div>
    </Modal>
  );
}

export default ThankYouModal;
