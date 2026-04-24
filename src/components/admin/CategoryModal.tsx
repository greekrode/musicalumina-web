import { useState, useEffect } from "react";
import Modal from "@/components/Modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { NoteGlyph } from "@/components/ui/wireframe-wave";
import * as z from "zod";
import { Editor } from "@tinymce/tinymce-react";
import { X, GripVertical, Pencil, AlertCircle } from "lucide-react";
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
import { cn } from "@/lib/utils";

/**
 * CategoryModal — admin create / edit for an event category.
 *
 * Editorial shell, boxed admin inputs, NoteGlyph-led repertoire list with
 * keyboard-accessible drag reorder preserved 1:1. TinyMCE editor kept as-is
 * — only the surrounding chrome changes.
 */

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

/* ------------------------------------------------------------------ */
/*  Sortable repertoire row                                            */
/* ------------------------------------------------------------------ */

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
      className={cn(
        "flex items-center gap-3 bg-surface-canvas-warm border border-rule-hairline px-3 py-2.5",
        "transition-colors duration-fast ease-out-quart",
        isDragging ? "opacity-50" : "hover:border-burgundy/30"
      )}
    >
      <button
        type="button"
        aria-label="Drag to reorder"
        className="cursor-grab text-ink-subtle hover:text-burgundy active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <NoteGlyph size={12} className="text-marigold flex-shrink-0" />
      <span className="flex-1 type-body-sm text-ink-body truncate">{item}</span>
      <button
        type="button"
        onClick={onEdit}
        aria-label="Edit"
        className="h-7 w-7 flex items-center justify-center rounded-sm text-ink-muted hover:text-burgundy hover:bg-burgundy/[0.06] transition-colors"
      >
        <Pencil className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onClick={onRemove}
        aria-label="Remove"
        className="h-7 w-7 flex items-center justify-center rounded-sm text-ink-muted hover:text-[color:var(--status-error)] hover:bg-[color:var(--status-error-bg)] transition-colors"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Modal                                                              */
/* ------------------------------------------------------------------ */

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
    setError(null);
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
        const newRepertoire = [...(form.repertoire || [])];
        newRepertoire[editingIndex] = newRepertoireItem.trim();
        setForm({ ...form, repertoire: newRepertoire });
        setEditingIndex(null);
      } else {
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
      setForm((prev) => {
        const oldIndex = parseInt(active.id as string);
        const newIndex = parseInt(over.id as string);
        return {
          ...prev,
          repertoire: arrayMove(prev.repertoire || [], oldIndex, newIndex),
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
      console.error("Failed to save category:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to save category. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const repertoire = form.repertoire || [];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? "Edit category" : "New category"}
      eyebrow={isEdit ? "Categories · Edit" : "Categories · New"}
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        {error && (
          <div className="flex items-start gap-3 border-l-2 border-[color:var(--status-error)] bg-[color:var(--status-error-bg)] px-4 py-3">
            <AlertCircle
              className="h-4 w-4 mt-0.5 text-[color:var(--status-error)] flex-shrink-0"
              aria-hidden
            />
            <p className="type-body-sm text-[color:var(--status-error)]">
              {error}
            </p>
          </div>
        )}

        {/* Name + order */}
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_160px] gap-5">
          <div className="flex flex-col gap-2">
            <Label htmlFor="cat-name">Category name</Label>
            <Input
              id="cat-name"
              name="name"
              variant="boxed"
              value={form.name}
              onChange={handleChange}
              placeholder="e.g. Junior Solo Piano"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="cat-order">Order</Label>
            <Input
              id="cat-order"
              name="order_index"
              type="number"
              variant="boxed"
              value={form.order_index}
              onChange={handleChange}
            />
          </div>
        </div>

        {/* Description */}
        <div className="flex flex-col gap-2">
          <Label>Description</Label>
          <div className="border border-rule-hairline overflow-hidden">
            <Editor
              apiKey={import.meta.env.VITE_TINYMCE_API_KEY}
              value={form.description || ""}
              onEditorChange={handleEditorChange}
              init={{
                height: 320,
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
              }}
            />
          </div>
        </div>

        {/* Repertoire list */}
        <div className="flex flex-col gap-3">
          <div className="flex items-end justify-between gap-3 flex-wrap">
            <div className="flex flex-col gap-1">
              <Label className="mb-0">Repertoire</Label>
              <p className="type-caption text-ink-muted">
                Drag to reorder. Edit or remove per row.
              </p>
            </div>
            {repertoire.length > 0 && (
              <Eyebrow tone="muted">
                {repertoire.length}{" "}
                {repertoire.length === 1 ? "piece" : "pieces"}
              </Eyebrow>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              variant="boxed"
              value={newRepertoireItem}
              onChange={(e) => setNewRepertoireItem(e.target.value)}
              placeholder="e.g. Chopin — Nocturne Op. 9 No. 2"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddRepertoireItem(e);
                }
              }}
            />
            <Button
              type="button"
              variant="outline"
              onClick={handleAddRepertoireItem}
              className="sm:w-auto w-full"
            >
              {editingIndex !== null ? "Update" : "Add piece"}
            </Button>
          </div>

          <div className="flex flex-col gap-1.5">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={repertoire.map((_, i) => i.toString())}
                strategy={verticalListSortingStrategy}
              >
                {repertoire.length === 0 ? (
                  <p className="type-caption text-ink-muted italic px-1 py-2">
                    No pieces yet. Add one above.
                  </p>
                ) : (
                  repertoire.map((item, index) => (
                    <SortableItem
                      key={index}
                      id={index.toString()}
                      item={item}
                      onRemove={() => handleRemoveRepertoireItem(index)}
                      onEdit={() => handleEditRepertoireItem(index)}
                    />
                  ))
                )}
              </SortableContext>
            </DndContext>
          </div>
        </div>

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
            {isSubmitting
              ? "Saving…"
              : isEdit
              ? "Save changes"
              : "Add category"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
