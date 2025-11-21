# Production Database Migration Guide

## Issue Fixed
Bookings created with `bank_transfer` payment method were incorrectly being set to `pending_confirmation` status instead of `pending_payment`. This caused the admin payment confirmation endpoint to fail with the error: **"Booking is not awaiting payment confirmation"**.

## What Was Fixed in Code
1. **Backend (server/routes.ts)**: Updated booking creation endpoint to explicitly set `status: "pending_payment"` for bank_transfer bookings and `status: "pending_confirmation"` for IPG bookings.

## Production Migration Steps

### Step 1: Backup Database
Before running any migration, create a backup of the production database through the Replit database management interface.

### Step 2: Run Migration Script
The migration script `scripts/fixBookingStatuses.ts` has been created to update all existing bookings with incorrect status.

**To run on production:**

1. Open the Replit shell
2. Set environment to production:
   ```bash
   export NODE_ENV=production
   ```
3. Run the migration script:
   ```bash
   tsx scripts/fixBookingStatuses.ts
   ```

### Step 3: Verify Results
The script will output:
- Number of affected bookings found
- List of updated booking IDs with details
- Success/failure status

### What the Script Does
The migration script finds all bookings where:
- `paymentMethod = "bank_transfer"` AND
- `status = "pending_confirmation"`

And updates them to:
- `status = "pending_payment"`
- `updatedAt = current timestamp`

### Expected Impact
After running the migration:
- Admins will be able to confirm bank transfer payments for affected bookings
- The "Confirm Payment" button will work correctly in the admin transactions page
- Payment confirmation workflow will function as designed

## Rollback (If Needed)
If you need to rollback the changes:

```sql
UPDATE bookings 
SET status = 'pending_confirmation', updated_at = NOW()
WHERE payment_method = 'bank_transfer' 
AND status = 'pending_payment'
AND transfer_slip_object_path IS NOT NULL;
```

**Note**: Only rollback if there's a critical issue. The new status is the correct one for bank transfer bookings.

## Testing After Migration
1. Log in as admin to the production site
2. Navigate to Transactions page
3. Find a booking with bank_transfer payment method
4. Click "Confirm Payment" button
5. Verify success message appears
6. Verify booking status updates to "paid"
7. Verify buyer and seller receive payment confirmation notifications

## Future Prevention
The code fix ensures all NEW bookings created with bank_transfer will automatically get the correct `pending_payment` status. This migration only needs to run once to fix existing data.
