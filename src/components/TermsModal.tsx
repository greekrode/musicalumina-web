import Modal from "./Modal";

interface TermsModalProps {
  isOpen: boolean;
  onClose: () => void;
  terms?: string;
}

function TermsModal({ isOpen, onClose, terms }: TermsModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Terms and Conditions"
      maxWidth="2xl"
    >
      <div className="prose prose-sm max-w-none text-black/80 font-sans">
        {terms ? (
          <div
            dangerouslySetInnerHTML={{ __html: terms }}
            className="[&_h1]:font-playfair [&_h2]:font-playfair [&_h3]:font-playfair [&_h4]:font-playfair
                       [&_h1]:text-2xl [&_h2]:text-xl [&_h3]:text-lg [&_h4]:text-base
                       [&_p]:mb-4 [&_ul]:mb-4 [&_ol]:mb-4
                       [&_li]:mb-2 [&_li]:text-black/80
                       [&_ul]:list-disc [&_ul]:list-inside
                       [&_ol]:list-decimal [&_ol]:list-inside"
          />
        ) : (
          <p>No terms and conditions available</p>
        )}
      </div>
    </Modal>
  );
}

export default TermsModal;
