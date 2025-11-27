import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ChevronLeft, ChevronRight, Workflow, FileImage, FileText, ExternalLink, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { useQuoteState } from "@/hooks/use-quote-state";

interface WorkflowPanelProps {
  conversationId: string;
  productId?: string;
  serviceId?: string;
  userRole: "buyer" | "seller";
  itemName?: string;
  requiresDesignApproval?: boolean;
  requiresQuote?: boolean;
  onRequestQuote?: () => void;
  variants?: Array<{ id: string; name: string; price: string }>;
  packages?: Array<{ id: string; name: string; price: string }>;
  conversation?: { workflowContexts?: string[]; buyerId?: string };
  approvedDesign?: any;
  pendingDesigns?: any[];
  activeQuote?: any;
}

export function WorkflowPanel({
  conversationId,
  productId,
  serviceId,
  userRole,
  itemName,
  requiresDesignApproval = false,
  requiresQuote = false,
  conversation,
  approvedDesign,
  pendingDesigns,
  activeQuote: activeQuoteProp,
}: WorkflowPanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [, navigate] = useLocation();
  
  // Fetch active quote to determine workflow visibility
  const { activeQuote: fetchedQuote } = useQuoteState(conversationId, productId, serviceId);
  const activeQuote = activeQuoteProp || fetchedQuote;

  // Load and persist collapsed state per conversation
  useEffect(() => {
    const storageKey = `workflow-panel-collapsed-${conversationId}`;
    const stored = localStorage.getItem(storageKey);
    setIsCollapsed(stored ? JSON.parse(stored) : false);
  }, [conversationId]);

  // Persist collapsed state whenever it changes
  useEffect(() => {
    const storageKey = `workflow-panel-collapsed-${conversationId}`;
    localStorage.setItem(storageKey, JSON.stringify(isCollapsed));
  }, [isCollapsed, conversationId]);

  // Don't render if no workflows
  if (!requiresDesignApproval && !requiresQuote) {
    return null;
  }

  // Determine active workflow based on workflowContexts
  const workflowContexts = conversation?.workflowContexts || [];
  const isQuoteWorkflow = workflowContexts.includes('quote');
  const isProductWorkflow = workflowContexts.includes('product') || workflowContexts.includes('service') || workflowContexts.length === 0;
  
  // Show quote panel if in quote workflow
  const showQuoteStatus = requiresQuote && isQuoteWorkflow;
  
  // Show design panel if:
  // 1. In product workflow (normal case), OR
  // 2. Quote is accepted AND product requires design approval, OR
  // 3. There are pending designs that need seller review
  const quoteIsAccepted = activeQuote?.status === "accepted";
  const hasPendingDesigns = pendingDesigns && pendingDesigns.length > 0;
  const showDesignStatus = requiresDesignApproval && (
    (isProductWorkflow && !isQuoteWorkflow) ||
    (isQuoteWorkflow && quoteIsAccepted) ||
    hasPendingDesigns
  );

  // Get status info for design
  const getDesignStatusInfo = () => {
    if (approvedDesign) {
      return { status: "approved", label: "Design Approved", icon: CheckCircle, variant: "default" as const };
    } else if (hasPendingDesigns) {
      return { status: "pending", label: `${pendingDesigns.length} Design${pendingDesigns.length > 1 ? 's' : ''} Pending`, icon: Clock, variant: "secondary" as const };
    } else {
      return { status: "none", label: "No Design Uploaded", icon: AlertCircle, variant: "outline" as const };
    }
  };

  // Get status info for quote
  const getQuoteStatusInfo = () => {
    if (activeQuote?.status === "accepted") {
      return { status: "accepted", label: "Quote Accepted", icon: CheckCircle, variant: "default" as const };
    } else if (activeQuote?.status === "sent") {
      return { status: "sent", label: "Quote Sent - Awaiting Response", icon: Clock, variant: "secondary" as const };
    } else if (activeQuote?.status === "requested") {
      return { status: "requested", label: "Quote Requested", icon: Clock, variant: "secondary" as const };
    } else {
      return { status: "none", label: "No Quote", icon: AlertCircle, variant: "outline" as const };
    }
  };

  const designInfo = getDesignStatusInfo();
  const quoteInfo = getQuoteStatusInfo();

  // Navigation handlers
  const handleViewDesigns = () => {
    if (userRole === "seller") {
      navigate("/seller/designs");
    } else {
      // Buyer stays in messages - designs are in conversation
    }
  };

  const handleViewQuotes = () => {
    if (userRole === "seller") {
      navigate("/seller/quotes");
    } else {
      // Buyer stays in messages - quotes are in conversation
    }
  };

  // Compact summary for collapsed state
  const renderCompactSummary = () => {
    const items = [];
    
    if (showDesignStatus) {
      items.push(
        <Badge key="design" variant={designInfo.variant} className="gap-1">
          <designInfo.icon className="h-3 w-3" />
          {designInfo.status === "approved" ? "Design ✓" : designInfo.status === "pending" ? `${pendingDesigns?.length} Pending` : "No Design"}
        </Badge>
      );
    }

    if (showQuoteStatus) {
      items.push(
        <Badge key="quote" variant={quoteInfo.variant} className="gap-1">
          <quoteInfo.icon className="h-3 w-3" />
          {quoteInfo.status === "accepted" ? "Quote ✓" : quoteInfo.label}
        </Badge>
      );
    }

    return <div className="flex flex-wrap gap-2">{items}</div>;
  };

  // Status content for expanded view
  const renderStatusContent = () => (
    <div className="space-y-4">
      {showDesignStatus && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <FileImage className="h-4 w-4" />
            Design Approval
          </div>
          <div className="flex items-center justify-between gap-2">
            <Badge variant={designInfo.variant} className="gap-1">
              <designInfo.icon className="h-3 w-3" />
              {designInfo.label}
            </Badge>
            {userRole === "seller" && (designInfo.status === "pending") && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleViewDesigns}
                className="gap-1"
                data-testid="button-view-designs"
              >
                Review
                <ExternalLink className="h-3 w-3" />
              </Button>
            )}
          </div>
          {designInfo.status === "pending" && userRole === "seller" && (
            <p className="text-xs text-muted-foreground">
              Review pending designs in the Designs page
            </p>
          )}
          {designInfo.status === "none" && userRole === "buyer" && (
            <p className="text-xs text-muted-foreground">
              Upload your design as a message attachment
            </p>
          )}
        </div>
      )}

      {showDesignStatus && showQuoteStatus && (
        <div className="border-t pt-3" />
      )}

      {showQuoteStatus && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <FileText className="h-4 w-4" />
            Custom Quote
          </div>
          <div className="flex items-center justify-between gap-2">
            <Badge variant={quoteInfo.variant} className="gap-1">
              <quoteInfo.icon className="h-3 w-3" />
              {quoteInfo.label}
            </Badge>
            {userRole === "seller" && (quoteInfo.status === "requested") && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleViewQuotes}
                className="gap-1"
                data-testid="button-view-quotes"
              >
                Send Quote
                <ExternalLink className="h-3 w-3" />
              </Button>
            )}
          </div>
          {activeQuote?.quotedPrice && (
            <p className="text-sm font-medium">
              Quoted Price: ${parseFloat(activeQuote.quotedPrice).toFixed(2)}
            </p>
          )}
          {quoteInfo.status === "requested" && userRole === "seller" && (
            <p className="text-xs text-muted-foreground">
              Send a quote from the Quotes page
            </p>
          )}
        </div>
      )}
    </div>
  );

  // Desktop sidebar view
  const desktopContent = (
    <Card className="h-full hidden md:flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 gap-1">
        <CardTitle className="text-base font-semibold">Workflow Status</CardTitle>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsCollapsed(!isCollapsed)}
          aria-expanded={!isCollapsed}
          aria-label={isCollapsed ? "Expand workflow panel" : "Collapse workflow panel"}
          data-testid="button-toggle-workflow-panel"
        >
          {isCollapsed ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </Button>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto pb-4">
        {isCollapsed ? renderCompactSummary() : renderStatusContent()}
      </CardContent>
    </Card>
  );

  // Mobile drawer view
  const mobileContent = (
    <div className="md:hidden">
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline" className="w-full gap-2" data-testid="button-open-workflow-mobile">
            <Workflow className="h-4 w-4" />
            Workflow Status
            {renderCompactSummary()}
          </Button>
        </SheetTrigger>
        <SheetContent side="bottom" className="h-[50vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Workflow Status</SheetTitle>
          </SheetHeader>
          <div className="mt-4">
            {renderStatusContent()}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );

  return (
    <>
      {desktopContent}
      {mobileContent}
    </>
  );
}
