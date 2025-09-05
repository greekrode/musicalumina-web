import Modal from "@/components/Modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";
import { zodResolver } from "@hookform/resolvers/zod";
import { Editor } from "@tinymce/tinymce-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";

const eventDateSchema = z.object({
  date: z.string().min(1, "Date is required"),
  time: z.string().min(1, "Time is required")
});

const formSchema = z.object({
  title: z.string().min(1, "Title is required"),
  type: z.enum(["festival", "competition", "masterclass", "group class"]),
  description: z.object({
    en: z.string().min(1, "English description is required"),
    id: z.string().min(1, "Indonesian description is required"),
  }),
  terms_and_conditions: z.object({
    en: z.string().optional(),
    id: z.string().optional(),
  }).optional(),
  start_date: z.string().min(1, "Start date is required"),
  event_date: z.array(eventDateSchema).min(1, "At least one event date is required"),
  registration_deadline: z.string().optional(),
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

interface AddEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEventAdded: () => void;
}

export function AddEventModal({
  isOpen,
  onClose,
  onEventAdded,
}: AddEventModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [posterFile, setPosterFile] = useState<File | null>(null);
  const [eventDates, setEventDates] = useState<Array<{ date: string; time: string }>>([
    { date: "", time: "" }
  ]);
  const [durations, setDurations] = useState<number[]>([]);

  const {
    register,
    handleSubmit,
    reset,
    control,
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
      max_quota: undefined,
      lark_base: "",
      lark_table: "",
      event_duration: [],
    },
  });

  // Watch form values for the editors
  const description = watch("description");
  const termsAndConditions = watch("terms_and_conditions");

  // Remove unused destructured elements
  // const { fields, append, remove } = useFieldArray({
  //   control,
  //   name: "event_date",
  // });

  const addEventDate = () => {
    setEventDates([...eventDates, { date: "", time: "" }]);
  };

  const removeEventDate = (index: number) => {
    if (eventDates.length > 1) {
      setEventDates(eventDates.filter((_, i) => i !== index));
    }
  };

  const updateEventDate = (index: number, field: "date" | "time", value: string) => {
    const updated = [...eventDates];
    updated[index][field] = value;
    setEventDates(updated);
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setIsSubmitting(true);

      // Convert event dates to ISO strings
      const convertedEventDates = eventDates
        .filter(ed => ed.date && ed.time)
        .map(ed => {
          const dateTime = new Date(`${ed.date}T${ed.time}`);
          return dateTime.toISOString();
        });

      const eventData = {
        ...values,
        event_date: convertedEventDates,
        max_quota: values.max_quota,
        lark_base: values.lark_base,
        lark_table: values.lark_table,
        event_duration: durations.length ? durations : null,
      };

      let posterUrl = null;
      if (posterFile) {
        const fileExt = posterFile.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `event-posters/${fileName}`;

        const { error: uploadError, data: uploadData } = await supabase.storage
          .from('public')
          .upload(filePath, posterFile);

        if (uploadError) throw uploadError;
        if (uploadData) {
          posterUrl = filePath;
        }
      }

      const { error } = await supabase.from("events").insert([
        {
          title: eventData.title,
          type: eventData.type,
          description: eventData.description,
          terms_and_conditions: eventData.terms_and_conditions,
          event_date: eventData.event_date,
          event_duration: eventData.event_duration,
          registration_deadline: eventData.registration_deadline,
          location: eventData.location,
          venue_details: eventData.venue_details,
          poster_image: posterUrl,
          max_quota: eventData.max_quota,
          status: eventData.status,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]);

      if (error) throw error;

      onEventAdded();
      handleClose();
    } catch (error) {
      console.error("Error adding event:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    reset();
    setPosterFile(null);
    setEventDates([{ date: "", time: "" }]);
    setDurations([]);
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
      title="Add New Event"
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 sm:space-y-6">
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              English Description
            </label>
            <Editor
              apiKey="no-api-key"
              initialValue=""
              init={{
                height: 300,
                menubar: false,
                plugins: [
                  'lists link',
                  'image',
                  'charmap',
                  'anchor',
                  'searchreplace',
                  'visualblocks',
                  'code',
                  'fullscreen',
                  'insertdatetime',
                  'media',
                  'table',
                  'code',
                  'help',
                  'wordcount'
                ],
                toolbar: 'bold italic underline | alignleft aligncenter alignright | bullist numlist outdent indent | link image',
              }}
                             onEditorChange={(content: string) => setValue("description.en", content)}
            />
            {errors.description?.en && (
              <p className="mt-1 text-sm text-red-600">
                {errors.description?.en.message}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Indonesian Description
            </label>
            <Editor
              apiKey="no-api-key"
              initialValue=""
              init={{
                height: 300,
                menubar: false,
                plugins: [
                  'lists link',
                  'image',
                  'charmap',
                  'anchor',
                  'searchreplace',
                  'visualblocks',
                  'code',
                  'fullscreen',
                  'insertdatetime',
                  'media',
                  'table',
                  'code',
                  'help',
                  'wordcount'
                ],
                toolbar: 'bold italic underline | alignleft aligncenter alignright | bullist numlist outdent indent | link image',
              }}
                             onEditorChange={(content: string) => setValue("description.id", content)}
            />
            {errors.description?.id && (
              <p className="mt-1 text-sm text-red-600">
                {errors.description?.id.message}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Terms and Conditions (English)
            </label>
            <Editor
              apiKey="no-api-key"
              value={termsAndConditions?.en || ""}
              onEditorChange={(content: string) => setValue("terms_and_conditions.en", content)}
              init={{
                height: 300,
                menubar: false,
                plugins: [
                  'lists link',
                  'image',
                  'charmap',
                  'anchor',
                  'searchreplace',
                  'visualblocks',
                  'code',
                  'fullscreen',
                  'insertdatetime',
                  'media',
                  'table',
                  'code',
                  'help',
                  'wordcount'
                ],
                toolbar: 'bold italic underline | alignleft aligncenter alignright | bullist numlist outdent indent | link image',
              }}
            />
            {errors.terms_and_conditions?.en && (
              <p className="mt-1 text-sm text-red-600">
                {errors.terms_and_conditions?.en.message}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Terms and Conditions (Indonesian)
            </label>
            <Editor
              apiKey="no-api-key"
              value={termsAndConditions?.id || ""}
              onEditorChange={(content: string) => setValue("terms_and_conditions.id", content)}
              init={{
                height: 300,
                menubar: false,
                plugins: [
                  'lists link',
                  'image',
                  'charmap',
                  'anchor',
                  'searchreplace',
                  'visualblocks',
                  'code',
                  'fullscreen',
                  'insertdatetime',
                  'media',
                  'table',
                  'code',
                  'help',
                  'wordcount'
                ],
                toolbar: 'bold italic underline | alignleft aligncenter alignright | bullist numlist outdent indent | link image',
              }}
            />
            {errors.terms_and_conditions?.id && (
              <p className="mt-1 text-sm text-red-600">
                {errors.terms_and_conditions?.id.message}
              </p>
            )}
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
              Event Dates & Times
            </label>
            <div className="space-y-4">
              {eventDates.map((eventDate, index) => (
                <div key={index} className="flex gap-2 items-end">
                  <div className="flex-1">
                    <label className="block text-xs text-gray-600 mb-1">Date</label>
                    <input
                      type="date"
                      value={eventDate.date}
                      onChange={(e) => updateEventDate(index, "date", e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-marigold"
                      required
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs text-gray-600 mb-1">Time</label>
                    <input
                      type="time"
                      value={eventDate.time}
                      onChange={(e) => updateEventDate(index, "time", e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-marigold"
                      required
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeEventDate(index)}
                    disabled={eventDates.length === 1}
                    className="px-3 py-2 text-red-600 hover:text-red-800 disabled:text-gray-400 disabled:cursor-not-allowed"
                  >
                    Remove
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
              Event Durations (minutes)
            </label>
            <div className="space-y-2">
              {durations.map((d, idx) => (
                <div key={idx} className="flex items-end gap-2">
                  <Input
                    type="number"
                    min="1"
                    value={d}
                    onChange={(e) => {
                      const v = parseInt(e.target.value || "0", 10);
                      setDurations((prev) => prev.map((val, i) => (i === idx ? v : val)));
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setDurations((prev) => prev.filter((_, i) => i !== idx))}
                    className="px-3 py-2 text-red-600 hover:text-red-800"
                  >
                    Remove
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setDurations((prev) => [...prev, 10])}
                className="text-marigold hover:text-marigold/80 text-sm"
              >
                + Add Duration
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Registration Deadline
            </label>
            <Input type="date" {...register("registration_deadline")} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                Max Registration Quota
              </label>
              <Input
                type="number"
                min="1"
                {...register("max_quota", { valueAsNumber: true })}
                placeholder="Leave empty for unlimited"
              />
              {errors.max_quota && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.max_quota.message}
                </p>
              )}
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
              onChange={handlePosterChange}
              className="w-full"
            />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3 pt-4 border-t">
          <Button 
            type="button" 
            variant="outline" 
            onClick={handleClose}
            className="w-full sm:w-auto order-2 sm:order-1"
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            disabled={isSubmitting}
            className="w-full sm:w-auto order-1 sm:order-2"
          >
            {isSubmitting ? "Adding..." : "Add Event"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
