import { createClient, FunctionsHttpError } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import { attachScheduleEntries } from "./festivalSchedule";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables");
}

declare global {
  interface Window {
    Clerk?: { session?: { getToken(): Promise<string | null> } | null };
  }
}

// Signed-in staff send their Clerk session token (Supabase third-party auth);
// RLS checks its publicMetadata role via public.is_admin(). Visitors send none
// and fall back to the anon key.
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  accessToken: async () => (await window.Clerk?.session?.getToken()) ?? null,
});

// Edge functions are public endpoints called with the anon key. Kept on a
// separate client so a signed-in admin's Clerk token is never sent to them
// (the functions gateway validates Supabase-issued JWTs only).
export const edgeFunctions = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
}).functions;

/**
 * Confirmation email + Lark mirror for a registration this visitor just
 * created. The server builds both from the stored registration; the browser
 * only proves it is a person (Turnstile) and picks the email language.
 * Failure is logged, not thrown: the registration itself is already saved.
 */
export async function notifyRegistration(
  registrationId: string,
  language: string,
  turnstileToken: string | null
): Promise<void> {
  const { error } = await edgeFunctions.invoke("registration-notify", {
    body: { registrationId, language, turnstileToken },
  });
  if (error) console.error("registration-notify failed:", error);
}

/** Long-lived signed URL for a file this visitor just uploaded. */
export async function signRegistrationUpload(path: string): Promise<string> {
  const { data, error } = await edgeFunctions.invoke<{ signedUrl?: string }>(
    "registration-upload-url",
    { body: { path } }
  );
  if (error || !data?.signedUrl) {
    console.error("Signed URL error:", error);
    throw new Error("Failed to generate signed URL for uploaded file");
  }
  return data.signedUrl;
}

/**
 * Admin-only remarks-sheets function. Called with the anon key like the other
 * functions (the gateway accepts Supabase JWTs only); the admin's Clerk token
 * rides in x-clerk-token and the function checks it with public.is_admin().
 */
