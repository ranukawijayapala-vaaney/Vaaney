import { useState, useEffect, useMemo } from "react";
import { Rocket, Package, Briefcase, Clock, Check, DollarSign, AlertCircle, ChevronRight, CreditCard, Building2, Calendar, TrendingUp, Upload, FileCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ObjectUploader } from "@/components/ObjectUploader";
import { format, differenceInDays } from "date-fns";
import type { BoostPackage, Product, Service, BoostPurchase, BoostedItem } from "@shared/schema";
import type { UploadResult } from "@uppy/core";

export default function Boost() {
  const [showBoostDialog, setShowBoostDialog] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<BoostPackage | null>(null);
  const [selectedItemType, setSelectedItemType] = useState<"product" | "service">("product");
  const [selectedItemId, setSelectedItemId] = useState<string>("");
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<"ipg" | "bank_transfer">("ipg");
  const [selectedPurchase, setSelectedPurchase] = useState<BoostPurchase | null>(null);
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentSlipUrl, setPaymentSlipUrl] = useState("");
  const { toast } = useToast();

  const { data: packages = [], isLoading: loadingPackages } = useQuery<BoostPackage[]>({
    queryKey: ["/api/boost-packages"],
  });

  // Check for payment status in URL query params
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const paymentStatus = searchParams.get("payment");
    const transactionRef = searchParams.get("transactionRef");

    if (paymentStatus) {
      if (paymentStatus === "success") {
        toast({
          title: "Payment Successful!",
          description: `Your boost has been activated. Reference: ${transactionRef?.slice(0, 12)}...`,
        });
        // Refresh purchases and boosted items to show new boost
        queryClient.invalidateQueries({ queryKey: ["/api/seller/boost-purchases"] });
        queryClient.invalidateQueries({ queryKey: ["/api/boosted-items?activeOnly=true"] });
      } else if (paymentStatus === "failed") {
        toast({
          title: "Payment Failed",
          description: "Your payment could not be processed. Please try again.",
          variant: "destructive",
        });
      }
      
      // Clear query params from URL
      const newUrl = window.location.pathname;
      window.history.replaceState({}, "", newUrl);
    }
  }, [toast]);

  const { data: products = [], isLoading: loadingProducts } = useQuery<Product[]>({
    queryKey: ["/api/seller/products"],
  });

  const { data: services = [], isLoading: loadingServices } = useQuery<Service[]>({
    queryKey: ["/api/seller/services"],
  });

  const { data: purchases = [], isLoading: loadingPurchases } = useQuery<BoostPurchase[]>({
    queryKey: ["/api/seller/boost-purchases"],
  });

  const { data: boostedItems = [], isLoading: loadingBoosts } = useQuery<BoostedItem[]>({
    queryKey: ["/api/boosted-items?activeOnly=true"],
  });

  // Fetch bank accounts for LKR currency (for boost payments via bank transfer)
  const { data: bankAccounts = [] } = useQuery<any[]>({
    queryKey: ["/api/bank-accounts?currency=LKR"],
  });

  // Filter boosted items to only show ones belonging to this seller
  const myBoostedItems = useMemo(() => {
    return boostedItems.filter((boost: any) => {
      const item = boost.itemType === "product"
        ? products.find(p => p.id === boost.itemId)
        : services.find(s => s.id === boost.itemId);
      return item !== undefined;
    });
  }, [boostedItems, products, services]);

  const createPurchaseMutation = useMutation({
    mutationFn: async (data: { packageId: string; itemType: string; itemId: string; paymentMethod?: string }) => {
      return await apiRequest("POST", "/api/seller/boost-purchase", data);
    },
    onSuccess: (response: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/seller/boost-purchases"] });
      setShowBoostDialog(false);
      setSelectedPackage(null);
      setSelectedItemId("");
      
      if (response.mpgsSessionId) {
        toast({ title: "Opening payment gateway...", description: response.message });
        import("@/lib/mpgs").then(({ launchMpgsCheckout }) => {
          launchMpgsCheckout(response.mpgsSessionId).catch(() => {
            toast({ title: "Payment gateway error", description: "Please try again.", variant: "destructive" });
          });
        });
        return;
      }
      
      // Bank transfer flow
      toast({ 
        title: "Boost purchase initiated", 
        description: response.message 
      });
      
      if (response.purchase) {
        setSelectedPurchase(response.purchase);
        setShowPaymentDialog(true);
      }
    },
    onError: (error: Error) => {
      toast({ title: "Purchase failed", description: error.message, variant: "destructive" });
    },
  });

  const confirmPaymentMutation = useMutation({
    mutationFn: async (data: { id: string; paymentSlipUrl: string }) => {
      return await apiRequest("POST", `/api/seller/boost-purchase/${data.id}/confirm-payment`, {
        paymentSlipUrl: data.paymentSlipUrl,
      });
    },
    onSuccess: (response: any) => {
      toast({ 
        title: "Payment slip submitted", 
        description: response.message 
      });
      queryClient.invalidateQueries({ queryKey: ["/api/seller/boost-purchases"] });
      setShowPaymentDialog(false);
      setSelectedPurchase(null);
      setPaymentSlipUrl("");
    },
    onError: (error: Error) => {
      toast({ title: "Submission failed", description: error.message, variant: "destructive" });
    },
  });

  const cancelPurchaseMutation = useMutation({
    mutationFn: async (purchaseId: string) => {
      return await apiRequest("DELETE", `/api/seller/boost-purchases/${purchaseId}`);
    },
    onSuccess: (response: any) => {
      toast({ 
        title: "Purchase cancelled", 
        description: response.message 
      });
      queryClient.invalidateQueries({ queryKey: ["/api/seller/boost-purchases"] });
    },
    onError: (error: Error) => {
      toast({ title: "Cancellation failed", description: error.message, variant: "destructive" });
    },
  });

  const getUploadUrl = async () => {
    const response = await fetch("/api/object-storage/upload-url", {
      method: "POST",
      credentials: "include",
    });
    const data = await response.json();
    return {
      method: "PUT" as const,
      url: data.uploadUrl,
    };
  };

  const handleUploadComplete = async (result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
    if (result.successful && result.successful.length > 0) {
      const uploadUrl = result.successful[0].uploadURL;
      
      try {
        const data = await apiRequest("POST", "/api/object-storage/finalize-upload", {
          objectPath: uploadUrl,
        });
        
        if (data && data.objectPath) {
          setPaymentSlipUrl(data.objectPath);
          toast({
            title: "Payment slip uploaded",
            description: "Your payment slip has been uploaded successfully.",
          });
        } else {
          throw new Error("No objectPath in response");
        }
      } catch (error) {
        console.error("Error saving payment slip:", error);
        toast({
          title: "Upload failed",
          description: error instanceof Error ? error.message : "Failed to save payment slip.",
          variant: "destructive",
        });
      }
    }
  };

  const handleBoostItem = () => {
    if (!selectedPackage || !selectedItemId) {
      toast({ 
        title: "Missing information", 
        description: "Please select both a package and an item to boost", 
        variant: "destructive" 
      });
      return;
    }

    createPurchaseMutation.mutate({
      packageId: selectedPackage.id,
      itemType: selectedItemType,
      itemId: selectedItemId,
      paymentMethod: selectedPaymentMethod,
    });
  };

  const handleConfirmPayment = () => {
    if (!selectedPurchase || !paymentSlipUrl.trim()) {
      toast({ 
        title: "Missing information", 
        description: "Please upload your payment slip", 
        variant: "destructive" 
      });
      return;
    }

    confirmPaymentMutation.mutate({
      id: selectedPurchase.id,
      paymentSlipUrl: paymentSlipUrl.trim(),
    });
  };

  const isItemBoosted = (itemId: string, itemType: string) => {
    return boostedItems.some((item: any) => 
      item.itemId === itemId && item.itemType === itemType && item.isActive
    );
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; icon: any }> = {
      pending: { variant: "secondary", icon: Clock },
      processing: { variant: "default", icon: AlertCircle },
      paid: { variant: "default", icon: Check },
      failed: { variant: "destructive", icon: AlertCircle },
      cancelled: { variant: "secondary", icon: AlertCircle },
    };

    const config = variants[status] || variants.pending;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const availableProducts = products.filter(p => !isItemBoosted(p.id, "product"));
  const availableServices = services.filter(s => !isItemBoosted(s.id, "service"));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="heading-boost">Boost & Promotions</h1>
          <p className="text-muted-foreground mt-1">
            Feature your products and services on the homepage
          </p>
        </div>
        <Button 
          onClick={() => setShowBoostDialog(true)}
          data-testid="button-boost-item"
          className="gap-2"
        >
          <Rocket className="h-4 w-4" />
          Boost an Item
        </Button>
      </div>

      <Tabs defaultValue="packages" className="space-y-4">
        <TabsList>
          <TabsTrigger value="packages" data-testid="tab-packages">Boost Packages</TabsTrigger>
          <TabsTrigger value="active" data-testid="tab-active">Active Boosts</TabsTrigger>
          <TabsTrigger value="history" data-testid="tab-history">Purchase History</TabsTrigger>
        </TabsList>

        <TabsContent value="packages" className="space-y-4">
          {loadingPackages ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-6 w-32" />
                    <Skeleton className="h-4 w-full mt-2" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-16 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : packages.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Rocket className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground" data-testid="text-no-packages">
                  No boost packages available
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {packages.map((pkg) => (
                <Card 
                  key={pkg.id} 
                  className={`hover-elevate transition-all ${selectedPackage?.id === pkg.id ? 'ring-2 ring-primary' : ''}`}
                  data-testid={`card-package-${pkg.id}`}
                >
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle data-testid={`text-package-name-${pkg.id}`}>{pkg.name}</CardTitle>
                      {!pkg.isActive && <Badge variant="secondary">Inactive</Badge>}
                    </div>
                    <CardDescription data-testid={`text-package-description-${pkg.id}`}>
                      {pkg.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold" data-testid={`text-package-price-${pkg.id}`}>
                        ${pkg.price}
                      </span>
                      <span className="text-muted-foreground">USD</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span data-testid={`text-package-duration-${pkg.id}`}>
                        {pkg.durationDays} days of promotion
                      </span>
                    </div>
                    {pkg.features && Array.isArray(pkg.features) && pkg.features.length > 0 && (
                      <div className="space-y-2 pt-2">
                        {pkg.features.map((feature: string, idx: number) => (
                          <div key={idx} className="flex items-start gap-2 text-sm">
                            <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                            <span>{feature}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                  <CardFooter>
                    <Button
                      onClick={() => {
                        setSelectedPackage(pkg);
                        setShowBoostDialog(true);
                      }}
                      disabled={!pkg.isActive}
                      className="w-full"
                      data-testid={`button-select-package-${pkg.id}`}
                    >
                      Select Package
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="active" className="space-y-4">
          {loadingBoosts || loadingProducts || loadingServices || loadingPackages ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <Skeleton className="h-24 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : myBoostedItems.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <TrendingUp className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground" data-testid="text-no-active-boosts">
                  No active boosts
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Purchase a boost package to feature your products or services
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {myBoostedItems.map((boost: any) => {
                const pkg = packages.find(p => p.id === boost.packageId);
                const item = boost.itemType === "product"
                  ? products.find(p => p.id === boost.itemId)
                  : services.find(s => s.id === boost.itemId);

                const now = new Date();
                const endDate = new Date(boost.endDate);
                const startDate = new Date(boost.startDate);
                const isExpired = endDate < now;
                const daysRemaining = isExpired ? 0 : Math.max(0, differenceInDays(endDate, now));

                return (
                  <Card key={boost.id} data-testid={`card-active-boost-${boost.id}`}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-3">
                          <div className="flex items-center gap-3">
                            {boost.itemType === "product" ? (
                              <Package className="h-5 w-5 text-muted-foreground" />
                            ) : (
                              <Briefcase className="h-5 w-5 text-muted-foreground" />
                            )}
                            <div>
                              <p className="font-semibold" data-testid={`text-boost-item-${boost.id}`}>
                                {item?.name || "Unknown Item"}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {pkg?.name || "Unknown Package"}
                              </p>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <p className="text-xs text-muted-foreground">Started</p>
                                <p className="font-medium" data-testid={`text-boost-start-${boost.id}`}>
                                  {format(startDate, "MMM d, yyyy")}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <p className="text-xs text-muted-foreground">Expires</p>
                                <p className="font-medium" data-testid={`text-boost-end-${boost.id}`}>
                                  {format(endDate, "MMM d, yyyy")}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <p className="text-xs text-muted-foreground">Days Remaining</p>
                                <p 
                                  className={`font-medium ${isExpired ? 'text-destructive' : daysRemaining <= 3 ? 'text-yellow-600 dark:text-yellow-400' : ''}`}
                                  data-testid={`text-boost-days-${boost.id}`}
                                >
                                  {isExpired ? 'Expired' : `${daysRemaining} days`}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <div>
                                <p className="text-xs text-muted-foreground">Status</p>
                                <div className="mt-1">
                                  <Badge 
                                    variant={boost.isActive && !isExpired ? "default" : "secondary"}
                                    data-testid={`badge-boost-status-${boost.id}`}
                                  >
                                    {boost.isActive && !isExpired ? "Active" : "Inactive"}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          {loadingPurchases ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <Skeleton className="h-20 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : purchases.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <DollarSign className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground" data-testid="text-no-purchases">
                  No boost purchases yet
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {purchases.map((purchase) => {
                const pkg = packages.find(p => p.id === purchase.packageId);
                const item = purchase.itemType === "product"
                  ? products.find(p => p.id === purchase.itemId)
                  : services.find(s => s.id === purchase.itemId);

                return (
                  <Card key={purchase.id} data-testid={`card-purchase-${purchase.id}`}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-3">
                          <div className="flex items-center gap-3">
                            {purchase.itemType === "product" ? (
                              <Package className="h-5 w-5 text-muted-foreground" />
                            ) : (
                              <Briefcase className="h-5 w-5 text-muted-foreground" />
                            )}
                            <div>
                              <p className="font-semibold" data-testid={`text-purchase-item-${purchase.id}`}>
                                {item?.name || "Unknown Item"}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {pkg?.name || "Unknown Package"}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex flex-wrap items-center gap-4 text-sm">
                            <div className="flex items-center gap-2">
                              <DollarSign className="h-4 w-4 text-muted-foreground" />
                              <span data-testid={`text-purchase-amount-${purchase.id}`}>
                                ${purchase.amount} USD
                              </span>
                            </div>
                            {purchase.paymentSlipUrl && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-auto p-0 text-xs text-primary hover:underline"
                                onClick={() => window.open(purchase.paymentSlipUrl!, '_blank')}
                                data-testid={`button-view-slip-${purchase.id}`}
                              >
                                <FileCheck className="h-3 w-3 mr-1" />
                                View Payment Slip
                              </Button>
                            )}
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Clock className="h-4 w-4" />
                              <span>{new Date(purchase.createdAt!).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-2">
                          {getStatusBadge(purchase.status)}
                          {purchase.status === "pending" && (
                            <div className="flex gap-2">
                              {purchase.paymentMethod === "bank_transfer" && 
                               !purchase.paymentSlipUrl && 
                               !purchase.paymentReference && (
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    setSelectedPurchase(purchase);
                                    setShowPaymentDialog(true);
                                  }}
                                  data-testid={`button-confirm-payment-${purchase.id}`}
                                >
                                  Upload Payment Slip
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => cancelPurchaseMutation.mutate(purchase.id)}
                                disabled={cancelPurchaseMutation.isPending}
                                data-testid={`button-cancel-purchase-${purchase.id}`}
                              >
                                Cancel
                              </Button>
                            </div>
                          )}
                          {purchase.status === "pending" && 
                           (purchase.paymentSlipUrl || purchase.paymentReference) && (
                            <p className="text-sm text-muted-foreground text-right">
                              Awaiting admin confirmation
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={showBoostDialog} onOpenChange={setShowBoostDialog}>
        <DialogContent className="max-w-2xl" data-testid="dialog-boost-item">
          <DialogHeader>
            <DialogTitle>Boost an Item</DialogTitle>
            <DialogDescription>
              Select a package and choose which product or service to promote
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 pt-4">
            {selectedPackage && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Selected Package</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold">{selectedPackage.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {selectedPackage.durationDays} days • ${selectedPackage.price} USD
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedPackage(null)}
                      data-testid="button-change-package"
                    >
                      Change
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {!selectedPackage && (
              <div>
                <Label>Select a Package</Label>
                <Select onValueChange={(value) => {
                  const pkg = packages.find(p => p.id === value);
                  if (pkg) setSelectedPackage(pkg);
                }}>
                  <SelectTrigger data-testid="select-package">
                    <SelectValue placeholder="Choose a boost package" />
                  </SelectTrigger>
                  <SelectContent>
                    {packages.filter(p => p.isActive).map((pkg) => (
                      <SelectItem key={pkg.id} value={pkg.id} data-testid={`select-option-package-${pkg.id}`}>
                        {pkg.name} - ${pkg.price} ({pkg.durationDays} days)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label>Item Type</Label>
              <Select value={selectedItemType} onValueChange={(value: any) => {
                setSelectedItemType(value);
                setSelectedItemId("");
              }}>
                <SelectTrigger data-testid="select-item-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="product" data-testid="select-option-product">Product</SelectItem>
                  <SelectItem value="service" data-testid="select-option-service">Service</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Select Item to Boost</Label>
              <Select value={selectedItemId} onValueChange={setSelectedItemId}>
                <SelectTrigger data-testid="select-item">
                  <SelectValue placeholder={`Choose a ${selectedItemType} to boost`} />
                </SelectTrigger>
                <SelectContent>
                  {selectedItemType === "product" ? (
                    availableProducts.length === 0 ? (
                      <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                        No available products to boost
                      </div>
                    ) : (
                      availableProducts.map((product) => (
                        <SelectItem key={product.id} value={product.id} data-testid={`select-option-item-${product.id}`}>
                          {product.name}
                        </SelectItem>
                      ))
                    )
                  ) : (
                    availableServices.length === 0 ? (
                      <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                        No available services to boost
                      </div>
                    ) : (
                      availableServices.map((service) => (
                        <SelectItem key={service.id} value={service.id} data-testid={`select-option-item-${service.id}`}>
                          {service.name}
                        </SelectItem>
                      ))
                    )
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label>Payment Method</Label>
              <div className="rounded-md bg-blue-50 dark:bg-blue-950 p-3 mb-3">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  <strong>Recommended:</strong> Use IPG for instant boost activation. No waiting for admin confirmation!
                </p>
              </div>
              <RadioGroup
                value={selectedPaymentMethod}
                onValueChange={(value: any) => setSelectedPaymentMethod(value)}
                className="flex flex-col space-y-2"
              >
                <div className="flex items-center space-x-3 space-y-0">
                  <RadioGroupItem value="ipg" id="ipg" data-testid="radio-ipg" />
                  <Label htmlFor="ipg" className="font-normal flex items-center gap-2 cursor-pointer">
                    <CreditCard className="h-4 w-4" />
                    <span className="font-medium">Internet Payment Gateway (IPG)</span> - Instant automatic activation ✓
                  </Label>
                </div>
                <div className="flex items-center space-x-3 space-y-0">
                  <RadioGroupItem value="bank_transfer" id="bank_transfer" data-testid="radio-bank-transfer" />
                  <Label htmlFor="bank_transfer" className="font-normal flex items-center gap-2 cursor-pointer">
                    <Building2 className="h-4 w-4" />
                    Bank Transfer - Requires payment reference & admin confirmation
                  </Label>
                </div>
              </RadioGroup>

              {/* Show bank account details when Bank Transfer is selected */}
              {selectedPaymentMethod === "bank_transfer" && bankAccounts.length > 0 && (
                <Card className="mt-4" data-testid="card-bank-details">
                  <CardHeader>
                    <CardTitle className="text-base">Bank Transfer Details</CardTitle>
                    <CardDescription>Transfer payment to the following account</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {bankAccounts.map((account: any) => (
                      <div key={account.id} className="space-y-2">
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div className="font-medium text-muted-foreground">Bank Name:</div>
                          <div className="font-medium" data-testid="text-bank-name">{account.bankName}</div>
                          
                          <div className="font-medium text-muted-foreground">Account Holder:</div>
                          <div data-testid="text-account-holder">{account.accountHolderName}</div>
                          
                          <div className="font-medium text-muted-foreground">Account Number:</div>
                          <div className="font-mono" data-testid="text-account-number">{account.accountNumber}</div>
                          
                          {account.branchName && (
                            <>
                              <div className="font-medium text-muted-foreground">Branch:</div>
                              <div data-testid="text-branch-name">{account.branchName}</div>
                            </>
                          )}
                          
                          <div className="font-medium text-muted-foreground">Currency:</div>
                          <div data-testid="text-currency">{account.currency}</div>
                        </div>
                        {account.transferInstructions && (
                          <div className="mt-3 p-3 bg-muted rounded-md">
                            <p className="text-xs text-muted-foreground">
                              <strong>Instructions:</strong> {account.transferInstructions}
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowBoostDialog(false);
                  setSelectedPackage(null);
                  setSelectedItemId("");
                }}
                className="flex-1"
                data-testid="button-cancel-boost"
              >
                Cancel
              </Button>
              <Button
                onClick={handleBoostItem}
                disabled={!selectedPackage || !selectedItemId || createPurchaseMutation.isPending}
                className="flex-1"
                data-testid="button-confirm-boost"
              >
                {createPurchaseMutation.isPending ? "Processing..." : "Proceed to Payment"}
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent data-testid="dialog-payment">
          <DialogHeader>
            <DialogTitle>Upload Payment Slip</DialogTitle>
            <DialogDescription>
              Complete the bank transfer and upload a screenshot or photo of your payment receipt
            </DialogDescription>
          </DialogHeader>

          {selectedPurchase && (
            <div className="space-y-6 pt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Payment Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Amount:</span>
                    <span className="font-semibold">${selectedPurchase.amount} USD</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Currency:</span>
                    <span>{selectedPurchase.currency}</span>
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-3">
                <Label>Payment Slip</Label>
                {paymentSlipUrl ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950 rounded-md border border-green-200 dark:border-green-800">
                      <FileCheck className="h-5 w-5 text-green-600 dark:text-green-400" />
                      <span className="text-sm text-green-800 dark:text-green-200 font-medium">
                        Payment slip uploaded successfully
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPaymentSlipUrl("")}
                      data-testid="button-remove-slip"
                    >
                      Upload Different File
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <ObjectUploader
                      onGetUploadParameters={getUploadUrl}
                      onComplete={handleUploadComplete}
                      variant="outline"
                      buttonClassName="w-full"
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      Upload Payment Slip
                    </ObjectUploader>
                    <p className="text-xs text-muted-foreground">
                      Upload a screenshot or photo of your bank transfer receipt (JPG, PNG, or PDF)
                    </p>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowPaymentDialog(false);
                    setSelectedPurchase(null);
                    setPaymentSlipUrl("");
                  }}
                  className="flex-1"
                  data-testid="button-cancel-payment"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleConfirmPayment}
                  disabled={!paymentSlipUrl.trim() || confirmPaymentMutation.isPending}
                  className="flex-1"
                  data-testid="button-submit-payment"
                >
                  {confirmPaymentMutation.isPending ? "Submitting..." : "Submit Payment Slip"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
