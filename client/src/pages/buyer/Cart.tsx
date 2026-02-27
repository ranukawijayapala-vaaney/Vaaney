import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { ShoppingCart, Trash2, Minus, Plus, AlertTriangle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useLocation } from "wouter";
import { useState, useEffect } from "react";

interface CartItemWithDetails {
  id: string;
  buyerId: string;
  productVariantId: string;
  quantity: number;
  quoteId?: string | null;
  effectiveUnitPrice?: string;
  variant: {
    id: string;
    name: string;
    price: string;
    product: {
      id: string;
      name: string;
      images: string[];
      sellerId: string;
    };
  };
  quote?: {
    id: string;
    quotedPrice: string;
    status: string;
  } | null;
}

export default function Cart() {
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const { data: cartDetails = [], isLoading } = useQuery<CartItemWithDetails[]>({
    queryKey: ["/api/cart"],
  });

  const updateQuantityMutation = useMutation({
    mutationFn: async ({ id, quantity }: { id: string; quantity: number }) => {
      return await apiRequest("PUT", `/api/cart/${id}`, { quantity });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cart"] });
    },
    onError: (error: Error) => {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
    },
  });

  const removeItemMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/cart/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cart"] });
      toast({ title: "Item removed from cart" });
    },
    onError: (error: Error) => {
      toast({ title: "Remove failed", description: error.message, variant: "destructive" });
    },
  });

  const clearCartMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("DELETE", "/api/cart", {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cart"] });
      toast({ title: "Cart cleared" });
    },
    onError: (error: Error) => {
      toast({ title: "Clear failed", description: error.message, variant: "destructive" });
    },
  });

  const handleQuantityChange = (id: string, currentQuantity: number, change: number) => {
    const newQuantity = currentQuantity + change;
    if (newQuantity < 1) return;
    updateQuantityMutation.mutate({ id, quantity: newQuantity });
  };

  const total = cartDetails.reduce((sum, item) => {
    // Use effectiveUnitPrice (quote price if available, else variant price)
    const unitPrice = item.effectiveUnitPrice || item.variant.price;
    return sum + (parseFloat(unitPrice) * item.quantity);
  }, 0);

  const itemsWithInvalidQuotes = cartDetails.filter(
    (item) => item.quoteId && (!item.quote || item.quote.status !== "accepted")
  );

  const handleCheckout = () => {
    if (itemsWithInvalidQuotes.length > 0) {
      toast({
        title: "Cannot proceed to checkout",
        description: `Some items have quotes that are not accepted yet. Please resolve them or remove them from your cart.`,
        variant: "destructive",
      });
      return;
    }
    navigate("/checkout");
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Shopping Cart</h1>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            {[1, 2].map((i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <Skeleton className="h-24 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
          <div>
            <Card>
              <CardContent className="p-6">
                <Skeleton className="h-32 w-full" />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (cartDetails.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <ShoppingCart className="h-24 w-24 text-muted-foreground mb-6" />
        <h2 className="text-2xl font-semibold mb-2" data-testid="text-empty-cart">Your cart is empty</h2>
        <p className="text-muted-foreground mb-6">Add products to your cart to get started</p>
        <Button onClick={() => navigate("/")} data-testid="button-browse-products">
          Browse Products
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold" data-testid="text-page-title">Shopping Cart</h1>
        {cartDetails.length > 0 && (
          <Button
            variant="outline"
            onClick={() => clearCartMutation.mutate()}
            disabled={clearCartMutation.isPending}
            data-testid="button-clear-cart"
          >
            Clear Cart
          </Button>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          {cartDetails.map((item) => (
            <Card key={item.id} data-testid={`cart-item-${item.id}`}>
              <CardContent className="p-6">
                <div className="flex gap-4">
                  {item.variant.product.images && item.variant.product.images.length > 0 && (
                    <img
                      src={item.variant.product.images[0]}
                      alt={item.variant.product.name}
                      className="w-24 h-24 object-cover rounded"
                      data-testid={`img-product-${item.id}`}
                    />
                  )}
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg" data-testid={`text-product-name-${item.id}`}>
                      {item.variant.product.name}
                    </h3>
                    <p className="text-sm text-muted-foreground" data-testid={`text-variant-name-${item.id}`}>
                      {item.variant.name}
                    </p>
                    <p className="text-lg font-semibold mt-2" data-testid={`text-price-${item.id}`}>
                      ${parseFloat(item.effectiveUnitPrice || item.variant.price).toFixed(2)} USD
                      {item.quoteId && <span className="text-xs text-primary ml-2">(Custom Quote)</span>}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-4">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeItemMutation.mutate(item.id)}
                      disabled={removeItemMutation.isPending}
                      data-testid={`button-remove-${item.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleQuantityChange(item.id, item.quantity, -1)}
                        disabled={item.quantity <= 1 || updateQuantityMutation.isPending}
                        data-testid={`button-decrease-${item.id}`}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <Input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => {
                          const newQty = parseInt(e.target.value, 10);
                          if (newQty > 0) {
                            updateQuantityMutation.mutate({ id: item.id, quantity: newQty });
                          }
                        }}
                        className="w-16 text-center"
                        min="1"
                        data-testid={`input-quantity-${item.id}`}
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleQuantityChange(item.id, item.quantity, 1)}
                        disabled={updateQuantityMutation.isPending}
                        data-testid={`button-increase-${item.id}`}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div>
          <Card data-testid="card-order-summary">
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between text-lg">
                <span className="font-semibold">Total</span>
                <span className="font-bold" data-testid="text-total">
                  ${total.toFixed(2)} USD
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-4">
                Platform commission is deducted from seller payouts
              </p>
            </CardContent>
            {itemsWithInvalidQuotes.length > 0 && (
              <CardContent className="pt-0">
                <Alert variant="destructive" data-testid="alert-invalid-quotes">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    {itemsWithInvalidQuotes.map((item) => (
                      <span key={item.id} className="block text-sm">
                        {item.variant.product.name} - {item.variant.name}: quote is {item.quote ? item.quote.status : "unavailable"}
                      </span>
                    ))}
                    <span className="block text-xs mt-1">Accept the quotes or remove these items to proceed.</span>
                  </AlertDescription>
                </Alert>
              </CardContent>
            )}
            <CardFooter>
              <Button
                className="w-full"
                onClick={handleCheckout}
                disabled={itemsWithInvalidQuotes.length > 0}
                data-testid="button-checkout"
              >
                Proceed to Checkout
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
