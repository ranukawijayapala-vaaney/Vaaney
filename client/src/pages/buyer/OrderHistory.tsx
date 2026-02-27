import { Package, Calendar, DollarSign, Check, Truck, Box, CheckCircle, XCircle, Clock, MessageCircle, ExternalLink, RotateCcw, Upload, X, Eye, History, Star, FileText, CreditCard } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery, useMutation } from "@tanstack/react-query";
import type { Order, OrderStatus, ReturnRequest, ReturnRequestStatus } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useState, useEffect, useRef, useMemo } from "react";
import { ReturnRequestTimeline } from "@/components/returns/ReturnRequestTimeline";
import { MAX_RETURN_ATTEMPTS } from "@shared/constants";
import { RatingDialog } from "@/components/RatingDialog";

const statusColors: Record<OrderStatus, string> = {
  pending_payment: "bg-yellow-500",
  paid: "bg-blue-500",
  processing: "bg-purple-500",
  shipped: "bg-indigo-500",
  delivered: "bg-green-500",
  cancelled: "bg-red-500",
};

const returnStatusColors: Record<ReturnRequestStatus, string> = {
  requested: "bg-orange-500",
  under_review: "bg-blue-500",
  seller_approved: "bg-emerald-600",
  seller_rejected: "bg-red-600",
  admin_approved: "bg-emerald-600",
  admin_rejected: "bg-red-600",
  refunded: "bg-green-700",
  completed: "bg-slate-500",
  cancelled: "bg-gray-500",
};

const formatReturnStatusLabel = (status: ReturnRequestStatus): string => {
  const labels: Record<ReturnRequestStatus, string> = {
    requested: "Return Requested",
    under_review: "Return Under Review",
    seller_approved: "Seller Approved",
    seller_rejected: "Seller Rejected",
    admin_approved: "Admin Approved",
    admin_rejected: "Return Rejected",
    refunded: "Refunded",
    completed: "Return Completed",
    cancelled: "Return Cancelled",
  };
  return labels[status] || status;
};

const statusSteps: OrderStatus[] = ["pending_payment", "paid", "processing", "shipped", "delivered"];

const getStatusProgress = (status: OrderStatus): number => {
  if (status === "cancelled") return 0;
  const index = statusSteps.indexOf(status);
  return index >= 0 ? ((index + 1) / statusSteps.length) * 100 : 0;
};

const returnReasons = [
  { value: "defective", label: "Product is defective" },
  { value: "wrong_item", label: "Wrong item received" },
  { value: "not_as_described", label: "Not as described" },
  { value: "damaged", label: "Damaged during shipping" },
  { value: "changed_mind", label: "Changed my mind" },
  { value: "other", label: "Other" },
];

