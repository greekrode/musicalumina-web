import { useState, useEffect } from "react";
import Modal from "@/components/Modal";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import * as z from "zod";
import { Editor } from "@tinymce/tinymce-react";

const subcategorySchema = z.object({
  name: z.string().min(1, "Name is required"),
  age_requirement: z.string().min(1, "Age requirement is required"),
  registration_fee: z.coerce.number().min(0, "Fee is required"),
  repertoire: z.string().optional(), // comma separated
  performance_duration: z.string().optional(),
  requirements: z.string().optional(),
  order_index: z.coerce.number().int().min(0, "Order is required"),
});

type SubcategoryFormData = z.infer<typeof subcategorySchema>;

interface SubcategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (
    data: Omit<SubcategoryFormData, "repertoire"> & { repertoire: string[] },
    isEdit: boolean
  ) => void;
  initialData?: SubcategoryFormData | null;
  categoryId: string;
}

export function SubcategoryModal({
  isOpen,
  onClose,
  onSubmit,
  initialData,
}: SubcategoryModalProps) {
  const isEdit = !!initialData;
  const [form, setForm] = useState<SubcategoryFormData>({
    name: initialData?.name || "",
    age_requirement: initialData?.age_requirement || "",
    registration_fee: initialData?.registration_fee ?? 0,
    repertoire: initialData?.repertoire
      ? Array.isArray(initialData.repertoire)
        ? initialData.repertoire.join(", ")
        : initialData.repertoire
      : "",
    performance_duration: initialData?.performance_duration || "",
    requirements: initialData?.requirements || "",
    order_index: initialData?.order_index ?? 0,
  });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setForm({
      name: initialData?.name || "",
      age_requirement: initialData?.age_requirement || "",
      registration_fee: initialData?.registration_fee ?? 0,
      repertoire: initialData?.repertoire
        ? Array.isArray(initialData.repertoire)
          ? initialData.repertoire.join(", ")
          : initialData.repertoire
        : "",
      performance_duration: initialData?.performance_duration || "",
      requirements: initialData?.requirements || "",
      order_index: initialData?.order_index ?? 0,
    });
  }, [initialData, isOpen]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleEditorChange = (content: string) => {
    setForm({ ...form, requirements: content });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const parsed = subcategorySchema.safeParse(form);
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
      setError("Failed to save subcategory");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? "Edit Subcategory" : "Add Subcategory"}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Name</label>
          <Input name="name" value={form.name} onChange={handleChange} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">
            Age Requirement
          </label>
          <Input
            name="age_requirement"
            value={form.age_requirement}
            onChange={handleChange}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">
            Registration Fee
          </label>
          <Input
            name="registration_fee"
            type="number"
            value={form.registration_fee}
            onChange={handleChange}
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
          <label className="block text-sm font-medium mb-1">
            Performance Duration
          </label>
          <Input
            name="performance_duration"
            value={form.performance_duration}
            onChange={handleChange}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Requirements</label>
          <Editor
            apiKey={import.meta.env.VITE_TINYMCE_API_KEY}
            value={form.requirements}
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
              : "Add Subcategory"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
