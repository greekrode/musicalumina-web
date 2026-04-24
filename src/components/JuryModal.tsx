import Modal from "./Modal";
import type { Database } from "../lib/database.types";
import { Button } from "@/components/ui/button";
import { Image } from "@/components/ui/image";
import { Eyebrow } from "@/components/ui/eyebrow";
import { NoteGlyph } from "@/components/ui/wireframe-wave";

type Json = Database["public"]["Tables"]["event_jury"]["Row"]["credentials"];

type JuryModalProps = {
  isOpen: boolean;
  onClose: () => void;
  juror: {
    name: string;
    title: string;
    avatar: string | null;
    description: string | null;
    credentials?: Json;
  };
};

/**
 * JuryModal — quick profile view for a juror.
 * Migrated from the inline HeadlessUI Dialog to use the shared editorial Modal
 * shell so it inherits the same backdrop, animations, and chrome as every
 * other dialog on the site.
 */
export default function JuryModal({ isOpen, onClose, juror }: JuryModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      eyebrow={juror.title}
      title={juror.name}
      maxWidth="lg"
    >
      <div className="flex flex-col gap-6">
        {juror.avatar ? (
          <Image
            src={juror.avatar}
            alt={juror.name}
            aspect="3/4"
            containerClassName="w-full max-w-xs mx-auto border border-rule-hairline"
            fit="cover"
          />
        ) : (
          <div className="flex items-center justify-center bg-surface-canvas-warm border border-rule-hairline aspect-[3/4] max-w-xs mx-auto w-full">
            <NoteGlyph size={48} className="text-marigold/25" aria-hidden />
          </div>
        )}

        {juror.credentials && typeof juror.credentials === "object" && !Array.isArray(juror.credentials) && (
          <div className="border-t border-rule-hairline pt-5">
            <Eyebrow className="mb-3">Credentials</Eyebrow>
            <ul className="flex flex-col gap-1.5">
              {Object.entries(juror.credentials).map(([k, v]) => (
                <li
                  key={k}
                  className="type-body-sm text-ink-muted italic"
                >
                  <span className="text-ink-accent not-italic">{k}:</span>{" "}
                  {String(v)}
                </li>
              ))}
            </ul>
          </div>
        )}

        {juror.description && (
          <div
            className="type-body-md text-ink-body prose prose-sm max-w-none border-t border-rule-hairline pt-5"
            dangerouslySetInnerHTML={{ __html: juror.description }}
          />
        )}

        <div className="flex justify-end pt-2">
          <Button onClick={onClose}>Close</Button>
        </div>
      </div>
    </Modal>
  );
}
