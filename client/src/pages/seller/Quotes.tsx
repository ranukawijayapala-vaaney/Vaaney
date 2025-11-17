import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, Package, Store, MessageSquare, Clock, CheckCircle, XCircle } from "lucide-react";
import { useState } from "react";
import type { Quote } from "@shared/schema";

type EnrichedQuote = Quote & {
  product?: { name: string };
  service?: { name: string };
  productVariant?: { name: string };
  servicePackage?: { name: string };
  buyer?: { name: string; email: string };
  conversation?: { subject: string };
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
  requested: "Quote Requested",
  pending: "Pending",
  sent: "Sent",
  accepted: "Accepted",
  rejected: "Rejected",
  expired: "Expired",
  superseded: "Superseded",
};

export default function SellerQuotes() {
  const [, setLocation] = useLocation();
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: quotes = [], isLoading, isError, error } = useQuery<EnrichedQuote[]>({
    queryKey: ["/api/quotes"],
  });

  const filteredQuotes = quotes.filter(q =>
    statusFilter === "all" || q.status === statusFilter
  );

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
    setLocation(`/seller/messages?conversation=${conversationId}`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-bold font-display">Quote Requests</h1>
        <p className="text-muted-foreground mt-2">Manage custom quote requests from buyers</p>
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
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
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

      {/* Filter */}
      <div className="flex items-center gap-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48" data-testid="select-status-filter">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="requested">Quote Requested</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="accepted">Accepted</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
            <SelectItem value="superseded">Superseded</SelectItem>
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

      {/* Quotes List */}
      {!isError && isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-6 w-64 mb-2" />
                <Skeleton className="h-4 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : !isError && filteredQuotes.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {statusFilter === "all" 
                ? "No quote requests yet. Buyers can request custom quotes for your products and services."
                : `No ${statusLabels[statusFilter]} quotes found.`
              }
            </p>
          </CardContent>
        </Card>
      ) : !isError && (
        <div className="space-y-4">
          {filteredQuotes.map((quote) => (
            <Card key={quote.id} data-testid={`card-quote-${quote.id}`}>
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <CardTitle className="text-lg">
                        {quote.product?.name || quote.service?.name || "Unknown Item"}
                      </CardTitle>
                      {quote.productVariantId && quote.productVariant && (
                        <Badge variant="outline" className="gap-1">
                          Variant: {quote.productVariant.name}
                        </Badge>
                      )}
                      {quote.servicePackageId && quote.servicePackage && (
                        <Badge variant="outline" className="gap-1">
                          Package: {quote.servicePackage.name}
                        </Badge>
                      )}
                      {quote.productId && (
                        <Badge variant="outline" className="gap-1">
                          <Package className="h-3 w-3" />
                          Product
                        </Badge>
                      )}
                      {quote.serviceId && (
                        <Badge variant="outline" className="gap-1">
                          <Store className="h-3 w-3" />
                          Service
                        </Badge>
                      )}
                      <Badge variant={statusColors[quote.status]} className="gap-1">
                        {getStatusIcon(quote.status)}
                        {statusLabels[quote.status]}
                      </Badge>
                    </div>
                    <CardDescription>
                      Buyer: {quote.buyer?.name || quote.buyer?.email || "Unknown"}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {quote.status === "requested" && (
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-md border border-yellow-200 dark:border-yellow-800">
                    <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-1">
                      Quote Request Pending
                    </p>
                    <p className="text-xs text-yellow-700 dark:text-yellow-300">
                      Please respond to this quote request in the conversation to provide pricing and details.
                    </p>
                  </div>
                )}
                
                {quote.quotedPrice !== null && quote.quotedPrice !== undefined && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Quoted Price</p>
                      <p className="text-lg font-semibold">${parseFloat(quote.quotedPrice).toFixed(2)}</p>
                    </div>
                    {quote.expiresAt && (
                      <div>
                        <p className="text-sm text-muted-foreground">Expires At</p>
                        <p className="text-lg font-semibold">{new Date(quote.expiresAt).toLocaleDateString()}</p>
                      </div>
                    )}
                  </div>
                )}

                {quote.specifications && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Specifications</p>
                    <p className="text-sm p-3 bg-muted rounded-md">{quote.specifications}</p>
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t">
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p>Created {quote.createdAt ? new Date(quote.createdAt).toLocaleDateString() : "N/A"}</p>
                    {quote.acceptedAt && (
                      <p>Accepted {new Date(quote.acceptedAt).toLocaleDateString()}</p>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewConversation(quote.conversationId)}
                    data-testid={`button-view-conversation-${quote.id}`}
                    className="hover-elevate active-elevate-2"
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    View Conversation
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
