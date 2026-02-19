import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { 
  Video, 
  Calendar, 
  Clock, 
  Check, 
  X, 
  Loader2,
  Phone,
  Users,
} from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface Meeting {
  id: string;
  conversationId: string;
  proposedById: string;
  buyerId: string;
  sellerId: string;
  scheduledAt: string;
  durationMinutes: number;
  status: "proposed" | "confirmed" | "cancelled" | "completed";
  roomName?: string;
  title?: string;
  description?: string;
  confirmedAt?: string;
  cancelledAt?: string;
  cancelReason?: string;
  completedAt?: string;
  createdAt: string;
}

interface MeetingSchedulerProps {
  conversationId: string;
  userRole: "buyer" | "seller";
  userId: string;
  externalDialogOpen?: boolean;
  onExternalDialogOpenChange?: (open: boolean) => void;
}

export function MeetingScheduler({ conversationId, userRole, userId, externalDialogOpen, onExternalDialogOpenChange }: MeetingSchedulerProps) {
  const { toast } = useToast();
  const [internalDialogOpen, setInternalDialogOpen] = useState(false);
  const showScheduleDialog = externalDialogOpen !== undefined ? externalDialogOpen : internalDialogOpen;
  const setShowScheduleDialog = (open: boolean) => {
    if (onExternalDialogOpenChange) onExternalDialogOpenChange(open);
    setInternalDialogOpen(open);
  };
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [duration, setDuration] = useState("30");
  const [meetingTitle, setMeetingTitle] = useState("");
  const [meetingDescription, setMeetingDescription] = useState("");

  const { data: meetings = [], isLoading } = useQuery<Meeting[]>({
    queryKey: [`/api/meetings/conversation/${conversationId}`],
    enabled: !!conversationId,
  });

  const proposeMeetingMutation = useMutation({
    mutationFn: async (data: {
      conversationId: string;
      scheduledAt: string;
      durationMinutes: number;
      title?: string;
      description?: string;
    }) => {
      return apiRequest("POST", "/api/meetings/propose", data);
    },
    onSuccess: () => {
      toast({
        title: "Meeting Proposed",
        description: "Your meeting request has been sent.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/meetings/conversation/${conversationId}`] });
      setShowScheduleDialog(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to propose meeting",
        variant: "destructive",
      });
    },
  });

  const confirmMeetingMutation = useMutation({
    mutationFn: async (meetingId: string) => {
      return apiRequest("POST", `/api/meetings/${meetingId}/confirm`, {});
    },
    onSuccess: () => {
      toast({
        title: "Meeting Confirmed",
        description: "The meeting has been confirmed.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/meetings/conversation/${conversationId}`] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to confirm meeting",
        variant: "destructive",
      });
    },
  });

  const cancelMeetingMutation = useMutation({
    mutationFn: async ({ meetingId, reason }: { meetingId: string; reason?: string }) => {
      return apiRequest("POST", `/api/meetings/${meetingId}/cancel`, { reason });
    },
    onSuccess: () => {
      toast({
        title: "Meeting Cancelled",
        description: "The meeting has been cancelled.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/meetings/conversation/${conversationId}`] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to cancel meeting",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setScheduledDate("");
    setScheduledTime("");
    setDuration("30");
    setMeetingTitle("");
    setMeetingDescription("");
  };

  const handleProposeMeeting = () => {
    if (!scheduledDate || !scheduledTime) {
      toast({
        title: "Error",
        description: "Please select a date and time",
        variant: "destructive",
      });
      return;
    }

    const scheduledAt = new Date(`${scheduledDate}T${scheduledTime}:00`).toISOString();
    
    proposeMeetingMutation.mutate({
      conversationId,
      scheduledAt,
      durationMinutes: parseInt(duration),
      title: meetingTitle || undefined,
      description: meetingDescription || undefined,
    });
  };

  const getStatusBadge = (status: Meeting["status"]) => {
    switch (status) {
      case "proposed":
        return <Badge variant="secondary" data-testid="badge-meeting-proposed"><Clock className="h-3 w-3 mr-1" />Proposed</Badge>;
      case "confirmed":
        return <Badge variant="default" data-testid="badge-meeting-confirmed"><Check className="h-3 w-3 mr-1" />Confirmed</Badge>;
      case "cancelled":
        return <Badge variant="destructive" data-testid="badge-meeting-cancelled"><X className="h-3 w-3 mr-1" />Cancelled</Badge>;
      case "completed":
        return <Badge variant="outline" data-testid="badge-meeting-completed"><Check className="h-3 w-3 mr-1" />Completed</Badge>;
      default:
        return null;
    }
  };

  const activeMeetings = meetings.filter(m => m.status === "proposed" || m.status === "confirmed");
  const pastMeetings = meetings.filter(m => m.status === "cancelled" || m.status === "completed");

  const canJoinMeeting = (meeting: Meeting) => {
    if (meeting.status !== "confirmed") return false;
    const now = new Date();
    const meetingStart = new Date(meeting.scheduledAt);
    const earlyJoinTime = new Date(meetingStart.getTime() - 15 * 60 * 1000);
    const meetingEnd = new Date(meetingStart.getTime() + meeting.durationMinutes * 60 * 1000);
    return now >= earlyJoinTime && now <= meetingEnd;
  };

  const handleJoinMeeting = (meetingId: string) => {
    window.open(`/meeting/${meetingId}`, "_blank");
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Video className="h-4 w-4" />
          Video Meetings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Dialog open={showScheduleDialog} onOpenChange={setShowScheduleDialog}>
          <DialogTrigger asChild>
            <Button variant="outline" className="w-full" data-testid="button-schedule-meeting">
              <Calendar className="h-4 w-4 mr-2" />
              Schedule Meeting
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Schedule a Video Meeting</DialogTitle>
              <DialogDescription>
                Propose a video call to discuss your order or project.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="meeting-title">Title (optional)</Label>
                <Input
                  id="meeting-title"
                  placeholder="e.g., Design discussion"
                  value={meetingTitle}
                  onChange={(e) => setMeetingTitle(e.target.value)}
                  data-testid="input-meeting-title"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="meeting-date">Date</Label>
                  <Input
                    id="meeting-date"
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    min={new Date().toISOString().split("T")[0]}
                    data-testid="input-meeting-date"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="meeting-time">Time</Label>
                  <Input
                    id="meeting-time"
                    type="time"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    data-testid="input-meeting-time"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="meeting-duration">Duration</Label>
                <Select value={duration} onValueChange={setDuration}>
                  <SelectTrigger data-testid="select-meeting-duration">
                    <SelectValue placeholder="Select duration" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 minutes</SelectItem>
                    <SelectItem value="30">30 minutes</SelectItem>
                    <SelectItem value="45">45 minutes</SelectItem>
                    <SelectItem value="60">1 hour</SelectItem>
                    <SelectItem value="90">1.5 hours</SelectItem>
                    <SelectItem value="120">2 hours</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="meeting-description">Description (optional)</Label>
                <Textarea
                  id="meeting-description"
                  placeholder="What would you like to discuss?"
                  value={meetingDescription}
                  onChange={(e) => setMeetingDescription(e.target.value)}
                  className="resize-none"
                  data-testid="input-meeting-description"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowScheduleDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleProposeMeeting}
                disabled={proposeMeetingMutation.isPending}
                data-testid="button-propose-meeting"
              >
                {proposeMeetingMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Calendar className="h-4 w-4 mr-2" />
                )}
                Propose Meeting
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {isLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {activeMeetings.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-sm font-medium">Upcoming Meetings</h4>
                {activeMeetings.map((meeting) => (
                  <div
                    key={meeting.id}
                    className="p-3 border rounded-md space-y-2"
                    data-testid={`card-meeting-${meeting.id}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {meeting.title || "Video Meeting"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(meeting.scheduledAt), "PPp")}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Duration: {meeting.durationMinutes} minutes
                        </p>
                      </div>
                      {getStatusBadge(meeting.status)}
                    </div>
                    
                    {meeting.description && (
                      <p className="text-xs text-muted-foreground">{meeting.description}</p>
                    )}

                    <div className="flex gap-2 flex-wrap">
                      {meeting.status === "proposed" && meeting.proposedById !== userId && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => confirmMeetingMutation.mutate(meeting.id)}
                            disabled={confirmMeetingMutation.isPending}
                            data-testid={`button-confirm-meeting-${meeting.id}`}
                          >
                            {confirmMeetingMutation.isPending ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Check className="h-3 w-3 mr-1" />
                            )}
                            Confirm
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => cancelMeetingMutation.mutate({ meetingId: meeting.id })}
                            disabled={cancelMeetingMutation.isPending}
                            data-testid={`button-decline-meeting-${meeting.id}`}
                          >
                            <X className="h-3 w-3 mr-1" />
                            Decline
                          </Button>
                        </>
                      )}

                      {meeting.status === "proposed" && meeting.proposedById === userId && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => cancelMeetingMutation.mutate({ meetingId: meeting.id })}
                          disabled={cancelMeetingMutation.isPending}
                          data-testid={`button-cancel-meeting-${meeting.id}`}
                        >
                          <X className="h-3 w-3 mr-1" />
                          Cancel
                        </Button>
                      )}

                      {canJoinMeeting(meeting) && (
                        <Button
                          size="sm"
                          onClick={() => handleJoinMeeting(meeting.id)}
                          data-testid={`button-join-meeting-${meeting.id}`}
                        >
                          <Phone className="h-3 w-3 mr-1" />
                          Join Call
                        </Button>
                      )}

                      {meeting.status === "confirmed" && !canJoinMeeting(meeting) && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => cancelMeetingMutation.mutate({ meetingId: meeting.id })}
                          disabled={cancelMeetingMutation.isPending}
                          data-testid={`button-cancel-confirmed-meeting-${meeting.id}`}
                        >
                          <X className="h-3 w-3 mr-1" />
                          Cancel
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeMeetings.length === 0 && (
              <div className="text-center py-4 text-sm text-muted-foreground">
                <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No scheduled meetings</p>
                <p className="text-xs">Schedule a video call to discuss your project</p>
              </div>
            )}

            {pastMeetings.length > 0 && (
              <>
                <Separator />
                <details className="group">
                  <summary className="text-sm font-medium cursor-pointer list-none flex items-center gap-2">
                    <span>Past Meetings ({pastMeetings.length})</span>
                  </summary>
                  <div className="mt-3 space-y-2">
                    {pastMeetings.map((meeting) => (
                      <div
                        key={meeting.id}
                        className="p-2 border rounded-md bg-muted/50"
                        data-testid={`card-past-meeting-${meeting.id}`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <p className="text-sm">{meeting.title || "Video Meeting"}</p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(meeting.scheduledAt), "PP")}
                            </p>
                          </div>
                          {getStatusBadge(meeting.status)}
                        </div>
                      </div>
                    ))}
                  </div>
                </details>
              </>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
