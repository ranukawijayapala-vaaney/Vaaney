# Design Guidelines: Vaaney E-Marketplace Platform

## Design Approach

**Hybrid Reference-Based + System Approach**
- **Buyer Marketplace:** Draw inspiration from Shopify, Etsy, and Amazon for product discovery and checkout flows
- **Dashboards (Seller/Admin):** Apply Material Design principles for data-dense interfaces with clear information hierarchy
- **Trust & Credibility:** Emphasize verification badges, secure payment indicators, and professional polish throughout

**Core Design Principles:**
1. Role clarity through distinct interface patterns for Buyer, Seller, and Admin
2. Trust-building through transparent verification status, escrow indicators, and professional presentation
3. Efficiency in complex workflows (multi-variant products, service bookings, commission management)

## Typography

**Font Stack:**
- **Primary:** Inter (via Google Fonts) - Clean, modern, excellent readability for UI elements and data
- **Display:** Poppins (via Google Fonts) - Friendly weight for headings and marketing content

**Type Scale:**
- Hero Headlines: text-5xl to text-6xl, font-bold (Poppins)
- Section Headers: text-3xl to text-4xl, font-semibold (Poppins)
- Card Titles/Product Names: text-xl to text-2xl, font-semibold (Inter)
- Body Text: text-base, font-normal (Inter)
- Small Text/Metadata: text-sm, font-normal (Inter)
- Captions/Labels: text-xs, font-medium (Inter)

## Layout System

**Spacing Primitives:**
Core spacing units using Tailwind: **2, 4, 6, 8, 12, 16, 20, 24**
- Micro spacing (within components): p-2, gap-2, space-x-4
- Component padding: p-4, p-6, p-8
- Section spacing: py-12, py-16, py-20, py-24
- Container gaps: gap-6, gap-8

**Grid Systems:**
- **Product Grids:** grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4
- **Dashboard Cards:** grid-cols-1 md:grid-cols-2 lg:grid-cols-3
- **Admin Tables:** Full-width responsive tables with horizontal scroll on mobile
- **Service Packages:** grid-cols-1 md:grid-cols-2 lg:grid-cols-3

**Container Strategy:**
- Marketing pages: max-w-7xl mx-auto
- Dashboard content: max-w-screen-2xl mx-auto
- Form containers: max-w-2xl mx-auto
- Product detail: max-w-6xl mx-auto

## Component Library

### Navigation

**Buyer Marketplace Header:**
- Full-width sticky header with logo, search bar (prominent center position), category navigation, cart icon with badge, user profile dropdown
- Secondary nav with category links in horizontal scroll on mobile
- Trust indicators: "Verified Sellers Only" badge

**Seller Dashboard Sidebar:**
- Vertical sidebar navigation (fixed on desktop, collapsible on mobile)
- Sections: Dashboard, Products, Services, Orders, Bookings, Inventory, Analytics, Commission Info
- Active state with background highlight and left border accent

**Admin Panel Sidebar:**
- Similar structure with sections: Dashboard, Users, Verification Queue, Orders, Bookings, Transactions, Sellers & Commissions, Homepage Manager
- Badge indicators for pending verifications

### Product Components

**Product Card:**
- Image container: aspect-ratio-square with hover zoom effect
- Product title (2-line clamp)
- Seller name with verification badge
- Price display: "From $X.XX" for variant products
- Quick view button overlay on hover
- Add to cart button (always visible on mobile)

**Product Detail Layout:**
- Two-column layout (image gallery left, product info right)
- Image gallery: Main image with thumbnail carousel below
- Variant selector: Dropdown or button group depending on variant count
- Quantity selector with stock indicator
- Price updates dynamically based on variant selection
- Seller info card with verification status
- Sticky "Add to Cart" on mobile scroll

### Service Components

**Service Card:**
- Hero image (16:9 aspect ratio)
- Service title and brief description
- Starting price: "Packages from $X.XX"
- Package count indicator
- "View Packages" CTA button
- Seller verification badge

**Service Booking Flow:**
- Step indicator: Package Selection → Date/Time → Review → Payment
- Package comparison table with feature checkboxes
- Calendar picker for date selection
- Time slot selection as button grid
- Summary sidebar (sticky on desktop)

### Dashboard Components

**Stat Cards:**
- Grid layout with icon, label, large number, and trend indicator
- Examples: Total Orders, Pending Verifications, Revenue This Month, Commission Rate

**Order/Booking Tables:**
- Responsive tables with status badges
- Quick action buttons per row
- Filters: Status, Date Range, Search
- Pagination controls

**Seller Commission Display:**
- Prominent card showing current commission rate
- Volume tier progress bar
- Historical commission breakdown chart

### Admin Components

**Verification Queue:**
- Card-based layout with document preview
- User information panel
- Approve/Reject buttons with reason input
- Document zoom modal

**Banner/Carousel Manager:**
- Drag-and-drop reordering interface
- Image upload with preview
- Link/CTA text inputs
- Active/Inactive toggle per banner

**Transaction Dashboard:**
- Date range filter
- Total volume metrics
- Revenue breakdown by category
- Escrow balance indicator
- Commission earned display
- Payout management section

### Forms

**Registration Flow:**
- Multi-step form with progress indicator
- Role selection: Large card buttons with icons
- Document upload: Drag-and-drop zone with file preview
- Clear instructions and requirements per step

**Product/Service Creation:**
- Tabbed interface: Basic Info, Variants/Packages, Pricing, Images, Inventory
- Rich text editor for descriptions
- Dynamic variant creator with add/remove rows
- Image upload with drag reordering

### Escrow & Payment UI

**Checkout Flow:**
- Order summary sidebar (sticky)
- Payment method selection
- Escrow notice: "Your payment is held securely until order completion"
- Trust badges and security indicators

**Seller Payout View:**
- Available balance (after commission)
- Pending escrow amount
- Payout history table
- Request payout button (when balance threshold met)

## Images

**Hero Section (Homepage):**
- Full-width hero banner with carousel functionality (managed by admin)
- Minimum 1400px wide, 600px tall
- Overlay text with blurred background buttons
- CTA: "Start Selling" and "Browse Products" with backdrop-blur-sm effect

**Product/Service Images:**
- Square format for product grids (800x800px minimum)
- 16:9 format for service showcases (1200x675px minimum)
- Support multiple images per listing with gallery view

**Verification Documents:**
- Display uploaded IDs/BR documents in modal preview
- Zoom functionality for admin verification
- Secure viewing with watermark overlay

**Category Icons:**
- Use Heroicons for category navigation
- Custom uploaded icons for admin-managed categories

**Trust Badges:**
- Verification checkmark icons next to seller names
- Escrow security icon in payment flow
- SSL/secure payment badges in footer

## Accessibility & Interaction

- Focus states: Ring offset with appropriate contrast
- Form validation: Inline error messages below fields
- Loading states: Skeleton screens for product grids, spinners for actions
- Empty states: Friendly illustrations with actionable CTAs
- Toast notifications for success/error feedback
- Modal dialogs for confirmations (delete actions, approvals)

## Responsive Behavior

- Mobile-first approach with progressive enhancement
- Hamburger menu for main navigation on mobile
- Bottom navigation bar for buyer app (Home, Search, Orders, Profile)
- Collapsible sidebar for dashboards on tablet/mobile
- Horizontal scroll for tables on small screens with sticky first column
- Touch-friendly button sizes (min 44px height)

This design system prioritizes trust, clarity, and efficiency across all three user roles while maintaining a cohesive brand experience.