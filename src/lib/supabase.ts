import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables");
}

// Create Supabase client with custom headers for admin role
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  global: {
    headers: {
      // This will be used by RLS policies to determine admin access
      "x-admin-role": "admin",
    },
  },
});

export async function getEvents({
  page = 1,
  limit = 10,
  status,
  startDate,
  endDate,
}: {
  page?: number;
  limit?: number;
  status?: "upcoming" | "ongoing" | "completed";
  startDate?: Date;
  endDate?: Date;
}) {
  try {
    let query = supabase
      .from("events")
      .select(
        `
        *,
        event_categories (
          id,
          name,
          description,
          repertoire,
          event_subcategories (
            id,
            name,
            age_requirement,
            registration_fee,
            final_registration_fee,
            foreign_registration_fee,
            foreign_final_registration_fee,
            repertoire,
            performance_duration,
            requirements,
            order_index
          )
        ),
        event_jury (
          id,
          name,
          title,
          description,
          avatar_url,
          credentials
        )
      `,
        { count: "exact" }
      )
      .order("status", { ascending: false })
      .order("start_date", { ascending: true });

    if (status === "upcoming") {
      query = query.in("status", ["upcoming", "ongoing"]);
    } else if (status) {
      query = query.eq("status", status);
    }

    if (startDate) {
      query = query.gte("start_date", startDate.toISOString());
    }

    if (endDate) {
      query = query.lte("start_date", endDate.toISOString());
    }

    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      throw error;
    }

    return {
      events: data || [],
      total: count || 0,
      page,
      limit,
    };
  } catch (error) {
    console.error("Error fetching events:", error);
    throw error;
  }
}

export async function getEventById(id: string) {
  try {
    // First, fetch the event with its basic data
    const { data: event, error: eventError } = await supabase
      .from("events")
      .select(
        `
        *,
        event_categories (
          id,
          name,
          description,
          repertoire,
          order_index,
          event_subcategories (
            id,
            name,
            age_requirement,
            registration_fee,
            final_registration_fee,
            foreign_registration_fee,
            foreign_final_registration_fee,
            repertoire,
            performance_duration,
            requirements,
            order_index
          )
        ),
        event_jury (
          id,
          name,
          title,
          description,
          avatar_url,
          credentials,
          created_at
        )
      `
      )
      .eq("id", id)
      .order('created_at', { foreignTable: 'event_jury' })
      .single();

    if (eventError) {
      throw eventError;
    }

    // Get registration count for this event
    const { count: registrationCount, error: countError } = await supabase
      .from("registrations")
      .select("*", { count: "exact", head: true })
      .eq("event_id", id)
      .in("status", ["pending", "verified"]);

    if (countError) {
      console.error("Error fetching registration count:", countError);
    }

    // Add registration count to event object
    const eventWithCount = {
      ...event,
      registration_count: registrationCount || 0,
    };

          // Sort categories and subcategories by order_index
      if (eventWithCount.event_categories) {
        // First sort categories by order_index
        eventWithCount.event_categories = eventWithCount.event_categories.sort(
          (a: { order_index: number }, b: { order_index: number }) =>
            a.order_index - b.order_index
        );

        // Then sort subcategories within each category
        eventWithCount.event_categories = eventWithCount.event_categories.map(
          (category: { event_subcategories: { order_index: number }[] }) => ({
            ...category,
            event_subcategories: category.event_subcategories.sort(
              (a: { order_index: number }, b: { order_index: number }) =>
                a.order_index - b.order_index
            ),
          })
        );
      }

    // For upcoming and ongoing events, fetch prizes
    if (eventWithCount.status === "upcoming" || eventWithCount.status === "ongoing") {
      // Fetch all prizes for this event
      const { data: prizes, error: prizesError } = await supabase
        .from("event_prizes")
        .select("*")
        .eq("event_id", id);

      if (prizesError) {
        throw prizesError;
      }

      // Group prizes by category
      const prizesByCategory = prizes.reduce((acc, prize) => {
        if (prize.category_id) {
          if (!acc[prize.category_id]) {
            acc[prize.category_id] = [];
          }
          acc[prize.category_id].push(prize);
        } else {
          // Handle global prizes (no specific category)
          if (!acc.global) {
            acc.global = [];
          }
          acc.global.push(prize);
        }
        return acc;
      }, {});

      // Add prizes to their respective categories
      if (eventWithCount.event_categories) {
        eventWithCount.event_categories = eventWithCount.event_categories.map(
          (category: {
            id: string;
            event_subcategories: { order_index: number }[];
          }) => ({
            ...category,
            prizes: prizesByCategory[category.id] || [],
            global_prizes: prizesByCategory.global || [],
          })
        );
      }
    }

    // For completed events, fetch winners
    if (eventWithCount.status === "completed") {
      const { data: winners, error: winnersError } = await supabase
        .from("event_winners")
        .select(
          `
          id,
          participant_name,
          prize_title,
          category_id,
          subcategory_id,
          event_categories!inner (
            id,
            name,
            order_index
          ),
          event_subcategories!inner (
            id,
            name,
            order_index
          )
        `
        )
        .eq("event_id", id)
        .order("prize_title");

      if (winnersError) {
        throw winnersError;
      }

      // Group winners by category and subcategory, maintaining order
      type CategoryData = {
        order: number;
        subcategories: Record<
          string,
          {
            order: number;
            winners: Array<{
              participant_name: string;
              prize_title: string;
            }>;
          }
        >;
      };

      const groupedWinners = winners.reduce(
        (acc: Record<string, CategoryData>, winner: any) => {
          const categoryData = Array.isArray(winner.event_categories)
            ? winner.event_categories[0]
            : winner.event_categories;
          const subcategoryData = Array.isArray(winner.event_subcategories)
            ? winner.event_subcategories[0]
            : winner.event_subcategories;

          const category = categoryData?.name;
          const categoryOrderIndex = categoryData?.order_index;
          const subcategory = subcategoryData?.name;
          const subcategoryOrderIndex = subcategoryData?.order_index;

          if (!category || categoryOrderIndex === undefined) return acc;
          if (!subcategory || subcategoryOrderIndex === undefined) return acc;

          if (!acc[category]) {
            acc[category] = {
              order: categoryOrderIndex,
              subcategories: {},
            };
          }

          if (!acc[category].subcategories[subcategory]) {
            acc[category].subcategories[subcategory] = {
              order: subcategoryOrderIndex,
              winners: [],
            };
          }

          acc[category].subcategories[subcategory].winners.push({
            participant_name: winner.participant_name,
            prize_title: winner.prize_title,
          });

          return acc;
        },
        {}
      );

      // Sort categories by order_index, then sort subcategories within each category
      const sortedWinners: Record<
        string,
        Record<string, Array<{ participant_name: string; prize_title: string }>>
      > = {};
      Object.entries(groupedWinners)
        .sort(([, a], [, b]) => a.order - b.order)
        .forEach(([category, categoryData]) => {
          const sortedSubcategories: Record<
            string,
            Array<{ participant_name: string; prize_title: string }>
          > = {};
          Object.entries(categoryData.subcategories)
            .sort(([, a], [, b]) => a.order - b.order)
            .forEach(([subcategory, subcategoryData]) => {
              sortedSubcategories[subcategory] = subcategoryData.winners;
            });
          sortedWinners[category] = sortedSubcategories;
        });

      return { ...eventWithCount, winners: sortedWinners };
    }

    return eventWithCount;
  } catch (error) {
    console.error("Error fetching event:", error);
    throw error;
  }
}

