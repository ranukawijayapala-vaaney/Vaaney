import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CreditCard, MapPin, Package, DollarSign, Loader2, Building2, Info } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { ShippingAddress } from "@shared/schema";

interface PurchaseQuoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quote: {
    id: string;
    quotedPrice: string;
    quantity: number;
    productId?: string;
    serviceId?: string;
    designApprovalId?: string;
    notes?: string;
  };
  itemName?: string;
}

export function PurchaseQuoteDialog({
  open,
  onOpenChange,
  quote,
  itemName,
}: PurchaseQuoteDialogProps) {
  const { toast } = useToast();
  const [selectedAddressId, setSelectedAddressId] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<"ipg" | "bank_transfer">("ipg");

  // Fetch shipping addresses
  const { data: shippingAddresses = [], isLoading: addressesLoading} = useQuery<ShippingAddress[]>({
    queryKey: ["/api/shipping-addresses"],
    enabled: open,
  });

  // Fetch bank accounts
  const { data: bankAccounts = [], isLoading: bankAccountsLoading } = useQuery<any[]>({
    queryKey: ["/api/bank-accounts?currency=USD"],
    enabled: open,
  });

  // Calculate actual shipping cost when address is selected
  const { data: shippingData, isLoading: shippingLoading } = useQuery<{ shippingCost: string; productWeight: number; productDimensions: string }>({
    queryKey: ["/api/quotes", quote.id, "calculate-shipping", selectedAddressId],
    queryFn: async () => {
      const response = await apiRequest("POST", `/api/quotes/${quote.id}/calculate-shipping`, {
        shippingAddressId: selectedAddressId,
      });
      return response;
    },
    enabled: !!selectedAddressId && !!quote.productId,
  });

  const shippingCost = shippingData ? parseFloat(shippingData.shippingCost) : 0;

  // Purchase quote mutation
  const purchaseQuoteMutation = useMutation({
    mutationFn: async () => {
      if (!selectedAddressId) {
        throw new Error("Please select a shipping address");
      }

      return await apiRequest("POST", `/api/quotes/${quote.id}/purchase`, {
        shippingAddressId: selectedAddressId,
        paymentMethod,
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/quotes/active"] });
      
      toast({ 
        title: "Order created successfully!",
        description: paymentMethod === "bank_transfer" 
          ? "Please upload your payment slip to complete the order."
          : "Opening payment gateway..."
      });
      onOpenChange(false);

      if (paymentMethod === "ipg" && data.mpgsSessionId) {
        import("@/lib/mpgs").then(({ launchMpgsCheckout }) => {
          launchMpgsCheckout(data.mpgsSessionId).catch(() => {
            toast({ title: "Payment gateway error", description: "Please try again.", variant: "destructive" });
          });
        });
      }
    },
    onError: (error: Error) => {
      toast({ 
        title: "Failed to create order", 
        description: error.message, 
        variant: "destructive" 
      });
    },
  });

  const handlePurchase = () => {
    purchaseQuoteMutation.mutate();
  };

  const selectedAddress = shippingAddresses.find((addr) => addr.id === selectedAddressId);
  const productTotal = parseFloat(quote.quotedPrice) * quote.quantity;
  const totalAmount = productTotal + shippingCost;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="dialog-purchase-quote">
        <DialogHeader>
          <DialogTitle>Complete Purchase</DialogTitle>
          <DialogDescription>
            Review your order details and select shipping address and payment method
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Order Summary */}
          <div className="space-y-3">
            <h3 className="font-semibold flex items-center gap-2">
              <Package className="h-4 w-4" />
              Order Summary
            </h3>
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Item</span>
                <span className="text-sm font-medium">{itemName || "Custom Quote"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Quantity</span>
                <span className="text-sm font-medium">{quote.quantity}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Price per unit</span>
                <span className="text-sm font-medium">${parseFloat(quote.quotedPrice).toFixed(2)}</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Product Total</span>
                <span className="text-sm font-medium">${productTotal.toFixed(2)}</span>
              </div>
              {quote.productId && (
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Shipping Cost</span>
                  <span className="text-sm font-medium">
                    {!selectedAddressId ? (
                      "Select address"
                    ) : shippingLoading ? (
                      "Calculating..."
                    ) : (
                      `$${shippingCost.toFixed(2)}`
                    )}
                  </span>
                </div>
              )}
              {quote.notes && (
                <>
                  <Separator />
                  <div>
                    <span className="text-sm text-muted-foreground">Notes</span>
                    <p className="text-sm mt-1">{quote.notes}</p>
                  </div>
                </>
              )}
              <Separator />
              <div className="flex justify-between items-center pt-2">
                <span className="font-semibold flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Total Amount
                </span>
                <span className="text-lg font-bold">${totalAmount.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Shipping Address Selection */}
          <div className="space-y-3">
            <h3 className="font-semibold flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Shipping Address
            </h3>
            {addressesLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : shippingAddresses.length === 0 ? (
              <div className="text-center py-8 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  No shipping addresses found. Please add a shipping address in your profile.
                </p>
              </div>
            ) : (
              <>
                <Select value={selectedAddressId} onValueChange={setSelectedAddressId}>
                  <SelectTrigger data-testid="select-shipping-address">
                    <SelectValue placeholder="Select shipping address" />
                  </SelectTrigger>
                  <SelectContent>
                    {shippingAddresses.map((address) => (
                      <SelectItem key={address.id} value={address.id}>
                        Address - {address.recipientName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                {selectedAddress && (
                  <div className="bg-muted/50 rounded-lg p-4 text-sm space-y-1">
                    <p className="font-medium">{selectedAddress.recipientName}</p>
                    <p>{selectedAddress.streetAddress}</p>
                    <p>{selectedAddress.city}, {selectedAddress.postalCode}</p>
                    <p>{selectedAddress.country}</p>
                    <p>Phone: {selectedAddress.contactNumber}</p>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Payment Method Selection */}
          <div className="space-y-3">
            <h3 className="font-semibold flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Payment Method
            </h3>
            <RadioGroup value={paymentMethod} onValueChange={(value: any) => setPaymentMethod(value)}>
              <div className="flex items-center space-x-2 bg-muted/50 rounded-lg p-4">
                <RadioGroupItem value="ipg" id="ipg" data-testid="radio-payment-ipg" />
                <Label htmlFor="ipg" className="flex-1 cursor-pointer">
                  <div>
                    <p className="font-medium">Internet Payment Gateway (IPG)</p>
                    <p className="text-sm text-muted-foreground">Pay securely with your card</p>
                  </div>
                </Label>
              </div>
              <div className="flex items-center space-x-2 bg-muted/50 rounded-lg p-4">
                <RadioGroupItem value="bank_transfer" id="bank_transfer" data-testid="radio-payment-bank" />
                <Label htmlFor="bank_transfer" className="flex-1 cursor-pointer">
                  <div>
                    <p className="font-medium">Bank Transfer</p>
                    <p className="text-sm text-muted-foreground">
                      Pay via bank transfer and upload payment slip
                    </p>
                  </div>
                </Label>
              </div>
            </RadioGroup>

            {/* Bank Account Details */}
            {paymentMethod === "bank_transfer" && (() => {
              // Show loading state while bank accounts are being fetched
              if (bankAccountsLoading) {
                return (
                  <div className="flex items-center justify-center py-8 bg-muted/50 rounded-lg">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                );
              }

              const defaultAccount = bankAccounts.find((acc: any) => acc.isDefault) || bankAccounts[0];
              
              // Only show "no accounts" message after loading is complete
              if (!defaultAccount) {
                return (
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      No bank accounts available. Please contact support.
                    </AlertDescription>
                  </Alert>
                );
              }

              return (
                <Alert className="border-primary bg-primary/5">
                  <Building2 className="h-4 w-4 text-primary" />
                  <AlertDescription>
                    <div className="space-y-3">
                      <div>
                        <span className="text-xs font-medium text-muted-foreground">Bank Name</span>
                        <p className="font-semibold mt-0.5" data-testid="text-bank-name">{defaultAccount.bankName}</p>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <span className="text-xs font-medium text-muted-foreground">Account Number</span>
                          <p className="font-mono font-semibold mt-0.5" data-testid="text-account-number">{defaultAccount.accountNumber}</p>
                        </div>
                        <div>
                          <span className="text-xs font-medium text-muted-foreground">Account Holder</span>
                          <p className="font-semibold mt-0.5" data-testid="text-account-holder">{defaultAccount.accountHolderName}</p>
                        </div>
                      </div>

                      {(defaultAccount.swiftCode || defaultAccount.iban || defaultAccount.routingNumber) && (
                        <div className="grid grid-cols-2 gap-3">
                          {defaultAccount.swiftCode && (
                            <div>
                              <span className="text-xs font-medium text-muted-foreground">SWIFT Code</span>
                              <p className="font-mono font-semibold mt-0.5" data-testid="text-swift-code">{defaultAccount.swiftCode}</p>
                            </div>
                          )}
                          {defaultAccount.iban && (
                            <div>
                              <span className="text-xs font-medium text-muted-foreground">IBAN</span>
                              <p className="font-mono font-semibold mt-0.5 text-xs" data-testid="text-iban">{defaultAccount.iban}</p>
                            </div>
                          )}
                          {defaultAccount.routingNumber && (
                            <div>
                              <span className="text-xs font-medium text-muted-foreground">Routing Number</span>
                              <p className="font-mono font-semibold mt-0.5" data-testid="text-routing-number">{defaultAccount.routingNumber}</p>
                            </div>
                          )}
                        </div>
                      )}

                      {defaultAccount.transferInstructions && (
                        <div className="border-t border-primary/20 pt-3 mt-3">
                          <span className="text-xs font-medium text-muted-foreground">Transfer Instructions</span>
                          <p className="text-xs mt-1 leading-relaxed" data-testid="text-transfer-instructions">{defaultAccount.transferInstructions}</p>
                        </div>
                      )}

                      <p className="text-xs text-muted-foreground italic border-t border-primary/20 pt-3 mt-3">
                        Your order will be confirmed after admin verifies your payment.
                      </p>
                    </div>
                  </AlertDescription>
                </Alert>
              );
            })()}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={purchaseQuoteMutation.isPending}>
            Cancel
          </Button>
          <Button 
            onClick={handlePurchase} 
            disabled={!selectedAddressId || purchaseQuoteMutation.isPending || shippingAddresses.length === 0 || (!!quote.productId && shippingLoading)}
            data-testid="button-confirm-purchase"
          >
            {purchaseQuoteMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <CreditCard className="h-4 w-4 mr-2" />
                Confirm Purchase (${totalAmount.toFixed(2)})
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
