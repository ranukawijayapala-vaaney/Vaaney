import { Router } from "express";
import bcrypt from "bcrypt";
import { z } from "zod";
import { db } from "./db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";

const router = Router();

const adminSetupSchema = z.object({
  setupKey: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
});

router.post("/admin-setup", async (req, res) => {
  try {
    // 1. Validate request body
    const data = adminSetupSchema.parse(req.body);

    // 2. Check if ADMIN_SETUP_KEY environment variable is set
    const setupKey = process.env.ADMIN_SETUP_KEY;
    if (!setupKey) {
      return res.status(500).json({ 
        message: "Admin setup is not configured. Please set ADMIN_SETUP_KEY environment variable." 
      });
    }

    // 3. Verify the setup key matches
    if (data.setupKey !== setupKey) {
      return res.status(403).json({ 
        message: "Invalid setup key. Please check your ADMIN_SETUP_KEY." 
      });
    }

    // 4. Check if any admin users already exist
    const existingAdmins = await db
      .select()
      .from(users)
      .where(eq(users.role, "admin"))
      .limit(1);

    if (existingAdmins.length > 0) {
      return res.status(403).json({ 
        message: "Admin setup has already been completed. An admin user already exists." 
      });
    }

    // 5. Check if email is already taken
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, data.email))
      .limit(1);

    if (existingUser.length > 0) {
      return res.status(400).json({ 
        message: "This email is already registered. Please use a different email." 
      });
    }

    // 6. Hash the password
    const hashedPassword = await bcrypt.hash(data.password, 10);

    // 7. Create the admin user
    const [newAdmin] = await db
      .insert(users)
      .values({
        email: data.email,
        password: hashedPassword,
        firstName: data.firstName,
        lastName: data.lastName,
        role: "admin",
        verificationStatus: "approved", // Admin is automatically approved
      })
      .returning();

    // 8. Return success (don't include sensitive data)
    res.json({ 
      message: "Admin account created successfully",
      user: {
        id: newAdmin.id,
        email: newAdmin.email,
        firstName: newAdmin.firstName,
        lastName: newAdmin.lastName,
        role: newAdmin.role,
      }
    });

  } catch (error: any) {
    console.error("Admin setup error:", error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        message: "Invalid request data",
        errors: error.errors 
      });
    }

    res.status(500).json({ 
      message: error.message || "Failed to create admin account" 
    });
  }
});

export default router;
