import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ChevronLeft, ChevronRight, Workflow } from "lucide-react";
import { DesignStatusPanel } from "./DesignStatusPanel";
import { QuoteStatusPanel } from "./QuoteStatusPanel";
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
  onRequestQuote,
  variants,
  packages,
  conversation,
  approvedDesign,
  pendingDesigns,
  activeQuote: activeQuoteProp,
}: WorkflowPanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  
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
  // Workflows are mutually exclusive per conversation EXCEPT when quote is accepted
  const workflowContexts = conversation?.workflowContexts || [];
  const isQuoteWorkflow = workflowContexts.includes('quote');
  const isProductWorkflow = workflowContexts.includes('product') || workflowContexts.includes('service') || workflowContexts.length === 0;
  
  // Show quote panel if in quote workflow
  const showQuotePanel = requiresQuote && isQuoteWorkflow;
  
  // Show design panel if:
  // 1. In product workflow (normal case), OR
  // 2. Quote is accepted AND product requires design approval (buyer needs to upload design for accepted quote)
  const quoteIsAccepted = activeQuote?.status === "accepted";
  const showDesignPanel = requiresDesignApproval && (
    (isProductWorkflow && !isQuoteWorkflow) ||  // Normal product workflow
    (isQuoteWorkflow && quoteIsAccepted)        // Quote accepted, need design upload
  );

  // Compact summary for collapsed state
  const renderCompactSummary = () => {
    const items = [];
    
    if (showDesignPanel) {
      if (approvedDesign) {
        items.push(
          <Badge key="design-approved" variant="default" className="gap-1">
            Design Approved
          </Badge>
        );
      } else if (pendingDesigns && pendingDesigns.length > 0) {
        items.push(
          <Badge key="design-pending" variant="secondary" className="gap-1">
            {pendingDesigns.length} Pending
          </Badge>
        );
      } else {
        items.push(
          <Badge key="design-none" variant="outline" className="gap-1">
            No Design
          </Badge>
        );
      }
    }

    if (showQuotePanel) {
      if (activeQuote?.status === "accepted") {
        items.push(
          <Badge key="quote-accepted" variant="default" className="gap-1">
            Quote Accepted
          </Badge>
        );
      } else if (activeQuote) {
        items.push(
          <Badge key="quote-pending" variant="secondary" className="gap-1">
            Quote {activeQuote.status}
          </Badge>
        );
      } else {
        items.push(
          <Badge key="quote-none" variant="outline" className="gap-1">
            No Quote
          </Badge>
        );
      }
    }

    return <div className="flex flex-wrap gap-2">{items}</div>;
  };

  // Desktop sidebar view
  const desktopContent = (
    <Card className="h-full hidden md:flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-base font-semibold">Workflow</CardTitle>
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
        {isCollapsed ? (
          renderCompactSummary()
        ) : (
          <div className="space-y-6">
            {showQuotePanel && (
              <QuoteStatusPanel
                conversationId={conversationId}
                productId={productId}
                serviceId={serviceId}
                userRole={userRole}
                itemName={itemName}
                variants={variants}
                packages={packages}
                buyerId={conversation?.buyerId}
              />
            )}
            {showQuotePanel && showDesignPanel && (
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">Next Step</span>
                </div>
              </div>
            )}
            {showDesignPanel && (
              <DesignStatusPanel
                conversationId={conversationId}
                productId={productId}
                serviceId={serviceId}
                userRole={userRole}
                itemName={itemName}
                requiresQuote={requiresQuote}
                onRequestQuote={onRequestQuote}
                variants={variants}
                packages={packages}
                conversation={conversation}
              />
            )}
          </div>
        )}
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
            Workflow
            {renderCompactSummary()}
          </Button>
        </SheetTrigger>
        <SheetContent side="bottom" className="h-[80vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Workflow</SheetTitle>
          </SheetHeader>
          <div className="space-y-6 mt-4">
            {showQuotePanel && (
              <QuoteStatusPanel
                conversationId={conversationId}
                productId={productId}
                serviceId={serviceId}
                userRole={userRole}
                itemName={itemName}
                variants={variants}
                packages={packages}
                buyerId={conversation?.buyerId}
              />
            )}
            {showQuotePanel && showDesignPanel && (
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">Next Step</span>
                </div>
              </div>
            )}
            {showDesignPanel && (
              <DesignStatusPanel
                conversationId={conversationId}
                productId={productId}
                serviceId={serviceId}
                userRole={userRole}
                itemName={itemName}
                requiresQuote={requiresQuote}
                onRequestQuote={onRequestQuote}
                variants={variants}
                packages={packages}
                conversation={conversation}
              />
            )}
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
