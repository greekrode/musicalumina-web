import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/lib/database.types";
import { CategoryModal } from "@/components/admin/CategoryModal";
import { SubcategoryModal } from "@/components/admin/SubcategoryModal";
import Modal from "@/components/Modal";

// Types

type Event = Database["public"]["Tables"]["events"]["Row"];
type Category = Database["public"]["Tables"]["event_categories"]["Row"] & {
  event_subcategories: Subcategory[];
};
type Subcategory = Database["public"]["Tables"]["event_subcategories"]["Row"];

export default function AdminEventCategories() {
  const [events, setEvents] = useState<Event[]>([]);
  const [categoriesByEvent, setCategoriesByEvent] = useState<
    Record<string, Category[]>
  >({});
  const [isLoading, setIsLoading] = useState(true);

  // Modal state
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
      // Fetch all events
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

      // Fetch all categories with subcategories
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

      // Group by event_id and ensure subcategories are ordered
      const grouped: Record<string, Category[]> = {};
      (categoriesData || []).forEach((cat: Category) => {
        if (!grouped[cat.event_id]) {
          grouped[cat.event_id] = [];
        }
        // Sort subcategories by order_index if they exist
        if (cat.event_subcategories) {
          cat.event_subcategories.sort((a, b) => a.order_index - b.order_index);
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

  // Category handlers
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

        console.log("Updated category data:", updatedData);
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

  // Subcategory handlers
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
      foreign_registration_fee: Array<{ country: string; fee: string }> | null;
      foreign_final_registration_fee: Array<{ country: string; fee: string }> | null;
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

      setSubcategoryModal({ open: false, categoryId: null, initialData: null });
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
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-900">
            Event Categories & Subcategories
          </h1>
          {/* Add Category button could go here */}
        </div>
        {isLoading ? (
          <div>Loading...</div>
        ) : (
          <div className="space-y-8">
            {events.map((event) => (
              <div
                key={event.id}
                className="border rounded-lg p-4 bg-white shadow"
              >
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-lg font-bold">{event.title}</h2>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleAddCategory(event.id)}
                  >
                    Add Category
                  </Button>
                </div>
                <table className="min-w-full divide-y divide-gray-200 mb-2">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-sm font-semibold text-gray-900">
                        Category
                      </th>
                      <th className="px-4 py-2 text-left text-sm font-semibold text-gray-900">
                        Description
                      </th>
                      <th className="px-4 py-2 text-left text-sm font-semibold text-gray-900">
                        Subcategories
                      </th>
                      <th className="px-4 py-2 text-right text-sm font-semibold text-gray-900">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {(categoriesByEvent[event.id] || []).map((cat) => (
                      <tr key={cat.id}>
                        <td className="px-4 py-2 text-sm text-gray-900 font-medium">
                          {cat.name}
                        </td>
                        <td
                          className="px-4 py-2 text-sm text-gray-500"
                          dangerouslySetInnerHTML={{
                            __html: cat.description || "",
                          }}
                        ></td>
                        <td className="px-4 py-2 text-sm">
                          <ul className="list-disc list-inside">
                            {(cat.event_subcategories || []).map((sub) => (
                              <li key={sub.id}>
                                <span className="font-semibold">
                                  {sub.name}
                                </span>{" "}
                                ({sub.age_requirement})
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="ml-2"
                                  onClick={() =>
                                    handleEditSubcategory(cat.id, sub)
                                  }
                                >
                                  Edit
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-red-600 ml-1"
                                  onClick={() =>
                                    setDeleteConfirm({
                                      open: true,
                                      type: "subcategory",
                                      id: sub.id,
                                      parentId: cat.id,
                                    })
                                  }
                                >
                                  Delete
                                </Button>
                              </li>
                            ))}
                          </ul>
                          <Button
                            size="sm"
                            variant="outline"
                            className="mt-2"
                            onClick={() => handleAddSubcategory(cat.id)}
                          >
                            Add Subcategory
                          </Button>
                        </td>
                        <td className="px-4 py-2 text-right text-sm">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="mr-2"
                            onClick={() => handleEditCategory(event.id, cat)}
                          >
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-600"
                            onClick={() =>
                              setDeleteConfirm({
                                open: true,
                                type: "category",
                                id: cat.id,
                              })
                            }
                          >
                            Delete
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )}
      </div>
      {/* Category Modal */}
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
                repertoire: Array.isArray(categoryModal.initialData.repertoire)
                  ? (categoryModal.initialData.repertoire as string[])
                  : null,
                order_index: categoryModal.initialData.order_index,
              }
            : null
        }
        onSubmit={handleSubmitCategory}
      />
      {/* Subcategory Modal */}
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
                age_requirement: subcategoryModal.initialData.age_requirement,
                registration_fee: subcategoryModal.initialData.registration_fee,
                final_registration_fee: subcategoryModal.initialData.final_registration_fee,
                foreign_registration_fee: Array.isArray(subcategoryModal.initialData.foreign_registration_fee)
                  ? (subcategoryModal.initialData.foreign_registration_fee as Array<{country: string; fee: string}>)
                  : null,
                foreign_final_registration_fee: Array.isArray(subcategoryModal.initialData.foreign_final_registration_fee)
                  ? (subcategoryModal.initialData.foreign_final_registration_fee as Array<{country: string; fee: string}>)
                  : null,
                repertoire: Array.isArray(subcategoryModal.initialData.repertoire)
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
      {/* Delete Confirmation */}
      {deleteConfirm?.open && (
        <Modal
          isOpen={true}
          onClose={() => setDeleteConfirm(null)}
          title="Confirm Delete"
          maxWidth="sm"
        >
          <div className="space-y-4">
            <p>Are you sure you want to delete this {deleteConfirm.type}?</p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
                Cancel
              </Button>
              <Button
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
