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

type Event = Database["public"]["Tables"]["events"]["Row"];

const eventSchema = z.object({
  title: z.string().min(1, "Title is required"),
  type: z.enum(["festival", "competition", "masterclass", "group class"] as const),
  description: z.object({
    en: z.string().nullable().default(null),
    id: z.string().nullable().default(null),
  }).nullable().default(null),
  terms_and_conditions: z.object({
    en: z.string().nullable().default(null),
    id: z.string().nullable().default(null),
  }).nullable().default(null),
  start_date: z.string().min(1, "Start date is required"),
  end_date: z.string().nullable(),
  registration_deadline: z.string().nullable(),
  location: z.string().min(1, "Location is required"),
  venue_details: z.string().nullable(),
  poster_image: z.string().nullable(),
  status: z.enum(["upcoming", "ongoing", "completed"] as const),
});

type EventFormData = z.infer<typeof eventSchema>;

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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [posterFile, setPosterFile] = useState<File | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<EventFormData>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      type: "competition",
      description: null,
      terms_and_conditions: null,
      end_date: null,
      registration_deadline: null,
      venue_details: null,
      poster_image: null,
      status: "upcoming",
    },
  });

  // Watch form values for the editors
  const description = watch("description");
  const termsAndConditions = watch("terms_and_conditions");

  // Update form when event changes
  useEffect(() => {
    if (event) {
      // Format dates to YYYY-MM-DD for input[type="date"]
      const formatDate = (dateStr: string | null) => {
        if (!dateStr) return undefined;
        return new Date(dateStr).toISOString().split('T')[0];
      };

      reset({
        title: event.title,
        type: event.type,
        description: event.description,
        terms_and_conditions: event.terms_and_conditions,
        start_date: formatDate(event.start_date) || '',
        end_date: formatDate(event.end_date),
        registration_deadline: formatDate(event.registration_deadline),
        location: event.location,
        venue_details: event.venue_details || null,
        poster_image: event.poster_image || null,
        status: event.status,
      });
    }
  }, [event, reset]);

  const onSubmit = async (data: EventFormData) => {
    if (!event) return;
    
    try {
      setIsSubmitting(true);

      let posterUrl = data.poster_image;
      if (posterFile) {
        const fileExt = posterFile.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `event-posters/${fileName}`;

        const { error: uploadError, data: uploadData } = await supabase.storage
          .from('public')
          .upload(filePath, posterFile);

        if (uploadError) throw uploadError;
        if (uploadData) {
          // Delete old poster if exists
          if (event.poster_image) {
            await supabase.storage
              .from('public')
              .remove([event.poster_image]);
          }
          posterUrl = filePath;
        }
      }

      // Format dates to ISO string for Supabase
      const formatDateForDB = (dateStr: string | null | undefined) => {
        if (!dateStr) return null;
        // Append time to make it a valid timestamp
        return new Date(dateStr + 'T00:00:00Z').toISOString();
      };

      const { error } = await supabase
        .from("events")
        .update({
          ...data,
          start_date: formatDateForDB(data.start_date),
          end_date: formatDateForDB(data.end_date),
          registration_deadline: formatDateForDB(data.registration_deadline),
          poster_image: posterUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', event.id);

      if (error) throw error;

      onEventUpdated();
      handleClose();
    } catch (error) {
      console.error("Error updating event:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    reset();
    setPosterFile(null);
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
      title="Edit Event"
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-4">
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
            {errors.status && (
              <p className="mt-1 text-sm text-red-600">
                {errors.status.message}
              </p>
            )}
          </div>

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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              English Description (Optional)
            </label>
            <Editor
              apiKey={import.meta.env.VITE_TINYMCE_API_KEY}
              value={description?.en || ''}
              onEditorChange={(content: string) => {
                setValue("description", {
                  en: content,
                  id: description?.id || null
                });
              }}
              init={{
                height: 500,
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
              Indonesian Description (Optional)
            </label>
            <Editor
              apiKey={import.meta.env.VITE_TINYMCE_API_KEY}
              value={description?.id || ''}
              onEditorChange={(content: string) => {
                setValue("description", {
                  en: description?.en || null,
                  id: content
                });
              }}
              init={{
                height: 500,
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
              English Terms & Conditions (Optional)
            </label>
            <Editor
              apiKey={import.meta.env.VITE_TINYMCE_API_KEY}
              value={termsAndConditions?.en || ''}
              onEditorChange={(content: string) => {
                setValue("terms_and_conditions", {
                  en: content,
                  id: termsAndConditions?.id || null
                });
              }}
              init={{
                height: 500,
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
              Indonesian Terms & Conditions (Optional)
            </label>
            <Editor
              apiKey={import.meta.env.VITE_TINYMCE_API_KEY}
              value={termsAndConditions?.id || ''}
              onEditorChange={(content: string) => {
                setValue("terms_and_conditions", {
                  en: termsAndConditions?.en || null,
                  id: content
                });
              }}
              init={{
                height: 500,
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
              Start Date
            </label>
            <Input type="date" {...register("start_date")} />
            {errors.start_date && (
              <p className="mt-1 text-sm text-red-600">
                {errors.start_date.message}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              End Date (Optional)
            </label>
            <Input type="date" {...register("end_date")} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Registration Deadline (Optional)
            </label>
            <Input type="date" {...register("registration_deadline")} />
          </div>

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
              Venue Details (Optional)
            </label>
            <textarea
              {...register("venue_details")}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-h-[60px]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Event Poster (Optional)
            </label>
            <Input
              type="file"
              accept="image/*"
              onChange={handlePosterChange}
              className="w-full"
            />
            {event?.poster_image && !posterFile && (
              <p className="mt-1 text-sm text-gray-500">
                Current poster: {event.poster_image}
              </p>
            )}
          </div>
        </div>

        <div className="flex justify-end space-x-3">
          <Button type="button" variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </form>
    </Modal>
  );
} 