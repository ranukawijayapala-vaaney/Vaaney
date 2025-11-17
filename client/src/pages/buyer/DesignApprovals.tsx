import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { FileImage, Package, Store, MessageSquare, Clock, CheckCircle, XCircle, AlertCircle, Upload, Eye } from "lucide-react";
import { useState } from "react";
import type { DesignApproval, ProductVariant, ServicePackage } from "@shared/schema";

type EnrichedDesignApproval = DesignApproval & {
  product?: { name: string };
  service?: { name: string };
  seller?: { firstName: string; lastName: string; email: string };
  conversation?: { subject: string; workflowContexts?: string[] };
  productVariant?: ProductVariant;
  servicePackage?: ServicePackage;
};

const statusColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "secondary",
  approved: "default",
  rejected: "destructive",
  changes_requested: "outline",
  superseded: "outline",
  resubmitted: "secondary",
};

const statusLabels: Record<string, string> = {
  pending: "Pending Review",
  approved: "Approved",
  rejected: "Rejected",
  changes_requested: "Changes Requested",
  superseded: "Superseded",
  resubmitted: "Resubmitted",
};

export default function BuyerDesignApprovals() {
  const [, setLocation] = useLocation();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const { data: designs = [], isLoading, isError, error } = useQuery<EnrichedDesignApproval[]>({
    queryKey: ["/api/design-approvals"],
  });

  const filteredDesigns = designs.filter(d => {
    const statusMatch = statusFilter === "all" || d.status === statusFilter;
    const typeMatch = typeFilter === "all" || 
      (typeFilter === "products" && d.productId) || 
      (typeFilter === "services" && d.serviceId);
    return statusMatch && typeMatch;
  });

  const stats = {
    total: designs.length,
    pending: designs.filter(d => d.status === "pending" || d.status === "resubmitted").length,
    approved: designs.filter(d => d.status === "approved").length,
    changesRequested: designs.filter(d => d.status === "changes_requested").length,
    rejected: designs.filter(d => d.status === "rejected").length,
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved":
        return <CheckCircle className="h-4 w-4" />;
      case "rejected":
        return <XCircle className="h-4 w-4" />;
      case "pending":
      case "resubmitted":
        return <Clock className="h-4 w-4" />;
      case "changes_requested":
        return <AlertCircle className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const handleViewConversation = (conversationId: string) => {
    setLocation(`/messages?conversation=${conversationId}`);
  };

  const getItemName = (design: EnrichedDesignApproval) => {
    if (design.product) return design.product.name;
    if (design.service) return design.service.name;
    return "Unknown Item";
  };

  const getVariantOrPackageInfo = (design: EnrichedDesignApproval) => {
    if (design.productVariant) {
      return design.productVariant.name;
    }
    if (design.servicePackage) {
      return design.servicePackage.name;
    }
    return null;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-bold font-display">Design Approvals</h1>
        <p className="text-muted-foreground mt-2">Track your design submissions and approvals</p>
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
            <CardTitle className="text-sm font-medium text-muted-foreground">Awaiting Review</CardTitle>
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
            <div className="text-3xl font-bold text-orange-600" data-testid="text-changes-requested-designs">{stats.changesRequested}</div>
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
            <SelectItem value="pending">Pending Review</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="changes_requested">Changes Requested</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="resubmitted">Resubmitted</SelectItem>
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
              Failed to load design approvals: {error instanceof Error ? error.message : "Unknown error"}
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
      {!isLoading && !isError && filteredDesigns.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <FileImage className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {designs.length === 0 
                ? "No design submissions yet. Start by uploading a design for approval."
                : "No designs match your filters."}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Design List */}
      {!isLoading && !isError && filteredDesigns.length > 0 && (
        <div className="grid gap-6">
          {filteredDesigns.map((design) => (
            <Card key={design.id} data-testid={`card-design-${design.id}`}>
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <CardTitle className="text-xl" data-testid={`text-item-name-${design.id}`}>
                        {getItemName(design)}
                      </CardTitle>
                      <Badge variant={statusColors[design.status]} className="flex items-center gap-1">
                        {getStatusIcon(design.status)}
                        <span>{statusLabels[design.status]}</span>
                      </Badge>
                      {design.productId && (
                        <Badge variant="outline" className="flex items-center gap-1">
                          <Package className="h-3 w-3" />
                          <span>Product</span>
                        </Badge>
                      )}
                      {design.serviceId && (
                        <Badge variant="outline" className="flex items-center gap-1">
                          <Store className="h-3 w-3" />
                          <span>Service</span>
                        </Badge>
                      )}
                    </div>
                    {getVariantOrPackageInfo(design) && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {getVariantOrPackageInfo(design)}
                      </p>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Design Files */}
                <div>
                  <h4 className="text-sm font-medium mb-2">Submitted Files ({design.designFiles.length})</h4>
                  <div className="flex flex-wrap gap-2">
                    {design.designFiles.map((file: { url: string; filename: string }, index: number) => (
                      <Button
                        key={index}
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-2"
                        onClick={() => window.open(file.url, '_blank')}
                        data-testid={`button-view-file-${design.id}-${index}`}
                      >
                        <Eye className="h-3 w-3" />
                        {file.filename}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Seller Feedback */}
                {design.sellerNotes && (
                  <div className="bg-muted/50 p-4 rounded-md">
                    <h4 className="text-sm font-medium mb-1">Seller Feedback</h4>
                    <p className="text-sm text-muted-foreground">{design.sellerNotes}</p>
                  </div>
                )}

                {/* Timestamps */}
                <div className="text-sm text-muted-foreground flex flex-wrap gap-4">
                  <span>Submitted: {new Date(design.createdAt!).toLocaleDateString()}</span>
                  {design.approvedAt && (
                    <span>Approved: {new Date(design.approvedAt).toLocaleDateString()}</span>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewConversation(design.conversationId)}
                    className="flex items-center gap-2"
                    data-testid={`button-view-conversation-${design.id}`}
                  >
                    <MessageSquare className="h-4 w-4" />
                    View Conversation
                  </Button>

                  {design.status === "changes_requested" && (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => handleViewConversation(design.conversationId)}
                      className="flex items-center gap-2"
                      data-testid={`button-upload-revision-${design.id}`}
                    >
                      <Upload className="h-4 w-4" />
                      Upload Revision
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
