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
  const [sessionId, setSessionId] = useState<string | null>(() => {
    // Load sessionId from localStorage on mount
    return localStorage.getItem('chatSessionId');
  });
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

  // Save sessionId to localStorage whenever it changes
  useEffect(() => {
    if (sessionId) {
      localStorage.setItem('chatSessionId', sessionId);
    }
  }, [sessionId]);

  // Load chat history when opening the assistant and sessionId exists
  useEffect(() => {
    if (isOpen && sessionId && messages.length === 0) {
      const loadHistory = async () => {
        try {
          const response = await fetch(`/api/chat/history/${sessionId}`, {
            credentials: 'include',
          });
          if (response.ok) {
            const data = await response.json();
            if (data.messages && Array.isArray(data.messages)) {
              setMessages(data.messages);
            }
          }
        } catch (error) {
          console.error("Error loading chat history:", error);
        }
      };
      loadHistory();
    }
  }, [isOpen, sessionId]);

  // Extract context from current page - expanded to cover all routes
  const getPageContext = () => {
    const context: any = {
      currentPage: location,
    };

    // Extract IDs from URL patterns
    const patterns = [
      { regex: /\/product\/([^/?]+)/, key: 'productId' },
      { regex: /\/book-service\/([^/?]+)/, key: 'serviceId' },
      { regex: /\/orders\/([^/?]+)/, key: 'orderId' },
      { regex: /\/bookings\/([^/?]+)/, key: 'bookingId' },
      { regex: /\/seller\/products\/([^/?]+)/, key: 'productId' },
      { regex: /\/seller\/services\/([^/?]+)/, key: 'serviceId' },
      { regex: /\/admin\/orders\/([^/?]+)/, key: 'orderId' },
      { regex: /\/admin\/bookings\/([^/?]+)/, key: 'bookingId' },
    ];

    for (const pattern of patterns) {
      const match = location.match(pattern.regex);
      if (match) {
        context[pattern.key] = match[1];
      }
    }

    // Add friendly page names for better context
    if (location === '/') context.currentPage = 'Landing Page';
    else if (location === '/marketplace') context.currentPage = 'Marketplace';
    else if (location === '/cart') context.currentPage = 'Shopping Cart';
    else if (location === '/checkout') context.currentPage = 'Checkout';
    else if (location.startsWith('/product/')) context.currentPage = 'Product Detail';
    else if (location.startsWith('/book-service/')) context.currentPage = 'Service Booking';
    else if (location.startsWith('/orders')) context.currentPage = 'Order History';
    else if (location.startsWith('/service-history')) context.currentPage = 'Service History';
    else if (location.startsWith('/design-approvals')) context.currentPage = 'Design Approvals';
    else if (location.startsWith('/custom-quotes')) context.currentPage = 'Custom Quotes';
    else if (location.startsWith('/design-library')) context.currentPage = 'Design Library';
    else if (location.startsWith('/messages')) context.currentPage = 'Messages';
    else if (location.startsWith('/profile')) context.currentPage = 'Profile';
    else if (location.startsWith('/seller/dashboard')) context.currentPage = 'Seller Dashboard';
    else if (location.startsWith('/seller/products')) context.currentPage = 'Seller Products';
    else if (location.startsWith('/seller/services')) context.currentPage = 'Seller Services';
    else if (location.startsWith('/seller/orders')) context.currentPage = 'Seller Orders';
    else if (location.startsWith('/seller/bookings')) context.currentPage = 'Seller Bookings';
    else if (location.startsWith('/seller/payouts')) context.currentPage = 'Seller Payouts';
    else if (location.startsWith('/seller/boost')) context.currentPage = 'Seller Boost';
    else if (location.startsWith('/seller/messages')) context.currentPage = 'Seller Messages';
    else if (location.startsWith('/seller/returns')) context.currentPage = 'Seller Returns';
    else if (location.startsWith('/seller/quotes')) context.currentPage = 'Seller Quotes';
    else if (location.startsWith('/seller/designs')) context.currentPage = 'Seller Designs';
    else if (location.startsWith('/admin/dashboard')) context.currentPage = 'Admin Dashboard';
    else if (location.startsWith('/admin/users')) context.currentPage = 'Admin Users';
    else if (location.startsWith('/admin/verifications')) context.currentPage = 'Admin Verifications';
    else if (location.startsWith('/admin/transactions')) context.currentPage = 'Admin Transactions';
    else if (location.startsWith('/admin/shipping')) context.currentPage = 'Admin Shipping';
    else if (location.startsWith('/admin/returns')) context.currentPage = 'Admin Returns';
    else if (location.startsWith('/admin/conversations')) context.currentPage = 'Admin Conversations';

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
      const response = await apiRequest("POST", "/api/chat", {
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
    } catch (error: any) {
      console.error("Error sending message:", error);
      const errorMessage: Message = {
        role: "assistant",
        content: error.message || "Sorry, I encountered an error. Please try again.",
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
      {/* Floating Chat Button - Large and Prominent with Vaaney Lime Green */}
      {/* Mobile: Above bottom nav (84px). Desktop: Bottom right corner (24px) */}
      <Button
        className="bottom-[84px] right-4 xl:bottom-6 xl:right-6 h-[70px] w-[70px] rounded-full shadow-2xl bg-[#bcd42f] hover:bg-[#a8bf2a] text-[#222326] border-2 border-[#a8bf2a] animate-pulse-slow z-30"
        style={{ position: 'fixed' }}
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        data-testid="button-chat-assistant"
      >
        {isOpen ? <X className="h-7 w-7" /> : <MessageCircle className="h-7 w-7" />}
      </Button>

      {/* Chat Panel - Mobile responsive */}
      {/* Mobile: Full width with margins, above button. Desktop: Fixed width (384px), above button */}
      {isOpen && (
        <Card 
          className="bottom-[170px] left-4 right-4 xl:bottom-[110px] xl:left-auto xl:right-6 xl:w-96 max-h-[calc(100vh-270px)] xl:max-h-[calc(100vh-180px)] shadow-2xl flex flex-col z-30"
          style={{ position: 'fixed' }}
        >
          {/* Header - Improved visibility with darker text */}
          <div className="p-4 border-b bg-gradient-to-r from-[#217588]/5 to-transparent">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-[#217588]" />
              <div>
                <h3 className="font-bold text-[#222326] text-base">Vaaney AI Assistant</h3>
                <p className="text-xs text-foreground/70">
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
              <div className="text-center text-sm text-foreground mt-8">
                <MessageCircle className="h-12 w-12 mx-auto mb-4 text-[#217588]/60" />
                <p className="font-medium text-[#222326]">Hi! I'm your Vaaney AI assistant.</p>
                <p className="mt-2 text-foreground/80">How can I help you today?</p>
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
                      : "bg-muted text-foreground"
                  }`}
                  data-testid={`message-${message.role}-${index}`}
                >
                  {message.role === "assistant" ? (
                    <div className="text-sm prose prose-sm dark:prose-invert max-w-none [&>*]:text-foreground">
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

          {/* Input - Vaaney brand colors */}
          <div className="p-4 border-t">
            <div className="flex gap-2">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask me anything..."
                className="resize-none min-h-[60px] placeholder:text-foreground/50 focus:border-[#217588] focus:ring-[#217588]"
                disabled={isLoading}
                data-testid="input-chat-message"
              />
              <Button
                onClick={handleSendMessage}
                disabled={!input.trim() || isLoading}
                size="icon"
                className="min-h-[60px] bg-[#bcd42f] hover:bg-[#a8bf2a] text-[#222326] border border-[#a8bf2a]"
                data-testid="button-send-message"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-foreground/60 mt-2">
              Press Enter to send, Shift+Enter for new line
            </p>
          </div>
        </Card>
      )}
    </>
  );
}
