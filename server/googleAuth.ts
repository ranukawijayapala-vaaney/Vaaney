import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import type { Express } from "express";
import { db } from "./db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";
import { notifyWelcome, notifyAdminNewUser } from "./services/notificationService";

async function upsertGoogleUser(profile: any): Promise<{ user: any; isNewUser: boolean }> {
  const googleId = profile.id;
  const email = profile.emails?.[0]?.value;
  const firstName = profile.name?.givenName || "User";
  const lastName = profile.name?.familyName || "";
  const profileImageUrl = profile.photos?.[0]?.value;

  if (!email) {
    throw new Error("Email not provided by Google");
  }

  // Check if user exists by Google ID first
  const [existingByGoogleId] = await db
    .select()
    .from(users)
    .where(eq(users.googleId, googleId))
    .limit(1);

  if (existingByGoogleId) {
    // Update existing user's profile details
    const [updatedUser] = await db
      .update(users)
      .set({
        email,
        firstName,
        lastName,
        profileImageUrl,
        updatedAt: new Date(),
      })
      .where(eq(users.googleId, googleId))
      .returning();
    return { user: updatedUser, isNewUser: false };
  }

  // Fallback: check by email (handles pre-created accounts e.g. admin accounts)
  const [existingByEmail] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existingByEmail) {
    // Link the Google ID to the existing account and update profile
    const [updatedUser] = await db
      .update(users)
      .set({
        googleId,
        firstName: existingByEmail.firstName || firstName,
        lastName: existingByEmail.lastName || lastName,
        profileImageUrl: profileImageUrl || existingByEmail.profileImageUrl,
        emailVerified: true,
        updatedAt: new Date(),
      })
      .where(eq(users.email, email))
      .returning();
    return { user: updatedUser, isNewUser: false };
  }

  // Create new buyer account via Google Auth
  const [newUser] = await db
    .insert(users)
    .values({
      googleId,
      email,
      firstName,
      lastName,
      profileImageUrl,
      role: "buyer",
      verificationStatus: "approved",
      emailVerified: true,
      password: null,
    })
    .returning();

  return { user: newUser, isNewUser: true };
}

export function setupGoogleAuth(app: Express) {
  // Validate Google OAuth credentials
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    console.error("Google OAuth credentials not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables.");
    throw new Error("Google OAuth credentials missing");
  }

  // Build absolute callback URL for Google OAuth
  // Priority: Production URL > Dev Domain > Localhost
  let baseUrl: string;
  
  if (process.env.NODE_ENV === 'production' || process.env.REPLIT_DEPLOYMENT === '1') {
    // Production environment - use production domain
    baseUrl = process.env.PRODUCTION_URL || 'https://vaaney-marketplace.replit.app';
  } else if (process.env.REPLIT_DEV_DOMAIN) {
    // Development environment on Replit
    baseUrl = `https://${process.env.REPLIT_DEV_DOMAIN}`;
  } else {
    // Local development
    baseUrl = 'http://localhost:5000';
  }
  
  const callbackURL = `${baseUrl}/api/auth/google/callback`;

  console.log(`[Google OAuth] Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`[Google OAuth] Callback URL: ${callbackURL}`);

  // Google OAuth Strategy
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const { user, isNewUser } = await upsertGoogleUser(profile);
          
          // Send notifications for new users
          if (isNewUser) {
            const userName = `${user.firstName} ${user.lastName}`.trim();
            
            // Send welcome notification
            try {
              await notifyWelcome({
                userId: user.id,
                userName,
                userRole: "buyer",
              });
            } catch (notifyError) {
              console.error("Failed to send welcome notification for Google user:", notifyError);
            }
            
            // Notify admins about new user
            try {
              await notifyAdminNewUser({
                userName,
                userEmail: user.email,
                userRole: "buyer",
              });
            } catch (notifyError) {
              console.error("Failed to send admin notification for Google user:", notifyError);
            }
          }
          
          // Return only the user ID for session serialization
          done(null, { id: user.id });
        } catch (error) {
          done(error);
        }
      }
    )
  );

  // Google Auth login route for buyers
  app.get(
    "/api/auth/google",
    passport.authenticate("google", {
      scope: ["profile", "email"],
    })
  );

  // Google Auth callback
  app.get(
    "/api/auth/google/callback",
    passport.authenticate("google", {
      successReturnToOrRedirect: "/",
      failureRedirect: "/login?error=google_auth_failed",
    })
  );
}
