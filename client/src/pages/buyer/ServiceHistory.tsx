import { useState, useEffect } from "react";
import { Calendar, DollarSign, Clock, AlertCircle, CheckCircle, MessageCircle, Star, Download, FileIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Booking, BookingStatus } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocation } from "wouter";
import { RatingDialog } from "@/components/RatingDialog";

const statusColors: Record<BookingStatus, string> = {
  pending_confirmation: "bg-orange-500",
  confirmed: "bg-blue-500",
  pending_payment: "bg-yellow-500",
  paid: "bg-cyan-500",
  ongoing: "bg-indigo-500",
  completed: "bg-green-500",
  cancelled: "bg-red-500",
};

interface BookingDeliverablesProps {
  bookingId: string;
}

function BookingDeliverables({ bookingId }: BookingDeliverablesProps) {
  const { data: deliverables = [], isLoading } = useQuery<Array<{
    id: string;
    fileName: string;
    fileUrl: string;
    fileSize: number;
    mimeType: string;
    uploadedAt: string;
  }>>({
    queryKey: ["/api/bookings", bookingId, "deliverables"],
    queryFn: async () => {
      const response = await fetch(`/api/bookings/${bookingId}/deliverables`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch deliverables");
      return response.json();
    },
  });

  const handleDownload = async (deliverable: any) => {
    try {
      // For object storage files, we need to fetch through a download endpoint
      const response = await fetch(`/api/download-object?path=${encodeURIComponent(deliverable.fileUrl)}`, {
        credentials: "include",
      });
      
      if (!response.ok) throw new Error("Download failed");
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = deliverable.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download failed:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-2" data-testid="loading-deliverables">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (deliverables.length === 0) {
    return null;
  }

  return (
    <div className="border rounded-md p-4 space-y-3" data-testid={`deliverables-${bookingId}`}>
      <div className="flex items-center gap-2">
        <FileIcon className="h-4 w-4 text-muted-foreground" />
        <h4 className="text-sm font-medium">Service Deliverables</h4>
      </div>
      <div className="space-y-2">
        {deliverables.map((deliverable) => (
          <div
            key={deliverable.id}
            className="flex items-center justify-between p-2 border rounded-md hover-elevate"
            data-testid={`deliverable-${deliverable.id}`}
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <FileIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate" data-testid={`deliverable-name-${deliverable.id}`}>
                  {deliverable.fileName}
                </p>
                <p className="text-xs text-muted-foreground">
                  {(deliverable.fileSize / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDownload(deliverable)}
              data-testid={`button-download-${deliverable.id}`}
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ServiceHistory() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [submittingPayment, setSubmittingPayment] = useState<string | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [isContactDialogOpen, setIsContactDialogOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [initialMessage, setInitialMessage] = useState("");
  
  // Rating states
  const [isRatingDialogOpen, setIsRatingDialogOpen] = useState(false);
  const [selectedBookingForRating, setSelectedBookingForRating] = useState<string | null>(null);

  const { data: bookings = [], isLoading } = useQuery<(Booking & { service: { name: string }, package: { name: string } })[]>({
    queryKey: ["/api/buyer/bookings"],
  });

  // Check for payment status in URL query params
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const paymentStatus = searchParams.get("payment");
    const transactionRef = searchParams.get("transactionRef");

    if (paymentStatus) {
      if (paymentStatus === "success") {
        toast({
          title: "Payment Successful!",
          description: `Your booking has been confirmed. Reference: ${transactionRef?.slice(0, 12)}...`,
        });
      } else if (paymentStatus === "failed") {
        toast({
          title: "Payment Failed",
          description: "Your payment could not be processed. Please try again.",
          variant: "destructive",
        });
      }
      
      // Clear query params from URL
      const newUrl = window.location.pathname;
      window.history.replaceState({}, "", newUrl);
    }
  }, [toast]);

  const createConversationMutation = useMutation({
    mutationFn: async (data: { bookingId: string; subject: string; initialMessage: string }) => {
      const conversation = await apiRequest("POST", "/api/conversations", {
        type: "booking",
        subject: data.subject,
        bookingId: data.bookingId,
      });
      
      // Send initial message if provided
      if (data.initialMessage.trim()) {
        await apiRequest("POST", `/api/conversations/${conversation.id}/messages`, {
          content: data.initialMessage,
        });
      }
      
      return conversation;
    },
    onSuccess: (conversation) => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      setIsContactDialogOpen(false);
      setSubject("");
      setInitialMessage("");
      setSelectedBooking(null);
      toast({ title: "Conversation started!" });
      navigate("/messages");
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create conversation",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const submitPaymentMutation = useMutation({
    mutationFn: async (bookingId: string) => {
      return await apiRequest("POST", `/api/buyer/bookings/${bookingId}/submit-payment`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/buyer/bookings"] });
      toast({ 
        title: "Payment submitted", 
        description: "Waiting for admin to confirm your payment." 
      });
      setSubmittingPayment(null);
    },
    onError: (error: Error) => {
      toast({ 
        title: "Failed to submit payment", 
        description: error.message, 
        variant: "destructive" 
      });
      setSubmittingPayment(null);
    },
  });

  const handleContactSeller = (booking: Booking & { service: { name: string }, package: { name: string } }) => {
    setSelectedBooking(booking);
    setSubject(`Question about ${booking.service?.name} Booking`);
    setIsContactDialogOpen(true);
  };

  const handleCreateConversation = () => {
    if (!selectedBooking) return;
    
    if (!subject.trim()) {
      toast({ title: "Please provide a subject", variant: "destructive" });
      return;
    }

    createConversationMutation.mutate({
      bookingId: selectedBooking.id,
      subject: subject.trim(),
      initialMessage: initialMessage.trim(),
    });
  };

  const handleRateBooking = (booking: Booking & { service: { name: string }, package: { name: string } }) => {
    setSelectedBookingForRating(booking.id);
    setIsRatingDialogOpen(true);
  };

  const canRateBooking = (booking: Booking & { service: { name: string }, package: { name: string } }): boolean => {
    // Only allow rating completed bookings that haven't been rated yet
    return booking.status === "completed" && !(booking as any).rating;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-bold font-display">Service History</h1>
        <p className="text-muted-foreground mt-2">View all your service bookings</p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="space-y-3">
                  <Skeleton className="h-5 w-1/3" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-4 w-1/4" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : bookings.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No bookings yet</h3>
            <p className="text-muted-foreground">Browse services to make your first booking</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {bookings.map((booking) => (
            <Card key={booking.id} className="hover-elevate" data-testid={`card-booking-${booking.id}`}>
              <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0 pb-4">
                <div className="space-y-1">
                  <CardTitle className="text-lg">{booking.service?.name || 'Service'}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {booking.package?.name ? `${booking.package.name} Package` : 'Custom Quote'}
                  </p>
                </div>
                <Badge className={statusColors[booking.status as BookingStatus]} data-testid={`badge-status-${booking.id}`}>
                  {booking.status.replace(/_/g, " ")}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-4">
                {booking.status === "pending_confirmation" && (
                  <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-md p-4">
                    <div className="flex items-start gap-3">
                      <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-blue-900 dark:text-blue-100">Waiting for seller confirmation</p>
                        <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">The seller will review your booking request and confirm availability.</p>
                      </div>
                    </div>
                  </div>
                )}

                {booking.status === "pending_payment" && (
                  <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-md p-4">
                    <div className="flex items-start gap-3 mb-3">
                      <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-yellow-900 dark:text-yellow-100">Payment Required</p>
                        <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">Your booking has been confirmed! Submit your payment to proceed.</p>
                      </div>
                    </div>
                    <Button 
                      onClick={() => {
                        setSubmittingPayment(booking.id);
                        submitPaymentMutation.mutate(booking.id);
                      }}
                      disabled={submittingPayment === booking.id}
                      className="w-full" 
                      data-testid={`button-submit-payment-${booking.id}`}
                    >
                      {submittingPayment === booking.id ? (
                        <>Processing...</>
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          I Have Made the Payment
                        </>
                      )}
                    </Button>
                    <p className="text-xs text-muted-foreground mt-2 text-center">
                      Amount to pay: ${booking.amount} | Admin will confirm your payment
                    </p>
                  </div>
                )}

                {booking.status === "paid" && (
                  <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-md p-4">
                    <div className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-green-900 dark:text-green-100">Payment Confirmed</p>
                        <p className="text-xs text-green-700 dark:text-green-300 mt-1">Your payment has been confirmed. The service is ready to begin!</p>
                      </div>
                    </div>
                  </div>
                )}

                {(booking.status === "completed" || booking.status === "ongoing") && (
                  <BookingDeliverables bookingId={booking.id} />
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div className="text-sm">
                      <p className="text-muted-foreground">Scheduled</p>
                      <p className="font-medium">
                        {booking.scheduledDate ? new Date(booking.scheduledDate).toLocaleDateString() : "Not scheduled yet"}
                      </p>
                    </div>
                  </div>
                  {booking.scheduledTime && (
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <div className="text-sm">
                        <p className="text-muted-foreground">Time</p>
                        <p className="font-medium">{booking.scheduledTime}</p>
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <span className="font-semibold">${booking.amount}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {canRateBooking(booking) && (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleRateBooking(booking)}
                        data-testid={`button-rate-booking-${booking.id}`}
                      >
                        <Star className="h-4 w-4 mr-2" />
                        Rate Service
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleContactSeller(booking)}
                      data-testid={`button-contact-seller-${booking.id}`}
                    >
                      <MessageCircle className="h-4 w-4 mr-2" />
                      Contact Seller
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isContactDialogOpen} onOpenChange={setIsContactDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Contact Seller About Booking</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Create a conversation with the seller about {(selectedBooking as any)?.service?.name || 'your booking'}
            </div>

            <div className="space-y-2">
              <Label htmlFor="booking-subject">Subject</Label>
              <input
                id="booking-subject"
                type="text"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="What do you need help with?"
                data-testid="input-booking-subject"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="booking-message">Message</Label>
              <Textarea
                id="booking-message"
                value={initialMessage}
                onChange={(e) => setInitialMessage(e.target.value)}
                placeholder="Describe your question or concern..."
                rows={4}
                data-testid="textarea-booking-message"
              />
            </div>

            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setIsContactDialogOpen(false)}
                data-testid="button-cancel-booking-contact"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateConversation}
                disabled={createConversationMutation.isPending}
                data-testid="button-start-booking-conversation"
              >
                {createConversationMutation.isPending ? "Creating..." : "Start Conversation"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Rating Dialog */}
      {selectedBookingForRating && (
        <RatingDialog
          type="booking"
          id={selectedBookingForRating}
          open={isRatingDialogOpen}
          onOpenChange={setIsRatingDialogOpen}
          onSuccess={() => {
            setSelectedBookingForRating(null);
          }}
        />
      )}
    </div>
  );
}
