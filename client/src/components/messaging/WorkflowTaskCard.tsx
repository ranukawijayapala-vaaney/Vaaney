import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Upload,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  Paperclip,
  ExternalLink,
  DollarSign,
  Calendar,
  ShoppingCart,
  ArrowRight,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { format } from "date-fns";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export interface WorkflowTask {
  id: string;
  type: "design" | "quote";
  status: string;
  variantId?: string | null;
  packageId?: string | null;
  variantName?: string;
  packageName?: string;
  productId?: string | null;
  serviceId?: string | null;
  quoteId?: string | null;
  designApprovalId?: string | null;
  linkedDesignApprovalId?: string | null;
  linkedQuoteId?: string | null;
  quotedPrice?: string | null;
  quantity?: number;
  specifications?: string | null;
  expiresAt?: Date | null;
  designFiles?: Array<{ url: string; filename: string; size: number; mimeType: string }>;
  sellerNotes?: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}

interface WorkflowTaskCardProps {
  task: WorkflowTask;
  userRole: "buyer" | "seller";
  conversationId: string;
  onUploadDesign?: (variantId?: string, packageId?: string) => void;
  onRequestQuote?: (variantId?: string, packageId?: string) => void;
  onSendQuote?: (task: WorkflowTask) => void;
  onPurchase?: (task: WorkflowTask) => void;
  onRefresh?: () => void;
}

const getStatusBadgeVariant = (type: "design" | "quote", status: string) => {
  if (status === "approved" || status === "accepted") return "default";
  if (status === "rejected" || status === "expired") return "destructive";
  if (status === "pending" || status === "sent" || status === "requested" || status === "under_review") return "secondary";
  if (status === "changes_requested") return "outline";
  return "secondary";
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case "approved":
    case "accepted":
      return <CheckCircle className="h-3 w-3" />;
    case "rejected":
    case "expired":
      return <XCircle className="h-3 w-3" />;
    case "changes_requested":
      return <AlertCircle className="h-3 w-3" />;
    default:
      return <Clock className="h-3 w-3" />;
  }
};

const formatStatus = (status: string) => {
  return status.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
};

