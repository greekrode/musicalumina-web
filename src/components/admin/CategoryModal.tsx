import { useState, useEffect } from "react";
import Modal from "@/components/Modal";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import * as z from "zod";
import { Editor } from "@tinymce/tinymce-react";
import { X, GripVertical, Pencil } from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const categorySchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().nullable(),
  repertoire: z.array(z.string()).nullable(),
  order_index: z.coerce.number().int().min(0, "Order is required"),
});

type CategoryFormData = z.infer<typeof categorySchema>;

interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CategoryFormData, isEdit: boolean) => Promise<void>;
  initialData?: CategoryFormData | null;
}

interface SortableItemProps {
  id: string;
  item: string;
  onRemove: () => void;
  onEdit: () => void;
}

function SortableItem({ id, item, onRemove, onEdit }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 1 : 0,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 bg-gray-50 p-2 rounded-md ${
        isDragging ? "opacity-50" : ""
      }`}
    >
      <button
        type="button"
        className="cursor-grab text-gray-400 hover:text-gray-600"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <span className="flex-1 text-sm">{item}</span>
      <button
        type="button"
        onClick={onEdit}
        className="text-gray-500 hover:text-blue-500"
      >
        <Pencil className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={onRemove}
        className="text-gray-500 hover:text-red-500"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export function CategoryModal({
  isOpen,
  onClose,
  onSubmit,
  initialData,
}: CategoryModalProps) {
  const isEdit = !!initialData;
  const [form, setForm] = useState<CategoryFormData>({
    name: initialData?.name || "",
    description: initialData?.description || "",
    repertoire: initialData?.repertoire || [],
    order_index: initialData?.order_index ?? 0,
  });
  const [newRepertoireItem, setNewRepertoireItem] = useState("");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    setForm({
      name: initialData?.name || "",
      description: initialData?.description || "",
      repertoire: initialData?.repertoire || [],
      order_index: initialData?.order_index ?? 0,
    });
    setNewRepertoireItem("");
    setEditingIndex(null);
  }, [initialData, isOpen]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleEditorChange = (content: string) => {
    setForm({ ...form, description: content });
  };

  const handleAddRepertoireItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (newRepertoireItem.trim()) {
      if (editingIndex !== null) {
        // Update existing item
        const newRepertoire = [...(form.repertoire || [])];
        newRepertoire[editingIndex] = newRepertoireItem.trim();
        setForm({
          ...form,
          repertoire: newRepertoire,
        });
        setEditingIndex(null);
      } else {
        // Add new item
        setForm({
          ...form,
          repertoire: [...(form.repertoire || []), newRepertoireItem.trim()],
        });
      }
      setNewRepertoireItem("");
    }
  };

  const handleEditRepertoireItem = (index: number) => {
    setNewRepertoireItem(form.repertoire?.[index] || "");
    setEditingIndex(index);
  };

  const handleRemoveRepertoireItem = (index: number) => {
    setForm({
      ...form,
      repertoire: (form.repertoire || []).filter((_, i) => i !== index),
    });
    if (editingIndex === index) {
      setEditingIndex(null);
      setNewRepertoireItem("");
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setForm((form) => {
        const oldIndex = parseInt(active.id as string);
        const newIndex = parseInt(over.id as string);

        return {
          ...form,
          repertoire: arrayMove(form.repertoire || [], oldIndex, newIndex),
        };
      });
    }
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
      await onSubmit(parsed.data, isEdit);
      onClose();
    } catch (err) {
      console.error('Failed to save category:', err);
      setError(err instanceof Error ? err.message : "Failed to save category. Please try again.");
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
          <label className="block text-sm font-medium mb-1">
            Repertoire List
          </label>
          <div className="space-y-2">
            <div className="flex gap-2">
              <Input
                value={newRepertoireItem}
                onChange={(e) => setNewRepertoireItem(e.target.value)}
                placeholder="Enter repertoire item"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddRepertoireItem(e);
                  }
                }}
              />
              <Button
                type="button"
                onClick={handleAddRepertoireItem}
                variant="outline"
              >
                {editingIndex !== null ? "Update" : "Add"}
              </Button>
            </div>
            <div className="space-y-2 mt-2">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={(form.repertoire || []).map((_, i) => i.toString())}
                  strategy={verticalListSortingStrategy}
                >
                  {(form.repertoire || []).map((item, index) => (
                    <SortableItem
                      key={index}
                      id={index.toString()}
                      item={item}
                      onRemove={() => handleRemoveRepertoireItem(index)}
                      onEdit={() => handleEditRepertoireItem(index)}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            </div>
          </div>
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
