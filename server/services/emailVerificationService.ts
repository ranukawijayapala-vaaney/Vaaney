import crypto from "crypto";
import { db } from "../db";
import { users } from "@shared/schema";
import { eq, and, gt } from "drizzle-orm";
import { sendEmail } from "./emailService";

export async function generateVerificationToken(): Promise<string> {
  return crypto.randomBytes(32).toString("hex");
}

export async function sendVerificationEmail(
  userId: string,
  email: string,
  firstName: string
): Promise<void> {
  const token = await generateVerificationToken();
  const expiryDate = new Date();
  expiryDate.setHours(expiryDate.getHours() + 24); // Token valid for 24 hours

  // Store token in database
  await db
    .update(users)
    .set({
      verificationToken: token,
      verificationTokenExpiry: expiryDate,
    })
    .where(eq(users.id, userId));

  // Get base URL - handle production and development environments correctly
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
  
  const verificationUrl = `${baseUrl}/verify-email?token=${token}`;

  // Brand constants
  const brandColor = "#217588";
  const logoUrl = `${baseUrl}/vaaney-logo.png`;
  
  // Send verification email
  const subject = "Verify Your Email - Vaaney Marketplace";
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; }
          .header { background-color: #f9fafb; padding: 24px; text-align: center; }
          .header img { height: 50px; width: auto; }
          .content { padding: 30px; }
          .button { display: inline-block; background-color: ${brandColor}; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; margin-top: 24px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 13px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <img src="${logoUrl}" alt="Vaaney" />
          </div>
          <div class="content">
            <h2 style="color: ${brandColor}; margin-top: 0;">Welcome to Vaaney!</h2>
            <p>Hello ${firstName},</p>
            <p>Thank you for creating an account with Vaaney Marketplace. To complete your registration and activate your account, please verify your email address by clicking the button below:</p>
            <p style="text-align: center;">
              <a href="${verificationUrl}" class="button" style="color: white;">Verify Email Address</a>
            </p>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: ${brandColor};">${verificationUrl}</p>
            <p><strong>This link will expire in 24 hours.</strong></p>
            <p>If you didn't create an account with Vaaney, please ignore this email.</p>
          </div>
          <div class="footer">
            <p style="margin: 0 0 8px 0;">&copy; ${new Date().getFullYear()} Vaaney Marketplace. All rights reserved.</p>
            <p style="margin: 0;">Connecting Maldivian buyers with trusted sellers.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  const text = `
Hello ${firstName},

Thank you for creating an account with Vaaney Marketplace. To complete your registration and activate your account, please verify your email address by clicking the link below:

${verificationUrl}

This link will expire in 24 hours.

If you didn't create an account with Vaaney, please ignore this email.

© ${new Date().getFullYear()} Vaaney Marketplace. All rights reserved.
  `;

  await sendEmail({
    to: email,
    subject,
    html,
    text,
  });
}

export async function verifyEmailToken(token: string): Promise<{ success: boolean; message: string; userId?: string }> {
  if (!token) {
    return { success: false, message: "Verification token is required" };
  }

  // Find user with matching token that hasn't expired
  const [user] = await db
    .select()
    .from(users)
    .where(
      and(
        eq(users.verificationToken, token),
        gt(users.verificationTokenExpiry, new Date())
      )
    )
    .limit(1);

  if (!user) {
    return { success: false, message: "Invalid or expired verification token" };
  }

  if (user.emailVerified) {
    return { success: false, message: "Email already verified" };
  }

  // Mark email as verified and clear token
  await db
    .update(users)
    .set({
      emailVerified: true,
      verificationToken: null,
      verificationTokenExpiry: null,
    })
    .where(eq(users.id, user.id));

  return { success: true, message: "Email verified successfully", userId: user.id };
}

export async function resendVerificationEmail(email: string): Promise<{ success: boolean; message: string }> {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email.toLowerCase()))
    .limit(1);

  if (!user) {
    return { success: false, message: "No account found with this email address" };
  }

  if (user.emailVerified) {
    return { success: false, message: "Email already verified" };
  }

  // Send new verification email
  await sendVerificationEmail(user.id, user.email, user.firstName || "User");

  return { success: true, message: "Verification email sent successfully" };
}
