import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle } from "lucide-react";
import { useState, useEffect } from "react";

export interface ApprovedVariant {
  id: string;
  name: string;
  price: string;
  inventory?: number;
  designApprovalId: string;
}

interface AddToCartModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productName: string;
  productDescription?: string;
  productImage?: string;
  approvedVariants: ApprovedVariant[];
  onConfirm: (variantId: string, designApprovalId: string, quantity: number) => void;
  isLoading?: boolean;
}

export function AddToCartModal({
  open,
  onOpenChange,
  productName,
  productDescription,
  productImage,
  approvedVariants,
  onConfirm,
  isLoading = false,
}: AddToCartModalProps) {
  const [selectedVariantId, setSelectedVariantId] = useState<string>("");
  const [quantity, setQuantity] = useState(1);

  // Auto-select when modal opens or approved variants change
  useEffect(() => {
    if (open && approvedVariants.length > 0) {
      // Always auto-select the first variant when modal opens
      setSelectedVariantId(approvedVariants[0].id);
    }
  }, [open, approvedVariants]);

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setQuantity(1);
      setSelectedVariantId("");
    }
  }, [open]);

  const handleConfirm = () => {
    const selectedVariant = approvedVariants.find(v => v.id === selectedVariantId);
    if (selectedVariant) {
      onConfirm(selectedVariant.id, selectedVariant.designApprovalId, quantity);
    }
  };

  const selectedVariant = approvedVariants.find(v => v.id === selectedVariantId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="dialog-add-to-cart">
        <DialogHeader>
          <DialogTitle>Add to Cart</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Product Info */}
          <div className="flex gap-4">
            {productImage && (
              <img
                src={productImage}
                alt={productName}
                className="w-24 h-24 object-cover rounded"
              />
            )}
            <div>
              <h3 className="font-semibold text-lg">{productName}</h3>
              {productDescription && (
                <p className="text-sm text-muted-foreground line-clamp-2">{productDescription}</p>
              )}
            </div>
          </div>

          {/* Variant Selection */}
          <div className="space-y-2">
            <Label htmlFor="variant-select">
              Select Variant
              <span className="text-xs text-muted-foreground ml-2">(Approved designs only)</span>
            </Label>
            
            {approvedVariants.length === 1 ? (
              /* Single variant: Display cleanly without dropdown */
              <div 
                className="flex items-center gap-2 px-3 py-2 border rounded-md bg-muted/30"
                data-testid="single-variant-display"
              >
                <CheckCircle className="h-4 w-4 text-primary" />
                <span className="text-sm">
                  {selectedVariant?.name} - ${parseFloat(selectedVariant?.price || "0").toFixed(2)}
                  {selectedVariant?.inventory !== undefined && ` (Stock: ${selectedVariant.inventory})`}
                </span>
              </div>
            ) : (
              /* Multiple variants: Show dropdown */
              <Select value={selectedVariantId} onValueChange={setSelectedVariantId}>
                <SelectTrigger id="variant-select" data-testid="select-variant">
                  <SelectValue placeholder="Choose a variant" />
                </SelectTrigger>
                <SelectContent>
                  {approvedVariants.map((variant) => (
                    <SelectItem key={variant.id} value={variant.id}>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-3 w-3 text-primary" />
                        <span>
                          {variant.name} - ${parseFloat(variant.price).toFixed(2)}
                          {variant.inventory !== undefined && ` (Stock: ${variant.inventory})`}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Quantity */}
          <div className="space-y-2">
            <Label htmlFor="quantity-input">Quantity</Label>
            <Input
              id="quantity-input"
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value, 10) || 1)}
              data-testid="input-quantity"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
              data-testid="button-cancel"
            >
              Cancel
            </Button>
            <Button
              className="flex-1"
              onClick={handleConfirm}
              disabled={isLoading || !selectedVariantId}
              data-testid="button-confirm-add-to-cart"
            >
              {isLoading ? "Adding..." : "Add to Cart"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
