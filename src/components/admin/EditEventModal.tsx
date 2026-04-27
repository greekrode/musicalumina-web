import * as React from "react";
import Modal from "@/components/Modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eyebrow } from "@/components/ui/eyebrow";
import { useToast } from "@/components/ui/use-toast";
import type { Database } from "@/lib/database.types";
import { supabase } from "@/lib/supabase";
import { zodResolver } from "@hookform/resolvers/zod";
import { Editor } from "@tinymce/tinymce-react";
import { Plus, Trash2, AlertCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { cn } from "@/lib/utils";

type Event = Database["public"]["Tables"]["events"]["Row"];

/**
 * EditEventModal — admin edits an existing event.
 *
 * Moved from the bespoke black-scrim modal to the shared editorial Modal for
 * consistency. Schema, Supabase update, poster signed-URL upload, and event
 * date / duration arrays preserved 1:1. The inline duplicate-validation block
 * is removed — react-hook-form's Zod resolver handles it natively now.
 */

const eventDateSchema = z.object({
  datetime: z.string().min(1, "Date and time are required"),
});

const formSchema = z.object({
  title: z.string().min(1, "Title is required"),
  type: z.enum(["festival", "competition", "masterclass", "group class"]),
  description: z.object({
    en: z.string().optional(),
    id: z.string().optional(),
  }),
  terms_and_conditions: z
    .object({
      en: z.string().optional(),
      id: z.string().optional(),
    })
    .optional(),
  start_date: z.string().min(1, "Start date is required"),
  event_date: z
    .array(eventDateSchema)
    .min(1, "At least one event date is required"),
  registration_deadline: z.string().optional(),
  early_bird_end_date: z.string().optional(),
  location: z.string().min(1, "Location is required"),
  venue_details: z.string().optional(),
  status: z.enum(["upcoming", "ongoing", "completed"]),
  poster_image: z.string().optional(),
  max_quota: z.union([z.number(), z.string()]).optional(),
  lark_base: z.string().optional(),
  lark_table: z.string().optional(),
  event_duration: z.array(z.number().int().positive()).optional(),
});

type EventFormData = z.infer<typeof formSchema>;

interface EditEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEventUpdated: () => void;
  event: Event | null;
}

const TINYMCE_INIT = {
  height: 280,
  menubar: false,
  plugins: [
    "advlist",
    "autolink",
    "lists",
    "link",
    "image",
    "charmap",
    "preview",
    "anchor",
    "searchreplace",
    "visualblocks",
    "code",
    "fullscreen",
    "insertdatetime",
    "media",
    "table",
    "code",
    "help",
    "wordcount",
  ],
  toolbar:
    "undo redo | blocks | " +
    "bold italic forecolor | alignleft aligncenter " +
    "alignright alignjustify | bullist numlist outdent indent | " +
    "removeformat | help",
  content_style:
    "body { font-family: 'Manrope', sans-serif; font-size: 14px; color: #2B2B2B }",
};

