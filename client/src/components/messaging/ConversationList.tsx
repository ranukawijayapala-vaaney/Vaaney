import { format, formatDistanceToNow } from "date-fns";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MessageCircle, Package, ShoppingBag, AlertCircle, FileCheck, DollarSign, Calendar } from "lucide-react";
import type { Conversation } from "@shared/schema";

interface ConversationWithDetails extends Conversation {
  buyer?: {
    id: string;
    firstName?: string | null;
    lastName?: string | null;
    profileImageUrl?: string | null;
  };
  seller?: {
    id: string;
    firstName?: string | null;
    lastName?: string | null;
    profileImageUrl?: string | null;
  };
  product?: {
    id: string;
    name: string;
  };
  service?: {
    id: string;
    name: string;
  };
  unreadCount?: number;
  contextSummaries?: Array<{kind: string, label: string}>;
}

interface ConversationListProps {
  conversations: ConversationWithDetails[];
  currentConversationId?: string;
  onSelectConversation: (conversationId: string) => void;
  currentUserRole: "buyer" | "seller" | "admin";
}

const conversationTypeLabels: Record<string, string> = {
  pre_purchase_product: "Pre-Purchase (Product)",
  pre_purchase_service: "Pre-Purchase (Service)",
  general_inquiry: "General Inquiry",
  complaint: "Complaint",
  order: "Order",
  booking: "Booking",
};

const conversationTypeIcons: Record<string, any> = {
  pre_purchase_product: Package,
  pre_purchase_service: ShoppingBag,
  general_inquiry: MessageCircle,
  complaint: AlertCircle,
  order: Package,
  booking: ShoppingBag,
};

export function ConversationList({
  conversations,
  currentConversationId,
  onSelectConversation,
  currentUserRole,
}: ConversationListProps) {
  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center text-muted-foreground">
        <MessageCircle className="h-12 w-12 mb-4 opacity-50" />
        <p data-testid="text-no-conversations">No conversations yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-2 p-4" data-testid="container-conversation-list">
      {conversations.map((conversation) => {
        const Icon = conversationTypeIcons[conversation.type] || MessageCircle;
        const isActive = conversation.id === currentConversationId;
        
        // Determine who to display based on current user's role
        let otherParty: ConversationWithDetails["buyer"] | ConversationWithDetails["seller"] | undefined;
        if (currentUserRole === "buyer") {
          otherParty = conversation.seller;
        } else if (currentUserRole === "seller") {
          otherParty = conversation.buyer;
        } else if (currentUserRole === "admin") {
          // For admin, show buyer if exists, otherwise show seller
          otherParty = conversation.buyer || conversation.seller;
        }
        
        const otherPartyName = otherParty
          ? `${otherParty.firstName || ""} ${otherParty.lastName || ""}`.trim() || "Unknown User"
          : "Admin";

        const otherPartyInitials = otherPartyName
          .split(" ")
          .map((n) => n[0])
          .join("")
          .toUpperCase()
          .slice(0, 2);

        const relatedItemName = conversation.product?.name || conversation.service?.name || conversation.subject;

        return (
          <Card
            key={conversation.id}
            className={`p-4 cursor-pointer transition-colors hover-elevate ${
              isActive ? "bg-accent border-primary" : ""
            }`}
            onClick={() => onSelectConversation(conversation.id)}
            data-testid={`conversation-${conversation.id}`}
          >
            <div className="flex gap-3">
              <Avatar className="h-10 w-10 flex-shrink-0">
                <AvatarImage src={otherParty?.profileImageUrl || undefined} />
                <AvatarFallback>{otherPartyInitials}</AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm truncate" data-testid={`text-party-${conversation.id}`}>
                      {otherPartyName}
                    </h4>
                    <p className="text-xs text-muted-foreground truncate" data-testid={`text-subject-${conversation.id}`}>
                      {relatedItemName}
                    </p>
                  </div>
                  {conversation.unreadCount && conversation.unreadCount > 0 && (
                    <Badge variant="default" className="flex-shrink-0" data-testid={`badge-unread-${conversation.id}`}>
                      {conversation.unreadCount}
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="text-xs flex items-center gap-1">
                    <Icon className="h-3 w-3" />
                    {conversationTypeLabels[conversation.type]}
                  </Badge>
                  <Badge
                    variant={conversation.status === "active" ? "default" : "secondary"}
                    className="text-xs"
                  >
                    {conversation.status}
                  </Badge>
                  {conversation.contextSummaries && conversation.contextSummaries.map((context, idx) => {
                    const contextIcon = 
                      context.kind === "order" ? Package :
                      context.kind === "booking" ? Calendar :
                      context.kind === "design_approval" ? FileCheck :
                      context.kind === "custom_quote" ? DollarSign :
                      MessageCircle;
                    const ContextIcon = contextIcon;
                    
                    return (
                      <Badge 
                        key={`${conversation.id}-context-${idx}`}
                        variant="secondary" 
                        className="text-xs flex items-center gap-1"
                        data-testid={`badge-context-${context.kind}-${conversation.id}`}
                      >
                        <ContextIcon className="h-3 w-3" />
                        {context.label}
                      </Badge>
                    );
                  })}
                  <span className="text-xs text-muted-foreground ml-auto" data-testid={`text-time-${conversation.id}`}>
                    {formatDistanceToNow(new Date(conversation.lastMessageAt), { addSuffix: true })}
                  </span>
                </div>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
