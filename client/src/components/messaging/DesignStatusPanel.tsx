import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Upload, CheckCircle, XCircle, Clock, Paperclip, ExternalLink, ShoppingCart, ChevronDown, ChevronUp, Loader2, ArrowRight } from "lucide-react";
import { useDesignState } from "@/hooks/use-design-state";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLocation } from "wouter";
import { AddToCartModal, type ApprovedVariant } from "@/components/cart/AddToCartModal";

interface DesignStatusPanelProps {
  conversationId: string;
  productId?: string;
  serviceId?: string;
  userRole: "buyer" | "seller";
  itemName?: string;
  requiresQuote?: boolean;
  onRequestQuote?: () => void;
  variants?: Array<{ id: string; name: string; price: string }>;
  packages?: Array<{ id: string; name: string; price: string }>;
  conversation?: { workflowContexts?: string[] }; // Pass conversation to access workflow contexts
}

export function DesignStatusPanel({
  conversationId,
  productId,
  serviceId,
  userRole,
  itemName,
  requiresQuote = false,
  onRequestQuote,
  variants,
  packages,
  conversation,
}: DesignStatusPanelProps) {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const {
    approvedDesign,
    pendingDesigns,
    pendingDesign,
    changesRequestedDesign,
    isLoading,
    uploadDesign,
    isUploading,
    approveDesign,
    isApproving,
    rejectDesign,
    isRejecting,
    requestChanges,
    isRequestingChanges,
  } = useDesignState(conversationId, productId, serviceId);

  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showRequestChangesDialog, setShowRequestChangesDialog] = useState(false);
  const [showVariantDialog, setShowVariantDialog] = useState(false);
  const [approvedVariants, setApprovedVariants] = useState<ApprovedVariant[]>([]);
  const [selectedDesignId, setSelectedDesignId] = useState<string | null>(null);
  const [selectedVariantId, setSelectedVariantId] = useState<string>("");
  const [selectedPackageId, setSelectedPackageId] = useState<string>("");
  const [rejectReason, setRejectReason] = useState("");
  const [changeNotes, setChangeNotes] = useState("");
  const [workflowMode, setWorkflowMode] = useState<"product" | "quote">("product");
  const [hasPendingBooking, setHasPendingBooking] = useState(false);

  // Auto-populate approved variants when design is approved and variants are available
  useEffect(() => {
    if (approvedDesign && variants && variants.length > 0) {
      // Try to find the variant by ID
      let variant = variants.find(v => v.id === approvedDesign.variantId);
      
      // Fallback: If variantId is null/undefined and there's only one variant, use it
      if (!variant && !approvedDesign.variantId && variants.length === 1) {
        variant = variants[0];
        console.info('Auto-selected single variant for approved design without variantId:', {
          designApprovalId: approvedDesign.id,
          selectedVariantId: variant.id,
        });
      }
      
      if (variant) {
        const approvedVars: ApprovedVariant[] = [{
          id: variant.id,
          name: variant.name,
          price: variant.price,
          designApprovalId: approvedDesign.id,
        }];
        setApprovedVariants(approvedVars);
      } else {
        // Variant not found - log for debugging
        console.warn('Variant not found for approved design:', {
          approvedDesignVariantId: approvedDesign.variantId,
          availableVariantIds: variants.map(v => v.id),
          variantCount: variants.length,
        });
        setApprovedVariants([]);
      }
    } else {
      setApprovedVariants([]);
    }
  }, [approvedDesign, variants]);

  // Helper function to get correct messages route based on user role (passed as prop)
  const getMessagesRoute = () => {
    return userRole === "seller" ? "/seller/messages" : "/messages";
  };

  // Query cart items to check if variant is already in cart
  const { data: cartItems } = useQuery<any[]>({
    queryKey: ["/api/cart"],
    enabled: userRole === "buyer" && !!approvedDesign,
  });

  // Initialize workflowMode based on conversation contexts
  useEffect(() => {
    const workflowContexts = conversation?.workflowContexts || [];
    if (workflowContexts.includes("quote") && !workflowContexts.includes("product")) {
      setWorkflowMode("quote");
    } else {
      setWorkflowMode("product");
    }
  }, [conversation?.workflowContexts]);

  // Clear variant/package state when conversation changes to prevent stale IDs
  useEffect(() => {
    setSelectedVariantId("");
    setSelectedPackageId("");
  }, [conversationId, productId, serviceId]);

  // Check for pending booking in sessionStorage
  useEffect(() => {
    const checkPendingBooking = () => {
      const storedData = sessionStorage.getItem('pendingBooking');
      if (storedData && serviceId) {
        try {
          const { serviceId: storedServiceId } = JSON.parse(storedData);
          setHasPendingBooking(storedServiceId === serviceId);
        } catch (error) {
          setHasPendingBooking(false);
        }
      } else {
        setHasPendingBooking(false);
      }
    };
    
    checkPendingBooking();
  }, [serviceId, approvedDesign]);

  // Load persisted variant/package selection when dialog opens
  useEffect(() => {
    if (showUploadDialog) {
      const persisted = localStorage.getItem(`design-variant-${conversationId}`);
      
      if (persisted && productId) {
        // Validate that the persisted variant belongs to this product
        const isValidVariant = variants?.some(v => v.id === persisted);
        if (isValidVariant) {
          setSelectedVariantId(persisted);
        } else {
          setSelectedVariantId("");
        }
      } else if (persisted && serviceId) {
        // Validate that the persisted package belongs to this service
        const isValidPackage = packages?.some(p => p.id === persisted);
        if (isValidPackage) {
          setSelectedPackageId(persisted);
        } else {
          setSelectedPackageId("");
        }
      } else {
        // No persisted value or wrong type - clear state
        setSelectedVariantId("");
        setSelectedPackageId("");
      }
    }
  }, [showUploadDialog, conversationId, productId, serviceId, variants, packages]);

  const addToCartMutation = useMutation({
    mutationFn: async (data: { productVariantId: string; designApprovalId: string; quantity: number }) => {
      return await apiRequest("POST", "/api/cart", data);
    },
    onSuccess: (newCartItem: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/cart"] });
      
      // Show updated quantity in toast
      const wasInCart = cartItems?.some((item: any) => 
        item.productVariantId === newCartItem.productVariantId
      );
      
      if (wasInCart) {
        toast({ 
          title: "Cart updated!", 
          description: `Quantity increased to ${newCartItem.quantity}`,
        });
      } else {
        toast({ 
          title: "Added to cart successfully!",
          description: "Item added with quantity 1",
        });
      }
      
      setShowVariantDialog(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to add to cart",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ["image/jpeg", "image/png", "image/gif", "application/pdf", "image/svg+xml"];
    if (!validTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image (JPG, PNG, GIF, SVG) or PDF file",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload a file smaller than 10MB",
        variant: "destructive",
      });
      return;
    }

    // Determine context based on workflowMode
    const workflowContexts = conversation?.workflowContexts || [];
    const context = workflowMode;
    
    // Validate variant/package selection for product/service-scoped uploads
    if (context === "product") {
      if (productId && (!selectedVariantId || selectedVariantId === "")) {
        toast({
          title: "Variant required",
          description: "Please select a product variant before uploading",
          variant: "destructive",
        });
        return;
      }
      if (serviceId && (!selectedPackageId || selectedPackageId === "")) {
        toast({
          title: "Package required",
          description: "Please select a service package before uploading",
          variant: "destructive",
        });
        return;
      }
    }

    setUploadingFile(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("conversationId", conversationId);

      const response = await fetch("/api/upload-message-attachment", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to upload file");
      }

      const { url } = await response.json();
      
      // Capture full file metadata for design approval
      const designFile = {
        url,
        filename: file.name,
        size: file.size,
        mimeType: file.type,
      };
      
      uploadDesign({
        designFile,
        context,
        // For product-scoped designs, pass selected variant/package
        variantId: context === "product" && selectedVariantId ? selectedVariantId : undefined,
        packageId: context === "product" && selectedPackageId ? selectedPackageId : undefined,
      });
      setShowUploadDialog(false);
      
      // Persist selection for next upload
      if (context === "product") {
        localStorage.setItem(`design-variant-${conversationId}`, selectedVariantId || selectedPackageId || "");
      }
    } catch (error) {
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload design file",
        variant: "destructive",
      });
    } finally {
      setUploadingFile(false);
    }
  };

  const handleApproveDesign = (designId: string) => {
    approveDesign(designId);
  };

  const handleRejectDesign = () => {
    if (selectedDesignId) {
      rejectDesign({ designApprovalId: selectedDesignId, reason: rejectReason || undefined });
      setShowRejectDialog(false);
      setSelectedDesignId(null);
      setRejectReason("");
    }
  };

  const handleRequestChanges = () => {
    if (selectedDesignId && changeNotes.trim()) {
      requestChanges({ designApprovalId: selectedDesignId, notes: changeNotes });
      setShowRequestChangesDialog(false);
      setSelectedDesignId(null);
      setChangeNotes("");
    }
  };

  if (isLoading) {
    return (
      <Card className="mb-4">
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground">Loading design information...</p>
        </CardContent>
      </Card>
    );
  }

  // Buyer view - Show upload option or approved design
  if (userRole === "buyer") {
    return (
      <>
        <Card className="mb-4" data-testid="card-design-status-panel">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Design Approval</CardTitle>
            </div>
            {itemName && (
              <CardDescription>For: {itemName}</CardDescription>
            )}
            {workflowMode === "product" && (
              <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-md border border-blue-200 dark:border-blue-800">
                <p className="text-xs text-blue-800 dark:text-blue-200">
                  <strong>Standard Variant Design:</strong> Upload your design for an existing listed variant. {requiresQuote ? "If you need custom specifications or pricing, use the Quote workflow instead." : ""}
                </p>
              </div>
            )}
            {workflowMode === "quote" && (
              <div className="mt-2 p-2 bg-purple-50 dark:bg-purple-900/20 rounded-md border border-purple-200 dark:border-purple-800">
                <p className="text-xs text-purple-800 dark:text-purple-200">
                  <strong>Custom Quote Design:</strong> This design is for your custom quote request. The seller will review your design along with your specifications to provide pricing.
                </p>
              </div>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {pendingDesign && !approvedDesign ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <Badge variant="secondary" data-testid="badge-design-status">
                    <Clock className="h-3 w-3 mr-1" />
                    Pending Review
                  </Badge>
                </div>

                <Separator />

                <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-md border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 text-blue-600 dark:text-blue-400 animate-spin" />
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      Waiting for seller to review your design
                    </p>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <span className="text-sm text-muted-foreground">Your Submitted Design</span>
                  <div className="flex gap-2">
                    <a
                      href={pendingDesign.designFiles?.[0]?.url || "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-primary hover:underline"
                      data-testid="link-pending-design"
                    >
                      <Paperclip className="h-4 w-4" />
                      {pendingDesign.designFiles?.[0]?.filename || "View design"}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              </div>
            ) : changesRequestedDesign ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <Badge variant="secondary" data-testid="badge-design-status">
                    <ArrowRight className="h-3 w-3 mr-1" />
                    Changes Requested
                  </Badge>
                </div>

                <Separator />

                <div className="p-3 bg-orange-50 dark:bg-orange-950/20 rounded-md border border-orange-200 dark:border-orange-800">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                      <span className="text-sm font-medium text-orange-700 dark:text-orange-300">
                        Seller Feedback
                      </span>
                    </div>
                    <p className="text-sm text-orange-700 dark:text-orange-300">
                      {changesRequestedDesign.sellerNotes}
                    </p>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <span className="text-sm text-muted-foreground">Your Previous Design</span>
                  <div className="flex gap-2">
                    <a
                      href={changesRequestedDesign.designFiles?.[0]?.url || "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-primary hover:underline"
                      data-testid="link-changes-requested-design"
                    >
                      <Paperclip className="h-4 w-4" />
                      {changesRequestedDesign.designFiles?.[0]?.filename || "View design"}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>

                <Separator />

                <Button
                  onClick={() => setShowUploadDialog(true)}
                  disabled={isUploading}
                  className="w-full"
                  data-testid="button-upload-revised-design"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {isUploading ? "Uploading..." : "Upload Revised Design"}
                </Button>
              </div>
            ) : approvedDesign ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <Badge variant="default" data-testid="badge-design-status">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Approved
                  </Badge>
                </div>

                <Separator />

                <div className="space-y-1">
                  <span className="text-sm text-muted-foreground">Design File</span>
                  <div className="flex gap-2">
                    <a
                      href={approvedDesign.designFiles?.[0]?.url || "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-primary hover:underline"
                      data-testid="link-approved-design"
                    >
                      <Paperclip className="h-4 w-4" />
                      {approvedDesign.designFiles?.[0]?.filename || "View design"}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                    <a
                      href={approvedDesign.designFiles?.[0]?.url || "#"}
                      download={approvedDesign.designFiles?.[0]?.filename || "design"}
                      className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
                      data-testid="button-download-approved-design"
                    >
                      <Upload className="h-4 w-4 rotate-180" />
                      Download
                    </a>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  {/* Check design context to determine next action */}
                  {approvedDesign.context === "quote" ? (
                    <>
                      <p className="text-xs text-blue-600">
                        Design approved for quote! The seller will create a custom quote for you shortly.
                      </p>
                      <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-md border border-blue-200 dark:border-blue-800">
                        <div className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 text-blue-600 dark:text-blue-400 animate-spin" />
                          <p className="text-sm text-blue-700 dark:text-blue-300">
                            Awaiting seller quote for custom specifications
                          </p>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      {serviceId && hasPendingBooking ? (
                        <>
                          <p className="text-xs text-green-600">
                            Design approved! Return to booking to complete your service request.
                          </p>
                          <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-md border border-green-200 dark:border-green-800">
                            <div className="flex items-center gap-2 mb-3">
                              <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                              <span className="text-sm font-medium text-green-700 dark:text-green-300">
                                Ready to Book
                              </span>
                            </div>
                            <Button
                              onClick={() => navigate(`/services/${serviceId}/book?returnFromDesign=true`)}
                              className="w-full"
                              variant="default"
                              data-testid="button-return-to-booking"
                            >
                              <ArrowRight className="h-4 w-4 mr-2" />
                              Return to Booking
                            </Button>
                          </div>
                        </>
                      ) : (
                        <>
                          <p className="text-xs text-green-600">
                            Design approved! You can now proceed with purchase.
                          </p>
                          {productId ? (
                            <>
                              {(() => {
                                // Find cart item matching the approved design's variant
                                const cartItem = cartItems?.find((item: any) => 
                                  item.productVariantId === approvedDesign.variantId
                                );
                                
                                if (cartItem) {
                                  // Item is already in cart - show View Cart button
                                  return (
                                    <div className="space-y-2">
                                      <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950/20 rounded-md border border-green-200 dark:border-green-800">
                                        <div className="flex items-center gap-2">
                                          <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                                          <span className="text-sm font-medium text-green-700 dark:text-green-300">
                                            In Cart
                                          </span>
                                        </div>
                                        <Badge variant="secondary" data-testid="badge-cart-quantity">
                                          Qty: {cartItem.quantity}
                                        </Badge>
                                      </div>
                                      <div className="flex gap-2">
                                        <Button
                                          onClick={() => navigate("/cart")}
                                          className="flex-1"
                                          variant="default"
                                          data-testid="button-view-cart"
                                        >
                                          <ShoppingCart className="h-4 w-4 mr-2" />
                                          View Cart
                                        </Button>
                                        <Button
                                          onClick={() => setShowVariantDialog(true)}
                                          variant="outline"
                                          disabled={addToCartMutation.isPending || approvedVariants.length === 0}
                                          data-testid="button-add-more"
                                        >
                                          {addToCartMutation.isPending ? "Adding..." : "Add More"}
                                        </Button>
                                      </div>
                                    </div>
                                  );
                                }
                                
                                // Item not in cart - show Add to Cart button
                                return (
                                  <Button
                                    onClick={() => setShowVariantDialog(true)}
                                    className="w-full"
                                    disabled={addToCartMutation.isPending || approvedVariants.length === 0}
                                    data-testid="button-add-to-cart-after-approval"
                                  >
                                    <ShoppingCart className="h-4 w-4 mr-2" />
                                    {addToCartMutation.isPending ? "Adding..." : "Add to Cart"}
                                  </Button>
                                );
                              })()}
                            </>
                          ) : null}
                        </>
                      )}
                    </>
                  )}
                </div>

                <Separator />

                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    Want to submit a different design?
                  </p>
                  <Button
                    onClick={() => setShowUploadDialog(true)}
                    disabled={isUploading}
                    className="w-full"
                    variant="outline"
                    data-testid="button-submit-new-design"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {isUploading ? "Uploading..." : "Submit New Design"}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Upload your design files for seller approval before proceeding with purchase.
                </p>
                
                <Button
                  onClick={() => setShowUploadDialog(true)}
                  disabled={isUploading}
                  className="w-full"
                  data-testid="button-upload-design"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {isUploading ? "Uploading..." : "Upload Design"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upload Dialog */}
        <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
          <DialogContent data-testid="dialog-upload-design">
            <DialogHeader>
              <DialogTitle>Upload Design</DialogTitle>
              <DialogDescription>
                Upload your design file for seller approval. Accepted formats: JPG, PNG, GIF, SVG, PDF (max 10MB)
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {/* Show workflow choice if both product and quote contexts are available */}
              {conversation?.workflowContexts?.includes("product") && conversation?.workflowContexts?.includes("quote") && (
                <div>
                  <Label htmlFor="workflow-mode">Upload for</Label>
                  <Select value={workflowMode} onValueChange={(value: "product" | "quote") => setWorkflowMode(value)}>
                    <SelectTrigger id="workflow-mode" data-testid="select-workflow-mode">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="product" data-testid="option-workflow-product">
                        Listed Variant (proceed to checkout after approval)
                      </SelectItem>
                      <SelectItem value="quote" data-testid="option-workflow-quote">
                        Custom Quote Request
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              {/* Variant selector for products */}
              {workflowMode === "product" && productId && variants && variants.length > 0 && (
                <div>
                  <Label htmlFor="variant-upload-select">Product Variant *</Label>
                  <Select value={selectedVariantId} onValueChange={setSelectedVariantId}>
                    <SelectTrigger id="variant-upload-select" data-testid="select-variant-upload">
                      <SelectValue placeholder="Select a variant" />
                    </SelectTrigger>
                    <SelectContent>
                      {variants.map((variant) => (
                        <SelectItem key={variant.id} value={variant.id} data-testid={`option-variant-upload-${variant.id}`}>
                          {variant.name} - ${variant.price}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Select which variant this design is for
                  </p>
                </div>
              )}
              
              {/* Package selector for services */}
              {workflowMode === "product" && serviceId && packages && packages.length > 0 && (
                <div>
                  <Label htmlFor="package-upload-select">Service Package *</Label>
                  <Select value={selectedPackageId} onValueChange={setSelectedPackageId}>
                    <SelectTrigger id="package-upload-select" data-testid="select-package-upload">
                      <SelectValue placeholder="Select a package" />
                    </SelectTrigger>
                    <SelectContent>
                      {packages.map((pkg) => (
                        <SelectItem key={pkg.id} value={pkg.id} data-testid={`option-package-upload-${pkg.id}`}>
                          {pkg.name} - ${pkg.price}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Select which package this design is for
                  </p>
                </div>
              )}
              
              <div>
                <Label htmlFor="design-file">Design File *</Label>
                <input
                  id="design-file"
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/svg+xml,application/pdf"
                  onChange={handleFileUpload}
                  disabled={uploadingFile}
                  className="w-full mt-1"
                  data-testid="input-design-file"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowUploadDialog(false)}
                disabled={uploadingFile}
              >
                Cancel
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add to Cart Modal (shared component) */}
        <AddToCartModal
          open={showVariantDialog}
          onOpenChange={(open) => {
            setShowVariantDialog(open);
            if (!open) {
              setApprovedVariants([]);
            }
          }}
          productName={itemName || "Product"}
          productDescription={undefined}
          productImage={undefined}
          approvedVariants={approvedVariants}
          onConfirm={(variantId, designApprovalId, quantity) => {
            addToCartMutation.mutate({ productVariantId: variantId, designApprovalId, quantity });
          }}
          isLoading={addToCartMutation.isPending}
        />
      </>
    );
  }

  // Seller view - Show pending designs for approval
  if (pendingDesigns.length === 0) {
    return null; // Don't show panel if no pending designs for seller
  }

  return (
    <>
      <Card className="mb-4" data-testid="card-design-status-panel">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Design Approvals</CardTitle>
          </div>
          <CardDescription>
            {pendingDesigns.length} design{pendingDesigns.length !== 1 ? "s" : ""} pending approval
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {pendingDesigns.map((design: any) => (
            <div key={design.id} className="space-y-3 p-3 border rounded-md" data-testid={`design-pending-${design.id}`}>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Status</span>
                <Badge variant="secondary" data-testid="badge-design-status">
                  <Clock className="h-3 w-3 mr-1" />
                  Pending Review
                </Badge>
              </div>

              <Separator />

              <div className="space-y-1">
                <span className="text-sm text-muted-foreground">Design File</span>
                <div className="flex gap-2">
                  <a
                    href={design.designFiles?.[0]?.url || "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-primary hover:underline"
                    data-testid={`link-design-${design.id}`}
                  >
                    <Paperclip className="h-4 w-4" />
                    {design.designFiles?.[0]?.filename || "View design"}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                  <a
                    href={design.designFiles?.[0]?.url || "#"}
                    download={design.designFiles?.[0]?.filename || "design"}
                    className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
                    data-testid={`button-download-design-${design.id}`}
                  >
                    <Upload className="h-4 w-4 rotate-180" />
                    Download
                  </a>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Button
                  onClick={() => handleApproveDesign(design.id)}
                  disabled={isApproving}
                  className="w-full"
                  data-testid={`button-approve-design-${design.id}`}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {isApproving ? "Approving..." : "Approve"}
                </Button>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedDesignId(design.id);
                      setShowRequestChangesDialog(true);
                    }}
                    disabled={isRequestingChanges}
                    className="flex-1"
                    data-testid={`button-request-changes-${design.id}`}
                  >
                    <ArrowRight className="h-4 w-4 mr-2" />
                    Request Changes
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedDesignId(design.id);
                      setShowRejectDialog(true);
                    }}
                    disabled={isRejecting}
                    className="flex-1"
                    data-testid={`button-reject-design-${design.id}`}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Request Changes Dialog */}
      <Dialog open={showRequestChangesDialog} onOpenChange={setShowRequestChangesDialog}>
        <DialogContent data-testid="dialog-request-changes">
          <DialogHeader>
            <DialogTitle>Request Design Changes</DialogTitle>
            <DialogDescription>
              Provide clear feedback about what changes are needed. The buyer will see these notes.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Please describe the changes you'd like to see..."
            value={changeNotes}
            onChange={(e) => setChangeNotes(e.target.value)}
            rows={3}
            data-testid="textarea-change-notes"
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowRequestChangesDialog(false);
                setSelectedDesignId(null);
                setChangeNotes("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleRequestChanges}
              disabled={isRequestingChanges || !changeNotes.trim()}
              data-testid="button-confirm-request-changes"
            >
              {isRequestingChanges ? "Sending..." : "Request Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent data-testid="dialog-reject-design">
          <DialogHeader>
            <DialogTitle>Reject Design</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this design (optional).
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Reason for rejection..."
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={3}
            data-testid="textarea-reject-reason"
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowRejectDialog(false);
                setSelectedDesignId(null);
                setRejectReason("");
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRejectDesign}
              disabled={isRejecting}
              data-testid="button-confirm-reject"
            >
              {isRejecting ? "Rejecting..." : "Reject Design"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
