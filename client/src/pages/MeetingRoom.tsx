import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  Phone, 
  PhoneOff,
  Monitor,
  Loader2,
  AlertCircle,
  Users,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { connect, Room, LocalTrack, RemoteParticipant, LocalVideoTrack, LocalAudioTrack, createLocalTracks, createLocalVideoTrack } from "twilio-video";
import type { User } from "@shared/schema";

interface MeetingDetails {
  token: string;
  roomName: string;
  identity: string;
  meetingId: string;
}

export default function MeetingRoom() {
  const { meetingId } = useParams<{ meetingId: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const { data: user } = useQuery<User>({
    queryKey: ["/api/user"],
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [participants, setParticipants] = useState<RemoteParticipant[]>([]);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [localTracks, setLocalTracks] = useState<LocalTrack[]>([]);
  const [screenTrack, setScreenTrack] = useState<LocalVideoTrack | null>(null);
  
  const localVideoRef = useRef<HTMLDivElement>(null);
  const remoteVideosRef = useRef<HTMLDivElement>(null);
  
  // Refs to hold current state for cleanup functions
  const roomRef = useRef<Room | null>(null);
  const localTracksRef = useRef<LocalTrack[]>([]);
  const screenTrackRef = useRef<LocalVideoTrack | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);

  const attachTrack = useCallback((track: any, container: HTMLDivElement) => {
    // Clear any existing video elements first
    const existingElements = container.querySelectorAll('video, audio');
    existingElements.forEach(el => el.remove());
    
    const element = track.attach();
    element.style.width = "100%";
    element.style.height = "100%";
    element.style.objectFit = "cover";
    container.appendChild(element);
  }, []);

  const detachTrack = useCallback((track: any) => {
    track.detach().forEach((element: HTMLElement) => element.remove());
  }, []);

  const handleParticipantConnected = useCallback((participant: RemoteParticipant) => {
    setParticipants(prev => [...prev, participant]);
    
    participant.tracks.forEach(publication => {
      if (publication.isSubscribed && publication.track) {
        const container = document.getElementById(`participant-${participant.sid}`) as HTMLDivElement | null;
        if (container) {
          attachTrack(publication.track, container);
        }
      }
    });

    participant.on("trackSubscribed", track => {
      const container = document.getElementById(`participant-${participant.sid}`) as HTMLDivElement | null;
      if (container) {
        attachTrack(track, container);
      }
    });

    participant.on("trackUnsubscribed", track => {
      detachTrack(track);
    });
  }, [attachTrack, detachTrack]);

  const handleParticipantDisconnected = useCallback((participant: RemoteParticipant) => {
    setParticipants(prev => prev.filter(p => p.sid !== participant.sid));
    participant.tracks.forEach(publication => {
      if (publication.track) {
        detachTrack(publication.track);
      }
    });
  }, [detachTrack]);

  // Sync refs with state
  useEffect(() => {
    roomRef.current = room;
  }, [room]);
  
  useEffect(() => {
    localTracksRef.current = localTracks;
  }, [localTracks]);
  
  useEffect(() => {
    screenTrackRef.current = screenTrack;
  }, [screenTrack]);

  useEffect(() => {
    const joinMeeting = async () => {
      if (!meetingId) {
        setError("Meeting ID is required");
        setIsLoading(false);
        return;
      }

      try {
        const response = await apiRequest("POST", `/api/meetings/${meetingId}/join`, {});
        const meetingDetails = response as MeetingDetails;

        const tracks = await createLocalTracks({
          audio: true,
          video: { width: 640, height: 480 },
        });
        setLocalTracks(tracks);
        localTracksRef.current = tracks;

        if (localVideoRef.current) {
          const videoTrack = tracks.find(track => track.kind === "video");
          if (videoTrack) {
            attachTrack(videoTrack, localVideoRef.current);
          }
        }

        const newRoom = await connect(meetingDetails.token, {
          name: meetingDetails.roomName,
          tracks,
        });

        setRoom(newRoom);
        roomRef.current = newRoom;

        newRoom.participants.forEach(handleParticipantConnected);
        newRoom.on("participantConnected", handleParticipantConnected);
        newRoom.on("participantDisconnected", handleParticipantDisconnected);

        newRoom.on("disconnected", () => {
          // Use refs to get current tracks
          localTracksRef.current.forEach(track => {
            if ('stop' in track) {
              (track as LocalVideoTrack | LocalAudioTrack).stop();
            }
            detachTrack(track);
          });
          setRoom(null);
          roomRef.current = null;
          setParticipants([]);
        });

        setIsLoading(false);
      } catch (err: any) {
        console.error("Failed to join meeting:", err);
        setError(err.message || "Failed to join meeting");
        setIsLoading(false);
      }
    };

    joinMeeting();

    return () => {
      // Use refs to get current state for cleanup
      if (roomRef.current) {
        roomRef.current.disconnect();
      }
      // Stop screen share stream if active
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach(t => t.stop());
      }
      if (screenTrackRef.current) {
        screenTrackRef.current.stop();
      }
      localTracksRef.current.forEach(track => {
        if ('stop' in track) {
          (track as LocalVideoTrack | LocalAudioTrack).stop();
        }
        detachTrack(track);
      });
    };
  }, [meetingId]);

  // Re-attach local video when loading completes and ref becomes available
  useEffect(() => {
    if (!isLoading && localVideoRef.current && localTracks.length > 0) {
      const videoTrack = localTracks.find(track => track.kind === "video");
      if (videoTrack) {
        attachTrack(videoTrack, localVideoRef.current);
      }
    }
  }, [isLoading, localTracks, attachTrack]);

  const toggleVideo = useCallback(() => {
    const videoTrack = localTracks.find(track => track.kind === "video") as LocalVideoTrack;
    if (videoTrack) {
      if (isVideoEnabled) {
        videoTrack.disable();
      } else {
        videoTrack.enable();
      }
      setIsVideoEnabled(!isVideoEnabled);
    }
  }, [localTracks, isVideoEnabled]);

  const toggleAudio = useCallback(() => {
    const audioTrack = localTracks.find(track => track.kind === "audio") as LocalAudioTrack;
    if (audioTrack) {
      if (isAudioEnabled) {
        audioTrack.disable();
      } else {
        audioTrack.enable();
      }
      setIsAudioEnabled(!isAudioEnabled);
    }
  }, [localTracks, isAudioEnabled]);

  const toggleScreenShare = useCallback(async () => {
    if (!room) return;

    if (isScreenSharing && screenTrack) {
      room.localParticipant.unpublishTrack(screenTrack);
      screenTrack.stop();
      // Also stop the underlying stream
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach(t => t.stop());
        screenStreamRef.current = null;
      }
      setScreenTrack(null);
      screenTrackRef.current = null;
      setIsScreenSharing(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: false,
        } as DisplayMediaStreamOptions);
        
        // Store stream reference for cleanup
        screenStreamRef.current = stream;
        
        const mediaStreamTrack = stream.getVideoTracks()[0];
        
        // Create LocalVideoTrack from the MediaStreamTrack
        const track = new LocalVideoTrack(mediaStreamTrack, {
          name: "screen-share",
          logLevel: "warn",
        });
        
        // Publish the track to the room
        await room.localParticipant.publishTrack(track);
        setScreenTrack(track);
        screenTrackRef.current = track;
        setIsScreenSharing(true);

        // Listen for when the user stops sharing via browser UI
        const handleEnded = () => {
          if (roomRef.current) {
            roomRef.current.localParticipant.unpublishTrack(track);
          }
          track.stop();
          if (screenStreamRef.current) {
            screenStreamRef.current.getTracks().forEach(t => t.stop());
            screenStreamRef.current = null;
          }
          setScreenTrack(null);
          screenTrackRef.current = null;
          setIsScreenSharing(false);
        };
        
        mediaStreamTrack.addEventListener("ended", handleEnded);

        // Also handle the Twilio track stopped event
        track.on("stopped", () => {
          if (roomRef.current) {
            roomRef.current.localParticipant.unpublishTrack(track);
          }
          if (screenStreamRef.current) {
            screenStreamRef.current.getTracks().forEach(t => t.stop());
            screenStreamRef.current = null;
          }
          setScreenTrack(null);
          screenTrackRef.current = null;
          setIsScreenSharing(false);
        });
      } catch (err: any) {
        console.error("Failed to share screen:", err);
        // User cancelled the screen share dialog - don't show error
        if (err.name === "NotAllowedError" || err.name === "AbortError") {
          return;
        }
        toast({
          title: "Screen Share Failed",
          description: err.message || "Could not start screen sharing",
          variant: "destructive",
        });
      }
    }
  }, [room, isScreenSharing, screenTrack, toast]);

  const leaveCall = useCallback(() => {
    // Use refs to get current state for cleanup
    if (roomRef.current) {
      roomRef.current.disconnect();
    }
    // Stop screen share stream
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(t => t.stop());
      screenStreamRef.current = null;
    }
    if (screenTrackRef.current) {
      screenTrackRef.current.stop();
      screenTrackRef.current = null;
    }
    localTracksRef.current.forEach(track => {
      if ('stop' in track) {
        (track as LocalVideoTrack | LocalAudioTrack).stop();
      }
    });
    // Redirect based on user role
    const messagesRoute = user?.role === "seller" ? "/seller/messages" : "/messages";
    setLocation(messagesRoute);
  }, [setLocation, user?.role]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center py-10">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-lg font-medium">Joining meeting...</p>
            <p className="text-sm text-muted-foreground">Setting up your video and audio</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center py-10">
            <AlertCircle className="h-12 w-12 text-destructive mb-4" />
            <p className="text-lg font-medium">Unable to Join Meeting</p>
            <p className="text-sm text-muted-foreground text-center mt-2">{error}</p>
            <Button className="mt-6" onClick={() => window.close()}>
              Close
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex flex-col">
      <div className="flex-1 p-4 overflow-hidden">
        <div className="h-full grid gap-4" style={{
          gridTemplateColumns: participants.length > 0 ? "repeat(auto-fit, minmax(300px, 1fr))" : "1fr",
        }}>
          <div className="relative rounded-lg overflow-hidden bg-muted">
            <div
              ref={localVideoRef}
              className="w-full h-full min-h-[200px] bg-muted"
              data-testid="video-local"
            />
            <div className="absolute bottom-2 left-2 flex items-center gap-2">
              <Badge variant="secondary" className="bg-black/50 text-white">
                You
              </Badge>
              {!isVideoEnabled && (
                <Badge variant="destructive" className="bg-black/50">
                  <VideoOff className="h-3 w-3" />
                </Badge>
              )}
              {!isAudioEnabled && (
                <Badge variant="destructive" className="bg-black/50">
                  <MicOff className="h-3 w-3" />
                </Badge>
              )}
            </div>
          </div>

          {participants.map(participant => (
            <div
              key={participant.sid}
              className="relative rounded-lg overflow-hidden bg-muted"
            >
              <div
                id={`participant-${participant.sid}`}
                className="w-full h-full min-h-[200px] bg-muted"
                data-testid={`video-participant-${participant.sid}`}
              />
              <div className="absolute bottom-2 left-2">
                <Badge variant="secondary" className="bg-black/50 text-white">
                  {participant.identity}
                </Badge>
              </div>
            </div>
          ))}

          {participants.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center text-white/70">
                <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Waiting for others to join...</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-background border-t p-4">
        <div className="flex items-center justify-center gap-4">
          <Button
            variant={isAudioEnabled ? "outline" : "destructive"}
            size="lg"
            onClick={toggleAudio}
            data-testid="button-toggle-audio"
          >
            {isAudioEnabled ? (
              <Mic className="h-5 w-5" />
            ) : (
              <MicOff className="h-5 w-5" />
            )}
          </Button>

          <Button
            variant={isVideoEnabled ? "outline" : "destructive"}
            size="lg"
            onClick={toggleVideo}
            data-testid="button-toggle-video"
          >
            {isVideoEnabled ? (
              <Video className="h-5 w-5" />
            ) : (
              <VideoOff className="h-5 w-5" />
            )}
          </Button>

          <Button
            variant={isScreenSharing ? "default" : "outline"}
            size="lg"
            onClick={toggleScreenShare}
            data-testid="button-toggle-screenshare"
          >
            <Monitor className="h-5 w-5" />
          </Button>

          <Button
            variant="destructive"
            size="lg"
            onClick={leaveCall}
            data-testid="button-leave-call"
          >
            <PhoneOff className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
