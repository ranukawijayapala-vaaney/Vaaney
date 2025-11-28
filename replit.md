# Vaaney E-Marketplace Platform

## Overview
Vaaney is a full-stack e-commerce marketplace platform for the Maldivian market, connecting buyers with verified sellers of physical products and services. It emphasizes trust, transparency, and a professional user experience through secure escrow-based payments, comprehensive seller verification, and robust commission management. Key capabilities include role-based access, a secure payment system integrated with local banks, and extensive support for seller operations and customer interactions, positioning it for significant growth in the Maldivian e-commerce sector.

## User Preferences
Preferred communication style: Simple, everyday language.

## Recent Changes (November 28, 2025)
### WorkflowPanel Refactoring
- **Backend API**: New `/api/conversations/:id/workflow-summary` endpoint returns all design approvals and quotes grouped by variant/package with enriched data
- **Storage Method**: Added `getWorkflowSummary()` in storage.ts to fetch and aggregate workflow tasks with proper superseded record filtering
- **WorkflowTaskCard Component**: New component displaying individual workflow tasks with status badges and role-specific action buttons (Approve/Reject for sellers, Accept/Decline for buyers)
- **WorkflowPanel Refactor**: Now fetches from the new API instead of inferring from conversation contexts; displays task list with real entities
- **Bug Fixes**: 
  - ProductDetail: Added "Request Custom Quote" button for products without variants that require quotes
  - WorkflowPanel: Corrected quote creation endpoint from `/api/seller/quotes` to `/api/quotes`
  - WorkflowPanel: Auto-selects first variant/package when upload dialog opens to prevent validation errors

### Tested Workflow Scenarios
- Standard product purchase (direct add to cart)
- Quote-only workflow (buyer requests → seller sends → status updates)
- Design-only workflow (buyer initiates upload → dialog with auto-selected variant)
- Design+Quote workflow (combined requirements)
- Custom variant workflow (quote without pre-selected variant)

## Previous Changes (November 27, 2025)
### Email Branding Enhancement
- **Logo Integration**: All email templates now include Vaaney logo served from /vaaney-logo.png
- **Brand Color**: Updated to Vaaney teal (#217588) across all templates
- **Sender Identity**: FROM_EMAIL set to "Vaaney <noreply@vaaney.com>"
- **Template Wrapper**: Created wrapTemplate() helper for consistent header/footer across 25+ notification emails
- **Verification Email**: Updated with logo, brand color, and professional styling

### Admin Sales Management Enhancement
- **Orders & Bookings Navigation**: Added "Sales" dropdown in admin navigation with links to Orders and Bookings pages
- **Seller Info in Orders/Bookings**: Enhanced admin APIs to include seller information (id, email, firstName, lastName, businessName, phone)
- **Admin Orders Page**: Complete order management with customer info, seller info, order items, and status badges
- **Admin Bookings Page**: Added Seller column in table view, View Details button, and comprehensive details modal
- **Routes Fix**: Added missing /admin/orders and /admin/bookings routes to App.tsx

### Product Variant Image Persistence Fix
- **Bug Fix**: Fixed critical production bug where variant images uploaded by sellers were not being saved to the database
- **Root Cause**: drizzle-zod's createInsertSchema was dropping optional array fields during parsing
- **Schema Fix**: Changed imageUrls column to `.notNull().default(sql\`ARRAY[]::text[]\`)` with `.default([])` override
- **Update Safety**: Route handler checks if imageUrls was explicitly provided to prevent wiping existing images during partial updates

### Guest Browsing & Landing Page Marketplace
- **Embedded Marketplace**: Added full marketplace section to landing page with Products/Services tabs, search, and category filtering
- **Guest Access**: Visitors can browse all products and services before signing up
- **Dynamic Categories**: Category filter now shows real categories from database instead of hardcoded options
- **Product/Service Links**: Clicking items navigates to detail pages (/product/:id, /book-service/:id)
- **Query Fix**: Fixed queryClient to properly join all query key segments for hierarchical routes

## Previous Changes (November 25, 2025)
### Product Form Bug Fix
- **Validation Error Fix**: Fixed "Expected number, received string" validation error when creating/updating products and variants
- **Type Conversion**: Form inputs (price, stock, inventory, dimensions) now properly convert from strings to numbers before API submission
- **API Payload Types**: Added proper TypeScript types for API payloads to ensure type safety

## Changes (November 24, 2025)
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