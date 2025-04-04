import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { supabase } from "@/lib/supabase";

interface DashboardStats {
  totalEvents: number;
  upcomingEvents: number;
  ongoingEvents: number;
  completedEvents: number;
}

export function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalEvents: 0,
    upcomingEvents: 0,
    ongoingEvents: 0,
    completedEvents: 0,
  });

  useEffect(() => {
    const fetchStats = async () => {
      const { data: events, error } = await supabase
        .from("events")
        .select("status");

      if (error) {
        console.error("Error fetching stats:", error);
        return;
      }

      const stats = events.reduce(
        (acc: DashboardStats, event: { status: string }) => {
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

      setStats(stats);
    };

    fetchStats();
  }, []);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-900">Dashboard Overview</h1>
        </div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Events"
            value={stats.totalEvents}
            className="bg-blue-50"
          />
          <StatCard
            title="Upcoming Events"
            value={stats.upcomingEvents}
            className="bg-green-50"
          />
          <StatCard
            title="Ongoing Events"
            value={stats.ongoingEvents}
            className="bg-yellow-50"
          />
          <StatCard
            title="Completed Events"
            value={stats.completedEvents}
            className="bg-purple-50"
          />
        </div>
      </div>
    </AdminLayout>
  );
}

function StatCard({
  title,
  value,
  className,
}: {
  title: string;
  value: number;
  className?: string;
}) {
  return (
    <div
      className={`p-6 rounded-lg shadow-sm ${className}`}
    >
      <h3 className="text-lg font-medium text-gray-900">{title}</h3>
      <p className="mt-2 text-3xl font-semibold text-gray-900">{value}</p>
    </div>
  );
} 