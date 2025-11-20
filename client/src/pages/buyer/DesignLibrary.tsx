import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FileImage, Package, Store, Eye, ShoppingCart, Calendar, Copy, Loader2 } from "lucide-react";
import { useState } from "react";
import type { DesignApproval, ProductVariant, ServicePackage } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type EnrichedDesignLibraryItem = DesignApproval & {
  product?: { name: string; id: string };
  service?: { name: string; id: string };
  productVariant?: ProductVariant;
  servicePackage?: ServicePackage;
};

export default function BuyerDesignLibrary() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDesign, setSelectedDesign] = useState<EnrichedDesignLibraryItem | null>(null);
  const [isVariantDialogOpen, setIsVariantDialogOpen] = useState(false);
  const { toast } = useToast();

  const { data: approvedDesigns = [], isLoading, isError, error } = useQuery<EnrichedDesignLibraryItem[]>({
    queryKey: ["/api/buyer/design-library"],
  });

  const { data: productVariants = [], isLoading: isLoadingVariants } = useQuery<ProductVariant[]>({
    queryKey: ["/api/products", selectedDesign?.productId, "variants"],
    enabled: !!selectedDesign?.productId && isVariantDialogOpen,
    queryFn: async () => {
      if (!selectedDesign?.productId) return [];
      const response = await fetch(`/api/products/${selectedDesign.productId}`);
      if (!response.ok) throw new Error("Failed to fetch product variants");
      const data = await response.json();
      return data.variants || [];
    },
  });

  const copyDesignMutation = useMutation({
    mutationFn: async ({ designId, variantId }: { designId: string; variantId: string }) => {
      return await apiRequest("POST", `/api/design-approvals/${designId}/copy-to-variant`, {
        targetVariantId: variantId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/buyer/design-library"] });
      setIsVariantDialogOpen(false);
      setSelectedDesign(null);
      toast({
        title: "Design reused successfully",
        description: "Your design has been copied to the selected variant. The seller will be notified.",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Failed to reuse design",
        description: error.message,
      });
    },
  });

  const filteredDesigns = approvedDesigns.filter(design => {
    const searchLower = searchQuery.toLowerCase();
    const itemName = (design.product?.name || design.service?.name || "").toLowerCase();
    const variantName = (design.productVariant?.name || design.servicePackage?.name || "").toLowerCase();
    return itemName.includes(searchLower) || variantName.includes(searchLower);
  });

  const getItemName = (design: EnrichedDesignLibraryItem) => {
    if (design.product) return design.product.name;
    if (design.service) return design.service.name;
    return "Unknown Item";
  };

  const getVariantOrPackageInfo = (design: EnrichedDesignLibraryItem) => {
    if (design.productVariant) {
      return design.productVariant.name;
    }
    if (design.servicePackage) {
      return design.servicePackage.name;
    }
    return null;
  };

  const handleViewProduct = (design: EnrichedDesignLibraryItem) => {
    if (design.productId) {
      setLocation(`/product/${design.productId}`);
    } else if (design.serviceId) {
      setLocation(`/book-service/${design.serviceId}`);
    }
  };

  const handleReuseForDifferentVariant = (design: EnrichedDesignLibraryItem) => {
    setSelectedDesign(design);
    setIsVariantDialogOpen(true);
  };

  const handleCopyToVariant = (variantId: string) => {
    if (!selectedDesign) return;
    copyDesignMutation.mutate({
      designId: selectedDesign.id,
      variantId,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-bold font-display">Design Library</h1>
        <p className="text-muted-foreground mt-2">Your approved designs ready to use</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Approved Designs</CardTitle>
            <FileImage className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold" data-testid="text-total-approved-designs">{approvedDesigns.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Product Designs</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold" data-testid="text-product-designs">
              {approvedDesigns.filter(d => d.productId).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Service Designs</CardTitle>
            <Store className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold" data-testid="text-service-designs">
              {approvedDesigns.filter(d => d.serviceId).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div>
        <Input
          placeholder="Search designs by item or variant name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-md"
          data-testid="input-search-designs"
        />
      </div>

      {/* Error State */}
      {isError && (
        <Card>
          <CardContent className="p-12 text-center">
            <FileImage className="h-12 w-12 mx-auto text-destructive mb-4" />
            <p className="text-destructive">
              Failed to load design library: {error instanceof Error ? error.message : "Unknown error"}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="space-y-3">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-20 w-full" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !isError && filteredDesigns.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <FileImage className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {approvedDesigns.length === 0 
                ? "No approved designs yet. Once sellers approve your designs, they'll appear here."
                : "No designs match your search."}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Design Grid */}
      {!isLoading && !isError && filteredDesigns.length > 0 && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredDesigns.map((design) => (
            <Card key={design.id} className="hover-elevate" data-testid={`card-design-library-${design.id}`}>
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg truncate" data-testid={`text-item-name-${design.id}`}>
                      {getItemName(design)}
                    </CardTitle>
                    {getVariantOrPackageInfo(design) && (
                      <p className="text-sm text-muted-foreground truncate mt-1">
                        {getVariantOrPackageInfo(design)}
                      </p>
                    )}
                  </div>
                  {design.productId && (
                    <Badge variant="outline" className="shrink-0">
                      <Package className="h-3 w-3 mr-1" />
                      Product
                    </Badge>
                  )}
                  {design.serviceId && (
                    <Badge variant="outline" className="shrink-0">
                      <Store className="h-3 w-3 mr-1" />
                      Service
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Design Files Preview */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium">{design.designFiles.length} File{design.designFiles.length !== 1 ? 's' : ''}</h4>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {design.designFiles.slice(0, 3).map((file: { url: string; filename: string }, index: number) => (
                      <Button
                        key={index}
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-1 text-xs"
                        onClick={() => window.open(file.url, '_blank')}
                        data-testid={`button-view-file-${design.id}-${index}`}
                      >
                        <Eye className="h-3 w-3" />
                        {file.filename.length > 15 ? file.filename.substring(0, 12) + '...' : file.filename}
                      </Button>
                    ))}
                    {design.designFiles.length > 3 && (
                      <span className="text-xs text-muted-foreground self-center">
                        +{design.designFiles.length - 3} more
                      </span>
                    )}
                  </div>
                </div>

                {/* Approval Date */}
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>Approved {new Date(design.approvedAt!).toLocaleDateString()}</span>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2">
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => handleViewProduct(design)}
                    data-testid={`button-view-product-${design.id}`}
                  >
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    Buy Again
                  </Button>
                  {design.productId && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleReuseForDifferentVariant(design)}
                      data-testid={`button-reuse-variant-${design.id}`}
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Use for Different Variant
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Variant Selection Dialog */}
      <Dialog open={isVariantDialogOpen} onOpenChange={setIsVariantDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Select Variant for Design Reuse</DialogTitle>
            <DialogDescription>
              Choose which variant you want to use this design for. The same design files will be copied and the seller will be notified.
            </DialogDescription>
          </DialogHeader>
          
          {isLoadingVariants ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : (
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {productVariants
                .filter(v => v.id !== selectedDesign?.variantId)
                .map((variant) => (
                  <Card 
                    key={variant.id} 
                    className="hover-elevate cursor-pointer" 
                    onClick={() => handleCopyToVariant(variant.id)}
                    data-testid={`card-variant-option-${variant.id}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex-1">
                          <h4 className="font-medium">{variant.name}</h4>
                          {variant.attributes && (
                            <div className="flex flex-wrap gap-2 mt-2">
                              {Object.entries(variant.attributes).map(([key, value]) => (
                                <Badge key={key} variant="secondary" className="text-xs">
                                  {key}: {value}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold">${parseFloat(variant.price).toFixed(2)}</p>
                          {variant.inventory !== undefined && (
                            <p className="text-sm text-muted-foreground">
                              {variant.inventory > 0 ? `${variant.inventory} in stock` : "Out of stock"}
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              
              {productVariants.filter(v => v.id !== selectedDesign?.variantId).length === 0 && (
                <Card>
                  <CardContent className="p-12 text-center">
                    <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">
                      No other variants available for this product.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
          
          {copyDesignMutation.isPending && (
            <div className="flex items-center justify-center gap-2 p-4 bg-muted rounded-md">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Copying design to selected variant...</span>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
