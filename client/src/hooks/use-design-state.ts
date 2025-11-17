import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

/**
 * Hook to manage design approval state and operations for a conversation
 */
export function useDesignState(conversationId: string | undefined, productId?: string, serviceId?: string) {
  const { toast } = useToast();
  
  // Fetch approved design
  const approvedDesignQuery = useQuery({
    queryKey: ["/api/design-approvals/approved", conversationId],
    queryFn: async () => {
      if (!conversationId) return null;
      try {
        const params = new URLSearchParams();
        params.append("conversationId", conversationId);
        if (productId) params.append("productId", productId);
        if (serviceId) params.append("serviceId", serviceId);
        
        return await apiRequest("GET", `/api/design-approvals/approved?${params.toString()}`);
      } catch (error) {
        return null;
      }
    },
    enabled: !!conversationId,
  });
  
  // Fetch pending design approvals (for sellers and to check buyer's latest submission)
  const pendingDesignsQuery = useQuery({
    queryKey: ["/api/design-approvals/pending", conversationId],
    queryFn: async () => {
      if (!conversationId) return [];
      try {
        const params = new URLSearchParams();
        params.append("conversationId", conversationId);
        
        const result: any = await apiRequest("GET", `/api/design-approvals?${params.toString()}`);
        const pending = Array.isArray(result) 
          ? result.filter((d: any) => d.status === "pending") 
          : [];
        // Sort by createdAt descending to get most recent first
        return pending.sort((a: any, b: any) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      } catch (error) {
        return [];
      }
    },
    enabled: !!conversationId,
  });
  
  // Fetch designs with changes requested (for buyers)
  const changesRequestedQuery = useQuery({
    queryKey: ["/api/design-approvals/changes-requested", conversationId],
    queryFn: async () => {
      if (!conversationId) return null;
      try {
        const params = new URLSearchParams();
        params.append("conversationId", conversationId);
        
        const result: any = await apiRequest("GET", `/api/design-approvals?${params.toString()}`);
        const changesRequested = Array.isArray(result) 
          ? result.filter((d: any) => d.status === "changes_requested") 
          : [];
        // Sort by createdAt descending to get the most recent one
        const sorted = changesRequested.sort((a: any, b: any) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        return sorted.length > 0 ? sorted[0] : null;
      } catch (error) {
        return null;
      }
    },
    enabled: !!conversationId,
  });
  
  // Upload design mutation (buyer)
  const uploadDesignMutation = useMutation({
    mutationFn: async (params: { 
      designFile: { url: string; filename: string; size: number; mimeType: string };
      context?: "product" | "quote";
      variantId?: string;
      packageId?: string;
    }) => {
      if (!conversationId) throw new Error("No conversation ID");
      
      const { designFile, context = "product", variantId, packageId } = params;
      
      const designApproval = await apiRequest("POST", "/api/design-approvals", {
        conversationId,
        productId,
        serviceId,
        context,
        variantId,
        packageId,
        designFiles: [designFile], // Send as array to match schema
      });
      
      // Post system message about design upload
      const contextMessage = context === "quote" 
        ? "**Design Submitted for Quote Request**\n\nThe buyer has uploaded a design file for a custom quote. Please review and approve."
        : "**Design Submitted for Approval**\n\nThe buyer has uploaded a design file. Please review and approve.";
      
      await apiRequest("POST", `/api/conversations/${conversationId}/messages`, {
        content: contextMessage,
        isSystemMessage: true,
      });
      
      return designApproval;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/design-approvals/pending", conversationId] });
      queryClient.invalidateQueries({ queryKey: ["/api/design-approvals/changes-requested", conversationId] });
      queryClient.invalidateQueries({ queryKey: ["/api/conversations", conversationId] });
      toast({ title: "Design submitted for approval" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to upload design", description: error.message, variant: "destructive" });
    },
  });
  
  // Approve design mutation (seller)
  const approveDesignMutation = useMutation({
    mutationFn: async (designApprovalId: string) => {
      const result = await apiRequest("POST", `/api/design-approvals/${designApprovalId}/approve`, {});
      
      // Post system message about approval
      if (conversationId) {
        await apiRequest("POST", `/api/conversations/${conversationId}/messages`, {
          content: `**Design Approved**\n\nThe seller has approved your design. You can now proceed with the purchase.`,
          isSystemMessage: true,
        });
      }
      
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/design-approvals/approved", conversationId] });
      queryClient.invalidateQueries({ queryKey: ["/api/design-approvals/pending", conversationId] });
      queryClient.invalidateQueries({ queryKey: ["/api/conversations", conversationId] });
      
      // Also invalidate ProductDetail/ServiceBooking page queries
      if (productId) {
        queryClient.invalidateQueries({ queryKey: ["/api/design-approvals/approved", productId] });
      }
      if (serviceId) {
        queryClient.invalidateQueries({ queryKey: ["/api/design-approvals/approved", serviceId] });
      }
      
      toast({ title: "Design approved!" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to approve design", description: error.message, variant: "destructive" });
    },
  });
  
  // Reject design mutation (seller)
  const rejectDesignMutation = useMutation({
    mutationFn: async ({ designApprovalId, reason }: { designApprovalId: string; reason?: string }) => {
      const result = await apiRequest("POST", `/api/design-approvals/${designApprovalId}/reject`, { reason });
      
      // Post system message about rejection
      if (conversationId) {
        await apiRequest("POST", `/api/conversations/${conversationId}/messages`, {
          content: `**Design Rejected**${reason ? `\n\nReason: ${reason}` : ""}`,
          isSystemMessage: true,
        });
      }
      
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/design-approvals/pending", conversationId] });
      queryClient.invalidateQueries({ queryKey: ["/api/conversations", conversationId] });
      toast({ title: "Design rejected" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to reject design", description: error.message, variant: "destructive" });
    },
  });
  
  // Request changes to design mutation (seller)
  const requestChangesMutation = useMutation({
    mutationFn: async ({ designApprovalId, notes }: { designApprovalId: string; notes: string }) => {
      const result = await apiRequest("POST", `/api/design-approvals/${designApprovalId}/request-changes`, { notes });
      
      // Post system message about requested changes
      if (conversationId) {
        await apiRequest("POST", `/api/conversations/${conversationId}/messages`, {
          content: `**Changes Requested**\n\n${notes}`,
          isSystemMessage: true,
        });
      }
      
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/design-approvals/pending", conversationId] });
      queryClient.invalidateQueries({ queryKey: ["/api/design-approvals/changes-requested", conversationId] });
      queryClient.invalidateQueries({ queryKey: ["/api/conversations", conversationId] });
      toast({ title: "Changes requested" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to request changes", description: error.message, variant: "destructive" });
    },
  });
  
  // For buyers: show changes_requested only if there's no newer pending submission
  const pendingDesignsArray = pendingDesignsQuery.data || [];
  const newestPending = pendingDesignsArray.length > 0 ? pendingDesignsArray[0] : null;
  const changesRequested = changesRequestedQuery.data;
  
  // Only show changes_requested if there's no newer pending design
  const effectiveChangesRequested = (changesRequested && newestPending) 
    ? (new Date(changesRequested.createdAt).getTime() > new Date(newestPending.createdAt).getTime() ? changesRequested : null)
    : changesRequested;
  
  return {
    approvedDesign: approvedDesignQuery.data,
    pendingDesigns: pendingDesignsArray,
    pendingDesign: newestPending,
    changesRequestedDesign: effectiveChangesRequested,
    isLoading: approvedDesignQuery.isLoading || pendingDesignsQuery.isLoading || changesRequestedQuery.isLoading,
    uploadDesign: uploadDesignMutation.mutate,
    isUploading: uploadDesignMutation.isPending,
    approveDesign: approveDesignMutation.mutate,
    isApproving: approveDesignMutation.isPending,
    rejectDesign: rejectDesignMutation.mutate,
    isRejecting: rejectDesignMutation.isPending,
    requestChanges: requestChangesMutation.mutate,
    isRequestingChanges: requestChangesMutation.isPending,
  };
}
