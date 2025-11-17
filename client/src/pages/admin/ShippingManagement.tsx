import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Package, Truck, User, Calendar, MapPin, Phone, AlertTriangle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { ShippingAddress } from "@shared/schema";

interface Order {
  id: string;
  buyerId: string;
  sellerId: string;
  productId: string;
  variantId: string;
  quantity: number;
  unitPrice: string;
  totalAmount: string;
  shippingAddress: string;
  shippingAddressId: string | null;
  checkoutSessionId: string | null;
  status: string;
  readyToShip: boolean;
  shippingCost: string | null;
  productWeight: string | null;
  createdAt: string;
  checkoutSessionIncomplete: boolean;
  checkoutSessionOrders: Array<{
    id: string;
    readyToShip: boolean;
    status: string;
    sellerId: string;
  }>;
  buyer: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
  };
  seller: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
  };
  product: {
    id: string;
    name: string;
  };
  variant: {
    id: string;
    name: string | null;
  };
  shippingAddressRef: ShippingAddress | null;
}

interface OrderGroup {
  buyerId: string;
  buyer: Order['buyer'];
  shippingAddress: string;
  shippingAddressDetails: ShippingAddress | null;
  orders: Order[];
  totalWeight: number;
  totalCost: number;
  totalShippingCost: number;
}

