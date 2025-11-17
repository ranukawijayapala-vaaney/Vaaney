import { useQuery, useMutation } from "@tanstack/react-query";
import { Bell, Check, CheckCheck, Trash2, Package, Calendar, MessageCircle, FileImage, DollarSign, Upload, RotateCcw, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDistanceToNow } from "date-fns";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Notification } from "@shared/schema";

interface NotificationResponse {
  notifications: Notification[];
  unreadCount: number;
}

export default function Notifications() {
  const [, navigate] = useLocation();

  // Fetch notifications
  const { data, isLoading } = useQuery<NotificationResponse>({
    queryKey: ["/api/notifications"],
    refetchInterval: 30000,
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("PATCH", `/api/notifications/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("PATCH", "/api/notifications/mark-all-read");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    },
  });

  const deleteNotificationMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/notifications/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    },
  });

  const notifications = data?.notifications || [];
  const unreadCount = data?.unreadCount || 0;

  const unreadNotifications = notifications.filter(n => !n.read);
  const readNotifications = notifications.filter(n => n.read);

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      markAsReadMutation.mutate(notification.id);
    }
    if (notification.link) {
      navigate(notification.link);
    }
  };

  const getNotificationIcon = (type: string) => {
    const iconMap: Record<string, any> = {
      order_created: Package,
      order_paid: DollarSign,
      order_shipped: Package,
      order_delivered: Check,
      booking_created: Calendar,
      booking_confirmed: Check,
      booking_paid: DollarSign,
      booking_started: RefreshCw,
      booking_completed: Check,
      quote_received: MessageCircle,
      quote_accepted: Check,
      quote_rejected: Check,
      design_submitted: FileImage,
      design_approved: Check,
      design_rejected: Check,
      design_changes_requested: FileImage,
      payment_confirmed: DollarSign,
      deliverables_uploaded: Upload,
      return_requested: RotateCcw,
      return_approved: Check,
      return_rejected: Check,
      refund_processed: DollarSign,
    };
    return iconMap[type] || Bell;
  };

  const getTypeBadge = (type: string) => {
    if (type.startsWith("order_")) return "Orders";
    if (type.startsWith("booking_")) return "Bookings";
    if (type.startsWith("quote_")) return "Quotes";
    if (type.startsWith("design_")) return "Designs";
    if (type.startsWith("return_")) return "Returns";
    if (type === "payment_confirmed" || type === "refund_processed") return "Payments";
    if (type === "deliverables_uploaded") return "Deliverables";
    return "General";
  };

  const NotificationCard = ({ notification }: { notification: Notification }) => {
    const IconComponent = getNotificationIcon(notification.type);
    
    return (
      <Card
        className={`cursor-pointer hover-elevate active-elevate-2 ${!notification.read ? "bg-accent/30" : ""}`}
        onClick={() => handleNotificationClick(notification)}
        data-testid={`notification-card-${notification.id}`}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className={`mt-1 flex-shrink-0 ${!notification.read ? "text-primary" : "text-muted-foreground"}`}>
                <IconComponent className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <CardTitle className={`text-base ${!notification.read ? "font-semibold" : "font-normal text-muted-foreground"}`}>
                    {notification.title}
                  </CardTitle>
                  <Badge variant="outline" className="text-xs">
                    {getTypeBadge(notification.type)}
                  </Badge>
                  {!notification.read && (
                    <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0" />
                  )}
                </div>
                <CardDescription className="mt-1 text-sm">
                  {notification.message}
                </CardDescription>
                <p className="text-xs text-muted-foreground mt-2">
                  {notification.createdAt ? formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true }) : "Just now"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              {!notification.read && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    markAsReadMutation.mutate(notification.id);
                  }}
                  data-testid={`button-mark-read-${notification.id}`}
                  className="h-8 w-8"
                >
                  <Check className="h-4 w-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteNotificationMutation.mutate(notification.id);
                }}
                data-testid={`button-delete-${notification.id}`}
                className="h-8 w-8 text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <div className="container max-w-4xl mx-auto py-8 px-4">
        <div className="text-center text-muted-foreground">Loading notifications...</div>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Bell className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold" data-testid="text-notifications-title">Notifications</h1>
            <p className="text-sm text-muted-foreground">
              {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}` : "All caught up!"}
            </p>
          </div>
        </div>
        {unreadCount > 0 && (
          <Button
            onClick={() => markAllReadMutation.mutate()}
            data-testid="button-mark-all-read"
            disabled={markAllReadMutation.isPending}
          >
            <CheckCheck className="h-4 w-4 mr-2" />
            Mark all read
          </Button>
        )}
      </div>

      <Tabs defaultValue="all" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="all" data-testid="tab-all">
            All ({notifications.length})
          </TabsTrigger>
          <TabsTrigger value="unread" data-testid="tab-unread">
            Unread ({unreadNotifications.length})
          </TabsTrigger>
          <TabsTrigger value="read" data-testid="tab-read">
            Read ({readNotifications.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-3">
          {notifications.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Bell className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground" data-testid="text-no-notifications">
                  No notifications yet
                </p>
              </CardContent>
            </Card>
          ) : (
            notifications.map((notification) => (
              <NotificationCard key={notification.id} notification={notification} />
            ))
          )}
        </TabsContent>

        <TabsContent value="unread" className="space-y-3">
          {unreadNotifications.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <CheckCheck className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground" data-testid="text-no-unread">
                  No unread notifications
                </p>
              </CardContent>
            </Card>
          ) : (
            unreadNotifications.map((notification) => (
              <NotificationCard key={notification.id} notification={notification} />
            ))
          )}
        </TabsContent>

        <TabsContent value="read" className="space-y-3">
          {readNotifications.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Bell className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground" data-testid="text-no-read">
                  No read notifications
                </p>
              </CardContent>
            </Card>
          ) : (
            readNotifications.map((notification) => (
              <NotificationCard key={notification.id} notification={notification} />
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
