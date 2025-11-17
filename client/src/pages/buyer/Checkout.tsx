import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ShoppingCart, CreditCard, Building2, Plus, MapPin, Info, AlertCircle, Upload, FileText, X } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import type { BankAccount } from "@shared/schema";

const checkoutSchema = z.object({
  notes: z.string().optional(),
  paymentMethod: z.enum(["bank_transfer", "ipg"], {
    required_error: "Please select a payment method",
  }),
  bankAccountId: z.string().optional(),
  transferSlipUrl: z.string().optional(),
}).refine(
  (data) => {
    // Require bank account when bank transfer is selected
    if (data.paymentMethod === "bank_transfer" && !data.bankAccountId) {
      return false;
    }
    return true;
  },
  {
    message: "Please select a bank account for bank transfer payments",
    path: ["bankAccountId"],
  }
).refine(
  (data) => {
    // Require transfer slip when bank transfer is selected
    if (data.paymentMethod === "bank_transfer" && !data.transferSlipUrl) {
      return false;
    }
    return true;
  },
  {
    message: "Please upload your payment transfer slip",
    path: ["transferSlipUrl"],
  }
);

const newAddressSchema = z.object({
  recipientName: z.string().min(2, "Recipient name is required"),
  contactNumber: z.string().min(7, "Contact number is required"),
  streetAddress: z.string().min(5, "Street address is required"),
  city: z.string().min(2, "City is required"),
  postalCode: z.string().min(4, "Postal code is required"),
  country: z.string().min(2, "Country is required"),
});

type CheckoutFormData = z.infer<typeof checkoutSchema>;
type NewAddressFormData = z.infer<typeof newAddressSchema>;

