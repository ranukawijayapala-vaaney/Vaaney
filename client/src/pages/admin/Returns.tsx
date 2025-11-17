import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { RotateCcw, User, Package, Calendar, DollarSign, FileText, Image as ImageIcon, Eye, CheckCircle, XCircle, CreditCard, History } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ReturnRequestTimeline } from "@/components/returns/ReturnRequestTimeline";
import type { ReturnRequestStatus } from "@shared/schema";
import { MAX_RETURN_ATTEMPTS } from "@shared/constants";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface ReturnRequest {
  id: string;
  orderId: string | null;
  bookingId: string | null;
  buyerId: string;
  sellerId: string;
  reason: string;
  description: string;
  requestedRefundAmount: string | null;
  status: string;
  sellerStatus: string | null;
  adminResolution: string | null;
  proposedRefundAmount: string | null;
  sellerProposedRefundAmount: string | null;
  sellerResponse: string | null;
  finalRefundAmount: string | null;
  evidenceUrls: string[];
  sellerResponseMessage: string | null;
  adminNotes: string | null;
  createdAt: string;
  updatedAt: string;
  buyer: {
    email: string;
    firstName: string | null;
    lastName: string | null;
  };
  seller: {
    email: string;
    firstName: string | null;
    lastName: string | null;
  };
  order: {
    id: string;
    totalAmount: string;
    status: string;
    createdAt: string;
    returnAttemptCount: number;
  } | null;
  booking: {
    id: string;
    totalPrice: string;
    status: string;
    createdAt: string;
    returnAttemptCount: number;
  } | null;
}

