# Vaaney E-Marketplace Platform

## Overview
Vaaney is a full-stack e-commerce marketplace platform designed for the Maldivian market. It connects buyers with verified sellers of physical products and services, emphasizing trust and transparency through secure escrow-based payments, comprehensive seller verification, and robust commission management. The platform aims to provide a professional user experience and has significant potential in the Maldivian e-commerce sector. Key capabilities include role-based access, a secure payment system integrated with local banks, and extensive support for seller operations and customer interactions.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Monorepo Structure
The application uses a TypeScript monorepo with separate `client/` (React), `server/` (Express.js), and `shared/` (common types/schemas) directories for end-to-end type safety.

### Frontend Architecture
The frontend is built with React and TypeScript, using Vite, Wouter for routing, and TanStack Query for state management. The UI utilizes shadcn/ui (based on Radix UI and Tailwind CSS) for a responsive and theme-supported experience. Role-based layouts (Buyer, Seller, Admin) adapt the UI to user permissions.

### Backend Architecture
The backend is an Express.js server in TypeScript, exposing a REST API. Authentication uses Passport.js with two strategies: Local (email/password) and Google OAuth 2.0. Session management uses `express-session` with a PostgreSQL session store. A storage abstraction layer handles database interactions.

### Database Design
The platform employs Drizzle ORM with Neon Serverless PostgreSQL, following a schema-first approach validated by Zod. The database supports core e-commerce entities like users, products, services, orders, bookings, transactions, messaging, promotions, and password resets. Orders are structured at the variant level and grouped by `checkout_sessions` for atomic payment processing. The `variantId` field in orders is nullable to support custom quote purchases without standard variant selection, enabling fully customized product specifications.

The users table includes a `googleId` column (VARCHAR, UNIQUE) to segregate Google OAuth accounts while preserving UUID-based primary keys. This enables dual authentication support without conflicts between email/password and Google OAuth users.

### File Storage
Google Cloud Storage manages all user-uploaded files, such as verification documents and product images. The `@google-cloud/storage` library is used for interactions, authenticated via the Replit sidecar. Uppy provides the drag-and-drop file upload interface.

### UI/UX Decisions
The platform's UI/UX is built with shadcn/ui, Radix UI, and Tailwind CSS, providing a modern, responsive, and customizable interface. Distinct role-based layouts are a core design decision to cater to the specific needs of Buyers, Sellers, and Admins.

### Key Features
- **Authentication:** Dual authentication system supporting email/password (with bcrypt hashing and email verification) and Google OAuth 2.0 for buyers only. Email/password authentication is available for all user types (buyers, sellers, admins) with mandatory email verification before login access. Google OAuth users are automatically verified and stored with their Google subject ID in a separate `googleId` column. Token-based password reset available for email/password accounts only.
- **Messaging System:** A 3-way communication system (Buyer, Seller, Admin) with categorized messages, order/booking integration, attachments, and read statuses.
- **Booking Workflow:** A 6-step process prioritizing seller confirmation.
- **Payment System:** Supports IPG (with mock implementation) and manual Bank Transfer with administrative verification.
- **Seller Promotion:** Functionality for sellers to purchase promotional packages.
- **Aramex Shipping Integration:** Manages international shipments between Sri Lanka and Maldives, including cost calculation, admin-led consolidation, and tracking.
- **Role-Based Access Control:** Granular permissions for Buyers, Sellers, and Admins.
- **Seller Verification:** A workflow for document upload and administrative approval (pending, approved, rejected statuses).
- **Commission Management:** Administrative tools to configure commission rates per seller.
- **Buyer Shipping Address Management:** Buyers can manage multiple shipping addresses.
- **First-Time Buyer Onboarding:** Guides new buyers to complete profiles upon initial login.
- **Admin User Profile Management:** Admins can view user profiles and adjust seller commission rates.
- **Returns & Refunds System:** Workflow for buyers to initiate returns/refunds, including seller response, admin resolution, and automated refund processing with commission reversal.
- **Comprehensive Rating System:** Verified post-transaction rating system for orders and bookings (1-5 stars, comments, photo uploads).
- **Quote Request & Design Approval System:** Pre-purchase workflow for customized print products. Buyers can initiate quote requests (status="requested") which sellers then fulfill by providing pricing (status="sent"). The system automatically supersedes older quotes in the same conversation when sellers send updated pricing. Quotes support both standard variants and fully custom specifications (where variant selection is optional).
- **Direct Purchase Flow for Custom Quotes:** Accepted custom quotes can be purchased directly without adding to cart. The purchase dialog captures shipping address and payment method, calculates real-time shipping costs based on product weight and quantity, then creates orders/bookings immediately. Supports custom specifications without variant selection, with designApprovalId flowing through to the order for proper fulfillment. Service quotes create bookings while product quotes create orders. IPG payment creates redirect URL to payment gateway for immediate processing.
  - **Shipping Cost Calculation:** Uses `/api/quotes/:id/calculate-shipping` endpoint to calculate actual shipping costs when address is selected. For variant-based quotes, uses variant weight; for custom quotes without variants, uses product weight with 0.5kg default fallback. Applies $2.5/kg rate with $10 minimum, multiplied by quantity. Preview totals match final purchase totals exactly.
  - **Workflow Status Badges:** Conversation list displays "Quote Workflow" or "Design Workflow" badges based on workflow context. Context is automatically set when: (1) quotes are created, (2) design approvals are created, or (3) when viewing a conversation for a product/service that requires design approval. This provides visual indication of active workflows in conversations.
