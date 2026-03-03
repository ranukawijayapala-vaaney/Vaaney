import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Package, Truck, User, Calendar, MapPin, Phone, AlertTriangle, Ruler, Weight } from "lucide-react";
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
  productDimensions: { length: number; width: number; height: number } | null;
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
  packageDimensions: { length: number; width: number; height: number } | null;
  volumetricWeight: number | null;
}

export default function AdminShippingManagement() {
  const { toast } = useToast();
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [consolidateDialogOpen, setConsolidateDialogOpen] = useState(false);
  const [overrideLength, setOverrideLength] = useState("");
  const [overrideWidth, setOverrideWidth] = useState("");
  const [overrideHeight, setOverrideHeight] = useState("");

  const { data: readyOrders = [], isLoading } = useQuery<Order[]>({
    queryKey: ["/api/admin/ready-to-ship-orders"],
  });

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
          packageDimensions: null,
          volumetricWeight: null,
        };
      }
      acc[key].orders.push(order);
      acc[key].totalWeight += parseFloat(order.productWeight || "1.0");
      const orderTotal = parseFloat(order.totalAmount) + parseFloat(order.shippingCost || "0");
      acc[key].totalCost += orderTotal;
      acc[key].totalShippingCost += parseFloat(order.shippingCost || "0");
      return acc;
    }, {} as Record<string, OrderGroup>)
  );

  for (const group of orderGroups) {
    let maxLength = 0, maxWidth = 0, totalHeight = 0;
    let hasDimensions = false;
    for (const order of group.orders) {
      const dims = order.productDimensions;
      if (dims && dims.length && dims.width && dims.height) {
        hasDimensions = true;
        maxLength = Math.max(maxLength, dims.length);
        maxWidth = Math.max(maxWidth, dims.width);
        totalHeight += dims.height;
      }
    }
    if (hasDimensions) {
      group.packageDimensions = { length: maxLength, width: maxWidth, height: totalHeight };
      group.volumetricWeight = (maxLength * maxWidth * totalHeight) / 5000;
    }
  }

  const createConsolidatedShipmentMutation = useMutation({
    mutationFn: async (orderIds: string[]) => {
      const payload: any = { orderIds };
      if (overrideLength && overrideWidth && overrideHeight) {
        payload.overrideDimensions = {
          length: overrideLength,
          width: overrideWidth,
          height: overrideHeight,
        };
      }
      return await apiRequest("POST", "/api/admin/consolidate-shipment", payload);
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
      setConsolidateDialogOpen(false);
      setOverrideLength("");
      setOverrideWidth("");
      setOverrideHeight("");
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

  const getSelectedOrdersInfo = () => {
    const selectedArray = Array.from(selectedOrders);
    const selectedOrdersList = selectedArray.map(id => readyOrders.find(o => o.id === id)).filter(Boolean) as Order[];
    let totalWeight = 0;
    let maxLength = 0, maxWidth = 0, totalHeight = 0;
    let hasDimensions = false;
    for (const order of selectedOrdersList) {
      totalWeight += parseFloat(order.productWeight || "1.0");
      const dims = order.productDimensions;
      if (dims && dims.length && dims.width && dims.height) {
        hasDimensions = true;
        maxLength = Math.max(maxLength, dims.length);
        maxWidth = Math.max(maxWidth, dims.width);
        totalHeight += dims.height;
      }
    }
    const packageDims = hasDimensions ? { length: maxLength, width: maxWidth, height: totalHeight } : null;
    const volWeight = packageDims ? (packageDims.length * packageDims.width * packageDims.height) / 5000 : null;
    return { totalWeight, packageDims, volWeight, orders: selectedOrdersList };
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

    setConsolidateDialogOpen(true);
  };

  const handleConfirmConsolidate = () => {
    const selectedArray = Array.from(selectedOrders);
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
                    <div className="text-right space-y-1">
                      <div className="text-sm font-semibold">{group.orders.length} orders</div>
                      <div className="text-xs text-muted-foreground">
                        Total: ${group.totalCost.toFixed(2)} | Shipping: ${group.totalShippingCost.toFixed(2)}
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center justify-end gap-1">
                        <Weight className="h-3 w-3" />
                        {group.totalWeight.toFixed(2)} kg
                        {group.volumetricWeight && group.volumetricWeight > group.totalWeight && (
                          <span className="text-amber-600 dark:text-amber-400"> (vol: {group.volumetricWeight.toFixed(2)} kg)</span>
                        )}
                      </div>
                      {group.packageDimensions && (
                        <div className="text-xs text-muted-foreground flex items-center justify-end gap-1">
                          <Ruler className="h-3 w-3" />
                          {group.packageDimensions.length.toFixed(0)} x {group.packageDimensions.width.toFixed(0)} x {group.packageDimensions.height.toFixed(0)} cm
                        </div>
                      )}
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
                            <div className="text-muted-foreground">Qty / Weight / Dims</div>
                            <div>{order.quantity}x | {parseFloat(order.productWeight || "1.0").toFixed(2)} kg</div>
                            {order.productDimensions && (
                              <div className="text-xs text-muted-foreground">
                                {order.productDimensions.length}x{order.productDimensions.width}x{order.productDimensions.height} cm
                              </div>
                            )}
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

      <Dialog open={consolidateDialogOpen} onOpenChange={setConsolidateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Consolidated Shipment</DialogTitle>
            <DialogDescription>
              Review the package details before creating the Aramex shipment.
            </DialogDescription>
          </DialogHeader>
          {(() => {
            const info = getSelectedOrdersInfo();
            return (
              <div className="space-y-4 py-2">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">Orders:</span>
                    <span className="ml-2 font-medium">{selectedOrders.size}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Actual Weight:</span>
                    <span className="ml-2 font-medium">{info.totalWeight.toFixed(2)} kg</span>
                  </div>
                  {info.packageDims && (
                    <>
                      <div>
                        <span className="text-muted-foreground">Est. Dimensions:</span>
                        <span className="ml-2 font-medium">
                          {info.packageDims.length.toFixed(0)} x {info.packageDims.width.toFixed(0)} x {info.packageDims.height.toFixed(0)} cm
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Volumetric Weight:</span>
                        <span className={`ml-2 font-medium ${info.volWeight && info.volWeight > info.totalWeight ? "text-amber-600 dark:text-amber-400" : ""}`}>
                          {info.volWeight?.toFixed(2)} kg
                        </span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-muted-foreground">Chargeable Weight:</span>
                        <span className="ml-2 font-semibold">
                          {Math.max(info.totalWeight, info.volWeight || 0).toFixed(2)} kg
                          {info.volWeight && info.volWeight > info.totalWeight && (
                            <span className="text-xs text-amber-600 dark:text-amber-400 ml-1">(volumetric)</span>
                          )}
                        </span>
                      </div>
                    </>
                  )}
                </div>

                <div className="border-t pt-4">
                  <Label className="text-sm font-medium">Override Package Dimensions (optional)</Label>
                  <p className="text-xs text-muted-foreground mb-3">
                    If the actual packed box is different from the estimated dimensions, enter the real measurements here.
                  </p>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label htmlFor="override-length" className="text-xs">Length (cm)</Label>
                      <Input
                        id="override-length"
                        type="number"
                        placeholder={info.packageDims?.length.toFixed(0) || "0"}
                        value={overrideLength}
                        onChange={(e) => setOverrideLength(e.target.value)}
                        data-testid="input-override-length"
                      />
                    </div>
                    <div>
                      <Label htmlFor="override-width" className="text-xs">Width (cm)</Label>
                      <Input
                        id="override-width"
                        type="number"
                        placeholder={info.packageDims?.width.toFixed(0) || "0"}
                        value={overrideWidth}
                        onChange={(e) => setOverrideWidth(e.target.value)}
                        data-testid="input-override-width"
                      />
                    </div>
                    <div>
                      <Label htmlFor="override-height" className="text-xs">Height (cm)</Label>
                      <Input
                        id="override-height"
                        type="number"
                        placeholder={info.packageDims?.height.toFixed(0) || "0"}
                        value={overrideHeight}
                        onChange={(e) => setOverrideHeight(e.target.value)}
                        data-testid="input-override-height"
                      />
                    </div>
                  </div>
                  {overrideLength && overrideWidth && overrideHeight && (
                    <div className="mt-2 text-xs text-muted-foreground">
                      Override volumetric weight: {((parseFloat(overrideLength) * parseFloat(overrideWidth) * parseFloat(overrideHeight)) / 5000).toFixed(2)} kg
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
          <DialogFooter>
            <Button variant="outline" onClick={() => setConsolidateDialogOpen(false)} data-testid="button-cancel-consolidate">
              Cancel
            </Button>
            <Button
              onClick={handleConfirmConsolidate}
              disabled={createConsolidatedShipmentMutation.isPending}
              data-testid="button-confirm-consolidate"
            >
              <Truck className="h-4 w-4 mr-2" />
              {createConsolidatedShipmentMutation.isPending ? "Creating..." : "Create Shipment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
