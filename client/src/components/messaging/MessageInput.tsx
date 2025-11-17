import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Paperclip, X } from "lucide-react";
import { Card } from "@/components/ui/card";

interface MessageInputProps {
  onSendMessage: (content: string, files: File[]) => Promise<void>;
  placeholder?: string;
  disabled?: boolean;
}

export function MessageInput({
  onSendMessage,
  placeholder = "Type your message...",
  disabled = false,
}: MessageInputProps) {
  const [message, setMessage] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [isSending, setIsSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() && files.length === 0) return;
    if (disabled || isSending) return;

    setIsSending(true);
    try {
      await onSendMessage(message.trim(), files);
      setMessage("");
      setFiles([]);
    } catch (error) {
      console.error("Failed to send message:", error);
    } finally {
      setIsSending(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setFiles((prev) => [...prev, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <Card className="p-4">
      <form onSubmit={handleSubmit} className="space-y-3">
        {files.length > 0 && (
          <div className="flex flex-wrap gap-2" data-testid="container-file-previews">
            {files.map((file, index) => (
              <div
                key={index}
                className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-md text-sm"
                data-testid={`file-preview-${index}`}
              >
                <Paperclip className="h-3 w-3" />
                <span className="max-w-[200px] truncate">{file.name}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 p-0 hover:bg-destructive/20"
                  onClick={() => removeFile(index)}
                  data-testid={`button-remove-file-${index}`}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={placeholder}
            disabled={disabled || isSending}
            className="resize-none min-h-[60px] flex-1"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
            data-testid="textarea-message-input"
          />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <input
              type="file"
              id="file-upload"
              multiple
              className="hidden"
              onChange={handleFileSelect}
              disabled={disabled || isSending}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => document.getElementById("file-upload")?.click()}
              disabled={disabled || isSending}
              data-testid="button-attach-file"
            >
              <Paperclip className="h-4 w-4 mr-2" />
              Attach Files
            </Button>
          </div>

          <Button
            type="submit"
            disabled={(!message.trim() && files.length === 0) || disabled || isSending}
            data-testid="button-send-message"
          >
            <Send className="h-4 w-4 mr-2" />
            {isSending ? "Sending..." : "Send"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