export default function Checkout() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [isProcessing, setIsProcessing] = useState(false);
  const [shippingCost, setShippingCost] = useState<number | null>(null);
  const [isCalculatingShipping, setIsCalculatingShipping] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [isAddressDialogOpen, setIsAddressDialogOpen] = useState(false);
  const [transferSlipObjectPath, setTransferSlipObjectPath] = useState<string>("");
  const [isUploadingSlip, setIsUploadingSlip] = useState(false);

  const { data: cartItems = [] } = useQuery<any[]>({
    queryKey: ["/api/cart"],
  });

  const { data: allProducts = [] } = useQuery<any[]>({
    queryKey: ["/api/products"],
  });

  const { data: shippingAddresses = [] } = useQuery<any[]>({
    queryKey: ["/api/shipping-addresses"],
  });

  const { data: bankAccounts = [] } = useQuery<BankAccount[]>({
    queryKey: ["/api/bank-accounts"],
  });

  const form = useForm<CheckoutFormData>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      notes: "",
      paymentMethod: "ipg",
      bankAccountId: "",
      transferSlipUrl: "",
    },
  });

  const addressForm = useForm<NewAddressFormData>({
    resolver: zodResolver(newAddressSchema),
    defaultValues: {
      recipientName: "",
      contactNumber: "",
      streetAddress: "",
      city: "",
      postalCode: "",
      country: "Maldives",
    },
  });

  // Auto-select default address or first address
  useEffect(() => {
    if (shippingAddresses.length > 0 && !selectedAddressId) {
      const defaultAddress = shippingAddresses.find((addr: any) => addr.isDefault);
      const addressToSelect = defaultAddress || shippingAddresses[0];
      setSelectedAddressId(addressToSelect.id);
    }
  }, [shippingAddresses, selectedAddressId]);

  // Auto-select default bank account when bank transfer is selected
  useEffect(() => {
    const paymentMethod = form.watch("paymentMethod");
    if (paymentMethod === "bank_transfer" && bankAccounts.length > 0 && !form.getValues("bankAccountId")) {
      const defaultAccount = bankAccounts.find((acc: any) => acc.isDefault) || bankAccounts[0];
      if (defaultAccount) {
        form.setValue("bankAccountId", String(defaultAccount.id));
      }
    } else if (paymentMethod === "ipg") {
      // Clear bank account when switching to IPG
      form.setValue("bankAccountId", "");
    }
  }, [form.watch("paymentMethod"), bankAccounts]);

  const createAddressMutation = useMutation({
    mutationFn: async (data: NewAddressFormData) => {
      return await apiRequest("POST", "/api/shipping-addresses", data);
    },
    onSuccess: (newAddress: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/shipping-addresses"] });
      setSelectedAddressId(newAddress.id);
      setIsAddressDialogOpen(false);
      addressForm.reset();
      toast({ title: "Address added successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to add address", description: error.message, variant: "destructive" });
    },
  });

  const createOrderMutation = useMutation({
    mutationFn: async (orderData: any) => {
      return await apiRequest("POST", "/api/buyer/orders", orderData);
    },
    onSuccess: (response: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/cart"] });
      queryClient.invalidateQueries({ queryKey: ["/api/buyer/orders"] });
      
      // If IPG payment, redirect to payment gateway
      if (response.redirectUrl) {
        const ordersCount = response.orders?.length || 0;
        toast({ 
          title: "Redirecting to payment gateway...",
          description: ordersCount > 1 ? `Processing ${ordersCount} orders (one per product variant)` : undefined
        });
        window.location.href = response.redirectUrl;
        return;
      }
      
      const ordersCount = response.orders?.length || 0;
      toast({ 
        title: `${ordersCount} ${ordersCount === 1 ? 'Order' : 'Orders'} placed successfully!`,
        description: ordersCount > 1 ? "Each product variant has its own order for independent tracking" : undefined
      });
      navigate("/orders");
    },
    onError: (error: Error) => {
      toast({ title: "Order failed", description: error.message, variant: "destructive" });
      setIsProcessing(false);
    },
  });

  const cartDetails = cartItems.map(item => {
    const product = allProducts.find(p => 
      p.variants?.some((v: any) => v.id === item.productVariantId)
    );
    const variant = product?.variants?.find((v: any) => v.id === item.productVariantId);
    
    return {
      ...item,
      variant: variant ? {
        ...variant,
        product: {
          id: product.id,
          name: product.name,
          images: product.images,
          sellerId: product.sellerId,
          seller: product.seller,
        }
      } : null
    };
  }).filter(item => item.variant !== null);

  // Group cart items by seller
  const itemsBySeller = cartDetails.reduce((acc, item) => {
    const sellerId = item.variant.product.sellerId;
    if (!acc[sellerId]) {
      acc[sellerId] = {
        seller: item.variant.product.seller,
        items: [],
        total: 0,
      };
    }
    acc[sellerId].items.push(item);
    // Use effectiveUnitPrice to account for custom quote prices
    const unitPrice = item.effectiveUnitPrice || parseFloat(item.variant.price);
    acc[sellerId].total += unitPrice * item.quantity;
    return acc;
  }, {} as Record<string, { seller: any; items: any[]; total: number }>);

  const sellerGroups = Object.values(itemsBySeller);
  const subtotal = cartDetails.reduce((sum, item) => {
    // Use effectiveUnitPrice to account for custom quote prices
    const unitPrice = item.effectiveUnitPrice || parseFloat(item.variant.price);
    return sum + (unitPrice * item.quantity);
  }, 0);
  
  const total = subtotal + (shippingCost || 0);

  // Calculate shipping cost when address is selected
  const calculateShipping = async () => {
    if (!selectedAddressId) return;
    
    const selectedAddress = shippingAddresses.find((addr: any) => addr.id === selectedAddressId);
    if (!selectedAddress) return;
    
    setIsCalculatingShipping(true);
    
    try {
      // Calculate total weight using actual product weights when available
      const totalWeight = cartDetails.reduce((sum, item) => {
        const variantWeight = item.variant.weight ? parseFloat(item.variant.weight) : 1.0;
        return sum + (variantWeight * item.quantity);
      }, 0);
      
      // Calculate total quantity of all items
      const totalQuantity = cartDetails.reduce((sum, item) => sum + item.quantity, 0);
      
      // Check if we have dimensions for all items (for more accurate calculation)
      const allHaveDimensions = cartDetails.every(item => 
        item.variant.length && item.variant.width && item.variant.height
      );
      
      const requestPayload: any = {
        weight: totalWeight,
        destinationCity: selectedAddress.city,
        destinationCountryCode: "MV", // Maldives
        numberOfPieces: totalQuantity,
      };
      
      // If all items have dimensions, use the largest dimensions for package calculation
      if (allHaveDimensions) {
        const maxDimensions = cartDetails.reduce((max, item) => ({
          length: Math.max(max.length, parseFloat(item.variant.length || "0")),
          width: Math.max(max.width, parseFloat(item.variant.width || "0")),
          height: Math.max(max.height, parseFloat(item.variant.height || "0")),
        }), { length: 0, width: 0, height: 0 });
        
        requestPayload.dimensions = maxDimensions;
      }
      
      const response = await apiRequest("POST", "/api/buyer/calculate-shipping-rate", requestPayload);
      
      setShippingCost(response.shippingCost);
      toast({
        title: "Shipping cost calculated",
        description: `$${response.shippingCost.toFixed(2)} ${response.currency} for ${totalWeight.toFixed(2)} KG`,
      });
    } catch (error: any) {
      console.error("Failed to calculate shipping:", error);
      toast({
        title: "Could not calculate shipping",
        description: "Using estimated shipping cost",
        variant: "destructive",
      });
      // Use default shipping cost if calculation fails
      setShippingCost(15.0);
    } finally {
      setIsCalculatingShipping(false);
    }
  };

  // Auto-calculate shipping when address is selected or cart loads
  useEffect(() => {
    if (selectedAddressId && cartDetails.length > 0) {
      calculateShipping();
    }
  }, [selectedAddressId, cartDetails.length]);

  const onSubmit = async (data: CheckoutFormData) => {
    if (cartDetails.length === 0) {
      toast({ title: "Cart is empty", variant: "destructive" });
      return;
    }

    // Ensure address is selected
    if (!selectedAddressId) {
      toast({ 
        title: "Please select a shipping address", 
        description: "Select an existing address or add a new one",
        variant: "destructive" 
      });
      return;
    }

    // Ensure shipping cost has been calculated
    if (shippingCost === null) {
      toast({ 
        title: "Calculating shipping cost...", 
        description: "Please wait while we calculate shipping",
        variant: "destructive" 
      });
      return;
    }

    setIsProcessing(true);

    createOrderMutation.mutate({
      totalAmount: total.toFixed(2),
      shippingCost: shippingCost.toFixed(2),
      shippingAddressId: selectedAddressId,
      notes: data.notes || null,
      paymentMethod: data.paymentMethod,
      bankAccountId: data.paymentMethod === "bank_transfer" ? data.bankAccountId : null,
      transferSlipUrl: data.paymentMethod === "bank_transfer" ? data.transferSlipUrl : null,
      transferSlipObjectPath: data.paymentMethod === "bank_transfer" ? transferSlipObjectPath : null,
    });
  };

  if (cartDetails.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <ShoppingCart className="h-24 w-24 text-muted-foreground mb-6" />
        <h2 className="text-2xl font-semibold mb-2">Your cart is empty</h2>
        <p className="text-muted-foreground mb-6">Add items to your cart before checking out</p>
        <Button onClick={() => navigate("/")}>Browse Products</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold" data-testid="text-page-title">Checkout</h1>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Shipping Address</CardTitle>
                <Dialog open={isAddressDialogOpen} onOpenChange={setIsAddressDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" data-testid="button-add-new-address">
                      <Plus className="h-4 w-4 mr-2" />
                      Add New
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add New Shipping Address</DialogTitle>
                    </DialogHeader>
                    <Form {...addressForm}>
                      <form onSubmit={addressForm.handleSubmit((data) => createAddressMutation.mutate(data))} className="space-y-4">
                        <FormField
                          control={addressForm.control}
                          name="recipientName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Recipient Name</FormLabel>
                              <FormControl>
                                <Input placeholder="John Doe" {...field} data-testid="input-recipient-name" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={addressForm.control}
                          name="contactNumber"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Contact Number</FormLabel>
                              <FormControl>
                                <Input placeholder="+960 123 4567" {...field} data-testid="input-contact-number" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={addressForm.control}
                          name="streetAddress"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Street Address</FormLabel>
                              <FormControl>
                                <Input placeholder="123 Main Street" {...field} data-testid="input-street-address" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={addressForm.control}
                            name="city"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>City</FormLabel>
                                <FormControl>
                                  <Input placeholder="Male" {...field} data-testid="input-city" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={addressForm.control}
                            name="postalCode"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Postal Code</FormLabel>
                                <FormControl>
                                  <Input placeholder="20000" {...field} data-testid="input-postal-code" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <FormField
                          control={addressForm.control}
                          name="country"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Country</FormLabel>
                              <FormControl>
                                <Input placeholder="Maldives" {...field} data-testid="input-country" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <Button type="submit" className="w-full" disabled={createAddressMutation.isPending} data-testid="button-create-address">
                          {createAddressMutation.isPending ? "Adding..." : "Add Address"}
                        </Button>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {shippingAddresses.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="font-medium mb-2">No shipping addresses</p>
                  <p className="text-sm mb-4">Add your first address to continue</p>
                  <Button onClick={() => setIsAddressDialogOpen(true)} data-testid="button-add-first-address-checkout">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Address
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <Label>Select delivery address</Label>
                  <RadioGroup value={selectedAddressId || ""} onValueChange={setSelectedAddressId}>
                    {shippingAddresses.map((address: any) => (
                      <div key={address.id} className="flex items-start space-x-2">
                        <RadioGroupItem value={address.id} id={address.id} data-testid={`radio-address-${address.id}`} className="mt-1" />
                        <Label htmlFor={address.id} className="flex-1 cursor-pointer">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{address.recipientName}</span>
                                {address.isDefault && <Badge variant="secondary" className="text-xs">Default</Badge>}
                              </div>
                              <p className="text-sm text-muted-foreground mt-1">
                                {address.streetAddress}, {address.city}, {address.postalCode}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {address.country} • {address.contactNumber}
                              </p>
                            </div>
                          </div>
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                  {isCalculatingShipping && (
                    <p className="text-xs text-muted-foreground">Calculating shipping cost...</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Payment & Order Details</CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="paymentMethod"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormLabel>Payment Method</FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            className="flex flex-col space-y-1"
                          >
                            <FormItem className="flex items-center space-x-3 space-y-0">
                              <FormControl>
                                <RadioGroupItem value="ipg" data-testid="radio-ipg" />
                              </FormControl>
                              <FormLabel className="font-normal flex items-center gap-2">
                                <CreditCard className="h-4 w-4" />
                                Internet Payment Gateway (IPG) - Instant confirmation
                              </FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center space-x-3 space-y-0">
                              <FormControl>
                                <RadioGroupItem value="bank_transfer" data-testid="radio-bank-transfer" />
                              </FormControl>
                              <FormLabel className="font-normal flex items-center gap-2">
                                <Building2 className="h-4 w-4" />
                                Bank Transfer - Admin verification required
                              </FormLabel>
                            </FormItem>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Bank Account Selection - Only shown for bank transfer */}
                  {form.watch("paymentMethod") === "bank_transfer" && (
                    <>
                      <FormField
                        control={form.control}
                        name="bankAccountId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Select Bank Account</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-bank-account">
                                  <SelectValue placeholder="Choose a bank account for payment" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {bankAccounts.length === 0 ? (
                                  <div className="p-2 text-sm text-muted-foreground text-center">
                                    No bank accounts available
                                  </div>
                                ) : (
                                  bankAccounts.map((account: any) => (
                                    <SelectItem 
                                      key={account.id} 
                                      value={String(account.id)}
                                      data-testid={`select-item-bank-${account.id}`}
                                    >
                                      <div className="flex flex-col py-1">
                                        <span className="font-semibold">{account.displayName}</span>
                                        <span className="text-xs text-muted-foreground">
                                          {account.bankName} • {account.currency}
                                          {account.isDefault && " • Default"}
                                        </span>
                                      </div>
                                    </SelectItem>
                                  ))
                                )}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Bank Account Details - Prominently displayed */}
                      {form.watch("bankAccountId") && bankAccounts.length > 0 && (() => {
                        const selectedAccount = bankAccounts.find((acc: any) => String(acc.id) === form.watch("bankAccountId"));
                        if (!selectedAccount) return null;
                        return (
                          <Alert className="border-primary/50 bg-primary/5" data-testid="bank-account-details">
                            <AlertCircle className="h-4 w-4 text-primary" />
                            <AlertTitle className="text-primary font-semibold">Transfer Payment To:</AlertTitle>
                            <AlertDescription>
                              <div className="mt-3 space-y-3 text-sm">
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <span className="text-xs font-medium text-muted-foreground">Bank Name</span>
                                    <p className="font-semibold mt-0.5" data-testid="text-bank-name">{selectedAccount.bankName}</p>
                                  </div>
                                  <div>
                                    <span className="text-xs font-medium text-muted-foreground">Currency</span>
                                    <p className="font-semibold mt-0.5" data-testid="text-currency">{selectedAccount.currency}</p>
                                  </div>
                                </div>
                                
                                <div>
                                  <span className="text-xs font-medium text-muted-foreground">Account Holder</span>
                                  <p className="font-semibold mt-0.5" data-testid="text-account-holder">{selectedAccount.accountHolderName}</p>
                                </div>
                                
                                <div>
                                  <span className="text-xs font-medium text-muted-foreground">Account Number</span>
                                  <p className="font-mono font-semibold mt-0.5" data-testid="text-account-number">{selectedAccount.accountNumber}</p>
                                </div>

                                {(selectedAccount.swiftCode || selectedAccount.iban || selectedAccount.routingNumber) && (
                                  <div className="grid grid-cols-2 gap-3">
                                    {selectedAccount.swiftCode && (
                                      <div>
                                        <span className="text-xs font-medium text-muted-foreground">SWIFT Code</span>
                                        <p className="font-mono font-semibold mt-0.5" data-testid="text-swift-code">{selectedAccount.swiftCode}</p>
                                      </div>
                                    )}
                                    {selectedAccount.iban && (
                                      <div>
                                        <span className="text-xs font-medium text-muted-foreground">IBAN</span>
                                        <p className="font-mono font-semibold mt-0.5 text-xs" data-testid="text-iban">{selectedAccount.iban}</p>
                                      </div>
                                    )}
                                    {selectedAccount.routingNumber && (
                                      <div>
                                        <span className="text-xs font-medium text-muted-foreground">Routing Number</span>
                                        <p className="font-mono font-semibold mt-0.5" data-testid="text-routing-number">{selectedAccount.routingNumber}</p>
                                      </div>
                                    )}
                                  </div>
                                )}

                                {selectedAccount.transferInstructions && (
                                  <div className="border-t border-primary/20 pt-3 mt-3">
                                    <span className="text-xs font-medium text-muted-foreground">Transfer Instructions</span>
                                    <p className="text-xs mt-1 leading-relaxed" data-testid="text-transfer-instructions">{selectedAccount.transferInstructions}</p>
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

                      {/* Transfer Slip Upload */}
                      <FormField
                        control={form.control}
                        name="transferSlipUrl"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Upload Payment Slip *</FormLabel>
                            <FormControl>
                              <div className="space-y-2">
                                {field.value ? (
                                  <div className="flex items-center gap-2 p-3 border rounded-md bg-background">
                                    <FileText className="h-5 w-5 text-primary" />
                                    <span className="text-sm flex-1 truncate">Transfer slip uploaded</span>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        field.onChange("");
                                      }}
                                      data-testid="button-remove-slip"
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </div>
                                ) : (
                                  <div>
                                    <Input
                                      type="file"
                                      accept="image/*,.pdf"
                                      disabled={isUploadingSlip}
                                      onChange={async (e) => {
                                        const file = e.target.files?.[0];
                                        if (!file) return;

                                        if (file.size > 10485760) { // 10MB
                                          toast({
                                            title: "File too large",
                                            description: "Please upload a file smaller than 10MB",
                                            variant: "destructive",
                                          });
                                          return;
                                        }

                                        setIsUploadingSlip(true);
                                        try {
                                          console.log("[UPLOAD] Starting upload process for:", file.name);
                                          
                                          // Get upload URL
                                          const uploadResponse = await fetch("/api/object-storage/upload-url", {
                                            method: "POST",
                                            credentials: "include",
                                            headers: {
                                              'Content-Type': 'application/json',
                                            },
                                            body: JSON.stringify({
                                              fileName: file.name,
                                              contentType: file.type,
                                            }),
                                          });
                                          
                                          console.log("[UPLOAD] Upload URL response status:", uploadResponse.status);
                                          
                                          if (!uploadResponse.ok) {
                                            const errorText = await uploadResponse.text();
                                            console.error("[UPLOAD] Failed to get upload URL:", errorText);
                                            throw new Error(`Failed to get upload URL: ${uploadResponse.status}`);
                                          }
                                          
                                          const { uploadUrl, objectPath } = await uploadResponse.json();
                                          console.log("[UPLOAD] Got upload URL and object path:", objectPath);

                                          // Upload file to GCS
                                          console.log("[UPLOAD] Uploading file to GCS...");
                                          const uploadFileResponse = await fetch(uploadUrl, {
                                            method: "PUT",
                                            body: file,
                                            headers: {
                                              'Content-Type': file.type,
                                            },
                                          });

                                          console.log("[UPLOAD] GCS upload response status:", uploadFileResponse.status);

                                          if (!uploadFileResponse.ok) {
                                            const errorText = await uploadFileResponse.text();
                                            console.error("[UPLOAD] GCS upload failed:", errorText);
                                            throw new Error(`Failed to upload file to storage: ${uploadFileResponse.status}`);
                                          }

                                          // Finalize upload
                                          console.log("[UPLOAD] Finalizing upload...");
                                          const data = await apiRequest("POST", "/api/object-storage/finalize-private-upload", {
                                            objectPath,
                                            fileName: file.name,
                                          });

                                          console.log("[UPLOAD] Finalize response:", data);

                                          field.onChange(data.url);
                                          setTransferSlipObjectPath(objectPath);
                                          toast({
                                            title: "Success",
                                            description: "Transfer slip uploaded successfully",
                                          });
                                        } catch (error: any) {
                                          console.error("[UPLOAD] Upload error:", error);
                                          toast({
                                            title: "Upload failed",
                                            description: error.message || "An error occurred during upload",
                                            variant: "destructive",
                                          });
                                        } finally {
                                          setIsUploadingSlip(false);
                                          e.target.value = ""; // Reset input
                                        }
                                      }}
                                      data-testid="input-transfer-slip"
                                    />
                                    {isUploadingSlip && (
                                      <p className="text-sm text-muted-foreground mt-2">Uploading...</p>
                                    )}
                                  </div>
                                )}
                              </div>
                            </FormControl>
                            <p className="text-xs text-muted-foreground">
                              Upload a screenshot or photo of your bank transfer receipt (max 10MB)
                            </p>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </>
                  )}

                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Order Notes (Optional)</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Any special instructions for your order..."
                            {...field}
                            data-testid="input-notes"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card data-testid="card-order-summary">
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {cartDetails.length > 1 && (
                <div className="bg-muted/50 p-3 rounded-md text-xs">
                  <p className="font-semibold">Variant-Level Orders</p>
                  <p className="text-muted-foreground">Each product variant will be processed as a separate order with independent tracking.</p>
                </div>
              )}

              <div className="space-y-2">
                {cartDetails.map((item: any) => {
                  // Use effectiveUnitPrice to account for custom quote prices
                  const unitPrice = item.effectiveUnitPrice || parseFloat(item.variant.price);
                  return (
                    <div key={item.id} className="flex justify-between text-sm items-start gap-2">
                      <span className="text-muted-foreground flex-1">
                        {item.variant.product.name}
                        {item.variant.name && ` - ${item.variant.name}`}
                        {item.quote && <span className="text-blue-600"> (Custom Quote)</span>}
                        {` × ${item.quantity}`}
                      </span>
                      <span className="font-medium">
                        ${(unitPrice * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span data-testid="text-subtotal">${subtotal.toFixed(2)}</span>
                </div>
                
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Shipping Cost</span>
                  <span data-testid="text-shipping">
                    {shippingCost !== null 
                      ? `$${shippingCost.toFixed(2)}` 
                      : isCalculatingShipping 
                        ? "Calculating..." 
                        : "Enter city to calculate"}
                  </span>
                </div>
                
                <div className="flex justify-between text-lg border-t pt-2">
                  <span className="font-semibold">Total Amount</span>
                  <span className="font-bold" data-testid="text-total">
                    ${total.toFixed(2)} USD
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {cartDetails.length > 1 
                    ? `This will create ${cartDetails.length} separate orders (one per variant)`
                    : "Platform commission is handled separately and not shown to buyers"
                  }
                </p>
              </div>
            </CardContent>
            <CardFooter>
              <Button
                className="w-full"
                onClick={form.handleSubmit(onSubmit)}
                disabled={isProcessing}
                data-testid="button-place-order"
              >
                <CreditCard className="h-4 w-4 mr-2" />
                {isProcessing ? "Processing..." : "Place Order"}
              </Button>
            </CardFooter>
          </Card>

          {form.watch("paymentMethod") === "ipg" && (
            <Card className="bg-muted/50">
              <CardContent className="p-4 text-sm">
                <p className="font-semibold mb-2 flex items-center gap-2">
                  <Info className="h-4 w-4" />
                  Payment Information
                </p>
                <p className="text-muted-foreground">
                  After placing your order, you will be redirected to complete payment through the Internet Payment Gateway. Your order will be confirmed instantly once payment is successful.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
