import * as React from "react";
import Modal from "@/components/Modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eyebrow } from "@/components/ui/eyebrow";
import { supabase } from "@/lib/supabase";
import { zodResolver } from "@hookform/resolvers/zod";
import { Editor } from "@tinymce/tinymce-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Plus, Trash2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * AddEventModal — admin creates a new event.
 *
 * Editorial shell, boxed admin inputs, sectioned with Eyebrow rules.
 * All Zod / Supabase wiring preserved 1:1.
 *
 * Fix: the original had `status` required in Zod but no UI field and no
 * default, which silently failed validation. A Status select is now present
 * and `upcoming` is the default.
 */

const eventDateSchema = z.object({
  start: z.string().min(1, "Start time is required"),
  end: z.string().min(1, "End time is required"),
}).refine((value) => new Date(value.end) > new Date(value.start), {
  message: "End time must be after start time",
  path: ["end"],
});

const formSchema = z.object({
  title: z.string().min(1, "Title is required"),
  type: z.enum(["festival", "competition", "masterclass", "group class"]),
  description: z.object({
    en: z.string().min(1, "English description is required"),
    id: z.string().min(1, "Indonesian description is required"),
  }),
  terms_and_conditions: z
    .object({
      en: z.string().optional(),
      id: z.string().optional(),
    })
    .optional(),
  start_date: z.string().min(1, "Start date is required"),
  event_schedule: z
    .array(eventDateSchema)
    .min(1, "At least one event date is required"),
  registration_deadline: z.string().optional(),
  early_bird_end_date: z.string().optional(),
  location: z.string().min(1, "Location is required"),
  venue_details: z.string().optional(),
  status: z.enum(["upcoming", "ongoing", "completed"]),
  poster_image: z.string().optional(),
  max_quota: z.number().optional(),
  lark_base: z.string().optional(),
  lark_table: z.string().optional(),
  event_duration: z.array(z.number().int().positive()).optional(),
});

type EventFormData = z.infer<typeof formSchema>;
type UnavailableBlock = { start: string; end: string; label: string };
type EventDate = { start: string; end: string; maxSlots: string; breakAfterSlots: string; breakDurationMinutes: string; unavailableBlocks: UnavailableBlock[] };
const emptyEventDate: EventDate = { start: "", end: "", maxSlots: "", breakAfterSlots: "", breakDurationMinutes: "", unavailableBlocks: [] };

interface AddEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEventAdded: () => void;
}

