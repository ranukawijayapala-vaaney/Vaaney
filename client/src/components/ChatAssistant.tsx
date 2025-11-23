import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { MessageCircle, X, Send, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";
import ReactMarkdown from "react-markdown";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export function ChatAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [location] = useLocation();

  // Get current user for context
  const { data: user } = useQuery<{
    id: string;
    role: "buyer" | "seller" | "admin";
    email: string;
  }>({
    queryKey: ["/api/user"],
  });

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Extract context from current page
  const getPageContext = () => {
    const context: any = {
      currentPage: location,
    };

    // Extract IDs from URL
    const productMatch = location.match(/\/product\/([^\/]+)/);
    const serviceMatch = location.match(/\/book-service\/([^\/]+)/);
    const orderMatch = location.match(/\/orders\/([^\/]+)/);
    const bookingMatch = location.match(/\/bookings\/([^\/]+)/);

    if (productMatch) context.productId = productMatch[1];
    if (serviceMatch) context.serviceId = serviceMatch[1];
    if (orderMatch) context.orderId = orderMatch[1];
    if (bookingMatch) context.bookingId = bookingMatch[1];

    return context;
  };

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      role: "user",
      content: input.trim(),
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const context = getPageContext();
      const response = await apiRequest("/api/chat", "POST", {
        message: userMessage.content,
        sessionId,
        context,
      });

      const assistantMessage: Message = {
        role: "assistant",
        content: response.message,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
      
      if (response.sessionId && !sessionId) {
        setSessionId(response.sessionId);
      }
    } catch (error) {
      console.error("Error sending message:", error);
      const errorMessage: Message = {
        role: "assistant",
        content: "Sorry, I encountered an error. Please try again.",
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!user) return null; // Only show for authenticated users

  return (
    <>
      {/* Floating Chat Button */}
      <Button
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50 hover-elevate active-elevate-2"
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        data-testid="button-chat-assistant"
      >
        {isOpen ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </Button>

      {/* Chat Panel */}
      {isOpen && (
        <Card className="fixed bottom-24 right-6 w-96 h-[600px] shadow-2xl z-50 flex flex-col">
          {/* Header */}
          <div className="p-4 border-b">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-primary" />
              <div>
                <h3 className="font-semibold">Vaaney AI Assistant</h3>
                <p className="text-xs text-muted-foreground">
                  {user.role === "buyer" && "Find products, get help shopping"}
                  {user.role === "seller" && "Business insights & guidance"}
                  {user.role === "admin" && "Platform management support"}
                </p>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && (
              <div className="text-center text-sm text-muted-foreground mt-8">
                <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Hi! I'm your Vaaney AI assistant.</p>
                <p className="mt-2">How can I help you today?</p>
              </div>
            )}
            
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}
                  data-testid={`message-${message.role}-${index}`}
                >
                  {message.role === "assistant" ? (
                    <div className="text-sm prose prose-sm dark:prose-invert max-w-none">
                      <ReactMarkdown
                        components={{
                          a: ({ node, ...props }) => (
                            <a {...props} className="text-primary underline hover:text-primary/80" target="_blank" rel="noopener noreferrer" />
                          ),
                        }}
                      >
                        {message.content}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  )}
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-lg p-3 flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Thinking...</span>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t">
            <div className="flex gap-2">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask me anything..."
                className="resize-none min-h-[60px]"
                disabled={isLoading}
                data-testid="input-chat-message"
              />
              <Button
                onClick={handleSendMessage}
                disabled={!input.trim() || isLoading}
                size="icon"
                className="min-h-[60px]"
                data-testid="button-send-message"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Press Enter to send, Shift+Enter for new line
            </p>
          </div>
        </Card>
      )}
    </>
  );
}
