import { useState, useEffect } from "react";
import Modal from "@/components/Modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { NoteGlyph } from "@/components/ui/wireframe-wave";
import * as z from "zod";
import { Editor } from "@tinymce/tinymce-react";
import { X, GripVertical, Pencil, AlertCircle, Plus } from "lucide-react";
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
 * SubcategoryModal — admin create / edit for an event subcategory.
 *
 * The heaviest admin form: name, age band, IDR fee pair, two independent
 * foreign-fee lists (preliminary + final), repertoire list, TinyMCE
 * requirements. All CRUD + DnD wiring preserved 1:1; only the chrome changes.
 */

const subcategorySchema = z.object({
  name: z.string().min(1, "Name is required"),
  age_requirement: z.string().min(1, "Age requirement is required"),
  registration_fee: z.coerce.number().min(0, "Fee is required"),
  final_registration_fee: z.coerce
    .number()
    .min(0, "Final fee is required")
    .nullable(),
  foreign_registration_fee: z
    .array(
      z.object({
        country: z.string().min(1, "Country is required"),
        fee: z.string().min(1, "Fee is required"),
      })
    )
    .nullable(),
  foreign_final_registration_fee: z
    .array(
      z.object({
        country: z.string().min(1, "Country is required"),
        fee: z.string().min(1, "Fee is required"),
      })
    )
    .nullable(),
  early_bird_registration_fee: z.coerce.number().min(0).nullable(),
  early_bird_end_date: z.string().nullable(),
  early_bird_foreign_registration_fee: z
    .array(
      z.object({
        country: z.string().min(1, "Country is required"),
        fee: z.string().min(1, "Fee is required"),
      })
    )
    .nullable(),
  repertoire: z.array(z.string()).nullable(),
  performance_duration: z.string().nullable(),
  requirements: z.string().nullable(),
  order_index: z.coerce.number().int().min(0, "Order is required"),
}).superRefine((data, ctx) => {
  const hasFee = data.early_bird_registration_fee != null;
  const hasDate = data.early_bird_end_date != null && data.early_bird_end_date !== "";
  if (hasFee && !hasDate) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Early bird end date is required when a fee is set",
      path: ["early_bird_end_date"],
    });
  }
  if (hasDate && !hasFee) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Early bird fee is required when an end date is set",
      path: ["early_bird_registration_fee"],
    });
  }
});

type SubcategoryFormData = z.infer<typeof subcategorySchema>;

interface SubcategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: SubcategoryFormData, isEdit: boolean) => Promise<void>;
  initialData?: SubcategoryFormData | null;
  /** Reserved for future scoped-create flows. Not read directly. */
  categoryId: string;
}

/* ------------------------------------------------------------------ */
/*  Sortable row primitives                                            */
/* ------------------------------------------------------------------ */

function sortableRowClasses(isDragging: boolean) {
  return cn(
    "flex items-center gap-3 bg-surface-canvas-warm border border-rule-hairline px-3 py-2.5",
    "transition-colors duration-fast ease-out-quart",
    isDragging ? "opacity-50" : "hover:border-burgundy/30"
  );
}

const grabHandleClasses =
  "cursor-grab text-ink-subtle hover:text-burgundy active:cursor-grabbing";

function RowActions({
  onEdit,
  onRemove,
}: {
  onEdit: () => void;
  onRemove: () => void;
}) {
  return (
    <>
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
    </>
  );
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
    <div ref={setNodeRef} style={style} className={sortableRowClasses(isDragging)}>
      <button
        type="button"
        aria-label="Drag to reorder"
        className={grabHandleClasses}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <NoteGlyph size={12} className="text-marigold flex-shrink-0" />
      <span className="flex-1 type-body-sm text-ink-body truncate">{item}</span>
      <RowActions onEdit={onEdit} onRemove={onRemove} />
    </div>
  );
}

interface SortableForeignFeeProps {
  id: string;
  item: { country: string; fee: string };
  onRemove: () => void;
  onEdit: () => void;
}

