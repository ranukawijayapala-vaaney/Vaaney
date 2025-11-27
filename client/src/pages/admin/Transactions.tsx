import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { DollarSign, TrendingUp, Lock, CheckCircle, Filter, ExternalLink, Package, User, Calendar, Clock, XCircle, Truck, FileSpreadsheet, ChevronLeft, ChevronRight, Store } from "lucide-react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Transaction } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";

interface OrderDetails {
  id: string;
  totalAmount: string;
  shippingCost: string;
  status: string;
  shippingAddress: string;
  createdAt: string;
  buyer: {
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
  items: Array<{
    productName: string;
    variantName: string | null;
    quantity: number;
    price?: string;
    pricePerUnit?: string;
  }>;
}

interface BookingDetails {
  id: string;
  scheduledDate: string;
  scheduledTime: string;
  totalAmount: string;
  status: string;
  requirements: string | null;
  createdAt: string;
  customer: {
    email: string;
    firstName: string | null;
    lastName: string | null;
  };
  service: {
    name: string;
    category: string;
  };
  package: {
    name: string;
    price: string;
  } | null;
}

interface BoostPurchaseDetails {
  id: string;
  sellerId: string;
  packageId: string;
  itemType: "product" | "service";
  itemId: string;
  amount: string;
  status: "pending" | "processing" | "paid" | "failed" | "cancelled";
  paymentReference: string | null;
  paymentSlipUrl: string | null;
  paymentMethod: string | null;
  createdAt: string;
  paidAt: string | null;
  seller: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
  };
  packageName: string;
  itemName: string;
}

interface EnrichedTransaction extends Transaction {
  orderStatus?: string | null;
  bookingStatus?: string | null;
  paymentMethod?: string | null;
  bankAccountDetails?: {
    id: string;
    displayName: string;
    bankName: string;
    accountNumber: string;
    currency: string;
  } | null;
  transferSlipObjectPath?: string | null;
}

const ROWS_PER_PAGE = 6;

