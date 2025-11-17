import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

/**
 * Hook to fetch conversation context including linked product/service requirements
 */
export function useConversationContext(conversationId: string | undefined) {
  return useQuery({
    queryKey: ["/api/conversations", conversationId, "context"],
    queryFn: async () => {
      if (!conversationId) return null;
      
      const data: any = await apiRequest("GET", `/api/conversations/${conversationId}`);
      const conversation = data.conversation;
      
      // Fetch product/service details if it's a pre-purchase conversation
      if (conversation.type === "pre_purchase_product" && conversation.productId) {
        const product = await apiRequest("GET", `/api/products/${conversation.productId}`);
        return {
          conversation,
          linkedItem: product,
          itemType: "product" as const,
          requiresQuote: product.requiresQuote || false,
          requiresDesignApproval: product.requiresDesignApproval || false,
          variants: product.variants || [],
        };
      } else if (conversation.type === "pre_purchase_service" && conversation.serviceId) {
        const service = await apiRequest("GET", `/api/services/${conversation.serviceId}`);
        return {
          conversation,
          linkedItem: service,
          itemType: "service" as const,
          requiresQuote: service.requiresQuote || false,
          requiresDesignApproval: service.requiresDesignApproval || false,
          packages: service.packages || [],
        };
      }
      
      return {
        conversation,
        linkedItem: null,
        itemType: null,
        requiresQuote: false,
        requiresDesignApproval: false,
      };
    },
    enabled: !!conversationId,
  });
}
