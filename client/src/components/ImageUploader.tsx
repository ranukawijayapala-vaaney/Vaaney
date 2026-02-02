import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Upload, X, Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface UploadedImage {
  url: string;
  objectPath: string;
}

interface ImageUploaderProps {
  images: string[];
  onImagesChange: (images: string[]) => void;
  maxImages?: number;
  maxFileSize?: number;
  className?: string;
  disabled?: boolean;
}

export function ImageUploader({
  images,
  onImagesChange,
  maxImages = 10,
  maxFileSize = 10 * 1024 * 1024,
  className = "",
  disabled = false,
}: ImageUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const remainingSlots = maxImages - images.length;
    if (remainingSlots <= 0) {
      toast({
        title: "Maximum images reached",
        description: `You can only upload up to ${maxImages} images`,
        variant: "destructive",
      });
      return;
    }

    const filesToUpload = Array.from(files).slice(0, remainingSlots);
    const invalidFiles = filesToUpload.filter(
      (file) => !file.type.startsWith("image/") || file.size > maxFileSize
    );

    if (invalidFiles.length > 0) {
      toast({
        title: "Invalid files",
        description: `Some files were skipped. Only images under ${Math.round(maxFileSize / 1024 / 1024)}MB are allowed.`,
        variant: "destructive",
      });
    }

    const validFiles = filesToUpload.filter(
      (file) => file.type.startsWith("image/") && file.size <= maxFileSize
    );

    if (validFiles.length === 0) return;

    setIsUploading(true);
    const newImages: string[] = [];

    try {
      for (let i = 0; i < validFiles.length; i++) {
        const file = validFiles[i];
        setUploadProgress(`Uploading ${i + 1} of ${validFiles.length}...`);

        const result = await apiRequest(
          "POST",
          "/api/object-storage/upload-url",
          { fileName: file.name, contentType: file.type }
        ) as { uploadUrl: string; objectPath: string };
        const { uploadUrl, objectPath } = result;

        const uploadResponse = await fetch(uploadUrl, {
          method: "PUT",
          body: file,
          headers: { "Content-Type": file.type },
        });

        if (!uploadResponse.ok) {
          throw new Error(`Failed to upload ${file.name}`);
        }

        await apiRequest("POST", "/api/object-storage/finalize-upload", {
          objectPath,
          visibility: "public",
        });

        const normalizedPath = objectPath.startsWith("/")
          ? `/objects${objectPath.split(".private")[1] || objectPath}`
          : objectPath;
        
        newImages.push(normalizedPath);
      }

      onImagesChange([...images, ...newImages]);
      toast({
        title: "Upload complete",
        description: `Successfully uploaded ${newImages.length} image${newImages.length > 1 ? "s" : ""}`,
      });
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "An error occurred during upload",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      setUploadProgress("");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const removeImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    onImagesChange(newImages);
  };

  const getImageUrl = (imagePath: string) => {
    if (imagePath.startsWith("http")) return imagePath;
    if (imagePath.startsWith("/objects/")) return imagePath;
    return imagePath;
  };

  return (
    <div className={className}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled || isUploading}
        data-testid="input-image-upload"
      />

      {images.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-3">
          {images.map((image, index) => (
            <div
              key={index}
              className="relative aspect-square rounded-md overflow-visible bg-muted"
              data-testid={`image-preview-${index}`}
            >
              <img
                src={getImageUrl(image)}
                alt={`Uploaded ${index + 1}`}
                className="w-full h-full object-cover rounded-md"
              />
              {!disabled && (
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                  onClick={() => removeImage(index)}
                  data-testid={`button-remove-image-${index}`}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {images.length < maxImages && (
        <Button
          type="button"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || isUploading}
          className="w-full"
          data-testid="button-upload-images"
        >
          {isUploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {uploadProgress || "Uploading..."}
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              Add Images ({images.length}/{maxImages})
            </>
          )}
        </Button>
      )}

      {images.length >= maxImages && (
        <p className="text-sm text-muted-foreground text-center">
          Maximum of {maxImages} images reached
        </p>
      )}
    </div>
  );
}
