import Modal from './Modal';

interface ThankYouModalProps {
  isOpen: boolean;
  onClose: () => void;
  participantName: string;
  referenceNumber: string;
}

function ThankYouModal({ isOpen, onClose, participantName, referenceNumber }: ThankYouModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Thank You!" maxWidth="2xl">
      <div className="space-y-6 py-4">
        <h2 className="text-3xl font-serif text-center">
          Thank you for registering, {participantName}
        </h2>
        
        <div className="text-center">
          <h3 className="text-xl font-medium mb-2">
            Registration reference number: {referenceNumber}
          </h3>
        </div>

        <p className="text-gray-700 text-center">
          We really appreciate your participation in this competition. Your registration has been accepted by us. 
          We will reconfirm with you via Whatsapp. Happy practicing and see you!
        </p>

        <p className="text-sm text-gray-600 italic font-semibold text-center">
          *Please screenshot this page or keep the registration reference number.
        </p>

        <div className="flex justify-center pt-4">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-[#CFB53B] text-white rounded-md hover:bg-[#CFB53B]/90 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default ThankYouModal; 