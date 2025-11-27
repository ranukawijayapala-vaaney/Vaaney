import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Package, Briefcase, ExternalLink, Layers } from "lucide-react";

interface ConversationHeaderProps {
  itemName?: string;
  itemType?: "product" | "service" | null;
  variantName?: string;
  packageName?: string;
  productId?: string;
  serviceId?: string;
  workflowContexts?: string[];
}

export function ConversationHeader({
  itemName,
  itemType,
  variantName,
  packageName,
  productId,
  serviceId,
  workflowContexts = [],
}: ConversationHeaderProps) {
  if (!itemName) return null;

  const isQuoteWorkflow = workflowContexts.includes("quote");
  const viewLink = itemType === "product" && productId
    ? `/product/${productId}`
    : itemType === "service" && serviceId
      ? `/book-service/${serviceId}`
      : null;

  return (
    <div className="p-3 border-b bg-muted/30 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {itemType === "product" && (
          <Badge variant="outline" className="gap-1">
            <Package className="h-3 w-3" />
            Product
          </Badge>
        )}
        {itemType === "service" && (
          <Badge variant="outline" className="gap-1">
            <Briefcase className="h-3 w-3" />
            Service
          </Badge>
        )}
        {isQuoteWorkflow && (
          <Badge variant="secondary" className="gap-1">
            <Layers className="h-3 w-3" />
            Custom Quote
          </Badge>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="space-y-1">
          <h3 className="font-semibold text-sm" data-testid="text-item-name">
            {itemName}
          </h3>
          {(variantName || packageName) && (
            <p className="text-xs text-muted-foreground" data-testid="text-variant-package">
              {variantName && `Variant: ${variantName}`}
              {packageName && `Package: ${packageName}`}
            </p>
          )}
        </div>

        {viewLink && (
          <Button
            variant="outline"
            size="sm"
            asChild
            className="gap-1"
            data-testid="button-view-item"
          >
            <Link href={viewLink}>
              View {itemType === "product" ? "Product" : "Service"}
              <ExternalLink className="h-3 w-3" />
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}
