import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables");
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

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
          event_subcategories (
            id,
            name,
            age_requirement,
            registration_fee,
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
      `
      )
      .eq("id", id)
      .single();

    if (eventError) {
      throw eventError;
    }

    // Sort subcategories by order_index
    if (event.event_categories) {
      event.event_categories = event.event_categories.map((category) => ({
        ...category,
        event_subcategories: category.event_subcategories.sort(
          (a, b) => a.order_index - b.order_index
        ),
      }));
    }

    // For upcoming and ongoing events, fetch prizes
    if (event.status === "upcoming" || event.status === "ongoing") {
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
      event.event_categories = event.event_categories.map((category) => ({
        ...category,
        prizes: prizesByCategory[category.id] || [],
        global_prizes: prizesByCategory.global || [],
      }));
    }

    // For completed events, fetch winners
    if (event.status === "completed") {
      const { data: winners, error: winnersError } = await supabase
        .from("event_winners")
        .select(
          `
          id,
          participant_name,
          prize_title,
          prize_amount,
          category_id,
          subcategory_id,
          event_categories!inner (
            id,
            name
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
      const groupedWinners = winners.reduce((acc, winner) => {
        const category = winner.event_categories.name;
        const subcategory = winner.event_subcategories.name;
        const orderIndex = winner.event_subcategories.order_index;

        if (!acc[category]) {
          acc[category] = {};
        }

        if (!acc[category][subcategory]) {
          acc[category][subcategory] = {
            order: orderIndex,
            winners: [],
          };
        }

        acc[category][subcategory].winners.push({
          participant_name: winner.participant_name,
          prize_title: winner.prize_title,
          prize_amount: winner.prize_amount,
        });

        return acc;
      }, {});

      // Sort subcategories within each category by order_index
      Object.keys(groupedWinners).forEach((category) => {
        const sortedSubcategories = {};
        Object.entries(groupedWinners[category])
          .sort(([, a], [, b]) => a.order - b.order)
          .forEach(([subcategory, data]) => {
            sortedSubcategories[subcategory] = data.winners;
          });
        groupedWinners[category] = sortedSubcategories;
      });

      return { ...event, winners: groupedWinners };
    }

    return event;
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
      start_date
    `
    )
    .eq("status", "ongoing")
    .order("start_date", { ascending: true })
    .limit(1)
    .single();

  if (error) {
    console.error("Error fetching latest event:", error);
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
