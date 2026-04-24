import { Loader2, AlertTriangle } from "lucide-react";
import Modal from "./Modal";
import { useLanguage } from "../lib/LanguageContext";

interface LoadingModalProps {
  isOpen: boolean;
}

/**
 * LoadingModal — non-dismissable loading state shown during long submissions.
 * Editorial spinner + warning band that asks the user not to close the tab.
 */
function LoadingModal({ isOpen }: LoadingModalProps) {
  const { t } = useLanguage();

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        /* Intentionally non-dismissable while in flight */
      }}
      eyebrow="In progress"
      title={t("loading.title")}
      maxWidth="md"
      hideClose
    >
      <div className="flex flex-col items-center text-center gap-7 py-2">
        <Loader2
          className="h-12 w-12 text-marigold animate-spin"
          aria-hidden
        />

        <p className="type-body-md text-ink-body">{t("loading.message")}</p>

        <div className="w-full border-l-2 border-[color:var(--status-upcoming)] bg-[color:var(--status-upcoming-bg)] text-[color:var(--status-upcoming)] px-5 py-4 flex items-start gap-3 text-left">
          <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <p className="type-body-sm">{t("loading.warning")}</p>
        </div>
      </div>
    </Modal>
  );
}

export default LoadingModal;
