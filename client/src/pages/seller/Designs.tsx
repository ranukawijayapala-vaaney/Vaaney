import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { FileImage, Package, Store, MessageSquare, Clock, CheckCircle, XCircle, AlertCircle, DollarSign, Hash, Layers } from "lucide-react";
import { useState } from "react";
import type { DesignApproval, ProductVariant, ServicePackage } from "@shared/schema";

type EnrichedDesignApproval = DesignApproval & {
  product?: { name: string };
  service?: { name: string };
  buyer?: { name: string; email: string };
  conversation?: { subject: string; workflowContexts?: string[] };
  productVariant?: ProductVariant;
  servicePackage?: ServicePackage;
};

const statusColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "secondary",
  approved: "default",
  rejected: "destructive",
  changes_requested: "outline",
};

const statusLabels: Record<string, string> = {
  pending: "Pending Review",
  approved: "Approved",
  rejected: "Rejected",
  changes_requested: "Changes Requested",
};

export default function SellerDesigns() {
  const [, setLocation] = useLocation();
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: designs = [], isLoading, isError, error } = useQuery<EnrichedDesignApproval[]>({
    queryKey: ["/api/design-approvals"],
  });

  const filteredDesigns = designs.filter(d =>
    statusFilter === "all" || d.status === statusFilter
  );

  const stats = {
    total: designs.length,
    pending: designs.filter(d => d.status === "pending").length,
    approved: designs.filter(d => d.status === "approved").length,
    rejected: designs.filter(d => d.status === "rejected").length,
    changesRequested: designs.filter(d => d.status === "changes_requested").length,
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved":
        return <CheckCircle className="h-4 w-4" />;
      case "rejected":
        return <XCircle className="h-4 w-4" />;
      case "pending":
        return <Clock className="h-4 w-4" />;
      case "changes_requested":
        return <AlertCircle className="h-4 w-4" />;
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
        <h1 className="text-4xl font-bold font-display">Design Approvals</h1>
        <p className="text-muted-foreground mt-2">Review and approve buyer-submitted designs</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Designs</CardTitle>
            <FileImage className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold" data-testid="text-total-designs">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Review</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-600" data-testid="text-pending-designs">{stats.pending}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Approved</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600" data-testid="text-approved-designs">{stats.approved}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Changes Requested</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600" data-testid="text-changes-designs">{stats.changesRequested}</div>
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
            <SelectItem value="pending">Pending Review</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="changes_requested">Changes Requested</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Error State */}
      {isError && (
        <Card>
          <CardContent className="p-12 text-center">
            <XCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
            <p className="text-destructive">
              Failed to load design approvals: {error instanceof Error ? error.message : "Unknown error"}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Designs List */}
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
      ) : !isError && filteredDesigns.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <FileImage className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {statusFilter === "all" 
                ? "No design submissions yet. Buyers will upload designs for products/services requiring approval."
                : `No ${statusLabels[statusFilter]} designs found.`
              }
            </p>
          </CardContent>
        </Card>
      ) : !isError && (
        <div className="space-y-4">
          {filteredDesigns.map((design) => (
            <Card key={design.id} data-testid={`card-design-${design.id}`}>
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <CardTitle className="text-lg">
                        {design.product?.name || design.service?.name || "Unknown Item"}
                      </CardTitle>
                      {design.conversation?.workflowContexts && design.conversation.workflowContexts.length > 0 && (
                        <Badge variant="secondary" className="gap-1">
                          <Layers className="h-3 w-3" />
                          {design.conversation.workflowContexts.includes("quote") ? "Custom Quote" : "Standard Product"}
                        </Badge>
                      )}
                      {design.productId && (
                        <Badge variant="outline" className="gap-1">
                          <Package className="h-3 w-3" />
                          Product
                        </Badge>
                      )}
                      {design.serviceId && (
                        <Badge variant="outline" className="gap-1">
                          <Store className="h-3 w-3" />
                          Service
                        </Badge>
                      )}
                      <Badge variant={statusColors[design.status]} className="gap-1">
                        {getStatusIcon(design.status)}
                        {statusLabels[design.status]}
                      </Badge>
                    </div>
                    <CardDescription>
                      Buyer: {design.buyer?.name || design.buyer?.email || "Unknown"}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Variant/Package Details */}
                {design.variantId && design.productVariant && (
                  <div className="p-4 rounded-lg border bg-muted/50 space-y-3">
                    <p className="text-sm font-medium">Product Variant Details</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <Package className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{design.productVariant.name}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                          <span>
                            Price: {design.productVariant.price 
                              ? `$${Number(design.productVariant.price).toFixed(2)}`
                              : "Not set"
                            }
                          </span>
                        </div>
                        {design.productVariant.sku && (
                          <div className="flex items-center gap-2 text-sm">
                            <Hash className="h-4 w-4 text-muted-foreground" />
                            <span>SKU: {design.productVariant.sku}</span>
                          </div>
                        )}
                      </div>
                      {design.productVariant.attributes && Object.keys(design.productVariant.attributes).length > 0 && (
                        <div className="space-y-2">
                          <p className="text-xs font-medium text-muted-foreground">Attributes</p>
                          <div className="flex flex-wrap gap-1">
                            {Object.entries(design.productVariant.attributes).map(([key, value]) => (
                              <Badge key={key} variant="outline" className="text-xs">
                                {key}: {String(value)}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    {design.productVariant.imageUrls && design.productVariant.imageUrls.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-2">Variant Images</p>
                        <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
                          {design.productVariant.imageUrls.map((url: string, idx: number) => (
                            <a
                              key={idx}
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block rounded-md overflow-hidden border hover-elevate active-elevate-2"
                            >
                              <img
                                src={url}
                                alt={`Variant ${idx + 1}`}
                                className="w-full h-16 object-cover"
                              />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                {design.packageId && design.servicePackage && (
                  <div className="p-4 rounded-lg border bg-muted/50 space-y-2">
                    <p className="text-sm font-medium">Service Package Details</p>
                    <div className="flex items-center gap-2 text-sm">
                      <Store className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{design.servicePackage.name}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <span>
                        Price: {design.servicePackage.price 
                          ? `$${Number(design.servicePackage.price).toFixed(2)}`
                          : "Not set"
                        }
                      </span>
                    </div>
                    {design.servicePackage.description && (
                      <p className="text-sm text-muted-foreground">{design.servicePackage.description}</p>
                    )}
                  </div>
                )}

                <div>
                  <p className="text-sm text-muted-foreground mb-2">Design Files ({design.designFiles.length})</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {design.designFiles.map((file: { url: string }, index: number) => (
                      <a
                        key={index}
                        href={file.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block rounded-md overflow-hidden border hover-elevate active-elevate-2"
                        data-testid={`link-design-file-${design.id}-${index}`}
                      >
                        <img
                          src={file.url}
                          alt={`Design ${index + 1}`}
                          className="w-full h-24 object-cover"
                        />
                      </a>
                    ))}
                  </div>
                </div>

                {design.sellerNotes && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Your Response</p>
                    <p className="text-sm p-3 bg-primary/10 rounded-md">{design.sellerNotes}</p>
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t">
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p>Submitted {design.createdAt ? new Date(design.createdAt).toLocaleDateString() : "N/A"}</p>
                    {design.approvedAt && (
                      <p>Approved {new Date(design.approvedAt).toLocaleDateString()}</p>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewConversation(design.conversationId)}
                    data-testid={`button-view-conversation-${design.id}`}
                    className="hover-elevate active-elevate-2"
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    {design.status === "pending" ? "Review & Respond" : "View Conversation"}
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
