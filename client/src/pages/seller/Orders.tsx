import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Package, ChevronRight, Clock, MessageSquare, Truck, ExternalLink, FileSpreadsheet, FileText } from "lucide-react";
import type { Order } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { useLocation } from "wouter";
import * as XLSX from "xlsx";

const statusColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending_payment: "secondary",
  paid: "default",
  processing: "default",
  shipped: "default",
  delivered: "default",
  cancelled: "destructive",
};

const statusLabels: Record<string, string> = {
  pending_payment: "Pending Payment",
  paid: "Paid",
  processing: "Processing",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export default function Orders() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: orders = [], isLoading } = useQuery<Order[]>({
    queryKey: ["/api/seller/orders"],
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: string }) => {
      return await apiRequest("PUT", `/api/seller/orders/${orderId}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/seller/orders"] });
      toast({ title: "Order status updated successfully" });
      setSelectedOrder(null);
    },
    onError: (error: Error) => {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
    },
  });

  const createConversationMutation = useMutation({
    mutationFn: async (orderId: string) => {
      return await apiRequest("POST", "/api/conversations", {
        type: "order",
        orderId,
        subject: `Order #${orderId.substring(0, 8)}`,
      });
    },
    onSuccess: (conversation: any) => {
      toast({ title: "Conversation created", description: "Redirecting to messages..." });
      setSelectedOrder(null);
      setLocation(`/seller/messages?conversation=${conversation.id}`);
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create conversation", description: error.message, variant: "destructive" });
    },
  });

  const markReadyToShipMutation = useMutation({
    mutationFn: async (orderId: string) => {
      return await apiRequest("PUT", `/api/seller/orders/${orderId}/ready-to-ship`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/seller/orders"] });
      toast({ 
        title: "Order marked as ready to ship", 
        description: "Admin will consolidate and create shipment" 
      });
      setSelectedOrder(null);
    },
    onError: (error: Error) => {
      toast({ title: "Failed to mark order as ready", description: error.message, variant: "destructive" });
    },
  });

  const handleStatusUpdate = (orderId: string, newStatus: string) => {
    updateStatusMutation.mutate({ orderId, status: newStatus });
  };

  const handleContactBuyer = (orderId: string) => {
    createConversationMutation.mutate(orderId);
  };

  const handleMarkReadyToShip = (orderId: string) => {
    markReadyToShipMutation.mutate(orderId);
  };

  const filteredOrders = orders.filter(order =>
    statusFilter === "all" || order.status === statusFilter
  );

  const getNextStatus = (currentStatus: string): string | null => {
    const statusFlow = {
      pending_payment: null, // Only admin can confirm payment
      paid: "processing",
      processing: null, // Seller cannot mark as shipped - admin does this via consolidation
      shipped: "delivered",
      delivered: null,
      cancelled: null,
    };
    return statusFlow[currentStatus as keyof typeof statusFlow] || null;
  };

  const exportToExcel = () => {
    try {
      const exportData = filteredOrders.map((order: Order) => {
        const productTotal = parseFloat(order.unitPrice) * order.quantity;
        const shippingCost = parseFloat(order.shippingCost || "0");
        const totalAmount = productTotal + shippingCost;

        return {
          "Order ID": order.id,
          "Date": order.createdAt ? new Date(order.createdAt).toLocaleDateString() : "N/A",
          "Time": order.createdAt ? new Date(order.createdAt).toLocaleTimeString() : "N/A",
          "Product Name": (order as any).product?.name || "N/A",
          "Variant": (order as any).variant?.name || "N/A",
          "Quantity": order.quantity,
          "Unit Price (USD)": parseFloat(order.unitPrice).toFixed(2),
          "Product Total (USD)": productTotal.toFixed(2),
          "Shipping Cost (USD)": shippingCost.toFixed(2),
          "Total Amount (USD)": totalAmount.toFixed(2),
          "Status": statusLabels[order.status],
          "Buyer ID": order.buyerId,
          "Shipping Address": order.shippingAddress || "N/A",
          "AWB Number": order.aramexAwbNumber || "N/A",
          "Notes": order.notes || "N/A",
        };
      });

      const ws = XLSX.utils.json_to_sheet(exportData);
      
      ws['!cols'] = [
        { wch: 38 }, // Order ID (full UUID)
        { wch: 12 }, // Date
        { wch: 12 }, // Time
        { wch: 30 }, // Product Name
        { wch: 20 }, // Variant
        { wch: 10 }, // Quantity
        { wch: 16 }, // Unit Price (USD)
        { wch: 18 }, // Product Total (USD)
        { wch: 18 }, // Shipping Cost (USD)
        { wch: 18 }, // Total Amount (USD)
        { wch: 18 }, // Status
        { wch: 38 }, // Buyer ID (full UUID)
        { wch: 40 }, // Shipping Address
        { wch: 20 }, // AWB Number
        { wch: 30 }, // Notes
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Orders");

      const today = new Date().toISOString().split('T')[0];
      XLSX.writeFile(wb, `Vaaney_Seller_Orders_${today}.xlsx`);

      toast({
        title: "Export successful",
        description: "Your orders have been exported to Excel",
      });
    } catch (error) {
      console.error("Export failed:", error);
      toast({
        title: "Export failed",
        description: "Failed to export orders to Excel",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold" data-testid="text-page-title">Orders</h1>
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48" data-testid="select-status-filter">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Orders</SelectItem>
              <SelectItem value="pending_payment">Pending Payment</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="processing">Processing</SelectItem>
              <SelectItem value="shipped">Shipped</SelectItem>
              <SelectItem value="delivered">Delivered</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            onClick={exportToExcel}
            disabled={filteredOrders.length === 0}
            data-testid="button-export-excel"
          >
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Export to Excel
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredOrders.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2" data-testid="text-empty-state">No orders found</h3>
            <p className="text-muted-foreground">
              {statusFilter !== "all" ? "Try changing the filter" : "Your orders will appear here"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => (
            <Card key={order.id} className="hover-elevate cursor-pointer" onClick={() => setSelectedOrder(order)}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-lg" data-testid={`text-order-id-${order.id}`}>
                        Order #{order.id.substring(0, 8)}
                      </h3>
                      <Badge variant={statusColors[order.status]} data-testid={`badge-status-${order.id}`}>
                        {statusLabels[order.status]}
                      </Badge>
                    </div>
                    <div className="flex gap-6 text-sm text-muted-foreground">
                      <span data-testid={`text-date-${order.id}`}>
                        {order.createdAt ? format(new Date(order.createdAt), "MMM d, yyyy") : "N/A"}
                      </span>
                      <span className="font-semibold text-foreground" data-testid={`text-amount-${order.id}`}>
                        ${((parseFloat(order.unitPrice) * order.quantity) + parseFloat(order.shippingCost || "0")).toFixed(2)} USD
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto" data-testid="dialog-order-details">
          <DialogHeader>
            <DialogTitle>Order Details #{selectedOrder?.id.substring(0, 8)}</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Status</label>
                  <div className="mt-1">
                    <Badge variant={statusColors[selectedOrder.status]} data-testid="badge-order-status">
                      {statusLabels[selectedOrder.status]}
                    </Badge>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Order Total</label>
                  <div className="mt-1 space-y-1">
                    <p className="text-sm text-muted-foreground">
                      Product: ${(parseFloat(selectedOrder.unitPrice) * selectedOrder.quantity).toFixed(2)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Shipping: ${parseFloat(selectedOrder.shippingCost || "0").toFixed(2)}
                    </p>
                    <p className="font-semibold" data-testid="text-order-total">
                      ${((parseFloat(selectedOrder.unitPrice) * selectedOrder.quantity) + parseFloat(selectedOrder.shippingCost || "0")).toFixed(2)} USD
                    </p>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Order Date</label>
                  <p className="mt-1" data-testid="text-order-date">
                    {selectedOrder.createdAt ? format(new Date(selectedOrder.createdAt), "MMM d, yyyy 'at' h:mm a") : "N/A"}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Buyer ID</label>
                  <p className="mt-1 text-sm" data-testid="text-buyer-id">
                    {selectedOrder.buyerId.substring(0, 12)}...
                  </p>
                </div>
              </div>

              {(selectedOrder as any).product && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Product Details</label>
                  <div className="mt-2">
                    <div className="flex items-center gap-3 p-3 border rounded-md" data-testid="order-product-details">
                      {(selectedOrder as any).product?.images?.[0] && (
                        <img
                          src={(selectedOrder as any).product.images[0]}
                          alt={(selectedOrder as any).product?.name || "Product"}
                          className="w-16 h-16 object-cover rounded"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">{(selectedOrder as any).product?.name || "Product"}</p>
                        <p className="text-sm text-muted-foreground">
                          {(selectedOrder as any).variant?.name && `Variant: ${(selectedOrder as any).variant.name}`}
                        </p>
                        <p className="text-sm text-muted-foreground">Quantity: {selectedOrder.quantity}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">${parseFloat(selectedOrder.unitPrice).toFixed(2)}</p>
                        <p className="text-xs text-muted-foreground">each</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {(selectedOrder as any).designApproval && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Buyer's Design Files</label>
                  <div className="mt-2 p-3 border rounded-md space-y-2 bg-muted/30">
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant={(selectedOrder as any).designApproval.status === 'approved' ? 'default' : 
                                (selectedOrder as any).designApproval.status === 'rejected' ? 'destructive' : 'secondary'}
                        className="text-xs"
                      >
                        <FileText className="h-3 w-3 mr-1" />
                        {(selectedOrder as any).designApproval.status === 'approved' ? 'Approved Design' :
                         (selectedOrder as any).designApproval.status === 'rejected' ? 'Rejected Design' :
                         (selectedOrder as any).designApproval.status === 'changes_requested' ? 'Changes Requested' :
                         'Pending Review'}
                      </Badge>
                    </div>
                    {(selectedOrder as any).designApproval.designFiles && (selectedOrder as any).designApproval.designFiles.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {(selectedOrder as any).designApproval.designFiles.map((file: {url: string; filename: string; size: number; mimeType: string}, index: number) => (
                          <Button
                            key={index}
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(file.url, '_blank')}
                            data-testid={`button-view-design-${index}`}
                          >
                            <ExternalLink className="h-3 w-3 mr-1" />
                            {file.filename}
                          </Button>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No design files uploaded yet. Check the conversation for details.
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-2">
                      {(selectedOrder as any).designApproval.status === 'approved' 
                        ? 'These design files have been approved by you for production.'
                        : (selectedOrder as any).designApproval.status === 'rejected'
                        ? 'This design was rejected. Check conversation for feedback.'
                        : 'Design approval is pending. Review in your messages.'}
                    </p>
                  </div>
                </div>
              )}

              <div>
                <label className="text-sm font-medium text-muted-foreground">Shipping Address</label>
                <p className="mt-1 whitespace-pre-wrap" data-testid="text-shipping-address">
                  {selectedOrder.shippingAddress}
                </p>
              </div>

              {selectedOrder.notes && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Notes</label>
                  <p className="mt-1 text-sm" data-testid="text-order-notes">
                    {selectedOrder.notes}
                  </p>
                </div>
              )}

              {selectedOrder.aramexAwbNumber && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Shipping Details</label>
                  <div className="mt-2 p-3 border rounded-md space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">AWB Number:</span>
                      <span className="text-sm" data-testid="text-awb-number">{selectedOrder.aramexAwbNumber}</span>
                    </div>
                    {selectedOrder.aramexTrackingUrl && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => selectedOrder.aramexTrackingUrl && window.open(selectedOrder.aramexTrackingUrl, '_blank')}
                        data-testid="button-track-shipment"
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Track Shipment
                      </Button>
                    )}
                    {selectedOrder.aramexLabelUrl && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => selectedOrder.aramexLabelUrl && window.open(selectedOrder.aramexLabelUrl, '_blank')}
                        data-testid="button-view-label"
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        View Shipping Label
                      </Button>
                    )}
                  </div>
                </div>
              )}

              <div className="pt-4 border-t space-y-2">
                <Button
                  variant="outline"
                  onClick={() => handleContactBuyer(selectedOrder.id)}
                  disabled={createConversationMutation.isPending}
                  className="w-full"
                  data-testid="button-contact-buyer"
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  {createConversationMutation.isPending ? "Opening conversation..." : "Contact Buyer"}
                </Button>
                
                {selectedOrder.status === "processing" && !selectedOrder.readyToShip && (
                  <Button
                    variant="default"
                    onClick={() => handleMarkReadyToShip(selectedOrder.id)}
                    disabled={markReadyToShipMutation.isPending}
                    className="w-full"
                    data-testid="button-mark-ready-to-ship"
                  >
                    <Truck className="h-4 w-4 mr-2" />
                    {markReadyToShipMutation.isPending ? "Marking..." : "Mark as Ready to Ship"}
                  </Button>
                )}
                
                {selectedOrder.status === "paid" && (
                  <div className="bg-muted p-4 rounded-md text-sm text-muted-foreground">
                    <p className="font-medium">Next Step: Start Processing</p>
                    <p className="text-xs mt-1">Mark this order as "Processing" below to begin preparing it. Once ready, you can then mark it as ready to ship.</p>
                  </div>
                )}

                {selectedOrder.readyToShip && (
                  <div className="bg-muted p-4 rounded-md text-sm text-muted-foreground">
                    <p className="font-medium">Ready to Ship</p>
                    <p className="text-xs mt-1">This order is ready for admin to consolidate and create shipment.</p>
                  </div>
                )}
              </div>

              {selectedOrder.status === "pending_payment" && (
                <div className="pt-4 border-t">
                  <div className="bg-muted p-4 rounded-md text-sm text-muted-foreground flex items-start gap-3">
                    <Clock className="h-5 w-5 flex-shrink-0 mt-0.5" />
                    <span>Waiting for admin to confirm payment. You cannot update this order until payment is confirmed.</span>
                  </div>
                </div>
              )}

              {getNextStatus(selectedOrder.status) && (
                <div className="flex gap-2 pt-4 border-t">
                  <Button
                    onClick={() => handleStatusUpdate(selectedOrder.id, getNextStatus(selectedOrder.status)!)}
                    disabled={updateStatusMutation.isPending}
                    className="flex-1"
                    data-testid="button-update-status"
                  >
                    {updateStatusMutation.isPending
                      ? "Updating..."
                      : `Mark as ${statusLabels[getNextStatus(selectedOrder.status)!]}`}
                  </Button>
                  {selectedOrder.status !== "cancelled" && selectedOrder.status !== "delivered" && (
                    <Button
                      variant="outline"
                      onClick={() => handleStatusUpdate(selectedOrder.id, "cancelled")}
                      disabled={updateStatusMutation.isPending}
                      data-testid="button-cancel-order"
                    >
                      Cancel Order
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
