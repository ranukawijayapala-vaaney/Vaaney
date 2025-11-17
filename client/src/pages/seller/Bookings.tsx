import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Calendar, ChevronRight, Clock, MessageSquare, FileSpreadsheet } from "lucide-react";
import type { Booking } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { useLocation } from "wouter";
import * as XLSX from "xlsx";

const statusColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending_confirmation: "secondary",
  confirmed: "default",
  pending_payment: "secondary",
  paid: "default",
  ongoing: "default",
  completed: "default",
  cancelled: "destructive",
};

const statusLabels: Record<string, string> = {
  pending_confirmation: "Pending Confirmation",
  confirmed: "Confirmed",
  pending_payment: "Pending Payment",
  paid: "Paid",
  ongoing: "Ongoing",
  completed: "Completed",
  cancelled: "Cancelled",
};

export default function Bookings() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: bookings = [], isLoading } = useQuery<Booking[]>({
    queryKey: ["/api/seller/bookings"],
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ bookingId, status }: { bookingId: string; status: string }) => {
      return await apiRequest("PUT", `/api/seller/bookings/${bookingId}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/seller/bookings"] });
      toast({ title: "Booking status updated successfully" });
      setSelectedBooking(null);
    },
    onError: (error: Error) => {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
    },
  });

  const createConversationMutation = useMutation({
    mutationFn: async (bookingId: string) => {
      return await apiRequest("POST", "/api/conversations", {
        type: "booking",
        bookingId,
        subject: `Booking #${bookingId.substring(0, 8)}`,
      });
    },
    onSuccess: (conversation: any) => {
      setSelectedBooking(null);
      setLocation(`/seller/messages?conversation=${conversation.id}`);
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create conversation", description: error.message, variant: "destructive" });
    },
  });

  const handleStatusUpdate = (bookingId: string, newStatus: string) => {
    updateStatusMutation.mutate({ bookingId, status: newStatus });
  };

  const handleContactBuyer = (bookingId: string) => {
    createConversationMutation.mutate(bookingId);
  };

  const filteredBookings = bookings.filter(booking =>
    statusFilter === "all" || booking.status === statusFilter
  );

  const getNextStatus = (currentStatus: string): string | null => {
    const statusFlow = {
      pending_confirmation: "confirmed", // Seller confirms booking availability (auto-transitions to pending_payment)
      confirmed: null, // This status is skipped (auto-transitions to pending_payment)
      pending_payment: null, // Only admin can confirm payment
      paid: "ongoing", // Seller starts service
      ongoing: "completed", // Seller completes service
      completed: null,
      cancelled: null,
    };
    return statusFlow[currentStatus as keyof typeof statusFlow] || null;
  };

  const exportToExcel = () => {
    try {
      const exportData = filteredBookings.map((booking: Booking) => {
        return {
          "Booking ID": booking.id,
          "Service ID": booking.serviceId,
          "Package ID": booking.packageId || "Custom Quote",
          "Buyer ID": booking.buyerId,
          "Scheduled Date": booking.scheduledDate ? new Date(booking.scheduledDate).toLocaleDateString() : "N/A",
          "Scheduled Time": booking.scheduledTime || "N/A",
          "Amount (USD)": parseFloat(booking.amount).toFixed(2),
          "Status": statusLabels[booking.status],
          "Created Date": booking.createdAt ? new Date(booking.createdAt).toLocaleDateString() : "N/A",
          "Created Time": booking.createdAt ? new Date(booking.createdAt).toLocaleTimeString() : "N/A",
          "Notes": booking.notes || "N/A",
        };
      });

      const ws = XLSX.utils.json_to_sheet(exportData);
      
      ws['!cols'] = [
        { wch: 38 }, // Booking ID (full UUID)
        { wch: 38 }, // Service ID (full UUID)
        { wch: 38 }, // Package ID (full UUID)
        { wch: 38 }, // Buyer ID (full UUID)
        { wch: 15 }, // Scheduled Date
        { wch: 15 }, // Scheduled Time
        { wch: 15 }, // Amount (USD)
        { wch: 20 }, // Status
        { wch: 15 }, // Created Date
        { wch: 15 }, // Created Time
        { wch: 30 }, // Notes
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Bookings");

      const today = new Date().toISOString().split('T')[0];
      XLSX.writeFile(wb, `Vaaney_Seller_Bookings_${today}.xlsx`);

      toast({
        title: "Export successful",
        description: "Your bookings have been exported to Excel",
      });
    } catch (error) {
      console.error("Export failed:", error);
      toast({
        title: "Export failed",
        description: "Failed to export bookings to Excel",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold" data-testid="text-page-title">Bookings</h1>
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48" data-testid="select-status-filter">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Bookings</SelectItem>
              <SelectItem value="pending_confirmation">Pending Confirmation</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="pending_payment">Pending Payment</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="ongoing">Ongoing</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            onClick={exportToExcel}
            disabled={filteredBookings.length === 0}
            data-testid="button-export-excel"
          >
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Export to Excel
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredBookings.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Calendar className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2" data-testid="text-empty-state">No bookings found</h3>
            <p className="text-muted-foreground">
              {statusFilter !== "all" ? "Try changing the filter" : "Your bookings will appear here"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredBookings.map((booking) => (
            <Card key={booking.id} className="hover-elevate cursor-pointer" onClick={() => setSelectedBooking(booking)}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-lg" data-testid={`text-booking-id-${booking.id}`}>
                        Booking #{booking.id.substring(0, 8)}
                      </h3>
                      <Badge variant={statusColors[booking.status]} data-testid={`badge-status-${booking.id}`}>
                        {statusLabels[booking.status]}
                      </Badge>
                    </div>
                    <div className="flex gap-6 text-sm text-muted-foreground">
                      <span data-testid={`text-date-${booking.id}`}>
                        {booking.scheduledDate ? format(new Date(booking.scheduledDate), "MMM d, yyyy") : "N/A"}
                        {booking.scheduledTime && ` at ${booking.scheduledTime}`}
                      </span>
                      <span className="font-semibold text-foreground" data-testid={`text-amount-${booking.id}`}>
                        ${parseFloat(booking.amount).toFixed(2)} USD
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!selectedBooking} onOpenChange={() => setSelectedBooking(null)}>
        <DialogContent className="max-w-2xl" data-testid="dialog-booking-details">
          <DialogHeader>
            <DialogTitle>Booking Details #{selectedBooking?.id.substring(0, 8)}</DialogTitle>
          </DialogHeader>
          {selectedBooking && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Status</label>
                  <div className="mt-1">
                    <Badge variant={statusColors[selectedBooking.status]} data-testid="badge-booking-status">
                      {statusLabels[selectedBooking.status]}
                    </Badge>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Amount</label>
                  <p className="mt-1 font-semibold" data-testid="text-booking-amount">
                    ${parseFloat(selectedBooking.amount).toFixed(2)} USD
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Scheduled Date</label>
                  <p className="mt-1" data-testid="text-scheduled-date">
                    {selectedBooking.scheduledDate ? format(new Date(selectedBooking.scheduledDate), "MMM d, yyyy") : "N/A"}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Scheduled Time</label>
                  <p className="mt-1" data-testid="text-scheduled-time">
                    {selectedBooking.scheduledTime || "Not specified"}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Service ID</label>
                  <p className="mt-1 text-sm" data-testid="text-service-id">
                    {selectedBooking.serviceId.substring(0, 12)}...
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Package</label>
                  <p className="mt-1 text-sm" data-testid="text-package-id">
                    {selectedBooking.packageId ? `${selectedBooking.packageId.substring(0, 12)}...` : "Custom Quote"}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Buyer ID</label>
                  <p className="mt-1 text-sm" data-testid="text-buyer-id">
                    {selectedBooking.buyerId.substring(0, 12)}...
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Created</label>
                  <p className="mt-1 text-sm" data-testid="text-created-date">
                    {selectedBooking.createdAt ? format(new Date(selectedBooking.createdAt), "MMM d, yyyy") : "N/A"}
                  </p>
                </div>
              </div>

              {selectedBooking.notes && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Notes</label>
                  <p className="mt-1 text-sm" data-testid="text-booking-notes">
                    {selectedBooking.notes}
                  </p>
                </div>
              )}

              <div className="pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => handleContactBuyer(selectedBooking.id)}
                  disabled={createConversationMutation.isPending}
                  className="w-full"
                  data-testid="button-contact-buyer"
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  {createConversationMutation.isPending ? "Opening conversation..." : "Contact Buyer"}
                </Button>
              </div>

              {selectedBooking.status === "pending_payment" && (
                <div className="pt-4 border-t">
                  <div className="bg-muted p-4 rounded-md text-sm text-muted-foreground flex items-start gap-3">
                    <Clock className="h-5 w-5 flex-shrink-0 mt-0.5" />
                    <span>Waiting for admin to confirm payment. You cannot update this booking until payment is confirmed.</span>
                  </div>
                </div>
              )}
              
              {getNextStatus(selectedBooking.status) && (
                <div className="flex gap-2 pt-4 border-t">
                  <Button
                    onClick={() => handleStatusUpdate(selectedBooking.id, getNextStatus(selectedBooking.status)!)}
                    disabled={updateStatusMutation.isPending}
                    className="flex-1"
                    data-testid="button-update-status"
                  >
                    {updateStatusMutation.isPending
                      ? "Updating..."
                      : selectedBooking.status === "pending_confirmation"
                      ? "Confirm Availability"
                      : `Mark as ${statusLabels[getNextStatus(selectedBooking.status)!]}`}
                  </Button>
                  {selectedBooking.status !== "cancelled" && selectedBooking.status !== "completed" && (
                    <Button
                      variant="destructive"
                      onClick={() => handleStatusUpdate(selectedBooking.id, "cancelled")}
                      disabled={updateStatusMutation.isPending}
                      data-testid="button-cancel-booking"
                    >
                      {selectedBooking.status === "pending_confirmation" ? "Reject Booking" : "Cancel Booking"}
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
