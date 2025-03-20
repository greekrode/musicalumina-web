import { type ReactNode } from 'react';
import Modal from './Modal';

interface JuryModalProps {
  isOpen: boolean;
  onClose: () => void;
  juror: {
    name: string;
    title: string;
    avatar: string;
    description?: string;
  } | null;
}

function JuryModal({ isOpen, onClose, juror }: JuryModalProps) {
  if (!juror) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Jury Profile" maxWidth="2xl">
      <div className="flex flex-col items-center mb-6">
        <img 
          src={juror.avatar}
          alt={juror.name}
          className="w-48 h-48 rounded-full object-cover mb-4"
        />
        <h3 className="text-2xl font-serif text-black text-center">{juror.name}</h3>
        <p className="text-[#CFB53B] font-medium text-center mt-2">{juror.title}</p>
      </div>
      
      {juror.description && (
        <div className="text-black/80 text-left">
          {juror.description.split('\\n').map((line, index) => (
            <p key={index} className="mb-2">{line}</p>
          ))}
        </div>
      )}
    </Modal>
  );
}

export default JuryModal;