import { useEffect, useState } from "react";
import { AlertCircle, Plus, Upload, X } from "lucide-react";
import { Editor } from "@tinymce/tinymce-react";
import Modal from "@/components/Modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NoteGlyph } from "@/components/ui/wireframe-wave";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/lib/database.types";
import { cn } from "@/lib/utils";

type Artist = Database["public"]["Tables"]["artists_in_residence"]["Row"];

interface ArtistInResidenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  artist?: Artist;
  onSuccess: () => void;
}

export function ArtistInResidenceModal({ isOpen, onClose, artist, onSuccess }: ArtistInResidenceModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: "", title: "", description: "", avatar_url: "" });
  const [credentialFields, setCredentialFields] = useState<{ key: string; value: string }[]>([{ key: "", value: "" }]);

  useEffect(() => {
    setFormData({ name: artist?.name || "", title: artist?.title || "", description: artist?.description || "", avatar_url: artist?.avatar_url || "" });
    setImagePreview(artist?.avatar_url || null);
    setImageFile(null);
    const entries = artist?.credentials ? Object.entries(artist.credentials as Record<string, string>) : [];
    setCredentialFields(entries.length > 0 ? entries.map(([key, value]) => ({ key, value: String(value) })) : [{ key: "", value: "" }]);
    setError(null);
  }, [artist, isOpen]);

  const uploadImage = async (file: File) => {
    const extension = file.name.split(".").pop() || "jpg";
    const path = `artist-images/${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await supabase.storage.from("jury-images").upload(path, file);
    if (uploadError) throw uploadError;
    const { data, error: urlError } = await supabase.storage.from("jury-images").createSignedUrl(path, 99 * 365 * 24 * 60 * 60);
    if (urlError) throw urlError;
    if (!data) throw new Error("Unable to create the artist image URL.");
    return data.signedUrl;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const avatarUrl = imageFile ? await uploadImage(imageFile) : formData.avatar_url || null;
      const credentials = credentialFields.reduce<Record<string, string>>((result, field) => {
        if (field.key.trim() && field.value.trim()) result[field.key.trim()] = field.value.trim();
        return result;
      }, {});
      const payload = { name: formData.name.trim(), title: formData.title.trim(), description: formData.description || null, avatar_url: avatarUrl, credentials, updated_at: new Date().toISOString() };
      const result = artist
        ? await supabase.from("artists_in_residence").update(payload).eq("id", artist.id)
        : await supabase.from("artists_in_residence").insert(payload);
      if (result.error) throw result.error;
      toast({ title: artist ? "Updated" : "Added", description: artist ? "Artist profile updated successfully." : "Artist in residence added successfully." });
      onSuccess();
      onClose();
    } catch (saveError) {
      console.error("Error saving artist in residence:", saveError);
      const message = saveError instanceof Error ? saveError.message : "Failed to save artist in residence.";
      setError(message);
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const updateCredential = (index: number, field: "key" | "value", value: string) => {
    setCredentialFields((current) => current.map((credential, currentIndex) => currentIndex === index ? { ...credential, [field]: value } : credential));
  };
  const isEdit = Boolean(artist);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEdit ? "Edit artist in residence" : "New artist in residence"} eyebrow={isEdit ? "Artists in Residence · Edit" : "Artists in Residence · New"} maxWidth="2xl">
      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        {error && <div className="flex items-start gap-3 border-l-2 border-[color:var(--status-error)] bg-[color:var(--status-error-bg)] px-4 py-3"><AlertCircle className="h-4 w-4 mt-0.5 text-[color:var(--status-error)]" /><p className="type-body-sm text-[color:var(--status-error)]">{error}</p></div>}
        <div className="flex flex-col sm:flex-row gap-5 sm:items-start">
          <div className="flex flex-col gap-2 flex-shrink-0"><Label>Avatar</Label>
            {imagePreview ? <div className="relative h-24 w-24"><img src={imagePreview} alt="Artist preview" className="h-24 w-24 object-cover border border-rule-hairline" /><button type="button" aria-label="Remove artist avatar" onClick={() => { setImageFile(null); setImagePreview(null); setFormData((current) => ({ ...current, avatar_url: "" })); }} className="absolute -top-2 -right-2 h-7 w-7 flex items-center justify-center bg-[color:var(--status-error)] text-white hover:opacity-90"><X className="h-3.5 w-3.5" /></button></div> : <label htmlFor="artist-avatar" className="h-24 w-24 flex flex-col items-center justify-center gap-1 bg-surface-canvas-warm border border-dashed border-burgundy/25 cursor-pointer hover:border-marigold hover:bg-surface-canvas transition-colors"><Upload className="h-5 w-5 text-ink-muted" /><span className="type-caption text-ink-muted">Upload</span><input id="artist-avatar" type="file" accept="image/*" className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; if (!file) return; setImageFile(file); setImagePreview(URL.createObjectURL(file)); }} /></label>}
          </div>
          <div className="flex-1 grid grid-cols-1 gap-4"><div className="flex flex-col gap-2"><Label htmlFor="artist-name">Name</Label><Input id="artist-name" variant="boxed" required value={formData.name} onChange={(event) => setFormData((current) => ({ ...current, name: event.target.value }))} placeholder="e.g. Prof. Maria Tipo" /></div><div className="flex flex-col gap-2"><Label htmlFor="artist-title">Title</Label><Input id="artist-title" variant="boxed" required value={formData.title} onChange={(event) => setFormData((current) => ({ ...current, title: event.target.value }))} placeholder="e.g. Piano Artist in Residence" /></div></div>
        </div>
        <div className="flex flex-col gap-2"><Label>Biography</Label><div className="border border-rule-hairline overflow-hidden"><Editor apiKey={import.meta.env.VITE_TINYMCE_API_KEY} value={formData.description} onEditorChange={(description: string) => setFormData((current) => ({ ...current, description }))} init={{ height: 320, menubar: false, plugins: ["advlist", "autolink", "lists", "link", "searchreplace", "visualblocks", "code", "fullscreen", "table", "help", "wordcount"], toolbar: "undo redo | blocks | bold italic forecolor | alignleft aligncenter alignright | bullist numlist | removeformat | help", content_style: "body { font-family: 'Manrope', sans-serif; font-size: 14px; color: #2B2B2B }" }} /></div></div>
        <div className="flex flex-col gap-3"><div><Label>Credentials</Label><p className="type-caption text-ink-muted mt-1">Key / value pairs shown under the artist card.</p></div>{credentialFields.map((field, index) => <div key={index} className="flex items-center gap-2 bg-surface-canvas-warm border border-rule-hairline p-2"><NoteGlyph size={12} className="text-marigold flex-shrink-0 ml-1" /><Input variant="boxed" className="flex-1" placeholder="Label" value={field.key} onChange={(event) => updateCredential(index, "key", event.target.value)} /><Input variant="boxed" className="flex-1" placeholder="Value" value={field.value} onChange={(event) => updateCredential(index, "value", event.target.value)} /><button type="button" aria-label="Remove credential" disabled={credentialFields.length === 1 && !field.key && !field.value} onClick={() => setCredentialFields((current) => current.length === 1 ? [{ key: "", value: "" }] : current.filter((_, currentIndex) => currentIndex !== index))} className={cn("h-9 w-9 flex items-center justify-center text-ink-muted hover:text-[color:var(--status-error)] hover:bg-[color:var(--status-error-bg)] disabled:opacity-30 disabled:hover:bg-transparent")}><X className="h-4 w-4" /></button></div>)}<Button type="button" variant="outline" size="sm" className="self-start" onClick={() => setCredentialFields((current) => [...current, { key: "", value: "" }])}><Plus className="h-3.5 w-3.5" /> Add credential</Button></div>
        <div className="flex justify-end gap-3 pt-2 border-t border-rule-hairline"><Button type="button" variant="outline" onClick={onClose} disabled={loading}>Cancel</Button><Button type="submit" disabled={loading}>{loading ? "Saving…" : isEdit ? "Save changes" : "Add artist"}</Button></div>
      </form>
    </Modal>
  );
}
