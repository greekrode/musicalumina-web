import { Link } from "react-router-dom";
import type { EventStatus, EventType } from "../lib/database.types";
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
import { Badge, type BadgeStatus } from "@/components/ui/badge";
import { NoteGlyph } from "@/components/ui/wireframe-wave";
import { cn } from "@/lib/utils";

/**
 * EventCard — Musical Lumina
 *
 * Editorial event card. Uses the Card primitive's `accent` slot to color-code
 * content type with a 2px top rule — no icon clutter, glanceable at speed.
 *
 * Data flow is preserved: same props, same routing rules, same disabled state
 * for upcoming events. Only the visual composition changes.
 */

interface EventCardProps {
  id: string;
  title: string;
  type: EventType;
  dates: string[];
  location: string;
  status: EventStatus;
  image: string;
}

type CardAccent = "event" | "masterclass" | "group" | "past";

const ACCENT_BY_TYPE: Record<EventType, CardAccent> = {
  festival: "event",
  competition: "event",
  masterclass: "masterclass",
  "group class": "group",
};

function EventCard({
  id,
  title,
  type,
  dates,
  location,
  status,
  image,
}: EventCardProps) {
  const { t, language } = useLanguage();

  const accent: CardAccent = status === "completed" ? "past" : ACCENT_BY_TYPE[type];

  // Route resolution preserved from original implementation.
  const href =
    status === "completed"
      ? type === "masterclass"
        ? `/past-masterclass/${id}`
        : `/past-event/${id}`
      : type === "masterclass"
        ? `/masterclass/${id}`
        : type === "group class"
          ? `/group-class/${id}`
          : `/event/${id}`;

  // CTA label + disabled state mirror the original business logic.
  const ctaConfig = (() => {
    if (status === "completed") {
      return { label: t("eventCard.viewResults"), disabled: false };
    }
    if (status === "upcoming") {
      return { label: t("eventCard.comingSoon"), disabled: true };
    }
    return { label: t("eventCard.viewDetails"), disabled: false };
  })();

  // Status pill: shows registration STATE, not the CTA. The CTA lives in the
  // footer link — badge + link must say different things or the card feels
  // duplicative.
  const statusPill: { status: BadgeStatus; label: string } = (() => {
    if (status === "completed") return { status: "ended", label: t("eventCard.statusConcluded") };
    if (status === "upcoming") return { status: "upcoming", label: t("eventCard.statusUpcoming") };
    return { status: "open", label: t("eventCard.statusOpen") };
  })();

  const formattedDates = dates
    .map((d) => formatDateWithLocale(d, language))
    .join(" · ");

  return (
    <Card
      accent={accent}
      interactive={!ctaConfig.disabled}
      className={cn(
        "flex flex-col h-full overflow-hidden",
        ctaConfig.disabled && "opacity-75 hover:opacity-100"
      )}
    >
      {/* Image — flush to card edges, sits just below the 2px accent rule */}
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-surface-canvas-warm">
        <img
          src={image}
          alt={title}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-slower ease-out-quart motion-safe:group-hover:scale-[1.03]"
        />
        {/* Subtle ivory gradient at bottom of image to separate from content */}
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-b from-transparent to-surface-elevated pointer-events-none"
        />
      </div>

      <CardHeader className="pt-6 pb-3">
        <CardEyebrow>{t(`eventCard.eventTypes.${type}`)}</CardEyebrow>
        <CardTitle className="text-balance">{title}</CardTitle>
      </CardHeader>

      <CardContent className="flex-1">
        <ul className="flex flex-col gap-2.5">
          <li className="flex items-start gap-2.5 type-caption text-ink-muted">
            <NoteGlyph size={14} className="text-marigold mt-0.5 flex-shrink-0" />
            <span className="leading-snug">{formattedDates}</span>
          </li>
          <li className="flex items-start gap-2.5 type-caption text-ink-muted">
            <NoteGlyph size={14} className="text-marigold mt-0.5 flex-shrink-0" />
            <span className="leading-snug">{location}</span>
          </li>
        </ul>
      </CardContent>

      <CardFooter className="flex items-center justify-between">
        <Badge status={statusPill.status} dot>
          {statusPill.label}
        </Badge>
        {ctaConfig.disabled ? (
          <span className="type-label text-ink-subtle">{ctaConfig.label}</span>
        ) : (
          <Link
            to={href}
            className={cn(
              "type-label text-burgundy",
              "transition-colors duration-fast ease-out-quart hover:text-marigold",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marigold focus-visible:ring-offset-2 rounded-sm",
              "flex items-center gap-2"
            )}
          >
            {ctaConfig.label}
            <span aria-hidden className="inline-block w-4 h-px bg-current" />
          </Link>
        )}
      </CardFooter>
    </Card>
  );
}

export default EventCard;