export function EditEventModal({
  isOpen,
  onClose,
  onEventUpdated,
  event,
}: EditEventModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [posterFile, setPosterFile] = useState<File | null>(null);
  const [eventDates, setEventDates] = useState<Array<{ datetime: string }>>([
    { datetime: "" },
  ]);
  const [durations, setDurations] = useState<number[]>([]);
  const [posterPreview, setPosterPreview] = useState<string | null>(null);
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<EventFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      type: "competition",
      description: { en: "", id: "" },
      terms_and_conditions: { en: "", id: "" },
      start_date: "",
      event_date: [{ datetime: "" }],
      registration_deadline: "",
      early_bird_end_date: "",
      location: "",
      venue_details: "",
      poster_image: "",
      status: "upcoming",
      max_quota: undefined,
      lark_base: "",
      lark_table: "",
      event_duration: [],
    },
  });

  const description = watch("description");
  const termsAndConditions = watch("terms_and_conditions");
  const posterImageValue = watch("poster_image");

  useEffect(() => {
    setValue("event_date", eventDates);
  }, [eventDates, setValue]);

  useEffect(() => {
    if (posterFile) {
      const objectUrl = URL.createObjectURL(posterFile);
      setPosterPreview(objectUrl);
      return () => URL.revokeObjectURL(objectUrl);
    }
    setPosterPreview(posterImageValue || null);
    return undefined;
  }, [posterFile, posterImageValue]);

  const formatDateTimeForInput = (dateString: string | null) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return "";
    const pad = (value: number) => value.toString().padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
      date.getDate()
    )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };

  useEffect(() => {
    if (!event) return;

    if (
      event.event_date &&
      Array.isArray(event.event_date) &&
      event.event_date.length > 0
    ) {
      const dates = event.event_date.map((date) => ({
        datetime: formatDateTimeForInput(date),
      }));
      setEventDates(dates);
    } else {
      setEventDates([
        { datetime: formatDateTimeForInput(event.start_date) },
      ]);
    }

    reset({
      title: event.title,
      type: event.type,
      description: event.description || { en: "", id: "" },
      terms_and_conditions: event.terms_and_conditions || { en: "", id: "" },
      start_date: new Date(event.start_date).toISOString().split("T")[0],
      event_date: [{ datetime: "" }],
      registration_deadline: formatDateTimeForInput(
        event.registration_deadline
      ),
      early_bird_end_date: formatDateTimeForInput(event.early_bird_end_date),
      location: event.location,
      venue_details: event.venue_details || "",
      poster_image: event.poster_image || "",
      status: event.status,
      max_quota: event.max_quota || undefined,
      lark_base: event.lark_base || "",
      lark_table: event.lark_table || "",
      event_duration: (event as unknown as { event_duration?: number[] })
        .event_duration || [],
    });

    const durationField = (event as unknown as { event_duration?: number[] })
      .event_duration;
    if (Array.isArray(durationField)) {
      setDurations(durationField);
    } else {
      setDurations([]);
    }
    setSubmitError(null);
  }, [event, reset]);

  const onSubmit = async (values: EventFormData) => {
    if (!event) return;
    setSubmitError(null);

    const validEventDates = eventDates.filter((ed) => ed.datetime);
    if (validEventDates.length === 0) {
      toast({
        title: "Add an event date",
        description: "Please add at least one event date and time.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmitting(true);

      const convertedEventDates = validEventDates.map((ed) =>
        new Date(ed.datetime).toISOString()
      );
      const registrationDeadlineIso = values.registration_deadline
        ? new Date(values.registration_deadline).toISOString()
        : null;
      const earlyBirdEndDateIso = values.early_bird_end_date
        ? new Date(values.early_bird_end_date).toISOString()
        : null;
      // `valueAsNumber: true` turns an empty input into NaN (not ""), so the
      // original `=== ""` check was unreachable and we were forwarding NaN to
      // Supabase. Normalize against both.
      const maxQuota =
        values.max_quota === "" ||
        values.max_quota === undefined ||
        (typeof values.max_quota === "number" &&
          Number.isNaN(values.max_quota))
          ? null
          : values.max_quota;

      let posterUrl = values.poster_image;
      if (posterFile) {
        const fileExt = posterFile.name.split(".").pop();
        const fileName = `${event.id}.${fileExt}`;
        const filePath = `event-posters/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("event-photos")
          .upload(filePath, posterFile, { upsert: true });
        if (uploadError) throw uploadError;

        const { data, error: urlError } = await supabase.storage
          .from("event-photos")
          .createSignedUrl(filePath, 99 * 365 * 24 * 60 * 60);
        if (urlError) throw urlError;
        if (!data?.signedUrl) throw new Error("Failed to generate signed URL");

        posterUrl = data.signedUrl;
      }

      const updateData = {
        title: values.title,
        type: values.type,
        description: {
          en: values.description.en || "",
          id: values.description.id || "",
        },
        terms_and_conditions: values.terms_and_conditions || {
          en: "",
          id: "",
        },
        start_date: values.start_date,
        event_date: convertedEventDates,
        event_duration: durations.length ? durations : null,
        registration_deadline: registrationDeadlineIso,
        early_bird_end_date: earlyBirdEndDateIso,
        location: values.location,
        venue_details: values.venue_details,
        poster_image: posterUrl,
        status: values.status,
        max_quota: maxQuota,
        lark_base: values.lark_base,
        lark_table: values.lark_table,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("events")
        .update(updateData)
        .eq("id", event.id);
      if (error) throw error;

      onEventUpdated();
      onClose();
      toast({
        title: "Updated",
        description: "Event saved successfully.",
      });
    } catch (error) {
      console.error("Error updating event:", error);
      const message =
        error instanceof Error ? error.message : "Failed to update event.";
      setSubmitError(message);
      toast({
        title: "Failed to update event",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const addEventDate = () => {
    setEventDates([...eventDates, { datetime: "" }]);
  };

  const removeEventDate = (index: number) => {
    if (eventDates.length > 1) {
      setEventDates(eventDates.filter((_, i) => i !== index));
    }
  };

  const updateEventDate = (index: number, value: string) => {
    const updated = [...eventDates];
    updated[index].datetime = value;
    setEventDates(updated);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={event?.title ? `Edit · ${event.title}` : "Edit event"}
      eyebrow="Events · Edit"
      maxWidth="3xl"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-7">
        {submitError && (
          <div className="flex items-start gap-3 border-l-2 border-[color:var(--status-error)] bg-[color:var(--status-error-bg)] px-4 py-3">
            <AlertCircle
              className="h-4 w-4 mt-0.5 text-[color:var(--status-error)] flex-shrink-0"
              aria-hidden
            />
            <p className="type-body-sm text-[color:var(--status-error)]">
              {submitError}
            </p>
          </div>
        )}

        {/* Identity */}
        <section className="flex flex-col gap-4">
          <Eyebrow withRule>Identity</Eyebrow>
          <div className="grid grid-cols-1 md:grid-cols-[1fr_200px] gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="edit-title">Title</Label>
              <Input
                id="edit-title"
                variant="boxed"
                aria-invalid={!!errors.title}
                {...register("title")}
              />
              {errors.title && (
                <FieldError>{errors.title.message}</FieldError>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="edit-type">Type</Label>
              <AdminSelect id="edit-type" {...register("type")}>
                <option value="festival">Festival</option>
                <option value="competition">Competition</option>
                <option value="masterclass">Masterclass</option>
                <option value="group class">Group Class</option>
              </AdminSelect>
            </div>
          </div>
        </section>

        {/* Descriptions */}
        <section className="flex flex-col gap-4">
          <Eyebrow withRule>Description · optional</Eyebrow>
          <div className="flex flex-col gap-5">
            <EditorBlock label="English">
              <Editor
                apiKey={import.meta.env.VITE_TINYMCE_API_KEY}
                value={description.en}
                init={TINYMCE_INIT}
                onEditorChange={(content: string) =>
                  setValue("description.en", content)
                }
              />
            </EditorBlock>
            <EditorBlock label="Indonesian">
              <Editor
                apiKey={import.meta.env.VITE_TINYMCE_API_KEY}
                value={description.id}
                init={TINYMCE_INIT}
                onEditorChange={(content: string) =>
                  setValue("description.id", content)
                }
              />
            </EditorBlock>
          </div>
        </section>

        {/* Terms & conditions */}
        <section className="flex flex-col gap-4">
          <Eyebrow withRule>Terms & conditions · optional</Eyebrow>
          <div className="flex flex-col gap-5">
            <EditorBlock label="English">
              <Editor
                apiKey={import.meta.env.VITE_TINYMCE_API_KEY}
                value={termsAndConditions?.en || ""}
                init={TINYMCE_INIT}
                onEditorChange={(content: string) =>
                  setValue("terms_and_conditions.en", content)
                }
              />
            </EditorBlock>
            <EditorBlock label="Indonesian">
              <Editor
                apiKey={import.meta.env.VITE_TINYMCE_API_KEY}
                value={termsAndConditions?.id || ""}
                init={TINYMCE_INIT}
                onEditorChange={(content: string) =>
                  setValue("terms_and_conditions.id", content)
                }
              />
            </EditorBlock>
          </div>
        </section>

        {/* Schedule */}
        <section className="flex flex-col gap-4">
          <Eyebrow withRule>Schedule</Eyebrow>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="edit-start">Start date</Label>
              <Input
                id="edit-start"
                type="date"
                variant="boxed"
                aria-invalid={!!errors.start_date}
                {...register("start_date")}
              />
              {errors.start_date && (
                <FieldError>{errors.start_date.message}</FieldError>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="edit-deadline">
                Registration deadline{" "}
                <span className="type-caption text-ink-muted font-normal">
                  — optional
                </span>
              </Label>
              <Input
                id="edit-deadline"
                type="datetime-local"
                variant="boxed"
                {...register("registration_deadline")}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="edit-early-bird-end">
                Early bird ends{" "}
                <span className="type-caption text-ink-muted font-normal">
                  — optional
                </span>
              </Label>
              <Input
                id="edit-early-bird-end"
                type="datetime-local"
                variant="boxed"
                {...register("early_bird_end_date")}
              />
              <p className="type-caption text-ink-muted">
                Applies to every subcategory with an early bird price.
              </p>
            </div>
          </div>

          {/* Event dates array */}
          <div className="flex flex-col gap-2">
            <div className="flex items-end justify-between gap-3 flex-wrap">
              <Label className="mb-0">Event dates &amp; times</Label>
              <Eyebrow tone="muted">
                {eventDates.length}{" "}
                {eventDates.length === 1 ? "session" : "sessions"}
              </Eyebrow>
            </div>
            <div className="flex flex-col gap-2">
              {eventDates.map((eventDate, index) => (
                <div
                  key={index}
                  className="flex gap-2 items-center bg-surface-canvas-warm border border-rule-hairline px-3 py-2"
                >
                  <input
                    type="datetime-local"
                    value={eventDate.datetime}
                    onChange={(e) => updateEventDate(index, e.target.value)}
                    className={cn(
                      "flex-1 h-10 px-3 bg-surface-elevated border border-burgundy/20 rounded-sm",
                      "text-body-sm text-ink-body",
                      "focus:outline-none focus:border-marigold focus:ring-2 focus:ring-marigold/20",
                      "transition-colors"
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => removeEventDate(index)}
                    disabled={eventDates.length === 1}
                    aria-label="Remove date"
                    className={cn(
                      "h-9 w-9 flex items-center justify-center rounded-sm",
                      "text-ink-muted hover:text-[color:var(--status-error)]",
                      "hover:bg-[color:var(--status-error-bg)] transition-colors",
                      "disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-ink-muted"
                    )}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addEventDate}
                className="self-start"
              >
                <Plus className="h-3.5 w-3.5" />
                Add date
              </Button>
            </div>
          </div>

          {/* Durations */}
          <div className="flex flex-col gap-2">
            <div className="flex items-end justify-between gap-3 flex-wrap">
              <div className="flex flex-col gap-1">
                <Label className="mb-0">Durations (minutes)</Label>
                <p className="type-caption text-ink-muted">
                  Per-category performance lengths, if relevant.
                </p>
              </div>
              {durations.length > 0 && (
                <Eyebrow tone="muted">
                  {durations.length}{" "}
                  {durations.length === 1 ? "entry" : "entries"}
                </Eyebrow>
              )}
            </div>
            <div className="flex flex-col gap-2">
              {durations.map((d, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 bg-surface-canvas-warm border border-rule-hairline px-3 py-2"
                >
                  <Input
                    variant="boxed"
                    type="number"
                    min={1}
                    value={d}
                    onChange={(e) => {
                      const v = parseInt(e.target.value || "0", 10);
                      setDurations((prev) =>
                        prev.map((val, i) => (i === idx ? v : val))
                      );
                    }}
                    className="flex-1"
                  />
                  <span className="type-caption text-ink-muted flex-shrink-0">
                    minutes
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setDurations((prev) => prev.filter((_, i) => i !== idx))
                    }
                    aria-label="Remove duration"
                    className={cn(
                      "h-9 w-9 flex items-center justify-center rounded-sm",
                      "text-ink-muted hover:text-[color:var(--status-error)]",
                      "hover:bg-[color:var(--status-error-bg)] transition-colors"
                    )}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setDurations((prev) => [...prev, 10])}
                className="self-start"
              >
                <Plus className="h-3.5 w-3.5" />
                Add duration
              </Button>
            </div>
          </div>
        </section>

        {/* Venue + quota */}
        <section className="flex flex-col gap-4">
          <Eyebrow withRule>Venue & quota</Eyebrow>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="edit-location">Location</Label>
              <Input
                id="edit-location"
                variant="boxed"
                aria-invalid={!!errors.location}
                {...register("location")}
              />
              {errors.location && (
                <FieldError>{errors.location.message}</FieldError>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="edit-quota">
                Max quota{" "}
                <span className="type-caption text-ink-muted font-normal">
                  — optional
                </span>
              </Label>
              <Input
                id="edit-quota"
                type="number"
                variant="boxed"
                {...register("max_quota", { valueAsNumber: true })}
              />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="edit-venue-details">Venue details</Label>
            <textarea
              id="edit-venue-details"
              {...register("venue_details")}
              className={cn(
                "w-full min-h-[80px] px-3 py-2 rounded-sm",
                "bg-surface-elevated border border-burgundy/20",
                "text-body-sm text-ink-body",
                "hover:border-burgundy/40",
                "focus-visible:outline-none focus-visible:border-marigold focus-visible:ring-2 focus-visible:ring-marigold/20",
                "transition-colors"
              )}
            />
          </div>
        </section>

        {/* Publication */}
        <section className="flex flex-col gap-4">
          <Eyebrow withRule>Publication</Eyebrow>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="edit-status">Status</Label>
              <AdminSelect id="edit-status" {...register("status")}>
                <option value="upcoming">Upcoming</option>
                <option value="ongoing">Ongoing</option>
                <option value="completed">Completed</option>
              </AdminSelect>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="edit-poster">Event poster</Label>
              <input
                id="edit-poster"
                type="file"
                accept="image/*"
                onChange={(e) => setPosterFile(e.target.files?.[0] || null)}
                className={cn(
                  "w-full h-10 px-3 py-2 bg-surface-elevated border border-burgundy/20 rounded-sm",
                  "text-body-sm text-ink-body",
                  "file:mr-3 file:py-1 file:px-3 file:border-0 file:text-body-sm file:font-medium",
                  "file:bg-burgundy/[0.06] file:text-burgundy hover:file:bg-burgundy/[0.12]",
                  "focus-visible:outline-none focus-visible:border-marigold",
                  "transition-colors"
                )}
              />
              {posterFile && (
                <p className="type-caption text-ink-muted">
                  New file: {posterFile.name}
                </p>
              )}
            </div>
          </div>

          {posterPreview && (
            <div className="flex flex-col gap-2">
              <Eyebrow tone="muted">Current poster</Eyebrow>
              <div className="bg-surface-canvas-warm border border-rule-hairline p-3">
                <img
                  src={posterPreview}
                  alt="Event poster"
                  className="w-full max-h-64 object-contain"
                />
              </div>
            </div>
          )}
        </section>

        {/* Integrations */}
        <section className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <Eyebrow withRule>Integrations · optional</Eyebrow>
            <p className="type-caption text-ink-muted">
              Lark Base wiring for this event. Leave blank to skip.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="edit-lark-base">Lark base ID</Label>
              <Input
                id="edit-lark-base"
                variant="boxed"
                placeholder="e.g. bascnXXXXXX"
                {...register("lark_base")}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="edit-lark-table">Lark table ID</Label>
              <Input
                id="edit-lark-table"
                variant="boxed"
                placeholder="e.g. tblXXXXXX"
                {...register("lark_table")}
              />
            </div>
          </div>
        </section>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2 border-t border-rule-hairline">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Updating…" : "Save changes"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/*  Shared primitives                                                   */
/* ------------------------------------------------------------------ */

function FieldError({ children }: { children: React.ReactNode }) {
  return (
    <p className="type-caption text-[color:var(--status-error)]">{children}</p>
  );
}

const AdminSelect = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, ...props }, ref) => (
  <select
    ref={ref}
    {...props}
    className={cn(
      "h-11 px-3 py-2 rounded-sm bg-surface-elevated border border-burgundy/20",
      "text-body-sm text-ink-body",
      "hover:border-burgundy/40",
      "focus-visible:outline-none focus-visible:border-marigold focus-visible:ring-2 focus-visible:ring-marigold/20",
      "transition-colors cursor-pointer",
      className
    )}
  >
    {children}
  </select>
));
AdminSelect.displayName = "AdminSelect";

function EditorBlock({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Eyebrow tone="muted">{label}</Eyebrow>
      <div className="border border-rule-hairline overflow-hidden">
        {children}
      </div>
    </div>
  );
}
