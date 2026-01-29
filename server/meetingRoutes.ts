import { Router } from "express";
import { storage } from "./storage";
import { z } from "zod";
import { generateVideoAccessToken, createVideoRoom } from "./twilio";

const router = Router();

// Middleware to ensure user is authenticated
function requireAuth(req: any, res: any, next: any) {
  if (!req.isAuthenticated || !req.isAuthenticated() || !req.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

// Propose a new meeting
router.post("/propose", requireAuth, async (req: any, res: any) => {
  try {
    const schema = z.object({
      conversationId: z.string().min(1),
      scheduledAt: z.string().datetime(),
      durationMinutes: z.number().min(5).max(120).default(30),
      title: z.string().optional(),
      description: z.string().optional(),
    });

    const data = schema.parse(req.body);
    const userId = req.user!.id;

    // Get the conversation to find buyer and seller
    const conversation = await storage.getConversation(data.conversationId);
    if (!conversation) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    // Verify user is part of this conversation
    if (conversation.buyerId !== userId && conversation.sellerId !== userId) {
      return res.status(403).json({ error: "Not authorized to propose meeting in this conversation" });
    }

    const meeting = await storage.createMeeting({
      conversationId: data.conversationId,
      proposedById: userId,
      buyerId: conversation.buyerId,
      sellerId: conversation.sellerId,
      scheduledAt: new Date(data.scheduledAt),
      durationMinutes: data.durationMinutes,
      title: data.title,
      description: data.description,
      status: "proposed",
    });

    res.status(201).json(meeting);
  } catch (error: any) {
    console.error("Error proposing meeting:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid data", details: error.errors });
    }
    res.status(500).json({ error: error.message || "Failed to propose meeting" });
  }
});

// Confirm a meeting
router.post("/:id/confirm", requireAuth, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const meeting = await storage.confirmMeeting(id, userId);
    res.json(meeting);
  } catch (error: any) {
    console.error("Error confirming meeting:", error);
    res.status(400).json({ error: error.message || "Failed to confirm meeting" });
  }
});

// Cancel a meeting
router.post("/:id/cancel", requireAuth, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const { reason } = req.body;

    const meeting = await storage.cancelMeeting(id, userId, reason);
    res.json(meeting);
  } catch (error: any) {
    console.error("Error cancelling meeting:", error);
    res.status(400).json({ error: error.message || "Failed to cancel meeting" });
  }
});

// Get meetings for a conversation
router.get("/conversation/:conversationId", requireAuth, async (req: any, res: any) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user!.id;

    // Verify user is part of this conversation
    const conversation = await storage.getConversation(conversationId);
    if (!conversation) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    if (conversation.buyerId !== userId && conversation.sellerId !== userId) {
      return res.status(403).json({ error: "Not authorized to view meetings for this conversation" });
    }

    const meetings = await storage.getMeetingsByConversation(conversationId);
    res.json(meetings);
  } catch (error: any) {
    console.error("Error fetching meetings:", error);
    res.status(500).json({ error: error.message || "Failed to fetch meetings" });
  }
});

// Get upcoming meetings for current user
router.get("/upcoming", requireAuth, async (req: any, res: any) => {
  try {
    const userId = req.user!.id;
    const meetings = await storage.getUpcomingMeetings(userId);
    res.json(meetings);
  } catch (error: any) {
    console.error("Error fetching upcoming meetings:", error);
    res.status(500).json({ error: error.message || "Failed to fetch upcoming meetings" });
  }
});

// Get all meetings for current user
router.get("/my-meetings", requireAuth, async (req: any, res: any) => {
  try {
    const userId = req.user!.id;
    const status = req.query.status as string | undefined;
    const meetings = await storage.getMeetingsByUser(userId, status as any);
    res.json(meetings);
  } catch (error: any) {
    console.error("Error fetching meetings:", error);
    res.status(500).json({ error: error.message || "Failed to fetch meetings" });
  }
});

// Get a specific meeting
router.get("/:id", requireAuth, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const meeting = await storage.getMeeting(id);
    if (!meeting) {
      return res.status(404).json({ error: "Meeting not found" });
    }

    // Verify user is part of this meeting
    if (meeting.buyerId !== userId && meeting.sellerId !== userId) {
      return res.status(403).json({ error: "Not authorized to view this meeting" });
    }

    res.json(meeting);
  } catch (error: any) {
    console.error("Error fetching meeting:", error);
    res.status(500).json({ error: error.message || "Failed to fetch meeting" });
  }
});

// Join a meeting - generates video room token
router.post("/:id/join", requireAuth, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const meeting = await storage.getMeeting(id);
    if (!meeting) {
      return res.status(404).json({ error: "Meeting not found" });
    }

    // Verify user is part of this meeting
    if (meeting.buyerId !== userId && meeting.sellerId !== userId) {
      return res.status(403).json({ error: "Not authorized to join this meeting" });
    }

    // Only confirmed meetings can be joined
    if (meeting.status !== "confirmed") {
      return res.status(400).json({ error: "Meeting must be confirmed before joining" });
    }

    // Check if meeting time is appropriate (within 15 minutes before or during)
    const now = new Date();
    const meetingStart = new Date(meeting.scheduledAt);
    const meetingEnd = new Date(meetingStart.getTime() + meeting.durationMinutes * 60 * 1000);
    const earlyJoinTime = new Date(meetingStart.getTime() - 15 * 60 * 1000);

    if (now < earlyJoinTime) {
      return res.status(400).json({ 
        error: "Meeting not yet available",
        message: "You can join 15 minutes before the scheduled time"
      });
    }

    if (now > meetingEnd) {
      // Meeting has ended, mark as completed
      await storage.completeMeeting(id);
      return res.status(400).json({ error: "Meeting has ended" });
    }

    // Generate or reuse room name
    let roomName = meeting.roomName;
    if (!roomName) {
      roomName = `vaaney-meeting-${id}`;
      await storage.setMeetingRoom(id, roomName);
      // Create the room in Twilio
      await createVideoRoom(roomName);
    }

    // Get user details for identity
    const user = await storage.getUser(userId);
    const identity = user?.firstName 
      ? `${user.firstName} ${user.lastName || ''}`.trim()
      : `User-${userId.substring(0, 8)}`;

    // Generate access token for this user
    const token = await generateVideoAccessToken(identity, roomName);

    res.json({
      token,
      roomName,
      identity,
      meetingId: id,
    });
  } catch (error: any) {
    console.error("Error joining meeting:", error);
    res.status(500).json({ error: error.message || "Failed to join meeting" });
  }
});

export default router;
