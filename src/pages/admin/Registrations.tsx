import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { CheckCircle2, Eye, FileText, XCircle } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Badge, type BadgeStatus } from "@/components/ui/badge";
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
import { Eyebrow } from "@/components/ui/eyebrow";
import { cn } from "@/lib/utils";

/* ============================================================================
   Types — preserved 1:1.
   ============================================================================ */

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

type Event = { id: string; title: string };
type Subcategory = { id: string; name: string };
type Category = {
  id: string;
  name: string;
  event_subcategories: Subcategory[];
};

/* ============================================================================
   Shared editorial classes
   ============================================================================ */

const SELECT_CLASSES = [
  "w-full h-11 px-3 py-2 rounded-sm border border-burgundy/20 bg-surface-elevated",
  "font-sans text-body-sm text-ink-body",
  "transition-[border-color,background-color,box-shadow] duration-fast ease-out-quart",
  "hover:border-burgundy/40",
  "focus:outline-none focus:border-marigold focus:ring-2 focus:ring-marigold/20",
  "appearance-none bg-no-repeat bg-[right_0.75rem_center] pr-10",
  "bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%2212%22 viewBox=%220 0 12 12%22 fill=%22none%22 stroke=%22%23491822%22 stroke-width=%221.5%22><path d=%22M3 5l3 3 3-3%22/></svg>')]",
].join(" ");

/* ============================================================================
   Page
   ============================================================================ */

