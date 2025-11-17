import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export type DocumentData = {
  name: string;
  type: string;
  size: number;
  data: string;
};

interface VerificationDocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documents: DocumentData[];
  title?: string;
  description?: string;
  emptyStateMessage?: string;
  isLoading?: boolean;
  testIdPrefix?: string;
}

export function VerificationDocumentDialog({
  open,
  onOpenChange,
  documents,
  title = "Verification Documents",
  description = "Submitted verification documents",
  emptyStateMessage = "No documents available",
  isLoading = false,
  testIdPrefix = "document",
}: VerificationDocumentDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" data-testid={`dialog-${testIdPrefix}-preview`}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="border rounded-lg p-4">
                <Skeleton className="h-5 w-1/3 mb-2" />
                <Skeleton className="h-4 w-1/4 mb-4" />
                <Skeleton className="h-48 w-full" />
              </div>
            ))}
          </div>
        ) : documents.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            {emptyStateMessage}
          </div>
        ) : (
          <div className="space-y-4">
            {documents.map((doc, index) => (
              <div key={index} className="border rounded-lg p-4">
                <div className="mb-2">
                  <p className="text-sm font-medium">{doc.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {doc.type} • {(doc.size / 1024).toFixed(1)} KB
                  </p>
                </div>
                {doc.type.startsWith('image/') ? (
                  <img 
                    src={`data:${doc.type};base64,${doc.data}`}
                    alt={doc.name}
                    className="w-full h-auto rounded border"
                    data-testid={`img-${testIdPrefix}-${index}`}
                  />
                ) : doc.type === 'application/pdf' ? (
                  <div className="bg-muted p-4 rounded text-center">
                    <p className="text-sm">PDF Document</p>
                    <a
                      href={`data:${doc.type};base64,${doc.data}`}
                      download={doc.name}
                      className="text-primary hover:underline text-sm"
                    >
                      Download to view
                    </a>
                  </div>
                ) : (
                  <div className="bg-muted p-4 rounded text-center">
                    <p className="text-sm">File: {doc.name}</p>
                    <a
                      href={`data:${doc.type};base64,${doc.data}`}
                      download={doc.name}
                      className="text-primary hover:underline text-sm"
                    >
                      Download
                    </a>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)} data-testid={`button-close-${testIdPrefix}-preview`}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
