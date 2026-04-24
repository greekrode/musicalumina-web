import Modal from "./Modal";
import { useLanguage } from "../lib/LanguageContext";

interface TermsModalProps {
  isOpen: boolean;
  onClose: () => void;
  terms?: string;
}

function TermsModal({ isOpen, onClose, terms }: TermsModalProps) {
  const { t } = useLanguage();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      eyebrow={t("eventDetails.importantInfo") || "Important"}
      title="Terms & Conditions"
      maxWidth="2xl"
    >
      {terms ? (
        <div
          dangerouslySetInnerHTML={{ __html: terms }}
          className={[
            // Base prose treatment
            "prose prose-sm max-w-none type-body-md text-ink-body",
            // Headings tuned to the editorial system
            "[&_h1]:font-serif [&_h1]:text-burgundy [&_h1]:type-headline-md [&_h1]:mt-6 [&_h1]:mb-3",
            "[&_h2]:font-serif [&_h2]:text-burgundy [&_h2]:type-headline-sm [&_h2]:mt-6 [&_h2]:mb-3",
            "[&_h3]:font-serif [&_h3]:text-burgundy [&_h3]:type-title-lg [&_h3]:mt-5 [&_h3]:mb-2",
            "[&_h4]:font-sans [&_h4]:text-burgundy [&_h4]:type-title-md [&_h4]:mt-4 [&_h4]:mb-2 [&_h4]:font-semibold",
            // Paragraphs and lists
            "[&_p]:mb-4 [&_p]:text-ink-body [&_p]:leading-relaxed",
            "[&_ul]:mb-4 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:marker:text-marigold",
            "[&_ol]:mb-4 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:marker:text-ink-accent",
            "[&_li]:mb-1.5 [&_li]:text-ink-body",
            // Inline emphasis
            "[&_strong]:text-burgundy [&_strong]:font-semibold",
            "[&_a]:text-burgundy [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:text-marigold",
            // Block quote
            "[&_blockquote]:border-l-2 [&_blockquote]:border-marigold [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-ink-muted",
          ].join(" ")}
        />
      ) : (
        <p className="type-body-md text-ink-muted italic">
          No terms and conditions available.
        </p>
      )}
    </Modal>
  );
}

export default TermsModal;
