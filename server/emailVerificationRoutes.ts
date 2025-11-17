import { Router } from "express";
import { z } from "zod";
import { verifyEmailToken, resendVerificationEmail } from "./services/emailVerificationService";

const router = Router();

// GET /api/auth/verify-email?token=xxx - Verify email with token
router.get("/verify-email", async (req, res) => {
  try {
    const token = req.query.token as string;
    
    if (!token) {
      return res.status(400).json({ message: "Verification token is required" });
    }
    
    const result = await verifyEmailToken(token);
    
    if (!result.success) {
      return res.status(400).json({ message: result.message });
    }
    
    res.json({ message: result.message });
  } catch (error: any) {
    console.error("Email verification error:", error);
    res.status(500).json({ message: "Failed to verify email" });
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

export default router;
