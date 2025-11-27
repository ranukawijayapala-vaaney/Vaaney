import { useState } from "react";
import { Search, ShoppingCart, Package, Grid, List, Filter, Plus, MessageCircle, CheckCircle, Upload, FileText, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import type { Product, EnrichedService, BoostedItem } from "@shared/schema";
import { Link, useLocation } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { AddToCartModal, type ApprovedVariant } from "@/components/cart/AddToCartModal";

export default function Marketplace() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [sortBy, setSortBy] = useState("name");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [approvedVariants, setApprovedVariants] = useState<ApprovedVariant[]>([]);
  const [askSellerDialog, setAskSellerDialog] = useState<{ type: "product" | "service"; item: any } | null>(null);
  const [inquiryMessage, setInquiryMessage] = useState("");

  const { data: allProducts = [], isLoading: productsLoading } = useQuery<any[]>({
    queryKey: ["/api/products"],
  });

  const { data: allServices = [], isLoading: servicesLoading } = useQuery<(EnrichedService & { seller: { firstName: string; lastName: string } })[]>({
    queryKey: ["/api/services"],
  });

  // Fetch boosted items
  const { data: boostedItems = [] } = useQuery<BoostedItem[]>({
    queryKey: ["/api/boosted-items", { activeOnly: true }],
    queryFn: async () => {
      const response = await fetch("/api/boosted-items?activeOnly=true", {
        credentials: "include",
      });
      if (!response.ok) return [];
      return response.json();
    },
  });

  // Get current user for auth checks (properly handles 401 for guests)
  const { user } = useAuth();

  // Client-side filtering and sorting
  const filteredProducts = allProducts.filter((product) => {
    const matchesSearch = !searchQuery || product.name.toLowerCase().includes(searchQuery.toLowerCase()) || product.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = category === "all" || product.category?.toLowerCase().includes(category.toLowerCase());
    return matchesSearch && matchesCategory;
  });

  const products = [...filteredProducts].sort((a, b) => {
    if (sortBy === "price-low" || sortBy === "price-high") {
      const pricesA = a.variants?.map((v: any) => parseFloat(v.price)).filter((p: number) => !isNaN(p)) || [];
      const pricesB = b.variants?.map((v: any) => parseFloat(v.price)).filter((p: number) => !isNaN(p)) || [];
      
      const priceA = pricesA.length > 0 ? Math.min(...pricesA) : Infinity;
      const priceB = pricesB.length > 0 ? Math.min(...pricesB) : Infinity;
      
      return sortBy === "price-low" ? (priceA - priceB) : (priceB - priceA);
    } else {
      return a.name.localeCompare(b.name);
    }
  });

  const filteredServices = allServices.filter((service) => {
    const matchesSearch = !searchQuery || service.name.toLowerCase().includes(searchQuery.toLowerCase()) || service.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = category === "all" || service.category?.toLowerCase().includes(category.toLowerCase());
    return matchesSearch && matchesCategory;
  });

  const services = [...filteredServices].sort((a, b) => {
    if (sortBy === "price-low" || sortBy === "price-high") {
      const packagesA = (a as any).packages?.map((p: any) => parseFloat(p.price)).filter((p: number) => !isNaN(p)) || [];
      const packagesB = (b as any).packages?.map((p: any) => parseFloat(p.price)).filter((p: number) => !isNaN(p)) || [];
      
      const priceA = packagesA.length > 0 ? Math.min(...packagesA) : Infinity;
      const priceB = packagesB.length > 0 ? Math.min(...packagesB) : Infinity;
      
      return sortBy === "price-low" ? (priceA - priceB) : (priceB - priceA);
    } else {
      return a.name.localeCompare(b.name);
    }
  });

  // Helper function to check if an item is boosted
  const isItemBoosted = (itemId: string, itemType: "product" | "service") => {
    return boostedItems.some(boost => boost.itemId === itemId && boost.itemType === itemType && boost.isActive);
  };

  // Helper function to get the display price for a product
  // Priority: minimum positive variant price > minimum zero variant price > base product price > null (for quote/TBD)
  const getProductDisplayPrice = (product: any): string | null => {
    let allPrices: number[] = [];
    
    // Collect all variant prices
    if (product.variants && product.variants.length > 0) {
      const variantPrices = product.variants
        .map((v: any) => parseFloat(v.price))
        .filter((p: number) => !isNaN(p) && p >= 0);
      allPrices = [...variantPrices];
    }
    
    // Also consider base product price
    if (product.price !== null && product.price !== undefined) {
      const basePrice = parseFloat(product.price);
      if (!isNaN(basePrice) && basePrice >= 0) {
        allPrices.push(basePrice);
      }
    }
    
    if (allPrices.length === 0) {
      // No valid prices at all
      return null;
    }
    
    // Prefer the minimum POSITIVE price first
    const positivePrices = allPrices.filter(p => p > 0);
    if (positivePrices.length > 0) {
      return `From $${Math.min(...positivePrices).toFixed(2)}`;
    }
    
    // All prices are 0 - show "Custom Quote" if requires quote, otherwise show "$0.00"
    if (product.requiresQuote) {
      return null;
    }
    return `From $${(0).toFixed(2)}`;
  };

  // Separate boosted and regular products
  const boostedProducts = products.filter(p => isItemBoosted(p.id, "product"));
  const regularProducts = products.filter(p => !isItemBoosted(p.id, "product"));

  // Separate boosted and regular services
  const boostedServices = services.filter(s => isItemBoosted(s.id, "service"));
  const regularServices = services.filter(s => !isItemBoosted(s.id, "service"));

  const addToCartMutation = useMutation({
    mutationFn: async (data: { productVariantId: string; designApprovalId: string; quantity: number }) => {
      return await apiRequest("POST", "/api/cart", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cart"] });
      toast({ title: "Added to cart successfully!" });
      setSelectedProduct(null);
      setApprovedVariants([]);
    },
    onError: (error: Error) => {
      toast({ title: "Failed to add to cart", description: error.message, variant: "destructive" });
    },
  });

  const handleAddToCart = async (e: React.MouseEvent, product: any) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Check if user is authenticated - redirect to login if not
    if (!user) {
      navigate(`/login?redirect=${encodeURIComponent(`/product/${product.id}`)}`);
      return;
    }
    
    try {
      const response = await fetch(`/api/products/${product.id}`);
      if (!response.ok) {
        throw new Error("Failed to load product details");
      }
      const productWithVariants = await response.json();
      
      if (!productWithVariants.variants || productWithVariants.variants.length === 0) {
        toast({ title: "No variants available for this product", variant: "destructive" });
        return;
      }
      
      // If product requires design approval, fetch approved variants with designApprovalIds
      if (productWithVariants.requiresDesignApproval) {
        const approvedResponse = await fetch(`/api/products/${product.id}/approved-variants`);
        if (!approvedResponse.ok) {
          toast({ 
            title: "Failed to load approved designs", 
            description: "Please try again or contact support if the problem persists",
            variant: "destructive" 
          });
          return;
        }
        
        const approvedDesignData = await approvedResponse.json();
        
        if (approvedDesignData.length === 0) {
          toast({ 
            title: "No approved designs", 
            description: "Please upload and get designs approved before adding to cart",
            variant: "destructive" 
          });
          return;
        }
        
        // Map approved design data to ApprovedVariant format
        const approvedVars: ApprovedVariant[] = approvedDesignData
          .map((approval: any) => {
            let variant = productWithVariants.variants.find((v: any) => v.id === approval.variantId);
            
            // Fallback: If variantId is null/undefined and there's only one variant, auto-select it
            if (!variant && !approval.variantId && productWithVariants.variants.length === 1) {
              variant = productWithVariants.variants[0];
              console.info('Auto-selected single variant for approved design without variantId:', {
                designApprovalId: approval.id,
                selectedVariantId: variant.id,
              });
            }
            
            // Only include if we found a valid variant
            if (!variant) {
              console.warn('Skipping approved design without valid variant:', {
                approvalId: approval.id,
                variantId: approval.variantId,
                availableVariantCount: productWithVariants.variants.length,
              });
              return null;
            }
            
            return {
              id: variant.id,
              name: variant.name,
              price: variant.price,
              inventory: variant.inventory,
              designApprovalId: approval.id,
            };
          })
          .filter((v: ApprovedVariant | null): v is ApprovedVariant => v !== null); // Remove nulls
        
        setApprovedVariants(approvedVars);
        setSelectedProduct(productWithVariants);
      } else {
        // Product doesn't require design approval - create variants without designApprovalId
        // This shouldn't happen based on the button logic, but handle it gracefully
        const vars: ApprovedVariant[] = productWithVariants.variants.map((v: any) => ({
          id: v.id,
          name: v.name,
          price: v.price,
          inventory: v.inventory,
          designApprovalId: "", // No design approval required
        }));
        setApprovedVariants(vars);
        setSelectedProduct(productWithVariants);
      }
    } catch (error) {
      toast({ title: "Failed to load product details", variant: "destructive" });
    }
  };

  const handleConfirmAddToCart = (variantId: string, designApprovalId: string, quantity: number) => {
    addToCartMutation.mutate({ productVariantId: variantId, designApprovalId, quantity });
  };

  const createInquiryMutation = useMutation({
    mutationFn: async (data: { type: string; subject: string; message: string; productId?: string; serviceId?: string }) => {
      const conversation: any = await apiRequest("POST", "/api/conversations", {
        type: data.type,
        subject: data.subject,
        productId: data.productId,
        serviceId: data.serviceId,
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
      setAskSellerDialog(null);
      setInquiryMessage("");
    },
    onError: (error: Error) => {
      toast({ title: "Failed to send message", description: error.message, variant: "destructive" });
    },
  });

  const handleAskSeller = (e: React.MouseEvent, type: "product" | "service", item: any) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Check if user is authenticated - redirect to login if not
    if (!user) {
      const redirectPath = type === "product" ? `/product/${item.id}` : `/book-service/${item.id}`;
      navigate(`/login?redirect=${encodeURIComponent(redirectPath)}`);
      return;
    }
    
    setAskSellerDialog({ type, item });
  };

  const handleSendInquiry = () => {
    // Check if user is authenticated - redirect to login if not
    if (!user) {
      navigate(`/login?redirect=${encodeURIComponent('/marketplace')}`);
      return;
    }

    if (!askSellerDialog || !inquiryMessage.trim()) {
      toast({ title: "Please enter a message", variant: "destructive" });
      return;
    }

    const conversationType = askSellerDialog.type === "product" ? "pre_purchase_product" : "pre_purchase_service";
    const subject = `Question about ${askSellerDialog.item.name}`;

    createInquiryMutation.mutate({
      type: conversationType,
      subject,
      message: inquiryMessage,
      productId: askSellerDialog.type === "product" ? askSellerDialog.item.id : undefined,
      serviceId: askSellerDialog.type === "service" ? askSellerDialog.item.id : undefined,
    });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div>
          <h1 className="text-4xl font-bold font-display">Marketplace</h1>
          <p className="text-muted-foreground mt-2">Browse products and services from verified sellers</p>
        </div>

        <div className="flex flex-col gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Search products and services..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-full"
              data-testid="input-search"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-full sm:w-[180px]" data-testid="select-category">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="printing">Printing</SelectItem>
                <SelectItem value="design">Design</SelectItem>
                <SelectItem value="marketing">Marketing</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full sm:w-[180px]" data-testid="select-sort">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Name (A-Z)</SelectItem>
                <SelectItem value="price-low">Price (Low to High)</SelectItem>
                <SelectItem value="price-high">Price (High to Low)</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex border rounded-md">
              <Button
                variant={viewMode === "grid" ? "default" : "ghost"}
                size="icon"
                onClick={() => setViewMode("grid")}
                data-testid="button-grid-view"
                className="rounded-r-none min-h-11 min-w-11"
              >
                <Grid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "ghost"}
                size="icon"
                onClick={() => setViewMode("list")}
                data-testid="button-list-view"
                className="rounded-l-none min-h-11 min-w-11"
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="products" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="products" data-testid="tab-products">
            <Package className="h-4 w-4 mr-2" />
            Products
          </TabsTrigger>
          <TabsTrigger value="services" data-testid="tab-services">
            <ShoppingCart className="h-4 w-4 mr-2" />
            Services
          </TabsTrigger>
        </TabsList>

        <TabsContent value="products" className="mt-6">
          {productsLoading ? (
            <div className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" : "space-y-4"}>
              {Array.from({ length: 8 }).map((_, i) => (
                <Card key={i}>
                  <CardHeader className="p-0">
                    <Skeleton className="h-48 w-full rounded-t-md" />
                  </CardHeader>
                  <CardContent className="p-4 space-y-3">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : products.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center">
                <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No products found</h3>
                <p className="text-muted-foreground">Try adjusting your search or filters</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-8">
              {/* Featured Products Section */}
              {boostedProducts.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Sparkles className="h-5 w-5 text-primary" />
                    <h2 className="text-2xl font-semibold">Featured Products</h2>
                  </div>
                  <div className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" : "space-y-4"}>
                    {boostedProducts.map((product) => (
                <Card key={product.id} className="h-full hover-elevate transition-all" data-testid={`card-featured-product-${product.id}`}>
                  <Link href={`/product/${product.id}`}>
                    <CardHeader className="p-0 cursor-pointer">
                      <div className="relative aspect-square overflow-hidden rounded-t-md bg-muted">
                        {product.images && product.images[0] ? (
                          <img
                            src={product.images[0]}
                            alt={product.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="h-12 w-12 text-muted-foreground" />
                          </div>
                        )}
                        <Badge className="absolute top-3 right-3 bg-primary/90 backdrop-blur">
                          <Sparkles className="h-3 w-3 mr-1" />
                          Featured
                        </Badge>
                      </div>
                    </CardHeader>
                  </Link>
                  <Link href={`/product/${product.id}`}>
                    <CardContent className="p-4 space-y-2 cursor-pointer">
                      <h3 className="font-semibold line-clamp-2">{product.name}</h3>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        {product.seller && (
                          <>
                            <Badge variant="secondary" className="text-xs">Verified</Badge>
                            <span>{product.seller.firstName} {product.seller.lastName}</span>
                          </>
                        )}
                      </div>
                      {/* Workflow Status Badges */}
                      {(product.requiresDesignApproval || product.requiresQuote) && (
                        <div className="flex flex-wrap items-center gap-2">
                          {product.requiresDesignApproval && product.approvedVariantCount > 0 && (
                            <Badge variant="default" className="text-xs bg-green-500/10 text-green-700 dark:text-green-400 border-green-500">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Design Approved ({product.approvedVariantCount})
                            </Badge>
                          )}
                          {product.requiresDesignApproval && (!product.approvedVariantCount || product.approvedVariantCount === 0) && (
                            <Badge variant="outline" className="text-xs border-orange-500 text-orange-700 dark:text-orange-400">
                              Design Approval Required
                            </Badge>
                          )}
                          {product.requiresQuote && (
                            <Badge variant="outline" className="text-xs border-blue-500 text-blue-700 dark:text-blue-400">
                              Custom Quote Available
                            </Badge>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Link>
                  <CardFooter className="p-4 pt-0 flex flex-col gap-2">
                    <div className="flex justify-between items-center gap-2 w-full">
                      <p className="text-lg font-semibold text-primary">
                        {getProductDisplayPrice(product) || (product.requiresQuote ? "Custom Quote" : "Price TBD")}
                      </p>
                    </div>
                    <div className="flex flex-col gap-2 w-full">
                      {/* Show Add to Cart only if product does NOT require quote, and either:
                          - doesn't require design approval, OR
                          - requires design approval AND has approved variants */}
                      {!product.requiresQuote && (
                        (product.requiresDesignApproval && product.approvedVariantCount > 0) || !product.requiresDesignApproval
                      ) && (
                        <Button
                          className="w-full min-h-11"
                          onClick={(e) => handleAddToCart(e, product)}
                          data-testid={`button-add-to-cart-${product.id}`}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Add to Cart
                        </Button>
                      )}
                      
                      {/* Show Upload Design only if product requires design approval AND has no approved variants */}
                      {product.requiresDesignApproval && (!product.approvedVariantCount || product.approvedVariantCount === 0) && (
                        <Button
                          className="w-full min-h-11"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            navigate(`/product/${product.id}?action=upload-design`);
                          }}
                          data-testid={`button-upload-design-${product.id}`}
                        >
                          <Upload className="h-4 w-4 mr-1" />
                          Upload Your Design
                        </Button>
                      )}
                      
                      {product.requiresQuote && (
                        <Button
                          variant={(product.requiresDesignApproval && product.approvedVariantCount > 0) ? "outline" : "default"}
                          className="w-full min-h-11"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            navigate(`/product/${product.id}?action=request-quote`);
                          }}
                          data-testid={`button-request-quote-${product.id}`}
                        >
                          <FileText className="h-4 w-4 mr-1" />
                          Get Custom Quote
                        </Button>
                      )}
                      
                      <Button
                        variant="outline"
                        className="w-full min-h-11"
                        onClick={(e) => handleAskSeller(e, "product", product)}
                        data-testid={`button-ask-seller-${product.id}`}
                      >
                        <MessageCircle className="h-4 w-4 mr-2" />
                        Ask Seller
                      </Button>
                    </div>
                  </CardFooter>
                </Card>
              ))}
                  </div>
                </div>
              )}

              {/* Regular Products Section */}
              {regularProducts.length > 0 && (
                <div>
                  {boostedProducts.length > 0 && (
                    <div className="flex items-center gap-2 mb-4">
                      <Package className="h-5 w-5 text-muted-foreground" />
                      <h2 className="text-2xl font-semibold">All Products</h2>
                    </div>
                  )}
                  <div className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" : "space-y-4"}>
                    {regularProducts.map((product) => (
                      <Card key={product.id} className="h-full hover-elevate transition-all" data-testid={`card-product-${product.id}`}>
                        <Link href={`/product/${product.id}`}>
                          <CardHeader className="p-0 cursor-pointer">
                            <div className="aspect-square overflow-hidden rounded-t-md bg-muted">
                              {product.images && product.images[0] ? (
                                <img
                                  src={product.images[0]}
                                  alt={product.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Package className="h-12 w-12 text-muted-foreground" />
                                </div>
                              )}
                            </div>
                          </CardHeader>
                        </Link>
                        <Link href={`/product/${product.id}`}>
                          <CardContent className="p-4 space-y-2 cursor-pointer">
                            <h3 className="font-semibold line-clamp-2">{product.name}</h3>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              {product.seller && (
                                <>
                                  <Badge variant="secondary" className="text-xs">Verified</Badge>
                                  <span>{product.seller.firstName} {product.seller.lastName}</span>
                                </>
                              )}
                            </div>
                            {/* Workflow Status Badges */}
                            {(product.requiresDesignApproval || product.requiresQuote) && (
                              <div className="flex flex-wrap items-center gap-2">
                                {product.requiresDesignApproval && product.approvedVariantCount > 0 && (
                                  <Badge variant="default" className="text-xs bg-green-500/10 text-green-700 dark:text-green-400 border-green-500">
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    Design Approved ({product.approvedVariantCount})
                                  </Badge>
                                )}
                                {product.requiresDesignApproval && (!product.approvedVariantCount || product.approvedVariantCount === 0) && (
                                  <Badge variant="outline" className="text-xs border-orange-500 text-orange-700 dark:text-orange-400">
                                    Design Approval Required
                                  </Badge>
                                )}
                                {product.requiresQuote && (
                                  <Badge variant="outline" className="text-xs border-blue-500 text-blue-700 dark:text-blue-400">
                                    Custom Quote Available
                                  </Badge>
                                )}
                              </div>
                            )}
                          </CardContent>
                        </Link>
                        <CardFooter className="p-4 pt-0 flex flex-col gap-2">
                          <div className="flex justify-between items-center gap-2 w-full">
                            <p className="text-lg font-semibold text-primary">
                              {getProductDisplayPrice(product) || (product.requiresQuote ? "Custom Quote" : "Price TBD")}
                            </p>
                          </div>
                          <div className="flex flex-col gap-2 w-full">
                            {!product.requiresQuote && (
                              (product.requiresDesignApproval && product.approvedVariantCount > 0) || !product.requiresDesignApproval
                            ) && (
                              <Button
                                className="w-full min-h-11"
                                onClick={(e) => handleAddToCart(e, product)}
                                data-testid={`button-add-to-cart-${product.id}`}
                              >
                                <Plus className="h-4 w-4 mr-1" />
                                Add to Cart
                              </Button>
                            )}
                            
                            {product.requiresDesignApproval && (!product.approvedVariantCount || product.approvedVariantCount === 0) && (
                              <Button
                                className="w-full min-h-11"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  navigate(`/product/${product.id}?action=upload-design`);
                                }}
                                data-testid={`button-upload-design-${product.id}`}
                              >
                                <Upload className="h-4 w-4 mr-1" />
                                Upload Your Design
                              </Button>
                            )}
                            
                            {product.requiresQuote && (
                              <Button
                                variant={(product.requiresDesignApproval && product.approvedVariantCount > 0) ? "outline" : "default"}
                                className="w-full min-h-11"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  navigate(`/product/${product.id}?action=request-quote`);
                                }}
                                data-testid={`button-request-quote-${product.id}`}
                              >
                                <FileText className="h-4 w-4 mr-1" />
                                Get Custom Quote
                              </Button>
                            )}
                            
                            <Button
                              variant="outline"
                              className="w-full min-h-11"
                              onClick={(e) => handleAskSeller(e, "product", product)}
                              data-testid={`button-ask-seller-${product.id}`}
                            >
                              <MessageCircle className="h-4 w-4 mr-2" />
                              Ask Seller
                            </Button>
                          </div>
                        </CardFooter>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="services" className="mt-6">
          {servicesLoading ? (
            <div className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "space-y-4"}>
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i}>
                  <CardHeader className="p-0">
                    <Skeleton className="h-40 w-full rounded-t-md" />
                  </CardHeader>
                  <CardContent className="p-4 space-y-3">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-1/2" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : services.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center">
                <ShoppingCart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No services found</h3>
                <p className="text-muted-foreground">Try adjusting your search or filters</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-8">
              {/* Featured Services Section */}
              {boostedServices.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Sparkles className="h-5 w-5 text-primary" />
                    <h2 className="text-2xl font-semibold">Featured Services</h2>
                  </div>
                  <div className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "space-y-4"}>
                    {boostedServices.map((service: any) => {
                const minPrice = service.packages?.length > 0
                  ? Math.min(...service.packages.map((pkg: any) => parseFloat(pkg.price)))
                  : null;
                
                return (
                  <Link key={service.id} href={`/book-service/${service.id}`} className="block">
                    <Card className="h-full hover-elevate transition-all cursor-pointer" data-testid={`card-featured-service-${service.id}`}>
                      <CardHeader className="p-0">
                        <div className="relative aspect-video overflow-hidden rounded-t-md bg-muted">
                          {service.images && service.images[0] ? (
                            <img
                              src={service.images[0]}
                              alt={service.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <ShoppingCart className="h-12 w-12 text-muted-foreground" />
                            </div>
                          )}
                          <Badge className="absolute top-3 right-3 bg-primary/90 backdrop-blur">
                            <Sparkles className="h-3 w-3 mr-1" />
                            Featured
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="p-4 space-y-2">
                        <h3 className="font-semibold line-clamp-2">{service.name}</h3>
                        <p className="text-sm text-muted-foreground line-clamp-2">{service.description}</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          {service.seller && (
                            <>
                              <Badge variant="secondary" className="text-xs">Verified</Badge>
                              <span>{service.seller.firstName} {service.seller.lastName}</span>
                            </>
                          )}
                        </div>
                        {/* Workflow Status Badges */}
                        <div className="flex flex-wrap items-center gap-2">
                          {service.hasApprovedDesign && (
                            <Badge variant="default" className="text-xs bg-green-500/10 text-green-700 dark:text-green-400 border-green-500">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Design Approved
                            </Badge>
                          )}
                          {service.hasAcceptedQuote && (
                            <Badge variant="default" className="text-xs bg-green-500/10 text-green-700 dark:text-green-400 border-green-500">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Quote Accepted
                            </Badge>
                          )}
                          {service.requiresDesignApproval && !service.hasApprovedDesign && (
                            <Badge variant="outline" className="text-xs border-orange-500 text-orange-700 dark:text-orange-400">
                              Design Approval Required
                            </Badge>
                          )}
                          {service.requiresQuote && !service.hasAcceptedQuote && (
                            <Badge variant="outline" className="text-xs border-blue-500 text-blue-700 dark:text-blue-400">
                              Custom Quote Available
                            </Badge>
                          )}
                        </div>
                      </CardContent>
                      <CardFooter className="p-4 pt-0 flex flex-col gap-2">
                        <div className="flex justify-between items-center gap-2 w-full">
                          <p className="text-lg font-semibold text-primary">
                            {minPrice ? `From $${minPrice.toFixed(2)}` : service.requiresQuote ? "Custom Quote" : "Price TBD"}
                          </p>
                        </div>
                        <div className="flex gap-2 w-full">
                          <Button
                            className="flex-1 min-h-11"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              navigate(`/book-service/${service.id}`);
                            }}
                            data-testid={`button-view-service-${service.id}`}
                          >
                            More Details
                          </Button>
                          
                          <Button
                            variant="outline"
                            className="flex-1 min-h-11"
                            onClick={(e) => {
                              e.preventDefault();
                              handleAskSeller(e, "service", service);
                            }}
                            data-testid={`button-ask-seller-service-${service.id}`}
                          >
                            <MessageCircle className="h-4 w-4 mr-2" />
                            Ask Seller
                          </Button>
                        </div>
                      </CardFooter>
                    </Card>
                  </Link>
                );
              })}
                  </div>
                </div>
              )}

              {/* Regular Services Section */}
              {regularServices.length > 0 && (
                <div>
                  {boostedServices.length > 0 && (
                    <div className="flex items-center gap-2 mb-4">
                      <ShoppingCart className="h-5 w-5 text-muted-foreground" />
                      <h2 className="text-2xl font-semibold">All Services</h2>
                    </div>
                  )}
                  <div className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "space-y-4"}>
                    {regularServices.map((service: any) => {
                      const minPrice = service.packages?.length > 0
                        ? Math.min(...service.packages.map((pkg: any) => parseFloat(pkg.price)))
                        : null;
                      
                      return (
                        <Link key={service.id} href={`/book-service/${service.id}`} className="block">
                          <Card className="h-full hover-elevate transition-all cursor-pointer" data-testid={`card-service-${service.id}`}>
                            <CardHeader className="p-0">
                              <div className="aspect-video overflow-hidden rounded-t-md bg-muted">
                                {service.images && service.images[0] ? (
                                  <img
                                    src={service.images[0]}
                                    alt={service.name}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <ShoppingCart className="h-12 w-12 text-muted-foreground" />
                                  </div>
                                )}
                              </div>
                            </CardHeader>
                            <CardContent className="p-4 space-y-2">
                              <h3 className="font-semibold line-clamp-2">{service.name}</h3>
                              <p className="text-sm text-muted-foreground line-clamp-2">{service.description}</p>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                {service.seller && (
                                  <>
                                    <Badge variant="secondary" className="text-xs">Verified</Badge>
                                    <span>{service.seller.firstName} {service.seller.lastName}</span>
                                  </>
                                )}
                              </div>
                              {/* Workflow Status Badges */}
                              <div className="flex flex-wrap items-center gap-2">
                                {service.hasApprovedDesign && (
                                  <Badge variant="default" className="text-xs bg-green-500/10 text-green-700 dark:text-green-400 border-green-500">
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    Design Approved
                                  </Badge>
                                )}
                                {service.hasAcceptedQuote && (
                                  <Badge variant="default" className="text-xs bg-green-500/10 text-green-700 dark:text-green-400 border-green-500">
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    Quote Accepted
                                  </Badge>
                                )}
                                {service.requiresDesignApproval && !service.hasApprovedDesign && (
                                  <Badge variant="outline" className="text-xs border-orange-500 text-orange-700 dark:text-orange-400">
                                    Design Approval Required
                                  </Badge>
                                )}
                                {service.requiresQuote && !service.hasAcceptedQuote && (
                                  <Badge variant="outline" className="text-xs border-blue-500 text-blue-700 dark:text-blue-400">
                                    Custom Quote Available
                                  </Badge>
                                )}
                              </div>
                            </CardContent>
                            <CardFooter className="p-4 pt-0 flex flex-col gap-2">
                              <div className="flex justify-between items-center gap-2 w-full">
                                <p className="text-lg font-semibold text-primary">
                                  {minPrice ? `From $${minPrice.toFixed(2)}` : service.requiresQuote ? "Custom Quote" : "Price TBD"}
                                </p>
                              </div>
                              <div className="flex gap-2 w-full">
                                <Button
                                  size="sm"
                                  className="flex-1"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    navigate(`/book-service/${service.id}`);
                                  }}
                                  data-testid={`button-view-service-${service.id}`}
                                >
                                  More Details
                                </Button>
                                
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="flex-1"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    handleAskSeller(e, "service", service);
                                  }}
                                  data-testid={`button-ask-seller-service-${service.id}`}
                                >
                                  <MessageCircle className="h-4 w-4 mr-2" />
                                  Ask Seller
                                </Button>
                              </div>
                            </CardFooter>
                          </Card>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <AddToCartModal
        open={!!selectedProduct && approvedVariants.length > 0}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedProduct(null);
            setApprovedVariants([]);
          }
        }}
        productName={selectedProduct?.name || ""}
        productDescription={selectedProduct?.description}
        productImage={selectedProduct?.images?.[0]}
        approvedVariants={approvedVariants}
        onConfirm={handleConfirmAddToCart}
        isLoading={addToCartMutation.isPending}
      />

      <Dialog open={!!askSellerDialog} onOpenChange={() => setAskSellerDialog(null)}>
        <DialogContent data-testid="dialog-ask-seller">
          <DialogHeader>
            <DialogTitle>Ask Seller a Question</DialogTitle>
          </DialogHeader>
          {askSellerDialog && (
            <div className="space-y-4">
              <div className="flex gap-4">
                {askSellerDialog.item.images && askSellerDialog.item.images[0] && (
                  <img
                    src={askSellerDialog.item.images[0]}
                    alt={askSellerDialog.item.name}
                    className="w-20 h-20 object-cover rounded"
                  />
                )}
                <div className="flex-1">
                  <h3 className="font-semibold">{askSellerDialog.item.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {askSellerDialog.item.seller 
                      ? `Seller: ${askSellerDialog.item.seller.firstName} ${askSellerDialog.item.seller.lastName}`
                      : "Seller information not available"}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="inquiry-message">Your Question</Label>
                <Textarea
                  id="inquiry-message"
                  placeholder="Ask about pricing, availability, customization options, or anything else..."
                  value={inquiryMessage}
                  onChange={(e) => setInquiryMessage(e.target.value)}
                  rows={5}
                  data-testid="textarea-inquiry-message"
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
                    setAskSellerDialog(null);
                    setInquiryMessage("");
                  }}
                  data-testid="button-cancel-inquiry"
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleSendInquiry}
                  disabled={createInquiryMutation.isPending || !inquiryMessage.trim()}
                  data-testid="button-send-inquiry"
                >
                  {createInquiryMutation.isPending ? "Sending..." : "Send Message"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}
