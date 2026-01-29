import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ConversationList } from "@/components/messaging/ConversationList";
import { MessageThread } from "@/components/messaging/MessageThread";
import { MessageInput } from "@/components/messaging/MessageInput";
import { WorkflowPanel } from "@/components/messaging/WorkflowPanel";
import { MeetingScheduler } from "@/components/messaging/MeetingScheduler";
import { MessageCircle, CheckCircle, Plus, HeadphonesIcon, Store, ArrowLeft } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useConversationContext } from "@/hooks/use-conversation-context";
import { useDesignState } from "@/hooks/use-design-state";
import { useQuoteState } from "@/hooks/use-quote-state";
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

export default function SellerMessages() {
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
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

  // Fetch workflow data for WorkflowPanel
  const {
    approvedDesign,
    pendingDesigns,
  } = useDesignState(
    selectedConversationId || "",
    conversationContext?.conversation.productId,
    conversationContext?.conversation.serviceId
  );

  const {
    activeQuote,
  } = useQuoteState(
    selectedConversationId || "",
    conversationContext?.conversation.productId,
    conversationContext?.conversation.serviceId
  );

  // Auto-select conversation from URL query parameter
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const conversationId = params.get("conversation");
    if (conversationId) {
      // Set the conversation ID directly - the individual conversation query will validate
      setSelectedConversationId(conversationId);
      
      // If the conversation isn't in our list, refresh the list
      const conversationExists = conversations.some(c => c.id === conversationId);
      if (!conversationExists && conversations.length > 0) {
        // Refresh conversations list to include the new/updated conversation
        queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      }
      
      // Clear the conversation parameter from URL
      params.delete("conversation");
      const newSearch = params.toString();
      const newUrl = window.location.pathname + (newSearch ? `?${newSearch}` : '');
      window.history.replaceState({}, '', newUrl);
    }
  }, [conversations, location]);

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

  // Organize conversations by type
  const prePurchaseConversations = conversations.filter((c) => 
    c.type === "pre_purchase_product" || c.type === "pre_purchase_service"
  );
  const generalInquiries = conversations.filter((c) => c.type === "general_inquiry");
  const complaints = conversations.filter((c) => c.type === "complaint");
  const orderConversations = conversations.filter((c) => c.type === "order");
  const bookingConversations = conversations.filter((c) => c.type === "booking");
  const allConversations = conversations;

  const handleCreateConversation = () => {
    if (!subject.trim()) {
      toast({
        title: "Subject required",
        description: "Please provide a subject for your conversation",
        variant: "destructive",
      });
      return;
    }

    createConversationMutation.mutate({
      type: conversationType,
      subject: subject.trim(),
    });
  };

  return (
    <div className="space-y-6">
      <div className={`flex items-center justify-between ${selectedConversationId ? 'hidden xl:flex' : 'flex'}`}>
        <div>
          <h1 className="text-4xl font-bold font-display">Messages & Inquiries</h1>
          <p className="text-muted-foreground mt-2">Respond to buyer inquiries and manage communications</p>
        </div>
        <Button onClick={() => setIsNewConversationDialogOpen(true)} data-testid="button-contact-admin">
          <HeadphonesIcon className="h-4 w-4 mr-2" />
          Contact Admin Support
        </Button>
      </div>

      <div className="flex flex-col xl:grid xl:grid-cols-[320px_1fr_360px] gap-6">
        {/* Conversation List - Left Column */}
        <Card className={`overflow-hidden flex flex-col ${selectedConversationId ? 'hidden xl:flex' : 'flex'}`} style={{ height: "calc(100vh - 220px)" }}>
          <div className="border-b p-4">
            <h3 className="font-semibold">All Conversations</h3>
            <p className="text-xs text-muted-foreground mt-1">{conversations.length} total</p>
          </div>
          <div className="flex-1 overflow-y-auto">
            {conversations.length === 0 ? (
              <div className="p-6 text-center space-y-4">
                <MessageCircle className="h-12 w-12 mx-auto opacity-30" />
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">No messages yet</p>
                  <p className="text-xs text-muted-foreground">
                    Buyer messages will appear here when they contact you
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Need help? Contact admin support above
                  </p>
                </div>
              </div>
            ) : (
              <ConversationList
                conversations={allConversations}
                currentConversationId={selectedConversationId}
                onSelectConversation={setSelectedConversationId}
                currentUserRole="seller"
              />
            )}
          </div>
        </Card>

        {/* Message Thread - Center Column */}
        <div className={`${!selectedConversationId ? 'hidden xl:block' : 'block'}`}>
          <Card className="flex flex-col" style={{ height: "calc(100vh - 220px)" }}>
            {!selectedConversationId ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-8 text-muted-foreground">
                <MessageCircle className="h-16 w-16 mb-4 opacity-50" />
                <p data-testid="text-select-conversation">Select a conversation to view and respond</p>
              </div>
            ) : (
              <>
                {/* Mobile back button header */}
                <div className="xl:hidden border-b p-3 bg-muted/50 flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSelectedConversationId(undefined)}
                    data-testid="button-back-to-conversations"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate">
                      {conversationData?.conversation?.subject || "Conversation"}
                    </h3>
                  </div>
                  {conversationData?.conversation?.status !== "resolved" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => resolveConversationMutation.mutate(selectedConversationId)}
                      disabled={resolveConversationMutation.isPending}
                      data-testid="button-mark-resolved-mobile"
                    >
                      <CheckCircle className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                {/* Desktop resolve button - hidden on mobile */}
                {conversationData?.conversation?.status !== "resolved" && (
                  <div className="hidden xl:flex border-b p-3 bg-muted/50 justify-end">
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
              
              <div className="flex-1 overflow-y-auto" style={{ minHeight: "200px" }}>
                <MessageThread
                  messages={conversationData?.messages || []}
                  currentUserId={user?.id || ""}
                />
              </div>
              
              {/* Message input always visible at bottom */}
              <div className="border-t p-4">
                {conversationData?.conversation?.status === "resolved" || conversationData?.conversation?.status === "archived" ? (
                  <div className="bg-muted p-4 rounded-md text-sm text-muted-foreground text-center">
                    This conversation is {conversationData.conversation.status}. Messages cannot be sent.
                  </div>
                ) : (
                  <MessageInput
                    onSendMessage={handleSendMessage}
                    disabled={sendMessageMutation.isPending}
                    placeholder="Type your response..."
                  />
                )}
              </div>
            </>
          )}
        </Card>
        </div>

        {/* Workflow Panel & Meeting Scheduler - Right Column (Desktop), Drawer (Mobile) */}
        {selectedConversationId && conversationContext && (
          <div className="space-y-4">
            <WorkflowPanel
              conversationId={selectedConversationId}
              requiresDesignApproval={conversationContext.requiresDesignApproval}
              requiresQuote={conversationContext.requiresQuote}
              userRole="seller"
              productId={conversationContext.conversation.productId}
              serviceId={conversationContext.conversation.serviceId}
              itemName={conversationContext.linkedItem?.name}
              variants={conversationContext.variants}
              packages={conversationContext.packages}
              conversation={conversationContext.conversation}
              approvedDesign={approvedDesign}
              pendingDesigns={pendingDesigns}
              activeQuote={activeQuote}
            />
            {user && (
              <MeetingScheduler
                conversationId={selectedConversationId}
                userRole="seller"
                userId={user.id}
              />
            )}
          </div>
        )}
      </div>

      <Dialog open={isNewConversationDialogOpen} onOpenChange={setIsNewConversationDialogOpen}>
        <DialogContent data-testid="dialog-contact-admin">
          <DialogHeader>
            <DialogTitle>Contact Admin Support</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
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

            <div>
              <Label htmlFor="subject">Subject</Label>
              <Textarea
                id="subject"
                placeholder="Brief description of your inquiry"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                rows={2}
                data-testid="input-subject"
              />
            </div>

            <div>
              <Label htmlFor="initial-message">Initial Message (Optional)</Label>
              <Textarea
                id="initial-message"
                placeholder="Describe your inquiry in detail..."
                value={initialMessage}
                onChange={(e) => setInitialMessage(e.target.value)}
                rows={4}
                data-testid="input-initial-message"
              />
            </div>

            <Button
              onClick={handleCreateConversation}
              disabled={createConversationMutation.isPending}
              className="w-full"
              data-testid="button-create-conversation"
            >
              {createConversationMutation.isPending ? "Creating..." : "Start Conversation"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
