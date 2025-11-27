import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { Star, Package, ShoppingCart, Plus, Minus, MessageCircle, Shield, FileText, Upload, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";
import { RatingDisplay } from "@/components/RatingDisplay";

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  const [selectedVariantId, setSelectedVariantId] = useState<string>("");
  const [quantity, setQuantity] = useState(1);
  const [showAskSellerDialog, setShowAskSellerDialog] = useState(false);
  const [inquiryMessage, setInquiryMessage] = useState("");
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  
  // Parse query params for workflow actions
  const urlParams = new URLSearchParams(window.location.search);
  const action = urlParams.get('action');

  const { data: product, isLoading: productLoading } = useQuery<any>({
    queryKey: ["/api/products", id],
    enabled: !!id,
  });

  // Fetch seller ratings (verified from completed transactions)
  const { data: sellerRatings = [], isLoading: ratingsLoading } = useQuery<any[]>({
    queryKey: ["/api/sellers", product?.seller?.id, "ratings"],
    enabled: !!product?.seller?.id,
  });

  // Get current user for auth checks (properly handles 401 for guests)
  const { user } = useAuth();

  // Fetch active quote for this product (if requiresQuote is true)
  const { data: activeQuote } = useQuery<any>({
    queryKey: ["/api/quotes/active", product?.id],
    queryFn: async () => {
      if (!product?.id) return null;
      const conversations: any[] = await apiRequest("GET", "/api/conversations");
      const productConversation = conversations.find(c => 
        c.type === "pre_purchase_product" && c.productId === product.id
      );
      if (!productConversation?.id) return null;
      try {
        return await apiRequest("GET", `/api/quotes/active?conversationId=${productConversation.id}&productId=${product.id}`);
      } catch {
        return null;
      }
    },
    enabled: !!product?.id && product?.requiresQuote === true,
  });

  // Fetch ALL approved designs for this product (if requiresDesignApproval is true)
  const { data: approvedDesigns = [] } = useQuery<any[]>({
    queryKey: ["/api/design-approvals/approved", product?.id],
    queryFn: async () => {
      if (!product?.id) return [];
      
      // Fetch directly from API instead of finding conversation first
      try {
        const approvedDesigns = await apiRequest("GET", `/api/products/${product.id}/approved-variants`);
        console.log('Product Detail approved designs:', approvedDesigns);
        
        // Filter to only approved designs and normalize data
        return (approvedDesigns || [])
          .filter((ad: any) => ad.status === 'approved')
          .map((ad: any) => ({
            ...ad,
            id: ad.designApprovalId // Add 'id' field for consistency with other parts of codebase
          }));
      } catch (error) {
        console.error('Failed to fetch approved designs:', error);
        return [];
      }
    },
    enabled: !!product?.id && product?.requiresDesignApproval === true,
  });

  const averageRating = sellerRatings.length > 0
    ? (sellerRatings.reduce((sum, r) => sum + r.rating, 0) / sellerRatings.length).toFixed(1)
    : "0.0";

  // Check if the currently selected variant has an approved design
  // Include fallback for legacy data: if product has only 1 variant and there's an approved design, treat it as approved
  const selectedVariantHasApprovedDesign = 
    approvedDesigns.some((ad: any) => ad.variantId === selectedVariantId) ||
    (product?.variants?.length === 1 && approvedDesigns.length > 0);

  const addToCartMutation = useMutation({
    mutationFn: async (data: { variantId: string; quantity: number; designApprovalId?: string }) => {
      return await apiRequest("POST", "/api/cart", { 
        productVariantId: data.variantId, 
        quantity: data.quantity,
        designApprovalId: data.designApprovalId 
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cart"] });
      toast({ title: "Added to cart successfully!" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to add to cart", description: error.message, variant: "destructive" });
    },
  });

  const handleAddToCart = () => {
    // Check if user is authenticated - redirect to login if not
    if (!user) {
      navigate(`/login?redirect=${encodeURIComponent(`/product/${id}`)}`);
      return;
    }

    if (!selectedVariantId) {
      toast({ title: "Please select a variant", variant: "destructive" });
      return;
    }
    if (quantity < 1) {
      toast({ title: "Quantity must be at least 1", variant: "destructive" });
      return;
    }

    // Validate quote requirement
    if (product?.requiresQuote && (!activeQuote || activeQuote.status !== "accepted")) {
      toast({ 
        title: "Quote Required", 
        description: "This product requires a custom quote before purchase. Please request a quote first.", 
        variant: "destructive" 
      });
      return;
    }

    // Validate design approval requirement
    if (product?.requiresDesignApproval && approvedDesigns.length === 0) {
      toast({ 
        title: "Design Approval Required", 
        description: "This product requires design approval before purchase. Please upload your design in the messages.", 
        variant: "destructive" 
      });
      return;
    }

    // Find the approval that matches the selected variant (or use single-variant fallback)
    let designApprovalId: string | undefined = undefined;
    if (product?.requiresDesignApproval) {
      // Find approval matching the selected variant
      let matchingApproval = approvedDesigns.find((ad: any) => ad.variantId === selectedVariantId);
      
      // Fallback for legacy data: if no match and there's only 1 variant, use the first approval
      if (!matchingApproval && product?.variants?.length === 1 && approvedDesigns.length > 0) {
        matchingApproval = approvedDesigns[0];
        console.info('Using fallback approval for single-variant product:', {
          selectedVariantId,
          approvalVariantId: matchingApproval.variantId,
          designApprovalId: matchingApproval.designApprovalId
        });
      }
      
      if (!matchingApproval || matchingApproval.status !== 'approved') {
        toast({ 
          title: "No approved design for selected variant", 
          description: "Please upload and get a design approved for this specific variant.", 
          variant: "destructive" 
        });
        return;
      }
      
      designApprovalId = matchingApproval.designApprovalId;
    }

    addToCartMutation.mutate({ 
      variantId: selectedVariantId, 
      quantity, 
      designApprovalId 
    });
  };

  const requestQuoteMutation = useMutation({
    mutationFn: async () => {
      // Use workflow initialization endpoint
      const conversation = await apiRequest("POST", "/api/conversations/workflows", {
        productId: product.id,
        context: "quote", // Custom quote request workflow
        initialMessage: `Hi, I'm interested in purchasing ${product.name}. Could you please provide me with a custom quote?`,
      });
      
      return conversation;
    },
    onSuccess: (conversation) => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/quotes/active", product?.id] });
      toast({ 
        title: "Quote request sent!", 
        description: "The seller will respond with a custom quote in your messages.",
      });
      // Navigate to the conversation
      navigate("/messages");
    },
    onError: (error: Error) => {
      toast({ title: "Failed to send quote request", description: error.message, variant: "destructive" });
    },
  });

  const initiateDesignUploadMutation = useMutation({
    mutationFn: async () => {
      // Use workflow initialization endpoint
      const conversation = await apiRequest("POST", "/api/conversations/workflows", {
        productId: product.id,
        context: "product", // Design for listed variant workflow
        initialMessage: `Hi, I need to upload my design files for ${product.name}. Please review and approve when ready.`,
      });
      
      return conversation;
    },
    onSuccess: (conversation: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      toast({ 
        title: "Navigating to messages", 
        description: "Upload your design file as an attachment.",
      });
      // Navigate to messages with conversation ID to auto-select it
      navigate(`/messages?conversation=${conversation.id}`);
    },
    onError: (error: Error) => {
      toast({ title: "Failed to initiate design upload", description: error.message, variant: "destructive" });
    },
  });

  const createInquiryMutation = useMutation({
    mutationFn: async (data: { message: string }) => {
      const conversation: any = await apiRequest("POST", "/api/conversations", {
        type: "pre_purchase_product",
        subject: `Question about ${product.name}`,
        productId: product.id,
      });
      
      if (data.message.trim() && conversation?.id) {
        await apiRequest("POST", `/api/conversations/${conversation.id}/messages`, {
          content: data.message,
        });
        // Invalidate conversation detail query to show the new message
        await queryClient.invalidateQueries({ queryKey: ["/api/conversations", conversation.id] });
      }
      
      return conversation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      toast({ 
        title: "Message sent!", 
        description: "Check Messages to see the conversation.",
        action: (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => navigate("/messages")}
          >
            View Messages
          </Button>
        )
      });
      setShowAskSellerDialog(false);
      setInquiryMessage("");
    },
    onError: (error: Error) => {
      toast({ title: "Failed to send message", description: error.message, variant: "destructive" });
    },
  });

  const handleSendInquiry = () => {
    // Check if user is authenticated - redirect to login if not
    if (!user) {
      navigate(`/login?redirect=${encodeURIComponent(`/product/${id}`)}`);
      return;
    }

    if (!inquiryMessage.trim()) {
      toast({ title: "Please enter a message", variant: "destructive" });
      return;
    }
    createInquiryMutation.mutate({ message: inquiryMessage });
  };

  const handleRequestQuote = () => {
    // Check if user is authenticated - redirect to login if not
    if (!user) {
      navigate(`/login?redirect=${encodeURIComponent(`/product/${id}?action=request-quote`)}`);
      return;
    }
    requestQuoteMutation.mutate();
  };

  const handleUploadDesign = () => {
    // Check if user is authenticated - redirect to login if not
    if (!user) {
      navigate(`/login?redirect=${encodeURIComponent(`/product/${id}?action=upload-design`)}`);
      return;
    }
    initiateDesignUploadMutation.mutate();
  };

  const handleAskSeller = () => {
    // Check if user is authenticated - redirect to login if not
    if (!user) {
      navigate(`/login?redirect=${encodeURIComponent(`/product/${id}`)}`);
      return;
    }
    setShowAskSellerDialog(true);
  };
  
  // Auto-trigger workflows based on query params (only for authenticated users)
  useEffect(() => {
    if (!product || !action || !user) return;
    
    if (action === 'upload-design' && product.requiresDesignApproval) {
      // Clear only the action param to avoid re-triggering
      const params = new URLSearchParams(window.location.search);
      params.delete('action');
      const newSearch = params.toString();
      window.history.replaceState({}, '', `/product/${id}${newSearch ? `?${newSearch}` : ''}`);
      // Trigger design upload workflow
      initiateDesignUploadMutation.mutate();
    } else if (action === 'request-quote' && product.requiresQuote) {
      // Clear only the action param to avoid re-triggering
      const params = new URLSearchParams(window.location.search);
      params.delete('action');
      const newSearch = params.toString();
      window.history.replaceState({}, '', `/product/${id}${newSearch ? `?${newSearch}` : ''}`);
      // Trigger quote request workflow
      requestQuoteMutation.mutate();
    }
  }, [product, action, id, user]);

  const selectedVariant = product?.variants?.find((v: any) => v.id === selectedVariantId);
  const maxStock = selectedVariant?.inventory || 0;
  
  // Determine which images to display: variant images if available, otherwise product images
  const displayImages = selectedVariant?.imageUrls && selectedVariant.imageUrls.length > 0 
    ? selectedVariant.imageUrls 
    : product?.images || [];

  if (productLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!product) {
    return (
      <Card>
        <CardContent className="py-16 text-center">
          <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Product not found</h3>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-3">
          <div className="aspect-square overflow-hidden rounded-md bg-muted">
            {displayImages && displayImages[selectedImageIndex] ? (
              <img
                src={displayImages[selectedImageIndex]}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Package className="h-24 w-24 text-muted-foreground" />
              </div>
            )}
          </div>
          
          {/* Image thumbnails */}
          {displayImages && displayImages.length > 1 && (
            <div className="flex gap-2 overflow-x-auto">
              {displayImages.map((image: string, index: number) => (
                <button
                  key={index}
                  onClick={() => setSelectedImageIndex(index)}
                  className={`flex-shrink-0 w-20 h-20 rounded-md overflow-hidden border-2 transition-colors ${
                    selectedImageIndex === index 
                      ? 'border-primary' 
                      : 'border-transparent hover:border-muted-foreground'
                  }`}
                  data-testid={`button-image-thumb-${index}`}
                >
                  <img
                    src={image}
                    alt={`${product.name} ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div>
            <h1 className="text-3xl font-bold font-display">{product.name}</h1>
            <div className="flex items-center gap-2 mt-2">
              <div className="flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`h-4 w-4 ${i < Math.round(parseFloat(averageRating)) ? "fill-primary text-primary" : "text-muted-foreground"}`}
                  />
                ))}
              </div>
              <span className="text-sm text-muted-foreground">
                {averageRating} ({sellerRatings.length} ratings)
              </span>
            </div>
          </div>

          <p className="text-muted-foreground">{product.description}</p>

          {product.seller && (
            <div className="flex items-center gap-2">
              <Badge variant="secondary">Verified Seller</Badge>
              <span className="text-sm">{product.seller.firstName} {product.seller.lastName}</span>
            </div>
          )}

          {product.variants && product.variants.length > 0 && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="variant" className="text-base">Select Variant</Label>
                <Select
                  value={selectedVariantId}
                  onValueChange={(value) => {
                    setSelectedVariantId(value);
                    setQuantity(1);
                    setSelectedImageIndex(0); // Reset to first image when variant changes
                  }}
                >
                  <SelectTrigger id="variant" className="mt-2" data-testid="select-variant">
                    <SelectValue placeholder="Choose size, color, etc." />
                  </SelectTrigger>
                  <SelectContent>
                    {product.variants.map((variant: any) => {
                      // Include same fallback as selectedVariantHasApprovedDesign: 
                      // Show checkmark if variant has approved design OR if it's a single-variant product with any approved design
                      const hasApprovedDesign = 
                        approvedDesigns.some((ad: any) => ad.variantId === variant.id) ||
                        (product?.variants?.length === 1 && approvedDesigns.length > 0);
                      return (
                        <SelectItem
                          key={variant.id}
                          value={variant.id}
                          data-testid={`variant-option-${variant.id}`}
                        >
                          <div className="flex items-center gap-2">
                            {hasApprovedDesign && <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-500" />}
                            <span>{variant.name} - ${parseFloat(variant.price).toFixed(2)} ({variant.inventory} in stock)</span>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              {selectedVariantId && (
                <>
                  {/* Only show quantity/price for products that allow direct cart purchase */}
                  {!product.requiresQuote && (
                    <>
                      <div>
                        <Label htmlFor="quantity" className="text-base">Quantity</Label>
                        <div className="flex items-center gap-3 mt-2">
                          <Button
                            type="button"
                            size="icon"
                            variant="outline"
                            className="min-h-11 min-w-11"
                            onClick={() => setQuantity(Math.max(1, quantity - 1))}
                            disabled={quantity <= 1}
                            data-testid="button-decrease-quantity"
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <Input
                            id="quantity"
                            type="number"
                            min="1"
                            max={maxStock}
                            value={quantity}
                            onChange={(e) => setQuantity(Math.min(maxStock, Math.max(1, parseInt(e.target.value) || 1)))}
                            className="w-24 text-center"
                            data-testid="input-quantity"
                          />
                          <Button
                            type="button"
                            size="icon"
                            variant="outline"
                            className="min-h-11 min-w-11"
                            onClick={() => setQuantity(Math.min(maxStock, quantity + 1))}
                            disabled={quantity >= maxStock}
                            data-testid="button-increase-quantity"
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                          <span className="text-sm text-muted-foreground">
                            {maxStock} available
                          </span>
                        </div>
                      </div>

                      <div className="space-y-3 pt-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-muted-foreground">Total Price</p>
                            <p className="text-3xl font-bold text-primary">
                              ${(parseFloat(selectedVariant.price) * quantity).toFixed(2)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                    
                  {/* Purchase Requirements Check */}
                  <div className="space-y-3 pt-2">
                      {/* BOTH OPTIONS: When both flags enabled, buyers choose their workflow path */}
                      {/* This offers flexibility: standard variant purchase OR custom quote */}
                      {product.requiresDesignApproval && product.requiresQuote && !selectedVariantHasApprovedDesign && (
                        <div className="space-y-3">
                          <div className="text-center">
                            <p className="text-sm font-medium mb-2">Choose Your Purchase Option:</p>
                          </div>
                          
                          {/* Option 1: Standard Variants with Design Approval */}
                          <div className="space-y-2">
                            <p className="text-xs font-medium text-muted-foreground">Option 1: Upload Design for Standard Variant</p>
                            <Button
                              variant="outline"
                              size="lg"
                              onClick={handleUploadDesign}
                              disabled={initiateDesignUploadMutation.isPending}
                              className="w-full gap-2 min-h-11"
                              data-testid="button-upload-design"
                            >
                              <Upload className="h-5 w-5" />
                              {initiateDesignUploadMutation.isPending ? "Opening Messages..." : "Upload Your Design"}
                            </Button>
                            <p className="text-xs text-muted-foreground text-center">
                              Use one of the listed variants with your custom design artwork
                            </p>
                          </div>
                          
                          <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                              <span className="w-full border-t" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                              <span className="bg-background px-2 text-muted-foreground">or</span>
                            </div>
                          </div>
                          
                          {/* Option 2: Custom Quote Request */}
                          <div className="space-y-2">
                            <p className="text-xs font-medium text-muted-foreground">Option 2: Request Custom Quote</p>
                            <Button
                              size="lg"
                              variant="outline"
                              onClick={handleRequestQuote}
                              disabled={requestQuoteMutation.isPending}
                              className="w-full gap-2 min-h-11"
                              data-testid="button-request-quote"
                            >
                              <FileText className="h-5 w-5" />
                              {requestQuoteMutation.isPending ? "Sending Request..." : "Get Custom Quote"}
                            </Button>
                            <p className="text-xs text-muted-foreground text-center">
                              For custom specifications, sizes, or quantities not listed above
                            </p>
                          </div>
                        </div>
                      )}
                      
                      {/* BOTH OPTIONS - After Design Approved: Show Add to Cart */}
                      {product.requiresDesignApproval && product.requiresQuote && selectedVariantHasApprovedDesign && (
                        <div className="space-y-3">
                          <Badge variant="default" className="w-full justify-center py-2">
                            Design Approved ✓
                          </Badge>
                          <Button
                            size="lg"
                            onClick={handleAddToCart}
                            disabled={addToCartMutation.isPending || maxStock === 0}
                            className="w-full gap-2 min-h-11"
                            data-testid="button-add-to-cart"
                          >
                            <ShoppingCart className="h-5 w-5" />
                            {addToCartMutation.isPending ? "Adding..." : "Add to Cart"}
                          </Button>
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleUploadDesign}
                            disabled={initiateDesignUploadMutation.isPending}
                            className="w-full gap-2 min-h-11"
                            data-testid="button-submit-new-design"
                          >
                            <Upload className="h-5 w-5" />
                            {initiateDesignUploadMutation.isPending ? "Opening Messages..." : "Submit New Design"}
                          </Button>
                          
                          <p className="text-xs text-muted-foreground text-center">
                            Submit a different design? It will replace your current approved design once the seller approves it.
                          </p>
                        </div>
                      )}

                      {/* QUOTE ONLY: Only quote workflow available */}
                      {!product.requiresDesignApproval && product.requiresQuote && (
                        <div className="space-y-2">
                          {!activeQuote ? (
                            <Button
                              size="lg"
                              variant="default"
                              onClick={handleRequestQuote}
                              disabled={requestQuoteMutation.isPending}
                              className="w-full gap-2 min-h-11"
                              data-testid="button-request-quote"
                            >
                              <FileText className="h-5 w-5" />
                              {requestQuoteMutation.isPending ? "Sending Request..." : "Request Custom Quote"}
                            </Button>
                          ) : activeQuote?.status !== "accepted" && (
                            <div className="space-y-2">
                              <Badge variant="secondary" className="w-full justify-center py-2">
                                Quote Requested - Pending Seller Response
                              </Badge>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => navigate("/messages")}
                                className="w-full min-h-11"
                                data-testid="button-view-quote-messages"
                              >
                                View Messages
                              </Button>
                            </div>
                          )}
                          <p className="text-xs text-muted-foreground text-center">
                            This product requires a custom quote
                          </p>
                        </div>
                      )}

                      {/* DESIGN APPROVAL ONLY: Standard variant with design approval */}
                      {product.requiresDesignApproval && !product.requiresQuote && !selectedVariantHasApprovedDesign && (
                        <div className="space-y-2">
                          <Badge variant="secondary" className="w-full justify-center py-2">
                            Design Approval Required
                          </Badge>
                          <Button
                            variant="outline"
                            size="lg"
                            onClick={handleUploadDesign}
                            disabled={initiateDesignUploadMutation.isPending}
                            className="w-full gap-2 min-h-11"
                            data-testid="button-upload-design"
                          >
                            <Upload className="h-5 w-5" />
                            {initiateDesignUploadMutation.isPending ? "Opening Messages..." : "Upload Design"}
                          </Button>
                          <p className="text-xs text-muted-foreground text-center">
                            Upload your design files and get seller approval before adding to cart
                          </p>
                        </div>
                      )}

                      {/* STANDARD: Add to Cart - No special requirements */}
                      {!product.requiresDesignApproval && !product.requiresQuote && (
                        <Button
                          size="lg"
                          onClick={handleAddToCart}
                          disabled={addToCartMutation.isPending || maxStock === 0}
                          className="w-full gap-2 min-h-11"
                          data-testid="button-add-to-cart"
                        >
                          <ShoppingCart className="h-5 w-5" />
                          {addToCartMutation.isPending ? "Adding..." : "Add to Cart"}
                        </Button>
                      )}
                      
                      {/* Add to Cart - Show after design approval (for design-only products) */}
                      {product.requiresDesignApproval && !product.requiresQuote && selectedVariantHasApprovedDesign && (
                        <div className="space-y-3">
                          <Button
                            size="lg"
                            onClick={handleAddToCart}
                            disabled={addToCartMutation.isPending || maxStock === 0}
                            className="w-full gap-2 min-h-11"
                            data-testid="button-add-to-cart"
                          >
                            <ShoppingCart className="h-5 w-5" />
                            {addToCartMutation.isPending ? "Adding..." : "Add to Cart"}
                          </Button>
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleUploadDesign}
                            disabled={initiateDesignUploadMutation.isPending}
                            className="w-full gap-2 min-h-11"
                            data-testid="button-submit-new-design"
                          >
                            <Upload className="h-5 w-5" />
                            {initiateDesignUploadMutation.isPending ? "Opening Messages..." : "Submit New Design"}
                          </Button>
                          
                          <p className="text-xs text-muted-foreground text-center">
                            Submit a different design? It will replace your current approved design once the seller approves it.
                          </p>
                        </div>
                      )}
                    </div>
                </>
              )}
            </div>
          )}

          {/* Only show general inquiry button for standard products without special workflows */}
          {product.seller && !product.requiresDesignApproval && !product.requiresQuote && (
            <Button
              variant="outline"
              size="lg"
              onClick={handleAskSeller}
              className="w-full gap-2 mt-4"
              data-testid="button-ask-seller"
            >
              <MessageCircle className="h-5 w-5" />
              Ask Seller a Question
            </Button>
          )}
        </div>
      </div>

      <Separator />

      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold">Seller Ratings</h2>
          <Badge variant="secondary" className="flex items-center gap-1">
            <Shield className="h-3 w-3" />
            Verified Transactions Only
          </Badge>
        </div>

        <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900">
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">
              These ratings are from verified buyers who purchased from this seller and received their orders or completed their service bookings. You can only rate a seller after your transaction is complete.
            </p>
          </CardContent>
        </Card>

        {ratingsLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6 space-y-3">
                  <Skeleton className="h-5 w-1/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <RatingDisplay ratings={sellerRatings} showBuyerInfo={true} />
        )}
      </div>

      <Dialog open={showAskSellerDialog} onOpenChange={setShowAskSellerDialog}>
        <DialogContent data-testid="dialog-ask-seller-product">
          <DialogHeader>
            <DialogTitle>Ask Seller a Question</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-4">
              {product.images && product.images[0] && (
                <img
                  src={product.images[0]}
                  alt={product.name}
                  className="w-20 h-20 object-cover rounded"
                />
              )}
              <div className="flex-1">
                <h3 className="font-semibold">{product.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {product.seller 
                    ? `Seller: ${product.seller.firstName} ${product.seller.lastName}`
                    : "Seller information not available"}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="product-inquiry-message">Your Question</Label>
              <Textarea
                id="product-inquiry-message"
                placeholder="Ask about pricing, availability, customization options, or anything else..."
                value={inquiryMessage}
                onChange={(e) => setInquiryMessage(e.target.value)}
                rows={5}
                data-testid="textarea-product-inquiry"
              />
              <p className="text-xs text-muted-foreground">
                Your message will be sent to the seller. You can track the conversation in your Messages page.
              </p>
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setShowAskSellerDialog(false);
                  setInquiryMessage("");
                }}
                data-testid="button-cancel-product-inquiry"
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={handleSendInquiry}
                disabled={createInquiryMutation.isPending || !inquiryMessage.trim()}
                data-testid="button-send-product-inquiry"
              >
                {createInquiryMutation.isPending ? "Sending..." : "Send Message"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
