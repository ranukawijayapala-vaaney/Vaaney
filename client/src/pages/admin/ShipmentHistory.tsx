import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Package, TrendingUp, TrendingDown, DollarSign, ExternalLink, CheckCircle, AlertCircle, FileSpreadsheet, Truck } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from "xlsx";

interface ConsolidatedShipment {
  id: string;
  buyerId: string;
  awbNumber: string | null;
  labelUrl: string | null;
  trackingUrl: string | null;
  numberOfOrders: number;
  totalWeight: string;
  totalShippingCost: string;
  actualAramexCost: string | null;
  aramexPaymentStatus: string;
  aramexPaidAt: string | null;
  status: string;
  createdByAdminId: string | null;
  createdAt: string;
  buyer: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
  };
}

interface ShipmentOrder {
  id: string;
  productId: string;
  variantId: string;
  quantity: number;
  status: string;
  product: {
    name: string;
  };
  variant: {
    name: string | null;
  };
}

export default function ShipmentHistory() {
  const { toast } = useToast();
  const [selectedShipmentId, setSelectedShipmentId] = useState<string | null>(null);
  
  const { data: shipments = [], isLoading } = useQuery<ConsolidatedShipment[]>({
    queryKey: ["/api/admin/consolidated-shipments"],
  });
  
  const { data: shipmentOrders = [] } = useQuery<ShipmentOrder[]>({
    queryKey: ["/api/admin/consolidated-shipments", selectedShipmentId, "orders"],
    enabled: !!selectedShipmentId,
  });

  const markAsPaidMutation = useMutation({
    mutationFn: async (shipmentId: string) => {
      return await apiRequest("PUT", `/api/admin/consolidated-shipments/${shipmentId}/mark-paid`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/consolidated-shipments"] });
      toast({ title: "Marked as paid", description: "Aramex payment has been marked as complete." });
    },
    onError: (error: Error) => {
      toast({ 
        title: "Failed to mark as paid", 
        description: error.message, 
        variant: "destructive" 
      });
    },
  });

  const syncDeliveriesMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/admin/sync-aramex-deliveries", {});
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/consolidated-shipments"] });
      toast({ 
        title: "Synced delivery statuses", 
        description: `Checked ${data.checkedShipments} shipments, updated ${data.updatedOrders} orders to delivered.` 
      });
    },
    onError: (error: Error) => {
      toast({ 
        title: "Failed to sync deliveries", 
        description: error.message, 
        variant: "destructive" 
      });
    },
  });

  const markDeliveredMutation = useMutation({
    mutationFn: async (orderId: string) => {
      return await apiRequest("PUT", `/api/admin/orders/${orderId}/mark-delivered`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/consolidated-shipments"] });
      if (selectedShipmentId) {
        queryClient.invalidateQueries({ queryKey: ["/api/admin/consolidated-shipments", selectedShipmentId, "orders"] });
      }
      toast({
        title: "Order marked as delivered",
        description: "The order status has been updated to delivered (manual override)."
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to mark as delivered",
        description: error.message,
        variant: "destructive"
      });
    },
  });

  const exportToExcel = () => {
    try {
      const exportData = shipments.map((shipment) => {
        const collected = parseFloat(shipment.totalShippingCost || "0");
        const aramexCost = parseFloat(shipment.actualAramexCost || "0");
        const profitLoss = shipment.actualAramexCost ? collected - aramexCost : null;

        return {
          "Shipment ID": shipment.id,
          "AWB Number": shipment.awbNumber || "Pending",
          "Date": new Date(shipment.createdAt).toLocaleDateString(),
          "Time": new Date(shipment.createdAt).toLocaleTimeString(),
          "Buyer Email": shipment.buyer.email,
          "Buyer Name": `${shipment.buyer.firstName || ""} ${shipment.buyer.lastName || ""}`.trim() || "N/A",
          "Number of Orders": shipment.numberOfOrders,
          "Total Weight (kg)": parseFloat(shipment.totalWeight).toFixed(2),
          "Collected from Buyers ($)": collected.toFixed(2),
          "Aramex Cost ($)": shipment.actualAramexCost ? aramexCost.toFixed(2) : "N/A",
          "Profit/Loss ($)": profitLoss !== null ? profitLoss.toFixed(2) : "N/A",
          "Profit/Loss": profitLoss !== null ? (profitLoss >= 0 ? "Profit" : "Loss") : "N/A",
          "Aramex Payment Status": shipment.aramexPaymentStatus || "N/A",
          "Aramex Paid Date": shipment.aramexPaidAt ? new Date(shipment.aramexPaidAt).toLocaleDateString() : "N/A",
          "Status": shipment.status,
          "Tracking URL": shipment.trackingUrl || "N/A",
        };
      });

      const ws = XLSX.utils.json_to_sheet(exportData);
      
      ws['!cols'] = [
        { wch: 38 }, // Shipment ID (full UUID)
        { wch: 20 }, // AWB Number
        { wch: 12 }, // Date
        { wch: 12 }, // Time
        { wch: 25 }, // Buyer Email
        { wch: 20 }, // Buyer Name
        { wch: 18 }, // Number of Orders
        { wch: 18 }, // Total Weight
        { wch: 22 }, // Collected from Buyers
        { wch: 16 }, // Aramex Cost
        { wch: 18 }, // Profit/Loss Amount
        { wch: 12 }, // Profit/Loss Label
        { wch: 22 }, // Aramex Payment Status
        { wch: 18 }, // Aramex Paid Date
        { wch: 12 }, // Status
        { wch: 50 }, // Tracking URL
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Shipment History");

      const date = new Date().toISOString().split('T')[0];
      const filename = `Vaaney_Shipments_${date}.xlsx`;

      XLSX.writeFile(wb, filename);
      
      toast({ 
        title: "Export successful", 
        description: `Exported ${exportData.length} shipment(s) to ${filename}` 
      });
    } catch (error: any) {
      console.error("Excel export error:", error);
      toast({ 
        title: "Export failed", 
        description: error.message || "Failed to generate Excel file", 
        variant: "destructive" 
      });
    }
  };

  // Calculate totals
  const totalCollected = shipments.reduce((sum, s) => sum + parseFloat(s.totalShippingCost || "0"), 0);
  const totalAramexCost = shipments.reduce((sum, s) => sum + parseFloat(s.actualAramexCost || "0"), 0);
  const totalProfitLoss = totalCollected - totalAramexCost;
  
  const shipmentsWithCost = shipments.filter(s => s.actualAramexCost !== null);
  const shipmentsWithoutCost = shipments.filter(s => s.actualAramexCost === null);
  const unpaidShipments = shipments.filter(s => s.aramexPaymentStatus === "unpaid" && s.actualAramexCost !== null);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Shipment History</h1>
        <p className="text-muted-foreground mt-2">
          Track consolidated shipments with Aramex cost analysis
        </p>
      </div>

      {/* Unpaid Alert */}
      {unpaidShipments.length > 0 && (
        <Card className="border-orange-200 bg-orange-50 dark:border-orange-900 dark:bg-orange-950">
          <CardHeader className="pb-3">
            <CardTitle className="text-orange-800 dark:text-orange-200 flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              {unpaidShipments.length} Unpaid Aramex Shipment{unpaidShipments.length === 1 ? '' : 's'}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-orange-700 dark:text-orange-300">
            You have {unpaidShipments.length} shipment{unpaidShipments.length === 1 ? '' : 's'} with outstanding Aramex payments totaling ${unpaidShipments.reduce((sum, s) => sum + parseFloat(s.actualAramexCost || "0"), 0).toFixed(2)}. Mark them as paid once you've settled with Aramex.
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Shipments</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{shipments.length}</div>
            <p className="text-xs text-muted-foreground">
              {shipmentsWithCost.length} with cost data
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Collected from Buyers</CardTitle>
            <DollarSign className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">${totalCollected.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Total shipping fees collected
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aramex Costs</CardTitle>
            <DollarSign className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">${totalAramexCost.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Actual charges from Aramex
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Profit/Loss</CardTitle>
            {totalProfitLoss >= 0 ? (
              <TrendingUp className="h-4 w-4 text-green-600" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-600" />
            )}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totalProfitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {totalProfitLoss >= 0 ? '+' : '-'}${Math.abs(totalProfitLoss).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              {totalProfitLoss >= 0 ? 'Profit' : 'Loss'} on shipping
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Shipments Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle>All Consolidated Shipments</CardTitle>
          <div className="flex gap-2 flex-wrap">
            <Button
              variant="outline"
              onClick={exportToExcel}
              disabled={shipments.length === 0}
              data-testid="button-export-excel"
            >
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Export to Excel
            </Button>
            <Button
              onClick={() => syncDeliveriesMutation.mutate()}
              disabled={syncDeliveriesMutation.isPending || shipments.length === 0}
              data-testid="button-sync-deliveries"
            >
              <Package className="h-4 w-4 mr-2" />
              {syncDeliveriesMutation.isPending ? "Syncing..." : "Sync from Aramex"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : shipments.length === 0 ? (
            <div className="py-12 text-center">
              <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No shipments yet</h3>
              <p className="text-muted-foreground">
                Consolidated shipments will appear here once created
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <div className="overflow-auto" style={{ maxHeight: 'calc(100vh - 500px)', minHeight: '400px' }}>
                <Table className="min-w-[1400px]">
                  <TableHeader className="sticky top-0 bg-background z-10 shadow-sm">
                    <TableRow>
                      <TableHead className="bg-background min-w-[180px]">Shipment ID</TableHead>
                      <TableHead className="bg-background min-w-[150px]">AWB Number</TableHead>
                      <TableHead className="bg-background min-w-[200px]">Buyer</TableHead>
                      <TableHead className="bg-background min-w-[100px]">Orders</TableHead>
                      <TableHead className="bg-background min-w-[100px]">Weight (kg)</TableHead>
                      <TableHead className="bg-background min-w-[130px]">Collected</TableHead>
                      <TableHead className="bg-background min-w-[130px]">Aramex Cost</TableHead>
                      <TableHead className="bg-background min-w-[130px]">Profit/Loss</TableHead>
                      <TableHead className="bg-background min-w-[140px]">Payment Status</TableHead>
                      <TableHead className="bg-background min-w-[110px]">Status</TableHead>
                      <TableHead className="bg-background min-w-[150px]">Date</TableHead>
                      <TableHead className="text-right bg-background min-w-[150px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {shipments.map((shipment) => {
                      const collected = parseFloat(shipment.totalShippingCost || "0");
                      const aramexCost = parseFloat(shipment.actualAramexCost || "0");
                      const profitLoss = shipment.actualAramexCost ? collected - aramexCost : null;

                      return (
                        <TableRow key={shipment.id} data-testid={`row-shipment-${shipment.id}`}>
                          <TableCell>
                            <div className="font-mono text-sm" data-testid={`text-shipment-id-${shipment.id}`}>
                              {shipment.id.slice(0, 12)}...
                            </div>
                          </TableCell>
                          <TableCell>
                            {shipment.awbNumber ? (
                              <div className="font-medium" data-testid={`text-awb-${shipment.id}`}>
                                {shipment.awbNumber}
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">Pending</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="text-sm" data-testid={`text-buyer-${shipment.id}`}>
                              {shipment.buyer.email}
                            </div>
                            {(shipment.buyer.firstName || shipment.buyer.lastName) && (
                              <div className="text-xs text-muted-foreground">
                                {shipment.buyer.firstName} {shipment.buyer.lastName}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" data-testid={`badge-orders-${shipment.id}`}>
                              {shipment.numberOfOrders} {shipment.numberOfOrders === 1 ? 'order' : 'orders'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm font-medium" data-testid={`text-weight-${shipment.id}`}>
                              {parseFloat(shipment.totalWeight).toFixed(2)} kg
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-semibold text-blue-600 dark:text-blue-400" data-testid={`text-collected-${shipment.id}`}>
                              ${collected.toFixed(2)}
                            </div>
                          </TableCell>
                          <TableCell>
                            {shipment.actualAramexCost !== null ? (
                              <div className="font-semibold text-orange-600 dark:text-orange-400" data-testid={`text-aramex-cost-${shipment.id}`}>
                                ${aramexCost.toFixed(2)}
                              </div>
                            ) : (
                              <Badge variant="outline" className="text-xs">
                                Not available
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {profitLoss !== null ? (
                              <div 
                                className={`font-bold ${profitLoss >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}
                                data-testid={`text-profit-loss-${shipment.id}`}
                              >
                                {profitLoss >= 0 ? '+' : '-'}${Math.abs(profitLoss).toFixed(2)}
                                <div className="text-xs font-normal text-muted-foreground">
                                  {profitLoss >= 0 ? 'Profit' : 'Loss'}
                                </div>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {shipment.actualAramexCost !== null ? (
                              <div>
                                <Badge 
                                  variant={shipment.aramexPaymentStatus === "paid" ? "default" : "secondary"}
                                  className={shipment.aramexPaymentStatus === "paid" ? "bg-green-600" : "bg-orange-500"}
                                  data-testid={`badge-payment-${shipment.id}`}
                                >
                                  {shipment.aramexPaymentStatus === "paid" ? (
                                    <><CheckCircle className="h-3 w-3 mr-1 inline" />Paid</>
                                  ) : (
                                    <><AlertCircle className="h-3 w-3 mr-1 inline" />Unpaid</>
                                  )}
                                </Badge>
                                {shipment.aramexPaidAt && (
                                  <div className="text-xs text-muted-foreground mt-1">
                                    {new Date(shipment.aramexPaidAt).toLocaleDateString()}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={shipment.status === "shipped" ? "default" : "secondary"}
                              data-testid={`badge-status-${shipment.id}`}
                            >
                              {shipment.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm" data-testid={`text-date-${shipment.id}`}>
                              {new Date(shipment.createdAt).toLocaleDateString()}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {new Date(shipment.createdAt).toLocaleTimeString()}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex flex-col items-end gap-2">
                              {shipment.trackingUrl && (
                                <a
                                  href={shipment.trackingUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                                  data-testid={`link-track-${shipment.id}`}
                                >
                                  Track <ExternalLink className="h-3 w-3" />
                                </a>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setSelectedShipmentId(shipment.id)}
                                data-testid={`button-manual-override-${shipment.id}`}
                              >
                                <Truck className="h-4 w-4 mr-1" />
                                Manual Override
                              </Button>
                              {shipment.actualAramexCost !== null && shipment.aramexPaymentStatus === "unpaid" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => markAsPaidMutation.mutate(shipment.id)}
                                  disabled={markAsPaidMutation.isPending}
                                  data-testid={`button-mark-paid-${shipment.id}`}
                                >
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Mark as Paid
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Warning for shipments without cost data */}
      {shipmentsWithoutCost.length > 0 && (
        <Card className="border-orange-200 bg-orange-50 dark:border-orange-900 dark:bg-orange-950">
          <CardHeader>
            <CardTitle className="text-orange-800 dark:text-orange-200 flex items-center gap-2">
              <Package className="h-5 w-5" />
              {shipmentsWithoutCost.length} Shipment{shipmentsWithoutCost.length === 1 ? '' : 's'} Without Cost Data
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-orange-700 dark:text-orange-300">
            Some consolidated shipments were created without Aramex cost data due to API failures or testing. 
            These shipments are excluded from profit/loss calculations.
          </CardContent>
        </Card>
      )}

      {/* Manual Delivery Override Dialog */}
      <Dialog open={selectedShipmentId !== null} onOpenChange={(open) => { if (!open) setSelectedShipmentId(null); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Manual Delivery Override</DialogTitle>
            <DialogDescription>
              Mark individual orders as delivered without Aramex API sync. This is intended for testing or manual intervention when Aramex credentials are unavailable.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {shipmentOrders.length === 0 ? (
              <div className="py-8 text-center">
                <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Loading orders...</p>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground mb-4">
                  {shipmentOrders.length} {shipmentOrders.length === 1 ? 'order' : 'orders'} in this shipment
                </p>
                {shipmentOrders.map((order) => (
                  <Card key={order.id} className="p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1">
                        <h4 className="font-medium text-sm">
                          {order.product.name}
                          {order.variant.name && ` - ${order.variant.name}`}
                        </h4>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                          <span>Qty: {order.quantity}</span>
                          <span>•</span>
                          <Badge variant="secondary" className={
                            order.status === "delivered" ? "bg-green-500/10 text-green-700 dark:text-green-300" :
                            order.status === "shipped" ? "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300" :
                            "bg-muted"
                          }>
                            {order.status}
                          </Badge>
                        </div>
                      </div>
                      <div>
                        {order.status === "shipped" ? (
                          <Button
                            size="sm"
                            onClick={() => {
                              if (confirm(`Mark this order as delivered?\n\nProduct: ${order.product.name}\nThis is a manual override that bypasses Aramex sync.`)) {
                                markDeliveredMutation.mutate(order.id);
                              }
                            }}
                            disabled={markDeliveredMutation.isPending}
                            data-testid={`button-mark-delivered-${order.id}`}
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Mark Delivered
                          </Button>
                        ) : order.status === "delivered" ? (
                          <Badge variant="default" className="bg-green-600">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Delivered
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            Not Shipped
                          </Badge>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