- **Seller Dashboards:** Dedicated interfaces for sellers to manage custom quote requests and design approvals. Sellers can create custom quotes with approved designs independently from variant selection, enabling maximum flexibility for custom specifications.
- **Buyer Design & Quote Management:** Three dedicated buyer dashboard pages:
  - **Design Approvals Page** (`/design-approvals`): View all design submissions with status filters (pending, approved, rejected, changes requested), type filters (products/services), and quick actions (view conversation, upload revision, view feedback).
  - **Custom Quotes Page** (`/quotes`): View all custom quote requests with accept/reject actions, status filters, and conversation access.
  - **Design Library Page** (`/design-library`): Browse approved designs with search functionality, "Buy Again" quick actions, and cross-variant reuse capability (pending implementation).
- **Shipping Workflow:** Admin-led consolidation for international shipments via Aramex.

## External Dependencies

### Database
- **Neon Serverless PostgreSQL:** Primary relational database service.
- **Drizzle ORM:** Type-safe database interactions.
- **connect-pg-simple:** PostgreSQL-backed session store.

### Authentication
- **Passport.js:** Authentication middleware supporting Local (email/password) and Google OAuth 2.0 strategies.
- **passport-google-oauth20:** Google OAuth 2.0 authentication strategy for buyers.
- **bcrypt:** Password hashing for email/password accounts.
- **express-session:** User session management.
- **Required Environment Variables:**
  - `GOOGLE_CLIENT_ID`: Google OAuth client ID (obtain from Google Cloud Console)
  - `GOOGLE_CLIENT_SECRET`: Google OAuth client secret (obtain from Google Cloud Console)
  - Google OAuth redirect URI: `https://[your-domain]/api/auth/google/callback`

### File Storage
- **Google Cloud Storage:** Cloud object storage for user uploads.
- **Uppy:** Modular file uploader.

### Shipping
- **Aramex Shipping Services API:** Integrated for international shipping operations and tracking.

### Email & Notifications
- **Resend:** Transactional email service for sending system notifications and email verification to users.
  - **Note:** **REQUIRED** `RESEND_API_KEY` environment variable to enable email verification (critical for email/password signup).
  - **Note:** Optional `FROM_EMAIL` environment variable (defaults to "Vaaney <noreply@vaaney.com>").
  - Until API key is provided, email sending fails and users cannot verify their accounts for email/password login.

### Other Libraries & Tools
- **React 18:** Core UI library.
- **Vite:** Frontend build tool.
- **TypeScript:** Used across the stack.
- **Wouter:** React router.
- **TanStack Query:** Data fetching and state management.
- **Radix UI, Tailwind CSS, shadcn/ui:** UI component libraries and styling.
- **Zod:** Schema declaration and validation.