import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useMediaQuery } from "@/hooks/use-media-query";
import { supabase } from "@/lib/supabase";
import { format } from "date-fns";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type Registration = {
  id: string;
  event_id: string;
  event_title: string;
  category_name: string;
  subcategory_name: string;
  registrant_name: string;
  registrant_whatsapp: string;
  participant_name: string;
  registrant_status: "personal" | "parents" | "teacher";
  registrant_email: string;
  song_title: string | null;
  song_duration: string | null;
  birth_certificate_url: string;
  song_pdf_url: string | null;
  bank_name: string;
  bank_account_number: string;
  bank_account_name: string;
  payment_receipt_url: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
};

type Event = {
  id: string;
  title: string;
};

type Category = {
  id: string;
  name: string;
  event_subcategories: Subcategory[];
};

type Subcategory = {
  id: string;
  name: string;
};

export default function AdminRegistrations() {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [selectedSubcategoryId, setSelectedSubcategoryId] =
    useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRegistration, setSelectedRegistration] =
    useState<Registration | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<{
    url: string;
    type: string;
  } | null>(null);
  const isMobile = useMediaQuery("(max-width: 768px)");

  useEffect(() => {
    fetchEvents();
  }, []);

  useEffect(() => {
    if (selectedEventId) {
      fetchCategories();
      setSelectedCategoryId("");
      setSelectedSubcategoryId("");
    } else {
      setCategories([]);
    }
  }, [selectedEventId]);

  useEffect(() => {
    fetchRegistrations();
  }, [selectedEventId, selectedCategoryId, selectedSubcategoryId]);

  async function fetchEvents() {
    try {
      const { data: eventsData, error: eventsError } = await supabase
        .from("events")
        .select("id, title")
        .eq("status", "ongoing")
        .order("created_at", { ascending: false });

      if (eventsError) throw eventsError;
      setEvents(eventsData || []);
    } catch (error) {
      console.error("Error fetching events:", error);
      toast.error("Failed to load events");
    }
  }

  async function fetchCategories() {
    try {
      const { data: categoriesData, error: categoriesError } = await supabase
        .from("event_categories")
        .select(
          `
          id,
          name,
          event_subcategories (
            id,
            name
          )
        `
        )
        .eq("event_id", selectedEventId)
        .order("name");

      if (categoriesError) throw categoriesError;
      setCategories(categoriesData || []);
    } catch (error) {
      console.error("Error fetching categories:", error);
      toast.error("Failed to load categories");
    }
  }

  async function fetchRegistrations() {
    try {
      setIsLoading(true);

      // Don't fetch if no event is selected
      if (!selectedEventId) {
        setRegistrations([]);
        return;
      }

      let query = supabase
        .from("registrations")
        .select(
          `
          id,
          event_id,
          events!inner (
            title
          ),
          event_categories!inner (
            name
          ),
          event_subcategories!inner (
            name
          ),
          registrant_name,
          registrant_whatsapp,
          registrant_email,
          registrant_status,
          participant_name,
          song_title,
          song_duration,
          birth_certificate_url,
          song_pdf_url,
          bank_name,
          bank_account_number,
          bank_account_name,
          payment_receipt_url,
          status,
          created_at
        `
        )
        .eq("event_id", selectedEventId)
        .order("created_at", { ascending: false });

      if (selectedCategoryId) {
        query = query.eq("category_id", selectedCategoryId);
      }

      if (selectedSubcategoryId) {
        query = query.eq("subcategory_id", selectedSubcategoryId);
      }

      const { data: eventsData, error: eventsError } = await query;

      if (eventsError) throw eventsError;

      if (!eventsData) {
        setRegistrations([]);
        return;
      }

      const formattedData: Registration[] = eventsData.map((reg: any) => ({
        id: reg.id,
        event_id: reg.event_id,
        event_title: reg.events.title,
        category_name: reg.event_categories.name,
        subcategory_name: reg.event_subcategories.name,
        registrant_name: reg.registrant_name,
        registrant_whatsapp: reg.registrant_whatsapp,
        registrant_email: reg.registrant_email,
        registrant_status: reg.registrant_status,
        participant_name: reg.participant_name,
        song_title: reg.song_title,
        song_duration: reg.song_duration,
        birth_certificate_url: reg.birth_certificate_url,
        song_pdf_url: reg.song_pdf_url,
        bank_name: reg.bank_name,
        bank_account_number: reg.bank_account_number,
        bank_account_name: reg.bank_account_name,
        payment_receipt_url: reg.payment_receipt_url,
        status: reg.status,
        created_at: reg.created_at,
      }));

      setRegistrations(formattedData);
    } catch (error) {
      console.error("Error fetching registrations:", error);
      toast.error("Failed to load registrations");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleStatusChange(
    id: string,
    newStatus: Registration["status"]
  ) {
    try {
      const { error } = await supabase
        .from("registrations")
        .update({ status: newStatus })
        .eq("id", id);

      if (error) throw error;

      setRegistrations((prev) =>
        prev.map((reg) => (reg.id === id ? { ...reg, status: newStatus } : reg))
      );

      toast.success(`Registration ${newStatus} successfully`);
    } catch (error) {
      console.error("Error updating registration:", error);
      toast.error("Failed to update registration status");
    }
  }

  const handleDocumentView = (url: string) => {
    const fileType = url.toLowerCase().endsWith(".pdf") ? "pdf" : "image";
    setSelectedDocument({ url, type: fileType });
  };

  const columns = [
    {
      header: "Category",
      accessorKey: "category_name",
    },
    {
      header: "Subcategory",
      accessorKey: "subcategory_name",
    },
    {
      header: "Participant",
      accessorKey: "participant_name",
    },
    ...(!isMobile
      ? [
          {
            header: "Registrant",
            accessorKey: "registrant_name",
            cell: (row: Registration) => (
              <div>
                <div className="font-medium">{row.registrant_name}</div>
                <div className="text-sm text-gray-500">
                  {row.registrant_whatsapp}
                </div>
              </div>
            ),
          },
          {
            header: "Status",
            accessorKey: "status",
            cell: (row: Registration) => (
              <div
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  row.status === "pending"
                    ? "bg-yellow-100 text-yellow-800"
                    : row.status === "approved"
                    ? "bg-green-100 text-green-800"
                    : "bg-red-100 text-red-800"
                }`}
              >
                {row.status}
              </div>
            ),
          },
          {
            header: "Actions",
            accessorKey: "id",
            cell: (row: Registration) => (
              <div className="flex space-x-2">
                <Button
                  variant="elegant"
                  size="sm"
                  onClick={() => setSelectedRegistration(row)}
                >
                  View Details
                </Button>
                {row.status === "pending" && (
                  <>
                    <Button
                      variant="elegant"
                      size="sm"
                      onClick={() => handleStatusChange(row.id, "approved")}
                      className="!border-green-600 !text-green-600 hover:!bg-green-600 hover:!text-white"
                    >
                      Approve
                    </Button>
                    <Button
                      variant="elegant"
                      size="sm"
                      onClick={() => handleStatusChange(row.id, "rejected")}
                      className="!border-red-600 !text-red-600 hover:!bg-red-600 hover:!text-white"
                    >
                      Reject
                    </Button>
                  </>
                )}
              </div>
            ),
          },
        ]
      : []),
    ...(isMobile
      ? [
          {
            header: "Actions",
            accessorKey: "id",
            cell: (row: Registration) => (
              <Button
                variant="elegant"
                size="sm"
                onClick={() => setSelectedRegistration(row)}
              >
                View
              </Button>
            ),
          },
        ]
      : []),
  ].filter(Boolean);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-900">
            Registrations
          </h1>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <select
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-marigold focus:border-marigold"
            >
              <option value="">Select Event</option>
              {events.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.title}
                </option>
              ))}
            </select>

            {selectedEventId && (
              <>
                <select
                  value={selectedCategoryId}
                  onChange={(e) => {
                    setSelectedCategoryId(e.target.value);
                    setSelectedSubcategoryId("");
                  }}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-marigold focus:border-marigold"
                >
                  <option value="">All Categories</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>

                {selectedCategoryId && (
                  <select
                    value={selectedSubcategoryId}
                    onChange={(e) => setSelectedSubcategoryId(e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-marigold focus:border-marigold"
                  >
                    <option value="">All Subcategories</option>
                    {categories
                      .find((cat) => cat.id === selectedCategoryId)
                      ?.event_subcategories.map((subcategory) => (
                        <option key={subcategory.id} value={subcategory.id}>
                          {subcategory.name}
                        </option>
                      ))}
                  </select>
                )}
              </>
            )}
          </div>

          {!selectedEventId ? (
            <div className="text-center py-12 text-gray-500">
              Please select an event to view registrations
            </div>
          ) : (
            <DataTable
              data={registrations}
              columns={columns}
              isLoading={isLoading}
              searchKey="participant_name"
              pageSize={10}
            />
          )}
        </div>

        {/* Registration Details View - Desktop Slider */}
        {!isMobile && (
          <Sheet
            open={!!selectedRegistration}
            onOpenChange={() => setSelectedRegistration(null)}
          >
            <SheetContent className="w-[600px] sm:max-w-[600px] bg-white border-l shadow-2xl animate-slide-in">
              {selectedRegistration && (
                <>
                  <SheetHeader>
                    <SheetTitle>Registration Details</SheetTitle>
                  </SheetHeader>
                  <ScrollArea className="h-[calc(100vh-80px)] pr-4">
                    <RegistrationDetails
                      registration={selectedRegistration}
                      onStatusChange={(status) => {
                        handleStatusChange(selectedRegistration.id, status);
                        setSelectedRegistration(null);
                      }}
                      handleDocumentView={handleDocumentView}
                    />
                  </ScrollArea>
                </>
              )}
            </SheetContent>
          </Sheet>
        )}

        {/* Registration Details View - Mobile Modal */}
        {isMobile && (
          <Dialog
            open={!!selectedRegistration}
            onOpenChange={() => setSelectedRegistration(null)}
          >
            <DialogContent className="w-[95vw] max-h-[90vh] overflow-auto p-6 bg-white">
              {selectedRegistration && (
                <>
                  <DialogTitle>Registration Details</DialogTitle>
                  <RegistrationDetails
                    registration={selectedRegistration}
                    onStatusChange={(status) => {
                      handleStatusChange(selectedRegistration.id, status);
                      setSelectedRegistration(null);
                    }}
                    handleDocumentView={handleDocumentView}
                  />
                </>
              )}
            </DialogContent>
          </Dialog>
        )}

        <Dialog
          open={!!selectedDocument}
          onOpenChange={() => setSelectedDocument(null)}
        >
          <DialogContent className="max-w-4xl w-[90vw] h-[90vh] p-0 overflow-hidden">
            {selectedDocument?.type === "pdf" ? (
              <iframe
                src={selectedDocument.url}
                className="w-full h-full"
                title="Document Viewer"
              />
            ) : (
              <div className="w-full h-full overflow-auto">
                <img
                  src={selectedDocument?.url}
                  alt="Document"
                  className="w-full h-auto object-contain"
                />
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}

interface RegistrationDetailsProps {
  registration: Registration;
  onStatusChange: (status: Registration["status"]) => void;
  handleDocumentView: (url: string) => void;
}

function RegistrationDetails({
  registration,
  onStatusChange,
  handleDocumentView,
}: RegistrationDetailsProps) {
  return (
    <div className="space-y-6 py-6">
      <div className="space-y-2">
        <h3 className="text-lg font-medium">Event Information</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-sm font-medium text-gray-500">Event</div>
            <div>{registration.event_title}</div>
          </div>
          <div>
            <div className="text-sm font-medium text-gray-500">Category</div>
            <div>{registration.category_name}</div>
          </div>
          <div>
            <div className="text-sm font-medium text-gray-500">Subcategory</div>
            <div>{registration.subcategory_name}</div>
          </div>
          <div>
            <div className="text-sm font-medium text-gray-500">
              Registration Date
            </div>
            <div>{format(new Date(registration.created_at), "PPP")}</div>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="text-lg font-medium">Registrant Information</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-sm font-medium text-gray-500">Name</div>
            <div>{registration.registrant_name}</div>
          </div>
          <div>
            <div className="text-sm font-medium text-gray-500">Status</div>
            <div className="capitalize">{registration.registrant_status}</div>
          </div>
          <div>
            <div className="text-sm font-medium text-gray-500">WhatsApp</div>
            <div>{registration.registrant_whatsapp}</div>
          </div>
          <div>
            <div className="text-sm font-medium text-gray-500">Email</div>
            <div>{registration.registrant_email}</div>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="text-lg font-medium">Participant Information</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-sm font-medium text-gray-500">Name</div>
            <div>{registration.participant_name}</div>
          </div>
          {registration.song_title && (
            <div>
              <div className="text-sm font-medium text-gray-500">Song Title</div>
              <div>{registration.song_title}</div>
            </div>
          )}
          {registration.song_duration && (
            <div>
              <div className="text-sm font-medium text-gray-500">Duration</div>
              <div>{registration.song_duration}</div>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="text-lg font-medium">Documents</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-sm font-medium text-gray-500">
              Birth Certificate
            </div>
            <Button
              variant="link"
              className="p-0 h-auto"
              onClick={() => handleDocumentView(registration.birth_certificate_url)}
            >
              View Document
            </Button>
          </div>
          {registration.song_pdf_url && (
            <div>
              <div className="text-sm font-medium text-gray-500">Song PDF</div>
              <Button
                variant="link"
                className="p-0 h-auto"
                onClick={() => handleDocumentView(registration.song_pdf_url!)}
              >
                View Document
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="text-lg font-medium">Payment Information</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-sm font-medium text-gray-500">Bank Name</div>
            <div>{registration.bank_name}</div>
          </div>
          <div>
            <div className="text-sm font-medium text-gray-500">Account Name</div>
            <div>{registration.bank_account_name}</div>
          </div>
          <div>
            <div className="text-sm font-medium text-gray-500">
              Account Number
            </div>
            <div>{registration.bank_account_number}</div>
          </div>
          <div>
            <div className="text-sm font-medium text-gray-500">
              Payment Receipt
            </div>
            <Button
              variant="link"
              className="p-0 h-auto"
              onClick={() => handleDocumentView(registration.payment_receipt_url)}
            >
              View Receipt
            </Button>
          </div>
        </div>
      </div>

      {registration.status === "pending" && (
        <div className="flex space-x-2 pt-4">
          <Button
            variant="elegant"
            className="!border-green-600 !text-green-600 hover:!bg-green-600 hover:!text-white"
            onClick={() => onStatusChange("approved")}
          >
            Approve Registration
          </Button>
          <Button
            variant="elegant"
            className="!border-red-600 !text-red-600 hover:!bg-red-600 hover:!text-white"
            onClick={() => onStatusChange("rejected")}
          >
            Reject Registration
          </Button>
        </div>
      )}
    </div>
  );
}
