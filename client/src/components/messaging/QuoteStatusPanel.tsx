import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, DollarSign, Calendar, CheckCircle, XCircle, Clock, Package, Paintbrush, ShoppingCart, CreditCard } from "lucide-react";
import { format } from "date-fns";
import { useQuoteState } from "@/hooks/use-quote-state";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { PurchaseQuoteDialog } from "./PurchaseQuoteDialog";

interface QuoteStatusPanelProps {
  conversationId: string;
  productId?: string;
  serviceId?: string;
  userRole: "buyer" | "seller";
  itemName?: string;
  variants?: any[];
  packages?: any[];
  buyerId?: string;
}

export function QuoteStatusPanel({
  conversationId,
  productId,
  serviceId,
  userRole,
  itemName,
  variants = [],
  packages = [],
  buyerId,
}: QuoteStatusPanelProps) {
  const { toast } = useToast();
  
  const {
    activeQuote,
    isLoading,
    createQuote,
    isCreating,
    acceptQuote,
    isAccepting,
    rejectQuote,
    isRejecting,
  } = useQuoteState(conversationId, productId, serviceId);

  const [amount, setAmount] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [selectedVariantId, setSelectedVariantId] = useState<string>("custom");
  const [selectedPackageId, setSelectedPackageId] = useState<string>("custom");
  const [selectedDesignApprovalId, setSelectedDesignApprovalId] = useState<string>("");
  const [expiresAt, setExpiresAt] = useState("");
  const [notes, setNotes] = useState("");
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [showPurchaseDialog, setShowPurchaseDialog] = useState(false);

  // Add to cart mutation for accepted quotes
  const addToCartMutation = useMutation({
    mutationFn: async () => {
      if (!activeQuote) throw new Error("No active quote");
      
      // Use variant or package ID from the quote
      const variantId = activeQuote.productVariantId;
      if (!variantId) {
        throw new Error("Quote does not have a valid product variant");
      }

      return await apiRequest("POST", "/api/cart", {
        productVariantId: variantId,
        quantity: activeQuote.quantity,
        quoteId: activeQuote.id,
        designApprovalId: activeQuote.designApprovalId || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cart"] });
      toast({ title: "Added to cart successfully" });
    },
    onError: (error: Error) => {
      toast({ 
        title: "Failed to add to cart", 
        description: error.message, 
        variant: "destructive" 
      });
    },
  });

  // Fetch approved designs for buyer if seller is viewing
  const { data: approvedDesigns = [] } = useQuery({
    queryKey: ["/api/design-approvals/buyer", buyerId, "approved"],
    queryFn: () => buyerId ? apiRequest("GET", `/api/design-approvals/buyer/${buyerId}?status=approved`) : Promise.resolve([]),
    enabled: userRole === "seller" && !!buyerId && !!productId,
  });

  // Get approved designs for this product (for independent selection)
  const productApprovedDesigns = productId && userRole === "seller" 
    ? approvedDesigns.filter((d: any) => d.productId === productId)
    : [];

  // Auto-select if only one variant/package exists (but don't auto-select for products - default to custom)
  useEffect(() => {
    if (packages.length === 1) {
      setSelectedPackageId(packages[0].id);
    }
  }, [packages]);

  const handleCreateQuote = () => {
    const parsedAmount = parseFloat(amount);
    const parsedQuantity = parseInt(quantity);
    
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return;
    }
    if (isNaN(parsedQuantity) || parsedQuantity < 1) {
      return;
    }

    createQuote({
      amount: parsedAmount,
      quantity: parsedQuantity,
      productVariantId: selectedVariantId && selectedVariantId !== "custom" ? selectedVariantId : undefined,
      servicePackageId: selectedPackageId && selectedPackageId !== "custom" ? selectedPackageId : undefined,
      designApprovalId: selectedDesignApprovalId || undefined,
      expiresAt: expiresAt || undefined,
      notes: notes || undefined,
    });

    // Reset form
    setAmount("");
    setQuantity("1");
    setSelectedVariantId("custom");
    setSelectedPackageId("custom");
    setSelectedDesignApprovalId("");
    setExpiresAt("");
    setNotes("");
  };

  const handleAcceptQuote = () => {
    if (activeQuote?.id) {
      acceptQuote(activeQuote.id);
    }
  };

  const handleRejectQuote = () => {
    if (activeQuote?.id) {
      rejectQuote({ quoteId: activeQuote.id, reason: rejectReason || undefined });
      setShowRejectDialog(false);
      setRejectReason("");
    }
  };

  if (isLoading) {
    return (
      <Card className="mb-4">
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground">Loading quote information...</p>
        </CardContent>
      </Card>
    );
  }

  // Seller view - Show quote form or existing quote
  if (userRole === "seller") {
    return (
      <Card className="mb-4" data-testid="card-quote-status-panel">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Custom Quote</CardTitle>
          </div>
          {itemName && (
            <CardDescription>For: {itemName}</CardDescription>
          )}
          {!activeQuote && (
            <div className="mt-2 p-2 bg-purple-50 dark:bg-purple-900/20 rounded-md border border-purple-200 dark:border-purple-800">
              <p className="text-xs text-purple-800 dark:text-purple-200">
                <strong>Custom Quote Request:</strong> The buyer has requested a custom quote. Provide pricing for their specific requirements.
              </p>
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {activeQuote && (
            <>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <Badge 
                    variant={
                      activeQuote.status === "accepted" ? "default" :
                      activeQuote.status === "rejected" ? "destructive" :
                      activeQuote.status === "expired" ? "secondary" :
                      "secondary"
                    }
                    data-testid="badge-quote-status"
                  >
                    {activeQuote.status === "pending" && <Clock className="h-3 w-3 mr-1" />}
                    {activeQuote.status === "accepted" && <CheckCircle className="h-3 w-3 mr-1" />}
                    {activeQuote.status === "rejected" && <XCircle className="h-3 w-3 mr-1" />}
                    {activeQuote.status.replace("_", " ")}
                  </Badge>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Quote Amount</span>
                  <span className="text-lg font-semibold" data-testid="text-quote-amount">
                    ${parseFloat(activeQuote.quotedPrice).toFixed(2)}
                  </span>
                </div>

                {activeQuote.expiresAt && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Expires</span>
                    <span className="text-sm" data-testid="text-quote-expires">
                      {format(new Date(activeQuote.expiresAt), "MMM dd, yyyy")}
                    </span>
                  </div>
                )}

                {activeQuote.notes && (
                  <>
                    <Separator />
                    <div>
                      <span className="text-sm text-muted-foreground">Notes</span>
                      <p className="text-sm mt-1" data-testid="text-quote-notes">{activeQuote.notes}</p>
                    </div>
                  </>
                )}
              </div>

              {activeQuote.status === "pending" && (
                <p className="text-xs text-muted-foreground">
                  Waiting for buyer to accept or reject this quote.
                </p>
              )}
              {activeQuote.status === "accepted" && (
                <p className="text-xs text-green-600">
                  Quote accepted! The buyer can now proceed with purchase.
                </p>
              )}

              <Separator className="my-4" />
              
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Send Updated Quote</h4>
                <p className="text-xs text-muted-foreground">
                  Create a new quote to supersede the current one. The buyer will be notified.
                </p>
              </div>
            </>
          )}

          {/* Always show create quote form for sellers */}
          <div className="space-y-3">
              {/* Approved Design Selection (Independent) */}
              {productId && productApprovedDesigns.length > 0 && (
                <div>
                  <Label htmlFor="design-select">Use Approved Design (Optional)</Label>
                  <Select value={selectedDesignApprovalId} onValueChange={setSelectedDesignApprovalId}>
                    <SelectTrigger id="design-select" data-testid="select-approved-design">
                      <SelectValue placeholder="No design selected..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">
                        <span className="text-muted-foreground">No design</span>
                      </SelectItem>
                      {productApprovedDesigns.map((design: any) => {
                        const variant = variants.find(v => v.id === design.variantId);
                        return (
                          <SelectItem key={design.id} value={design.id}>
                            <div className="flex items-center gap-2">
                              <Paintbrush className="h-4 w-4 text-primary" />
                              <span>
                                {variant ? `${variant.name} - ` : ""}Approved Design
                              </span>
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Select a buyer's approved design to use with this quote
                  </p>
                </div>
              )}

              {/* Variant/Package Selection for Products/Services */}
              {productId && (
                <div>
                  <Label htmlFor="variant-select">Select Variant (Optional)</Label>
                  <Select value={selectedVariantId} onValueChange={setSelectedVariantId}>
                    <SelectTrigger id="variant-select" data-testid="select-variant">
                      <SelectValue placeholder="Choose variant or custom..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="custom">
                        <div className="flex items-center gap-2">
                          <Paintbrush className="h-4 w-4 text-primary" />
                          <span className="font-medium">Custom Specifications</span>
                        </div>
                      </SelectItem>
                      {variants.length > 0 && <Separator className="my-1" />}
                      {variants.map((variant: any) => (
                        <SelectItem key={variant.id} value={variant.id}>
                          {variant.name} - ${parseFloat(variant.price).toFixed(2)}
                          {variant.stock !== null && variant.stock !== undefined && ` (Stock: ${variant.stock})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Select an existing variant or choose custom for specifications not listed
                  </p>
                </div>
              )}

              {serviceId && (
                <div>
                  <Label htmlFor="package-select">Select Package (Optional)</Label>
                  <Select value={selectedPackageId} onValueChange={setSelectedPackageId}>
                    <SelectTrigger id="package-select" data-testid="select-package">
                      <SelectValue placeholder="Choose package or custom..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="custom">
                        <div className="flex items-center gap-2">
                          <Paintbrush className="h-4 w-4 text-primary" />
                          <span className="font-medium">Custom Specifications</span>
                        </div>
                      </SelectItem>
                      {packages.length > 0 && <Separator className="my-1" />}
                      {packages.map((pkg) => (
                        <SelectItem key={pkg.id} value={pkg.id}>
                          {pkg.name} - ${parseFloat(pkg.price).toFixed(2)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Select an existing package or choose custom for specifications not listed
                  </p>
                </div>
              )}

              <div>
                <Label htmlFor="quote-quantity">Quantity</Label>
                <div className="relative">
                  <Package className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="quote-quantity"
                    type="number"
                    min="1"
                    step="1"
                    placeholder="1"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="pl-9"
                    data-testid="input-quote-quantity"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="quote-amount">Custom Quote Amount (USD)</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="quote-amount"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="pl-9"
                    data-testid="input-quote-amount"
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Enter your custom quote price for the selected item and quantity
                </p>
              </div>

              <div>
                <Label htmlFor="quote-expires">Expiration Date (Optional)</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="quote-expires"
                    type="date"
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                    className="pl-9"
                    min={new Date().toISOString().split("T")[0]}
                    data-testid="input-quote-expires"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="quote-notes">Notes (Optional)</Label>
                <Textarea
                  id="quote-notes"
                  placeholder="Additional details about this quote..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  data-testid="textarea-quote-notes"
                />
              </div>

              <Button
                onClick={handleCreateQuote}
                disabled={
                  !amount || 
                  parseFloat(amount) <= 0 || 
                  !quantity || 
                  parseInt(quantity) < 1 ||
                  (serviceId && !selectedPackageId) ||
                  isCreating
                }
                className="w-full"
                data-testid="button-send-quote"
              >
                <FileText className="h-4 w-4 mr-2" />
                {isCreating ? "Sending..." : (activeQuote ? "Send Updated Quote" : "Send Quote")}
              </Button>
            </div>
        </CardContent>
      </Card>
    );
  }

  // Buyer view - Show quote request option or existing quote
  if (!activeQuote) {
    // Show quote request interface for buyers
    return (
      <Card className="mb-4" data-testid="card-quote-status-panel">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Request Custom Quote</CardTitle>
          </div>
          {itemName && (
            <CardDescription>For: {itemName}</CardDescription>
          )}
          <div className="mt-2 p-2 bg-purple-50 dark:bg-purple-900/20 rounded-md border border-purple-200 dark:border-purple-800">
            <p className="text-xs text-purple-800 dark:text-purple-200">
              <strong>Custom Quote Workflow:</strong> Request a custom quote for specifications or pricing not listed in standard variants. The seller will review your request and provide pricing details.
            </p>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              This product supports custom quotes for specifications not listed in standard variants.
            </p>
            <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-md border border-blue-200 dark:border-blue-800">
              <p className="text-sm text-blue-700 dark:text-blue-300 font-medium mb-2">
                How it works:
              </p>
              <ol className="text-sm text-blue-700 dark:text-blue-300 space-y-1 list-decimal list-inside">
                <li>Describe your custom specifications in the chat</li>
                <li>Upload your design if needed</li>
                <li>The seller will send you a custom quote</li>
                <li>Review and accept the quote to proceed</li>
              </ol>
            </div>
            <p className="text-xs text-muted-foreground italic">
              Send a message to the seller describing your custom requirements to get started.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="mb-4" data-testid="card-quote-status-panel">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Custom Quote</CardTitle>
          </div>
          {itemName && (
            <CardDescription>For: {itemName}</CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Status</span>
              <Badge 
                variant={
                  activeQuote.status === "accepted" ? "default" :
                  activeQuote.status === "rejected" ? "destructive" :
                  activeQuote.status === "expired" ? "secondary" :
                  "secondary"
                }
                data-testid="badge-quote-status"
              >
                {activeQuote.status === "pending" && <Clock className="h-3 w-3 mr-1" />}
                {activeQuote.status === "accepted" && <CheckCircle className="h-3 w-3 mr-1" />}
                {activeQuote.status === "rejected" && <XCircle className="h-3 w-3 mr-1" />}
                {activeQuote.status.replace("_", " ")}
              </Badge>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Quote Amount</span>
              <span className="text-lg font-semibold" data-testid="text-quote-amount">
                ${parseFloat(activeQuote.quotedPrice).toFixed(2)}
              </span>
            </div>

            {activeQuote.expiresAt && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Expires</span>
                <span className="text-sm" data-testid="text-quote-expires">
                  {format(new Date(activeQuote.expiresAt), "MMM dd, yyyy")}
                </span>
              </div>
            )}

            {activeQuote.notes && (
              <>
                <Separator />
                <div>
                  <span className="text-sm text-muted-foreground">Notes</span>
                  <p className="text-sm mt-1" data-testid="text-quote-notes">{activeQuote.notes}</p>
                </div>
              </>
            )}
          </div>

          {(activeQuote.status === "pending" || activeQuote.status === "sent") && (
            <div className="flex gap-2">
              <Button
                onClick={handleAcceptQuote}
                disabled={isAccepting}
                className="flex-1"
                data-testid="button-accept-quote"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                {isAccepting ? "Accepting..." : "Accept Quote"}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowRejectDialog(true)}
                disabled={isRejecting}
                className="flex-1"
                data-testid="button-reject-quote"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Reject
              </Button>
            </div>
          )}

          {activeQuote.status === "accepted" && (
            <div className="space-y-2">
              <Badge variant="default" className="w-full justify-center py-2">
                Quote Accepted ✓
              </Badge>
              {/* Only show Add to Cart for product quotes with a variant */}
              {activeQuote.productVariantId ? (
                <>
                  <Button
                    onClick={() => addToCartMutation.mutate()}
                    disabled={addToCartMutation.isPending}
                    className="w-full gap-2"
                    data-testid="button-add-quote-to-cart"
                  >
                    <ShoppingCart className="h-4 w-4" />
                    {addToCartMutation.isPending ? "Adding..." : `Add to Cart (Qty: ${activeQuote.quantity})`}
                  </Button>
                  <p className="text-xs text-muted-foreground text-center">
                    This will add {activeQuote.quantity} item(s) at ${parseFloat(activeQuote.quotedPrice).toFixed(2)} each to your cart
                  </p>
                </>
              ) : (
                <>
                  {activeQuote.servicePackageId ? (
                    <p className="text-sm text-muted-foreground text-center">
                      Please create a booking for this service quote
                    </p>
                  ) : (
                    <>
                      <Button
                        onClick={() => setShowPurchaseDialog(true)}
                        className="w-full gap-2"
                        data-testid="button-purchase-custom-quote"
                      >
                        <CreditCard className="h-4 w-4" />
                        Purchase Now (${parseFloat(activeQuote.quotedPrice).toFixed(2)})
                      </Button>
                      <p className="text-xs text-muted-foreground text-center">
                        This quote is for custom specifications - complete purchase directly
                      </p>
                    </>
                  )}
                </>
              )}
            </div>
          )}

          {activeQuote.status === "rejected" && (
            <p className="text-xs text-muted-foreground">
              You rejected this quote.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent data-testid="dialog-reject-quote">
          <DialogHeader>
            <DialogTitle>Reject Quote</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this quote (optional).
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
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRejectQuote}
              disabled={isRejecting}
              data-testid="button-confirm-reject"
            >
              {isRejecting ? "Rejecting..." : "Reject Quote"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Purchase Dialog for Custom Quotes */}
      {activeQuote && (
        <PurchaseQuoteDialog
          open={showPurchaseDialog}
          onOpenChange={setShowPurchaseDialog}
          quote={activeQuote}
          itemName={itemName}
        />
      )}
    </>
  );
}
