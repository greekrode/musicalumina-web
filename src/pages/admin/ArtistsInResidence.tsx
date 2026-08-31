import { useEffect, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { ArtistInResidenceModal } from "@/components/admin/ArtistInResidenceModal";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/lib/database.types";
import { cn } from "@/lib/utils";

type Artist = Database["public"]["Tables"]["artists_in_residence"]["Row"];

export default function AdminArtistsInResidence() {
  const [artists, setArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingArtist, setEditingArtist] = useState<Artist | undefined>();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchArtists = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("artists_in_residence")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) console.error("Error fetching artists in residence:", error);
    else setArtists(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchArtists();
  }, []);

  const deleteArtist = async (artist: Artist) => {
    if (!window.confirm(`Delete ${artist.name}?`)) return;
    const { error } = await supabase
      .from("artists_in_residence")
      .delete()
      .eq("id", artist.id);
    if (error) {
      console.error("Error deleting artist in residence:", error);
      return;
    }
    fetchArtists();
  };

  return (
    <AdminLayout>
      <div className="flex flex-col gap-8">
        <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div className="flex flex-col gap-2">
            <Eyebrow withRule>Manage · Artists in Residence</Eyebrow>
            <h1 className="type-display-md text-burgundy">Artists in Residence</h1>
            <p className="type-body-sm text-ink-muted">Independent artist profiles for the public Artists in Residence page. They are not attached to an event or jury.</p>
          </div>
          <Button onClick={() => { setEditingArtist(undefined); setIsModalOpen(true); }}>
            <Plus className="h-4 w-4" /> Add artist
          </Button>
        </header>

        <section className="bg-surface-elevated border border-rule-hairline overflow-hidden">
          <p className="px-5 pt-3 type-caption text-ink-muted sm:hidden">
            Swipe horizontally to reach all actions.
          </p>
          <div className="overflow-x-auto overscroll-x-contain pb-2">
          <table className="min-w-[40rem] w-full">
            <thead className="bg-surface-canvas-warm border-b border-rule-hairline">
              <tr><Th>Artist</Th><Th>Title</Th><Th className="text-right">Actions</Th></tr>
            </thead>
            <tbody className="divide-y divide-rule-hairline">
              {loading ? <MessageRow>Loading artists…</MessageRow> : artists.length === 0 ? <MessageRow>No artist profiles yet. Add the first one above.</MessageRow> : artists.map((artist) => (
                <tr key={artist.id} className="hover:bg-surface-canvas-warm/40 transition-colors">
                  <td className="px-5 py-3"><div className="flex items-center gap-3"><div className="h-10 w-10 overflow-hidden bg-surface-canvas-warm border border-rule-hairline">{artist.avatar_url && <img src={artist.avatar_url} alt="" className="h-full w-full object-cover" />}</div><span className="type-body-sm text-burgundy font-medium">{artist.name}</span></div></td>
                  <td className="px-5 py-3 type-body-sm text-ink-body">{artist.title}</td>
                  <td className="px-5 py-3 text-right"><div className="inline-flex gap-1"><IconButton label="Edit" onClick={() => { setEditingArtist(artist); setIsModalOpen(true); }}><Pencil className="h-3.5 w-3.5" /></IconButton><IconButton label="Delete" destructive onClick={() => deleteArtist(artist)}><Trash2 className="h-3.5 w-3.5" /></IconButton></div></td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </section>
      </div>
      <ArtistInResidenceModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} artist={editingArtist} onSuccess={fetchArtists} />
    </AdminLayout>
  );
}

function Th({ children, className }: { children: React.ReactNode; className?: string }) { return <th className={cn("px-5 py-3 text-left type-label text-ink-muted", className)}>{children}</th>; }
function MessageRow({ children }: { children: React.ReactNode }) { return <tr><td colSpan={3} className="px-5 py-10 text-center type-body-sm text-ink-muted">{children}</td></tr>; }
function IconButton({ children, label, destructive, onClick }: { children: React.ReactNode; label: string; destructive?: boolean; onClick: () => void }) { return <button type="button" aria-label={label} onClick={onClick} className={cn("h-8 w-8 inline-flex items-center justify-center text-ink-muted hover:text-burgundy hover:bg-surface-canvas-warm transition-colors", destructive && "hover:text-[color:var(--status-error)] hover:bg-[color:var(--status-error-bg)]")}>{children}</button>; }
