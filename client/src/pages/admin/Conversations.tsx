import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ConversationList } from "@/components/messaging/ConversationList";
import { MessageThread } from "@/components/messaging/MessageThread";
import { MessageInput } from "@/components/messaging/MessageInput";
import { MessageCircle, Settings, CheckCircle, Archive } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Conversation, Message, User, AdminMessageTemplate } from "@shared/schema";

export default function AdminConversations() {
  const { toast } = useToast();
  const [selectedConversationId, setSelectedConversationId] = useState<string>();
  const [filterType, setFilterType] = useState<string>("all");
  const [isTemplatesDialogOpen, setIsTemplatesDialogOpen] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState("");
  const [newTemplateCategory, setNewTemplateCategory] = useState("general");
  const [newTemplateContent, setNewTemplateContent] = useState("");

  const { data: user } = useQuery<User>({
    queryKey: ["/api/user"],
  });

  const { data: conversations = [] } = useQuery<Conversation[]>({
    queryKey: ["/api/conversations"],
  });

  const { data: conversationData, refetch: refetchConversation } = useQuery<{
    conversation: Conversation;
    messages: Message[];
  }>({
    queryKey: ["/api/conversations", selectedConversationId],
    enabled: !!selectedConversationId,
  });

  const { data: templates = [] } = useQuery<AdminMessageTemplate[]>({
    queryKey: ["/api/admin/message-templates"],
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

  const updateStatusMutation = useMutation({
    mutationFn: async ({ conversationId, status }: { conversationId: string; status: string }) => {
      return await apiRequest("PUT", `/api/conversations/${conversationId}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      refetchConversation();
      toast({ title: "Status updated successfully" });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update status",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const createTemplateMutation = useMutation({
    mutationFn: async (data: { name: string; category: string; content: string }) => {
      return await apiRequest("POST", "/api/admin/message-templates", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/message-templates"] });
      setNewTemplateName("");
      setNewTemplateCategory("general");
      setNewTemplateContent("");
      toast({ title: "Template created successfully" });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create template",
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

  const handleResolveConversation = () => {
    if (selectedConversationId) {
      updateStatusMutation.mutate({ conversationId: selectedConversationId, status: "resolved" });
    }
  };

  const handleArchiveConversation = () => {
    if (selectedConversationId) {
      updateStatusMutation.mutate({ conversationId: selectedConversationId, status: "archived" });
    }
  };

  const handleUseTemplate = (template: AdminMessageTemplate) => {
    handleSendMessage(template.content, []);
  };

  const handleCreateTemplate = () => {
    if (!newTemplateName.trim() || !newTemplateContent.trim()) {
      toast({ title: "Please fill in all fields", variant: "destructive" });
      return;
    }
    createTemplateMutation.mutate({
      name: newTemplateName,
      category: newTemplateCategory,
      content: newTemplateContent,
    });
  };

  // Filter conversations
  const filteredConversations = filterType === "all" 
    ? conversations 
    : conversations.filter((c) => c.type === filterType);

  const activeConversations = filteredConversations.filter((c) => c.status === "active");
  const resolvedConversations = filteredConversations.filter((c) => c.status === "resolved");
  const archivedConversations = filteredConversations.filter((c) => c.status === "archived");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold font-display">All Conversations</h1>
          <p className="text-muted-foreground mt-2">Monitor and manage all platform communications</p>
        </div>
        <Dialog open={isTemplatesDialogOpen} onOpenChange={setIsTemplatesDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" data-testid="button-manage-templates">
              <Settings className="h-4 w-4 mr-2" />
              Message Templates
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Message Templates</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="border rounded-lg p-4 space-y-3">
                <h3 className="font-medium">Create New Template</h3>
                
                <div className="space-y-2">
                  <Label>Template Name</Label>
                  <input
                    type="text"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={newTemplateName}
                    onChange={(e) => setNewTemplateName(e.target.value)}
                    placeholder="e.g., Welcome Message"
                    data-testid="input-template-name"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={newTemplateCategory} onValueChange={setNewTemplateCategory}>
                    <SelectTrigger data-testid="select-template-category">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General</SelectItem>
                      <SelectItem value="complaint">Complaint</SelectItem>
                      <SelectItem value="return">Return/Refund</SelectItem>
                      <SelectItem value="support">Support</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Template Content</Label>
                  <Textarea
                    value={newTemplateContent}
                    onChange={(e) => setNewTemplateContent(e.target.value)}
                    placeholder="Type your template message..."
                    rows={4}
                    data-testid="textarea-template-content"
                  />
                </div>

                <Button 
                  onClick={handleCreateTemplate}
                  disabled={createTemplateMutation.isPending}
                  data-testid="button-create-template"
                >
                  {createTemplateMutation.isPending ? "Creating..." : "Create Template"}
                </Button>
              </div>

              <div className="space-y-2">
                <h3 className="font-medium">Existing Templates</h3>
                {templates.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No templates yet</p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {templates.map((template) => (
                      <Card key={template.id} className="p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <p className="font-medium text-sm">{template.name}</p>
                            <p className="text-xs text-muted-foreground mt-1">{template.category}</p>
                            <p className="text-sm mt-2 line-clamp-2">{template.content}</p>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-4">
        <Label className="text-sm font-medium">Filter by Type:</Label>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[250px]" data-testid="select-filter-type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="pre_purchase_product">Pre-Purchase (Product)</SelectItem>
            <SelectItem value="pre_purchase_service">Pre-Purchase (Service)</SelectItem>
            <SelectItem value="general_inquiry">General Inquiry</SelectItem>
            <SelectItem value="complaint">Complaint</SelectItem>
            <SelectItem value="order">Order</SelectItem>
            <SelectItem value="booking">Booking</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid md:grid-cols-[320px_1fr] gap-6">
        <Card className="overflow-hidden flex flex-col" style={{ height: "calc(100vh - 200px)" }}>
          <div className="border-b p-4">
            <h3 className="font-semibold">All Conversations</h3>
            <p className="text-xs text-muted-foreground mt-1">{filteredConversations.length} total</p>
          </div>
          <div className="flex-1 overflow-y-auto">
            <ConversationList
              conversations={filteredConversations}
              currentConversationId={selectedConversationId}
              onSelectConversation={setSelectedConversationId}
              currentUserRole="admin"
            />
          </div>
        </Card>

        <Card className="flex flex-col" style={{ height: "calc(100vh - 200px)" }}>
          {!selectedConversationId ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-8 text-muted-foreground">
              <MessageCircle className="h-16 w-16 mb-4 opacity-50" />
              <p data-testid="text-select-conversation">Select a conversation to view and intervene</p>
            </div>
          ) : (
            <>
              <div className="border-b p-4 flex items-center justify-between bg-muted/50">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Conversation Actions:</span>
                </div>
                <div className="flex gap-2">
                  {templates.length > 0 && (
                    <Select onValueChange={(templateId) => {
                      const template = templates.find(t => t.id === templateId);
                      if (template) handleUseTemplate(template);
                    }}>
                      <SelectTrigger className="w-[200px]" data-testid="select-quick-reply">
                        <SelectValue placeholder="Quick Reply" />
                      </SelectTrigger>
                      <SelectContent>
                        {templates.map((template) => (
                          <SelectItem key={template.id} value={template.id}>
                            {template.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {conversationData?.conversation?.status !== "resolved" && conversationData?.conversation?.status !== "archived" && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={handleResolveConversation}
                      disabled={updateStatusMutation.isPending}
                      data-testid="button-mark-resolved"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Mark Resolved
                    </Button>
                  )}
                  {conversationData?.conversation?.status !== "archived" && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={handleArchiveConversation}
                      disabled={updateStatusMutation.isPending}
                      data-testid="button-archive"
                    >
                      <Archive className="h-4 w-4 mr-2" />
                      Archive
                    </Button>
                  )}
                </div>
              </div>

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
                    placeholder="Type your message as admin..."
                  />
                )}
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