export const getLatestUpcomingEvent = async () => {
  const { data, error } = await supabase
    .from("events")
    .select(
      `
      id,
      title,
      start_date,
      type
    `
    )
    .eq("status", "ongoing")
    .order("start_date", { ascending: true })
    .limit(3);

  if (error) {
    console.error("Error fetching latest events:", error);
    return null;
  }

  return data;
};

export async function sendContactMessage(data: {
  name: string;
  email: string;
  subject: string;
  message: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    // First, insert the message into the database
    const { data: insertedMessage, error: dbError } = await supabase
      .from("contact_messages")
      .insert([
        {
          ...data,
          created_at: new Date().toISOString(),
          sent_at: null,
        },
      ])
      .select()
      .single();

    if (dbError) throw dbError;
    if (!insertedMessage) throw new Error("Failed to insert message");

    // Then, trigger the Edge Function to send the email
    const { error: functionError } = await supabase.functions.invoke(
      "send-contact-email",
      {
        body: { ...data, messageId: insertedMessage.id },
      }
    );

    if (functionError) throw functionError;

    return { success: true };
  } catch (error) {
    console.error("Error sending contact message:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to send message",
    };
  }
}

export async function getMasterclassParticipants(eventId: string) {
  try {
    const { data, error } = await supabase
      .from("masterclass_participants")
      .select("*")
      .eq("event_id", eventId)
      .order("name");

    if (error) throw error;

    return {
      participants: data || [],
    };
  } catch (error) {
    console.error("Error fetching masterclass participants:", error);
    throw error;
  }
}

export async function addMasterclassParticipant(participant: {
  event_id: string;
  name: string;
  repertoire: string[];
}) {
  try {
    const { data, error } = await supabase
      .from("masterclass_participants")
      .insert([participant])
      .select()
      .single();

    if (error) throw error;

    return {
      participant: data,
    };
  } catch (error) {
    console.error("Error adding masterclass participant:", error);
    throw error;
  }
}

export async function updateMasterclassParticipant(
  id: string,
  updates: {
    name?: string;
    repertoire?: string[];
  }
) {
  try {
    const { data, error } = await supabase
      .from("masterclass_participants")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return {
      participant: data,
    };
  } catch (error) {
    console.error("Error updating masterclass participant:", error);
    throw error;
  }
}

export async function deleteMasterclassParticipant(id: string) {
  try {
    const { error } = await supabase
      .from("masterclass_participants")
      .delete()
      .eq("id", id);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error("Error deleting masterclass participant:", error);
    throw error;
  }
}
