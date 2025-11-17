import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

/**
 * Hook to manage quote state and operations for a conversation
 */
export function useQuoteState(conversationId: string | undefined, productId?: string, serviceId?: string) {
  const { toast } = useToast();
  
  // Fetch active quote
  const activeQuoteQuery = useQuery({
    queryKey: ["/api/quotes/active", conversationId],
    queryFn: async () => {
      if (!conversationId) return null;
      try {
        const params = new URLSearchParams();
        params.append("conversationId", conversationId);
        if (productId) params.append("productId", productId);
        if (serviceId) params.append("serviceId", serviceId);
        
        return await apiRequest("GET", `/api/quotes/active?${params.toString()}`);
      } catch (error) {
        return null;
      }
    },
    enabled: !!conversationId,
  });
  
  // Create quote mutation (seller)
  const createQuoteMutation = useMutation({
    mutationFn: async (data: { 
      amount: number; 
      quantity: number;
      productVariantId?: string;
      servicePackageId?: string;
      designApprovalId?: string;
      expiresAt?: string; 
      notes?: string;
    }) => {
      if (!conversationId) throw new Error("No conversation ID");
      
      const quote = await apiRequest("POST", "/api/quotes", {
        conversationId,
        productId,
        serviceId,
        productVariantId: data.productVariantId,
        servicePackageId: data.servicePackageId,
        designApprovalId: data.designApprovalId,
        quotedPrice: data.amount, // Backend expects quotedPrice
        quantity: data.quantity,
        expiresAt: data.expiresAt,
        notes: data.notes,
      });
      
      // Post system message about quote
      await apiRequest("POST", `/api/conversations/${conversationId}/messages`, {
        content: `**Quote Sent**\n\nAmount: $${data.amount.toFixed(2)}\nQuantity: ${data.quantity}${data.expiresAt ? `\nExpires: ${new Date(data.expiresAt).toLocaleDateString()}` : ""}${data.notes ? `\n\nNotes: ${data.notes}` : ""}`,
        isSystemMessage: true,
      });
      
      return quote;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quotes/active", conversationId] });
      queryClient.invalidateQueries({ queryKey: ["/api/conversations", conversationId] });
      toast({ title: "Quote sent successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to send quote", description: error.message, variant: "destructive" });
    },
  });
  
  // Accept quote mutation (buyer)
  const acceptQuoteMutation = useMutation({
    mutationFn: async (quoteId: string) => {
      const result = await apiRequest("POST", `/api/quotes/${quoteId}/accept`, {});
      
      // Post system message about acceptance
      if (conversationId) {
        await apiRequest("POST", `/api/conversations/${conversationId}/messages`, {
          content: `**Quote Accepted**\n\nThe buyer has accepted the quote. You can now proceed with the purchase.`,
          isSystemMessage: true,
        });
      }
      
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quotes/active", conversationId] });
      queryClient.invalidateQueries({ queryKey: ["/api/conversations", conversationId] });
      toast({ title: "Quote accepted!" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to accept quote", description: error.message, variant: "destructive" });
    },
  });
  
  // Reject quote mutation (buyer)
  const rejectQuoteMutation = useMutation({
    mutationFn: async ({ quoteId, reason }: { quoteId: string; reason?: string }) => {
      const result = await apiRequest("POST", `/api/quotes/${quoteId}/reject`, { reason });
      
      // Post system message about rejection
      if (conversationId) {
        await apiRequest("POST", `/api/conversations/${conversationId}/messages`, {
          content: `**Quote Rejected**${reason ? `\n\nReason: ${reason}` : ""}`,
          isSystemMessage: true,
        });
      }
      
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quotes/active", conversationId] });
      queryClient.invalidateQueries({ queryKey: ["/api/conversations", conversationId] });
      toast({ title: "Quote rejected" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to reject quote", description: error.message, variant: "destructive" });
    },
  });
  
  return {
    activeQuote: activeQuoteQuery.data,
    isLoading: activeQuoteQuery.isLoading,
    createQuote: createQuoteMutation.mutate,
    isCreating: createQuoteMutation.isPending,
    acceptQuote: acceptQuoteMutation.mutate,
    isAccepting: acceptQuoteMutation.isPending,
    rejectQuote: rejectQuoteMutation.mutate,
    isRejecting: rejectQuoteMutation.isPending,
  };
}