export default function Transactions() {
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedTransactions, setSelectedTransactions] = useState<string[]>([]);
  const [viewingOrder, setViewingOrder] = useState<string | null>(null);
  const [viewingBooking, setViewingBooking] = useState<string | null>(null);

  const { data: transactions = [], isLoading } = useQuery<EnrichedTransaction[]>({
    queryKey: ["/api/admin/transactions"],
  });

  const { data: allOrders = [] } = useQuery<OrderDetails[]>({
    queryKey: ["/api/admin/orders"],
  });

  const { data: allBookings = [] } = useQuery<BookingDetails[]>({
    queryKey: ["/api/admin/bookings"],
  });

  const { data: boostPurchases = [] } = useQuery<BoostPurchaseDetails[]>({
    queryKey: ["/api/admin/boost-purchases"],
  });

  const currentOrder = allOrders.find(o => o.id === viewingOrder);
  const currentBooking = allBookings.find(b => b.id === viewingBooking);

  const releasePaymentMutation = useMutation({
    mutationFn: async (transactionId: string) => {
      return await apiRequest("PUT", `/api/admin/transactions/${transactionId}/release`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/transactions"] });
      toast({ title: "Payment released successfully!" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to release payment", description: error.message, variant: "destructive" });
    },
  });

  const releaseSelectedMutation = useMutation({
    mutationFn: async (transactionIds: string[]) => {
      // Release all selected transactions in parallel
      const promises = transactionIds.map(id => 
        apiRequest("PUT", `/api/admin/transactions/${id}/release`, {})
      );
      return await Promise.all(promises);
    },
    onSuccess: (_, transactionIds) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/transactions"] });
      setSelectedTransactions([]);
      toast({ title: `Released ${transactionIds.length} payment(s) successfully!` });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to release payments", description: error.message, variant: "destructive" });
    },
  });

  const confirmPaymentMutation = useMutation({
    mutationFn: async (orderId: string) => {
      return await apiRequest("PUT", `/api/admin/orders/${orderId}/confirm-payment`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/transactions"] });
      toast({ title: "Payment confirmed successfully!" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to confirm payment", description: error.message, variant: "destructive" });
    },
  });

  const confirmBookingPaymentMutation = useMutation({
    mutationFn: async (bookingId: string) => {
      return await apiRequest("PUT", `/api/admin/bookings/${bookingId}/confirm-payment`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/bookings"] });
      toast({ title: "Booking payment confirmed successfully!" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to confirm booking payment", description: error.message, variant: "destructive" });
    },
  });

  const cancelBookingMutation = useMutation({
    mutationFn: async (bookingId: string) => {
      return await apiRequest("PATCH", `/api/seller/bookings/${bookingId}/status`, { status: "cancelled" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/bookings"] });
      toast({ title: "Booking cancelled successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to cancel booking", description: error.message, variant: "destructive" });
    },
  });

  const cancelOrderMutation = useMutation({
    mutationFn: async (orderId: string) => {
      return await apiRequest("PUT", `/api/admin/orders/${orderId}/cancel`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/transactions"] });
      toast({ title: "Order cancelled successfully!" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to cancel order", description: error.message, variant: "destructive" });
    },
  });

  const updateOrderStatusMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: string }) => {
      return await apiRequest("PUT", `/api/orders/${orderId}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/orders"] });
      toast({ title: "Order status updated successfully!" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update order status", description: error.message, variant: "destructive" });
    },
  });

  const confirmBoostPaymentMutation = useMutation({
    mutationFn: async (boostPurchaseId: string) => {
      return await apiRequest("PUT", `/api/admin/boost-purchases/${boostPurchaseId}/confirm-payment`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/boost-purchases"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/boosted-items"] });
      toast({ title: "Boost payment confirmed and activated successfully!" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to confirm boost payment", description: error.message, variant: "destructive" });
    },
  });

  const handleReleasePayment = (transactionId: string) => {
    if (confirm("Are you sure you want to release this payment to the seller?")) {
      releasePaymentMutation.mutate(transactionId);
    }
  };

  const handleReleaseSelected = () => {
    if (selectedTransactions.length === 0) return;
    
    if (confirm(`Are you sure you want to release ${selectedTransactions.length} payment(s)?`)) {
      releaseSelectedMutation.mutate(selectedTransactions);
    }
  };

  const toggleTransaction = (id: string) => {
    setSelectedTransactions(prev => 
      prev.includes(id) 
        ? prev.filter(txId => txId !== id)
        : [...prev, id]
    );
  };

  const toggleAll = () => {
    const escrowTransactionsOnPage = paginatedTransactions
      .filter((item: any) => item.status === "escrow" && item.sourceType === "transaction")
      .map((item: any) => item.id);
    
    // Check if all escrow transactions on current page are selected
    const allPageSelected = escrowTransactionsOnPage.length > 0 && 
      escrowTransactionsOnPage.every(id => selectedTransactions.includes(id));
    
    if (allPageSelected) {
      // Deselect all on current page
      setSelectedTransactions(prev => prev.filter(id => !escrowTransactionsOnPage.includes(id)));
    } else {
      // Select all on current page (merge with existing selections, avoid duplicates)
      setSelectedTransactions(prev => {
        const combined = [...prev];
        for (const id of escrowTransactionsOnPage) {
          if (!combined.includes(id)) {
            combined.push(id);
          }
        }
        return combined;
      });
    }
  };

  const exportToExcel = () => {
    try {
      // Prepare data for export
      const exportData = filteredTransactions.map((item: any) => {
        const isBoost = item.sourceType === "boost";
        
        // Get seller info
        const sellerId = isBoost ? item.sellerEmail : (item.sellerId ? item.sellerId.slice(0, 12) : "N/A");
        
        // Get buyer info
        let buyerEmail = "N/A";
        if (!isBoost) {
          if (item.orderId) {
            const order = allOrders.find((o: any) => o.id === item.orderId);
            buyerEmail = order?.buyer?.email || "N/A";
          } else if (item.bookingId) {
            const booking = allBookings.find((b: any) => b.id === item.bookingId);
            buyerEmail = booking?.customer?.email || "N/A";
          }
        }
        
        // Get item name
        let itemName = "N/A";
        if (isBoost) {
          itemName = `${item.itemName} - ${item.packageName}`;
        } else if (item.orderId) {
          const order = allOrders.find((o: any) => o.id === item.orderId);
          itemName = order?.items?.map((i: any) => i.productName).join(", ") || "N/A";
        } else if (item.bookingId) {
          const booking = allBookings.find((b: any) => b.id === item.bookingId);
          itemName = booking?.service?.name || "N/A";
        }
        
        // Calculate amounts correctly
        // item.amount = seller's portion (product amount)
        // For orders, shipping is separate and paid by buyer
        let productAmount = parseFloat(item.amount); // Seller gets this
        let shippingAmount = 0;
        let totalAmount = productAmount; // Total buyer paid
        
        if (!isBoost && item.orderId) {
          const order = allOrders.find((o: any) => o.id === item.orderId);
          shippingAmount = parseFloat(order?.shippingCost || "0");
          totalAmount = productAmount + shippingAmount; // Buyer pays product + shipping
        }
        
        return {
          "Transaction ID": item.id.slice(0, 12),
          "Date": new Date(item.createdAt).toLocaleDateString(),
          "Time": new Date(item.createdAt).toLocaleTimeString(),
          "Type": isBoost ? "Boost" : (item.orderId ? "Order" : item.bookingId ? "Booking" : "N/A"),
          "Seller ID": sellerId,
          "Buyer Email": buyerEmail,
          "Item/Service": itemName,
          "Product Amount ($)": productAmount.toFixed(2),
          "Shipping Amount ($)": shippingAmount.toFixed(2),
          "Total Amount ($)": totalAmount.toFixed(2),
          "Payment Method": item.paymentMethod || "N/A",
          "Payment Reference": item.paymentReference || "N/A",
          "Status": item.status,
          "Released Date": item.releasedAt ? new Date(item.releasedAt).toLocaleDateString() : "N/A",
          "Released Time": item.releasedAt ? new Date(item.releasedAt).toLocaleTimeString() : "N/A",
        };
      });

      // Create worksheet
      const ws = XLSX.utils.json_to_sheet(exportData);
      
      // Set column widths
      ws['!cols'] = [
        { wch: 15 }, // Transaction ID
        { wch: 12 }, // Date
        { wch: 12 }, // Time
        { wch: 10 }, // Type
        { wch: 25 }, // Seller ID
        { wch: 25 }, // Buyer Email
        { wch: 30 }, // Item/Service
        { wch: 18 }, // Product Amount
        { wch: 18 }, // Shipping Amount
        { wch: 16 }, // Total Amount
        { wch: 18 }, // Payment Method
        { wch: 25 }, // Payment Reference
        { wch: 12 }, // Status
        { wch: 15 }, // Released Date
        { wch: 15 }, // Released Time
      ];

      // Create workbook
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Transactions");

      // Generate filename with current date
      const date = new Date().toISOString().split('T')[0];
      const filename = `Vaaney_Transactions_${date}.xlsx`;

      // Save file
      XLSX.writeFile(wb, filename);
      
      toast({ 
        title: "Export successful", 
        description: `Exported ${exportData.length} transaction(s) to ${filename}` 
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

  // Combine transactions and boost purchases for display
  const combinedItems = [
    ...transactions.map(tx => ({ ...tx, sourceType: "transaction" as const })),
    ...boostPurchases
      .filter(bp => typeFilter === "all" || typeFilter === "boost")
      .map(bp => ({
        id: bp.id,
        sellerId: bp.sellerId,
        amount: bp.amount,
        status: bp.status as any,
        createdAt: bp.createdAt,
        type: "boost" as const,
        sourceType: "boost" as const,
        sellerEmail: bp.seller.email,
        itemName: bp.itemName,
        packageName: bp.packageName,
        paymentReference: bp.paymentReference,
        paymentSlipUrl: bp.paymentSlipUrl,
        paymentMethod: bp.paymentMethod,
        paidAt: bp.paidAt,
      }))
  ];

  const filteredTransactions = combinedItems.filter((item: any) => {
    if (item.sourceType === "boost") {
      const matchesStatus = statusFilter === "all" || item.status === statusFilter || 
        (statusFilter === "processing" && item.status === "processing") ||
        (statusFilter === "paid" && item.status === "paid");
      return matchesStatus && (typeFilter === "all" || typeFilter === "boost");
    } else {
      const matchesStatus = statusFilter === "all" || item.status === statusFilter;
      const matchesType = typeFilter === "all" || item.type === typeFilter;
      return matchesStatus && matchesType;
    }
  });

  // Calculate pagination - MUST be before useEffects that reference these
  const totalPages = Math.ceil(filteredTransactions.length / ROWS_PER_PAGE);
  const paginatedTransactions = useMemo(() => {
    const startIndex = (currentPage - 1) * ROWS_PER_PAGE;
    const endIndex = startIndex + ROWS_PER_PAGE;
    return filteredTransactions.slice(startIndex, endIndex);
  }, [filteredTransactions, currentPage]);

  const startRecord = filteredTransactions.length > 0 ? (currentPage - 1) * ROWS_PER_PAGE + 1 : 0;
  const endRecord = Math.min(currentPage * ROWS_PER_PAGE, filteredTransactions.length);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
    setSelectedTransactions([]);
  }, [statusFilter, typeFilter, combinedItems.length]);

  // Clamp currentPage if it exceeds totalPages (e.g., after bulk release)
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-yellow-500/10 text-yellow-700 dark:text-yellow-300";
      case "processing": return "bg-blue-500/10 text-blue-700 dark:text-blue-300";
      case "escrow": return "bg-orange-500/10 text-orange-700 dark:text-orange-300";
      case "released": return "bg-green-500/10 text-green-700 dark:text-green-300";
      case "paid": return "bg-green-500/10 text-green-700 dark:text-green-300";
      case "refunded": return "bg-blue-500/10 text-blue-700 dark:text-blue-300";
      case "failed": return "bg-red-500/10 text-red-700 dark:text-red-300";
      case "cancelled": return "bg-gray-500/10 text-gray-700 dark:text-gray-300";
      default: return "bg-muted";
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "order": return "bg-purple-500/10 text-purple-700 dark:text-purple-300";
      case "booking": return "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300";
      case "boost": return "bg-pink-500/10 text-pink-700 dark:text-pink-300";
      case "payout": return "bg-green-500/10 text-green-700 dark:text-green-300";
      default: return "bg-muted";
    }
  };

  // Filter to only paid transactions (matching dashboard logic)
  // Orders/bookings use escrow/released, boosts use "paid" status
  const paidTransactions = transactions.filter((tx: Transaction) => 
    tx.status === "escrow" || tx.status === "released" || tx.status === "paid"
  );

  // Calculate boost revenue (paid boosts only)
  const boostRevenue = boostPurchases
    .filter(bp => bp.status === "paid")
    .reduce((sum, bp) => sum + parseFloat(bp.amount || "0"), 0);

  // Separate boost transactions from order/booking transactions
  const orderBookingTransactions = paidTransactions.filter((tx: Transaction) => 
    tx.type === "order" || tx.type === "booking"
  );

  const stats = {
    // Total revenue from all sources (orders + bookings + boosts)
    totalRevenue: (
      orderBookingTransactions.reduce((sum: number, tx: Transaction) => 
        sum + parseFloat(tx.amount || "0"), 0
      ) + boostRevenue
    ).toFixed(2),
    totalCommission: orderBookingTransactions.reduce((sum: number, tx: Transaction) => 
      sum + parseFloat(tx.commissionAmount || "0"), 0
    ).toFixed(2),
    pendingEscrow: transactions
      .filter((tx: Transaction) => tx.status === "pending" || tx.status === "escrow")
      .reduce((sum: number, tx: Transaction) => sum + parseFloat(tx.amount || "0"), 0)
      .toFixed(2),
    releasedPayments: transactions
      .filter((tx: Transaction) => tx.status === "released")
      .reduce((sum: number, tx: Transaction) => sum + parseFloat(tx.sellerPayout || "0"), 0)
      .toFixed(2),
    boostRevenue: boostRevenue.toFixed(2),
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2" data-testid="text-page-title">Transaction Management</h1>
        <p className="text-muted-foreground">Monitor all financial transactions and escrow payments</p>
      </div>

      <div className="grid gap-6 md:grid-cols-5 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-revenue">${stats.totalRevenue}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Boost Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-boost-revenue">${stats.boostRevenue}</div>
            <p className="text-xs text-muted-foreground mt-1">Paid boosts only</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Total Commission</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-commission">${stats.totalCommission}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Pending Escrow</CardTitle>
            <Lock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-pending-escrow">${stats.pendingEscrow}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Released Payments</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-released-payments">${stats.releasedPayments}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div className="flex items-center gap-4">
              <CardTitle>All Transactions</CardTitle>
              {selectedTransactions.length > 0 && (
                <Button
                  onClick={handleReleaseSelected}
                  disabled={releaseSelectedMutation.isPending}
                  data-testid="button-release-selected"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Release Selected ({selectedTransactions.length})
                </Button>
              )}
            </div>
            <div className="flex gap-2 flex-wrap">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[150px]" data-testid="select-type-filter">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="order">Orders</SelectItem>
                  <SelectItem value="booking">Bookings</SelectItem>
                  <SelectItem value="boost">Boosts</SelectItem>
                  <SelectItem value="payout">Payouts</SelectItem>
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]" data-testid="select-status-filter">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="escrow">Escrow</SelectItem>
                  <SelectItem value="released">Released</SelectItem>
                  <SelectItem value="refunded">Refunded</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                onClick={exportToExcel}
                disabled={filteredTransactions.length === 0}
                data-testid="button-export-excel"
              >
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Export to Excel
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="py-12 text-center">
              <DollarSign className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No transactions found</h3>
              <p className="text-muted-foreground">
                {statusFilter !== "all" || typeFilter !== "all" 
                  ? "Try adjusting your filters" 
                  : "Transactions will appear here once orders or bookings are created"}
              </p>
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table className="min-w-[1600px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12 bg-background sticky left-0 z-10">
                        <input
                          type="checkbox"
                          checked={(() => {
                            const escrowOnPage = paginatedTransactions.filter((item: any) => item.status === "escrow" && item.sourceType === "transaction");
                            return escrowOnPage.length > 0 && escrowOnPage.every((item: any) => selectedTransactions.includes(item.id));
                          })()}
                          onChange={toggleAll}
                          className="rounded border-input"
                          data-testid="checkbox-select-all"
                        />
                      </TableHead>
                      <TableHead className="bg-background min-w-[200px]">Transaction ID</TableHead>
                      <TableHead className="bg-background min-w-[100px]">Type</TableHead>
                      <TableHead className="bg-background min-w-[200px]">Seller</TableHead>
                      <TableHead className="bg-background min-w-[120px]">Product Amount</TableHead>
                      <TableHead className="bg-background min-w-[120px]">Shipping</TableHead>
                      <TableHead className="bg-background min-w-[120px]">Total Amount</TableHead>
                      <TableHead className="bg-background min-w-[150px]">Commission</TableHead>
                      <TableHead className="bg-background min-w-[130px]">Seller Payout</TableHead>
                      <TableHead className="bg-background min-w-[160px]">Transaction Status</TableHead>
                      <TableHead className="bg-background min-w-[180px]">Order/Booking Status</TableHead>
                      <TableHead className="bg-background min-w-[200px]">Payment Method</TableHead>
                      <TableHead className="bg-background min-w-[150px]">Date</TableHead>
                      <TableHead className="text-right bg-background sticky right-0 z-10 min-w-[120px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedTransactions.map((item: any) => {
                    const isBoost = item.sourceType === "boost";
                    return (
                      <TableRow key={item.id} data-testid={`row-transaction-${item.id}`}>
                        <TableCell className="sticky left-0 bg-background z-10">
                          {item.status === "escrow" && !isBoost && (
                            <input
                              type="checkbox"
                              checked={selectedTransactions.includes(item.id)}
                              onChange={() => toggleTransaction(item.id)}
                              className="rounded border-input"
                              data-testid={`checkbox-transaction-${item.id}`}
                            />
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="font-mono text-sm" data-testid={`text-transaction-id-${item.id}`}>
                            {item.id.slice(0, 8)}...
                          </div>
                          {isBoost && (
                            <div className="text-xs text-muted-foreground">
                              {item.itemName}
                            </div>
                          )}
                          {!isBoost && item.orderId && (
                            <div 
                              onClick={() => setViewingOrder(item.orderId!)}
                              className="text-xs text-primary hover:underline flex items-center gap-1 cursor-pointer"
                            >
                              Order: {item.orderId.slice(0, 8)}...
                              <ExternalLink className="h-3 w-3" />
                            </div>
                          )}
                          {!isBoost && item.bookingId && (
                            <div 
                              onClick={() => setViewingBooking(item.bookingId!)}
                              className="text-xs text-primary hover:underline flex items-center gap-1 cursor-pointer"
                            >
                              Booking: {item.bookingId.slice(0, 8)}...
                              <ExternalLink className="h-3 w-3" />
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={getTypeColor(item.type)} data-testid={`badge-type-${item.id}`}>
                            {item.type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm" data-testid={`text-seller-${item.id}`}>
                            {isBoost ? item.sellerEmail : `${item.sellerId.slice(0, 8)}...`}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium" data-testid={`text-amount-${item.id}`}>
                            ${item.amount}
                          </div>
                        </TableCell>
                        <TableCell>
                          {!isBoost && item.orderId ? (
                            (() => {
                              const order = allOrders.find((o: any) => o.id === item.orderId);
                              return (
                                <div className="font-medium text-blue-600 dark:text-blue-400" data-testid={`text-shipping-${item.id}`}>
                                  ${order?.shippingCost || "0.00"}
                                </div>
                              );
                            })()
                          ) : (
                            <div className="text-sm text-muted-foreground">-</div>
                          )}
                        </TableCell>
                        <TableCell>
                          {!isBoost && item.orderId ? (
                            (() => {
                              const order = allOrders.find((o: any) => o.id === item.orderId);
                              const shipping = parseFloat(order?.shippingCost || "0");
                              const total = parseFloat(item.amount) + shipping;
                              return (
                                <div className="font-semibold" data-testid={`text-total-${item.id}`}>
                                  ${total.toFixed(2)}
                                </div>
                              );
                            })()
                          ) : (
                            <div className="font-semibold" data-testid={`text-total-${item.id}`}>
                              ${item.amount}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {isBoost ? (
                            <div className="text-sm text-muted-foreground" data-testid={`text-commission-${item.id}`}>
                              -
                            </div>
                          ) : (
                            <div className="text-sm" data-testid={`text-commission-${item.id}`}>
                              ${item.commissionAmount}
                              <span className="text-xs text-muted-foreground ml-1">
                                ({item.commissionRate}%)
                              </span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {isBoost ? (
                            <div className="font-medium text-muted-foreground" data-testid={`text-payout-${item.id}`}>
                              N/A
                            </div>
                          ) : (
                            <div className="font-medium" data-testid={`text-payout-${item.id}`}>
                              ${item.sellerPayout}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={getStatusColor(item.status)} data-testid={`badge-status-${item.id}`}>
                            {item.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {isBoost && item.packageName && (
                            <Badge variant="outline" data-testid={`badge-package-${item.id}`}>
                              {item.packageName}
                            </Badge>
                          )}
                          {!isBoost && item.orderStatus && (
                            <Badge variant="outline" data-testid={`badge-order-status-${item.id}`}>
                              {item.orderStatus.replace(/_/g, ' ')}
                            </Badge>
                          )}
                          {!isBoost && item.bookingStatus && (
                            <Badge variant="outline" data-testid={`badge-booking-status-${item.id}`}>
                              {item.bookingStatus.replace(/_/g, ' ')}
                            </Badge>
                          )}
                          {!isBoost && !item.orderStatus && !item.bookingStatus && (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm" data-testid={`text-payment-method-${item.id}`}>
                            {item.paymentMethod ? (
                              <Badge variant="outline">
                                {item.paymentMethod === 'bank_transfer' ? 'Bank Transfer' : 'IPG'}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </div>
                          {item.bankAccountDetails && (
                            <div className="text-xs text-muted-foreground mt-1">
                              <div className="font-medium">{item.bankAccountDetails.bankName}</div>
                              <div className="font-mono">A/C: {item.bankAccountDetails.accountNumber}</div>
                              <div>{item.bankAccountDetails.currency}</div>
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm" data-testid={`text-date-${item.id}`}>
                            {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : "N/A"}
                          </div>
                          {!isBoost && item.releasedAt && (
                            <div className="text-xs text-muted-foreground">
                              Released: {new Date(item.releasedAt).toLocaleDateString()}
                            </div>
                          )}
                          {isBoost && item.paidAt && (
                            <div className="text-xs text-muted-foreground">
                              Paid: {new Date(item.paidAt).toLocaleDateString()}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-right sticky right-0 bg-background z-10">
                          {!isBoost && item.status === "pending" && item.orderId && (
                            <div className="flex gap-2 justify-end flex-wrap">
                              {item.paymentMethod === "bank_transfer" && item.transferSlipObjectPath && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={async () => {
                                    try {
                                      const response = await apiRequest("GET", `/api/admin/orders/${item.orderId}/transfer-slip`);
                                      if (response.url) {
                                        window.open(response.url, '_blank');
                                      }
                                    } catch (error) {
                                      toast({ 
                                        title: "Failed to open transfer slip", 
                                        description: error instanceof Error ? error.message : "Unknown error",
                                        variant: "destructive" 
                                      });
                                    }
                                  }}
                                  data-testid={`button-view-order-slip-${item.id}`}
                                >
                                  <ExternalLink className="h-4 w-4 mr-2" />
                                  View Slip
                                </Button>
                              )}
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => confirmPaymentMutation.mutate(item.orderId!)}
                                disabled={confirmPaymentMutation.isPending}
                                data-testid={`button-confirm-payment-${item.id}`}
                              >
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Confirm Payment
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => {
                                  if (confirm("Are you sure you want to cancel this order?")) {
                                    cancelOrderMutation.mutate(item.orderId!);
                                  }
                                }}
                                disabled={cancelOrderMutation.isPending}
                                data-testid={`button-cancel-order-${item.id}`}
                              >
                                <XCircle className="h-4 w-4 mr-2" />
                                Cancel Order
                              </Button>
                            </div>
                          )}
                          {!isBoost && item.status === "pending" && item.bookingId && (
                            <div className="flex gap-2 justify-end flex-wrap">
                              {item.paymentMethod === "bank_transfer" && item.transferSlipObjectPath && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={async () => {
                                    try {
                                      const response = await apiRequest("GET", `/api/admin/bookings/${item.bookingId}/transfer-slip`);
                                      if (response.url) {
                                        window.open(response.url, '_blank');
                                      }
                                    } catch (error) {
                                      toast({ 
                                        title: "Failed to open transfer slip", 
                                        description: error instanceof Error ? error.message : "Unknown error",
                                        variant: "destructive" 
                                      });
                                    }
                                  }}
                                  data-testid={`button-view-booking-slip-${item.id}`}
                                >
                                  <ExternalLink className="h-4 w-4 mr-2" />
                                  View Slip
                                </Button>
                              )}
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => confirmBookingPaymentMutation.mutate(item.bookingId!)}
                                disabled={confirmBookingPaymentMutation.isPending}
                                data-testid={`button-confirm-booking-payment-${item.id}`}
                              >
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Confirm Payment
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => {
                                  if (confirm("Are you sure you want to cancel this booking?")) {
                                    cancelBookingMutation.mutate(item.bookingId!);
                                  }
                                }}
                                disabled={cancelBookingMutation.isPending}
                                data-testid={`button-cancel-booking-${item.id}`}
                              >
                                <XCircle className="h-4 w-4 mr-2" />
                                Cancel Booking
                              </Button>
                            </div>
                          )}
                          {!isBoost && item.status === "escrow" && (
                            <div className="flex gap-2 justify-end flex-wrap">
                              {item.paymentMethod === "bank_transfer" && item.transferSlipObjectPath && item.orderId && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={async () => {
                                    try {
                                      const response = await apiRequest("GET", `/api/admin/orders/${item.orderId}/transfer-slip`);
                                      if (response.url) {
                                        window.open(response.url, '_blank');
                                      }
                                    } catch (error) {
                                      toast({ 
                                        title: "Failed to open transfer slip", 
                                        description: error instanceof Error ? error.message : "Unknown error",
                                        variant: "destructive" 
                                      });
                                    }
                                  }}
                                  data-testid={`button-view-order-slip-escrow-${item.id}`}
                                >
                                  <ExternalLink className="h-4 w-4 mr-2" />
                                  View Slip
                                </Button>
                              )}
                              {item.paymentMethod === "bank_transfer" && item.transferSlipObjectPath && item.bookingId && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={async () => {
                                    try {
                                      const response = await apiRequest("GET", `/api/admin/bookings/${item.bookingId}/transfer-slip`);
                                      if (response.url) {
                                        window.open(response.url, '_blank');
                                      }
                                    } catch (error) {
                                      toast({ 
                                        title: "Failed to open transfer slip", 
                                        description: error instanceof Error ? error.message : "Unknown error",
                                        variant: "destructive" 
                                      });
                                    }
                                  }}
                                  data-testid={`button-view-booking-slip-escrow-${item.id}`}
                                >
                                  <ExternalLink className="h-4 w-4 mr-2" />
                                  View Slip
                                </Button>
                              )}
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => handleReleasePayment(item.id)}
                                disabled={releasePaymentMutation.isPending}
                                data-testid={`button-release-payment-${item.id}`}
                              >
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Release Payment
                              </Button>
                            </div>
                          )}
                          {isBoost && item.status === "pending" && item.paymentMethod === "bank_transfer" && (
                            <div className="flex gap-2 flex-wrap">
                              {item.paymentSlipUrl && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={async () => {
                                    try {
                                      const response = await apiRequest("GET", `/api/admin/boost-purchase/${item.id}/payment-slip`);
                                      if (response.url) {
                                        window.open(response.url, '_blank');
                                      }
                                    } catch (error) {
                                      toast({ 
                                        title: "Failed to open payment slip", 
                                        description: error instanceof Error ? error.message : "Unknown error",
                                        variant: "destructive" 
                                      });
                                    }
                                  }}
                                  data-testid={`button-view-boost-slip-${item.id}`}
                                >
                                  <ExternalLink className="h-4 w-4 mr-2" />
                                  View Slip
                                </Button>
                              )}
                              {item.paymentReference && !item.paymentSlipUrl && (
                                <div className="text-xs text-muted-foreground px-2 py-1 bg-muted rounded flex items-center gap-1">
                                  <span className="font-medium">Ref:</span>
                                  <span className="font-mono">{item.paymentReference}</span>
                                </div>
                              )}
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => confirmBoostPaymentMutation.mutate(item.id)}
                                disabled={confirmBoostPaymentMutation.isPending || (!item.paymentSlipUrl && !item.paymentReference)}
                                data-testid={`button-confirm-boost-payment-${item.id}`}
                              >
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Confirm Payment
                              </Button>
                            </div>
                          )}
                          {isBoost && (item.status !== "pending" || item.paymentMethod === "ipg") && (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
          
          {/* Pagination Controls */}
          {!isLoading && filteredTransactions.length > 0 && (
            <div className="flex items-center justify-between pt-4 border-t mt-4">
              <div className="text-sm text-muted-foreground" data-testid="pagination-info">
                Showing {startRecord}-{endRecord} of {filteredTransactions.length} transactions
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  data-testid="button-page-previous"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                    // Show first page, last page, current page, and pages around current
                    const showPage = 
                      page === 1 || 
                      page === totalPages || 
                      (page >= currentPage - 1 && page <= currentPage + 1);
                    
                    const showEllipsis = 
                      (page === 2 && currentPage > 3) || 
                      (page === totalPages - 1 && currentPage < totalPages - 2);
                    
                    if (!showPage && !showEllipsis) return null;
                    
                    if (showEllipsis) {
                      return <span key={page} className="px-2 text-muted-foreground">...</span>;
                    }
                    
                    return (
                      <Button
                        key={page}
                        variant={currentPage === page ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(page)}
                        data-testid={`button-page-${page}`}
                        className="w-8 h-8 p-0"
                      >
                        {page}
                      </Button>
                    );
                  })}
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  data-testid="button-page-next"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Order Details Modal */}
      <Dialog open={viewingOrder !== null} onOpenChange={(open) => !open && setViewingOrder(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Order Details</DialogTitle>
            <DialogDescription>Complete information for this order</DialogDescription>
          </DialogHeader>
          
          {currentOrder && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Order ID</p>
                  <p className="font-mono text-sm">{currentOrder.id}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge variant="secondary" className="mt-1">
                    {currentOrder.status.replace('_', ' ')}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Amount</p>
                  <p className="text-lg font-bold">${currentOrder.totalAmount}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Order Date</p>
                  <p className="text-sm">{new Date(currentOrder.createdAt).toLocaleDateString()}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Buyer Information
                  </h3>
                  <Card>
                    <CardContent className="pt-4">
                      <div className="space-y-2">
                        <div>
                          <p className="text-sm text-muted-foreground">Name</p>
                          <p className="font-medium">
                            {currentOrder.buyer?.firstName} {currentOrder.buyer?.lastName}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Email</p>
                          <p className="text-sm">{currentOrder.buyer?.email}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Shipping Address</p>
                          <p className="text-sm">{currentOrder.shippingAddress}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div>
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <Store className="h-4 w-4" />
                    Seller Information
                  </h3>
                  <Card>
                    <CardContent className="pt-4">
                      <div className="space-y-2">
                        <div>
                          <p className="text-sm text-muted-foreground">Business Name</p>
                          <p className="font-medium">
                            {currentOrder.seller?.businessName || `${currentOrder.seller?.firstName || ''} ${currentOrder.seller?.lastName || ''}`}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Email</p>
                          <p className="text-sm">{currentOrder.seller?.email || 'N/A'}</p>
                        </div>
                        {currentOrder.seller?.phone && (
                          <div>
                            <p className="text-sm text-muted-foreground">Phone</p>
                            <p className="text-sm">{currentOrder.seller.phone}</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Order Items ({currentOrder.itemCount})
                </h3>
                <Card>
                  <CardContent className="pt-4">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Product</TableHead>
                          <TableHead>Variant</TableHead>
                          <TableHead>Quantity</TableHead>
                          <TableHead>Price</TableHead>
                          <TableHead>Subtotal</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {currentOrder.items.map((item, idx) => {
                          const itemPrice = item.price || item.pricePerUnit || '0';
                          return (
                            <TableRow key={idx}>
                              <TableCell>{item.productName}</TableCell>
                              <TableCell>{item.variantName || '-'}</TableCell>
                              <TableCell>{item.quantity}</TableCell>
                              <TableCell>${itemPrice}</TableCell>
                              <TableCell className="font-medium">
                                ${(parseFloat(itemPrice) * item.quantity).toFixed(2)}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>

              {/* Order Actions */}
              {(currentOrder.status?.toLowerCase() === "paid" || currentOrder.status?.toLowerCase() === "processing") && (
                <div className="flex gap-3 pt-4 border-t">
                  <Button
                    variant="default"
                    onClick={() => {
                      if (confirm("Mark this order as shipped?")) {
                        updateOrderStatusMutation.mutate({ orderId: currentOrder.id, status: "shipped" });
                      }
                    }}
                    disabled={updateOrderStatusMutation.isPending}
                    data-testid="button-mark-shipped"
                  >
                    <Truck className="h-4 w-4 mr-2" />
                    Mark as Shipped
                  </Button>
                  <p className="text-sm text-muted-foreground flex items-center">
                    Order must be marked as shipped before payments can be released
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Booking Details Modal */}
      <Dialog open={viewingBooking !== null} onOpenChange={(open) => !open && setViewingBooking(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Booking Details</DialogTitle>
            <DialogDescription>Complete information for this service booking</DialogDescription>
          </DialogHeader>
          
          {currentBooking && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Booking ID</p>
                  <p className="font-mono text-sm">{currentBooking.id}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge variant="secondary" className="mt-1">
                    {currentBooking.status.replace('_', ' ')}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Amount</p>
                  <p className="text-lg font-bold">${currentBooking.totalAmount}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Booking Date</p>
                  <p className="text-sm">{new Date(currentBooking.createdAt).toLocaleDateString()}</p>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Customer Information
                </h3>
                <Card>
                  <CardContent className="pt-4">
                    <div className="space-y-2">
                      <div>
                        <p className="text-sm text-muted-foreground">Name</p>
                        <p className="font-medium">
                          {currentBooking.customer.firstName} {currentBooking.customer.lastName}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Email</p>
                        <p className="text-sm">{currentBooking.customer.email}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div>
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Service Details
                </h3>
                <Card>
                  <CardContent className="pt-4">
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm text-muted-foreground">Service Name</p>
                        <p className="font-medium">{currentBooking.service.name}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Category</p>
                        <p className="text-sm">{currentBooking.service.category}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Package</p>
                        <p className="text-sm">
                          {currentBooking.package ? currentBooking.package.name : 'Custom Package'}
                        </p>
                      </div>
                      <div className="flex items-center gap-4 pt-2">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm text-muted-foreground">Scheduled Date</p>
                            <p className="font-medium">
                              {new Date(currentBooking.scheduledDate).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm text-muted-foreground">Time</p>
                            <p className="font-medium">{currentBooking.scheduledTime}</p>
                          </div>
                        </div>
                      </div>
                      {currentBooking.requirements && (
                        <div>
                          <p className="text-sm text-muted-foreground">Special Requirements</p>
                          <p className="text-sm bg-muted p-3 rounded-md mt-1">
                            {currentBooking.requirements}
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
