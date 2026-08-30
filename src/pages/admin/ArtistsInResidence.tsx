import { useEffect, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { JuryModal } from "@/components/admin/JuryModal";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/lib/database.types";
import { cn } from "@/lib/utils";

type Artist = Database["public"]["Tables"]["event_jury"]["Row"] & {
  events?: { title: string } | null;
};
type EventOption = Pick<Database["public"]["Tables"]["events"]["Row"], "id" | "title">;

export default function AdminArtistsInResidence() {
  const [artists, setArtists] = useState<Artist[]>([]);
  const [events, setEvents] = useState<EventOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingArtist, setEditingArtist] = useState<Artist | undefined>();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [artistsResult, eventsResult] = await Promise.all([
        supabase.from("event_jury").select("*, events(title)").eq("role", "artist_in_residence").order("created_at", { ascending: false }),
        supabase.from("events").select("id, title").order("start_date", { ascending: false }),
      ]);
      if (artistsResult.error) throw artistsResult.error;
      if (eventsResult.error) throw eventsResult.error;
      setArtists((artistsResult.data as Artist[]) || []);
      setEvents(eventsResult.data || []);
    } catch (error) {
      console.error("Error fetching artists in residence:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const deleteArtist = async (artist: Artist) => {
    if (!window.confirm(`Delete ${artist.name}?`)) return;
    const { error } = await supabase.from("event_jury").delete().eq("id", artist.id);
    if (error) {
      console.error("Error deleting artist:", error);
      return;
    }
    fetchData();
  };

  return (
    <AdminLayout>
      <div className="flex flex-col gap-8">
        <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div className="flex flex-col gap-2">
            <Eyebrow withRule>Manage · Artists in Residence</Eyebrow>
            <h1 className="type-display-md text-burgundy">Artists in Residence</h1>
            <p className="type-body-sm text-ink-muted">Create and maintain the artist profiles shown on the public Artists in Residence page.</p>
          </div>
          <Button onClick={() => { setEditingArtist(undefined); setIsModalOpen(true); }}>
            <Plus className="h-4 w-4" /> Add artist
          </Button>
        </header>

        <div className="bg-surface-elevated border border-rule-hairline overflow-hidden">
          <table className="min-w-full">
            <thead className="bg-surface-canvas-warm border-b border-rule-hairline">
              <tr><Th>Artist</Th><Th>Title</Th><Th>Associated event</Th><Th className="text-right">Actions</Th></tr>
            </thead>
            <tbody className="divide-y divide-rule-hairline">
              {loading ? <MessageRow>Loading artists…</MessageRow> : artists.length === 0 ? <MessageRow>No artist profiles yet. Add the first one above.</MessageRow> : artists.map((artist) => (
                <tr key={artist.id} className="hover:bg-surface-canvas-warm/40 transition-colors">
                  <td className="px-5 py-3"><div className="flex items-center gap-3"><div className="h-10 w-10 overflow-hidden bg-surface-canvas-warm border border-rule-hairline">{artist.avatar_url && <img src={artist.avatar_url} alt="" className="h-full w-full object-cover" />}</div><span className="type-body-sm text-burgundy font-medium">{artist.name}</span></div></td>
                  <td className="px-5 py-3 type-body-sm text-ink-body">{artist.title}</td>
                  <td className="px-5 py-3 type-body-sm text-ink-muted">{artist.events?.title || "—"}</td>
                  <td className="px-5 py-3 text-right"><div className="inline-flex gap-1"><IconButton label="Edit" onClick={() => { setEditingArtist(artist); setIsModalOpen(true); }}><Pencil className="h-3.5 w-3.5" /></IconButton><IconButton label="Delete" destructive onClick={() => deleteArtist(artist)}><Trash2 className="h-3.5 w-3.5" /></IconButton></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <JuryModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} juryMember={editingArtist} eventOptions={events} forceRole="artist_in_residence" onSuccess={() => { setIsModalOpen(false); fetchData(); }} />
    </AdminLayout>
  );
}

function Th({ children, className }: { children: React.ReactNode; className?: string }) { return <th className={cn("px-5 py-3 text-left type-label text-ink-muted", className)}>{children}</th>; }
function MessageRow({ children }: { children: React.ReactNode }) { return <tr><td colSpan={4} className="px-5 py-10 text-center type-body-sm text-ink-muted">{children}</td></tr>; }
function IconButton({ children, label, destructive, onClick }: { children: React.ReactNode; label: string; destructive?: boolean; onClick: () => void }) { return <button type="button" aria-label={label} onClick={onClick} className={cn("h-8 w-8 inline-flex items-center justify-center text-ink-muted hover:text-burgundy hover:bg-surface-canvas-warm transition-colors", destructive && "hover:text-[color:var(--status-error)] hover:bg-[color:var(--status-error-bg)]")}>{children}</button>; }
