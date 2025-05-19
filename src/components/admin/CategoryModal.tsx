import { useState, useEffect } from "react";
import Modal from "@/components/Modal";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import * as z from "zod";
import { Editor } from "@tinymce/tinymce-react";

const categorySchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  repertoire: z.string().optional(), // comma separated
  order_index: z.coerce.number().int().min(0, "Order is required"),
});

type CategoryFormData = z.infer<typeof categorySchema>;

interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (
    data: Omit<CategoryFormData, "repertoire"> & { repertoire: string[] },
    isEdit: boolean
  ) => void;
  initialData?: CategoryFormData | null;
  eventId: string;
}

export function CategoryModal({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  eventId,
}: CategoryModalProps) {
  const isEdit = !!initialData;
  const [form, setForm] = useState<CategoryFormData>({
    name: initialData?.name || "",
    description: initialData?.description || "",
    repertoire: initialData?.repertoire
      ? Array.isArray(initialData.repertoire)
        ? initialData.repertoire.join(", ")
        : initialData.repertoire
      : "",
    order_index: initialData?.order_index ?? 0,
  });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setForm({
      name: initialData?.name || "",
      description: initialData?.description || "",
      repertoire: initialData?.repertoire
        ? Array.isArray(initialData.repertoire)
          ? initialData.repertoire.join(", ")
          : initialData.repertoire
        : "",
      order_index: initialData?.order_index ?? 0,
    });
  }, [initialData, isOpen]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleEditorChange = (content: string) => {
    setForm({ ...form, description: content });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const parsed = categorySchema.safeParse(form);
    if (!parsed.success) {
      setError(parsed.error.errors[0].message);
      return;
    }
    setIsSubmitting(true);
    try {
      onSubmit(
        {
          ...parsed.data,
          repertoire: parsed.data.repertoire
            ? parsed.data.repertoire
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean)
            : [],
        },
        isEdit
      );
      onClose();
    } catch {
      setError("Failed to save category");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? "Edit Category" : "Add Category"}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Name</label>
          <Input name="name" value={form.name} onChange={handleChange} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Description</label>
          <Editor
            apiKey={import.meta.env.VITE_TINYMCE_API_KEY}
            value={form.description}
            onEditorChange={handleEditorChange}
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
          <label className="block text-sm font-medium mb-1">
            Repertoire (comma separated)
          </label>
          <Input
            name="repertoire"
            value={form.repertoire}
            onChange={handleChange}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Order Index</label>
          <Input
            name="order_index"
            type="number"
            value={form.order_index}
            onChange={handleChange}
          />
        </div>
        {error && <div className="text-red-600 text-sm">{error}</div>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting
              ? "Saving..."
              : isEdit
              ? "Save Changes"
              : "Add Category"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
