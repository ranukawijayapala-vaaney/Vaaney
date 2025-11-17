import { User, Eye } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ReturnRequest as BaseReturnRequest } from "@shared/schema";

// Extend the base return request type with enriched relations from API
type EnrichedReturnRequest = BaseReturnRequest & {
  buyer?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  seller?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  order?: {
    id: string;
    productName?: string;
    variantName?: string;
    totalAmount?: string | number;
    status?: string;
  };
  booking?: {
    id: string;
    serviceName?: string;
    packageName?: string;
    amount?: string | number;
    status?: string;
  };
};

interface ReturnRequestTimelineProps {
  request: EnrichedReturnRequest;
  onViewPhotos?: (request: EnrichedReturnRequest) => void;
  showOrderSummary?: boolean;
}

export function ReturnRequestTimeline({ 
  request, 
  onViewPhotos,
  showOrderSummary = false 
}: ReturnRequestTimelineProps) {
  const getSellerStatusColor = (status?: string) => {
    switch (status) {
      case "approved": return "bg-green-500/10 text-green-700 dark:text-green-300";
      case "rejected": return "bg-red-500/10 text-red-700 dark:text-red-300";
      default: return "bg-muted";
    }
  };

  return (
    <div className="space-y-4">
      {/* Order Summary (optional - for admin view) */}
      {showOrderSummary && request.order && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Order Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Order ID:</span>
              <span className="font-medium">#{request.order.id?.slice(0, 8).toUpperCase()}</span>
            </div>
            {request.order.productName && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Product:</span>
                <span className="font-medium">
                  {request.order.productName}
                  {request.order.variantName && ` (${request.order.variantName})`}
                </span>
              </div>
            )}
            {request.order.totalAmount && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Order Total:</span>
                <span className="font-bold">${request.order.totalAmount}</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Buyer's Request */}
      <Card className="border-l-4 border-l-blue-500">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <User className="h-5 w-5" />
            Buyer's Detailed Request
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {request.buyer && (
            <div className="text-sm">
              <span className="text-muted-foreground">From:</span>
              <div className="font-medium">{request.buyer.firstName} {request.buyer.lastName}</div>
              <div className="text-xs text-muted-foreground">{request.buyer.email}</div>
            </div>
          )}
          <div>
            <div className="text-xs font-medium text-muted-foreground uppercase mb-1">Reason for Return:</div>
            <Badge variant="outline" className="text-sm">{request.reason.replace(/_/g, ' ')}</Badge>
          </div>
          <div>
            <div className="text-xs font-medium text-muted-foreground uppercase mb-2">Buyer's Detailed Explanation:</div>
            <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-base leading-relaxed whitespace-pre-line">{request.description}</p>
            </div>
          </div>
          <div className="flex justify-between items-center pt-2 border-t">
            <span className="font-medium">Buyer Requested Refund:</span>
            <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              ${request.requestedRefundAmount || 'N/A'}
            </span>
          </div>
          {request.evidenceUrls && request.evidenceUrls.length > 0 && onViewPhotos && (
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Evidence Photos:</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onViewPhotos(request)}
                data-testid="button-view-evidence"
              >
                <Eye className="h-4 w-4 mr-1" />
                View {request.evidenceUrls.length} Photo(s)
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Seller's Response */}
      <Card className="border-l-4 border-l-green-500">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <User className="h-5 w-5" />
            Seller's Detailed Response
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {request.seller && (
            <div className="text-sm">
              <span className="text-muted-foreground">From:</span>
              <div className="font-medium">{request.seller.firstName} {request.seller.lastName}</div>
            </div>
          )}
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Seller's Decision:</span>
            <Badge className={getSellerStatusColor(request.sellerStatus ?? undefined)}>
              {request.sellerStatus || 'Pending'}
            </Badge>
          </div>
          {request.sellerProposedRefundAmount && (
            <div className="flex justify-between items-center">
              <span className="font-medium">Seller Proposed Refund:</span>
              <span className="text-2xl font-bold text-green-600 dark:text-green-400">
                ${request.sellerProposedRefundAmount}
              </span>
            </div>
          )}
          {request.sellerResponse ? (
            <div>
              <div className="text-xs font-medium text-muted-foreground uppercase mb-2">Seller's Detailed Explanation:</div>
              <div className="p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
                <p className="text-base leading-relaxed whitespace-pre-line">
                  {request.sellerResponse}
                </p>
              </div>
            </div>
          ) : (
            <div className="p-3 bg-muted rounded-lg text-center text-sm text-muted-foreground italic">
              Seller has not provided a response yet
            </div>
          )}
        </CardContent>
      </Card>

      {/* Admin Resolution (only show if admin has reviewed) */}
      {request.adminNotes && (
        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <User className="h-5 w-5" />
              Admin's Final Decision
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Status:</span>
              <Badge className={
                request.status === "admin_approved" || request.status === "refunded" || request.status === "completed"
                  ? "bg-green-500/10 text-green-700 dark:text-green-300"
                  : "bg-red-500/10 text-red-700 dark:text-red-300"
              }>
                {request.status.replace(/_/g, ' ')}
              </Badge>
            </div>
            {request.approvedRefundAmount && (
              <div className="flex justify-between items-center">
                <span className="font-medium">Final Refund Amount:</span>
                <span className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  ${request.approvedRefundAmount}
                </span>
              </div>
            )}
            <div>
              <div className="text-xs font-medium text-muted-foreground uppercase mb-2">Admin's Notes:</div>
              <div className="p-4 bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 rounded-lg">
                <p className="text-base leading-relaxed whitespace-pre-line">{request.adminNotes}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
