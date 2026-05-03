import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Upload, X } from "lucide-react";
import { uploadFile } from "@/lib/uploadHelpers";

interface MultiImageUploaderProps {
  maxImages?: number;
  maxFileSize?: number;
  onImagesChange: (urls: string[]) => void;
  initialImages?: string[];
}

export function MultiImageUploader({
  maxImages = 10,
  maxFileSize = 5242880, // 5MB default
  onImagesChange,
  initialImages = [],
}: MultiImageUploaderProps) {
  const [imageUrls, setImageUrls] = useState<string[]>(initialImages);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const remainingSlots = maxImages - imageUrls.length;
    if (files.length > remainingSlots) {
      toast({
        title: "Too many images",
        description: `You can only upload ${remainingSlots} more image${remainingSlots !== 1 ? 's' : ''}`,
        variant: "destructive",
      });
      return;
    }

    const validFiles: File[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.size > maxFileSize) {
        toast({
          title: "File too large",
          description: `${file.name} exceeds ${Math.round(maxFileSize / 1024 / 1024)}MB limit`,
          variant: "destructive",
        });
        continue;
      }
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid file type",
          description: `${file.name} is not an image`,
          variant: "destructive",
        });
        continue;
      }
      validFiles.push(file);
    }

    if (validFiles.length === 0) return;

    setUploading(true);
    const newUrls: string[] = [];

    try {
      for (const file of validFiles) {
        try {
          const { objectPath } = await uploadFile(file, { kind: "product" });
          newUrls.push(objectPath);
        } catch (fileError) {
          console.error(`Error uploading ${file.name}:`, fileError);
          toast({
            title: `Failed to upload ${file.name}`,
            description: fileError instanceof Error ? fileError.message : "Unknown error",
            variant: "destructive",
          });
        }
      }

      if (newUrls.length > 0) {
        const updatedUrls = [...imageUrls, ...newUrls];
        setImageUrls(updatedUrls);
        onImagesChange(updatedUrls);

        toast({
          title: "Upload successful",
          description: `${newUrls.length} of ${validFiles.length} image${validFiles.length !== 1 ? 's' : ''} uploaded successfully`,
        });
      } else if (validFiles.length > 0) {
        toast({
          title: "All uploads failed",
          description: "Please check your connection and try again",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload images",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      // Reset file input
      e.target.value = '';
    }
  };

  const removeImage = (index: number) => {
    const updatedUrls = imageUrls.filter((_, i) => i !== index);
    setImageUrls(updatedUrls);
    onImagesChange(updatedUrls);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="outline"
          disabled={uploading || imageUrls.length >= maxImages}
          onClick={() => document.getElementById('multi-image-input')?.click()}
          data-testid="button-upload-images"
        >
          <Upload className="h-4 w-4 mr-2" />
          {uploading ? "Uploading..." : `Upload Images (${imageUrls.length}/${maxImages})`}
        </Button>
        <input
          id="multi-image-input"
          type="file"
          multiple
          accept="image/*"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
        <span className="text-sm text-muted-foreground">
          Min: 1 image, Max: {maxImages} images
        </span>
      </div>

      {imageUrls.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {imageUrls.map((url, index) => (
            <div key={index} className="relative group">
              <img
                src={url}
                alt={`Product ${index + 1}`}
                className="w-full h-32 object-cover rounded border"
                data-testid={`img-product-${index}`}
              />
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute top-1 right-1 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => removeImage(index)}
                data-testid={`button-remove-image-${index}`}
              >
                <X className="h-4 w-4" />
              </Button>
              {index === 0 && (
                <div className="absolute bottom-1 left-1 bg-primary text-primary-foreground text-xs px-2 py-1 rounded">
                  Primary
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {imageUrls.length === 0 && (
        <div className="border-2 border-dashed rounded-lg p-8 text-center text-muted-foreground">
          <Upload className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-sm">No images uploaded yet</p>
          <p className="text-xs mt-1">Click "Upload Images" to add product photos</p>
        </div>
      )}
    </div>
  );
}