export default function OrderHistory() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isContactDialogOpen, setIsContactDialogOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [initialMessage, setInitialMessage] = useState("");
  
  // Return request states
  const [isReturnDialogOpen, setIsReturnDialogOpen] = useState(false);
  const [returnReason, setReturnReason] = useState("");
  const [returnDescription, setReturnDescription] = useState("");
  const [returnRequestedAmount, setReturnRequestedAmount] = useState("");
  const [returnPhotos, setReturnPhotos] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Return history viewing
  const [selectedHistoryContext, setSelectedHistoryContext] = useState<{type: 'order' | 'booking', id: string} | null>(null);
  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);
  const [selectedHistoryTab, setSelectedHistoryTab] = useState<string>("0");
  const [viewPhotosRequest, setViewPhotosRequest] = useState<any | null>(null);
  
  // Rating states
  const [isRatingDialogOpen, setIsRatingDialogOpen] = useState(false);
  const [selectedOrderForRating, setSelectedOrderForRating] = useState<string | null>(null);
  const [retryingPayment, setRetryingPayment] = useState<string | null>(null);

  const retryPaymentMutation = useMutation({
    mutationFn: async ({ transactionRef, transactionType }: { transactionRef: string; transactionType: string }) => {
      return await apiRequest("POST", "/api/payments/retry", { transactionRef, transactionType });
    },
    onSuccess: (response: any) => {
      if (response.mpgsSessionId) {
        toast({ title: "Redirecting to payment gateway..." });
        window.location.href = `https://cbcmpgs.gateway.mastercard.com/checkout/pay/${response.mpgsSessionId}`;
      } else {
        setRetryingPayment(null);
      }
    },
    onError: (error: Error) => {
      toast({ title: "Payment retry failed", description: error.message, variant: "destructive" });
      setRetryingPayment(null);
    },
  });

  const { data: orders = [], isLoading } = useQuery<Order[]>({
    queryKey: ["/api/buyer/orders"],
  });

  const { data: returnRequests = [] } = useQuery<ReturnRequest[]>({
    queryKey: ["/api/buyer/return-requests"],
  });

  // Lazy load return history when dialog opens
  const { data: returnHistory = [], isLoading: isHistoryLoading } = useQuery<any[]>({
    queryKey: selectedHistoryContext?.type === 'order'
      ? ['/api/buyer/orders', selectedHistoryContext.id, 'return-history']
      : ['/api/buyer/bookings', selectedHistoryContext?.id, 'return-history'],
    enabled: !!selectedHistoryContext?.id && isHistoryDialogOpen,
  });

  // Default to newest attempt when history loads
  useEffect(() => {
    if (isHistoryDialogOpen && returnHistory.length > 0) {
      setSelectedHistoryTab("0");
    }
  }, [isHistoryDialogOpen, returnHistory.length]);

  // Create a map of return requests by order ID for quick lookup
  const returnRequestByOrderId = useMemo(() => {
    const map = new Map<string, ReturnRequest>();
    returnRequests.forEach((request) => {
      if (request.orderId) {
        map.set(request.orderId, request);
      }
    });
    return map;
  }, [returnRequests]);

  // Check for payment status in URL query params
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const paymentStatus = searchParams.get("payment");
    const transactionRef = searchParams.get("transactionRef");

    if (paymentStatus) {
      if (paymentStatus === "success") {
        toast({
          title: "Payment Successful!",
          description: `Your order has been confirmed. Reference: ${transactionRef?.slice(0, 12)}...`,
        });
      } else if (paymentStatus === "failed") {
        toast({
          title: "Payment Failed",
          description: "Your payment could not be processed. Please try again.",
          variant: "destructive",
        });
      }
      
      // Clear query params from URL
      const newUrl = window.location.pathname;
      window.history.replaceState({}, "", newUrl);
    }
  }, [toast]);

  const createConversationMutation = useMutation({
    mutationFn: async (data: { orderId: string; subject: string; initialMessage: string }) => {
      const conversation = await apiRequest("POST", "/api/conversations", {
        type: "order",
        subject: data.subject,
        orderId: data.orderId,
      });
      
      // Send initial message if provided
      if (data.initialMessage.trim()) {
        await apiRequest("POST", `/api/conversations/${conversation.id}/messages`, {
          content: data.initialMessage,
        });
      }
      
      return conversation;
    },
    onSuccess: (conversation) => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      setIsContactDialogOpen(false);
      setSubject("");
      setInitialMessage("");
      setSelectedOrder(null);
      toast({ title: "Conversation started!" });
      navigate("/messages");
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create conversation",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const createReturnRequestMutation = useMutation({
    mutationFn: async (data: {
      orderId: string;
      type: string;
      reason: string;
      description: string;
      requestedRefundAmount: number;
      evidenceUrls: string[];
    }) => {
      return await apiRequest("POST", "/api/buyer/return-requests", data);
    },
    onSuccess: () => {
      // Invalidate all related caches
      queryClient.invalidateQueries({ queryKey: ["/api/buyer/return-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/buyer/orders"] });
      // Invalidate return history for this specific order
      if (selectedOrder) {
        queryClient.invalidateQueries({ 
          queryKey: ['/api/buyer/orders', selectedOrder.id, 'return-history'] 
        });
      }
      
      setIsReturnDialogOpen(false);
      setReturnReason("");
      setReturnDescription("");
      setReturnRequestedAmount("");
      setReturnPhotos([]);
      setSelectedOrder(null);
      toast({ 
        title: "Return request submitted!",
        description: "The seller will review your request shortly."
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to submit return request",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleContactSeller = (order: Order) => {
    setSelectedOrder(order);
    setSubject(`Question about Order #${order.id.slice(0, 8).toUpperCase()}`);
    setIsContactDialogOpen(true);
  };

  const handleCreateConversation = () => {
    if (!selectedOrder) return;
    
    if (!subject.trim()) {
      toast({ title: "Please provide a subject", variant: "destructive" });
      return;
    }

    createConversationMutation.mutate({
      orderId: selectedOrder.id,
      subject: subject.trim(),
      initialMessage: initialMessage.trim(),
    });
  };

  const handleRequestReturn = (order: Order) => {
    setSelectedOrder(order);
    // Calculate full amount paid by buyer (product + shipping)
    const productAmount = parseFloat(order.totalAmount || "0");
    const shippingAmount = parseFloat((order as any).shippingCost || "0");
    const fullAmountPaid = productAmount + shippingAmount;
    setReturnRequestedAmount(fullAmountPaid.toFixed(2));
    setIsReturnDialogOpen(true);
  };

  const handleSubmitReturn = () => {
    if (!selectedOrder) return;

    if (!returnReason) {
      toast({ title: "Please select a reason", variant: "destructive" });
      return;
    }

    if (!returnDescription.trim()) {
      toast({ title: "Please provide a description", variant: "destructive" });
      return;
    }

    const requestedAmount = parseFloat(returnRequestedAmount);
    if (isNaN(requestedAmount) || requestedAmount < 0.01) {
      toast({ title: "Please enter a valid refund amount (minimum $0.01)", variant: "destructive" });
      return;
    }

    // Calculate full amount paid by buyer (product + shipping)
    const productAmount = parseFloat(selectedOrder.totalAmount || "0");
    const shippingAmount = parseFloat((selectedOrder as any).shippingCost || "0");
    const fullAmountPaid = productAmount + shippingAmount;
    
    if (requestedAmount > fullAmountPaid) {
      toast({ 
        title: "Refund amount too high", 
        description: `Maximum refund amount is $${fullAmountPaid.toFixed(2)} (includes shipping)`,
        variant: "destructive" 
      });
      return;
    }

    createReturnRequestMutation.mutate({
      orderId: selectedOrder.id,
      type: "order",
      reason: returnReason,
      description: returnDescription.trim(),
      requestedRefundAmount: requestedAmount,
      evidenceUrls: returnPhotos,
    });
  };

  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      if (!file.type.startsWith('image/')) {
        toast({ title: "Please upload only image files", variant: "destructive" });
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        if (result) {
          setReturnPhotos((prev) => [...prev, result]);
        }
      };
      reader.readAsDataURL(file);
    });

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removePhoto = (index: number) => {
    setReturnPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleViewReturnHistory = (order: Order) => {
    setSelectedHistoryContext({ type: 'order' as const, id: order.id });
    setIsHistoryDialogOpen(true);
  };

  const handleRateOrder = (order: Order) => {
    setSelectedOrderForRating(order.id);
    setIsRatingDialogOpen(true);
  };

  const canRequestReturn = (order: Order): boolean => {
    // Only allow returns for delivered orders (buyer must receive the item first)
    if (order.status !== "delivered") return false;

    // Check if there's already an active return request
    // Buyers can only request a new return if previous attempts were rejected/cancelled
    const activeReturn = (order as any).activeReturnRequest;
    return !activeReturn;
  };

  const canRateOrder = (order: Order): boolean => {
    // Only allow rating delivered orders that haven't been rated yet
    return order.status === "delivered" && !(order as any).rating;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-bold font-display">Order History</h1>
        <p className="text-muted-foreground mt-2">Track all your product orders</p>
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
      ) : orders.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No orders yet</h3>
            <p className="text-muted-foreground">Start shopping to see your orders here</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <Card key={order.id} className="hover-elevate" data-testid={`card-order-${order.id}`}>
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-4">
                <div className="space-y-1">
                  <CardTitle className="text-lg">Order #{order.id.slice(0, 8).toUpperCase()}</CardTitle>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>{new Date(order.createdAt!).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 items-start justify-end">
                  <Badge className={statusColors[order.status as OrderStatus]} data-testid={`badge-status-${order.id}`}>
                    {order.status.replace("_", " ")}
                  </Badge>
                  {(order as any).activeReturnRequest && (
                    <>
                      <Badge 
                        className={returnStatusColors[(order as any).activeReturnRequest.status as ReturnRequestStatus]}
                        data-testid={`badge-return-status-${order.id}`}
                      >
                        {formatReturnStatusLabel((order as any).activeReturnRequest.status as ReturnRequestStatus)}
                      </Badge>
                      {order.returnAttemptCount && order.returnAttemptCount > 1 && (
                        <Badge variant="outline" className="bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-300 dark:border-orange-700">
                          <RotateCcw className="h-3 w-3 mr-1" />
                          Re-attempt {order.returnAttemptCount} of {MAX_RETURN_ATTEMPTS}
                        </Badge>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewReturnHistory(order)}
                        data-testid={`button-view-return-history-${order.id}`}
                        className="h-6 px-2 text-xs"
                      >
                        <History className="h-3 w-3 mr-1" />
                        {order.returnAttemptCount && order.returnAttemptCount > 1
                          ? `View History (${order.returnAttemptCount})`
                          : 'View Details'}
                      </Button>
                    </>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {order.status !== "cancelled" && (
                  <div className="space-y-3" data-testid={`progress-tracker-${order.id}`}>
                    <Progress value={getStatusProgress(order.status)} className="h-2" />
                    <div className="grid grid-cols-5 gap-1">
                      {statusSteps.map((step, index) => {
                        const currentIndex = statusSteps.indexOf(order.status);
                        const isCompleted = index < currentIndex;
                        const isCurrent = index === currentIndex;
                        const isUpcoming = index > currentIndex;
                        
                        const stepIcons = [Clock, Check, Package, Truck, Box];
                        const stepLabels = ["Payment Confirmation", "Confirmed", "Processing", "Shipped", "Delivered"];
                        const StepIcon = stepIcons[index];
                        
                        return (
                          <div 
                            key={step}
                            className={`text-center ${
                              isCompleted || isCurrent ? "text-primary" : "text-muted-foreground"
                            }`}
                          >
                            <div className="flex items-center justify-center mb-1">
                              {isCompleted ? (
                                <CheckCircle className="h-4 w-4" />
                              ) : (
                                <StepIcon className={`h-4 w-4 ${isCurrent ? "animate-pulse" : ""}`} />
                              )}
                            </div>
                            <p className="text-xs font-medium">{stepLabels[index]}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                
                {order.status === "cancelled" && (
                  <div className="flex items-center gap-2 p-3 bg-destructive/10 rounded-md border border-destructive/20">
                    <XCircle className="h-5 w-5 text-destructive" />
                    <span className="text-sm font-medium text-destructive">This order has been cancelled</span>
                  </div>
                )}

                {(order as any).product && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">Product Details:</p>
                    <div className="flex items-center gap-3 p-2 border rounded-md" data-testid="order-product-details">
                      {(order as any).product?.images?.[0] && (
                        <img
                          src={(order as any).product.images[0]}
                          alt={(order as any).product?.name || "Product"}
                          className="w-12 h-12 object-cover rounded"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{(order as any).product?.name || "Product"}</p>
                        <p className="text-xs text-muted-foreground">
                          {(order as any).variant?.name && `${(order as any).variant.name} • `}
                          Qty: {order.quantity}
                        </p>
                      </div>
                      <div className="text-sm font-medium">${parseFloat(order.unitPrice).toFixed(2)}</div>
                    </div>
                  </div>
                )}

                {(order as any).designApproval && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">Design Files:</p>
                    <div className="p-3 border rounded-md space-y-2 bg-muted/30">
                      <div className="flex items-center gap-2">
                        <Badge variant="default" className="text-xs">
                          <FileText className="h-3 w-3 mr-1" />
                          Approved Design
                        </Badge>
                      </div>
                      {(order as any).designApproval.designFiles && (order as any).designApproval.designFiles.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {(order as any).designApproval.designFiles.map((file: any, index: number) => (
                            <Button
                              key={index}
                              variant="outline"
                              size="sm"
                              onClick={() => window.open(file.url, '_blank')}
                              data-testid={`button-view-design-${order.id}-${index}`}
                            >
                              <ExternalLink className="h-3 w-3 mr-1" />
                              {file.filename || `Design File ${index + 1}`}
                            </Button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {order.aramexAwbNumber && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">Shipping Information:</p>
                    <div className="p-3 border rounded-md space-y-2 bg-muted/30">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">AWB Number:</span>
                        <span className="text-sm font-mono" data-testid={`text-awb-${order.id}`}>{order.aramexAwbNumber}</span>
                      </div>
                      {order.aramexTrackingUrl && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full"
                          onClick={() => order.aramexTrackingUrl && window.open(order.aramexTrackingUrl, '_blank')}
                          data-testid={`button-track-${order.id}`}
                        >
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Track Your Shipment
                        </Button>
                      )}
                    </div>
                  </div>
                )}
                
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>Product: ${(parseFloat(order.unitPrice) * order.quantity).toFixed(2)}</span>
                      <span>•</span>
                      <span>Shipping: ${parseFloat(order.shippingCost || "0").toFixed(2)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <span className="font-semibold">Total: ${((parseFloat(order.unitPrice) * order.quantity) + parseFloat(order.shippingCost || "0")).toFixed(2)} USD</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {order.status === "pending_payment" && (order as any).paymentMethod === "ipg" && (
                      <Button
                        size="sm"
                        onClick={() => {
                          setRetryingPayment(order.id);
                          const txType = (order as any).checkoutSessionId ? "checkout" : "order";
                          const txRef = (order as any).checkoutSessionId || order.id;
                          retryPaymentMutation.mutate({ transactionRef: txRef, transactionType: txType });
                        }}
                        disabled={retryingPayment === order.id}
                        data-testid={`button-retry-payment-${order.id}`}
                      >
                        <CreditCard className="h-4 w-4 mr-2" />
                        {retryingPayment === order.id ? "Processing..." : "Retry Payment"}
                      </Button>
                    )}
                    {canRateOrder(order) && (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleRateOrder(order)}
                        data-testid={`button-rate-order-${order.id}`}
                      >
                        <Star className="h-4 w-4 mr-2" />
                        Rate Order
                      </Button>
                    )}
                    {canRequestReturn(order) && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRequestReturn(order)}
                        data-testid={`button-request-return-${order.id}`}
                      >
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Request Return
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleContactSeller(order)}
                      data-testid={`button-contact-seller-${order.id}`}
                    >
                      <MessageCircle className="h-4 w-4 mr-2" />
                      Contact Seller
                    </Button>
                  </div>
                </div>
                <div className="text-sm">
                  <p className="text-muted-foreground mb-1">Shipping Address:</p>
                  <p className="line-clamp-2">{order.shippingAddress}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isContactDialogOpen} onOpenChange={setIsContactDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Contact Seller About Order</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Create a conversation with the seller about order #{selectedOrder?.id.slice(0, 8).toUpperCase()}
            </div>

            <div className="space-y-2">
              <Label htmlFor="order-subject">Subject</Label>
              <input
                id="order-subject"
                type="text"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="What do you need help with?"
                data-testid="input-order-subject"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="order-message">Message</Label>
              <Textarea
                id="order-message"
                value={initialMessage}
                onChange={(e) => setInitialMessage(e.target.value)}
                placeholder="Describe your question or concern..."
                rows={4}
                data-testid="textarea-order-message"
              />
            </div>

            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setIsContactDialogOpen(false)}
                data-testid="button-cancel-order-contact"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateConversation}
                disabled={createConversationMutation.isPending}
                data-testid="button-start-order-conversation"
              >
                {createConversationMutation.isPending ? "Creating..." : "Start Conversation"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isReturnDialogOpen} onOpenChange={setIsReturnDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Request Return or Refund</DialogTitle>
            <DialogDescription>
              Submit a return request for order #{selectedOrder?.id.slice(0, 8).toUpperCase()}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="return-reason">Reason for return *</Label>
              <Select value={returnReason} onValueChange={setReturnReason}>
                <SelectTrigger id="return-reason" data-testid="select-return-reason">
                  <SelectValue placeholder="Select a reason" />
                </SelectTrigger>
                <SelectContent>
                  {returnReasons.map((reason) => (
                    <SelectItem key={reason.value} value={reason.value}>
                      {reason.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="return-description">Description *</Label>
              <Textarea
                id="return-description"
                value={returnDescription}
                onChange={(e) => setReturnDescription(e.target.value)}
                placeholder="Please describe the issue in detail..."
                rows={4}
                data-testid="textarea-return-description"
              />
              <p className="text-sm text-muted-foreground">
                Provide as much detail as possible to help us process your request quickly.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="return-requested-amount">Requested Refund Amount (USD) *</Label>
              <Input
                id="return-requested-amount"
                type="number"
                step="0.01"
                min="0.01"
                value={returnRequestedAmount}
                onChange={(e) => setReturnRequestedAmount(e.target.value)}
                placeholder="Enter refund amount"
                data-testid="input-requested-refund"
              />
              <div className="text-sm text-muted-foreground space-y-1">
                <p>
                  Product cost: ${parseFloat(selectedOrder?.totalAmount || "0").toFixed(2)}
                </p>
                {selectedOrder && parseFloat((selectedOrder as any).shippingCost || "0") > 0 && (
                  <>
                    <p>
                      Shipping cost: ${parseFloat((selectedOrder as any).shippingCost || "0").toFixed(2)}
                    </p>
                    <p className="font-medium">
                      Total paid: ${(parseFloat(selectedOrder.totalAmount || "0") + parseFloat((selectedOrder as any).shippingCost || "0")).toFixed(2)}
                    </p>
                  </>
                )}
                <p className="text-xs italic">
                  Default amount includes shipping costs for full refund
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Photos (Optional)</Label>
              <p className="text-sm text-muted-foreground mb-2">
                Upload photos to support your return request
              </p>
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handlePhotoUpload}
                className="hidden"
              />
              
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="w-full"
                data-testid="button-upload-photos"
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload Photos
              </Button>

              {returnPhotos.length > 0 && (
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {returnPhotos.map((photo, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={photo}
                        alt={`Return photo ${index + 1}`}
                        className="w-full h-24 object-cover rounded border"
                      />
                      <button
                        type="button"
                        onClick={() => removePhoto(index)}
                        className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        data-testid={`button-remove-photo-${index}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setIsReturnDialogOpen(false);
                  setReturnReason("");
                  setReturnDescription("");
                  setReturnRequestedAmount("");
                  setReturnPhotos([]);
                }}
                data-testid="button-cancel-return"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmitReturn}
                disabled={createReturnRequestMutation.isPending || !returnReason || !returnDescription.trim() || !returnRequestedAmount}
                data-testid="button-submit-return"
              >
                {createReturnRequestMutation.isPending ? "Submitting..." : "Submit Request"}
              </Button>
            </div>
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
                : 'Complete timeline including buyer request, seller response, and admin decision'}
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
                      className={returnStatusColors[attempt.status as ReturnRequestStatus]}
                      data-testid={`badge-attempt-${index + 1}-status`}
                    >
                      {formatReturnStatusLabel(attempt.status)}
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

      {/* Photo Viewing Dialog */}
      <Dialog open={!!viewPhotosRequest} onOpenChange={() => setViewPhotosRequest(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Evidence Photos</DialogTitle>
            <DialogDescription>
              Photos submitted with the return request
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            {viewPhotosRequest?.evidenceUrls?.map((url: string, index: number) => (
              <div key={index} className="relative group">
                <img
                  src={url}
                  alt={`Evidence ${index + 1}`}
                  className="w-full h-auto rounded-lg border"
                />
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Rating Dialog */}
      {selectedOrderForRating && (
        <RatingDialog
          type="order"
          id={selectedOrderForRating}
          open={isRatingDialogOpen}
          onOpenChange={setIsRatingDialogOpen}
          onSuccess={() => {
            setSelectedOrderForRating(null);
          }}
        />
      )}
    </div>
  );
}
