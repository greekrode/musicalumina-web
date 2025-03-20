import Modal from './Modal';

interface TermsModalProps {
  isOpen: boolean;
  onClose: () => void;
  terms?: string;
}

function TermsModal({ isOpen, onClose, terms }: TermsModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Terms and Conditions" maxWidth="4xl">
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
          <>
            <h3 className="font-playfair text-lg mb-4">1. Registration and Eligibility</h3>
            <p className="mb-4">Participants must meet the age requirements for their respective categories as of the competition date. Age verification documents may be required.</p>
            
            <h3 className="font-playfair text-lg mb-4">2. Performance Guidelines</h3>
            <ul className="list-disc list-inside mb-4">
              <li className="mb-2">All performances must be memorized unless otherwise stated.</li>
              <li className="mb-2">Participants must strictly adhere to the time limits specified for each category.</li>
              <li className="mb-2">Sheet music must be provided to the jury (one original copy).</li>
            </ul>
            
            <h3 className="font-playfair text-lg mb-4">3. Competition Rules</h3>
            <ul className="list-disc list-inside mb-4">
              <li className="mb-2">The order of performance will be determined by the organizer.</li>
              <li className="mb-2">Participants must arrive at least 30 minutes before their scheduled performance time.</li>
              <li className="mb-2">The jury's decision is final and binding.</li>
            </ul>
            
            <h3 className="font-playfair text-lg mb-4">4. Recording and Photography</h3>
            <p className="mb-4">The organizer reserves the right to record, photograph, and broadcast any performance without compensation to the participants.</p>
            
            <h3 className="font-playfair text-lg mb-4">5. Cancellation Policy</h3>
            <ul className="list-disc list-inside mb-4">
              <li className="mb-2">Registration fees are non-refundable.</li>
              <li className="mb-2">In case of illness or emergency, please contact the organizer immediately.</li>
            </ul>
            
            <h3 className="font-playfair text-lg mb-4">6. Awards and Certificates</h3>
            <ul className="list-disc list-inside mb-4">
              <li className="mb-2">All participants will receive a certificate of participation.</li>
              <li className="mb-2">Winners must be present at the award ceremony to receive their prizes.</li>
              <li className="mb-2">Prize money will be distributed within 30 days after the competition.</li>
            </ul>
            
            <h3 className="font-playfair text-lg mb-4">7. Code of Conduct</h3>
            <p className="mb-4">Participants, teachers, and parents are expected to maintain professional conduct throughout the competition. Any form of misconduct may result in disqualification.</p>
          </>
        )}
      </div>
    </Modal>
  );
}

export default TermsModal;