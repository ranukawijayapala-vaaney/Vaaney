import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ConversationList } from "@/components/messaging/ConversationList";
import { MessageThread } from "@/components/messaging/MessageThread";
import { MessageInput } from "@/components/messaging/MessageInput";
import { WorkflowPanel } from "@/components/messaging/WorkflowPanel";
import { MessageCircle, Plus, CheckCircle } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useConversationContext } from "@/hooks/use-conversation-context";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Conversation, Message, User } from "@shared/schema";

export default function BuyerMessages() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [selectedConversationId, setSelectedConversationId] = useState<string>();
  const [isNewConversationDialogOpen, setIsNewConversationDialogOpen] = useState(false);
  const [conversationType, setConversationType] = useState<string>("general_inquiry");
  const [subject, setSubject] = useState("");
  const [initialMessage, setInitialMessage] = useState("");

  const { data: user } = useQuery<User>({
    queryKey: ["/api/user"],
  });

  const { data: conversations = [] } = useQuery<Conversation[]>({
    queryKey: ["/api/conversations"],
  });

  // Get conversation context for quote/design requirements
  const { data: conversationContext } = useConversationContext(selectedConversationId);

  const { data: conversationData, refetch: refetchConversation } = useQuery<{
    conversation: Conversation;
    messages: Message[];
  }>({
    queryKey: ["/api/conversations", selectedConversationId],
    enabled: !!selectedConversationId,
  });

  const createConversationMutation = useMutation({
    mutationFn: async (data: { type: string; subject: string }) => {
      const conversation = await apiRequest("POST", "/api/conversations", data);
      return conversation;
    },
    onSuccess: async (conversation: Conversation) => {
      await queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      
      // Send initial message if provided
      if (initialMessage.trim()) {
        await apiRequest("POST", `/api/conversations/${conversation.id}/messages`, {
          content: initialMessage,
        });
        // Invalidate conversation detail query to show the new message
        await queryClient.invalidateQueries({ queryKey: ["/api/conversations", conversation.id] });
      }
      
      setIsNewConversationDialogOpen(false);
      setSelectedConversationId(conversation.id);
      setSubject("");
      setInitialMessage("");
      setConversationType("general_inquiry");
      
      toast({ title: "Conversation started!" });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create conversation",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async ({ content, files }: { content: string; files: File[] }) => {
      // Upload files first if any
      const attachmentUrls: string[] = [];
      
      for (const file of files) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("conversationId", selectedConversationId!);
        
        const response = await fetch("/api/upload-message-attachment", {
          method: "POST",
          body: formData,
        });
        
        if (!response.ok) {
          throw new Error(`Failed to upload file: ${file.name}`);
        }
        
        const { url } = await response.json();
        attachmentUrls.push(url);
      }
      
      // Send message with attachments
      const message = await apiRequest("POST", `/api/conversations/${selectedConversationId}/messages`, {
        content,
        attachments: attachmentUrls.map((url, index) => ({
          url,
          filename: files[index].name,
          mimeType: files[index].type,
          size: files[index].size,
        })),
      });
      
      return message;
    },
    onSuccess: () => {
      refetchConversation();
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to send message",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resolveConversationMutation = useMutation({
    mutationFn: async (conversationId: string) => {
      return await apiRequest("PUT", `/api/conversations/${conversationId}/status`, { status: "resolved" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      refetchConversation();
      toast({ title: "Conversation marked as resolved" });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to resolve conversation",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSendMessage = async (content: string, files: File[]) => {
    await sendMessageMutation.mutateAsync({ content, files });
  };

  // Auto-select conversation from URL query parameter
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const conversationId = urlParams.get('conversation');
    
    if (conversationId && conversations.length > 0) {
      // Verify the conversation exists and belongs to the user
      const conversationExists = conversations.some(c => c.id === conversationId);
      if (conversationExists) {
        setSelectedConversationId(conversationId);
        // Clear only the conversation parameter while preserving other query params
        urlParams.delete('conversation');
        const newSearch = urlParams.toString();
        const newUrl = window.location.pathname + (newSearch ? `?${newSearch}` : '');
        window.history.replaceState({}, '', newUrl);
      }
    }
  }, [conversations]);

  // Mark messages as read when conversation is opened
  useEffect(() => {
    if (selectedConversationId && conversationData) {
      apiRequest("POST", `/api/conversations/${selectedConversationId}/mark-read`, {})
        .then(() => {
          queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
        })
        .catch(() => {
          // Silently fail - not critical
        });
    }
  }, [selectedConversationId, conversationData]);

  const handleCreateConversation = () => {
    if (!subject.trim()) {
      toast({ title: "Please provide a subject", variant: "destructive" });
      return;
    }
    createConversationMutation.mutate({
      type: conversationType,
      subject: subject.trim(),
    });
  };

  const handleNavigateToProduct = () => {
    if (conversationContext?.conversation.productId) {
      setLocation(`/product/${conversationContext.conversation.productId}`);
    } else if (conversationContext?.conversation.serviceId) {
      setLocation(`/book-service/${conversationContext.conversation.serviceId}`);
    }
  };

  // Organize conversations by type
  const generalInquiries = conversations.filter((c) => c.type === "general_inquiry");
  const complaints = conversations.filter((c) => c.type === "complaint");
  const prePurchase = conversations.filter((c) => c.type === "pre_purchase_product" || c.type === "pre_purchase_service");
  const orderConversations = conversations.filter((c) => c.type === "order");
  const bookingConversations = conversations.filter((c) => c.type === "booking");
  const allConversations = conversations;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold font-display">Messages</h1>
          <p className="text-muted-foreground mt-2">Communicate with sellers and support</p>
        </div>
        <Button onClick={() => setIsNewConversationDialogOpen(true)} data-testid="button-new-conversation">
          <Plus className="h-4 w-4 mr-2" />
          New Conversation
        </Button>
      </div>

      <div className="grid md:grid-cols-[320px_1fr_360px] gap-6">
        {/* Conversation List */}
        <Card className="overflow-hidden flex flex-col" style={{ height: "calc(100vh - 140px)" }}>
          <div className="border-b p-4">
            <h3 className="font-semibold">All Conversations</h3>
            <p className="text-xs text-muted-foreground mt-1">{conversations.length} total</p>
          </div>
          <div className="flex-1 overflow-y-auto">
            <ConversationList
              conversations={allConversations}
              currentConversationId={selectedConversationId}
              onSelectConversation={setSelectedConversationId}
              currentUserRole="buyer"
            />
          </div>
        </Card>

        {/* Message Thread */}
        <Card className="flex flex-col" style={{ height: "calc(100vh - 140px)" }}>
          {!selectedConversationId ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-8 text-muted-foreground">
              <MessageCircle className="h-16 w-16 mb-4 opacity-50" />
              <p data-testid="text-select-conversation">Select a conversation or start a new one</p>
            </div>
          ) : (
            <>
              {conversationData?.conversation?.status !== "resolved" && (
                <div className="border-b p-3 bg-muted/50 flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => resolveConversationMutation.mutate(selectedConversationId)}
                    disabled={resolveConversationMutation.isPending}
                    data-testid="button-mark-resolved"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Mark as Resolved
                  </Button>
                </div>
              )}
              
              <div className="flex-1 overflow-y-auto">
                <MessageThread
                  messages={conversationData?.messages || []}
                  currentUserId={user?.id || ""}
                />
              </div>
              
              <div className="border-t p-4">
                {conversationData?.conversation?.status === "resolved" || conversationData?.conversation?.status === "archived" ? (
                  <div className="bg-muted p-4 rounded-md text-sm text-muted-foreground text-center">
                    This conversation is {conversationData.conversation.status}. Messages cannot be sent.
                  </div>
                ) : (
                  <MessageInput
                    onSendMessage={handleSendMessage}
                    disabled={sendMessageMutation.isPending}
                  />
                )}
              </div>
            </>
          )}
        </Card>

        {/* Workflow Panel - Desktop sidebar, Mobile drawer */}
        {selectedConversationId && conversationContext && (
          <WorkflowPanel
            conversationId={selectedConversationId}
            productId={conversationContext.conversation.productId}
            serviceId={conversationContext.conversation.serviceId}
            userRole="buyer"
            itemName={conversationContext.linkedItem?.name}
            requiresDesignApproval={conversationContext.requiresDesignApproval}
            requiresQuote={conversationContext.requiresQuote}
            onRequestQuote={handleNavigateToProduct}
            variants={conversationContext.variants}
            packages={conversationContext.packages}
            conversation={conversationContext.conversation}
          />
        )}
      </div>

      <Dialog open={isNewConversationDialogOpen} onOpenChange={setIsNewConversationDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Conversation</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="conversation-type">Type</Label>
              <Select value={conversationType} onValueChange={setConversationType}>
                <SelectTrigger id="conversation-type" data-testid="select-conversation-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general_inquiry">General Inquiry</SelectItem>
                  <SelectItem value="complaint">Complaint</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <input
                id="subject"
                type="text"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Brief description of your inquiry"
                data-testid="input-subject"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Initial Message (Optional)</Label>
              <Textarea
                id="message"
                value={initialMessage}
                onChange={(e) => setInitialMessage(e.target.value)}
                placeholder="Describe your inquiry in detail..."
                rows={4}
                data-testid="textarea-initial-message"
              />
            </div>

            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setIsNewConversationDialogOpen(false)}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateConversation}
                disabled={createConversationMutation.isPending}
                data-testid="button-start-conversation"
              >
                {createConversationMutation.isPending ? "Creating..." : "Start Conversation"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
