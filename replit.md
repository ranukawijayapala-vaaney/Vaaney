# Vaaney E-Marketplace Platform

## Overview
Vaaney is a full-stack e-commerce marketplace platform designed for the Maldivian market. It connects buyers with verified sellers of physical products and services, emphasizing trust, transparency, and a professional user experience. The platform features secure escrow-based payments, comprehensive seller verification, robust commission management, role-based access, and integration with local payment systems. Vaaney aims to be a leading e-commerce solution in the Maldives.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Monorepo Structure
The application uses a TypeScript monorepo with `client/` (React), `server/` (Express.js), and `shared/` (common types/schemas) for end-to-end type safety.

### Frontend Architecture
Built with React, TypeScript, Vite, Wouter for routing, and TanStack Query for state management. The UI uses shadcn/ui (Radix UI and Tailwind CSS) for a responsive, theme-supported experience with role-based layouts (Buyer, Seller, Admin). Mobile optimization is a key focus, including responsive navigation, bottom navigation for buyers, touch accessibility, responsive dialogs, mobile-friendly data tables, and optimized forms and product displays.

### Backend Architecture
An Express.js server in TypeScript exposes a REST API. Authentication uses Passport.js with Local (email/password) and Google OAuth 2.0 strategies. Session management is handled by `express-session` with a PostgreSQL store.

### Database Design
Drizzle ORM with Neon Serverless PostgreSQL and Zod for schema validation. The database supports core e-commerce entities, with orders structured at the variant level and grouped by `checkout_sessions`. The `variantId` in orders is nullable to support custom quote purchases. User accounts support dual authentication via `googleId` while preserving UUID-based primary keys.

### File Storage
Google Cloud Storage manages user-uploaded files, authenticated via the Replit sidecar. Uppy provides the drag-and-drop upload interface.

### Key Features
- **Authentication:** Email/password (bcrypt, email verification) and Google OAuth 2.0 (for buyers).
- **Messaging System:** 3-way communication (Buyer, Seller, Admin) with attachments, read statuses, and real-time WebSocket updates. WebSocket server at /ws path with session-based authentication and conversation membership validation. Frontend uses useConversationWebSocket hook with auto-reconnect and deferred join for CONNECTING state.
- **Booking Workflow:** 6-step process prioritizing seller confirmation.
- **Payment System:** MPGS (Mastercard Payment Gateway Services) Hosted Checkout integration via Commercial Bank of Ceylon for real card payments (USD). Also supports manual Bank Transfer with admin verification. Backend creates MPGS sessions (`server/mpgs.ts`), frontend launches checkout via `client/src/lib/mpgs.ts`, and payment verification happens at `POST /api/payments/verify` by comparing `resultIndicator` to stored `successIndicator`. Schema stores `mpgsOrderId` and `successIndicator` on checkout_sessions, orders, bookings, and boost_purchases tables.
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
- **Quote Request & Design Approval System:** Pre-purchase workflow for customized products and services, allowing buyers to request quotes and sellers to provide pricing. Supports standard variants and custom specifications. Accepted quotes can be purchased/booked directly, calculating real-time shipping costs. Includes a design library for reusing approved designs. Service cards and detail pages show context-aware workflow buttons based on pre-purchase requirements. Service quote checkout uses quote's data (packageId, quotedPrice) as authoritative source for booking submission. Quote expiration dates validate YYYY-MM-DD format strictly.
- **Digital Delivery System:** Sellers upload deliverable files for completed bookings, which buyers access in-app and via email notifications. Files are securely stored in Google Cloud Storage.
- **Notification System:** Comprehensive in-app and email notifications for major events.
- **AI Assistant:** Provides role-specific assistance for guests, buyers, sellers, and admins, with knowledge of platform features and workflows. Accessible to all visitors.
- **Mobile Messaging:** Consistent mobile-responsive messaging experience across all roles with auto-scroll and quick reply template access.
- **Video Meeting System:** Twilio Video integration for buyer-seller consultations. Meetings can be proposed/confirmed/cancelled through conversations. Features include video/audio controls, screen sharing, and 15-minute early join window. Meeting events trigger in-app notifications, email alerts (with join links for confirmed meetings), and conversation messages for a complete audit trail.

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

### File Storage
- **Google Cloud Storage:** Cloud object storage.
- **Uppy:** Modular file uploader.

### Shipping
- **Aramex Shipping Services API:** International shipping operations.

### Email & Notifications
- **Resend:** Transactional email service for system notifications and email verification.

### Video Communication
- **Twilio Video:** Real-time video conferencing for buyer-seller meetings. Uses access tokens for secure room access.

### Other Libraries & Tools
- **React 18:** Core UI library.
- **Vite:** Frontend build tool.
- **TypeScript:** Across the stack.
- **Wouter:** React router.
- **TanStack Query:** Data fetching and state management.
- **Radix UI, Tailwind CSS, shadcn/ui:** UI component libraries and styling.
- **Zod:** Schema declaration and validation.