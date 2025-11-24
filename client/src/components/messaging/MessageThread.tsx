import { useEffect, useRef } from "react";
import { format } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { FileText, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Message, MessageAttachment } from "@shared/schema";

interface MessageWithUser extends Message {
  sender?: {
    id: string;
    firstName?: string | null;
    lastName?: string | null;
    profileImageUrl?: string | null;
  };
  attachments?: MessageAttachment[];
}

interface MessageThreadProps {
  messages: MessageWithUser[];
  currentUserId: string;
}

export function MessageThread({ messages, currentUserId }: MessageThreadProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to latest message when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="flex items-center justify-center h-full p-8 text-muted-foreground">
        <p data-testid="text-no-messages">No messages yet. Start the conversation!</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4" data-testid="container-message-thread">
      {messages.map((message) => {
        const isOwnMessage = message.senderId === currentUserId;
        const senderName = message.sender
          ? `${message.sender.firstName || ""} ${message.sender.lastName || ""}`.trim()
          : "Unknown User";
        const senderInitials = senderName
          .split(" ")
          .map((n) => n[0])
          .join("")
          .toUpperCase()
          .slice(0, 2);

        return (
          <div
            key={message.id}
            className={`flex gap-3 ${isOwnMessage ? "flex-row-reverse" : "flex-row"}`}
            data-testid={`message-${message.id}`}
          >
            {!isOwnMessage && (
              <Avatar className="h-8 w-8 flex-shrink-0">
                <AvatarImage src={message.sender?.profileImageUrl || undefined} />
                <AvatarFallback className="text-xs">{senderInitials}</AvatarFallback>
              </Avatar>
            )}

            <div className={`flex flex-col gap-1 max-w-[70%] ${isOwnMessage ? "items-end" : "items-start"}`}>
              <div className="flex items-center gap-2">
                {!isOwnMessage && (
                  <span className="text-sm font-medium" data-testid={`text-sender-${message.id}`}>
                    {senderName}
                  </span>
                )}
                <Badge 
                  variant={
                    message.senderRole === "admin" 
                      ? "destructive" 
                      : message.senderRole === "seller" 
                        ? "default" 
                        : "secondary"
                  } 
                  className="text-xs capitalize"
                >
                  {message.senderRole}
                </Badge>
                {isOwnMessage && (
                  <span className="text-sm font-medium" data-testid={`text-sender-${message.id}`}>
                    You
                  </span>
                )}
              </div>

              <Card
                className={`p-3 ${
                  isOwnMessage
                    ? "bg-primary text-primary-foreground"
                    : "bg-card"
                }`}
              >
                {message.content && message.content.trim() && (
                  <p className="text-sm whitespace-pre-wrap break-words" data-testid={`text-content-${message.id}`}>
                    {message.content}
                  </p>
                )}

                {message.attachments && message.attachments.length > 0 && (
                  <div className={`${message.content && message.content.trim() ? 'mt-3' : ''} space-y-2`} data-testid={`attachments-${message.id}`}>
                    {message.attachments.map((attachment) => (
                      <div
                        key={attachment.id}
                        className="flex items-center gap-2 p-2 rounded-md bg-background/20"
                      >
                        <FileText className="h-4 w-4 flex-shrink-0" />
                        <span className="text-xs flex-1 truncate">{attachment.fileName}</span>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          asChild
                          data-testid={`button-download-${attachment.id}`}
                        >
                          <a href={`/api/message-attachments/${attachment.id}/download`} target="_blank" rel="noopener noreferrer">
                            <Download className="h-3 w-3" />
                          </a>
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              <span className="text-xs text-muted-foreground" data-testid={`text-time-${message.id}`}>
                {message.createdAt && format(new Date(message.createdAt), "MMM d, h:mm a")}
              </span>
            </div>

            {isOwnMessage && (
              <Avatar className="h-8 w-8 flex-shrink-0">
                <AvatarImage src={message.sender?.profileImageUrl || undefined} />
                <AvatarFallback className="text-xs">{senderInitials}</AvatarFallback>
              </Avatar>
            )}
          </div>
        );
      })}
      {/* Invisible scroll target */}
      <div ref={messagesEndRef} />
    </div>
  );
}
