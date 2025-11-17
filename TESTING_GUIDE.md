# Vaaney Marketplace - Comprehensive Testing Guide

## Test Accounts

### Buyer Account
- **Email:** buyer.test@vaaney.com
- **Password:** Test123!
- **Role:** Buyer
- **Profile:** Complete profile with shipping address

### Seller Account
- **Email:** seller.test@vaaney.com
- **Password:** Test123!
- **Role:** Seller
- **Status:** Verified and approved
- **Commission Rate:** 10%

## Test Data Overview

### Products (3 Total)
1. **Business Cards** (Design Approval Required)
   - Standard 100: $25.00
   - Premium 100: $35.00
   - Standard 250: $55.00
   - Premium 500: $95.00

2. **Custom T-Shirts** (Quote Required)
   - Small: $15.00
   - Medium: $15.00
   - Large: $15.00
   - Extra Large: $17.00

3. **Wedding Invitations** (Design Approval + Quote Available)
   - Standard 50: $80.00
   - Premium 50: $120.00
   - Standard 100: $140.00
   - Premium 100: $200.00

### Services (3 Total)
1. **Logo Design** (Design Approval Required)
   - Basic Logo: $150.00
   - Standard Logo: $250.00
   - Premium Logo: $400.00

2. **Website Development** (Quote Required)
   - Starter Website: $800.00
   - Business Website: $1500.00
   - E-Commerce Website: $3000.00

3. **Branding Package** (Design Approval + Quote Available)
   - Branding Essentials: $500.00
   - Complete Branding: $1200.00
   - Enterprise Branding: $2500.00

## Testing Scenarios

### Scenario 1: Design Approval Workflow (Product)

**Objective:** Test the design upload and approval process for products requiring design approval.

**Steps:**
1. Login as **Buyer** (buyer.test@vaaney.com)
2. Navigate to **Marketplace** → **Business Cards**
3. Select variant: **Standard 100** ($25.00)
4. Notice "Upload Design Required" message - no "Add to Cart" button yet
5. Click **"Contact Seller"** button
6. In the messaging interface:
   - Write a message: "I would like to order business cards. Please review my design."
   - Click **"Attach Files"** button
   - Upload a design file (PDF, PNG, or AI format)
7. Wait for seller approval (or switch to seller account to approve)
8. **As Seller** (seller.test@vaaney.com):
   - Go to **Messages**
   - Open the conversation
   - Review the uploaded design in the **Workflow Panel** (right sidebar)
   - Click **"Approve Design"**
9. **As Buyer** (switch back):
   - Refresh the **Business Cards** product page
   - Notice "Design Approved" status and **"Add to Cart"** button is now available
   - Click **"Add to Cart"**
10. Proceed to checkout

**Expected Results:**
- Design approval prevents cart addition until approved
- After approval, "Add to Cart" button appears
- Approved design is reusable for future purchases

---

### Scenario 2: Quote Request Workflow (Product)

**Objective:** Test the custom quote request process for products requiring quotes.

**Steps:**
1. Login as **Buyer**
2. Navigate to **Marketplace** → **Custom T-Shirts**
3. Select variant: **Medium** ($15.00)
4. Notice "Get Quote" option is available
5. Click **"Request Quote"**
6. In the messaging interface:
   - Write your custom requirements: "I need 50 custom t-shirts with my company logo"
   - Click **"Attach Files"** to upload reference images
7. **As Seller**:
   - Go to **Messages** → Open the quote conversation
   - In **Workflow Panel**, click **"Send Quote"**
   - Enter custom price: $750.00 (50 × $15.00)
   - Add notes: "Price includes custom printing for 50 units"
   - Submit quote
8. **As Buyer**:
   - View the quote in the conversation
   - Click **"Accept Quote"**
   - Add to cart with the quoted price

**Expected Results:**
- Quote request creates a messaging conversation
- Seller can provide custom pricing
- Buyer can accept and add quoted items to cart

---

### Scenario 3: Both Design Approval + Quote (Product)

**Objective:** Test products that support both design approval and quote workflows.

**Steps:**
1. Login as **Buyer**
2. Navigate to **Marketplace** → **Wedding Invitations**
3. Notice two purchase options:
   - **Option A:** Select variant + Upload design → Get approval → Add to cart
   - **Option B:** Request custom quote → Get quote → Accept → Add to cart
