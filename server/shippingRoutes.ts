import type { Express } from "express";
import { db } from "./db";
import { shippingAddresses } from "@shared/schema";
import { eq, and, count, desc } from "drizzle-orm";
import { isAuthenticated } from "./localAuth";
import { insertShippingAddressSchema } from "@shared/schema";

// Middleware to ensure only buyers can access shipping address routes
function requireBuyer(req: any, res: any, next: any) {
  if (req.user?.role !== "buyer") {
    return res.status(403).json({ message: "Only buyers can manage shipping addresses" });
  }
  next();
}

export function setupShippingRoutes(app: Express) {
  // Get all shipping addresses for logged-in buyer
  app.get("/api/shipping-addresses", isAuthenticated, requireBuyer, async (req, res) => {
    try {
      const userId = (req.user as any).id;

      const addresses = await db
        .select()
        .from(shippingAddresses)
        .where(eq(shippingAddresses.userId, userId))
        .orderBy(desc(shippingAddresses.isDefault));

      res.json(addresses);
    } catch (error) {
      console.error("Get shipping addresses error:", error);
      res.status(500).json({ message: "Failed to fetch shipping addresses" });
    }
  });

  // Add new shipping address
  app.post("/api/shipping-addresses", isAuthenticated, requireBuyer, async (req, res) => {
    try {
      const userId = (req.user as any).id;

      // Check if user already has 10 addresses
      const [addressCount] = await db
        .select({ count: count() })
        .from(shippingAddresses)
        .where(eq(shippingAddresses.userId, userId));

      if (addressCount.count >= 10) {
        return res.status(400).json({ 
          message: "Maximum 10 shipping addresses allowed. Please delete an existing address to add a new one." 
        });
      }

      // Validate request body
      const validatedData = insertShippingAddressSchema.parse(req.body);

      // If this is marked as default, unset all other defaults for this user
      if (req.body.isDefault) {
        await db
          .update(shippingAddresses)
          .set({ isDefault: false })
          .where(eq(shippingAddresses.userId, userId));
      }

      // Insert new address
      const [newAddress] = await db
        .insert(shippingAddresses)
        .values({
          ...validatedData,
          userId,
          isDefault: req.body.isDefault || false,
        })
        .returning();

      res.json(newAddress);
    } catch (error: any) {
      console.error("Add shipping address error:", error);
      if (error.name === "ZodError") {
        return res.status(400).json({ 
          message: "Invalid data provided", 
          errors: error.errors 
        });
      }
      res.status(500).json({ message: "Failed to add shipping address" });
    }
  });

  // Update shipping address
  app.patch("/api/shipping-addresses/:id", isAuthenticated, requireBuyer, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const addressId = req.params.id;

      // Check if address exists and belongs to user
      const [existingAddress] = await db
        .select()
        .from(shippingAddresses)
        .where(
          and(
            eq(shippingAddresses.id, addressId),
            eq(shippingAddresses.userId, userId)
          )
        )
        .limit(1);

      if (!existingAddress) {
        return res.status(404).json({ message: "Shipping address not found" });
      }

      // Validate request body
      const validatedData = insertShippingAddressSchema.parse(req.body);

      // If this is being marked as default, unset all other defaults for this user
      if (req.body.isDefault && !existingAddress.isDefault) {
        await db
          .update(shippingAddresses)
          .set({ isDefault: false })
          .where(eq(shippingAddresses.userId, userId));
      }

      // Update address
      const [updatedAddress] = await db
        .update(shippingAddresses)
        .set({
          ...validatedData,
          isDefault: req.body.isDefault || false,
          updatedAt: new Date(),
        })
        .where(eq(shippingAddresses.id, addressId))
        .returning();

      res.json(updatedAddress);
    } catch (error: any) {
      console.error("Update shipping address error:", error);
      if (error.name === "ZodError") {
        return res.status(400).json({ 
          message: "Invalid data provided", 
          errors: error.errors 
        });
      }
      res.status(500).json({ message: "Failed to update shipping address" });
    }
  });

  // Delete shipping address
  app.delete("/api/shipping-addresses/:id", isAuthenticated, requireBuyer, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const addressId = req.params.id;

      // Check if address exists and belongs to user
      const [existingAddress] = await db
        .select()
        .from(shippingAddresses)
        .where(
          and(
            eq(shippingAddresses.id, addressId),
            eq(shippingAddresses.userId, userId)
          )
        )
        .limit(1);

      if (!existingAddress) {
        return res.status(404).json({ message: "Shipping address not found" });
      }

      // Delete address
      await db
        .delete(shippingAddresses)
        .where(eq(shippingAddresses.id, addressId));

      res.json({ success: true, message: "Shipping address deleted successfully" });
    } catch (error) {
      console.error("Delete shipping address error:", error);
      res.status(500).json({ message: "Failed to delete shipping address" });
    }
  });

  // Set address as default
  app.post("/api/shipping-addresses/:id/set-default", isAuthenticated, requireBuyer, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const addressId = req.params.id;

      // Check if address exists and belongs to user
      const [existingAddress] = await db
        .select()
        .from(shippingAddresses)
        .where(
          and(
            eq(shippingAddresses.id, addressId),
            eq(shippingAddresses.userId, userId)
          )
        )
        .limit(1);

      if (!existingAddress) {
        return res.status(404).json({ message: "Shipping address not found" });
      }

      // Unset all defaults for this user
      await db
        .update(shippingAddresses)
        .set({ isDefault: false })
        .where(eq(shippingAddresses.userId, userId));

      // Set this address as default
      await db
        .update(shippingAddresses)
        .set({ isDefault: true, updatedAt: new Date() })
        .where(eq(shippingAddresses.id, addressId));

      res.json({ success: true, message: "Default address updated successfully" });
    } catch (error) {
      console.error("Set default address error:", error);
      res.status(500).json({ message: "Failed to set default address" });
    }
  });
}
