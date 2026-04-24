import { sanitizeHtml } from "@/lib/sanitize";
import { Eyebrow } from "@/components/ui/eyebrow";
import { NoteGlyph } from "@/components/ui/wireframe-wave";
import { useLanguage } from "../lib/LanguageContext";
import { cn } from "@/lib/utils";

/**
 * EventDetails.sections — pure presentational sub-components extracted out
 * of EventDetails.tsx to keep the main page file from ballooning past 800
 * LOC. These are "dumb" in the React sense: they read props and render.
 * The stateful scroll-tracking accordion stays in the main file because
 * it owns refs that are awkward to lift across a module boundary.
 */

/* ------------------------------------------------------------------ */
/*  Shared minimal types                                               */
/* ------------------------------------------------------------------ */

export interface PrizeRow {
  id: string;
  title: string;
  amount?: number | null;
  description?: string | null;
}

export interface PrizeCategoryInput {
  id: string;
  name: string;
  prizes?: PrizeRow[];
  global_prizes?: PrizeRow[];
}

export interface JurorRow {
  id: string;
  name: string;
  title: string;
  avatar_url: string | null;
  credentials: Record<string, string> | null;
  description: string | null;
  created_at: string;
}

/* ------------------------------------------------------------------ */
/*  MetaItem — inline definition-list row used in the hero             */
/* ------------------------------------------------------------------ */

export function MetaItem({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="type-label text-ink-accent">{label}</dt>
      <dd className="type-body-md text-burgundy">{children}</dd>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  PrizesSection — global + per-category prize grid                   */
/* ------------------------------------------------------------------ */

export function PrizesSection({
  categories,
}: {
  categories: PrizeCategoryInput[];
}) {
  const { t } = useLanguage();
  const globalPrizes = categories[0]?.global_prizes || [];

  return (
    <div className="flex flex-col gap-8">
      {globalPrizes.length > 0 && (
        <div>
          <h3 className="type-headline-sm text-burgundy mb-4">
            {t("eventDetails.overallPrizes")}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {globalPrizes.map((prize) => (
              <PrizeCard key={prize.id} prize={prize} />
            ))}
          </div>
        </div>
      )}

      {categories.map(
        (category) =>
          category.prizes &&
          category.prizes.length > 0 && (
            <div key={category.id}>
              <h3 className="type-headline-sm text-burgundy mb-4">
                {category.name} {t("eventDetails.prizes")}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {category.prizes.map((prize) => (
                  <PrizeCard key={prize.id} prize={prize} />
                ))}
              </div>
            </div>
          )
      )}
    </div>
  );
}

function PrizeCard({ prize }: { prize: PrizeRow }) {
  const hasAmount =
    prize.amount != null && typeof prize.amount === "number" && prize.amount > 0;
  const hasDescription = Boolean(prize.description);
  const isMinimal = !hasAmount && !hasDescription;

  const baseClass = cn(
    "relative bg-surface-elevated border border-rule-hairline",
    "before:absolute before:left-0 before:top-5 before:bottom-5 before:w-[2px] before:bg-marigold/70 before:content-['']"
  );

  if (isMinimal) {
    return (
      <article
        className={cn(
          baseClass,
          "p-7 lg:p-9 pl-8 lg:pl-10",
          "flex items-center min-h-[140px] overflow-hidden"
        )}
      >
        <h4 className="type-headline-md text-burgundy leading-tight text-balance relative z-10">
          {prize.title}
        </h4>
        <NoteGlyph
          aria-hidden
          size={72}
          className="absolute -right-2 -bottom-3 text-marigold/10 pointer-events-none rotate-[-8deg]"
        />
      </article>
    );
  }

  return (
    <article className={cn(baseClass, "p-5 lg:p-6 pl-7 lg:pl-8")}>
      <h4 className="type-title-lg text-burgundy leading-tight">
        {prize.title}
      </h4>
      {hasAmount && (
        <p className="type-body-md text-ink-accent font-semibold mt-2">
          IDR {prize.amount!.toLocaleString()}
        </p>
      )}
      {hasDescription && (
        <div
          className="type-body-sm text-ink-body prose prose-sm max-w-none mt-3"
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(prize.description!) }}
        />
      )}
    </article>
  );
}

/* ------------------------------------------------------------------ */
/*  JuryPanel — adjudicators grid                                      */
/* ------------------------------------------------------------------ */

export function JuryPanel({ juryMembers }: { juryMembers: JurorRow[] }) {
  const sorted = [...juryMembers].sort(
    (a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      {sorted.map((juror) => (
        <article
          key={juror.id}
          className="flex flex-col gap-5 border-t border-rule-hairline pt-6"
        >
          {juror.avatar_url && (
            <div className="aspect-[3/4] overflow-hidden bg-surface-canvas-warm">
              <img
                src={juror.avatar_url}
                alt={juror.name}
                loading="lazy"
                className="h-full w-full object-cover"
              />
            </div>
          )}
          <div className="flex flex-col gap-2">
            <Eyebrow>{juror.title}</Eyebrow>
            <h3 className="type-headline-md text-burgundy">{juror.name}</h3>
            {juror.credentials && (
              <ul className="flex flex-col gap-1 mt-1">
                {Object.entries(juror.credentials).map(([k, v]) => (
                  <li
                    key={k}
                    className="type-caption text-ink-muted italic"
                  >
                    {k}: {v}
                  </li>
                ))}
              </ul>
            )}
            {juror.description && (
              <div
                className="type-body-sm text-ink-body prose prose-sm max-w-none mt-3"
                dangerouslySetInnerHTML={{
                  __html: sanitizeHtml(juror.description),
                }}
              />
            )}
          </div>
        </article>
      ))}
    </div>
  );
}
