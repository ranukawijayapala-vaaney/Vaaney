# Vaaney E-Marketplace Platform

## Overview
Vaaney is a full-stack e-commerce marketplace platform for the Maldivian market, connecting buyers with verified sellers of physical products and services. It emphasizes trust, transparency, and a professional user experience through secure escrow-based payments, comprehensive seller verification, and robust commission management. Key capabilities include role-based access, a secure payment system integrated with local banks, and extensive support for seller operations and customer interactions, positioning it for significant growth in the Maldivian e-commerce sector.

## User Preferences
Preferred communication style: Simple, everyday language.

## Recent Changes (November 24, 2025)
### Mobile Messaging Improvements
- **Auto-Scroll Feature**: Implemented automatic scrolling to latest messages in MessageThread component using useRef and scrollIntoView - messages now auto-scroll to bottom when conversation opens
- **Seller Mobile Layout**: Updated SellerMessages page with mobile-responsive layout - conversation list hides when chat is open, shows back button, and displays full-screen thread (matches buyer pattern)
- **Admin Mobile Layout**: Updated AdminConversations page with same mobile pattern - conditional hiding, back button navigation, and full-screen message view
- **Admin Template Access**: Added quick reply template selector to admin mobile header to ensure template functionality is accessible on mobile devices (data-testid="select-quick-reply-mobile")
- **Mobile Pattern**: All roles now use consistent mobile messaging experience with `calc(100vh - 220px)` height, `hidden xl:flex` conditional display, and ArrowLeft back button
- **Desktop Unchanged**: 3-column grid layouts preserved for desktop views (>= 1280px width)

### AI Assistant Improvements (November 23, 2025)
- **Button Styling**: Changed AI assistant floating button from teal to vibrant lime green (#bcd42f) for better visibility and brand consistency
- **Position**: Button positioned in bottom right corner (70px size) with pulsing animation
- **Chat Panel**: Opens cleanly above the button without overlapping header
- **Bug Fixes**: Fixed 500 errors in chat endpoint by correcting property access (product.price, service.requiresQuote, booking.amount, order.totalAmount/unitPrice)

## System Architecture

### Monorepo Structure
The application uses a TypeScript monorepo with `client/` (React), `server/` (Express.js), and `shared/` (common types/schemas) directories for end-to-end type safety.

### Frontend Architecture
Built with React and TypeScript, using Vite, Wouter for routing, and TanStack Query for state management. The UI utilizes shadcn/ui (Radix UI and Tailwind CSS) for a responsive, theme-supported experience, with role-based layouts (Buyer, Seller, Admin). Mobile optimization includes responsive navigation, bottom navigation for buyers, touch accessibility, responsive dialogs, mobile-friendly data tables, and optimized forms and product displays.

### Backend Architecture
An Express.js server in TypeScript, exposing a REST API. Authentication uses Passport.js with Local (email/password) and Google OAuth 2.0 strategies. Session management uses `express-session` with a PostgreSQL store.

### Database Design
Drizzle ORM with Neon Serverless PostgreSQL and Zod for schema validation. Supports core e-commerce entities, with orders structured at the variant level and grouped by `checkout_sessions`. The `variantId` in orders is nullable to support custom quote purchases. User accounts support dual authentication via `googleId` while preserving UUID-based primary keys.

### File Storage
Google Cloud Storage manages user-uploaded files, authenticated via the Replit sidecar. Uppy provides the drag-and-drop upload interface.

### Key Features
- **Authentication:** Dual system with email/password (bcrypt, email verification) and Google OAuth 2.0 (for buyers only).
- **Messaging System:** 3-way communication (Buyer, Seller, Admin) with attachments and read statuses.
- **Booking Workflow:** 6-step process prioritizing seller confirmation.
- **Payment System:** Supports IPG (mock) and manual Bank Transfer with admin verification.
- **Seller Promotion:** Functionality for sellers to purchase promotional packages.
- **Aramex Shipping Integration:** Manages international shipments, cost calculation, consolidation, and tracking.
- **Role-Based Access Control:** Granular permissions for Buyers, Sellers, and Admins.
- **Seller Verification:** Workflow for document upload and administrative approval.
- **Commission Management:** Administrative tools for configuring commission rates.
- **Buyer Shipping Address Management:** Buyers can manage multiple addresses.
- **First-Time Buyer Onboarding:** Guides new buyers to complete profiles.
- **Admin User Profile Management:** Admins can view profiles and adjust seller commission rates.
- **Returns & Refunds System:** Workflow for buyer-initiated returns/refunds, seller response, admin resolution, and automated refunds with commission reversal.
- **Rating System:** Verified post-transaction rating for orders and bookings (1-5 stars, comments, photo uploads).
- **Quote Request & Design Approval System:** Pre-purchase workflow for customized products and services, allowing buyers to request quotes and sellers to provide pricing, supporting standard variants and custom specifications. Accepted quotes can be purchased/booked directly, calculating real-time shipping costs. Includes design library for reusing approved designs across variants.
  - **Service Workflow Guidance:** Service cards and detail pages show context-aware workflow buttons (Upload Design, Request Quote, Book Now) based on pre-purchase requirements. Backend enriches service data with approval status (hasApprovedDesign, hasAcceptedQuote) for authenticated buyers. Color-coded workflow alerts guide buyers through combined design + quote requirements with step-by-step instructions and visual status badges.
- **Digital Delivery System:** Sellers upload deliverable files for completed bookings, which buyers access in-app and via email notifications. Files are securely stored in Google Cloud Storage.
- **Notification System:** Comprehensive system with in-app (bell icon) and email notifications for major events.

## External Dependencies

### Database
- **Neon Serverless PostgreSQL:** Primary relational database.
- **Drizzle ORM:** Type-safe database interactions.
- **connect-pg-simple:** PostgreSQL-backed session store.

### Authentication
- **Passport.js:** Authentication middleware.
- **passport-google-oauth20:** Google OAuth 2.0 strategy.
- **bcrypt:** Password hashing.
- **express-session:** User session management.
- **Environment Variables:** `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`.

### File Storage
- **Google Cloud Storage:** Cloud object storage.
- **Uppy:** Modular file uploader.

### Shipping
- **Aramex Shipping Services API:** International shipping operations.

### Email & Notifications
- **Resend:** Transactional email service for system notifications and email verification.
- **Environment Variables:** `RESEND_API_KEY` (required), `FROM_EMAIL` (optional).

### Admin Initialization
- **Environment Variable:** `ADMIN_INIT_TOKEN` (required for `/api/admin/initialize` endpoint).

### Other Libraries & Tools
- **React 18:** Core UI library.
- **Vite:** Frontend build tool.
- **TypeScript:** Across the stack.
- **Wouter:** React router.
- **TanStack Query:** Data fetching and state management.
- **Radix UI, Tailwind CSS, shadcn/ui:** UI component libraries and styling.
- **Zod:** Schema declaration and validation.