const TINYMCE_INIT = {
  height: 280,
  menubar: false,
  plugins: [
    "lists link",
    "image",
    "charmap",
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
    "bold italic underline | alignleft aligncenter alignright | bullist numlist outdent indent | link image",
  content_style:
    "body { font-family: 'Manrope', sans-serif; font-size: 14px; color: #2B2B2B }",
};

export function AddEventModal({
  isOpen,
  onClose,
  onEventAdded,
}: AddEventModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [posterFile, setPosterFile] = useState<File | null>(null);
  const [eventDates, setEventDates] = useState<EventDate[]>([emptyEventDate]);
  const [durations, setDurations] = useState<number[]>([]);
  const [durationPrices, setDurationPrices] = useState<string[]>([]);

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
      event_schedule: [{ start: "", end: "" }],
      registration_deadline: "",
      early_bird_end_date: "",
      location: "",
      venue_details: "",
      status: "upcoming",
      poster_image: "",
      max_quota: undefined,
      lark_base: "",
      lark_table: "",
      event_duration: [],
    },
  });

  const termsAndConditions = watch("terms_and_conditions");
  const eventType = watch("type");

  useEffect(() => {
    setValue("event_schedule", eventDates);
  }, [eventDates, setValue]);

  const addEventDate = () => {
    setEventDates([...eventDates, { ...emptyEventDate, unavailableBlocks: [] }]);
  };

  const removeEventDate = (index: number) => {
    if (eventDates.length > 1) {
      setEventDates(eventDates.filter((_, i) => i !== index));
    }
  };

  const updateEventDate = (index: number, field: Exclude<keyof EventDate, "unavailableBlocks">, value: string) => {
    const updated = [...eventDates];
    updated[index][field] = value;
    setEventDates(updated);
  };

  const addUnavailableBlock = (dateIndex: number) => {
    setEventDates((dates) => dates.map((date, index) => index === dateIndex
      ? { ...date, unavailableBlocks: [...date.unavailableBlocks, { start: "12:00", end: "13:00", label: "Lunch" }] }
      : date));
  };

  const updateUnavailableBlock = (dateIndex: number, blockIndex: number, field: keyof UnavailableBlock, value: string) => {
    setEventDates((dates) => dates.map((date, index) => index === dateIndex
      ? { ...date, unavailableBlocks: date.unavailableBlocks.map((block, currentIndex) => currentIndex === blockIndex ? { ...block, [field]: value } : block) }
      : date));
  };

  const removeUnavailableBlock = (dateIndex: number, blockIndex: number) => {
    setEventDates((dates) => dates.map((date, index) => index === dateIndex
      ? { ...date, unavailableBlocks: date.unavailableBlocks.filter((_, currentIndex) => currentIndex !== blockIndex) }
      : date));
  };

  const onSubmit = async (values: EventFormData) => {
    setSubmitError(null);
    try {
      setIsSubmitting(true);

      if (values.type === "masterclass" && eventDates.some((date) => date.maxSlots.trim() !== "" && (!Number.isInteger(Number(date.maxSlots)) || Number(date.maxSlots) < 1))) {
        throw new Error("Maximum slots per registrant must be a positive whole number, or blank for unlimited.");
      }
      if (values.type === "masterclass" && eventDates.some((date) => (Boolean(date.breakAfterSlots) !== Boolean(date.breakDurationMinutes)) || (Boolean(date.breakAfterSlots) && (!Number.isInteger(Number(date.breakAfterSlots)) || Number(date.breakAfterSlots) < 1 || !Number.isInteger(Number(date.breakDurationMinutes)) || Number(date.breakDurationMinutes) < 1)))) {
        throw new Error("For each break rule, enter both the number of slots and break length as positive whole numbers.");
      }
      if (values.type === "masterclass" && eventDates.some(hasInvalidUnavailableBlocks)) {
        throw new Error("Unavailable times must be complete, inside their date window, and must not overlap.");
      }

      const eventSchedule = eventDates.map((ed) => ({
        start_at: new Date(ed.start).toISOString(),
        end_at: new Date(ed.end).toISOString(),
        ...(values.type === "masterclass" ? {
          ...(ed.maxSlots.trim() ? { max_user_slots: Number(ed.maxSlots) } : {}),
          ...(ed.breakAfterSlots ? { break_after_slots: Number(ed.breakAfterSlots), break_duration_minutes: Number(ed.breakDurationMinutes) } : {}),
          ...(ed.unavailableBlocks.length ? { unavailable_blocks: serializeUnavailableBlocks(ed) } : {}),
        } : {}),
      }));

      const registrationDeadlineIso = values.registration_deadline
        ? new Date(values.registration_deadline).toISOString()
        : null;
      const earlyBirdEndDateIso = values.early_bird_end_date
        ? new Date(values.early_bird_end_date).toISOString()
        : null;

      // `valueAsNumber: true` turns an empty input into NaN — normalize so we
      // never forward NaN to the `max_quota` column.
      const maxQuota =
        values.max_quota === undefined ||
        (typeof values.max_quota === "number" &&
          Number.isNaN(values.max_quota))
          ? null
          : values.max_quota;

      let posterUrl: string | null = null;
      if (posterFile) {
        const fileExt = posterFile.name.split(".").pop();
        const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `event-posters/${fileName}`;

        const { error: uploadError, data: uploadData } = await supabase.storage
          .from("public")
          .upload(filePath, posterFile);

        if (uploadError) throw uploadError;
        if (uploadData) {
          posterUrl = filePath;
        }
      }

      const { data: createdEvent, error } = await supabase.from("events").insert([
        {
          title: values.title,
          type: values.type,
          description: values.description,
          terms_and_conditions: values.terms_and_conditions,
          start_date: values.start_date,
          event_date: eventSchedule.map((session) => session.start_at),
          event_schedule: eventSchedule,
          event_duration: durations.length ? durations : null,
          registration_deadline: registrationDeadlineIso,
          early_bird_end_date: earlyBirdEndDateIso,
          location: values.location,
          venue_details: values.venue_details,
          poster_image: posterUrl,
          max_quota: maxQuota,
          status: values.status,
          lark_base: values.lark_base || null,
          lark_table: values.lark_table || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]).select("id").single();

      if (error) throw error;

      if (values.type === "masterclass" && durations.length) {
        const fees = durations.flatMap((duration, index) => {
          const price = Number(durationPrices[index]);
          return Number.isFinite(price) && price >= 0
            ? [{ event_id: createdEvent.id, uom: `${duration} minutes`, price }]
            : [];
        });
        if (fees.length) {
          const { error: feeError } = await supabase.from("event_registration_fees").insert(fees);
          if (feeError) throw feeError;
        }
      }

      onEventAdded();
      handleClose();
    } catch (error) {
      console.error("Error adding event:", error);
      setSubmitError(
        error instanceof Error ? error.message : "Failed to add event."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    reset();
    setPosterFile(null);
    setEventDates([{ ...emptyEventDate }]);
    setDurations([]);
    setDurationPrices([]);
    setSubmitError(null);
    onClose();
  };

  const handlePosterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setPosterFile(e.target.files[0]);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="New event"
      eyebrow="Events · New"
      maxWidth="3xl"
    >
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col gap-7"
      >
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
              <Label htmlFor="ev-title">Title</Label>
              <Input
                id="ev-title"
                variant="boxed"
                aria-invalid={!!errors.title}
                placeholder="e.g. Grand Opus Piano Competition 2025"
                {...register("title")}
              />
              {errors.title && (
                <FieldError>{errors.title.message}</FieldError>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="ev-type">Type</Label>
              <AdminSelect id="ev-type" {...register("type")}>
                <option value="festival">Festival</option>
                <option value="competition">Competition</option>
                <option value="masterclass">Masterclass</option>
                <option value="group class">Group Class</option>
              </AdminSelect>
              {errors.type && <FieldError>{errors.type.message}</FieldError>}
            </div>
          </div>
        </section>

        {/* Descriptions */}
        <section className="flex flex-col gap-4">
          <Eyebrow withRule>Description</Eyebrow>
          <div className="flex flex-col gap-5">
            <EditorBlock label="English" error={errors.description?.en?.message}>
              <Editor
                apiKey={import.meta.env.VITE_TINYMCE_API_KEY}
                initialValue=""
                init={TINYMCE_INIT}
                onEditorChange={(content: string) =>
                  setValue("description.en", content)
                }
              />
            </EditorBlock>
            <EditorBlock
              label="Indonesian"
              error={errors.description?.id?.message}
            >
              <Editor
                apiKey={import.meta.env.VITE_TINYMCE_API_KEY}
                initialValue=""
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
              <Label htmlFor="ev-start">Start date</Label>
              <Input
                id="ev-start"
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
              <Label htmlFor="ev-deadline">
                Registration deadline{" "}
                <span className="type-caption text-ink-muted font-normal">
                  — optional
                </span>
              </Label>
              <Input
                id="ev-deadline"
                type="datetime-local"
                variant="boxed"
                {...register("registration_deadline")}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="ev-early-bird-end">
                Early bird ends{" "}
                <span className="type-caption text-ink-muted font-normal">
                  — optional
                </span>
              </Label>
              <Input
                id="ev-early-bird-end"
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
              <div className="flex flex-col gap-1">
                <Label className="mb-0">Event dates &amp; times</Label>
                {eventType === "masterclass" && (
                  <p className="type-caption text-ink-muted">
                    Start and end define the bookable time block for that date. Optionally add a repeating break after a set number of session slots.
                  </p>
                )}
              </div>
              <Eyebrow tone="muted">
                {eventDates.length}{" "}
                {eventDates.length === 1 ? "session" : "sessions"}
              </Eyebrow>
            </div>
            <div className="flex flex-col gap-2">
              {eventDates.map((eventDate, index) => (
                <div key={index} className="relative grid grid-cols-1 gap-3 bg-surface-canvas-warm border border-rule-hairline p-4 pr-14">
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:items-end">
                    <SessionField label="Starts">
                      <input type="datetime-local" value={eventDate.start} onChange={(e) => updateEventDate(index, "start", e.target.value)} className={SESSION_INPUT_CLASSES} required />
                    </SessionField>
                    <span className="hidden h-10 items-center type-caption text-ink-muted md:flex">to</span>
                    <SessionField label="Ends">
                      <input type="datetime-local" value={eventDate.end} onChange={(e) => updateEventDate(index, "end", e.target.value)} className={SESSION_INPUT_CLASSES} required />
                    </SessionField>
                  </div>
                  {eventType === "masterclass" && (
                    <>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <SessionField label="Max slots / user">
                          <input type="number" min={1} value={eventDate.maxSlots} onChange={(e) => updateEventDate(index, "maxSlots", e.target.value)} className={SESSION_INPUT_CLASSES} placeholder="Unlimited" aria-label={`Maximum slots per registrant for date ${index + 1}`} />
                        </SessionField>
                        <SessionField label="Break after sessions">
                          <input type="number" min={1} value={eventDate.breakAfterSlots} onChange={(e) => updateEventDate(index, "breakAfterSlots", e.target.value)} className={SESSION_INPUT_CLASSES} placeholder="Optional" aria-label={`Break after sessions for date ${index + 1}`} />
                        </SessionField>
                        <SessionField label="Break duration (minutes)">
                          <input type="number" min={1} value={eventDate.breakDurationMinutes} onChange={(e) => updateEventDate(index, "breakDurationMinutes", e.target.value)} className={SESSION_INPUT_CLASSES} placeholder="Optional" aria-label={`Break duration for date ${index + 1}`} />
                        </SessionField>
                      </div>
                      <div className="border-t border-rule-hairline pt-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p className="type-label text-burgundy">Unavailable times</p>
                            <p className="type-caption text-ink-muted">Add lunch, dinner, room reset, or any other blocked period for this date.</p>
                          </div>
                          <Button type="button" variant="outline" size="sm" onClick={() => addUnavailableBlock(index)}>
                            <Plus className="h-3.5 w-3.5" /> Add unavailable time
                          </Button>
                        </div>
                        {eventDate.unavailableBlocks.length > 0 && (
                          <div className="mt-3 flex flex-col gap-2">
                            {eventDate.unavailableBlocks.map((block, blockIndex) => (
                              <div key={blockIndex} className="grid grid-cols-1 gap-2 border border-rule-hairline bg-surface-elevated p-3 sm:grid-cols-[minmax(8rem,0.8fr)_minmax(8rem,0.8fr)_minmax(10rem,1fr)_2.5rem] sm:items-end">
                                <SessionField label="From"><input type="time" value={block.start} onChange={(event) => updateUnavailableBlock(index, blockIndex, "start", event.target.value)} className={SESSION_INPUT_CLASSES} /></SessionField>
                                <SessionField label="Until"><input type="time" value={block.end} onChange={(event) => updateUnavailableBlock(index, blockIndex, "end", event.target.value)} className={SESSION_INPUT_CLASSES} /></SessionField>
                                <SessionField label="Label"><input type="text" value={block.label} onChange={(event) => updateUnavailableBlock(index, blockIndex, "label", event.target.value)} className={SESSION_INPUT_CLASSES} placeholder="Lunch, dinner, room reset…" /></SessionField>
                                <button type="button" onClick={() => removeUnavailableBlock(index, blockIndex)} aria-label={`Remove unavailable time ${blockIndex + 1}`} className="flex h-10 w-10 items-center justify-center rounded-sm text-ink-muted transition-colors hover:bg-[color:var(--status-error-bg)] hover:text-[color:var(--status-error)]"><Trash2 className="h-4 w-4" /></button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() => removeEventDate(index)}
                    disabled={eventDates.length === 1}
                    aria-label="Remove date"
                    className={cn(
                      "absolute right-2 top-2 h-10 w-10 flex items-center justify-center rounded-sm",
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

          {/* Durations array */}
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
                  {eventType === "masterclass" && (
                    <Input variant="boxed" type="number" min={0} placeholder="Price (IDR)" value={durationPrices[idx] || ""} onChange={(e) => setDurationPrices((prev) => prev.map((price, i) => i === idx ? e.target.value : price))} className="flex-1" />
                  )}
                  <button
                    type="button"
                    onClick={() => { setDurations((prev) => prev.filter((_, i) => i !== idx)); setDurationPrices((prev) => prev.filter((_, i) => i !== idx)); }}
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
                onClick={() => { setDurations((prev) => [...prev, 10]); setDurationPrices((prev) => [...prev, ""]); }}
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
              <Label htmlFor="ev-location">Location</Label>
              <Input
                id="ev-location"
                variant="boxed"
                placeholder="e.g. Aula Simfonia Jakarta"
                aria-invalid={!!errors.location}
                {...register("location")}
              />
              {errors.location && (
                <FieldError>{errors.location.message}</FieldError>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="ev-quota">
                Max quota{" "}
                <span className="type-caption text-ink-muted font-normal">
                  — optional
                </span>
              </Label>
              <Input
                id="ev-quota"
                type="number"
                min={1}
                variant="boxed"
                placeholder="Leave empty for unlimited"
                {...register("max_quota", { valueAsNumber: true })}
              />
              {errors.max_quota && (
                <FieldError>{errors.max_quota.message}</FieldError>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="ev-venue-details">Venue details</Label>
            <textarea
              id="ev-venue-details"
              {...register("venue_details")}
              className={cn(
                "w-full min-h-[80px] px-3 py-2 rounded-sm",
                "bg-surface-elevated border border-burgundy/20",
                "text-body-sm text-ink-body",
                "hover:border-burgundy/40",
                "focus-visible:outline-none focus-visible:border-marigold focus-visible:ring-2 focus-visible:ring-marigold/20",
                "transition-colors"
              )}
              placeholder="Address, directions, parking — anything specific to the venue."
            />
          </div>
        </section>

        {/* Publication */}
        <section className="flex flex-col gap-4">
          <Eyebrow withRule>Publication</Eyebrow>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="ev-status">Status</Label>
              <AdminSelect id="ev-status" {...register("status")}>
                <option value="upcoming">Upcoming</option>
                <option value="ongoing">Ongoing</option>
                <option value="completed">Completed</option>
              </AdminSelect>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="ev-poster">Event poster</Label>
              <input
                id="ev-poster"
                type="file"
                accept="image/*"
                onChange={handlePosterChange}
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
                  Selected: {posterFile.name}
                </p>
              )}
            </div>
          </div>
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
              <Label htmlFor="ev-lark-base">Lark base ID</Label>
              <Input
                id="ev-lark-base"
                variant="boxed"
                placeholder="e.g. bascnXXXXXX"
                {...register("lark_base")}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="ev-lark-table">Lark table ID</Label>
              <Input
                id="ev-lark-table"
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
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Adding…" : "Add event"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/*  Internal primitives                                                */
/* ------------------------------------------------------------------ */

function FieldError({ children }: { children: React.ReactNode }) {
  return (
    <p className="type-caption text-[color:var(--status-error)]">{children}</p>
  );
}

const SESSION_INPUT_CLASSES = cn(
  "h-11 w-full min-w-0 rounded-sm border border-burgundy/20 bg-surface-elevated px-3",
  "text-body-sm text-ink-body placeholder:text-ink-muted",
  "focus:outline-none focus:border-marigold focus:ring-2 focus:ring-marigold/20",
  "transition-colors"
);

function SessionField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex min-w-0 flex-col gap-1.5">
      <span className="type-label text-ink-muted">{label}</span>
      {children}
    </label>
  );
}

function blockDateTime(date: EventDate, time: string) {
  const datePart = date.start.slice(0, 10);
  return new Date(`${datePart}T${time}`);
}

function serializeUnavailableBlocks(date: EventDate) {
  return date.unavailableBlocks.map((block) => ({
    start_at: blockDateTime(date, block.start).toISOString(),
    end_at: blockDateTime(date, block.end).toISOString(),
    ...(block.label.trim() ? { label: block.label.trim() } : {}),
  }));
}

function hasInvalidUnavailableBlocks(date: EventDate) {
  const windowStart = new Date(date.start).getTime();
  const windowEnd = new Date(date.end).getTime();
  const blocks = date.unavailableBlocks.map((block) => ({
    start: block.start ? blockDateTime(date, block.start).getTime() : Number.NaN,
    end: block.end ? blockDateTime(date, block.end).getTime() : Number.NaN,
  })).sort((a, b) => a.start - b.start);
  return blocks.some((block, index) =>
    !Number.isFinite(block.start) || !Number.isFinite(block.end) ||
    block.start < windowStart || block.end > windowEnd || block.end <= block.start ||
    (index > 0 && block.start < blocks[index - 1].end)
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
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <Eyebrow tone="muted">{label}</Eyebrow>
        {error && <FieldError>{error}</FieldError>}
      </div>
      <div className="border border-rule-hairline overflow-hidden">
        {children}
      </div>
    </div>
  );
}
