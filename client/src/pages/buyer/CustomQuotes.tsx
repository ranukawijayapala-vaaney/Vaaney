import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, Package, Store, MessageSquare, Clock, CheckCircle, XCircle, ShoppingCart, Calendar, DollarSign } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Quote } from "@shared/schema";

type EnrichedQuote = Quote & {
  product?: { name: string };
  service?: { name: string };
  productVariant?: { name: string };
  servicePackage?: { name: string };
  seller?: { firstName: string; lastName: string; email: string };
  conversation?: { subject: string };
  validUntil?: string | null;
  sellerNotes?: string | null;
  sentAt?: Date | null;
};

const statusColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  requested: "secondary",
  pending: "secondary",
  sent: "secondary",
  accepted: "default",
  rejected: "destructive",
  expired: "outline",
  superseded: "outline",
};

const statusLabels: Record<string, string> = {
  requested: "Awaiting Seller Response",
  pending: "Pending",
  sent: "Awaiting Your Response",
  accepted: "Accepted",
  rejected: "Rejected",
  expired: "Expired",
  superseded: "Superseded",
};

export default function BuyerCustomQuotes() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const { data: quotes = [], isLoading, isError, error } = useQuery<EnrichedQuote[]>({
    queryKey: ["/api/quotes"],
  });

  const acceptQuoteMutation = useMutation({
    mutationFn: async (quoteId: string) => {
      return await apiRequest("POST", `/api/quotes/${quoteId}/accept`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quotes"] });
      toast({
        title: "Quote Accepted",
        description: "You can now add this item to your cart",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const rejectQuoteMutation = useMutation({
    mutationFn: async (quoteId: string) => {
      return await apiRequest("POST", `/api/quotes/${quoteId}/reject`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quotes"] });
      toast({
        title: "Quote Rejected",
        description: "The seller has been notified",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const filteredQuotes = quotes.filter(q => {
    const statusMatch = statusFilter === "all" || q.status === statusFilter;
    const typeMatch = typeFilter === "all" || 
      (typeFilter === "products" && q.productId) || 
      (typeFilter === "services" && q.serviceId);
    return statusMatch && typeMatch;
  });

  const stats = {
    total: quotes.length,
    pending: quotes.filter(q => q.status === "requested" || q.status === "pending" || q.status === "sent").length,
    accepted: quotes.filter(q => q.status === "accepted").length,
    rejected: quotes.filter(q => q.status === "rejected").length,
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "accepted":
        return <CheckCircle className="h-4 w-4" />;
      case "rejected":
        return <XCircle className="h-4 w-4" />;
      case "requested":
      case "pending":
      case "sent":
        return <Clock className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const handleViewConversation = (conversationId: string) => {
    setLocation(`/messages?conversation=${conversationId}`);
  };

  const getItemName = (quote: EnrichedQuote) => {
    if (quote.product) return quote.product.name;
    if (quote.service) return quote.service.name;
    return "Unknown Item";
  };

  const getVariantOrPackageInfo = (quote: EnrichedQuote) => {
    if (quote.productVariant) {
      return quote.productVariant.name;
    }
    if (quote.servicePackage) {
      return quote.servicePackage.name;
    }
    return null;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-bold font-display">Custom Quotes</h1>
        <p className="text-muted-foreground mt-2">Track and manage your custom quote requests</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Quotes</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold" data-testid="text-total-quotes">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Awaiting Response</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-600" data-testid="text-pending-quotes">{stats.pending}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Accepted</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600" data-testid="text-accepted-quotes">{stats.accepted}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Rejected</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600" data-testid="text-rejected-quotes">{stats.rejected}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[200px]" data-testid="select-status-filter">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="requested">Awaiting Seller Response</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="sent">Awaiting Your Response</SelectItem>
            <SelectItem value="accepted">Accepted</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
          </SelectContent>
        </Select>

        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-[200px]" data-testid="select-type-filter">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="products">Products</SelectItem>
            <SelectItem value="services">Services</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Error State */}
      {isError && (
        <Card>
          <CardContent className="p-12 text-center">
            <XCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
            <p className="text-destructive">
              Failed to load quotes: {error instanceof Error ? error.message : "Unknown error"}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="grid gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="space-y-3">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-4 w-full" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !isError && filteredQuotes.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {quotes.length === 0 
                ? "No custom quote requests yet. Request a quote for items requiring custom specifications."
                : "No quotes match your filters."}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Quote List */}
      {!isLoading && !isError && filteredQuotes.length > 0 && (
        <div className="grid gap-6">
          {filteredQuotes.map((quote) => (
            <Card key={quote.id} data-testid={`card-quote-${quote.id}`}>
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <CardTitle className="text-xl" data-testid={`text-item-name-${quote.id}`}>
                        {getItemName(quote)}
                      </CardTitle>
                      <Badge variant={statusColors[quote.status]} className="flex items-center gap-1">
                        {getStatusIcon(quote.status)}
                        <span>{statusLabels[quote.status]}</span>
                      </Badge>
                      {quote.productId && (
                        <Badge variant="outline" className="flex items-center gap-1">
                          <Package className="h-3 w-3" />
                          <span>Product</span>
                        </Badge>
                      )}
                      {quote.serviceId && (
                        <Badge variant="outline" className="flex items-center gap-1">
                          <Store className="h-3 w-3" />
                          <span>Service</span>
                        </Badge>
                      )}
                    </div>
                    {getVariantOrPackageInfo(quote) && (
                      <p className="text-sm text-muted-foreground mt-1">
                        Base variant: {getVariantOrPackageInfo(quote)}
                      </p>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Quote Details */}
                {quote.quotedPrice !== null && quote.quotedPrice !== undefined && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <span className="text-2xl font-bold">${quote.quotedPrice}</span>
                      <span className="text-sm text-muted-foreground">for {quote.quantity} unit{quote.quantity !== 1 ? 's' : ''}</span>
                    </div>
                    {quote.validUntil && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>Valid until: {new Date(quote.validUntil).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                )}
                
                {quote.status === "requested" && (
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-md border border-yellow-200 dark:border-yellow-800">
                    <p className="text-sm text-yellow-800 dark:text-yellow-200">
                      Your quote request has been sent to the seller. They will review your specifications and provide pricing details.
                    </p>
                  </div>
                )}

                {/* Specifications */}
                {quote.specifications && (
                  <div className="bg-muted/50 p-4 rounded-md">
                    <h4 className="text-sm font-medium mb-1">Custom Specifications</h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{quote.specifications}</p>
                  </div>
                )}

                {/* Seller Notes */}
                {quote.sellerNotes && (
                  <div className="bg-muted/50 p-4 rounded-md">
                    <h4 className="text-sm font-medium mb-1">Seller Notes</h4>
                    <p className="text-sm text-muted-foreground">{quote.sellerNotes}</p>
                  </div>
                )}

                {/* Timestamps */}
                <div className="text-sm text-muted-foreground">
                  <span>Requested: {new Date(quote.createdAt!).toLocaleDateString()}</span>
                  {quote.sentAt && (
                    <span className="ml-4">Quote sent: {new Date(quote.sentAt).toLocaleDateString()}</span>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewConversation(quote.conversationId)}
                    className="flex items-center gap-2"
                    data-testid={`button-view-conversation-${quote.id}`}
                  >
                    <MessageSquare className="h-4 w-4" />
                    View Conversation
                  </Button>

                  {quote.status === "sent" && (
                    <>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => acceptQuoteMutation.mutate(quote.id)}
                        disabled={acceptQuoteMutation.isPending}
                        className="flex items-center gap-2"
                        data-testid={`button-accept-quote-${quote.id}`}
                      >
                        <CheckCircle className="h-4 w-4" />
                        Accept Quote
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => rejectQuoteMutation.mutate(quote.id)}
                        disabled={rejectQuoteMutation.isPending}
                        className="flex items-center gap-2"
                        data-testid={`button-reject-quote-${quote.id}`}
                      >
                        <XCircle className="h-4 w-4" />
                        Reject Quote
                      </Button>
                    </>
                  )}

                  {quote.status === "accepted" && (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => handleViewConversation(quote.conversationId)}
                      className="flex items-center gap-2"
                      data-testid={`button-add-to-cart-${quote.id}`}
                    >
                      <ShoppingCart className="h-4 w-4" />
                      Add to Cart
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
