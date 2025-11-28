import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { MessageCircle, X, Send, Loader2, GripVertical } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";
import ReactMarkdown from "react-markdown";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

interface Position {
  x: number;
  y: number;
}

const BUTTON_SIZE = 70;
const STORAGE_KEY = 'chatAssistantPosition';

function getDefaultPosition(): Position {
  const isMobile = window.innerWidth < 1280;
  return {
    x: window.innerWidth - BUTTON_SIZE - 16,
    y: isMobile ? window.innerHeight - BUTTON_SIZE - 84 : window.innerHeight - BUTTON_SIZE - 24
  };
}

function getSavedPosition(): Position | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const pos = JSON.parse(saved);
      if (typeof pos.x === 'number' && typeof pos.y === 'number') {
        return pos;
      }
    }
  } catch (e) {
    console.error('Error reading saved position:', e);
  }
  return null;
}

function constrainPosition(x: number, y: number): Position {
  const maxX = window.innerWidth - BUTTON_SIZE - 8;
  const maxY = window.innerHeight - BUTTON_SIZE - 8;
  const minX = 8;
  const minY = 8;
  
  return {
    x: Math.max(minX, Math.min(maxX, x)),
    y: Math.max(minY, Math.min(maxY, y))
  };
}

export function ChatAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(() => {
    return localStorage.getItem('chatSessionId');
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [location] = useLocation();

  // Draggable state - always clamp to viewport on initial load
  const [position, setPosition] = useState<Position>(() => {
    const saved = getSavedPosition();
    if (saved) {
      // Clamp saved position to current viewport bounds
      return constrainPosition(saved.x, saved.y);
    }
    return getDefaultPosition();
  });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState<Position>({ x: 0, y: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dragStartTimeRef = useRef<number>(0);
  const hasDraggedRef = useRef(false);
  const pointerHandledRef = useRef(false);

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

  // Handle window resize - constrain position
  useEffect(() => {
    const handleResize = () => {
      setPosition(prev => constrainPosition(prev.x, prev.y));
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Save position to localStorage when it changes
  useEffect(() => {
    if (!isDragging) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(position));
    }
  }, [position, isDragging]);

  // Drag handlers
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (buttonRef.current) {
      buttonRef.current.setPointerCapture(e.pointerId);
      const rect = buttonRef.current.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
      setIsDragging(true);
      dragStartTimeRef.current = Date.now();
      hasDraggedRef.current = false;
      e.preventDefault();
    }
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (isDragging) {
      const newX = e.clientX - dragOffset.x;
      const newY = e.clientY - dragOffset.y;
      const constrained = constrainPosition(newX, newY);
      setPosition(constrained);
      hasDraggedRef.current = true;
      e.preventDefault();
    }
  }, [isDragging, dragOffset]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (buttonRef.current) {
      buttonRef.current.releasePointerCapture(e.pointerId);
    }
    setIsDragging(false);
    
    // Only toggle chat if it was a quick tap (not a drag)
    const dragDuration = Date.now() - dragStartTimeRef.current;
    if (dragDuration < 200 && !hasDraggedRef.current) {
      pointerHandledRef.current = true; // Mark that we handled the toggle
      setIsOpen(prev => !prev);
    }
  }, []);

  // Fallback click handler for accessibility and testing tools
  const handleClick = useCallback((e: React.MouseEvent) => {
    // Prevent double-toggle: only handle if pointer events didn't
    if (pointerHandledRef.current) {
      pointerHandledRef.current = false;
      return;
    }
    // Toggle if not dragging (for standard clicks without pointer events)
    if (!isDragging) {
      setIsOpen(prev => !prev);
    }
  }, [isDragging]);

  // Keyboard accessibility - toggle chat on Enter/Space
  const handleButtonKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setIsOpen(prev => !prev);
    }
  }, []);

  // Extract context from current page - expanded to cover all routes
  const getPageContext = () => {
    const context: any = {
      currentPage: location,
      isGuest: !user,
      userRole: user?.role || 'guest',
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
      // Use public endpoint for guests, authenticated for logged-in users
      const endpoint = isGuest ? "/api/chat/public" : "/api/chat";
      
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          message: userMessage.content,
          sessionId,
          context,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to get response");
      }
      
      const data = await response.json();

      const assistantMessage: Message = {
        role: "assistant",
        content: data.message,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
      
      if (data.sessionId && !sessionId) {
        setSessionId(data.sessionId);
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

  // Calculate chat panel position based on button position
  const getChatPanelStyle = () => {
    const isMobile = window.innerWidth < 1280;
    const panelWidth = isMobile ? window.innerWidth - 32 : 384;
    const panelHeight = isMobile ? window.innerHeight - 270 : window.innerHeight - 180;
    
    // Position panel above the button
    let panelX = position.x;
    let panelY = position.y - panelHeight - 16;
    
    // Adjust if panel would go off-screen
    if (panelX + panelWidth > window.innerWidth - 16) {
      panelX = window.innerWidth - panelWidth - 16;
    }
    if (panelX < 16) panelX = 16;
    if (panelY < 16) {
      // If not enough space above, position below
      panelY = position.y + BUTTON_SIZE + 16;
    }
    
    return {
      position: 'fixed' as const,
      left: `${panelX}px`,
      top: `${panelY}px`,
      width: isMobile ? `calc(100% - 32px)` : `${panelWidth}px`,
      maxHeight: `${Math.min(panelHeight, window.innerHeight - 120)}px`,
      zIndex: 9999
    };
  };

  // Determine if this is a guest or authenticated user
  const isGuest = !user;
  const userRole = user?.role || 'guest';

  return (
    <>
      {/* Draggable Floating Chat Button */}
      <Button
        ref={buttonRef}
        className={`h-[70px] w-[70px] rounded-full shadow-2xl bg-[#bcd42f] hover:bg-[#a8bf2a] text-[#222326] border-2 border-[#a8bf2a] ${isDragging ? 'cursor-grabbing scale-110' : 'cursor-grab animate-pulse-slow'} touch-none select-none`}
        style={{ 
          position: 'fixed',
          left: `${position.x}px`,
          top: `${position.y}px`,
          zIndex: 9999,
          transition: isDragging ? 'none' : 'transform 0.2s ease'
        }}
        size="icon"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onClick={handleClick}
        onKeyDown={handleButtonKeyDown}
        tabIndex={0}
        aria-label={isOpen ? "Close AI assistant" : "Open AI assistant"}
        data-testid="button-chat-assistant"
      >
        <div className="relative flex items-center justify-center w-full h-full">
          {isOpen ? <X className="h-7 w-7" /> : <MessageCircle className="h-7 w-7" />}
          {!isDragging && !isOpen && (
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-[#217588] rounded-full animate-ping" />
          )}
        </div>
      </Button>

      {/* Drag hint indicator */}
      {!isOpen && (
        <div 
          className="pointer-events-none text-[10px] text-foreground/60 text-center"
          style={{
            position: 'fixed',
            left: `${position.x}px`,
            top: `${position.y + BUTTON_SIZE + 4}px`,
            width: `${BUTTON_SIZE}px`,
            zIndex: 9998
          }}
        >
          Drag to move
        </div>
      )}

      {/* Chat Panel - positioned relative to button */}
      {isOpen && (
        <Card 
          className="shadow-2xl flex flex-col"
          style={getChatPanelStyle()}
          data-testid="panel-chat-assistant"
        >
          {/* Header - Improved visibility with darker text */}
          <div className="p-4 border-b bg-gradient-to-r from-[#217588]/5 to-transparent">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-[#217588]" />
              <div>
                <h3 className="font-bold text-[#222326] text-base">Vaaney AI Assistant</h3>
                <p className="text-xs text-foreground/70">
                  {isGuest && "Discover what Vaaney can do for you"}
                  {userRole === "buyer" && "Find products, get help shopping"}
                  {userRole === "seller" && "Business insights & guidance"}
                  {userRole === "admin" && "Platform management support"}
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
                {isGuest ? (
                  <>
                    <p className="mt-2 text-foreground/80">Welcome to Vaaney - the Maldives marketplace!</p>
                    <p className="mt-1 text-foreground/70 text-xs">Ask me anything about buying, selling, or our services.</p>
                  </>
                ) : (
                  <p className="mt-2 text-foreground/80">How can I help you today?</p>
                )}
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