export function WorkflowTaskCard({
  task,
  userRole,
  conversationId,
  onUploadDesign,
  onRequestQuote,
  onSendQuote,
  onPurchase,
  onRefresh,
}: WorkflowTaskCardProps) {
  const { toast } = useToast();
  const [isExpanded, setIsExpanded] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showChangesDialog, setShowChangesDialog] = useState(false);
  const [notes, setNotes] = useState("");

  const approveMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("PUT", `/api/seller/design-approvals/${task.id}/approve`, {
        notes: "",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations", conversationId, "workflow-summary"] });
      toast({ title: "Design approved successfully" });
      onRefresh?.();
    },
    onError: (error: Error) => {
      toast({ title: "Failed to approve design", description: error.message, variant: "destructive" });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (reason: string) => {
      return await apiRequest("PUT", `/api/seller/design-approvals/${task.id}/reject`, {
        reason,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations", conversationId, "workflow-summary"] });
      toast({ title: "Design rejected" });
      setShowRejectDialog(false);
      setNotes("");
      onRefresh?.();
    },
    onError: (error: Error) => {
      toast({ title: "Failed to reject design", description: error.message, variant: "destructive" });
    },
  });

  const requestChangesMutation = useMutation({
    mutationFn: async (changeNotes: string) => {
      return await apiRequest("PUT", `/api/seller/design-approvals/${task.id}/request-changes`, {
        notes: changeNotes,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations", conversationId, "workflow-summary"] });
      toast({ title: "Changes requested" });
      setShowChangesDialog(false);
      setNotes("");
      onRefresh?.();
    },
    onError: (error: Error) => {
      toast({ title: "Failed to request changes", description: error.message, variant: "destructive" });
    },
  });

  const acceptQuoteMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", `/api/quotes/${task.id}/accept`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations", conversationId, "workflow-summary"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cart"] });
      toast({ title: "Quote accepted! Added to cart." });
      onRefresh?.();
    },
    onError: (error: Error) => {
      toast({ title: "Failed to accept quote", description: error.message, variant: "destructive" });
    },
  });

  const rejectQuoteMutation = useMutation({
    mutationFn: async (reason: string) => {
      return await apiRequest("POST", `/api/quotes/${task.id}/reject`, { reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations", conversationId, "workflow-summary"] });
      toast({ title: "Quote rejected" });
      setShowRejectDialog(false);
      setNotes("");
      onRefresh?.();
    },
    onError: (error: Error) => {
      toast({ title: "Failed to reject quote", description: error.message, variant: "destructive" });
    },
  });

  const isDesign = task.type === "design";
  const isQuote = task.type === "quote";
  const targetName = task.variantName || task.packageName || "Custom";

  return (
    <>
      <Card className="overflow-hidden" data-testid={`workflow-task-${task.type}-${task.id}`}>
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <div className="p-3">
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-lg ${isDesign ? "bg-blue-100 dark:bg-blue-900/30" : "bg-purple-100 dark:bg-purple-900/30"}`}>
                {isDesign ? (
                  <Upload className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                ) : (
                  <FileText className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm">
                    {isDesign ? "Design" : "Quote"}
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {targetName}
                  </Badge>
                  <Badge 
                    variant={getStatusBadgeVariant(task.type, task.status)} 
                    className="gap-1"
                    data-testid={`badge-status-${task.id}`}
                  >
                    {getStatusIcon(task.status)}
                    {formatStatus(task.status)}
                  </Badge>
                </div>
                
                {isQuote && task.quotedPrice && (
                  <div className="flex items-center gap-1 mt-1 text-sm">
                    <DollarSign className="h-3 w-3 text-muted-foreground" />
                    <span className="font-semibold">${parseFloat(task.quotedPrice).toFixed(2)}</span>
                    {task.quantity && task.quantity > 1 && (
                      <span className="text-muted-foreground text-xs">x{task.quantity}</span>
                    )}
                  </div>
                )}
              </div>

              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" data-testid={`button-expand-${task.id}`}>
                  {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
            </div>

            <CollapsibleContent>
              <Separator className="my-3" />
              <div className="space-y-3">
                {isDesign && task.designFiles && task.designFiles.length > 0 && (
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground">Design File</span>
                    <a
                      href={task.designFiles[0].url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-primary hover:underline"
                      data-testid={`link-design-file-${task.id}`}
                    >
                      <Paperclip className="h-3 w-3" />
                      {task.designFiles[0].filename}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}

                {isQuote && task.expiresAt && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    Expires: {format(new Date(task.expiresAt), "MMM dd, yyyy")}
                  </div>
                )}

                {task.sellerNotes && (
                  <div className="p-2 bg-muted/50 rounded-md">
                    <span className="text-xs text-muted-foreground block mb-1">Seller Notes</span>
                    <p className="text-sm">{task.sellerNotes}</p>
                  </div>
                )}

                {task.specifications && (
                  <div className="p-2 bg-muted/50 rounded-md">
                    <span className="text-xs text-muted-foreground block mb-1">Specifications</span>
                    <p className="text-sm">{task.specifications}</p>
                  </div>
                )}

                {task.linkedDesignApprovalId && (
                  <div className="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400">
                    <Upload className="h-3 w-3" />
                    Linked to approved design
                  </div>
                )}

                {task.linkedQuoteId && (
                  <div className="flex items-center gap-2 text-xs text-purple-600 dark:text-purple-400">
                    <FileText className="h-3 w-3" />
                    Linked to quote
                  </div>
                )}

                <Separator />

                <div className="flex flex-wrap gap-2">
                  {isDesign && userRole === "buyer" && task.status === "changes_requested" && (
                    <Button
                      size="sm"
                      onClick={() => onUploadDesign?.(task.variantId || undefined, task.packageId || undefined)}
                      data-testid={`button-reupload-${task.id}`}
                    >
                      <Upload className="h-3 w-3 mr-1" />
                      Upload Revised
                    </Button>
                  )}

                  {isDesign && userRole === "seller" && (task.status === "pending" || task.status === "under_review" || task.status === "resubmitted") && (
                    <>
                      <Button
                        size="sm"
                        onClick={() => approveMutation.mutate()}
                        disabled={approveMutation.isPending}
                        data-testid={`button-approve-${task.id}`}
                      >
                        {approveMutation.isPending ? (
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        ) : (
                          <CheckCircle className="h-3 w-3 mr-1" />
                        )}
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setShowChangesDialog(true)}
                        data-testid={`button-request-changes-${task.id}`}
                      >
                        <ArrowRight className="h-3 w-3 mr-1" />
                        Request Changes
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => setShowRejectDialog(true)}
                        data-testid={`button-reject-design-${task.id}`}
                      >
                        <XCircle className="h-3 w-3 mr-1" />
                        Reject
                      </Button>
                    </>
                  )}

                  {isDesign && task.status === "approved" && userRole === "buyer" && task.productId && (
                    <Button
                      size="sm"
                      onClick={() => onPurchase?.(task)}
                      data-testid={`button-add-to-cart-${task.id}`}
                    >
                      <ShoppingCart className="h-3 w-3 mr-1" />
                      Add to Cart
                    </Button>
                  )}

                  {isQuote && userRole === "buyer" && (task.status === "sent" || task.status === "pending") && (
                    <>
                      <Button
                        size="sm"
                        onClick={() => acceptQuoteMutation.mutate()}
                        disabled={acceptQuoteMutation.isPending}
                        data-testid={`button-accept-quote-${task.id}`}
                      >
                        {acceptQuoteMutation.isPending ? (
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        ) : (
                          <CheckCircle className="h-3 w-3 mr-1" />
                        )}
                        Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => setShowRejectDialog(true)}
                        data-testid={`button-reject-quote-${task.id}`}
                      >
                        <XCircle className="h-3 w-3 mr-1" />
                        Decline
                      </Button>
                    </>
                  )}

                  {isQuote && userRole === "seller" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onSendQuote?.(task)}
                      data-testid={`button-update-quote-${task.id}`}
                    >
                      <FileText className="h-3 w-3 mr-1" />
                      {task.quotedPrice ? "Update Quote" : "Send Quote"}
                    </Button>
                  )}

                  {isQuote && task.status === "accepted" && userRole === "buyer" && (
                    <Button
                      size="sm"
                      onClick={() => onPurchase?.(task)}
                      data-testid={`button-checkout-quote-${task.id}`}
                    >
                      <ShoppingCart className="h-3 w-3 mr-1" />
                      Proceed to Checkout
                    </Button>
                  )}
                </div>
              </div>
            </CollapsibleContent>
          </div>
        </Collapsible>
      </Card>

      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isDesign ? "Reject Design" : "Decline Quote"}
            </DialogTitle>
            <DialogDescription>
              {isDesign
                ? "Please provide a reason for rejecting this design."
                : "Please provide a reason for declining this quote (optional)."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="reject-reason">Reason</Label>
              <Textarea
                id="reject-reason"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={isDesign ? "Explain why the design is rejected..." : "Optional reason..."}
                data-testid="textarea-reject-reason"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (isDesign) {
                  rejectMutation.mutate(notes);
                } else {
                  rejectQuoteMutation.mutate(notes);
                }
              }}
              disabled={isDesign ? (rejectMutation.isPending || !notes.trim()) : rejectQuoteMutation.isPending}
              data-testid="button-confirm-reject"
            >
              {(rejectMutation.isPending || rejectQuoteMutation.isPending) ? "Processing..." : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showChangesDialog} onOpenChange={setShowChangesDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Changes</DialogTitle>
            <DialogDescription>
              Describe what changes you need the buyer to make to their design.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="change-notes">Required Changes</Label>
              <Textarea
                id="change-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Describe the changes needed..."
                data-testid="textarea-change-notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowChangesDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => requestChangesMutation.mutate(notes)}
              disabled={requestChangesMutation.isPending || !notes.trim()}
              data-testid="button-confirm-changes"
            >
              {requestChangesMutation.isPending ? "Processing..." : "Request Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
