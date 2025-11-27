import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Calendar, User, Clock, DollarSign, Store, Eye } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface Booking {
  id: string;
  userId: string;
  serviceId: string;
  packageId: string | null;
  scheduledDate: string;
  scheduledTime: string;
  totalAmount: string;
  status: string;
  requirements: string | null;
  createdAt: string;
  customer: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
  };
  seller?: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    businessName: string | null;
    phone: string | null;
  };
  service: {
    id: string;
    name: string;
    category: string;
  };
  package: {
    name: string;
    price: string;
  } | null;
}

export default function AdminBookings() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showBookingDetails, setShowBookingDetails] = useState(false);

  const { data: bookings = [], isLoading } = useQuery<Booking[]>({
    queryKey: ["/api/admin/bookings"],
  });

  const handleViewBooking = (booking: Booking) => {
    setSelectedBooking(booking);
    setShowBookingDetails(true);
  };

  const filteredBookings = bookings.filter((booking: Booking) => {
    return statusFilter === "all" || booking.status === statusFilter;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending_confirmation": return "bg-orange-500/10 text-orange-700 dark:text-orange-300";
      case "confirmed": return "bg-blue-500/10 text-blue-700 dark:text-blue-300";
      case "pending_payment": return "bg-yellow-500/10 text-yellow-700 dark:text-yellow-300";
      case "paid": return "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300";
      case "ongoing": return "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300";
      case "completed": return "bg-green-500/10 text-green-700 dark:text-green-300";
      case "cancelled": return "bg-red-500/10 text-red-700 dark:text-red-300";
      default: return "bg-muted";
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2" data-testid="text-page-title">All Bookings</h1>
        <p className="text-muted-foreground">Complete booking history with customer and service details</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <CardTitle>Booking List ({filteredBookings.length})</CardTitle>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]" data-testid="select-status-filter">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending_confirmation">Pending Confirmation</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="pending_payment">Pending Payment</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="ongoing">Ongoing</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : filteredBookings.length === 0 ? (
            <div className="py-12 text-center">
              <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No bookings found</h3>
              <p className="text-muted-foreground">
                {statusFilter !== "all" 
                  ? "Try adjusting your filter" 
                  : "Bookings will appear here once customers book services"}
              </p>
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Booking ID</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Seller</TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead>Package</TableHead>
                    <TableHead>Scheduled</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBookings.map((booking: Booking) => (
                    <TableRow key={booking.id} data-testid={`row-booking-${booking.id}`}>
                      <TableCell>
                        <div className="font-mono text-sm" data-testid={`text-booking-id-${booking.id}`}>
                          {booking.id.slice(0, 8)}...
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="font-medium text-sm" data-testid={`text-customer-name-${booking.id}`}>
                              {booking.customer.firstName} {booking.customer.lastName}
                            </div>
                            <div className="text-xs text-muted-foreground" data-testid={`text-customer-email-${booking.id}`}>
                              {booking.customer.email}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Store className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="font-medium text-sm" data-testid={`text-seller-name-${booking.id}`}>
                              {booking.seller?.businessName || `${booking.seller?.firstName || ''} ${booking.seller?.lastName || ''}`.trim() || 'N/A'}
                            </div>
                            <div className="text-xs text-muted-foreground" data-testid={`text-seller-email-${booking.id}`}>
                              {booking.seller?.email || 'N/A'}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium text-sm" data-testid={`text-service-name-${booking.id}`}>
                            {booking.service.name}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {booking.service.category}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm" data-testid={`text-package-${booking.id}`}>
                          {booking.package ? booking.package.name : 'Custom'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="text-sm" data-testid={`text-date-${booking.id}`}>
                              {new Date(booking.scheduledDate).toLocaleDateString()}
                            </div>
                            <div className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {booking.scheduledTime}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium" data-testid={`text-total-${booking.id}`}>
                          ${booking.totalAmount}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={getStatusColor(booking.status)} data-testid={`badge-status-${booking.id}`}>
                          {booking.status.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleViewBooking(booking)}
                          data-testid={`button-view-booking-${booking.id}`}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Booking Details Modal */}
      <Dialog open={showBookingDetails} onOpenChange={setShowBookingDetails}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Booking Details</DialogTitle>
            <DialogDescription>
              Booking #{selectedBooking?.id.slice(0, 8)}...
            </DialogDescription>
          </DialogHeader>
          
          {selectedBooking && (
            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge variant="secondary" className={getStatusColor(selectedBooking.status)}>
                    {selectedBooking.status.replace('_', ' ')}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Amount</p>
                  <p className="font-semibold">${selectedBooking.totalAmount}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Scheduled Date</p>
                  <p className="text-sm">{new Date(selectedBooking.scheduledDate).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Scheduled Time</p>
                  <p className="text-sm">{selectedBooking.scheduledTime}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Customer Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-1">
                      <p className="font-medium">{selectedBooking.customer.firstName} {selectedBooking.customer.lastName}</p>
                      <p className="text-sm text-muted-foreground">{selectedBooking.customer.email}</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Store className="h-4 w-4" />
                      Seller Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-1">
                      <p className="font-medium">
                        {selectedBooking.seller?.businessName || `${selectedBooking.seller?.firstName || ''} ${selectedBooking.seller?.lastName || ''}`.trim() || 'N/A'}
                      </p>
                      <p className="text-sm text-muted-foreground">{selectedBooking.seller?.email || 'N/A'}</p>
                      {selectedBooking.seller?.phone && (
                        <p className="text-sm text-muted-foreground">{selectedBooking.seller.phone}</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Service Details
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div>
                      <p className="text-sm text-muted-foreground">Service</p>
                      <p className="font-medium">{selectedBooking.service.name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Category</p>
                      <p className="text-sm">{selectedBooking.service.category}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Package</p>
                      <p className="text-sm">{selectedBooking.package?.name || 'Custom'}</p>
                    </div>
                    {selectedBooking.requirements && (
                      <div>
                        <p className="text-sm text-muted-foreground">Requirements</p>
                        <p className="text-sm">{selectedBooking.requirements}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <div>
                <p className="text-sm text-muted-foreground">Booked On</p>
                <p className="text-sm">{new Date(selectedBooking.createdAt).toLocaleString()}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