export default function AdminShippingManagement() {
  const { toast } = useToast();
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());

  const { data: readyOrders = [], isLoading } = useQuery<Order[]>({
    queryKey: ["/api/admin/ready-to-ship-orders"],
  });

  // Group orders by buyer and shipping address
  const orderGroups: OrderGroup[] = Object.values(
    readyOrders.reduce((acc, order) => {
      const key = `${order.buyerId}-${order.shippingAddress}`;
      if (!acc[key]) {
        acc[key] = {
          buyerId: order.buyerId,
          buyer: order.buyer,
          shippingAddress: order.shippingAddress,
          shippingAddressDetails: order.shippingAddressRef,
          orders: [],
          totalWeight: 0,
          totalCost: 0,
          totalShippingCost: 0,
        };
      }
      acc[key].orders.push(order);
      // productWeight already stores the total weight for all units, don't multiply again
      acc[key].totalWeight += parseFloat(order.productWeight || "1.0");
      // Use totalAmount from DB (which is quantity × unitPrice) + shipping
      const orderTotal = parseFloat(order.totalAmount) + parseFloat(order.shippingCost || "0");
      acc[key].totalCost += orderTotal;
      acc[key].totalShippingCost += parseFloat(order.shippingCost || "0");
      return acc;
    }, {} as Record<string, OrderGroup>)
  );

  const createConsolidatedShipmentMutation = useMutation({
    mutationFn: async (orderIds: string[]) => {
      return await apiRequest("POST", "/api/admin/consolidate-shipment", {
        orderIds,
      });
    },
    onError: (error: any) => {
      // Check if this is an incomplete session error
      if (error.requiresOverride) {
        toast({
          title: "Incomplete Checkout Session",
          description: error.message + " Contact development team to implement admin override feature.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: error.message || "Failed to create consolidated shipment",
          variant: "destructive",
        });
      }
    },
    onSuccess: (data) => {
      const costDetails = [];
      if (data.collectedFromBuyers !== undefined) {
        costDetails.push(`Collected: $${parseFloat(data.collectedFromBuyers).toFixed(2)}`);
      }
      if (data.actualAramexCost !== null && data.actualAramexCost !== undefined) {
        costDetails.push(`Aramex Cost: $${parseFloat(data.actualAramexCost).toFixed(2)}`);
        const profitLoss = parseFloat(data.shippingProfitLoss || "0");
        if (profitLoss > 0) {
          costDetails.push(`Profit: $${profitLoss.toFixed(2)}`);
        } else if (profitLoss < 0) {
          costDetails.push(`Loss: $${Math.abs(profitLoss).toFixed(2)}`);
        }
      }
      
      // Show warning toast if Aramex integration failed
      if (data.warning) {
        toast({
          title: "Consolidation created with warning",
          description: data.warning,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Shipment consolidated successfully",
          description: `AWB: ${data.awbNumber}${costDetails.length > 0 ? ' | ' + costDetails.join(' | ') : ''}`,
        });
      }
      
      setSelectedOrders(new Set());
      queryClient.invalidateQueries({ queryKey: ["/api/admin/ready-to-ship-orders"] });
    },
  });

  const toggleOrderSelection = (orderId: string) => {
    const newSelection = new Set(selectedOrders);
    if (newSelection.has(orderId)) {
      newSelection.delete(orderId);
    } else {
      newSelection.add(orderId);
    }
    setSelectedOrders(newSelection);
  };

  const toggleGroupSelection = (group: OrderGroup) => {
    const groupOrderIds = group.orders.map(o => o.id);
    const allSelected = groupOrderIds.every(id => selectedOrders.has(id));
    
    const newSelection = new Set(selectedOrders);
    if (allSelected) {
      groupOrderIds.forEach(id => newSelection.delete(id));
    } else {
      groupOrderIds.forEach(id => newSelection.add(id));
    }
    setSelectedOrders(newSelection);
  };

  const handleConsolidateSelected = () => {
    if (selectedOrders.size === 0) {
      toast({
        title: "No orders selected",
        description: "Please select orders to consolidate",
        variant: "destructive",
      });
      return;
    }

    const selectedArray = Array.from(selectedOrders);
    
    // Check if any selected order is from an incomplete checkout session
    const incompleteOrders = selectedArray.filter(id => {
      const order = readyOrders.find(o => o.id === id);
      return order?.checkoutSessionIncomplete;
    });
    
    if (incompleteOrders.length > 0) {
      toast({
        title: "Cannot consolidate incomplete checkout sessions",
        description: "Some selected orders are from checkout sessions where other orders are not ready to ship. Please wait for all orders in the checkout session to be ready, or deselect these orders.",
        variant: "destructive",
      });
      return;
    }
    
    // Verify all selected orders are from the same buyer
    const buyerIds = selectedArray.map(id => 
      readyOrders.find(o => o.id === id)?.buyerId
    );
    const uniqueBuyers = new Set(buyerIds);
    
    if (uniqueBuyers.size > 1) {
      toast({
        title: "Cannot consolidate",
        description: "Selected orders must be from the same buyer",
        variant: "destructive",
      });
      return;
    }

    createConsolidatedShipmentMutation.mutate(selectedArray);
  };

  const getBuyerName = (buyer: Order['buyer']) => {
    if (buyer.firstName && buyer.lastName) {
      return `${buyer.firstName} ${buyer.lastName}`;
    }
    return buyer.email;
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2" data-testid="text-page-title">Shipping Management</h1>
        <p className="text-muted-foreground">Consolidate ready-to-ship orders by buyer for Aramex shipments</p>
      </div>

      {selectedOrders.size > 0 && (
        <Card className="mb-6 border-primary">
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-primary" />
                <span className="font-semibold">{selectedOrders.size} orders selected</span>
              </div>
              <Button
                onClick={handleConsolidateSelected}
                disabled={createConsolidatedShipmentMutation.isPending}
                data-testid="button-consolidate"
              >
                <Truck className="h-4 w-4 mr-2" />
                {createConsolidatedShipmentMutation.isPending 
                  ? "Creating Shipment..." 
                  : "Create Consolidated Shipment"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-48 w-full" />
          ))}
        </div>
      ) : orderGroups.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No orders ready to ship</h3>
            <p className="text-muted-foreground">
              Orders marked as "ready to ship" by sellers will appear here
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {orderGroups.map((group) => {
            const allSelected = group.orders.every(o => selectedOrders.has(o.id));
            const someSelected = group.orders.some(o => selectedOrders.has(o.id));

            return (
              <Card key={`${group.buyerId}-${group.shippingAddress}`} data-testid={`card-buyer-group-${group.buyerId}`}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      <Checkbox
                        checked={allSelected}
                        onCheckedChange={() => toggleGroupSelection(group)}
                        data-testid={`checkbox-group-${group.buyerId}`}
                      />
                      <div className="flex-1">
                        <CardTitle className="flex items-center gap-2">
                          <User className="h-5 w-5" />
                          {getBuyerName(group.buyer)}
                        </CardTitle>
                        {group.shippingAddressDetails ? (
                          <div className="mt-2 space-y-1">
                            <div className="flex items-start gap-2 text-sm">
                              <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                              <div>
                                <div className="font-medium" data-testid="text-recipient-name">
                                  {group.shippingAddressDetails.recipientName}
                                </div>
                                <div className="text-muted-foreground" data-testid="text-shipping-address">
                                  {group.shippingAddressDetails.streetAddress}
                                  <br />
                                  {group.shippingAddressDetails.city}, {group.shippingAddressDetails.postalCode}
                                  <br />
                                  {group.shippingAddressDetails.country}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Phone className="h-4 w-4" />
                              <span data-testid="text-contact-number">{group.shippingAddressDetails.contactNumber}</span>
                            </div>
                          </div>
                        ) : (
                          <CardDescription className="mt-1">
                            {group.shippingAddress}
                          </CardDescription>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold">{group.orders.length} orders</div>
                      <div className="text-xs text-muted-foreground">
                        Total: ${group.totalCost.toFixed(2)} | Shipping: ${group.totalShippingCost.toFixed(2)} | {group.totalWeight.toFixed(2)} kg
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {group.orders.map((order) => (
                      <div
                        key={order.id}
                        className="flex items-start gap-3 p-3 rounded-md border hover-elevate"
                        data-testid={`order-item-${order.id}`}
                      >
                        <Checkbox
                          checked={selectedOrders.has(order.id)}
                          onCheckedChange={() => toggleOrderSelection(order.id)}
                          data-testid={`checkbox-order-${order.id}`}
                        />
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-2">
                          <div>
                            <div className="font-medium text-sm">{order.product.name}</div>
                            {order.variant.name && (
                              <div className="text-xs text-muted-foreground">{order.variant.name}</div>
                            )}
                            {order.checkoutSessionIncomplete && (
                              <Badge variant="destructive" className="mt-1 text-xs">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                Incomplete Checkout Session
                              </Badge>
                            )}
                          </div>
                          <div className="text-sm">
                            <div className="text-muted-foreground">Seller</div>
                            <div>{order.seller.email}</div>
                          </div>
                          <div className="text-sm">
                            <div className="text-muted-foreground">Quantity & Weight</div>
                            <div>{order.quantity}x | {parseFloat(order.productWeight || "1.0").toFixed(2)} kg</div>
                          </div>
                          <div className="text-sm text-right">
                            <div className="text-muted-foreground">Total (incl. shipping)</div>
                            <div className="font-semibold">${(parseFloat(order.totalAmount) + parseFloat(order.shippingCost || "0")).toFixed(2)}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
