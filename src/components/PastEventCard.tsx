import { Link } from "react-router-dom";
import { useLanguage } from "../lib/LanguageContext";
import { formatDateWithLocale } from "../lib/utils";
import {
  Card,
  CardContent,
  CardEyebrow,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { NoteGlyph } from "@/components/ui/wireframe-wave";
import { cn } from "@/lib/utils";

/**
 * PastEventCard — Musical Lumina
 *
 * Archive-tone variant of EventCard. Muted "past" accent rule, lower saturation
 * on the image, and a "Concluded" badge. Same routing contract preserved.
 */

interface PastEventCardProps {
  id: string;
  title: string;
  date: string;
  location: string;
  image: string;
}

function PastEventCard({ id, title, date, location, image }: PastEventCardProps) {
  const { t, language } = useLanguage();
  const formattedDate = formatDateWithLocale(date, language);

  return (
    <Card accent="past" interactive className="flex flex-col h-full overflow-hidden">
      {/* Image — desaturated slightly so past events read as archival */}
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-surface-canvas-warm">
        <img
          src={image}
          alt={title}
          loading="lazy"
          className={cn(
            "h-full w-full object-cover",
            "saturate-[0.65] transition-[transform,filter] duration-slower ease-out-quart",
            "motion-safe:group-hover:scale-[1.03] motion-safe:group-hover:saturate-100"
          )}
        />
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-b from-transparent to-surface-elevated pointer-events-none"
        />
      </div>

      <CardHeader className="pt-6 pb-3">
        <CardEyebrow className="text-ink-muted">Archive</CardEyebrow>
        <CardTitle className="text-balance">{title}</CardTitle>
      </CardHeader>

      <CardContent className="flex-1">
        <ul className="flex flex-col gap-2.5">
          <li className="flex items-start gap-2.5 type-caption text-ink-muted">
            <NoteGlyph size={14} className="text-ink-subtle mt-0.5 flex-shrink-0" />
            <span className="leading-snug">{formattedDate}</span>
          </li>
          <li className="flex items-start gap-2.5 type-caption text-ink-muted">
            <NoteGlyph size={14} className="text-ink-subtle mt-0.5 flex-shrink-0" />
            <span className="leading-snug">{location}</span>
          </li>
        </ul>
      </CardContent>

      <CardFooter className="flex items-center justify-between">
        <Badge status="ended" dot>
          {t("eventCard.statusConcluded")}
        </Badge>
        <Link
          to={`/past-event/${id}`}
          className={cn(
            "type-label text-burgundy",
            "transition-colors duration-fast ease-out-quart hover:text-marigold",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marigold focus-visible:ring-offset-2 rounded-sm",
            "flex items-center gap-2"
          )}
        >
          {t("eventCard.viewResults")}
          <span aria-hidden className="inline-block w-4 h-px bg-current" />
        </Link>
      </CardFooter>
    </Card>
  );
}

export default PastEventCard;