export async function invokeRemarksSheets<T>(body: Record<string, unknown>): Promise<T> {
  const token = await window.Clerk?.session?.getToken();
  if (!token) throw new Error("Please sign in again.");
  const { data, error } = await edgeFunctions.invoke<T>("remarks-sheets", {
    body,
    headers: { "x-clerk-token": token },
  });
  if (error) {
    // The function answers { error } with a 4xx; show that message, not the generic one.
    const detail: { error?: string } | null =
      error instanceof FunctionsHttpError ? await error.context.json().catch(() => null) : null;
    throw new Error(detail?.error ?? error.message);
  }
  return data as T;
}

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
          participant_count,
          event_subcategories (
            id,
            name,
            age_requirement,
            registration_fee,
            final_registration_fee,
            early_bird_registration_fee,
            foreign_registration_fee,
            foreign_final_registration_fee,
            early_bird_foreign_registration_fee,
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
          role
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
          participant_count,
          event_subcategories (
            id,
            name,
            age_requirement,
            registration_fee,
            final_registration_fee,
            early_bird_registration_fee,
            foreign_registration_fee,
            foreign_final_registration_fee,
            early_bird_foreign_registration_fee,
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
          role,
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
    // Registrations are staff-only under RLS; the count comes from a definer RPC.
    const { data: registrationCount, error: countError } = await supabase.rpc(
      "event_registration_count",
      { p_event_id: id }
    );

    if (countError) {
      console.error("Error fetching registration count:", countError);
    }

    const { data: scheduleSegments, error: scheduleError } = await supabase
      .from("festival_schedule_segments")
      .select(
        "id, kind, label, session_number, subcategory_id, starts_at, ends_at, sort_order",
      )
      .eq("event_id", id)
      .order("sort_order");

    if (scheduleError) {
      throw scheduleError;
    }

    const segmentIds = (scheduleSegments ?? []).map((segment) => segment.id);
    const { data: scheduleEntries, error: entriesError } = segmentIds.length
      ? await supabase
          .from("festival_schedule_entries")
          .select("id, segment_id, order_index, display_name")
          .in("segment_id", segmentIds)
          .order("order_index")
      : { data: [], error: null };

    if (entriesError) {
      throw entriesError;
    }

    // Add registration count and the published running order.
    // Entries expose display names only — registration PII stays on the
    // staff-only registrations table.
    const eventWithCount = {
      ...event,
      registration_count: registrationCount || 0,
      festival_schedule: attachScheduleEntries(
        scheduleSegments ?? [],
        scheduleEntries ?? [],
      ),
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
      const [{ data: winners, error: winnersError }, detailsResult] =
        await Promise.all([
          supabase
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
            order_index,
            repertoire
          ),
          event_subcategories!inner (
            id,
            name,
            order_index,
            repertoire
          )
        `
            )
            .eq("event_id", id),
          supabase.rpc("get_event_winner_details", { p_event_id: id }),
        ]);

      // Score/song are enhancements: if the lookup fails, still list winners.
      // The generated Database type has no Functions section, so type the rpc rows here.
      type WinnerDetails = {
        winner_id: string;
        score: number | null;
        song_title: string | null;
      };
      const detailsById = new Map(
        ((detailsResult.data ?? []) as WinnerDetails[]).map((d) => [
          d.winner_id,
          d,
        ])
      );

      if (winnersError) {
        throw winnersError;
      }

      type WinnerEntry = {
        participant_name: string;
        prize_title: string;
        song_title: string | null;
        score: number;
      };
      type CategoryData = {
        order: number;
        subcategories: Record<
          string,
          { order: number; winners: WinnerEntry[] }
        >;
      };

      const hasRepertoire = (value: unknown) =>
        Array.isArray(value) && value.length > 0;
      const PRIZE_RANK: Record<string, number> = {
        "high scorer": 0,
        gold: 1,
        silver: 2,
        bronze: 3,
      };
      const prizeRank = (title: string) =>
        PRIZE_RANK[title.trim().toLowerCase()] ?? 99;

      const groupedWinners = winners.reduce(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase nested-join response type; proper typing would require a dedicated winners-view type
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

          // Only categories without a mandatory repertoire list show the song.
          const isFreeRepertoire =
            !hasRepertoire(categoryData?.repertoire) &&
            !hasRepertoire(subcategoryData?.repertoire);
          const details = detailsById.get(winner.id);

          acc[category].subcategories[subcategory].winners.push({
            participant_name: winner.participant_name,
            prize_title: winner.prize_title,
            song_title: isFreeRepertoire ? (details?.song_title ?? null) : null,
            score: details?.score ?? -1,
          });

          return acc;
        },
        {}
      );

      // Sort categories/subcategories by order_index; winners by prize tier,
      // then score descending, then name for a stable order.
      const sortedWinners: Record<
        string,
        Record<
          string,
          Array<{
            participant_name: string;
            prize_title: string;
            song_title: string | null;
          }>
        >
      > = {};
      Object.entries(groupedWinners)
        .sort(([, a], [, b]) => a.order - b.order)
        .forEach(([category, categoryData]) => {
          sortedWinners[category] = {};
          Object.entries(categoryData.subcategories)
            .sort(([, a], [, b]) => a.order - b.order)
            .forEach(([subcategory, subcategoryData]) => {
              sortedWinners[category][subcategory] = subcategoryData.winners
                .sort(
                  (a, b) =>
                    prizeRank(a.prize_title) - prizeRank(b.prize_title) ||
                    b.score - a.score ||
                    a.participant_name.localeCompare(b.participant_name)
                )
                .map(({ participant_name, prize_title, song_title }) => ({
                  participant_name,
                  prize_title,
                  song_title,
                }));
            });
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

export async function getArtistsInResidence() {
  try {
    const { data, error } = await supabase
      .from("artists_in_residence")
      .select(
        `
        id,
        name,
        title,
        description,
        avatar_url,
        credentials,
        created_at
      `
      )
      .order("created_at", { ascending: false });

    if (error) throw error;

    return { artists: data || [] };
  } catch (error) {
    console.error("Error fetching artists in residence:", error);
    throw error;
  }
}