export default function AdminReturns() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedRequest, setSelectedRequest] = useState<ReturnRequest | null>(null);
  const [viewPhotosRequest, setViewPhotosRequest] = useState<any | null>(null);
  const [resolveDialogOpen, setResolveDialogOpen] = useState(false);
  const [processRefundDialogOpen, setProcessRefundDialogOpen] = useState(false);
  const [resolveDecision, setResolveDecision] = useState<"approved" | "rejected">("approved");
  const [adminNotes, setAdminNotes] = useState("");
  const [finalRefundAmount, setFinalRefundAmount] = useState("");
  
  const [selectedHistoryContext, setSelectedHistoryContext] = useState<{type: 'order' | 'booking', id: string} | null>(null);
  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);
  const [selectedHistoryTab, setSelectedHistoryTab] = useState("0");
  
  const { toast } = useToast();

  const { data: returnRequests = [], isLoading } = useQuery<ReturnRequest[]>({
    queryKey: ["/api/admin/return-requests"],
  });

  const { data: returnHistory = [], isLoading: isHistoryLoading } = useQuery<any[]>({
    queryKey: selectedHistoryContext?.type === 'order'
      ? ['/api/admin/orders', selectedHistoryContext.id, 'return-history']
      : ['/api/admin/bookings', selectedHistoryContext?.id, 'return-history'],
    enabled: !!selectedHistoryContext?.id && isHistoryDialogOpen,
  });

  // Default to newest attempt when history loads
  useEffect(() => {
    if (isHistoryDialogOpen && returnHistory.length > 0) {
      setSelectedHistoryTab("0");
    }
  }, [isHistoryDialogOpen, returnHistory.length]);

  const statusColors: Record<ReturnRequestStatus, string> = {
    "requested": "bg-yellow-500",
    "under_review": "bg-blue-500",
    "seller_approved": "bg-green-500",
    "seller_rejected": "bg-red-500",
    "admin_approved": "bg-purple-500",
    "admin_rejected": "bg-red-500",
    "refunded": "bg-emerald-500",
    "completed": "bg-gray-500",
    "cancelled": "bg-gray-500",
  };

  const filteredRequests = returnRequests.filter((request: ReturnRequest) => {
    return statusFilter === "all" || request.status === statusFilter;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "requested": return "bg-yellow-500/10 text-yellow-700 dark:text-yellow-300";
      case "under_review": return "bg-blue-500/10 text-blue-700 dark:text-blue-300";
      case "seller_approved": return "bg-green-500/10 text-green-700 dark:text-green-300";
      case "seller_rejected": return "bg-red-500/10 text-red-700 dark:text-red-300";
      case "admin_approved": return "bg-purple-500/10 text-purple-700 dark:text-purple-300";
      case "admin_rejected": return "bg-red-500/10 text-red-700 dark:text-red-300";
      case "refunded": return "bg-green-500/10 text-green-700 dark:text-green-300";
      case "completed": return "bg-gray-500/10 text-gray-700 dark:text-gray-300";
      default: return "bg-muted";
    }
  };

  const getSellerStatusColor = (status: string | null) => {
    if (!status) return "bg-muted";
    switch (status) {
      case "approved": return "bg-green-500/10 text-green-700 dark:text-green-300";
      case "rejected": return "bg-red-500/10 text-red-700 dark:text-red-300";
      default: return "bg-muted";
    }
  };

  const resolveMutation = useMutation({
    mutationFn: async (data: { id: string; resolution: string; adminNotes: string; finalRefundAmount?: string }) => {
      return await apiRequest("PUT", `/api/admin/return-requests/${data.id}/resolve`, {
        status: data.resolution === "approved" ? "admin_approved" : "admin_rejected",
        adminNotes: data.adminNotes,
        approvedRefundAmount: data.finalRefundAmount ? parseFloat(data.finalRefundAmount) : undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/return-requests"] });
      toast({
        title: "Resolution submitted",
        description: "The return request has been updated with your decision",
      });
      setResolveDialogOpen(false);
      setSelectedRequest(null);
      setAdminNotes("");
      setFinalRefundAmount("");
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to resolve",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const processRefundMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("POST", `/api/admin/return-requests/${id}/process-refund`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/return-requests"] });
      toast({
        title: "Refund processed",
        description: "The refund has been successfully processed and commission reversed",
      });
      setProcessRefundDialogOpen(false);
      setSelectedRequest(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to process refund",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleResolve = () => {
    if (!selectedRequest) return;

    if (resolveDecision === "approved" && !finalRefundAmount) {
      toast({
        title: "Refund amount required",
        description: "Please enter the final refund amount for approval",
        variant: "destructive",
      });
      return;
    }

    resolveMutation.mutate({
      id: selectedRequest.id,
      resolution: resolveDecision,
      adminNotes,
      finalRefundAmount: resolveDecision === "approved" ? finalRefundAmount : undefined,
    });
  };

  const handleProcessRefund = () => {
    if (!selectedRequest) return;
    processRefundMutation.mutate(selectedRequest.id);
  };

  const openResolveDialog = (request: ReturnRequest) => {
    setSelectedRequest(request);
    setResolveDecision("approved");
    setAdminNotes("");
    setFinalRefundAmount(request.proposedRefundAmount || "");
    setResolveDialogOpen(true);
  };

  const openProcessRefundDialog = (request: ReturnRequest) => {
    setSelectedRequest(request);
    setProcessRefundDialogOpen(true);
  };

  const canResolve = (request: ReturnRequest) => {
    return request.status === "seller_approved" || request.status === "seller_rejected";
  };

  const canProcessRefund = (request: ReturnRequest) => {
    return request.status === "admin_approved";
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2" data-testid="text-page-title">Returns & Refunds Management</h1>
        <p className="text-muted-foreground">Review and manage all return requests from buyers</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <CardTitle>Return Requests ({filteredRequests.length})</CardTitle>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[200px]" data-testid="select-status-filter">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="requested">Requested</SelectItem>
                <SelectItem value="under_review">Under Review</SelectItem>
                <SelectItem value="seller_approved">Seller Approved</SelectItem>
                <SelectItem value="seller_rejected">Seller Rejected</SelectItem>
                <SelectItem value="admin_approved">Admin Approved</SelectItem>
                <SelectItem value="admin_rejected">Admin Rejected</SelectItem>
                <SelectItem value="refunded">Refunded</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="py-12 text-center">
              <RotateCcw className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No return requests found</h3>
              <p className="text-muted-foreground">
                {statusFilter !== "all" 
                  ? "Try adjusting your filter" 
                  : "Return requests will appear here when buyers request refunds"}
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Request ID</TableHead>
                    <TableHead>Buyer</TableHead>
                    <TableHead>Seller</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Seller</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRequests.map((request: ReturnRequest) => (
                    <TableRow key={request.id} data-testid={`row-request-${request.id}`}>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-mono text-sm" data-testid={`text-request-id-${request.id}`}>
                            {request.id.slice(0, 8)}...
                          </div>
                          {(request.order?.returnAttemptCount || request.booking?.returnAttemptCount || 1) > 1 && (
                            <Badge variant="outline" className="bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-300 dark:border-orange-700 text-xs">
                              <RotateCcw className="h-3 w-3 mr-1" />
                              Re-attempt {request.order?.returnAttemptCount || request.booking?.returnAttemptCount} of {MAX_RETURN_ATTEMPTS}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="font-medium text-sm" data-testid={`text-buyer-name-${request.id}`}>
                              {request.buyer.firstName} {request.buyer.lastName}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {request.buyer.email}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm" data-testid={`text-seller-name-${request.id}`}>
                          {request.seller.firstName} {request.seller.lastName}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" data-testid={`badge-type-${request.id}`}>
                          {request.orderId ? "Order" : "Booking"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm max-w-[150px]" data-testid={`text-reason-${request.id}`}>
                          {request.reason.replace(/_/g, ' ')}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {request.finalRefundAmount ? (
                            <div className="font-medium" data-testid={`text-final-amount-${request.id}`}>
                              ${request.finalRefundAmount}
                            </div>
                          ) : request.proposedRefundAmount ? (
                            <div className="text-muted-foreground" data-testid={`text-proposed-amount-${request.id}`}>
                              ${request.proposedRefundAmount}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={getStatusColor(request.status)} data-testid={`badge-status-${request.id}`}>
                          {request.status.replace(/_/g, ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {request.sellerStatus ? (
                          <Badge variant="secondary" className={getSellerStatusColor(request.sellerStatus)} data-testid={`badge-seller-status-${request.id}`}>
                            {request.sellerStatus}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">Pending</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm" data-testid={`text-date-${request.id}`}>
                          {new Date(request.createdAt).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const context = request.order 
                                ? { type: 'order' as const, id: request.order.id }
                                : { type: 'booking' as const, id: request.booking!.id };
                              setSelectedHistoryContext(context);
                              setIsHistoryDialogOpen(true);
                            }}
                            data-testid={`button-view-history-${request.id}`}
                          >
                            <History className="h-4 w-4 mr-1" />
                            {(request.order?.returnAttemptCount || request.booking?.returnAttemptCount || 0) > 1
                              ? `History (${request.order?.returnAttemptCount || request.booking?.returnAttemptCount})`
                              : 'Details'}
                          </Button>
                          {(request.evidenceUrls?.length || 0) > 0 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setViewPhotosRequest(request)}
                              data-testid={`button-view-photos-${request.id}`}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          )}
                          {canResolve(request) && (
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => openResolveDialog(request)}
                              data-testid={`button-resolve-${request.id}`}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Resolve
                            </Button>
                          )}
                          {canProcessRefund(request) && (
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => openProcessRefundDialog(request)}
                              data-testid={`button-process-refund-${request.id}`}
                            >
                              <CreditCard className="h-4 w-4 mr-1" />
                              Refund
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Photos Dialog */}
      <Dialog open={!!viewPhotosRequest} onOpenChange={(open) => !open && setViewPhotosRequest(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Evidence Photos</DialogTitle>
            <DialogDescription>
              Photos submitted by the buyer as evidence for the return request
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto">
            {viewPhotosRequest?.evidenceUrls?.map((url: string, index: number) => (
              <div key={index} className="relative aspect-square rounded-lg overflow-hidden border">
                <img
                  src={url}
                  alt={`Evidence ${index + 1}`}
                  className="w-full h-full object-cover"
                  data-testid={`img-evidence-${index}`}
                />
              </div>
            )) || (
              <div className="col-span-2 text-center py-8 text-muted-foreground">
                No evidence photos available
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Resolve Dialog */}
      <Dialog open={resolveDialogOpen} onOpenChange={setResolveDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Resolve Return Request</DialogTitle>
            <DialogDescription>
              Review all information and make a final decision
            </DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-6">
              {/* Order Summary */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Order Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Order ID:</span>
                    <span className="font-mono">{(selectedRequest.orderId || selectedRequest.bookingId)?.slice(0, 12)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Order Total:</span>
                    <span className="font-semibold">${selectedRequest.order?.totalAmount || selectedRequest.booking?.totalPrice}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Order Status:</span>
                    <Badge variant="outline">{selectedRequest.order?.status || selectedRequest.booking?.status}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Ordered On:</span>
                    <span>{selectedRequest.order?.createdAt ? new Date(selectedRequest.order.createdAt).toLocaleDateString() : 'N/A'}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Buyer Request */}
              <Card className="border-l-4 border-l-blue-500">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Buyer's Detailed Request
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-sm">
                    <span className="text-muted-foreground">From:</span>
                    <div className="font-medium">{selectedRequest.buyer.firstName} {selectedRequest.buyer.lastName}</div>
                    <div className="text-xs text-muted-foreground">{selectedRequest.buyer.email}</div>
                  </div>
                  <div>
                    <div className="text-xs font-medium text-muted-foreground uppercase mb-1">Reason for Return:</div>
                    <Badge variant="outline" className="text-sm">{selectedRequest.reason.replace(/_/g, ' ')}</Badge>
                  </div>
                  <div>
                    <div className="text-xs font-medium text-muted-foreground uppercase mb-2">Buyer's Detailed Explanation:</div>
                    <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                      <p className="text-base leading-relaxed whitespace-pre-line">{selectedRequest.description}</p>
                    </div>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t">
                    <span className="font-medium">Buyer Requested Refund:</span>
                    <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">${selectedRequest.requestedRefundAmount || 'N/A'}</span>
                  </div>
                  {selectedRequest.evidenceUrls?.length > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">Evidence Photos:</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setViewPhotosRequest(selectedRequest)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View {selectedRequest.evidenceUrls?.length || 0} Photo(s)
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Seller Response */}
              <Card className="border-l-4 border-l-green-500">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Seller's Detailed Response
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-sm">
                    <span className="text-muted-foreground">From:</span>
                    <div className="font-medium">{selectedRequest.seller.firstName} {selectedRequest.seller.lastName}</div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Seller's Decision:</span>
                    <Badge className={getSellerStatusColor(selectedRequest.sellerStatus)}>
                      {selectedRequest.sellerStatus || 'Pending'}
                    </Badge>
                  </div>
                  {selectedRequest.sellerProposedRefundAmount && (
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Seller Proposed Refund:</span>
                      <span className="text-2xl font-bold text-green-600 dark:text-green-400">${selectedRequest.sellerProposedRefundAmount}</span>
                    </div>
                  )}
                  {(selectedRequest.sellerResponse || selectedRequest.sellerResponseMessage) && (
                    <div>
                      <div className="text-xs font-medium text-muted-foreground uppercase mb-2">Seller's Detailed Explanation:</div>
                      <div className="p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
                        <p className="text-base leading-relaxed whitespace-pre-line">{selectedRequest.sellerResponse || selectedRequest.sellerResponseMessage}</p>
                      </div>
                    </div>
                  )}
                  {(!selectedRequest.sellerResponse && !selectedRequest.sellerResponseMessage) && (
                    <div className="p-3 bg-muted rounded-lg text-center text-sm text-muted-foreground italic">
                      Seller has not provided a response yet
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="space-y-2">
                <Label htmlFor="resolution">Resolution Decision</Label>
                <Select value={resolveDecision} onValueChange={(value) => setResolveDecision(value as "approved" | "rejected")}>
                  <SelectTrigger id="resolution" data-testid="select-resolution">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="approved">Approve Refund</SelectItem>
                    <SelectItem value="rejected">Reject Request</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {resolveDecision === "approved" && (
                <div className="space-y-2">
                  <Label htmlFor="finalRefundAmount">Final Refund Amount (USD)</Label>
                  <Input
                    id="finalRefundAmount"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Enter refund amount"
                    value={finalRefundAmount}
                    onChange={(e) => setFinalRefundAmount(e.target.value)}
                    data-testid="input-final-refund-amount"
                  />
                  <div className="space-y-2">
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p>
                        Buyer requested: ${parseFloat(selectedRequest?.requestedRefundAmount || "0").toFixed(2)}
                      </p>
                      {selectedRequest?.proposedRefundAmount && (
                        <p>
                          Seller proposed: ${parseFloat(selectedRequest.proposedRefundAmount).toFixed(2)}
                        </p>
                      )}
                      {selectedRequest?.order && (
                        <p className="text-xs">
                          (Product: ${parseFloat(selectedRequest.order.totalAmount || "0").toFixed(2)} + 
                          Shipping: ${parseFloat((selectedRequest.order as any).shippingCost || "0").toFixed(2)})
                        </p>
                      )}
                    </div>
                    {selectedRequest?.order && parseFloat(finalRefundAmount || "0") > 0 && (
                      (() => {
                        const productAmount = parseFloat(selectedRequest.order.totalAmount || "0");
                        const shippingAmount = parseFloat((selectedRequest.order as any).shippingCost || "0");
                        const fullAmount = productAmount + shippingAmount;
                        const approvedAmount = parseFloat(finalRefundAmount || "0");
                        
                        if (approvedAmount < fullAmount && shippingAmount > 0) {
                          return (
                            <div className="p-3 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                                ⚠️ Warning: Approved amount (${approvedAmount.toFixed(2)}) is below the full amount paid by buyer (${fullAmount.toFixed(2)} including ${shippingAmount.toFixed(2)} shipping). Buyer will not receive full refund.
                              </p>
                            </div>
                          );
                        }
                        return null;
                      })()
                    )}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="adminNotes">Admin Notes</Label>
                <Textarea
                  id="adminNotes"
                  placeholder="Add notes about your decision..."
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  rows={3}
                  data-testid="textarea-admin-notes"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setResolveDialogOpen(false)}
              data-testid="button-cancel-resolve"
            >
              Cancel
            </Button>
            <Button
              onClick={handleResolve}
              disabled={resolveMutation.isPending}
              data-testid="button-submit-resolve"
            >
              {resolveMutation.isPending ? "Submitting..." : "Submit Decision"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Process Refund Dialog */}
      <Dialog open={processRefundDialogOpen} onOpenChange={setProcessRefundDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Process Refund</DialogTitle>
            <DialogDescription>
              Execute the refund and reverse commission
            </DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Request ID:</span>
                  <span className="font-mono">{selectedRequest.id.slice(0, 12)}...</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Buyer:</span>
                  <span>{selectedRequest.buyer.firstName} {selectedRequest.buyer.lastName}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Refund Amount:</span>
                  <span className="font-bold text-lg">${(selectedRequest as any).approvedRefundAmount || '0.00'}</span>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                This will create a refund transaction, reverse the commission, and mark the request as refunded.
              </p>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setProcessRefundDialogOpen(false)}
              data-testid="button-cancel-refund"
            >
              Cancel
            </Button>
            <Button
              onClick={handleProcessRefund}
              disabled={processRefundMutation.isPending}
              data-testid="button-confirm-refund"
            >
              {processRefundMutation.isPending ? "Processing..." : "Process Refund"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unified Return History Dialog */}
      <Dialog open={isHistoryDialogOpen} onOpenChange={setIsHistoryDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {returnHistory.length > 1 
                ? `Return Request History (${returnHistory.length} Attempts)` 
                : 'Return Request Details'}
            </DialogTitle>
            <DialogDescription>
              {returnHistory.length > 1
                ? 'Complete chronological view of all return attempts with buyer requests, seller responses, and admin resolutions'
                : 'Full timeline including buyer request, seller response, and admin resolution'}
            </DialogDescription>
          </DialogHeader>
          
          {isHistoryLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : returnHistory.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No return requests found</p>
          ) : returnHistory.length === 1 ? (
            <ReturnRequestTimeline
              request={returnHistory[0]}
              onViewPhotos={(req) => setViewPhotosRequest(req)}
            />
          ) : (
            <Tabs value={selectedHistoryTab} onValueChange={setSelectedHistoryTab}>
              <TabsList className="w-full justify-start flex-wrap h-auto">
                {returnHistory.map((attempt: any, index: number) => (
                  <TabsTrigger 
                    key={index} 
                    value={String(index)}
                    className="flex items-center gap-2"
                    data-testid={`tab-attempt-${index + 1}`}
                  >
                    <span>Attempt {attempt.attemptNumber || index + 1}</span>
                    <Badge 
                      className={statusColors[attempt.status as ReturnRequestStatus] || "bg-gray-500"}
                      data-testid={`badge-attempt-${index + 1}-status`}
                    >
                      {attempt.status.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}
                    </Badge>
                  </TabsTrigger>
                ))}
              </TabsList>
              {returnHistory.map((attempt: any, index: number) => (
                <TabsContent key={index} value={String(index)}>
                  <ReturnRequestTimeline
                    request={attempt}
                    onViewPhotos={(req) => setViewPhotosRequest(req)}
                  />
                </TabsContent>
              ))}
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
