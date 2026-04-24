import { useEffect, useState } from "react";
import { sanitizeHtml } from "@/lib/sanitize";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { NoteGlyph } from "@/components/ui/wireframe-wave";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/lib/database.types";
import { CategoryModal } from "@/components/admin/CategoryModal";
import { SubcategoryModal } from "@/components/admin/SubcategoryModal";
import Modal from "@/components/Modal";
import { cn } from "@/lib/utils";

/* ============================================================================
   Types — preserved 1:1.
   ============================================================================ */

type Event = Database["public"]["Tables"]["events"]["Row"];
type Category = Database["public"]["Tables"]["event_categories"]["Row"] & {
  event_subcategories: Subcategory[];
};
type Subcategory = Database["public"]["Tables"]["event_subcategories"]["Row"];

/**
 * AdminEventCategories — admin screen for managing the category / subcategory
 * hierarchy beneath competition and festival events.
 *
 * One bordered block per event. Each block lists its categories with inline
 * subcategory management. All CRUD (add / edit / delete) still flows through
 * the existing CategoryModal and SubcategoryModal (Phase 6e scope).
 */
export default function AdminEventCategories() {
  const [events, setEvents] = useState<Event[]>([]);
  const [categoriesByEvent, setCategoriesByEvent] = useState<
    Record<string, Category[]>
  >({});
  const [isLoading, setIsLoading] = useState(true);

  const [categoryModal, setCategoryModal] = useState<{
    open: boolean;
    eventId: string | null;
    initialData?: Category | null;
  }>({ open: false, eventId: null, initialData: null });
  const [subcategoryModal, setSubcategoryModal] = useState<{
    open: boolean;
    categoryId: string | null;
    initialData?: Subcategory | null;
  }>({ open: false, categoryId: null, initialData: null });
  const [deleteConfirm, setDeleteConfirm] = useState<{
    open: boolean;
    type: "category" | "subcategory";
    id: string;
    parentId?: string;
  } | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setIsLoading(true);
    try {
      const { data: eventsData, error: eventsError } = await supabase
        .from("events")
        .select("*")
        .in("type", ["competition", "festival"])
        .order("start_date", { ascending: false });
      if (eventsError) {
        console.error("Error fetching events:", eventsError);
        return;
      }
      setEvents(eventsData || []);

      const { data: categoriesData, error: categoriesError } = await supabase
        .from("event_categories")
        .select(
          `
          *,
          event_subcategories (
            id,
            category_id,
            name,
            age_requirement,
            registration_fee,
            final_registration_fee,
            foreign_registration_fee,
            foreign_final_registration_fee,
            repertoire,
            performance_duration,
            requirements,
            order_index,
            created_at,
            updated_at
          )
        `
        )
        .order("order_index", { ascending: true });
      if (categoriesError) {
        console.error("Error fetching categories:", categoriesError);
        return;
      }

      const grouped: Record<string, Category[]> = {};
      (categoriesData || []).forEach((cat: Category) => {
        if (!grouped[cat.event_id]) grouped[cat.event_id] = [];
        if (cat.event_subcategories) {
          cat.event_subcategories.sort(
            (a, b) => a.order_index - b.order_index
          );
        }
        grouped[cat.event_id].push(cat);
      });

      setCategoriesByEvent(grouped);
    } catch (error) {
      console.error("Error in fetchData:", error);
    } finally {
      setIsLoading(false);
    }
  }

  /* ───── Category handlers (unchanged) ───── */

  const handleAddCategory = (eventId: string) => {
    setCategoryModal({ open: true, eventId, initialData: null });
  };
  const handleEditCategory = (eventId: string, category: Category) => {
    setCategoryModal({ open: true, eventId, initialData: category });
  };
  const handleSubmitCategory = async (
    data: {
      name: string;
      description: string | null;
      repertoire: string[] | null;
      order_index: number;
    },
    isEdit: boolean
  ) => {
    try {
      if (!categoryModal.eventId) return;
      if (isEdit && categoryModal.initialData) {
        const { data: updatedData, error } = await supabase
          .from("event_categories")
          .update({
            name: data.name,
            description: data.description,
            repertoire: data.repertoire,
            order_index: data.order_index,
          })
          .eq("id", categoryModal.initialData.id)
          .select();
        if (error) {
          console.error("Category update error:", error);
          throw new Error(error.message);
        }
        void updatedData;
      } else {
        const { error } = await supabase.from("event_categories").insert({
          ...data,
          event_id: categoryModal.eventId,
          created_at: new Date().toISOString(),
        });
        if (error) {
          console.error("Category insert error:", error);
          throw new Error(error.message);
        }
      }
      setCategoryModal({ open: false, eventId: null, initialData: null });
      await fetchData();
    } catch (error) {
      console.error("Error in handleSubmitCategory:", error);
      throw error;
    }
  };
  const handleDeleteCategory = async (categoryId: string) => {
    await supabase.from("event_categories").delete().eq("id", categoryId);
    setDeleteConfirm(null);
    fetchData();
  };

  /* ───── Subcategory handlers (unchanged) ───── */

  const handleAddSubcategory = (categoryId: string) => {
    setSubcategoryModal({ open: true, categoryId, initialData: null });
  };
  const handleEditSubcategory = (
    categoryId: string,
    subcategory: Subcategory
  ) => {
    setSubcategoryModal({ open: true, categoryId, initialData: subcategory });
  };
  const handleSubmitSubcategory = async (
    data: {
      name: string;
      age_requirement: string;
      registration_fee: number;
      final_registration_fee: number | null;
      foreign_registration_fee:
        | Array<{ country: string; fee: string }>
        | null;
      foreign_final_registration_fee:
        | Array<{ country: string; fee: string }>
        | null;
      repertoire: string[] | null;
      performance_duration: string | null;
      requirements: string | null;
      order_index: number;
    },
    isEdit: boolean
  ) => {
    try {
      if (!subcategoryModal.categoryId) return;
      if (isEdit && subcategoryModal.initialData) {
        const { error } = await supabase
          .from("event_subcategories")
          .update({
            name: data.name,
            age_requirement: data.age_requirement,
            registration_fee: data.registration_fee,
            final_registration_fee: data.final_registration_fee,
            foreign_registration_fee: data.foreign_registration_fee,
            foreign_final_registration_fee: data.foreign_final_registration_fee,
            repertoire: data.repertoire,
            performance_duration: data.performance_duration,
            requirements: data.requirements,
            order_index: data.order_index,
          })
          .eq("id", subcategoryModal.initialData.id);
        if (error) {
          console.error("Subcategory update error:", error);
          throw new Error(error.message);
        }
      } else {
        const { error } = await supabase.from("event_subcategories").insert({
          ...data,
          category_id: subcategoryModal.categoryId,
          created_at: new Date().toISOString(),
        });
        if (error) {
          console.error("Subcategory insert error:", error);
          throw new Error(error.message);
        }
      }
      setSubcategoryModal({
        open: false,
        categoryId: null,
        initialData: null,
      });
      await fetchData();
    } catch (error) {
      console.error("Error in handleSubmitSubcategory:", error);
      throw error;
    }
  };
  const handleDeleteSubcategory = async (subcategoryId: string) => {
    await supabase.from("event_subcategories").delete().eq("id", subcategoryId);
    setDeleteConfirm(null);
    fetchData();
  };

  return (
    <AdminLayout>
      <div className="flex flex-col gap-8">
        <header className="flex flex-col gap-2">
          <Eyebrow withRule>Manage · Categories</Eyebrow>
          <h1 className="type-display-md text-burgundy">
            Event categories
          </h1>
          <p className="type-body-sm text-ink-muted max-w-2xl">
            Competition and festival events are organised into categories and
            subcategories. Categories group repertoire and rules; subcategories
            add fees, age requirements, and performance duration.
          </p>
        </header>

        {isLoading ? (
          <div className="bg-surface-elevated border border-rule-hairline p-10 text-center type-body-sm text-ink-muted">
            Loading categories…
          </div>
        ) : events.length === 0 ? (
          <div className="bg-surface-elevated border border-rule-hairline p-10 text-center">
            <Eyebrow className="mb-2">No events</Eyebrow>
            <p className="type-body-sm text-ink-muted">
              No competition or festival events to configure yet.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {events.map((event) => {
              const categories = categoriesByEvent[event.id] || [];
              return (
                <section
                  key={event.id}
                  className="bg-surface-elevated border border-rule-hairline"
                >
                  {/* Event header */}
                  <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 p-5 lg:p-6 border-b border-rule-hairline">
                    <div className="flex flex-col gap-1">
                      <Eyebrow>Event</Eyebrow>
                      <h2 className="type-headline-sm text-burgundy">
                        {event.title}
                      </h2>
                      <p className="type-caption text-ink-muted">
                        {categories.length}{" "}
                        {categories.length === 1 ? "category" : "categories"}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAddCategory(event.id)}
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add category
                    </Button>
                  </div>

                  {/* Categories */}
                  {categories.length === 0 ? (
                    <div className="p-6 text-center type-body-sm text-ink-muted">
                      No categories yet. Use <strong>Add category</strong> to
                      create the first one.
                    </div>
                  ) : (
                    <ul className="divide-y divide-rule-hairline">
                      {categories.map((category) => (
                        <CategoryRow
                          key={category.id}
                          category={category}
                          onEditCategory={() =>
                            handleEditCategory(event.id, category)
                          }
                          onDeleteCategory={() =>
                            setDeleteConfirm({
                              open: true,
                              type: "category",
                              id: category.id,
                            })
                          }
                          onAddSubcategory={() =>
                            handleAddSubcategory(category.id)
                          }
                          onEditSubcategory={(sub) =>
                            handleEditSubcategory(category.id, sub)
                          }
                          onDeleteSubcategory={(sub) =>
                            setDeleteConfirm({
                              open: true,
                              type: "subcategory",
                              id: sub.id,
                              parentId: category.id,
                            })
                          }
                        />
                      ))}
                    </ul>
                  )}
                </section>
              );
            })}
          </div>
        )}
      </div>

      {/* Modals — wiring unchanged */}
      <CategoryModal
        isOpen={categoryModal.open}
        onClose={() =>
          setCategoryModal({ open: false, eventId: null, initialData: null })
        }
        initialData={
          categoryModal.initialData
            ? {
                name: categoryModal.initialData.name,
                description: categoryModal.initialData.description,
                repertoire: Array.isArray(
                  categoryModal.initialData.repertoire
                )
                  ? (categoryModal.initialData.repertoire as string[])
                  : null,
                order_index: categoryModal.initialData.order_index,
              }
            : null
        }
        onSubmit={handleSubmitCategory}
      />

      <SubcategoryModal
        isOpen={subcategoryModal.open}
        onClose={() =>
          setSubcategoryModal({
            open: false,
            categoryId: null,
            initialData: null,
          })
        }
        initialData={
          subcategoryModal.initialData
            ? {
                name: subcategoryModal.initialData.name,
                age_requirement:
                  subcategoryModal.initialData.age_requirement,
                registration_fee:
                  subcategoryModal.initialData.registration_fee,
                final_registration_fee:
                  subcategoryModal.initialData.final_registration_fee,
                foreign_registration_fee: Array.isArray(
                  subcategoryModal.initialData.foreign_registration_fee
                )
                  ? (subcategoryModal.initialData
                      .foreign_registration_fee as Array<{
                      country: string;
                      fee: string;
                    }>)
                  : null,
                foreign_final_registration_fee: Array.isArray(
                  subcategoryModal.initialData.foreign_final_registration_fee
                )
                  ? (subcategoryModal.initialData
                      .foreign_final_registration_fee as Array<{
                      country: string;
                      fee: string;
                    }>)
                  : null,
                repertoire: Array.isArray(
                  subcategoryModal.initialData.repertoire
                )
                  ? (subcategoryModal.initialData.repertoire as string[])
                  : null,
                performance_duration:
                  subcategoryModal.initialData.performance_duration,
                requirements: subcategoryModal.initialData.requirements,
                order_index: subcategoryModal.initialData.order_index,
              }
            : null
        }
        categoryId={subcategoryModal.categoryId || ""}
        onSubmit={handleSubmitSubcategory}
      />

      {/* Delete confirmation — editorial Modal with semantic destructive styling */}
      {deleteConfirm?.open && (
        <Modal
          isOpen
          onClose={() => setDeleteConfirm(null)}
          eyebrow="Confirm"
          title={`Delete this ${deleteConfirm.type}?`}
          maxWidth="sm"
        >
          <div className="flex flex-col gap-6">
            <p className="type-body-md text-ink-body">
              This action cannot be undone. The {deleteConfirm.type} and any
              associated data will be removed permanently.
            </p>
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setDeleteConfirm(null)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={() => {
                  if (deleteConfirm.type === "category")
                    handleDeleteCategory(deleteConfirm.id);
                  else handleDeleteSubcategory(deleteConfirm.id);
                }}
              >
                Delete
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </AdminLayout>
  );
}

