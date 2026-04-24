import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { supabase } from "@/lib/supabase";
import { Eyebrow } from "@/components/ui/eyebrow";
import { cn } from "@/lib/utils";

/**
 * AdminDashboard — Musical Lumina
 *
 * Editorial overview. Four stat tiles showing event counts by status, plus
 * an inviting header. Data fetch is unchanged — one `events.status` query,
 * reduced client-side into the four buckets.
 */

interface DashboardStats {
  totalEvents: number;
  upcomingEvents: number;
  ongoingEvents: number;
  completedEvents: number;
}

const EASE = [0.19, 1, 0.22, 1] as const;

const stagger = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.08 },
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
};

export function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalEvents: 0,
    upcomingEvents: 0,
    ongoingEvents: 0,
    completedEvents: 0,
  });
  const [loading, setLoading] = useState(true);
  const reduceMotion = useReducedMotion();
  const initial = reduceMotion ? false : "hidden";

  useEffect(() => {
    const fetchStats = async () => {
      const { data: events, error } = await supabase
        .from("events")
        .select("status");

      if (error) {
        console.error("Error fetching stats:", error);
        setLoading(false);
        return;
      }

      const next = events.reduce<DashboardStats>(
        (acc, event) => {
          acc.totalEvents++;
          switch (event.status) {
            case "upcoming":
              acc.upcomingEvents++;
              break;
            case "ongoing":
              acc.ongoingEvents++;
              break;
            case "completed":
              acc.completedEvents++;
              break;
          }
          return acc;
        },
        {
          totalEvents: 0,
          upcomingEvents: 0,
          ongoingEvents: 0,
          completedEvents: 0,
        }
      );

      setStats(next);
      setLoading(false);
    };

    fetchStats();
  }, []);

  return (
    <AdminLayout>
      <motion.div
        variants={reduceMotion ? undefined : stagger}
        initial={initial}
        animate="visible"
        className="flex flex-col gap-8"
      >
        {/* Header */}
        <motion.header variants={fadeUp} className="flex flex-col gap-3">
          <Eyebrow withRule>Overview</Eyebrow>
          <h1 className="type-display-md text-burgundy">Dashboard</h1>
          <p className="type-body-md text-ink-muted max-w-2xl">
            A quick read on the event calendar. Click any stat to drill into
            the matching list.
          </p>
        </motion.header>

        {/* Stat grid */}
        <motion.div
          variants={reduceMotion ? undefined : stagger}
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          <StatCard
            label="Total events"
            value={stats.totalEvents}
            tone="neutral"
            loading={loading}
          />
          <StatCard
            label="Upcoming"
            value={stats.upcomingEvents}
            tone="upcoming"
            loading={loading}
          />
          <StatCard
            label="Ongoing"
            value={stats.ongoingEvents}
            tone="open"
            loading={loading}
          />
          <StatCard
            label="Completed"
            value={stats.completedEvents}
            tone="ended"
            loading={loading}
          />
        </motion.div>
      </motion.div>
    </AdminLayout>
  );
}

/* ============================================================================
   StatCard — editorial tile. Top accent rule color-codes the status, the
   number is the main object (Noto Serif display size), the label sits above
   as an eyebrow.
   ============================================================================ */

type StatTone = "neutral" | "upcoming" | "open" | "ended";

const TONE_ACCENT: Record<StatTone, string> = {
  neutral: "bg-burgundy",
  upcoming: "bg-marigold",
  open: "bg-[color:var(--status-open)]",
  ended: "bg-ink-muted",
};

function StatCard({
  label,
  value,
  tone,
  loading,
}: {
  label: string;
  value: number;
  tone: StatTone;
  loading: boolean;
}) {
  return (
    <motion.article
      variants={fadeUp}
      className="relative bg-surface-elevated border border-rule-hairline p-6 flex flex-col gap-4 overflow-hidden"
    >
      <span
        aria-hidden
        className={cn(
          "absolute inset-x-0 top-0 h-[2px]",
          TONE_ACCENT[tone]
        )}
      />
      <Eyebrow tone={tone === "neutral" ? "primary" : "accent"}>{label}</Eyebrow>
      <div className="flex items-baseline gap-2">
        {loading ? (
          <span
            aria-hidden
            className="inline-block h-12 w-16 bg-surface-canvas-warm motion-safe:animate-pulse"
          />
        ) : (
          <span className="type-display-md font-serif text-burgundy tracking-[-0.02em]">
            {value.toLocaleString()}
          </span>
        )}
        <span className="type-caption text-ink-muted">
          {value === 1 ? "event" : "events"}
        </span>
      </div>
    </motion.article>
  );
}
