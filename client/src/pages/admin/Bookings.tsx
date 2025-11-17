import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Calendar, User, Clock, DollarSign } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

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

  const { data: bookings = [], isLoading } = useQuery<Booking[]>({
    queryKey: ["/api/admin/bookings"],
  });

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
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Booking ID</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead>Package</TableHead>
                    <TableHead>Scheduled</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Booked On</TableHead>
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
                        <div className="text-sm" data-testid={`text-created-${booking.id}`}>
                          {new Date(booking.createdAt).toLocaleDateString()}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
