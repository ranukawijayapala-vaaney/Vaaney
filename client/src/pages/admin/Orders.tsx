import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Package, User, Calendar, DollarSign, Store, Eye } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface OrderItem {
  id: string;
  productName: string;
  variantName: string | null;
  quantity: number;
  price: string;
}

interface Order {
  id: string;
  userId: string;
  totalAmount: string;
  status: string;
  shippingAddress: string;
  createdAt: string;
  buyer: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
  };
  seller?: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    businessName: string | null;
    phone: string | null;
  };
  itemCount: number;
  items: OrderItem[];
}

export default function AdminOrders() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);

  const { data: orders = [], isLoading } = useQuery<Order[]>({
    queryKey: ["/api/admin/orders"],
  });

  const handleViewOrder = (order: Order) => {
    setSelectedOrder(order);
    setShowOrderDetails(true);
  };

  const filteredOrders = orders.filter((order: Order) => {
    return statusFilter === "all" || order.status === statusFilter;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending_payment": return "bg-yellow-500/10 text-yellow-700 dark:text-yellow-300";
      case "paid": return "bg-blue-500/10 text-blue-700 dark:text-blue-300";
      case "processing": return "bg-purple-500/10 text-purple-700 dark:text-purple-300";
      case "shipped": return "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300";
      case "delivered": return "bg-green-500/10 text-green-700 dark:text-green-300";
      case "cancelled": return "bg-red-500/10 text-red-700 dark:text-red-300";
      default: return "bg-muted";
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2" data-testid="text-page-title">All Orders</h1>
        <p className="text-muted-foreground">Complete order history with buyer and item details</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <CardTitle>Order List ({filteredOrders.length})</CardTitle>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]" data-testid="select-status-filter">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending_payment">Pending Payment</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="shipped">Shipped</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="py-12 text-center">
              <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No orders found</h3>
              <p className="text-muted-foreground">
                {statusFilter !== "all" 
                  ? "Try adjusting your filter" 
                  : "Orders will appear here once buyers make purchases"}
              </p>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden xl:block rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order ID</TableHead>
                      <TableHead>Buyer</TableHead>
                      <TableHead>Seller</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOrders.map((order: Order) => (
                      <TableRow key={order.id} data-testid={`row-order-${order.id}`}>
                        <TableCell>
                          <div className="font-mono text-sm" data-testid={`text-order-id-${order.id}`}>
                            {order.id.slice(0, 8)}...
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <div className="font-medium text-sm" data-testid={`text-buyer-name-${order.id}`}>
                                {order.buyer.firstName} {order.buyer.lastName}
                              </div>
                              <div className="text-xs text-muted-foreground" data-testid={`text-buyer-email-${order.id}`}>
                                {order.buyer.email}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Store className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <div className="font-medium text-sm" data-testid={`text-seller-name-${order.id}`}>
                                {order.seller?.businessName || `${order.seller?.firstName || ''} ${order.seller?.lastName || ''}`.trim() || 'N/A'}
                              </div>
                              <div className="text-xs text-muted-foreground" data-testid={`text-seller-email-${order.id}`}>
                                {order.seller?.email || 'N/A'}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm" data-testid={`text-item-count-${order.id}`}>
                            {order.itemCount} {order.itemCount === 1 ? 'item' : 'items'}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {order.items.slice(0, 2).map((item, idx) => (
                              <div key={idx}>{item.productName}</div>
                            ))}
                            {order.items.length > 2 && (
                              <div>+{order.items.length - 2} more</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium" data-testid={`text-total-${order.id}`}>
                            ${order.totalAmount}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={getStatusColor(order.status)} data-testid={`badge-status-${order.id}`}>
                            {order.status.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm" data-testid={`text-date-${order.id}`}>
                            {new Date(order.createdAt).toLocaleDateString()}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleViewOrder(order)}
                            data-testid={`button-view-order-${order.id}`}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile/Tablet Card View */}
              <div className="xl:hidden space-y-4">
                {filteredOrders.map((order: Order) => (
                  <Card key={order.id} data-testid={`card-order-${order.id}`}>
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-xs text-muted-foreground font-mono" data-testid={`text-order-id-${order.id}`}>
                              {order.id.slice(0, 8)}...
                            </p>
                            <Badge variant="secondary" className={getStatusColor(order.status)} data-testid={`badge-status-${order.id}`}>
                              {order.status.replace('_', ' ')}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 mb-2">
                            <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <div className="min-w-0">
                              <p className="font-medium text-sm truncate" data-testid={`text-buyer-name-${order.id}`}>
                                {order.buyer.firstName} {order.buyer.lastName}
                              </p>
                              <p className="text-xs text-muted-foreground truncate" data-testid={`text-buyer-email-${order.id}`}>
                                {order.buyer.email}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Store className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <div className="min-w-0">
                              <p className="font-medium text-sm truncate" data-testid={`text-seller-name-${order.id}`}>
                                {order.seller?.businessName || `${order.seller?.firstName || ''} ${order.seller?.lastName || ''}`.trim() || 'N/A'}
                              </p>
                              <p className="text-xs text-muted-foreground truncate" data-testid={`text-seller-email-${order.id}`}>
                                {order.seller?.email || 'N/A'}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="font-semibold text-lg text-primary" data-testid={`text-total-${order.id}`}>
                            ${order.totalAmount}
                          </p>
                          <p className="text-xs text-muted-foreground" data-testid={`text-date-${order.id}`}>
                            {new Date(order.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0 space-y-3">
                      <div>
                        <p className="text-sm font-medium mb-1" data-testid={`text-item-count-${order.id}`}>
                          {order.itemCount} {order.itemCount === 1 ? 'item' : 'items'}
                        </p>
                        <div className="text-xs text-muted-foreground space-y-0.5">
                          {order.items.slice(0, 2).map((item, idx) => (
                            <div key={idx} className="truncate">{item.productName}</div>
                          ))}
                          {order.items.length > 2 && (
                            <div>+{order.items.length - 2} more</div>
                          )}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Shipping Address</p>
                        <p className="text-sm line-clamp-2" data-testid={`text-address-${order.id}`}>
                          {order.shippingAddress}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => handleViewOrder(order)}
                        data-testid={`button-view-order-mobile-${order.id}`}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Order Details Modal */}
      <Dialog open={showOrderDetails} onOpenChange={setShowOrderDetails}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Order Details</DialogTitle>
            <DialogDescription>
              Order #{selectedOrder?.id.slice(0, 8)}...
            </DialogDescription>
          </DialogHeader>
          
          {selectedOrder && (
            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge variant="secondary" className={getStatusColor(selectedOrder.status)}>
                    {selectedOrder.status.replace('_', ' ')}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Amount</p>
                  <p className="font-semibold">${selectedOrder.totalAmount}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Order Date</p>
                  <p className="text-sm">{new Date(selectedOrder.createdAt).toLocaleString()}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Buyer Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-1">
                      <p className="font-medium">{selectedOrder.buyer.firstName} {selectedOrder.buyer.lastName}</p>
                      <p className="text-sm text-muted-foreground">{selectedOrder.buyer.email}</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Store className="h-4 w-4" />
                      Seller Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-1">
                      <p className="font-medium">
                        {selectedOrder.seller?.businessName || `${selectedOrder.seller?.firstName || ''} ${selectedOrder.seller?.lastName || ''}`.trim() || 'N/A'}
                      </p>
                      <p className="text-sm text-muted-foreground">{selectedOrder.seller?.email || 'N/A'}</p>
                      {selectedOrder.seller?.phone && (
                        <p className="text-sm text-muted-foreground">{selectedOrder.seller.phone}</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Shipping Address</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{selectedOrder.shippingAddress}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Order Items ({selectedOrder.itemCount})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>Variant</TableHead>
                        <TableHead className="text-right">Qty</TableHead>
                        <TableHead className="text-right">Price</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedOrder.items.map((item, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-medium">{item.productName}</TableCell>
                          <TableCell>{item.variantName || '-'}</TableCell>
                          <TableCell className="text-right">{item.quantity}</TableCell>
                          <TableCell className="text-right">${item.price}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
