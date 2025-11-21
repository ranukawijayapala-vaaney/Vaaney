import { Router } from "express";
import { z } from "zod";
import { verifyEmailToken, resendVerificationEmail } from "./services/emailVerificationService";
import { db } from "./db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";

const router = Router();

// GET /api/auth/verify-email?token=xxx - Verify email with token
router.get("/verify-email", async (req, res) => {
  const token = req.query.token as string;
  
  try {
    if (!token) {
      return res.redirect(`/verify-email?error=missing_token`);
    }
    
    const result = await verifyEmailToken(token);
    
    if (!result.success) {
      return res.redirect(`/verify-email?token=${token}&error=verification_failed`);
    }
    
    // Redirect to frontend page with success
    res.redirect(`/verify-email?token=${token}`);
  } catch (error: any) {
    console.error("Email verification error:", error);
    res.redirect(`/verify-email?token=${token || ""}&error=server_error`);
  }
});

// POST /api/auth/resend-verification - Resend verification email
const resendSchema = z.object({
  email: z.string().email("Invalid email address"),
});

router.post("/resend-verification", async (req, res) => {
  try {
    const { email } = resendSchema.parse(req.body);
    
    const result = await resendVerificationEmail(email);
    
    if (!result.success) {
      return res.status(400).json({ message: result.message });
    }
    
    res.json({ message: result.message });
  } catch (error: any) {
    if (error.name === "ZodError") {
      return res.status(400).json({ message: "Invalid email format" });
    }
    console.error("Resend verification error:", error);
    res.status(500).json({ message: "Failed to resend verification email" });
  }
});

// TEST HELPER ENDPOINT - Development/Testing Only
// GET /api/auth/test/verification-token?email=xxx
// Returns the verification token for testing purposes
if (process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test") {
  router.get("/test/verification-token", async (req, res) => {
    try {
      const email = req.query.email as string;
      
      if (!email) {
        return res.status(400).json({ message: "Email parameter is required" });
      }
      
      // Find user by email
      const [user] = await db
        .select({
          id: users.id,
          email: users.email,
          verificationToken: users.verificationToken,
          verificationTokenExpiry: users.verificationTokenExpiry,
          emailVerified: users.emailVerified,
        })
        .from(users)
        .where(eq(users.email, email.toLowerCase()))
        .limit(1);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json({
        email: user.email,
        verificationToken: user.verificationToken,
        verificationTokenExpiry: user.verificationTokenExpiry,
        emailVerified: user.emailVerified,
      });
    } catch (error: any) {
      console.error("Test verification token error:", error);
      res.status(500).json({ message: "Failed to retrieve verification token" });
    }
  });
}

export default router;