/* ============================================================================
   CategoryRow — one category block inside an event's list. Shows the category
   name + description on the left, subcategories and their inline actions on
   the right, and category-level actions in a trailing icon group.
   ============================================================================ */

function CategoryRow({
  category,
  onEditCategory,
  onDeleteCategory,
  onAddSubcategory,
  onEditSubcategory,
  onDeleteSubcategory,
}: {
  category: Category;
  onEditCategory: () => void;
  onDeleteCategory: () => void;
  onAddSubcategory: () => void;
  onEditSubcategory: (sub: Subcategory) => void;
  onDeleteSubcategory: (sub: Subcategory) => void;
}) {
  const subs = category.event_subcategories || [];

  return (
    <li className="p-5 lg:p-6 hover:bg-surface-canvas-warm/30 transition-colors">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.4fr_auto] gap-5 lg:gap-8 items-start">
        {/* Category name + description */}
        <div className="flex flex-col gap-2">
          <h3 className="type-title-lg text-burgundy">{category.name}</h3>
          {category.description ? (
            <div
              className="type-body-sm text-ink-muted prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(category.description) }}
            />
          ) : (
            <p className="type-caption text-ink-subtle italic">No description</p>
          )}
        </div>

        {/* Subcategories */}
        <div className="flex flex-col gap-3">
          <Eyebrow>
            {subs.length} {subs.length === 1 ? "subcategory" : "subcategories"}
          </Eyebrow>
          {subs.length > 0 ? (
            <ul className="flex flex-col gap-1.5">
              {subs.map((sub) => (
                <li
                  key={sub.id}
                  className="group flex items-start justify-between gap-3 py-1.5"
                >
                  <div className="flex items-start gap-2 min-w-0 flex-1">
                    <NoteGlyph
                      size={12}
                      className="text-marigold mt-1 flex-shrink-0"
                    />
                    <div className="flex flex-col min-w-0">
                      <span className="type-body-sm text-burgundy font-medium">
                        {sub.name}
                      </span>
                      <span className="type-caption text-ink-muted">
                        {sub.age_requirement}
                        {sub.registration_fee
                          ? ` · IDR ${sub.registration_fee.toLocaleString()}`
                          : ""}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-0.5 flex-shrink-0 opacity-60 group-hover:opacity-100 transition-opacity">
                    <IconAction
                      label="Edit subcategory"
                      icon={<Pencil className="h-3 w-3" />}
                      onClick={() => onEditSubcategory(sub)}
                    />
                    <IconAction
                      destructive
                      label="Delete subcategory"
                      icon={<Trash2 className="h-3 w-3" />}
                      onClick={() => onDeleteSubcategory(sub)}
                    />
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="type-caption text-ink-subtle italic">
              No subcategories yet.
            </p>
          )}
          <button
            type="button"
            onClick={onAddSubcategory}
            className={cn(
              "self-start inline-flex items-center gap-1.5 type-label",
              "text-burgundy hover:text-marigold transition-colors"
            )}
          >
            <Plus className="h-3 w-3" />
            Add subcategory
          </button>
        </div>

        {/* Category-level actions */}
        <div className="flex items-center gap-1 lg:flex-col lg:items-end">
          <IconAction
            label="Edit category"
            icon={<Pencil className="h-3.5 w-3.5" />}
            onClick={onEditCategory}
          />
          <IconAction
            destructive
            label="Delete category"
            icon={<Trash2 className="h-3.5 w-3.5" />}
            onClick={onDeleteCategory}
          />
        </div>
      </div>
    </li>
  );
}

function IconAction({
  onClick,
  label,
  icon,
  destructive,
}: {
  onClick?: () => void;
  label: string;
  icon: React.ReactNode;
  destructive?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={cn(
        "h-7 w-7 flex items-center justify-center rounded-sm transition-colors duration-fast ease-out-quart",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marigold focus-visible:ring-offset-2",
        destructive
          ? "text-ink-muted hover:text-[color:var(--status-error)] hover:bg-[color:var(--status-error-bg)]"
          : "text-ink-muted hover:text-burgundy hover:bg-surface-canvas-warm"
      )}
    >
      {icon}
    </button>
  );
}
