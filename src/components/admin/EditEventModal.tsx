import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Modal from "@/components/Modal";
import { supabase } from "@/lib/supabase";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import type { Database } from "@/lib/database.types";
import { Editor } from "@tinymce/tinymce-react";
import { Plus, Trash2 } from "lucide-react";

type Event = Database["public"]["Tables"]["events"]["Row"];

const eventDateSchema = z.object({
  date: z.string().min(1, "Date is required"),
  time: z.string().min(1, "Time is required"),
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
  location: z.string().min(1, "Location is required"),
  venue_details: z.string().optional(),
  status: z.enum(["upcoming", "ongoing", "completed"]),
  poster_image: z.string().optional(),
  max_quota: z.union([z.number(), z.string()]).optional(),
  lark_base: z.string().optional(),
  lark_table: z.string().optional(),
});

type EventFormData = z.infer<typeof formSchema>;

interface EditEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEventUpdated: () => void;
  event: Event | null;
}

export function EditEventModal({
  isOpen,
  onClose,
  onEventUpdated,
  event,
}: EditEventModalProps) {
  console.log("EditEventModal rendered with event:", event);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [posterFile, setPosterFile] = useState<File | null>(null);
  const [eventDates, setEventDates] = useState<
    Array<{ date: string; time: string }>
  >([{ date: "", time: "" }]);

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
      type: "competition",
      description: { en: "", id: "" },
      terms_and_conditions: { en: "", id: "" },
      start_date: "",
      event_date: [{ date: "", time: "" }],
      registration_deadline: "",
      location: "",
      venue_details: "",
      poster_image: "",
      status: "upcoming",
      max_quota: undefined,
      lark_base: "",
      lark_table: "",
    },
  });

  // Watch form values for the editors
  const description = watch("description");
  const termsAndConditions = watch("terms_and_conditions");
  
  // Sync eventDates with form when they change
  useEffect(() => {
    setValue("event_date", eventDates);
  }, [eventDates, setValue]);

  // Initialize event dates when event prop changes
  useEffect(() => {
    if (event) {
      if (
        event.event_date &&
        Array.isArray(event.event_date) &&
        event.event_date.length > 0
      ) {
        // Handle new format (string array)
        const dates = event.event_date.map((date) => {
          const dateObj = new Date(date);
          const dateStr = dateObj.toISOString().split("T")[0];
          const timeStr = dateObj.toTimeString().slice(0, 5);
          return { date: dateStr, time: timeStr };
        });
        setEventDates(dates);
      } else {
        // Fallback to start_date if event_date is not available
        const startDate = new Date(event.start_date);
        const dateStr = startDate.toISOString().split("T")[0];
        const timeStr = startDate.toTimeString().slice(0, 5);
        setEventDates([{ date: dateStr, time: timeStr }]);
      }

      // Reset form with event data
      reset({
        title: event.title,
        type: event.type,
        description: event.description || { en: "", id: "" },
        terms_and_conditions: event.terms_and_conditions || { en: "", id: "" },
        start_date: new Date(event.start_date).toISOString().split("T")[0],
        event_date: [{ date: "", time: "" }], // Initialize with empty event date
        registration_deadline: event.registration_deadline
          ? new Date(event.registration_deadline).toISOString().split("T")[0]
          : "",
        location: event.location,
        venue_details: event.venue_details || "",
        poster_image: event.poster_image || "",
        status: event.status,
        max_quota: event.max_quota || undefined,
        lark_base: event.lark_base || "",
        lark_table: event.lark_table || "",
      });
    }
  }, [event, reset]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!event) return;

    console.log("Form submitted with values:", values);
    console.log("Event dates:", eventDates);

    // Manual validation check
    if (!values.title || !values.start_date || !values.location) {
      alert("Please fill in all required fields");
      return;
    }

    try {
      setIsSubmitting(true);

      // Convert event dates to ISO strings
      const convertedEventDates = eventDates
        .filter((ed) => ed.date && ed.time)
        .map((ed) => {
          const dateTime = new Date(`${ed.date}T${ed.time}`);
          return dateTime.toISOString();
        });

      console.log("Converted event dates:", convertedEventDates);

      // Handle max_quota - convert empty string to null
      const maxQuota = values.max_quota === "" ? null : values.max_quota;

      const eventData = {
        ...values,
        event_date: convertedEventDates,
        max_quota: maxQuota,
        lark_base: values.lark_base,
        lark_table: values.lark_table,
      };

      let posterUrl = values.poster_image;
      if (posterFile) {
        const fileExt = posterFile.name.split(".").pop();
        const fileName = `${event.id}.${fileExt}`;
        const filePath = `event-posters/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("events")
          .upload(filePath, posterFile, { upsert: true });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from("events")
          .getPublicUrl(filePath);
        posterUrl = urlData.publicUrl;
      }

      const updateData = {
        title: values.title,
        type: values.type,
        description: {
          en: values.description.en || "",
          id: values.description.id || "",
        },
        terms_and_conditions: values.terms_and_conditions || { en: "", id: "" },
        start_date: values.start_date,
        event_date: convertedEventDates,
        registration_deadline: values.registration_deadline,
        location: values.location,
        venue_details: values.venue_details,
        poster_image: posterUrl,
        status: values.status,
        max_quota: maxQuota,
        lark_base: eventData.lark_base,
        lark_table: eventData.lark_table,
        updated_at: new Date().toISOString(),
      };
      
      console.log("Updating event with data:", updateData);
      console.log("Event ID:", event.id);

      const { error } = await supabase
        .from("events")
        .update(updateData)
        .eq("id", event.id);

      if (error) {
        console.error("Supabase error:", error);
        throw error;
      }

      console.log("Event updated successfully");
      onEventUpdated();
      onClose();
    } catch (error) {
      console.error("Error updating event:", error);
      alert("Failed to update event. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const addEventDate = () => {
    setEventDates([...eventDates, { date: "", time: "" }]);
  };

  const removeEventDate = (index: number) => {
    if (eventDates.length > 1) {
      setEventDates(eventDates.filter((_, i) => i !== index));
    }
  };

  const updateEventDate = (
    index: number,
    field: "date" | "time",
    value: string
  ) => {
    const updated = [...eventDates];
    updated[index][field] = value;
    setEventDates(updated);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Edit Event</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ×
          </button>
        </div>

        <form onSubmit={(e) => {
          e.preventDefault();
          console.log("Form submitted manually");
          console.log("Form errors:", errors);
          console.log("Form values:", watch());
          
          // Check if event dates are valid
          const validEventDates = eventDates.filter(ed => ed.date && ed.time);
          if (validEventDates.length === 0) {
            alert("Please add at least one event date and time");
            return;
          }
          
          // Check required fields
          const formValues = watch();
          if (!formValues.title || !formValues.start_date || !formValues.location) {
            alert("Please fill in all required fields (Title, Start Date, Location)");
            return;
          }
          
          // If all validations pass, call the onSubmit function directly
          onSubmit(watch());
        }} className="p-6 space-y-6">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Title
              </label>
              <Input {...register("title")} />
              {errors.title && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.title.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Type
              </label>
              <select
                {...register("type")}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="festival">Festival</option>
                <option value="competition">Competition</option>
                <option value="masterclass">Masterclass</option>
                <option value="group class">Group Class</option>
              </select>
              {errors.type && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.type.message}
                </p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              English Description - Optional
            </label>
            <Editor
              apiKey={import.meta.env.VITE_TINYMCE_API_KEY}
              value={description.en}
              onEditorChange={(content: string) =>
                setValue("description.en", content)
              }
              init={{
                height: 300,
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
                  "body { font-family:Helvetica,Arial,sans-serif; font-size:14px }",
              }}
            />

          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Indonesian Description - Optional
            </label>
            <Editor
              apiKey={import.meta.env.VITE_TINYMCE_API_KEY}
              value={description.id}
              onEditorChange={(content: string) =>
                setValue("description.id", content)
              }
              init={{
                height: 300,
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
                  "body { font-family:Helvetica,Arial,sans-serif; font-size:14px }",
              }}
            />

          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Terms and Conditions (English) - Optional
            </label>
            <Editor
              apiKey={import.meta.env.VITE_TINYMCE_API_KEY}
              value={termsAndConditions?.en || ""}
              onEditorChange={(content: string) =>
                setValue("terms_and_conditions.en", content)
              }
              init={{
                height: 300,
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
                  "body { font-family:Helvetica,Arial,sans-serif; font-size:14px }",
              }}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Terms and Conditions (Indonesian) - Optional
            </label>
            <Editor
              apiKey={import.meta.env.VITE_TINYMCE_API_KEY}
              value={termsAndConditions?.id || ""}
              onEditorChange={(content: string) =>
                setValue("terms_and_conditions.id", content)
              }
              init={{
                height: 300,
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
                  "body { font-family:Helvetica,Arial,sans-serif; font-size:14px }",
              }}
            />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <Input type="date" {...register("start_date")} />
              {errors.start_date && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.start_date.message}
                </p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Event Dates & Times
            </label>
            <div className="space-y-4">
              {eventDates.map((eventDate, index) => (
                <div key={index} className="flex gap-2 items-end">
                  <div className="flex-1">
                    <label className="block text-xs text-gray-600 mb-1">
                      Date
                    </label>
                    <input
                      type="date"
                      value={eventDate.date}
                      onChange={(e) =>
                        updateEventDate(index, "date", e.target.value)
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-marigold"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs text-gray-600 mb-1">
                      Time
                    </label>
                    <input
                      type="time"
                      value={eventDate.time}
                      onChange={(e) =>
                        updateEventDate(index, "time", e.target.value)
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-marigold"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeEventDate(index)}
                    disabled={eventDates.length === 1}
                    className="px-3 py-2 text-red-600 hover:text-red-800 disabled:text-gray-400 disabled:cursor-not-allowed"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={addEventDate}
                className="text-marigold hover:text-marigold/80 text-sm"
              >
                + Add Another Date
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Registration Deadline
            </label>
            <Input type="date" {...register("registration_deadline")} />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Location
              </label>
              <Input {...register("location")} />
              {errors.location && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.location.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Max Registration Quota - Optional
              </label>
              <Input
                type="number"
                {...register("max_quota", { valueAsNumber: true })}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Venue Details
            </label>
            <textarea
              {...register("venue_details")}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-h-[60px]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Event Poster
            </label>
            <Input
              type="file"
              accept="image/*"
              onChange={(e) => setPosterFile(e.target.files?.[0] || null)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              {...register("status")}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="upcoming">Upcoming</option>
              <option value="ongoing">Ongoing</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          <div className="flex gap-4 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Cancel
            </Button>

            <Button
              type="submit"
              variant="default"
              disabled={isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? "Updating..." : "Update Event"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
