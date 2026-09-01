import Modal from "./Modal";
import { sanitizeHtml } from "@/lib/sanitize";
import { Button } from "@/components/ui/button";
import { Image } from "@/components/ui/image";
import { Eyebrow } from "@/components/ui/eyebrow";
import { NoteGlyph } from "@/components/ui/wireframe-wave";
import { useLanguage } from "@/lib/LanguageContext";

export type ArtistProfile = {
  id: string;
  name: string;
  title: string;
  avatar_url: string | null;
  description: string | null;
  credentials: Record<string, string> | null;
};

type ArtistProfileModalProps = {
  isOpen: boolean;
  onClose: () => void;
  artist: ArtistProfile | null;
};

/**
 * ArtistProfileModal — full artist dossier.
 * HERO: on wide screens the portrait sits beside the bio so the extra
 * width is used for reading, not empty margin.
 */
export default function ArtistProfileModal({
  isOpen,
  onClose,
  artist,
}: ArtistProfileModalProps) {
  const { t } = useLanguage();

  if (!artist) return null;

  const credentialEntries =
    artist.credentials && typeof artist.credentials === "object"
      ? Object.entries(artist.credentials)
      : [];

  const portrait = artist.avatar_url ? (
    <Image
      src={artist.avatar_url}
      alt={artist.name}
      aspect="3/4"
      containerClassName="w-full border border-rule-hairline outline outline-1 outline-black/10"
      fit="cover"
    />
  ) : (
    <div className="flex aspect-[3/4] w-full items-center justify-center bg-surface-canvas-warm border border-rule-hairline outline outline-1 outline-black/10">
      <NoteGlyph size={48} className="text-marigold/25" aria-hidden />
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      eyebrow={artist.title}
      title={artist.name}
      maxWidth="4xl"
      speed="snappy"
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,17rem)_minmax(0,1fr)] lg:gap-10 lg:items-start">
        <div className="w-full max-w-xs mx-auto lg:max-w-none lg:mx-0">
          {portrait}
        </div>

        <div className="flex min-w-0 flex-col gap-6">
          {credentialEntries.length > 0 && (
            <div>
              <Eyebrow className="mb-3">
                {t("artistsInResidence.credentials")}
              </Eyebrow>
              <ul className="flex flex-col gap-1.5">
                {credentialEntries.map(([key, value]) => (
                  <li key={key} className="type-body-sm text-ink-muted italic">
                    <span className="text-ink-accent not-italic">{key}:</span>{" "}
                    {value}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {artist.description && (
            <div
              className="type-body-md text-ink-body prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{
                __html: sanitizeHtml(artist.description),
              }}
            />
          )}

          <div className="flex justify-end pt-2">
            <Button onClick={onClose} className="active:scale-[0.96]">
              {t("artistsInResidence.close")}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
