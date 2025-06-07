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

const subcategorySchema = z.object({
  name: z.string().min(1, "Name is required"),
  age_requirement: z.string().min(1, "Age requirement is required"),
  registration_fee: z.coerce.number().min(0, "Fee is required"),
  final_registration_fee: z.coerce.number().min(0, "Final fee is required").nullable(),
  foreign_registration_fee: z.array(z.object({
    country: z.string().min(1, "Country is required"),
    fee: z.string().min(1, "Fee is required")
  })).nullable(),
  foreign_final_registration_fee: z.array(z.object({
    country: z.string().min(1, "Country is required"),
    fee: z.string().min(1, "Fee is required")
  })).nullable(),
  repertoire: z.array(z.string()).nullable(),
  performance_duration: z.string().nullable(),
  requirements: z.string().nullable(),
  order_index: z.coerce.number().int().min(0, "Order is required"),
});

type SubcategoryFormData = z.infer<typeof subcategorySchema>;

interface SubcategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: SubcategoryFormData, isEdit: boolean) => Promise<void>;
  initialData?: SubcategoryFormData | null;
  categoryId: string;
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
      <span className="flex-1 text-sm">
        {item.country}: {item.fee}
      </span>
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

export function SubcategoryModal({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  categoryId,
}: SubcategoryModalProps) {
  const isEdit = !!initialData;
  const [form, setForm] = useState<SubcategoryFormData>({
    name: initialData?.name || "",
    age_requirement: initialData?.age_requirement || "",
    registration_fee: initialData?.registration_fee ?? 0,
    final_registration_fee: initialData?.final_registration_fee ?? null,
    foreign_registration_fee: initialData?.foreign_registration_fee || [],
    foreign_final_registration_fee: initialData?.foreign_final_registration_fee || [],
    repertoire: initialData?.repertoire || [],
    performance_duration: initialData?.performance_duration || "",
    requirements: initialData?.requirements || "",
    order_index: initialData?.order_index ?? 0,
  });
  const [newRepertoireItem, setNewRepertoireItem] = useState("");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [newForeignFee, setNewForeignFee] = useState({ country: "", fee: "" });
  const [editingForeignIndex, setEditingForeignIndex] = useState<number | null>(null);
  const [newForeignFinalFee, setNewForeignFinalFee] = useState({ country: "", fee: "" });
  const [editingForeignFinalIndex, setEditingForeignFinalIndex] = useState<number | null>(null);
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
      foreign_final_registration_fee: initialData?.foreign_final_registration_fee || [],
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
  }, [initialData, isOpen]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    let processedValue: string | number | null = value;
    
    // Handle number fields
    if (type === "number") {
      if (name === "final_registration_fee") {
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

  const handleAddForeignFee = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Adding foreign fee:", newForeignFee);
    console.log("Current form.foreign_registration_fee:", form.foreign_registration_fee);
    
    if (newForeignFee.country.trim() && newForeignFee.fee.trim()) {
      if (editingForeignIndex !== null) {
        // Update existing item
        const newForeignFees = [...(form.foreign_registration_fee || [])];
        newForeignFees[editingForeignIndex] = {
          country: newForeignFee.country.trim(),
          fee: newForeignFee.fee.trim(),
        };
        console.log("Updating foreign fees:", newForeignFees);
        setForm({
          ...form,
          foreign_registration_fee: newForeignFees,
        });
        setEditingForeignIndex(null);
      } else {
        // Add new item
        const updatedFees = [
          ...(form.foreign_registration_fee || []),
          {
            country: newForeignFee.country.trim(),
            fee: newForeignFee.fee.trim(),
          },
        ];
        console.log("Adding new foreign fee, updated array:", updatedFees);
        setForm({
          ...form,
          foreign_registration_fee: updatedFees,
        });
      }
      setNewForeignFee({ country: "", fee: "" });
    } else {
      console.log("Cannot add foreign fee - missing country or fee");
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
      setForm((form) => {
        const oldIndex = parseInt(active.id as string);
        const newIndex = parseInt(over.id as string);

        return {
          ...form,
          foreign_registration_fee: arrayMove(
            form.foreign_registration_fee || [],
            oldIndex,
            newIndex
          ),
        };
      });
    }
  };

  const handleAddForeignFinalFee = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Adding foreign final fee:", newForeignFinalFee);
    console.log("Current form.foreign_final_registration_fee:", form.foreign_final_registration_fee);
    
    if (newForeignFinalFee.country.trim() && newForeignFinalFee.fee.trim()) {
      if (editingForeignFinalIndex !== null) {
        // Update existing item
        const newForeignFinalFees = [...(form.foreign_final_registration_fee || [])];
        newForeignFinalFees[editingForeignFinalIndex] = {
          country: newForeignFinalFee.country.trim(),
          fee: newForeignFinalFee.fee.trim(),
        };
        console.log("Updating foreign final fees:", newForeignFinalFees);
        setForm({
          ...form,
          foreign_final_registration_fee: newForeignFinalFees,
        });
        setEditingForeignFinalIndex(null);
      } else {
        // Add new item
        const updatedFinalFees = [
          ...(form.foreign_final_registration_fee || []),
          {
            country: newForeignFinalFee.country.trim(),
            fee: newForeignFinalFee.fee.trim(),
          },
        ];
        console.log("Adding new foreign final fee, updated array:", updatedFinalFees);
        setForm({
          ...form,
          foreign_final_registration_fee: updatedFinalFees,
        });
      }
      setNewForeignFinalFee({ country: "", fee: "" });
    } else {
      console.log("Cannot add foreign final fee - missing country or fee");
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
      foreign_final_registration_fee: (form.foreign_final_registration_fee || []).filter(
        (_, i) => i !== index
      ),
    });
    if (editingForeignFinalIndex === index) {
      setEditingForeignFinalIndex(null);
      setNewForeignFinalFee({ country: "", fee: "" });
    }
  };

  const handleForeignFinalFeeDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setForm((form) => {
        const oldIndex = parseInt(active.id as string);
        const newIndex = parseInt(over.id as string);

        return {
          ...form,
          foreign_final_registration_fee: arrayMove(
            form.foreign_final_registration_fee || [],
            oldIndex,
            newIndex
          ),
        };
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    // Process the form data - only use what's already in the form arrays
    const processedData = {
      ...form,
      foreign_registration_fee: form.foreign_registration_fee && form.foreign_registration_fee.length > 0 
        ? form.foreign_registration_fee 
        : null,
      foreign_final_registration_fee: form.foreign_final_registration_fee && form.foreign_final_registration_fee.length > 0 
        ? form.foreign_final_registration_fee 
        : null,
    };
    
    console.log("Form data before validation:", processedData);
    
    const parsed = subcategorySchema.safeParse(processedData);
    if (!parsed.success) {
      console.error("Validation errors:", parsed.error.errors);
      setError(parsed.error.errors[0].message);
      return;
    }
    
    console.log("Parsed data to submit:", parsed.data);
    
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
            Final Registration Fee
          </label>
          <Input
            name="final_registration_fee"
            type="number"
            value={form.final_registration_fee || ""}
            onChange={handleChange}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">
            Foreign Registration Fees
          </label>
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <Input
                value={newForeignFee.country}
                onChange={(e) => {
                  console.log("Country input changed:", e.target.value);
                  setNewForeignFee({ ...newForeignFee, country: e.target.value });
                }}
                placeholder="Country"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddForeignFee(e);
                  }
                }}
              />
              <Input
                value={newForeignFee.fee}
                onChange={(e) => {
                  console.log("Fee input changed:", e.target.value);
                  setNewForeignFee({ ...newForeignFee, fee: e.target.value });
                }}
                placeholder="Fee amount"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddForeignFee(e);
                  }
                }}
              />
            </div>
            <Button
              type="button"
              onClick={(e) => {
                console.log("Button clicked!");
                handleAddForeignFee(e);
              }}
              variant="outline"
              className="w-full"
            >
              {editingForeignIndex !== null ? "Update Fee" : "Add Foreign Fee"}
            </Button>
            <div className="space-y-2 mt-2">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleForeignFeeDragEnd}
              >
                <SortableContext
                  items={(form.foreign_registration_fee || []).map((_, i) =>
                    i.toString()
                  )}
                  strategy={verticalListSortingStrategy}
                >
                  {(form.foreign_registration_fee || []).map((item, index) => (
                    <SortableForeignFee
                      key={index}
                      id={index.toString()}
                      item={item}
                      onRemove={() => handleRemoveForeignFee(index)}
                      onEdit={() => handleEditForeignFee(index)}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            </div>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">
            Foreign Final Registration Fees
          </label>
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <Input
                value={newForeignFinalFee.country}
                onChange={(e) =>
                  setNewForeignFinalFee({ ...newForeignFinalFee, country: e.target.value })
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
                value={newForeignFinalFee.fee}
                onChange={(e) =>
                  setNewForeignFinalFee({ ...newForeignFinalFee, fee: e.target.value })
                }
                placeholder="Fee amount"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddForeignFinalFee(e);
                  }
                }}
              />
            </div>
            <Button
              type="button"
              onClick={handleAddForeignFinalFee}
              variant="outline"
              className="w-full"
            >
              {editingForeignFinalIndex !== null ? "Update Final Fee" : "Add Foreign Final Fee"}
            </Button>
            <div className="space-y-2 mt-2">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleForeignFinalFeeDragEnd}
              >
                <SortableContext
                  items={(form.foreign_final_registration_fee || []).map((_, i) =>
                    i.toString()
                  )}
                  strategy={verticalListSortingStrategy}
                >
                  {(form.foreign_final_registration_fee || []).map((item, index) => (
                    <SortableForeignFee
                      key={index}
                      id={index.toString()}
                      item={item}
                      onRemove={() => handleRemoveForeignFinalFee(index)}
                      onEdit={() => handleEditForeignFinalFee(index)}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            </div>
          </div>
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
          <label className="block text-sm font-medium mb-1">
            Performance Duration
          </label>
          <Input
            name="performance_duration"
            value={form.performance_duration || ""}
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