4. Test **Option A** (Design Approval):
   - Select **Premium 50** ($120.00)
   - Click **"Contact Seller"** → Upload design
   - Get approval from seller
   - Add to cart
5. Test **Option B** (Quote):
   - Click **"Request Quote"**
   - Describe custom needs: "Need 200 invitations with gold foil"
   - Get quote from seller
   - Accept and add to cart

**Expected Results:**
- Product supports both workflows
- Buyer can choose which workflow to use
- Each workflow follows its own approval/quote process

---

### Scenario 4: Service Booking with Design Approval

**Objective:** Test service booking requiring design approval.

**Steps:**
1. Login as **Buyer**
2. Navigate to **Services** → **Logo Design**
3. Select package: **Standard Logo** ($250.00)
4. Notice "Upload Design Required" for design approval
5. Click **"Contact Seller"** → Upload design brief/references
6. **As Seller**: Review and approve the design brief
7. **As Buyer**: 
   - Click **"Book Service"**
   - Select date and time
   - Add booking notes
   - Proceed to checkout

**Expected Results:**
- Design approval required before booking
- Booking form includes date/time selection
- Service booking creates a separate booking entity (not an order)

---

### Scenario 5: Service Booking with Quote

**Objective:** Test service booking requiring custom quote.

**Steps:**
1. Login as **Buyer**
2. Navigate to **Services** → **Website Development**
3. Select package: **Business Website** ($1500.00)
4. Click **"Request Quote"**
5. Describe requirements: "Need e-commerce features and payment gateway"
6. **As Seller**: Send custom quote: $2200.00
7. **As Buyer**: Accept quote and book service

**Expected Results:**
- Quote request for services works similar to products
- Custom pricing overrides package price
- Booking proceeds with quoted amount

---

### Scenario 6: Cart and Checkout (Bank Transfer)

**Objective:** Test the complete checkout process with bank transfer payment.

**Steps:**
1. Login as **Buyer**
2. Add items to cart (from previous scenarios)
3. Click **Cart** icon (top right)
4. Review cart items:
   - Verify product/service details
   - Verify quantities and prices
   - Verify total amount
5. Click **"Proceed to Checkout"**
6. Review order summary
7. Select payment method: **Bank Transfer**
8. Click **"Confirm Order"** or **"Confirm Booking"**
9. You'll be redirected to payment instructions page:
   - **Bank Name:** Bank of Maldives (BML)
   - **Account Number:** 7730000012345
   - **Account Name:** Vaaney Marketplace
   - **Reference:** Your order/booking ID
10. Upload bank transfer slip:
    - Click **"Upload Transfer Slip"**
    - Select image file of transfer receipt
    - Submit

**Expected Results:**
- Cart correctly calculates totals
- Checkout creates order/booking in "pending_payment" status
- After slip upload, status changes to "paid" (waiting admin verification)

---

### Scenario 7: Admin Payment Verification

**Objective:** Test admin verification of bank transfer payments.

