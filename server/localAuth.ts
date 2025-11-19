import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import connectPg from "connect-pg-simple";
import bcrypt from "bcrypt";
import multer from "multer";
import crypto from "crypto";
import { storage } from "./storage";
import { db } from "./db";
import { users, passwordResetTokens } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { Storage } from "@google-cloud/storage";
import { sendVerificationEmail } from "./services/emailVerificationService";

const SALT_ROUNDS = 10;

// Setup multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size
  },
});

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: sessionTtl,
    },
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  // Passport Local Strategy for login
  passport.use(
    new LocalStrategy(
      {
        usernameField: "email",
        passwordField: "password",
      },
      async (email, password, done) => {
        try {
          const [user] = await db
            .select()
            .from(users)
            .where(eq(users.email, email.toLowerCase()))
            .limit(1);

          if (!user) {
            return done(null, false, { message: "Invalid email or password" });
          }

          if (!user.password) {
            return done(null, false, { message: "Password not set. Please use 'Forgot Password' to set one." });
          }

          const isValid = await bcrypt.compare(password, user.password);
          if (!isValid) {
            return done(null, false, { message: "Invalid email or password" });
          }

          // Check email verification
          if (!user.emailVerified) {
            return done(null, false, { message: "Please verify your email address before logging in. Check your inbox for the verification link." });
          }

          // Check verification status
          if (user.verificationStatus === "pending") {
            return done(null, false, { message: "Your account is pending verification. Please wait for admin approval." });
          }

          if (user.verificationStatus === "rejected") {
            return done(null, false, { message: "Your account verification was rejected. Please contact support." });
          }

          return done(null, { id: user.id });
        } catch (error) {
          return done(error);
        }
      }
    )
  );

  passport.serializeUser((user: any, cb) => {
    // For Replit Auth users, serialize the full session object (includes tokens)
    // For local auth users, serialize just the ID
    if (user.claims || user.access_token) {
      cb(null, user);
    } else {
      cb(null, user.id);
    }
  });
  
  passport.deserializeUser(async (sessionData: any, cb) => {
    try {
      // Extract user ID from session data
      const id = typeof sessionData === 'string' ? sessionData : sessionData.id;
      
      // Always fetch fresh user data from database
      const dbUser = await storage.getUser(id);
      
      // If sessionData has tokens (Replit Auth), merge with database user
      if (typeof sessionData === 'object' && sessionData.claims) {
        // Merge database profile with token metadata
        cb(null, { ...dbUser, ...sessionData });
      } else {
        // Local auth - just return database user
        cb(null, dbUser);
      }
    } catch (error) {
      cb(error);
    }
  });

  // Signup route with file upload support
  app.post("/api/signup", upload.array("documents", 5), async (req, res) => {
    try {
      const { 
        email, password, firstName, lastName, role,
        contactNumber, streetAddress, city, postalCode, country,
        bankName, bankAccountNumber, bankAccountHolderName, bankSwiftCode
      } = req.body;
      const files = req.files as Express.Multer.File[];

      if (!email || !password || !firstName || !lastName || !role) {
        return res.status(400).json({ message: "All fields are required" });
      }

      if (!["buyer", "seller"].includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }

      if (password.length < 8) {
        return res.status(400).json({ message: "Password must be at least 8 characters" });
      }

      // Validate seller-specific requirements
      if (role === "seller") {
        // Verify documents are uploaded
        if (!files || files.length === 0) {
          return res.status(400).json({ message: "Verification documents are required for sellers" });
        }

        // Verify profile fields are provided
        if (!contactNumber || !streetAddress || !city || !postalCode || !country) {
          return res.status(400).json({ message: "Contact information is required for sellers" });
        }

        // Verify bank details are provided
        if (!bankName || !bankAccountNumber || !bankAccountHolderName) {
          return res.status(400).json({ message: "Bank details are required for sellers" });
        }
      }

      // Check if user already exists
      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.email, email.toLowerCase()))
        .limit(1);

      if (existingUser) {
        return res.status(400).json({ message: "Email already registered" });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

      // Store documents as base64 encoded data (only for sellers)
      let verificationDocumentUrl = null;
      if (files && files.length > 0) {
        const documentData = files.map((file) => ({
          name: file.originalname,
          type: file.mimetype,
          size: file.size,
          data: file.buffer.toString('base64'),
        }));
        verificationDocumentUrl = JSON.stringify(documentData);
      }

      // Create user with role and verification status
      // Buyers are auto-approved (can log in immediately)
      // Sellers need admin approval (must wait for document verification)
      const verificationStatus = role === "buyer" ? "approved" : "pending";
      
      // Prepare user data with seller profile fields if role is seller
      const userData: any = {
        email: email.toLowerCase(),
        password: hashedPassword,
        firstName,
        lastName,
        role: role as "buyer" | "seller" | "admin",
        verificationStatus,
        verificationDocumentUrl,
      };

      // Add seller profile fields if role is seller
      if (role === "seller") {
        userData.contactNumber = contactNumber;
        userData.streetAddress = streetAddress;
        userData.city = city;
        userData.postalCode = postalCode;
        userData.country = country;
        userData.bankName = bankName;
        userData.bankAccountNumber = bankAccountNumber;
        userData.bankAccountHolderName = bankAccountHolderName;
        userData.bankSwiftCode = bankSwiftCode || null;
      }
      
      const [newUser] = await db
        .insert(users)
        .values(userData)
        .returning();

      // Send verification email to new user
      try {
        await sendVerificationEmail(newUser.id, newUser.email, firstName);
      } catch (emailError) {
        console.error("Failed to send verification email:", emailError);
        // Don't fail the signup if email fails
      }

      res.json({ 
        id: newUser.id, 
        email: newUser.email, 
        role: newUser.role,
        message: "Account created! Please check your email to verify your account before logging in."
      });
    } catch (error: any) {
      console.error("Signup error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Login route
  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) {
        return res.status(500).json({ message: "Authentication error" });
      }
      if (!user) {
        return res.status(401).json({ message: info?.message || "Invalid credentials" });
      }
      req.login(user, (loginErr) => {
        if (loginErr) {
          return res.status(500).json({ message: "Login error" });
        }
        return res.json({ success: true });
      });
    })(req, res, next);
  });

  // Get current user
  app.get("/api/user", async (req, res) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const user = await storage.getUser((req.user as any).id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Logout route
  app.post("/api/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ message: "Logout error" });
      }
      res.json({ success: true });
    });
  });

  // Set password for existing users (migration helper)
  app.post("/api/set-password", async (req, res) => {
    try {
      const { email, newPassword } = req.body;

      if (!email || !newPassword) {
        return res.status(400).json({ message: "Email and new password are required" });
      }

      if (newPassword.length < 8) {
        return res.status(400).json({ message: "Password must be at least 8 characters" });
      }

      // Find user by email
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, email.toLowerCase()))
        .limit(1);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);

      // Update user password
      await db
        .update(users)
        .set({ password: hashedPassword })
        .where(eq(users.id, user.id));

      res.json({ success: true, message: "Password set successfully. You can now log in." });
    } catch (error) {
      console.error("Set password error:", error);
      res.status(500).json({ message: "Failed to set password" });
    }
  });

  // Forgot password - generate reset token
  app.post("/api/forgot-password", async (req, res) => {
    try {
      console.log("[Forgot Password] Request received:", { email: req.body.email });
      const { email } = req.body;

      if (!email) {
        console.log("[Forgot Password] No email provided");
        return res.status(400).json({ message: "Email is required" });
      }

      // Find user by email
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, email.toLowerCase()))
        .limit(1);

      console.log("[Forgot Password] User lookup result:", { found: !!user, email: email.toLowerCase() });

      if (!user) {
        // Don't reveal if email exists or not for security
        console.log("[Forgot Password] User not found, returning generic success");
        return res.json({ 
          success: true, 
          message: "If an account with that email exists, a password reset link will be provided." 
        });
      }

      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 3600000); // 1 hour from now

      console.log("[Forgot Password] Generated token for user:", { userId: user.id, tokenLength: resetToken.length });

      // Store reset token in database
      const [insertedToken] = await db.insert(passwordResetTokens).values({
        userId: user.id,
        token: resetToken,
        expiresAt,
      }).returning();

      console.log("[Forgot Password] Token inserted:", { tokenId: insertedToken?.id });

      // In production, this would send an email
      // For now, return the reset link to be displayed to the user
      const resetLink = `${req.protocol}://${req.get("host")}/reset-password?token=${resetToken}`;

      console.log("[Forgot Password] Sending response with resetLink");
      res.json({ 
        success: true, 
        message: "Password reset link generated.",
        resetLink, // Remove this in production when email is set up
      });
    } catch (error) {
      console.error("Forgot password error:", error);
      res.status(500).json({ message: "Failed to generate reset link" });
    }
  });

  // Reset password with token
  app.post("/api/reset-password", async (req, res) => {
    try {
      const { token, newPassword } = req.body;

      if (!token || !newPassword) {
        return res.status(400).json({ message: "Token and new password are required" });
      }

      if (newPassword.length < 8) {
        return res.status(400).json({ message: "Password must be at least 8 characters" });
      }

      // Find valid reset token
      const [resetToken] = await db
        .select()
        .from(passwordResetTokens)
        .where(
          and(
            eq(passwordResetTokens.token, token),
            eq(passwordResetTokens.used, false)
          )
        )
        .limit(1);

      if (!resetToken) {
        return res.status(400).json({ message: "Invalid or expired reset token" });
      }

      // Check if token is expired
      if (new Date() > new Date(resetToken.expiresAt)) {
        return res.status(400).json({ message: "Reset token has expired" });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);

      // Update user password
      await db
        .update(users)
        .set({ password: hashedPassword })
        .where(eq(users.id, resetToken.userId));

      // Mark token as used
      await db
        .update(passwordResetTokens)
        .set({ used: true })
        .where(eq(passwordResetTokens.id, resetToken.id));

      res.json({ success: true, message: "Password reset successfully. You can now log in." });
    } catch (error) {
      console.error("Reset password error:", error);
      res.status(500).json({ message: "Failed to reset password" });
    }
  });

  // Change password (for logged-in users)
  app.post("/api/change-password", isAuthenticated, async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      const userId = (req.user as any).id;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "Current password and new password are required" });
      }

      if (newPassword.length < 8) {
        return res.status(400).json({ message: "New password must be at least 8 characters" });
      }

      // Get user
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // If user doesn't have a password (signed up with Google), allow setting one
      if (user.password) {
        // Verify current password
        const isValid = await bcrypt.compare(currentPassword, user.password);
        if (!isValid) {
          return res.status(400).json({ message: "Current password is incorrect" });
        }
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);

      // Update user password
      await db
        .update(users)
        .set({ password: hashedPassword })
        .where(eq(users.id, userId));

      res.json({ success: true, message: "Password changed successfully" });
    } catch (error) {
      console.error("Change password error:", error);
      res.status(500).json({ message: "Failed to change password" });
    }
  });

  // Update user contact number (for all users - admin contact purposes)
  app.post("/api/update-user-contact", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const { userContactNumber } = req.body;

      // Update user contact number
      await db
        .update(users)
        .set({ userContactNumber: userContactNumber || null })
        .where(eq(users.id, userId));

      res.json({ success: true, message: "Contact number updated successfully" });
    } catch (error) {
      console.error("Update user contact error:", error);
      res.status(500).json({ message: "Failed to update contact number" });
    }
  });

  // Update seller profile (contact info and bank details)
  app.post("/api/update-seller-profile", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const {
        contactNumber,
        streetAddress,
        city,
        postalCode,
        country,
        bankName,
        bankAccountNumber,
        bankAccountHolderName,
        bankSwiftCode
      } = req.body;

      // Get user to verify they're a seller
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (user.role !== "seller") {
        return res.status(403).json({ message: "Only sellers can update profile information" });
      }

      // Validate required fields
      if (!contactNumber || !streetAddress || !city || !postalCode || !country ||
          !bankName || !bankAccountNumber || !bankAccountHolderName) {
        return res.status(400).json({ message: "All required fields must be provided" });
      }

      // Update user profile
      await db
        .update(users)
        .set({
          contactNumber,
          streetAddress,
          city,
          postalCode,
          country,
          bankName,
          bankAccountNumber,
          bankAccountHolderName,
          bankSwiftCode: bankSwiftCode || null,
        })
        .where(eq(users.id, userId));

      res.json({ success: true, message: "Profile updated successfully" });
    } catch (error) {
      console.error("Update seller profile error:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });
}

export const isAuthenticated: RequestHandler = (req, res, next) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
};