export default function AdminRegistrations() {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRegistration, setSelectedRegistration] =
    useState<Registration | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<{
    url: string;
    type: string;
  } | null>(null);
  const isMobile = useMediaQuery("(max-width: 768px)");

  const fetchEvents = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("events")
        .select("id, title")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error("Error fetching events:", error);
      toast.error("Failed to load events");
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      const { data, error } = await supabase
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
      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error("Error fetching categories:", error);
      toast.error("Failed to load categories");
    }
  }, [selectedEventId]);

  const fetchRegistrations = useCallback(async () => {
    try {
      setIsLoading(true);
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
          events!inner ( title ),
          event_categories!inner ( name ),
          event_subcategories!inner ( name ),
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

      if (selectedCategoryId) query = query.eq("category_id", selectedCategoryId);
      if (selectedSubcategoryId)
        query = query.eq("subcategory_id", selectedSubcategoryId);

      const { data, error } = await query;
      if (error) throw error;

      if (!data) {
        setRegistrations([]);
        return;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase nested join response; properly typing the shape is a separate refactor
      const formatted: Registration[] = data.map((reg: any) => ({
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

      setRegistrations(formatted);
    } catch (error) {
      console.error("Error fetching registrations:", error);
      toast.error("Failed to load registrations");
    } finally {
      setIsLoading(false);
    }
  }, [selectedEventId, selectedCategoryId, selectedSubcategoryId]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  useEffect(() => {
    if (selectedEventId) {
      fetchCategories();
      setSelectedCategoryId("");
      setSelectedSubcategoryId("");
    } else {
      setCategories([]);
    }
  }, [selectedEventId, fetchCategories]);

  useEffect(() => {
    fetchRegistrations();
  }, [fetchRegistrations]);

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

  /* ───── Columns ───── */

  const columns = [
    {
      header: "Category",
      accessorKey: "category_name",
      cell: (row: Registration) => (
        <span className="type-body-sm text-ink-body">{row.category_name}</span>
      ),
    },
    {
      header: "Subcategory",
      accessorKey: "subcategory_name",
      cell: (row: Registration) => (
        <span className="type-body-sm text-ink-muted">
          {row.subcategory_name}
        </span>
      ),
    },
    {
      header: "Participant",
      accessorKey: "participant_name",
      cell: (row: Registration) => (
        <span className="type-body-sm text-burgundy font-medium">
          {row.participant_name}
        </span>
      ),
    },
    ...(!isMobile
      ? [
          {
            header: "Registrant",
            accessorKey: "registrant_name",
            cell: (row: Registration) => (
              <div className="flex flex-col gap-0.5">
                <span className="type-body-sm text-burgundy">
                  {row.registrant_name}
                </span>
                <span className="type-caption text-ink-muted">
                  {row.registrant_whatsapp}
                </span>
              </div>
            ),
          },
          {
            header: "Status",
            accessorKey: "status",
            cell: (row: Registration) => <StatusBadge status={row.status} />,
          },
          {
            header: "Actions",
            accessorKey: "id",
            cell: (row: Registration) => (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  aria-label="View details"
                  onClick={() => setSelectedRegistration(row)}
                  className="h-8 w-8 flex items-center justify-center rounded-sm text-ink-muted hover:text-burgundy hover:bg-surface-canvas-warm transition-colors"
                >
                  <Eye className="h-3.5 w-3.5" />
                </button>
                {row.status === "pending" && (
                  <>
                    <button
                      type="button"
                      aria-label="Approve"
                      onClick={() => handleStatusChange(row.id, "approved")}
                      className="h-8 w-8 flex items-center justify-center rounded-sm text-ink-muted hover:text-[color:var(--status-open)] hover:bg-[color:var(--status-open-bg)] transition-colors"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      aria-label="Reject"
                      onClick={() => handleStatusChange(row.id, "rejected")}
                      className="h-8 w-8 flex items-center justify-center rounded-sm text-ink-muted hover:text-[color:var(--status-error)] hover:bg-[color:var(--status-error-bg)] transition-colors"
                    >
                      <XCircle className="h-3.5 w-3.5" />
                    </button>
                  </>
                )}
              </div>
            ),
          },
        ]
      : [
          {
            header: "Actions",
            accessorKey: "id",
            cell: (row: Registration) => (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedRegistration(row)}
              >
                View
              </Button>
            ),
          },
        ]),
  ].filter(Boolean);

  const selectedCategory = categories.find(
    (cat) => cat.id === selectedCategoryId
  );

  return (
    <AdminLayout>
      <div className="flex flex-col gap-8">
        {/* Header */}
        <header className="flex flex-col gap-2">
          <Eyebrow withRule>Manage · Registrations</Eyebrow>
          <h1 className="type-display-md text-burgundy">Registrations</h1>
          <p className="type-body-sm text-ink-muted">
            Review and approve participant submissions per event.
          </p>
        </header>

        {/* Filters */}
        <div className="flex flex-col gap-4 p-5 lg:p-6 bg-surface-elevated border border-rule-hairline">
          <Eyebrow withRule>Filters</Eyebrow>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <select
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              className={SELECT_CLASSES}
              aria-label="Filter by event"
            >
              <option value="">Select event</option>
              {events.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.title}
                </option>
              ))}
            </select>

            {selectedEventId && (
              <select
                value={selectedCategoryId}
                onChange={(e) => {
                  setSelectedCategoryId(e.target.value);
                  setSelectedSubcategoryId("");
                }}
                className={SELECT_CLASSES}
                aria-label="Filter by category"
              >
                <option value="">All categories</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            )}

            {selectedCategoryId && selectedCategory && (
              <select
                value={selectedSubcategoryId}
                onChange={(e) => setSelectedSubcategoryId(e.target.value)}
                className={SELECT_CLASSES}
                aria-label="Filter by subcategory"
              >
                <option value="">All subcategories</option>
                {selectedCategory.event_subcategories.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Table / empty state */}
        {!selectedEventId ? (
          <div className="bg-surface-elevated border border-rule-hairline p-10 text-center">
            <Eyebrow className="mb-2">Start here</Eyebrow>
            <p className="type-body-md text-ink-muted">
              Select an event above to view its registrations.
            </p>
          </div>
        ) : (
          <div className="bg-surface-elevated border border-rule-hairline overflow-hidden">
            <DataTable
              data={registrations}
              columns={columns}
              isLoading={isLoading}
              searchKey="participant_name"
              pageSize={10}
            />
          </div>
        )}

        {/* Desktop detail sheet */}
        {!isMobile && (
          <Sheet
            open={!!selectedRegistration}
            onOpenChange={() => setSelectedRegistration(null)}
          >
            <SheetContent className="w-[600px] sm:max-w-[600px] bg-surface-elevated border-l border-rule-hairline p-0">
              {selectedRegistration && (
                <>
                  <SheetHeader className="px-6 py-5 border-b border-rule-hairline">
                    <SheetTitle className="type-headline-md text-burgundy">
                      Registration details
                    </SheetTitle>
                  </SheetHeader>
                  <ScrollArea className="h-[calc(100vh-80px)]">
                    <div className="px-6 py-6">
                      <RegistrationDetails
                        registration={selectedRegistration}
                        onStatusChange={(status) => {
                          handleStatusChange(selectedRegistration.id, status);
                          setSelectedRegistration(null);
                        }}
                        handleDocumentView={handleDocumentView}
                      />
                    </div>
                  </ScrollArea>
                </>
              )}
            </SheetContent>
          </Sheet>
        )}

        {/* Mobile detail dialog */}
        {isMobile && (
          <Dialog
            open={!!selectedRegistration}
            onOpenChange={() => setSelectedRegistration(null)}
          >
            <DialogContent className="w-[95vw] max-h-[90vh] overflow-auto p-6 bg-surface-elevated border border-rule-hairline">
              {selectedRegistration && (
                <>
                  <DialogTitle className="type-headline-md text-burgundy mb-4">
                    Registration details
                  </DialogTitle>
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

        {/* Document viewer */}
        <Dialog
          open={!!selectedDocument}
          onOpenChange={() => setSelectedDocument(null)}
        >
          <DialogContent className="max-w-4xl w-[90vw] h-[90vh] p-0 overflow-hidden border border-rule-hairline">
            {selectedDocument?.type === "pdf" ? (
              <iframe
                src={selectedDocument.url}
                className="w-full h-full"
                title="Document viewer"
              />
            ) : (
              <div className="w-full h-full overflow-auto bg-surface-canvas-warm">
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

/* ============================================================================
   StatusBadge — wraps the design-system Badge with registration-specific
   status mapping.
   ============================================================================ */

function StatusBadge({ status }: { status: Registration["status"] }) {
  const mapping: Record<Registration["status"], BadgeStatus> = {
    pending: "upcoming",
    approved: "open",
    rejected: "error",
  };
  return (
    <Badge status={mapping[status]} dot size="sm">
      {status}
    </Badge>
  );
}

/* ============================================================================
   RegistrationDetails — editorial definition-list layout.
   ============================================================================ */

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
    <div className="flex flex-col gap-7">
      <DetailSection label="Event">
        <DetailRow label="Event" value={registration.event_title} />
        <DetailRow label="Category" value={registration.category_name} />
        <DetailRow label="Subcategory" value={registration.subcategory_name} />
        <DetailRow
          label="Registered"
          value={format(new Date(registration.created_at), "PPP")}
        />
      </DetailSection>

      <DetailSection label="Registrant">
        <DetailRow label="Name" value={registration.registrant_name} />
        <DetailRow
          label="Status"
          value={
            <span className="capitalize">{registration.registrant_status}</span>
          }
        />
        <DetailRow label="WhatsApp" value={registration.registrant_whatsapp} />
        <DetailRow label="Email" value={registration.registrant_email} />
      </DetailSection>

      <DetailSection label="Participant">
        <DetailRow label="Name" value={registration.participant_name} />
        {registration.song_title && (
          <DetailRow label="Song title" value={registration.song_title} />
        )}
        {registration.song_duration && (
          <DetailRow label="Duration" value={registration.song_duration} />
        )}
      </DetailSection>

      <DetailSection label="Documents">
        <DocumentRow
          label="Birth certificate"
          onClick={() => handleDocumentView(registration.birth_certificate_url)}
        />
        {registration.song_pdf_url && (
          <DocumentRow
            label="Song PDF"
            onClick={() =>
              handleDocumentView(registration.song_pdf_url as string)
            }
          />
        )}
      </DetailSection>

      <DetailSection label="Payment">
        <DetailRow label="Bank" value={registration.bank_name} />
        <DetailRow label="Account name" value={registration.bank_account_name} />
        <DetailRow
          label="Account number"
          value={registration.bank_account_number}
        />
        <DocumentRow
          label="Payment receipt"
          onClick={() => handleDocumentView(registration.payment_receipt_url)}
        />
      </DetailSection>

      {/* Status marker */}
      <div className="flex items-center justify-between pt-5 border-t border-rule-hairline">
        <Eyebrow>Current status</Eyebrow>
        <StatusBadge status={registration.status} />
      </div>

      {/* Actions */}
      {registration.status === "pending" && (
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={() => onStatusChange("approved")}
            className={cn(
              "flex-1 inline-flex items-center justify-center gap-2 h-11 px-4 rounded-sm",
              "bg-[color:var(--status-open-bg)] text-[color:var(--status-open)] border border-[color:var(--status-open)]/30",
              "hover:bg-[color:var(--status-open)] hover:text-offWhite transition-colors",
              "type-label"
            )}
          >
            <CheckCircle2 className="h-4 w-4" />
            Approve
          </button>
          <button
            type="button"
            onClick={() => onStatusChange("rejected")}
            className={cn(
              "flex-1 inline-flex items-center justify-center gap-2 h-11 px-4 rounded-sm",
              "bg-[color:var(--status-error-bg)] text-[color:var(--status-error)] border border-[color:var(--status-error)]/30",
              "hover:bg-[color:var(--status-error)] hover:text-offWhite transition-colors",
              "type-label"
            )}
          >
            <XCircle className="h-4 w-4" />
            Reject
          </button>
        </div>
      )}
    </div>
  );
}

function DetailSection({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <Eyebrow withRule>{label}</Eyebrow>
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
        {children}
      </dl>
    </section>
  );
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-0.5 min-w-0">
      <dt className="type-label text-ink-muted">{label}</dt>
      <dd className="type-body-sm text-burgundy break-words">{value}</dd>
    </div>
  );
}

function DocumentRow({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <div className="flex flex-col gap-0.5 min-w-0">
      <dt className="type-label text-ink-muted">{label}</dt>
      <dd>
        <button
          type="button"
          onClick={onClick}
          className={cn(
            "inline-flex items-center gap-2 type-body-sm text-burgundy",
            "hover:text-marigold transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marigold rounded-sm"
          )}
        >
          <FileText className="h-3.5 w-3.5" />
          View document
        </button>
      </dd>
    </div>
  );
}