**Steps:**
1. Login as **Admin** (you'll need admin access)
2. Navigate to **Admin** → **Transactions**
3. Find transactions with status: **"Pending Verification"**
4. Review uploaded transfer slip image
5. Verify:
   - Transfer amount matches order/booking amount
   - Bank account details are correct
   - Reference number is valid
6. Actions:
   - **Approve**: Changes order status to "processing" and transaction to "verified"
   - **Reject**: Request buyer to re-upload correct slip

**Expected Results:**
- Admin can view all pending payment verifications
- Transfer slip images are displayed
- Approval triggers order processing

---

### Scenario 8: Order Tracking (Buyer)

**Objective:** Test order tracking from buyer's perspective.

**Steps:**
1. Login as **Buyer**
2. Navigate to **My Orders**
3. View orders in different statuses:
   - **Pending Payment:** Upload transfer slip
   - **Paid:** Waiting for admin verification
   - **Processing:** Seller is preparing order
   - **Shipped:** Order is in transit (with tracking)
   - **Delivered:** Order received (can rate)
4. Click on an order to view details:
   - Order items and quantities
   - Shipping address
   - Payment information
   - Transaction status
   - Tracking information (if shipped)
5. For **delivered** orders:
   - Notice **"Rate Order"** button
   - Click to leave rating

**Expected Results:**
- All orders are visible with current status
- Order details show complete information
- Delivered orders show rating option

---

### Scenario 9: Booking Management (Buyer & Seller)

**Objective:** Test booking workflow from request to completion.

**Steps:**

**As Buyer:**
1. Navigate to **My Bookings**
2. View bookings in different statuses:
   - **Pending:** Waiting for seller confirmation
   - **Confirmed:** Seller accepted, waiting for payment
   - **In Progress:** Payment verified, service in progress
   - **Completed:** Service finished (can rate)
3. For **confirmed** bookings: Upload payment slip
4. For **completed** bookings: Rate the service

**As Seller:**
1. Navigate to **My Bookings** (seller view)
2. View pending booking requests
3. Review booking details (date, time, package)
4. Actions:
   - **Confirm:** Accept booking and generate payment link
   - **Reject:** Decline with reason
5. For **in progress** bookings:
   - Update status as you complete milestones
   - Mark as **completed** when finished

**Expected Results:**
- Booking requires seller confirmation before payment
- Payment verification transitions to "in progress"
- Completion enables buyer rating

---

### Scenario 10: Rating System

**Objective:** Test the verified rating system for orders and bookings.

**Steps:**

**Rating an Order:**
1. Login as **Buyer**
2. Navigate to **My Orders**
3. Find an order with status: **"Delivered"**
4. Click **"Rate Order"** button
5. Rate 1-5 stars
6. Add optional comment: "Excellent quality! Fast delivery."
7. Upload optional photos (max 5)
8. Submit rating

**Rating a Booking:**
1. Navigate to **My Bookings**
2. Find a booking with status: **"Completed"**
3. Click **"Rate Service"** button
4. Rate 1-5 stars
5. Add comment: "Professional work and good communication."
6. Submit rating

**Viewing Ratings (as Seller):**
1. Login as **Seller**
2. Navigate to **Dashboard** → **Ratings**
3. View all ratings received
4. Filter by star rating
5. View rating details (comment, photos, date)

**Expected Results:**
- Ratings only available for delivered orders and completed bookings
- Each order/booking can only be rated once
- Ratings are visible on seller profile and product/service pages

---

### Scenario 11: Returns & Refunds (Order)

**Objective:** Test the return request workflow for physical product orders.

**Steps:**

**Buyer Initiates Return:**
1. Login as **Buyer**
2. Navigate to **My Orders**
3. Find a **delivered** order
4. Click **"Request Return"** button
5. Fill return request form:
   - **Reason:** Defective
   - **Description:** "Cards arrived with smudged printing"
   - Upload evidence photos
   - **Requested Refund Amount:** $55.00 (full refund)
6. Submit request

**Seller Responds:**
1. Login as **Seller**
2. Navigate to **Returns & Refunds**
3. View pending return request
4. Review evidence photos
5. Options:
   - **Approve:** Accept return and propose refund amount
   - **Reject:** Decline with explanation
6. If approving:
   - Enter proposed refund: $55.00
   - Add response: "We apologize for the quality issue. Full refund approved."
   - Submit

**Admin Processes:**
1. Login as **Admin**
2. Navigate to **Returns & Refunds**
3. Review seller-approved return
4. Verify evidence
5. Click **"Process Refund"**
6. Refund is issued:
   - Transaction commission is reversed
   - Buyer receives refund notification

**Expected Results:**
- Return can only be requested for delivered orders
- Seller can approve/reject/negotiate refund amount
- Admin oversight ensures fair resolution
- Commission reversal happens automatically

---

### Scenario 12: Refunds (Booking)

**Objective:** Test refund request workflow for service bookings.

**Steps:**

**Buyer Requests Refund:**
1. Login as **Buyer**
2. Navigate to **My Bookings**
3. Find a **completed** booking
4. Click **"Request Refund"** button
5. Fill refund request:
   - **Reason:** Not as described
   - **Description:** "Logo design didn't match the brief despite multiple revisions"
   - **Requested Refund:** $400.00
6. Submit

**Workflow:**
- Follows same seller → admin approval process as order returns
- Seller can approve/reject/negotiate
- Admin reviews and processes refund
- Commission reversed upon approval

**Expected Results:**
- Refund process similar to returns but for services
- Both parties (buyer/seller) can communicate through system
- Fair resolution with admin oversight

---

### Scenario 13: Messaging System

**Objective:** Test the comprehensive 3-way messaging system.

**Steps:**

**Pre-Purchase Messaging:**
1. Login as **Buyer**
2. Browse any product or service
3. Click **"Contact Seller"** (before purchase)
4. Start conversation:
   - Subject is auto-generated
   - Write message: "Do you offer rush delivery?"
   - Attach files if needed
5. **As Seller**: Respond to inquiry

**Order/Booking Support:**
1. **As Buyer**: Navigate to **My Orders** or **My Bookings**
2. Click on an order/booking
3. Click **"Message Seller"** button
4. Conversation is linked to that specific order/booking
5. Discuss delivery, status updates, issues, etc.

**Admin Involvement:**
1. Buyers and sellers can escalate to admin
2. Admin can join any conversation
3. All parties can see message history

**Message Features:**
- Real-time updates
- File attachments (designs, receipts, photos)
- Read/unread status
- Conversation categorization (pre-purchase, order, booking, return)

**Expected Results:**
- Messages organized by conversation type
- Context-aware (linked to products/services/orders/bookings)
- Support for file attachments
- Admin can moderate and intervene

---

### Scenario 14: Design Approval - Submit New Design

**Objective:** Test the ability to replace an approved design with a new one.

**Steps:**
1. Login as **Buyer**
2. Navigate to product with approved design (e.g., **Business Cards**)
3. Notice "Design Approved ✓" status
4. Click **"Submit New Design"** button
5. In messaging interface:
   - Upload new design file
   - Add note: "Updated design with new company colors"
6. **As Seller**: Review and approve new design
7. **As Buyer**: Previous approval is replaced with new approval
8. Can now add to cart with the new design

**Expected Results:**
- Buyers can replace approved designs
- Replacement follows same approval workflow
- New design replaces old design in system
- Reusable for future orders

---

### Scenario 15: Quote Acceptance and Cart Addition

**Objective:** Test adding custom-quoted items to cart.

**Steps:**
1. Have an accepted quote (from Scenario 2 or 5)
2. In the conversation, locate the **approved quote**
3. Click **"Add to Cart"** on the quote
4. Navigate to **Cart**
5. Verify:
   - Item shows custom quote price (not standard price)
   - Quantity is as quoted
   - Quote reference is included
6. Proceed to checkout with quoted price

**Expected Results:**
- Quoted items use custom pricing
- Cart correctly displays quote details
- Checkout processes quoted amount

---

## Admin: View Seller Verification Documents

### Objective
Test that admins can view seller verification documents uploaded during signup.

### Test Steps
1. Log in as admin account (admin.test@vaaney.com / Test123!)
2. Navigate to Admin Dashboard
3. Click on "Verifications" in the sidebar
4. Locate seller.test@vaaney.com in the pending verifications list
5. Click the "View Document" button
6. Verify the dialog opens showing:
   - Document filename: "business_license.jpg"
   - Document preview image (1x1 pixel test image)
   - Document metadata (type: image/jpeg, size: 15678 bytes)

### Expected Results
- Document preview dialog displays successfully
- Image renders without errors
- Admin can close the dialog

### Technical Details
- Backend endpoint: GET `/api/admin/verification-document/:userId`
- Documents stored as base64-encoded JSON in `users.verificationDocumentUrl`
- Frontend expects response: `{ documents: [{name, type, size, data}] }`

---

## Seller: View Own Verification Documents in Profile

### Objective
Test that sellers can view their own verification documents from their profile page.

### Test Steps
1. Log in as seller account (seller.test@vaaney.com / Test123!)
2. Navigate to Profile page (click profile icon/link)
3. Scroll down to "Verification Documents" section
4. Verify the section shows:
   - Number of documents on file (1 document)
   - Document names displayed as badges ("business_license.jpg")
   - "View Documents" button
5. Click the "View Documents" button
6. Verify the dialog opens showing:
   - Document filename: "business_license.jpg"
   - Document preview image (1x1 pixel test image)
   - Document metadata (type: image/jpeg, size: 15678 bytes)
7. Click "Close" to dismiss the dialog

### Expected Results
- Verification Documents section is visible for sellers who have uploaded documents
- Documents are correctly listed with filenames
- Preview dialog displays documents with proper formatting
- Images render correctly as base64-encoded data
- Dialog can be closed successfully

### Technical Details
- Backend endpoint: GET `/api/my-verification-documents`
- Only requires authentication (no admin role needed)
- Returns user's own documents from `users.verificationDocumentUrl`
- Frontend component: Profile.tsx with verification documents card and preview dialog

---

## Test Data Summary

### Existing Orders
- **Order 1** (Pending Payment): Business Cards - Standard 100 ($25.00)
- **Order 2** (Paid - Awaiting Verification): Business Cards - Premium 100 ($35.00)
- **Order 3** (Processing): Wedding Invitations - Basic 50 ($50.00)
- **Order 4** (Shipped - With Tracking): Wedding Invitations - Premium 50 ($75.00)
- **Order 5** (Delivered - Can Rate): Business Cards - Standard 250 ($55.00)
- **Order 6** (Delivered - Already Rated): Custom T-Shirt Medium ($15.00)

### Existing Bookings
- **Booking 1** (Pending): Logo Design - Basic ($150.00)
- **Booking 2** (Confirmed - Needs Payment): Logo Design - Standard ($250.00)
- **Booking 3** (In Progress): Website Development - Starter ($800.00)
- **Booking 4** (Completed - Already Rated): Branding Package - Essentials ($500.00)
- **Booking 5** (Completed - Has Refund Request): Logo Design - Premium ($400.00)

### Existing Ratings
- **Order Rating**: Custom T-Shirt (5 stars - "Excellent quality!")
- **Booking Rating**: Branding Package (4 stars - "Great branding package")

### Existing Return/Refund Requests
- **Return Request**: Order #3 (Business Cards - Defective) - Status: Requested
- **Refund Request**: Booking #5 (Logo Design - Not as described) - Status: Under Review (Seller Approved)

### Existing Conversations
1. **Pre-Purchase Product**: Business Cards - Design Approval discussion
2. **Pre-Purchase Service**: Logo Design - Custom quote discussion
3. **Order Support**: Order #2 - Payment verification inquiry
4. **Booking Support**: Booking #3 - Website Development progress updates
5. **Return/Refund**: Order #3 - Return request for defective Business Cards

---

## Tips for Testing

1. **Use Browser DevTools**: Monitor network requests and console logs for errors
2. **Test Responsiveness**: Try on different screen sizes (mobile, tablet, desktop)
3. **Clear Browser Cache**: If you encounter stale data
4. **Check Email Notifications**: (If implemented) Verify emails are sent for status changes
5. **Test Edge Cases**:
   - Empty cart checkout
   - Invalid file uploads
   - Duplicate ratings
   - Return requests on non-delivered orders
6. **Performance Testing**: Add multiple items to cart and complete checkout
7. **Security Testing**: Try accessing other users' data (should be prevented)

---

## Troubleshooting

### Can't Login
- Verify credentials: buyer.test@vaaney.com / Test123!
- Clear browser cookies and cache
- Check if database is running

### Design Approval Not Working
- Ensure file is in supported format (PDF, PNG, AI, PSD)
- Check file size (must be under upload limit)
- Verify seller has approved the design in messaging interface

### Payment Slip Upload Fails
- File size must be under 5MB
- Supported formats: JPG, PNG, PDF
- Check network connection

### Order/Booking Not Showing
- Verify transaction was completed
- Check if payment slip was uploaded
- Wait for admin verification (24-48 hours in real scenario)

---

## Next Steps

After testing all scenarios, you should have:
1. ✅ Verified design approval workflow
2. ✅ Verified quote request and acceptance
3. ✅ Verified cart and checkout process
4. ✅ Verified bank transfer payment flow
5. ✅ Verified order and booking tracking
6. ✅ Verified rating system
7. ✅ Verified returns and refunds
8. ✅ Verified messaging system

**Report any bugs or issues found during testing for immediate resolution.**

---

## Contact Support

For testing assistance or to report issues:
- Create a support ticket in the admin panel
- Contact the development team
- Check documentation for known issues

---

**Happy Testing! 🎉**
