import { Star, Image as ImageIcon } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";

interface Rating {
  id: string;
  rating: number;
  comment?: string | null;
  images?: string[] | null;
  createdAt: string;
  buyer?: {
    firstName: string;
    lastName: string;
  };
  order?: {
    id: string;
  };
  booking?: {
    id: string;
  };
}

interface RatingDisplayProps {
  ratings: Rating[];
  showBuyerInfo?: boolean;
}

export function RatingDisplay({ ratings, showBuyerInfo = true }: RatingDisplayProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Safety check: ensure ratings is an array
  const safeRatings = Array.isArray(ratings) ? ratings : [];

  if (safeRatings.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No ratings yet
      </div>
    );
  }

  // Calculate average rating
  const averageRating = safeRatings.reduce((sum, r) => sum + r.rating, 0) / safeRatings.length;

  return (
    <div className="space-y-4">
      {/* Overall Rating Summary */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="text-center">
              <div className="text-4xl font-bold" data-testid="text-average-rating">
                {averageRating.toFixed(1)}
              </div>
              <div className="flex gap-0.5 mt-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`h-4 w-4 ${
                      star <= Math.round(averageRating)
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-muted-foreground"
                    }`}
                  />
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground" data-testid="text-rating-count">
                Based on {safeRatings.length} {safeRatings.length === 1 ? "rating" : "ratings"}
              </p>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Individual Ratings */}
      <div className="space-y-3">
        {safeRatings.map((rating) => (
          <Card key={rating.id} data-testid={`card-rating-${rating.id}`}>
            <CardContent className="pt-4">
              <div className="space-y-2">
                {/* Rating and Buyer Info */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`h-4 w-4 ${
                              star <= rating.rating
                                ? "fill-yellow-400 text-yellow-400"
                                : "text-muted-foreground"
                            }`}
                          />
                        ))}
                      </div>
                      <span className="font-medium">{rating.rating}/5</span>
                    </div>
                    {showBuyerInfo && rating.buyer && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {rating.buyer.firstName} {rating.buyer.lastName}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <Badge variant="outline">
                      {rating.order ? "Order" : "Booking"}
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(rating.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {/* Comment */}
                {rating.comment && (
                  <p className="text-sm mt-2" data-testid={`text-comment-${rating.id}`}>
                    {rating.comment}
                  </p>
                )}

                {/* Images */}
                {rating.images && rating.images.length > 0 && (
                  <div className="mt-3">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                      <ImageIcon className="h-3 w-3" />
                      <span>{rating.images.length} {rating.images.length === 1 ? "photo" : "photos"}</span>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      {rating.images.map((url, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => setSelectedImage(url)}
                          className="aspect-square overflow-hidden rounded border hover-elevate"
                          data-testid={`button-image-${rating.id}-${index}`}
                        >
                          <img
                            src={url}
                            alt={`Rating photo ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Image Lightbox */}
      <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className="max-w-4xl" data-testid="dialog-image-lightbox">
          {selectedImage && (
            <img
              src={selectedImage}
              alt="Rating photo"
              className="w-full h-auto rounded"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
