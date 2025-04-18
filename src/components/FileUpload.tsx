import { useState, useRef } from "react";
import { Upload, X, FileText, Image as ImageIcon } from "lucide-react";
import type { UseFormRegisterReturn } from "react-hook-form";

interface FileUploadProps {
  label: string;
  accept: string;
  registration: Omit<UseFormRegisterReturn, "ref">;
  error?: string;
  optional?: boolean;
  onFileChange: (file: File | null) => void;
}

function FileUpload({
  label,
  accept,
  registration,
  error,
  optional = false,
  onFileChange,
}: FileUploadProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setPreview(null);
      setFileName(null);
      onFileChange(null);
      return;
    }

    // Check file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      if (inputRef.current) {
        inputRef.current.value = "";
      }
      setPreview(null);
      setFileName(null);
      onFileChange(null);
      return;
    }

    setFileName(file.name);

    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setPreview(null);
    }

    onFileChange(file);
  };

  const handleRemove = () => {
    if (inputRef.current) {
      inputRef.current.value = "";
    }
    setPreview(null);
    setFileName(null);
    onFileChange(null);
  };

  const getFileTypeMessage = () => {
    const types = [];
    if (accept.includes(".pdf")) types.push("PDF");
    if (accept.includes(".jpg") || accept.includes(".jpeg")) types.push("JPG");
    if (accept.includes(".png")) types.push("PNG");

    if (types.length === 1) {
      return `${types[0]} file up to 5MB`;
    } else if (types.length > 1) {
      const lastType = types.pop();
      return `${types.join(", ")} or ${lastType} file up to 5MB`;
    }
    return "File up to 5MB";
  };

  const getFileIcon = () => {
    if (preview) {
      return (
        <img
          src={preview}
          alt="Preview"
          className="h-16 w-16 object-cover rounded"
        />
      );
    }
    if (fileName?.toLowerCase().endsWith(".pdf")) {
      return <FileText className="h-16 w-16 text-gray-400" />;
    }
    if (accept.includes("image")) {
      return <ImageIcon className="h-16 w-16 text-gray-400" />;
    }
    return <FileText className="h-16 w-16 text-gray-400" />;
  };

  const handleCombinedChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileChange(e);
    if (registration.onChange) {
      await registration.onChange(e);
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700">
        {label}
        {optional && <span className="text-gray-500 ml-1">(Optional)</span>}
      </label>

      <div className="mt-1">
        <input
          type="file"
          className="hidden"
          accept={accept}
          ref={inputRef}
          {...registration}
          onChange={handleCombinedChange}
        />

        {!fileName ? (
          <div
            onClick={() => inputRef.current?.click()}
            className="flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md hover:border-[#CFB53B]/50 transition-colors cursor-pointer"
          >
            <div className="space-y-1 text-center w-full">
              <Upload className="mx-auto h-12 w-12 text-gray-400" />
              <div className="flex justify-center text-sm text-gray-600">
                <span className="text-[#CFB53B] hover:text-[#CFB53B]/90">
                  Upload a file
                </span>
              </div>
              <p className="text-xs text-gray-500">{getFileTypeMessage()}</p>
            </div>
          </div>
        ) : (
          <div className="flex items-center p-4 border border-gray-300 rounded-md bg-gray-50">
            <div className="flex-shrink-0">{getFileIcon()}</div>
            <div className="ml-4 flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {fileName}
              </p>
              <p className="text-sm text-gray-500">
                {preview
                  ? "Image file"
                  : fileName.toLowerCase().endsWith(".pdf")
                  ? "PDF file"
                  : "File"}
              </p>
            </div>
            <button
              type="button"
              onClick={handleRemove}
              className="ml-4 bg-white rounded-md p-2 hover:bg-gray-100"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>
        )}

        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </div>
    </div>
  );
}

export default FileUpload;
