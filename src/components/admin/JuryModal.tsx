import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";
import { Database } from "@/lib/database.types";
import { useToast } from "@/components/ui/use-toast";
import { Upload, X } from "lucide-react";
import { Editor } from "@tinymce/tinymce-react";

type EventJury = Database["public"]["Tables"]["event_jury"]["Row"];

interface JuryModalProps {
  isOpen: boolean;
  onClose: () => void;
  juryMember?: EventJury;
  eventId?: string;
  onSuccess: () => void;
}

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
      // Set image preview if avatar_url exists
      if (juryMember.avatar_url) {
        setImagePreview(juryMember.avatar_url);
      }
      // Convert credentials object to array of key-value pairs
      if (juryMember.credentials) {
        setCredentialFields(
          Object.entries(juryMember.credentials as Record<string, string>).map(
            ([key, value]) => ({
              key,
              value,
            })
          )
        );
      }
    } else {
      // Reset form for new jury member
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
  }, [juryMember]);

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

    // Upload the file to Supabase storage
    const { error: uploadError } = await supabase.storage
      .from("jury-images")
      .upload(filePath, file);

    if (uploadError) {
      throw uploadError;
    }

    // Generate a public URL that expires in 99 years
    const { data, error: urlError } = await supabase.storage
      .from("jury-images")
      .createSignedUrl(filePath, 99 * 365 * 24 * 60 * 60); // 99 years in seconds

    if (urlError) {
      throw urlError;
    }

    if (!data) {
      throw new Error("Failed to generate signed URL");
    }

    return data.signedUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);

      let avatarUrl = formData.avatar_url;
      if (imageFile) {
        avatarUrl = await uploadImage(imageFile);
      }

      // Convert credential fields to object
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
        // Update existing jury member
        const { error } = await supabase
          .from("event_jury")
          .update(data)
          .eq("id", juryMember.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Jury member updated successfully",
        });
      } else {
        // Create new jury member
        const { error } = await supabase.from("event_jury").insert([data]);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Jury member added successfully",
        });
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error("Error saving jury member:", error);
      toast({
        title: "Error",
        description: "Failed to save jury member",
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
    setCredentialFields(credentialFields.filter((_, i) => i !== index));
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>
            {juryMember ? "Edit Jury Member" : "Add Jury Member"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Editor
              apiKey={import.meta.env.VITE_TINYMCE_API_KEY}
              value={formData.description}
              onEditorChange={handleEditorChange}
              init={{
                height: 300,
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
          <div className="space-y-2">
            <Label>Avatar Image</Label>
            <div className="flex items-center gap-4">
              {imagePreview ? (
                <div className="relative">
                  <img
                    src={imagePreview}
                    alt="Avatar preview"
                    className="w-24 h-24 rounded-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={removeImage}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <input
                    type="file"
                    id="avatar"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                  <label
                    htmlFor="avatar"
                    className="flex flex-col items-center justify-center w-24 h-24 border-2 border-dashed rounded-full cursor-pointer hover:border-primary"
                  >
                    <Upload className="w-6 h-6 text-gray-400" />
                    <span className="text-xs text-gray-500 mt-1">Upload</span>
                  </label>
                </div>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Credentials</Label>
            {credentialFields.map((field, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  placeholder="Title"
                  value={field.key}
                  onChange={(e) =>
                    updateCredentialField(index, "key", e.target.value)
                  }
                />
                <Input
                  placeholder="Value"
                  value={field.value}
                  onChange={(e) =>
                    updateCredentialField(index, "value", e.target.value)
                  }
                />
                {credentialFields.length > 1 && (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => removeCredentialField(index)}
                  >
                    Remove
                  </Button>
                )}
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              onClick={addCredentialField}
            >
              Add Credential
            </Button>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Save"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
