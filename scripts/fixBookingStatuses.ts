import { db } from "../server/db";
import { bookings } from "../shared/schema";
import { eq, and } from "drizzle-orm";

/**
 * Migration script to fix booking statuses for bank transfer payments
 * 
 * Issue: Bookings created with bank_transfer payment method were incorrectly
 * set to "pending_confirmation" status instead of "pending_payment".
 * 
 * This script updates all bank_transfer bookings that are currently in
 * "pending_confirmation" status to "pending_payment" status.
 */

async function fixBookingStatuses() {
  console.log("🔍 Checking for bookings with incorrect status...");
  
  try {
    // Find all bookings with bank_transfer payment method and pending_confirmation status
    const affectedBookings = await db.query.bookings.findMany({
      where: and(
        eq(bookings.paymentMethod, "bank_transfer"),
        eq(bookings.status, "pending_confirmation")
      ),
    });
    
    console.log(`📊 Found ${affectedBookings.length} bookings to fix`);
    
    if (affectedBookings.length === 0) {
      console.log("✅ No bookings need fixing. All statuses are correct!");
      return;
    }
    
    // Update the bookings to pending_payment status
    const result = await db
      .update(bookings)
      .set({ 
        status: "pending_payment",
        updatedAt: new Date()
      })
      .where(
        and(
          eq(bookings.paymentMethod, "bank_transfer"),
          eq(bookings.status, "pending_confirmation")
        )
      )
      .returning();
    
    console.log(`✅ Successfully updated ${result.length} bookings to pending_payment status`);
    console.log("\nUpdated booking IDs:");
    result.forEach(booking => {
      console.log(`  - ${booking.id} (Service: ${booking.serviceId}, Amount: $${booking.amount})`);
    });
    
  } catch (error) {
    console.error("❌ Error fixing booking statuses:", error);
    throw error;
  }
}

// Run the migration
fixBookingStatuses()
  .then(() => {
    console.log("\n✅ Migration completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Migration failed:", error);
    process.exit(1);
  });