function SortableForeignFee({
  id,
  item,
  onRemove,
  onEdit,
}: SortableForeignFeeProps) {
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
    <div ref={setNodeRef} style={style} className={sortableRowClasses(isDragging)}>
      <button
        type="button"
        aria-label="Drag to reorder"
        className={grabHandleClasses}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="flex-1 flex items-baseline gap-2 min-w-0">
        <span className="type-body-sm text-burgundy truncate">
          {item.country}
        </span>
        <span className="type-caption text-ink-muted">·</span>
        <span className="type-body-sm text-ink-body truncate">{item.fee}</span>
      </div>
      <RowActions onEdit={onEdit} onRemove={onRemove} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Modal                                                              */
/* ------------------------------------------------------------------ */

export function SubcategoryModal({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  categoryId: _categoryId,
}: SubcategoryModalProps) {
  void _categoryId; // reserved for future scoping

  const isEdit = !!initialData;
  const [form, setForm] = useState<SubcategoryFormData>({
    name: initialData?.name || "",
    age_requirement: initialData?.age_requirement || "",
    registration_fee: initialData?.registration_fee ?? 0,
    final_registration_fee: initialData?.final_registration_fee ?? null,
    foreign_registration_fee: initialData?.foreign_registration_fee || [],
    foreign_final_registration_fee:
      initialData?.foreign_final_registration_fee || [],
    early_bird_registration_fee:
      initialData?.early_bird_registration_fee ?? null,
    early_bird_end_date: initialData?.early_bird_end_date || "",
    early_bird_foreign_registration_fee:
      initialData?.early_bird_foreign_registration_fee || [],
    repertoire: initialData?.repertoire || [],
    performance_duration: initialData?.performance_duration || "",
    requirements: initialData?.requirements || "",
    order_index: initialData?.order_index ?? 0,
  });
  const [newRepertoireItem, setNewRepertoireItem] = useState("");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [newForeignFee, setNewForeignFee] = useState({ country: "", fee: "" });
  const [editingForeignIndex, setEditingForeignIndex] = useState<number | null>(
    null
  );
  const [newForeignFinalFee, setNewForeignFinalFee] = useState({
    country: "",
    fee: "",
  });
  const [editingForeignFinalIndex, setEditingForeignFinalIndex] = useState<
    number | null
  >(null);
  const [newEarlyBirdForeignFee, setNewEarlyBirdForeignFee] = useState({
    country: "",
    fee: "",
  });
  const [editingEarlyBirdForeignIndex, setEditingEarlyBirdForeignIndex] =
    useState<number | null>(null);
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
      age_requirement: initialData?.age_requirement || "",
      registration_fee: initialData?.registration_fee ?? 0,
      final_registration_fee: initialData?.final_registration_fee ?? null,
      foreign_registration_fee: initialData?.foreign_registration_fee || [],
      foreign_final_registration_fee:
        initialData?.foreign_final_registration_fee || [],
      early_bird_registration_fee:
        initialData?.early_bird_registration_fee ?? null,
      early_bird_end_date: initialData?.early_bird_end_date || "",
      early_bird_foreign_registration_fee:
        initialData?.early_bird_foreign_registration_fee || [],
      repertoire: initialData?.repertoire || [],
      performance_duration: initialData?.performance_duration || "",
      requirements: initialData?.requirements || "",
      order_index: initialData?.order_index ?? 0,
    });
    setNewRepertoireItem("");
    setEditingIndex(null);
    setNewForeignFee({ country: "", fee: "" });
    setEditingForeignIndex(null);
    setNewForeignFinalFee({ country: "", fee: "" });
    setEditingForeignFinalIndex(null);
    setNewEarlyBirdForeignFee({ country: "", fee: "" });
    setEditingEarlyBirdForeignIndex(null);
    setError(null);
  }, [initialData, isOpen]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    let processedValue: string | number | null = value;

    if (type === "number") {
      if (
        name === "final_registration_fee" ||
        name === "early_bird_registration_fee"
      ) {
        processedValue = value === "" ? null : Number(value);
      } else {
        processedValue = value === "" ? 0 : Number(value);
      }
    }

    setForm({ ...form, [name]: processedValue });
  };

  const handleEditorChange = (content: string) => {
    setForm({ ...form, requirements: content });
  };

  /* -------- Repertoire handlers -------- */

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
        const oldIndex = parseInt((active.id as string).replace(/^[a-z]+-/, ''), 10);
        const newIndex = parseInt((over.id as string).replace(/^[a-z]+-/, ''), 10);
        return {
          ...prev,
          repertoire: arrayMove(prev.repertoire || [], oldIndex, newIndex),
        };
      });
    }
  };

  /* -------- Foreign fees (preliminary) -------- */

  const handleAddForeignFee = (e: React.FormEvent) => {
    e.preventDefault();
    if (newForeignFee.country.trim() && newForeignFee.fee.trim()) {
      if (editingForeignIndex !== null) {
        const newForeignFees = [...(form.foreign_registration_fee || [])];
        newForeignFees[editingForeignIndex] = {
          country: newForeignFee.country.trim(),
          fee: newForeignFee.fee.trim(),
        };
        setForm({ ...form, foreign_registration_fee: newForeignFees });
        setEditingForeignIndex(null);
      } else {
        setForm({
          ...form,
          foreign_registration_fee: [
            ...(form.foreign_registration_fee || []),
            {
              country: newForeignFee.country.trim(),
              fee: newForeignFee.fee.trim(),
            },
          ],
        });
      }
      setNewForeignFee({ country: "", fee: "" });
    }
  };

  const handleEditForeignFee = (index: number) => {
    const fee = form.foreign_registration_fee?.[index];
    if (fee) {
      setNewForeignFee({ country: fee.country, fee: fee.fee });
      setEditingForeignIndex(index);
    }
  };

  const handleRemoveForeignFee = (index: number) => {
    setForm({
      ...form,
      foreign_registration_fee: (form.foreign_registration_fee || []).filter(
        (_, i) => i !== index
      ),
    });
    if (editingForeignIndex === index) {
      setEditingForeignIndex(null);
      setNewForeignFee({ country: "", fee: "" });
    }
  };

  const handleForeignFeeDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setForm((prev) => {
        const oldIndex = parseInt((active.id as string).replace(/^[a-z]+-/, ''), 10);
        const newIndex = parseInt((over.id as string).replace(/^[a-z]+-/, ''), 10);
        return {
          ...prev,
          foreign_registration_fee: arrayMove(
            prev.foreign_registration_fee || [],
            oldIndex,
            newIndex
          ),
        };
      });
    }
  };

  /* -------- Foreign fees (final) -------- */

  const handleAddForeignFinalFee = (e: React.FormEvent) => {
    e.preventDefault();
    if (newForeignFinalFee.country.trim() && newForeignFinalFee.fee.trim()) {
      if (editingForeignFinalIndex !== null) {
        const newForeignFinalFees = [
          ...(form.foreign_final_registration_fee || []),
        ];
        newForeignFinalFees[editingForeignFinalIndex] = {
          country: newForeignFinalFee.country.trim(),
          fee: newForeignFinalFee.fee.trim(),
        };
        setForm({
          ...form,
          foreign_final_registration_fee: newForeignFinalFees,
        });
        setEditingForeignFinalIndex(null);
      } else {
        setForm({
          ...form,
          foreign_final_registration_fee: [
            ...(form.foreign_final_registration_fee || []),
            {
              country: newForeignFinalFee.country.trim(),
              fee: newForeignFinalFee.fee.trim(),
            },
          ],
        });
      }
      setNewForeignFinalFee({ country: "", fee: "" });
    }
  };

  const handleEditForeignFinalFee = (index: number) => {
    const fee = form.foreign_final_registration_fee?.[index];
    if (fee) {
      setNewForeignFinalFee({ country: fee.country, fee: fee.fee });
      setEditingForeignFinalIndex(index);
    }
  };

  const handleRemoveForeignFinalFee = (index: number) => {
    setForm({
      ...form,
      foreign_final_registration_fee: (
        form.foreign_final_registration_fee || []
      ).filter((_, i) => i !== index),
    });
    if (editingForeignFinalIndex === index) {
      setEditingForeignFinalIndex(null);
      setNewForeignFinalFee({ country: "", fee: "" });
    }
  };

  const handleForeignFinalFeeDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setForm((prev) => {
        const oldIndex = parseInt((active.id as string).replace(/^[a-z]+-/, ''), 10);
        const newIndex = parseInt((over.id as string).replace(/^[a-z]+-/, ''), 10);
        return {
          ...prev,
          foreign_final_registration_fee: arrayMove(
            prev.foreign_final_registration_fee || [],
            oldIndex,
            newIndex
          ),
        };
      });
    }
  };

  /* -------- Foreign fees (early bird) -------- */

  const handleAddEarlyBirdForeignFee = (e: React.FormEvent) => {
    e.preventDefault();
    if (newEarlyBirdForeignFee.country.trim() && newEarlyBirdForeignFee.fee.trim()) {
      if (editingEarlyBirdForeignIndex !== null) {
        const updated = [...(form.early_bird_foreign_registration_fee || [])];
        updated[editingEarlyBirdForeignIndex] = {
          country: newEarlyBirdForeignFee.country.trim(),
          fee: newEarlyBirdForeignFee.fee.trim(),
        };
        setForm({ ...form, early_bird_foreign_registration_fee: updated });
        setEditingEarlyBirdForeignIndex(null);
      } else {
        setForm({
          ...form,
          early_bird_foreign_registration_fee: [
            ...(form.early_bird_foreign_registration_fee || []),
            {
              country: newEarlyBirdForeignFee.country.trim(),
              fee: newEarlyBirdForeignFee.fee.trim(),
            },
          ],
        });
      }
      setNewEarlyBirdForeignFee({ country: "", fee: "" });
    }
  };

  const handleEditEarlyBirdForeignFee = (index: number) => {
    const fee = form.early_bird_foreign_registration_fee?.[index];
    if (fee) {
      setNewEarlyBirdForeignFee({ country: fee.country, fee: fee.fee });
      setEditingEarlyBirdForeignIndex(index);
    }
  };

  const handleRemoveEarlyBirdForeignFee = (index: number) => {
    setForm({
      ...form,
      early_bird_foreign_registration_fee: (
        form.early_bird_foreign_registration_fee || []
      ).filter((_, i) => i !== index),
    });
    if (editingEarlyBirdForeignIndex === index) {
      setEditingEarlyBirdForeignIndex(null);
      setNewEarlyBirdForeignFee({ country: "", fee: "" });
    }
  };

  const handleEarlyBirdForeignFeeDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setForm((prev) => {
        const oldIndex = parseInt((active.id as string).replace(/^[a-z]+-/, ''), 10);
        const newIndex = parseInt((over.id as string).replace(/^[a-z]+-/, ''), 10);
        return {
          ...prev,
          early_bird_foreign_registration_fee: arrayMove(
            prev.early_bird_foreign_registration_fee || [],
            oldIndex,
            newIndex
          ),
        };
      });
    }
  };

  /* -------- Submit -------- */

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const processedData = {
      ...form,
      foreign_registration_fee:
        form.foreign_registration_fee &&
        form.foreign_registration_fee.length > 0
          ? form.foreign_registration_fee
          : null,
      foreign_final_registration_fee:
        form.foreign_final_registration_fee &&
        form.foreign_final_registration_fee.length > 0
          ? form.foreign_final_registration_fee
          : null,
      early_bird_foreign_registration_fee:
        form.early_bird_foreign_registration_fee &&
        form.early_bird_foreign_registration_fee.length > 0
          ? form.early_bird_foreign_registration_fee
          : null,
      early_bird_end_date:
        form.early_bird_end_date && form.early_bird_end_date.trim() !== ""
          ? form.early_bird_end_date
          : null,
    };

    const parsed = subcategorySchema.safeParse(processedData);
    if (!parsed.success) {
      setError(parsed.error.errors[0].message);
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(parsed.data, isEdit);
      onClose();
    } catch (err) {
      console.error("Failed to save subcategory:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to save subcategory. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const repertoire = form.repertoire || [];
  const foreignFees = form.foreign_registration_fee || [];
  const foreignFinalFees = form.foreign_final_registration_fee || [];
  const earlyBirdForeignFees = form.early_bird_foreign_registration_fee || [];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? "Edit subcategory" : "New subcategory"}
      eyebrow={isEdit ? "Subcategories · Edit" : "Subcategories · New"}
      maxWidth="3xl"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-7">
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

        {/* Identity */}
        <section className="flex flex-col gap-4">
          <Eyebrow withRule>Identity</Eyebrow>
          <div className="grid grid-cols-1 md:grid-cols-[1fr_240px_120px] gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="sub-name">Name</Label>
              <Input
                id="sub-name"
                name="name"
                variant="boxed"
                value={form.name}
                onChange={handleChange}
                placeholder="e.g. Group A · 6 – 8 years"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="sub-age">Age requirement</Label>
              <Input
                id="sub-age"
                name="age_requirement"
                variant="boxed"
                value={form.age_requirement}
                onChange={handleChange}
                placeholder="e.g. 6 – 8 years"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="sub-order">Order</Label>
              <Input
                id="sub-order"
                name="order_index"
                type="number"
                variant="boxed"
                value={form.order_index}
                onChange={handleChange}
              />
            </div>
          </div>
        </section>

        {/* IDR fees */}
        <section className="flex flex-col gap-4">
          <Eyebrow withRule>Fees · IDR</Eyebrow>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="sub-fee">Registration fee</Label>
              <Input
                id="sub-fee"
                name="registration_fee"
                type="number"
                variant="boxed"
                value={form.registration_fee}
                onChange={handleChange}
              />
              <p className="type-caption text-ink-muted">
                Preliminary round fee in IDR.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="sub-final-fee">Final fee</Label>
              <Input
                id="sub-final-fee"
                name="final_registration_fee"
                type="number"
                variant="boxed"
                value={form.final_registration_fee ?? ""}
                onChange={handleChange}
              />
              <p className="type-caption text-ink-muted">
                Leave blank for a single-round category.
              </p>
            </div>
          </div>
        </section>

        {/* Early bird pricing */}
        <section className="flex flex-col gap-4">
          <Eyebrow withRule>Early bird pricing</Eyebrow>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="sub-early-bird-fee">Early bird fee (IDR)</Label>
              <Input
                id="sub-early-bird-fee"
                name="early_bird_registration_fee"
                type="number"
                variant="boxed"
                value={form.early_bird_registration_fee ?? ""}
                onChange={handleChange}
              />
              <p className="type-caption text-ink-muted">
                Leave blank to disable early bird pricing.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="sub-early-bird-end">Early bird ends</Label>
              <Input
                id="sub-early-bird-end"
                name="early_bird_end_date"
                type="datetime-local"
                variant="boxed"
                value={
                  form.early_bird_end_date
                    ? form.early_bird_end_date.slice(0, 16)
                    : ""
                }
                onChange={handleChange}
              />
              <p className="type-caption text-ink-muted">
                Early bird row hides after this date and time.
              </p>
            </div>
          </div>
        </section>

        {/* Foreign fees · early bird */}
        <section className="flex flex-col gap-4">
          <div className="flex items-end justify-between gap-3 flex-wrap">
            <Eyebrow withRule>Foreign fees · early bird</Eyebrow>
            {earlyBirdForeignFees.length > 0 && (
              <Eyebrow tone="muted">
                {earlyBirdForeignFees.length}{" "}
                {earlyBirdForeignFees.length === 1 ? "country" : "countries"}
              </Eyebrow>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2">
              <Input
                variant="boxed"
                value={newEarlyBirdForeignFee.country}
                onChange={(e) =>
                  setNewEarlyBirdForeignFee({
                    ...newEarlyBirdForeignFee,
                    country: e.target.value,
                  })
                }
                placeholder="Country (e.g. Singapore)"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddEarlyBirdForeignFee(e);
                  }
                }}
              />
              <Input
                variant="boxed"
                value={newEarlyBirdForeignFee.fee}
                onChange={(e) =>
                  setNewEarlyBirdForeignFee({
                    ...newEarlyBirdForeignFee,
                    fee: e.target.value,
                  })
                }
                placeholder="Fee (e.g. SGD 120)"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddEarlyBirdForeignFee(e);
                  }
                }}
              />
              <Button
                type="button"
                onClick={handleAddEarlyBirdForeignFee}
                variant="outline"
                className="sm:w-auto w-full"
              >
                {editingEarlyBirdForeignIndex !== null ? "Update" : "Add fee"}
              </Button>
            </div>
            <div className="flex flex-col gap-1.5">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleEarlyBirdForeignFeeDragEnd}
              >
                <SortableContext
                  items={earlyBirdForeignFees.map((_, i) => `eb-${i}`)}
                  strategy={verticalListSortingStrategy}
                >
                  {earlyBirdForeignFees.length === 0 ? (
                    <p className="type-caption text-ink-muted italic px-1 py-2">
                      No foreign early bird fees configured.
                    </p>
                  ) : (
                    earlyBirdForeignFees.map((item, index) => (
                      <SortableForeignFee
                        key={index}
                        id={`eb-${index}`}
                        item={item}
                        onRemove={() => handleRemoveEarlyBirdForeignFee(index)}
                        onEdit={() => handleEditEarlyBirdForeignFee(index)}
                      />
                    ))
                  )}
                </SortableContext>
              </DndContext>
            </div>
          </div>
        </section>

        {/* Foreign preliminary fees */}
        <section className="flex flex-col gap-4">
          <div className="flex items-end justify-between gap-3 flex-wrap">
            <Eyebrow withRule>Foreign fees · preliminary</Eyebrow>
            {foreignFees.length > 0 && (
              <Eyebrow tone="muted">
                {foreignFees.length}{" "}
                {foreignFees.length === 1 ? "country" : "countries"}
              </Eyebrow>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2">
              <Input
                variant="boxed"
                value={newForeignFee.country}
                onChange={(e) =>
                  setNewForeignFee({
                    ...newForeignFee,
                    country: e.target.value,
                  })
                }
                placeholder="Country (e.g. Singapore)"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddForeignFee(e);
                  }
                }}
              />
              <Input
                variant="boxed"
                value={newForeignFee.fee}
                onChange={(e) =>
                  setNewForeignFee({ ...newForeignFee, fee: e.target.value })
                }
                placeholder="Fee (e.g. SGD 150)"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddForeignFee(e);
                  }
                }}
              />
              <Button
                type="button"
                onClick={handleAddForeignFee}
                variant="outline"
                className="sm:w-auto w-full"
              >
                {editingForeignIndex !== null ? "Update" : "Add fee"}
              </Button>
            </div>
            <div className="flex flex-col gap-1.5">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleForeignFeeDragEnd}
              >
                <SortableContext
                  items={foreignFees.map((_, i) => `reg-${i}`)}
                  strategy={verticalListSortingStrategy}
                >
                  {foreignFees.length === 0 ? (
                    <p className="type-caption text-ink-muted italic px-1 py-2">
                      No foreign preliminary fees configured.
                    </p>
                  ) : (
                    foreignFees.map((item, index) => (
                      <SortableForeignFee
                        key={index}
                        id={`reg-${index}`}
                        item={item}
                        onRemove={() => handleRemoveForeignFee(index)}
                        onEdit={() => handleEditForeignFee(index)}
                      />
                    ))
                  )}
                </SortableContext>
              </DndContext>
            </div>
          </div>
        </section>

        {/* Foreign final fees */}
        <section className="flex flex-col gap-4">
          <div className="flex items-end justify-between gap-3 flex-wrap">
            <Eyebrow withRule>Foreign fees · final</Eyebrow>
            {foreignFinalFees.length > 0 && (
              <Eyebrow tone="muted">
                {foreignFinalFees.length}{" "}
                {foreignFinalFees.length === 1 ? "country" : "countries"}
              </Eyebrow>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2">
              <Input
                variant="boxed"
                value={newForeignFinalFee.country}
                onChange={(e) =>
                  setNewForeignFinalFee({
                    ...newForeignFinalFee,
                    country: e.target.value,
                  })
                }
                placeholder="Country"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddForeignFinalFee(e);
                  }
                }}
              />
              <Input
                variant="boxed"
                value={newForeignFinalFee.fee}
                onChange={(e) =>
                  setNewForeignFinalFee({
                    ...newForeignFinalFee,
                    fee: e.target.value,
                  })
                }
                placeholder="Fee"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddForeignFinalFee(e);
                  }
                }}
              />
              <Button
                type="button"
                onClick={handleAddForeignFinalFee}
                variant="outline"
                className="sm:w-auto w-full"
              >
                {editingForeignFinalIndex !== null ? "Update" : "Add fee"}
              </Button>
            </div>
            <div className="flex flex-col gap-1.5">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleForeignFinalFeeDragEnd}
              >
                <SortableContext
                  items={foreignFinalFees.map((_, i) => `fin-${i}`)}
                  strategy={verticalListSortingStrategy}
                >
                  {foreignFinalFees.length === 0 ? (
                    <p className="type-caption text-ink-muted italic px-1 py-2">
                      No foreign final fees configured.
                    </p>
                  ) : (
                    foreignFinalFees.map((item, index) => (
                      <SortableForeignFee
                        key={index}
                        id={`fin-${index}`}
                        item={item}
                        onRemove={() => handleRemoveForeignFinalFee(index)}
                        onEdit={() => handleEditForeignFinalFee(index)}
                      />
                    ))
                  )}
                </SortableContext>
              </DndContext>
            </div>
          </div>
        </section>

        {/* Repertoire */}
        <section className="flex flex-col gap-4">
          <div className="flex items-end justify-between gap-3 flex-wrap">
            <div className="flex flex-col gap-1">
              <Eyebrow withRule>Repertoire</Eyebrow>
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
          <div className="flex flex-col gap-2">
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                variant="boxed"
                value={newRepertoireItem}
                onChange={(e) => setNewRepertoireItem(e.target.value)}
                placeholder="e.g. Bach — Prelude in C major, BWV 846"
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
                  items={repertoire.map((_, i) => `rep-${i}`)}
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
                        id={`rep-${index}`}
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
        </section>

        {/* Performance duration */}
        <section className="flex flex-col gap-4">
          <Eyebrow withRule>Performance</Eyebrow>
          <div className="flex flex-col gap-2">
            <Label htmlFor="sub-duration">Performance duration</Label>
            <Input
              id="sub-duration"
              name="performance_duration"
              variant="boxed"
              value={form.performance_duration || ""}
              onChange={handleChange}
              placeholder="e.g. Up to 5 minutes"
            />
          </div>
        </section>

        {/* Requirements */}
        <section className="flex flex-col gap-3">
          <Eyebrow withRule>Requirements</Eyebrow>
          <div className="border border-rule-hairline overflow-hidden">
            <Editor
              apiKey={import.meta.env.VITE_TINYMCE_API_KEY}
              value={form.requirements || ""}
              onEditorChange={handleEditorChange}
              init={{
                height: 360,
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
            {isSubmitting
              ? "Saving…"
              : isEdit
              ? "Save changes"
              : (
                <>
                  <Plus className="h-3.5 w-3.5" />
                  Add subcategory
                </>
              )}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
