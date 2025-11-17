import { RotateCcw, Package, CheckCircle, XCircle, Clock, DollarSign, Image as ImageIcon, History } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery, useMutation } from "@tanstack/react-query";
import type { ReturnRequest, ReturnRequestStatus } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { ReturnRequestTimeline } from "@/components/returns/ReturnRequestTimeline";
import { MAX_RETURN_ATTEMPTS } from "@shared/constants";

const statusColors: Record<string, string> = {
  requested: "bg-yellow-500",
  under_review: "bg-blue-500",
  seller_approved: "bg-green-500",
  seller_rejected: "bg-red-500",
  admin_approved: "bg-green-600",
  admin_rejected: "bg-red-600",
  refunded: "bg-purple-500",
  completed: "bg-gray-500",
};

const reasonLabels: Record<string, string> = {
  defective: "Product is defective",
  wrong_item: "Wrong item received",
  not_as_described: "Not as described",
  damaged: "Damaged during shipping",
  changed_mind: "Changed mind",
  other: "Other",
};

type EnrichedReturnRequest = ReturnRequest & {
  order?: any;
  booking?: any;
  buyer?: any;
};

export default function SellerReturns() {
  const { toast } = useToast();
  const [selectedRequest, setSelectedRequest] = useState<EnrichedReturnRequest | null>(null);
  const [isResponseDialogOpen, setIsResponseDialogOpen] = useState(false);
  const [isPhotoDialogOpen, setIsPhotoDialogOpen] = useState(false);
  const [selectedPhotos, setSelectedPhotos] = useState<string[]>([]);
  const [sellerResponse, setSellerResponse] = useState("");
  const [sellerStatus, setSellerStatus] = useState<"approved" | "rejected">("approved");
  const [proposedRefundAmount, setProposedRefundAmount] = useState("");
  
  // Return history viewing (unified dialog for all attempts)
  const [selectedHistoryContext, setSelectedHistoryContext] = useState<{type: 'order' | 'booking', id: string} | null>(null);
  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);
  const [selectedHistoryTab, setSelectedHistoryTab] = useState<string>("0");

  const { data: returnRequests = [], isLoading } = useQuery<EnrichedReturnRequest[]>({
    queryKey: ["/api/seller/return-requests"],
  });

  // Lazy load return history when dialog opens
  const { data: returnHistory = [], isLoading: isHistoryLoading } = useQuery<any[]>({
    queryKey: selectedHistoryContext?.type === 'order'
      ? ['/api/seller/orders', selectedHistoryContext.id, 'return-history']
      : ['/api/seller/bookings', selectedHistoryContext?.id, 'return-history'],
    enabled: !!selectedHistoryContext?.id && isHistoryDialogOpen,
  });

  // Default to newest attempt when history loads
  useEffect(() => {
    if (isHistoryDialogOpen && returnHistory.length > 0) {
      setSelectedHistoryTab("0");
    }
  }, [isHistoryDialogOpen, returnHistory.length]);

  const respondMutation = useMutation({
    mutationFn: async (data: {
      id: string;
      sellerStatus: "approved" | "rejected";
      sellerResponse: string;
      sellerProposedRefundAmount?: number;
    }) => {
      return await apiRequest("PUT", `/api/seller/return-requests/${data.id}/respond`, {
        sellerStatus: data.sellerStatus,
        sellerResponse: data.sellerResponse,
        sellerProposedRefundAmount: data.sellerProposedRefundAmount,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/seller/return-requests"] });
      setIsResponseDialogOpen(false);
      setSellerResponse("");
      setSellerStatus("approved");
      setProposedRefundAmount("");
      setSelectedRequest(null);
      toast({
        title: "Response submitted!",
        description: "The admin will review your response.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to submit response",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleRespond = (request: EnrichedReturnRequest) => {
    setSelectedRequest(request);
    setSellerStatus("approved");
    setSellerResponse("");
    setProposedRefundAmount(
      request.requestedRefundAmount ? parseFloat(request.requestedRefundAmount).toString() : ""
    );
    setIsResponseDialogOpen(true);
  };

  const handleSubmitResponse = () => {
    if (!selectedRequest) return;

    if (!sellerResponse.trim()) {
      toast({ title: "Please provide a response", variant: "destructive" });
      return;
    }

    const refundAmount = proposedRefundAmount ? parseFloat(proposedRefundAmount) : undefined;

    if (sellerStatus === "approved" && (!refundAmount || refundAmount <= 0)) {
      toast({ title: "Please enter a valid refund amount", variant: "destructive" });
      return;
    }

    respondMutation.mutate({
      id: selectedRequest.id,
      sellerStatus,
      sellerResponse: sellerResponse.trim(),
      sellerProposedRefundAmount: sellerStatus === "approved" ? refundAmount : undefined,
    });
  };

  const handleViewPhotos = (photos: string[]) => {
    setSelectedPhotos(photos);
    setIsPhotoDialogOpen(true);
  };

  const canRespond = (request: EnrichedReturnRequest): boolean => {
    return request.status === "requested" || request.status === "under_review";
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-bold font-display">Return Requests</h1>
        <p className="text-muted-foreground mt-2">Review and respond to return requests from buyers</p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="space-y-3">
                  <Skeleton className="h-5 w-1/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-4 w-1/3" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : returnRequests.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <RotateCcw className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No return requests yet</h3>
            <p className="text-muted-foreground">Return requests from buyers will appear here</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {returnRequests.map((request) => (
            <Card key={request.id} className="hover-elevate" data-testid={`card-return-${request.id}`}>
              <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0 pb-4">
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <CardTitle className="text-lg">Request #{request.id.slice(0, 8).toUpperCase()}</CardTitle>
                    {(request.order?.returnAttemptCount || request.booking?.returnAttemptCount || 1) > 1 && (
                      <Badge variant="outline" className="bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-300 dark:border-orange-700">
                        <RotateCcw className="h-3 w-3 mr-1" />
                        Re-attempt {request.order?.returnAttemptCount || request.booking?.returnAttemptCount} of {MAX_RETURN_ATTEMPTS}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>{new Date(request.createdAt!).toLocaleDateString()}</span>
                  </div>
                </div>
                <Badge className={statusColors[request.status]} data-testid={`badge-status-${request.id}`}>
                  {request.status.replace(/_/g, " ")}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-4">
                {request.order && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">Order Details:</p>
                    <div className="flex items-center gap-3 p-2 border rounded-md">
                      <Package className="h-8 w-8 text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{request.order.productName}</p>
                        {request.order.variantName && (
                          <p className="text-xs text-muted-foreground">{request.order.variantName}</p>
                        )}
                      </div>
                      <div className="text-sm font-medium">${parseFloat(request.order.totalAmount).toFixed(2)}</div>
                    </div>
                  </div>
                )}

                {request.buyer && (
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Buyer:</p>
                    <p className="text-sm">{request.buyer.firstName} {request.buyer.lastName}</p>
                  </div>
                )}

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-muted-foreground">Reason:</p>
                    <Badge variant="secondary">{reasonLabels[request.reason] || request.reason}</Badge>
                  </div>

                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Description:</p>
                    <p className="text-sm bg-muted/30 p-3 rounded-md">{request.description}</p>
                  </div>

                  {request.evidenceUrls && request.evidenceUrls.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewPhotos(request.evidenceUrls as string[])}
                      data-testid={`button-view-photos-${request.id}`}
                    >
                      <ImageIcon className="h-4 w-4 mr-2" />
                      View {request.evidenceUrls.length} Photo{request.evidenceUrls.length > 1 ? "s" : ""}
                    </Button>
                  )}

                  <div className="flex items-center gap-2 text-sm">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Requested Refund:</span>
                    <span>${parseFloat(request.requestedRefundAmount || "0").toFixed(2)}</span>
                  </div>
                </div>

                {request.sellerResponse && (
                  <div className="space-y-2 p-3 bg-muted/30 rounded-md border">
                    <div className="flex items-center gap-2">
                      {request.sellerStatus === "approved" ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-500" />
                      )}
                      <p className="text-sm font-medium">
                        Your Response ({request.sellerStatus === "approved" ? "Approved" : "Rejected"})
                      </p>
                    </div>
                    <p className="text-sm">{request.sellerResponse}</p>
                    {request.sellerProposedRefundAmount && (
                      <p className="text-sm font-medium">
                        Proposed Refund: ${parseFloat(request.sellerProposedRefundAmount).toFixed(2)}
                      </p>
                    )}
                  </div>
                )}

                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      const context = request.order 
                        ? { type: 'order' as const, id: request.order.id }
                        : { type: 'booking' as const, id: request.booking.id };
                      setSelectedHistoryContext(context);
                      setIsHistoryDialogOpen(true);
                    }}
                    data-testid={`button-view-history-${request.id}`}
                  >
                    <History className="h-4 w-4 mr-2" />
                    {(request.order?.returnAttemptCount || request.booking?.returnAttemptCount || 0) > 1
                      ? `View History (${request.order?.returnAttemptCount || request.booking?.returnAttemptCount})`
                      : 'View Full Details'}
                  </Button>
                  {canRespond(request) && (
                    <Button
                      onClick={() => handleRespond(request)}
                      disabled={respondMutation.isPending}
                      data-testid={`button-respond-${request.id}`}
                    >
                      Respond to Request
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isResponseDialogOpen} onOpenChange={setIsResponseDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Respond to Return Request</DialogTitle>
            <DialogDescription>
              Review the buyer's request and provide your response
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="seller-status">Decision *</Label>
              <Select value={sellerStatus} onValueChange={(value: any) => setSellerStatus(value)}>
                <SelectTrigger id="seller-status" data-testid="select-seller-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="approved">Approve Return</SelectItem>
                  <SelectItem value="rejected">Reject Return</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {sellerStatus === "approved" && (
              <div className="space-y-2">
                <Label htmlFor="proposed-refund">Proposed Refund Amount (USD) *</Label>
                <Input
                  id="proposed-refund"
                  type="number"
                  step="0.01"
                  min="0"
                  value={proposedRefundAmount}
                  onChange={(e) => setProposedRefundAmount(e.target.value)}
                  placeholder="0.00"
                  data-testid="input-proposed-refund"
                />
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>
                      Requested: ${parseFloat(selectedRequest?.requestedRefundAmount || "0").toFixed(2)}
                    </p>
                    {selectedRequest?.order && (
                      <p className="text-xs">
                        (Product: ${parseFloat(selectedRequest.order.totalAmount || "0").toFixed(2)} + 
                        Shipping: ${parseFloat((selectedRequest.order as any).shippingCost || "0").toFixed(2)})
                      </p>
                    )}
                  </div>
                  {selectedRequest?.order && parseFloat((selectedRequest.order as any).shippingCost || "0") > 0 && (
                    <div className="p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                      <p className="text-sm text-blue-800 dark:text-blue-200">
                        ℹ️ Note: You are only responsible for refunding the product cost (${parseFloat(selectedRequest.order.totalAmount || "0").toFixed(2)}). Shipping costs (${parseFloat((selectedRequest.order as any).shippingCost || "0").toFixed(2)}) are refunded by the platform.
                      </p>
                    </div>
                  )}
                  {selectedRequest?.order && parseFloat(proposedRefundAmount || "0") > 0 && (
                    (() => {
                      const productAmount = parseFloat(selectedRequest.order.totalAmount || "0");
                      const shippingAmount = parseFloat((selectedRequest.order as any).shippingCost || "0");
                      const fullAmount = productAmount + shippingAmount;
                      const proposedAmount = parseFloat(proposedRefundAmount || "0");
                      
                      if (proposedAmount < fullAmount && shippingAmount > 0) {
                        return (
                          <div className="p-3 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                            <p className="text-sm text-yellow-800 dark:text-yellow-200">
                              ⚠️ Warning: Proposed amount (${proposedAmount.toFixed(2)}) is below the full amount paid by buyer (${fullAmount.toFixed(2)} including ${shippingAmount.toFixed(2)} shipping). Buyer will not receive full refund.
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
              <Label htmlFor="seller-response">Response *</Label>
              <Textarea
                id="seller-response"
                value={sellerResponse}
                onChange={(e) => setSellerResponse(e.target.value)}
                placeholder="Explain your decision..."
                rows={4}
                data-testid="textarea-seller-response"
              />
            </div>

            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setIsResponseDialogOpen(false);
                  setSellerResponse("");
                  setSellerStatus("approved");
                  setProposedRefundAmount("");
                }}
                data-testid="button-cancel-response"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmitResponse}
                disabled={respondMutation.isPending || !sellerResponse.trim()}
                data-testid="button-submit-response"
              >
                {respondMutation.isPending ? "Submitting..." : "Submit Response"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isPhotoDialogOpen} onOpenChange={setIsPhotoDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Return Request Photos</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            {selectedPhotos.map((photo, index) => (
              <img
                key={index}
                src={photo}
                alt={`Return photo ${index + 1}`}
                className="w-full rounded border"
              />
            ))}
          </div>
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
                ? 'View all return attempts chronologically with complete reasoning from all parties'
                : 'Complete timeline including buyer request, your response, and admin decision'}
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
              onViewPhotos={(req) => {
                setSelectedPhotos(req.evidenceUrls as string[]);
                setIsPhotoDialogOpen(true);
              }}
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
                    onViewPhotos={(req) => {
                      setSelectedPhotos(req.evidenceUrls as string[]);
                      setIsPhotoDialogOpen(true);
                    }}
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
