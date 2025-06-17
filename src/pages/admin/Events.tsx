import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/lib/database.types";
import { AddEventModal } from "@/components/admin/AddEventModal";
import { EditEventModal } from "@/components/admin/EditEventModal";
import { Card, CardContent } from "@/components/ui/card";

type Event = Database["public"]["Tables"]["events"]["Row"];

export function AdminEvents() {
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .order("start_date", { ascending: false });

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error("Error fetching events:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (event: Event) => {
    setEditingEvent(event);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header - responsive layout */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="text-2xl font-semibold text-gray-900">Events</h1>
          <Button 
            variant="elegant" 
            onClick={() => setIsAddModalOpen(true)}
            className="w-full sm:w-auto"
          >
            Add Event
          </Button>
        </div>

        {/* Desktop Table View */}
        <div className="hidden lg:block overflow-hidden rounded-lg border border-gray-200 bg-white shadow">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Title</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Type</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Start Date</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Location</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Max Quota</th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-sm text-gray-500">
                    Loading...
                  </td>
                </tr>
              ) : events.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-sm text-gray-500">
                    No events found
                  </td>
                </tr>
              ) : (
                events.map((event) => (
                  <tr key={event.id}>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                      {event.title}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {event.type.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ')}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm">
                      <span
                        className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                          event.status === "upcoming"
                            ? "bg-blue-100 text-blue-800"
                            : event.status === "ongoing"
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {event.status}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {new Date(event.start_date).toLocaleDateString()}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {event.location}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {event.max_quota ? event.max_quota.toLocaleString() : "Unlimited"}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm">
                      <Button 
                        variant="ghost" 
                        className="mr-2"
                        onClick={() => handleEdit(event)}
                      >
                        Edit
                      </Button>
                      <Button variant="ghost" className="text-red-600 hover:text-red-800">
                        Delete
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="lg:hidden space-y-4">
          {isLoading ? (
            <Card>
              <CardContent className="p-6">
                <div className="text-center text-sm text-gray-500">Loading...</div>
              </CardContent>
            </Card>
          ) : events.length === 0 ? (
            <Card>
              <CardContent className="p-6">
                <div className="text-center text-sm text-gray-500">No events found</div>
              </CardContent>
            </Card>
          ) : (
            events.map((event) => (
              <Card key={event.id} className="border border-gray-200 shadow-sm">
                <CardContent className="p-4">
                  <div className="space-y-3">
                    {/* Title and Status */}
                    <div className="flex items-start justify-between">
                      <h3 className="font-semibold text-gray-900 text-base leading-tight pr-2">
                        {event.title}
                      </h3>
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold leading-4 flex-shrink-0 ${
                          event.status === "upcoming"
                            ? "bg-blue-100 text-blue-800"
                            : event.status === "ongoing"
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {event.status}
                      </span>
                    </div>

                    {/* Event Details Grid */}
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-gray-500 block">Type</span>
                        <span className="text-gray-900 font-medium">
                          {event.type.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ')}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500 block">Start Date</span>
                        <span className="text-gray-900 font-medium">
                          {new Date(event.start_date).toLocaleDateString()}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500 block">Location</span>
                        <span className="text-gray-900 font-medium">{event.location}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 block">Max Quota</span>
                        <span className="text-gray-900 font-medium">
                          {event.max_quota ? event.max_quota.toLocaleString() : "Unlimited"}
                        </span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 pt-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="flex-1"
                        onClick={() => handleEdit(event)}
                      >
                        Edit
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="flex-1 text-red-600 hover:text-red-800 border-red-200 hover:border-red-300"
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      <AddEventModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onEventAdded={fetchEvents}
      />

      <EditEventModal
        isOpen={!!editingEvent}
        onClose={() => setEditingEvent(null)}
        onEventUpdated={fetchEvents}
        event={editingEvent}
      />
    </AdminLayout>
  );
} 