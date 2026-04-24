import { useEffect, useState } from "react";
import Modal from "@/components/Modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NoteGlyph } from "@/components/ui/wireframe-wave";
import { supabase } from "@/lib/supabase";
import { Database } from "@/lib/database.types";
import { useToast } from "@/components/ui/use-toast";
import { Upload, X, Plus, AlertCircle } from "lucide-react";
import { Editor } from "@tinymce/tinymce-react";
import { cn } from "@/lib/utils";

type EventJury = Database["public"]["Tables"]["event_jury"]["Row"];

interface JuryModalProps {
  isOpen: boolean;
  onClose: () => void;
  juryMember?: EventJury;
  eventId?: string;
  onSuccess: () => void;
}

/**
 * JuryModal — admin create / edit for an event juror.
 *
 * Moved from shadcn Dialog to the editorial Modal for consistency with the
 * rest of the admin surface. Storage upload + signed URL (99y) + credentials
 * reducer all preserved 1:1. Only the chrome changes.
 */
export function JuryModal({
  isOpen,
  onClose,
  juryMember,
  eventId,
  onSuccess,
}: JuryModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    title: "",
    description: "",
    avatar_url: "",
    credentials: {} as Record<string, string>,
  });
  const [credentialFields, setCredentialFields] = useState<
    { key: string; value: string }[]
  >([{ key: "", value: "" }]);

  useEffect(() => {
    if (juryMember) {
      setFormData({
        name: juryMember.name,
        title: juryMember.title,
        description: juryMember.description || "",
        avatar_url: juryMember.avatar_url || "",
        credentials: (juryMember.credentials as Record<string, string>) || {},
      });
      if (juryMember.avatar_url) {
        setImagePreview(juryMember.avatar_url);
      } else {
        setImagePreview(null);
      }
      if (juryMember.credentials) {
        const entries = Object.entries(
          juryMember.credentials as Record<string, string>
        );
        setCredentialFields(
          entries.length > 0
            ? entries.map(([key, value]) => ({ key, value }))
            : [{ key: "", value: "" }]
        );
      } else {
        setCredentialFields([{ key: "", value: "" }]);
      }
    } else {
      setFormData({
        name: "",
        title: "",
        description: "",
        avatar_url: "",
        credentials: {},
      });
      setCredentialFields([{ key: "", value: "" }]);
      setImageFile(null);
      setImagePreview(null);
    }
    setError(null);
  }, [juryMember, isOpen]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const previewUrl = URL.createObjectURL(file);
      setImagePreview(previewUrl);
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setFormData({ ...formData, avatar_url: "" });
  };

  const uploadImage = async (file: File): Promise<string> => {
    const fileExt = file.name.split(".").pop();
    const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `jury-images/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("jury-images")
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data, error: urlError } = await supabase.storage
      .from("jury-images")
      .createSignedUrl(filePath, 99 * 365 * 24 * 60 * 60); // 99 years

    if (urlError) throw urlError;
    if (!data) throw new Error("Failed to generate signed URL");

    return data.signedUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      setLoading(true);

      let avatarUrl = formData.avatar_url;
      if (imageFile) {
        avatarUrl = await uploadImage(imageFile);
      }

      const credentials = credentialFields.reduce((acc, field) => {
        if (field.key && field.value) {
          acc[field.key] = field.value;
        }
        return acc;
      }, {} as Record<string, string>);

      const data = {
        ...formData,
        avatar_url: avatarUrl,
        credentials,
        event_id: eventId || juryMember?.event_id,
      };

      if (juryMember) {
        const { error: updateError } = await supabase
          .from("event_jury")
          .update(data)
          .eq("id", juryMember.id);
        if (updateError) throw updateError;
        toast({
          title: "Updated",
          description: "Jury member updated successfully.",
        });
      } else {
        const { error: insertError } = await supabase
          .from("event_jury")
          .insert([data]);
        if (insertError) throw insertError;
        toast({
          title: "Added",
          description: "Jury member added successfully.",
        });
      }

      onSuccess();
      onClose();
    } catch (err) {
      console.error("Error saving jury member:", err);
      setError(
        err instanceof Error ? err.message : "Failed to save jury member."
      );
      toast({
        title: "Error",
        description: "Failed to save jury member.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const addCredentialField = () => {
    setCredentialFields([...credentialFields, { key: "", value: "" }]);
  };

  const removeCredentialField = (index: number) => {
    const next = credentialFields.filter((_, i) => i !== index);
    setCredentialFields(next.length > 0 ? next : [{ key: "", value: "" }]);
  };

  const updateCredentialField = (
    index: number,
    field: "key" | "value",
    value: string
  ) => {
    const newFields = [...credentialFields];
    newFields[index][field] = value;
    setCredentialFields(newFields);
  };

  const handleEditorChange = (content: string) => {
    setFormData((prev) => ({ ...prev, description: content }));
  };

  const isEdit = !!juryMember;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? "Edit jury member" : "New jury member"}
      eyebrow={isEdit ? "Jury · Edit" : "Jury · New"}
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
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

        {/* Avatar + identity */}
        <div className="flex flex-col sm:flex-row gap-5 sm:items-start">
          <div className="flex flex-col gap-2 flex-shrink-0">
            <Label>Avatar</Label>
            {imagePreview ? (
              <div className="relative w-24 h-24">
                <img
                  src={imagePreview}
                  alt="Avatar preview"
                  className="w-24 h-24 object-cover border border-rule-hairline"
                />
                <button
                  type="button"
                  onClick={removeImage}
                  aria-label="Remove avatar"
                  className={cn(
                    "absolute -top-2 -right-2 h-7 w-7 flex items-center justify-center",
                    "bg-[color:var(--status-error)] text-white",
                    "hover:opacity-90 transition-opacity"
                  )}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="w-24 h-24 relative">
                <input
                  type="file"
                  id="avatar"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="sr-only"
                />
                <label
                  htmlFor="avatar"
                  className={cn(
                    "w-24 h-24 flex flex-col items-center justify-center gap-1",
                    "bg-surface-canvas-warm border border-dashed border-burgundy/25",
                    "cursor-pointer transition-colors duration-fast ease-out-quart",
                    "hover:border-marigold hover:bg-surface-canvas"
                  )}
                >
                  <Upload
                    className="w-5 h-5 text-ink-muted"
                    aria-hidden
                  />
                  <span className="type-caption text-ink-muted">Upload</span>
                </label>
              </div>
            )}
          </div>

          <div className="flex-1 grid grid-cols-1 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="jury-name">Name</Label>
              <Input
                id="jury-name"
                variant="boxed"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                required
                placeholder="e.g. Prof. Maria Tipo"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="jury-title">Title</Label>
              <Input
                id="jury-title"
                variant="boxed"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                required
                placeholder="e.g. Professor of Piano, Conservatorio Cherubini"
              />
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="flex flex-col gap-2">
          <Label>Biography</Label>
          <div className="border border-rule-hairline overflow-hidden">
            <Editor
              apiKey={import.meta.env.VITE_TINYMCE_API_KEY}
              value={formData.description}
              onEditorChange={handleEditorChange}
              init={{
                height: 320,
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
        </div>

        {/* Credentials */}
        <div className="flex flex-col gap-3">
          <div className="flex items-end justify-between gap-3 flex-wrap">
            <div className="flex flex-col gap-1">
              <Label className="mb-0">Credentials</Label>
              <p className="type-caption text-ink-muted">
                Key / value pairs, shown under the juror card.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            {credentialFields.map((field, index) => (
              <div
                key={index}
                className="flex items-center gap-2 bg-surface-canvas-warm border border-rule-hairline p-2"
              >
                <NoteGlyph
                  size={12}
                  className="text-marigold flex-shrink-0 ml-1"
                />
                <Input
                  variant="boxed"
                  placeholder="Label (e.g. Studied at)"
                  value={field.key}
                  onChange={(e) =>
                    updateCredentialField(index, "key", e.target.value)
                  }
                  className="flex-1"
                />
                <Input
                  variant="boxed"
                  placeholder="Value (e.g. Juilliard School)"
                  value={field.value}
                  onChange={(e) =>
                    updateCredentialField(index, "value", e.target.value)
                  }
                  className="flex-1"
                />
                <button
                  type="button"
                  onClick={() => removeCredentialField(index)}
                  aria-label="Remove credential"
                  disabled={credentialFields.length === 1 && !field.key && !field.value}
                  className={cn(
                    "h-9 w-9 flex items-center justify-center rounded-sm flex-shrink-0",
                    "text-ink-muted hover:text-[color:var(--status-error)]",
                    "hover:bg-[color:var(--status-error-bg)] transition-colors",
                    "disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-ink-muted"
                  )}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addCredentialField}
            className="self-start"
          >
            <Plus className="h-3.5 w-3.5" />
            Add credential
          </Button>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2 border-t border-rule-hairline">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? "Saving…" : isEdit ? "Save changes" : "Add jury member"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
