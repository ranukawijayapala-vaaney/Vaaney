---
name: Seller display-name rule (business vs individual)
description: How seller names render across the app, and which surfaces deliberately keep the literal person name.
---

# Seller display name: business sellers show companyName

Use `getUserDisplayName(user)` (in `shared/schema.ts`) for **every** seller-name
render. It returns the trimmed `companyName` only when `sellerType === "business"`
and `companyName` is non-empty; otherwise `"firstName lastName"`; otherwise email;
otherwise `""`. Buyers and individual sellers (`sellerType !== "business"`) are
unaffected — they always show the person name.

Server seller payloads must carry `sellerType` + `companyName` for the frontend
helper to work (marketplace product/service lists & details, buyer orders, checkout
created orders, boost purchases, returns enrichment, quote enrichment, messaging
conversations/messages). Admin Orders/Bookings/Transactions instead rely on a
server-set `businessName = (business && companyName) ? companyName : null` with a
`businessName || person` fallback in the table.

**Why:** Business sellers are a registered company; buyers should transact with the
company identity, not an individual employee's name.

## Deliberate keeps — do NOT convert these to companyName
- **Aramex `PersonName`** (`server/routes.ts`): must stay the literal contact person
  for customs/courier handoff. (Note: Aramex `CompanyName` field currently mis-uses
  `seller.firstName || 'Seller'` — a known gap, not a keep.)
- **Admin Verifications name column** and **admin Users "Full Name" detail**: admins
  review the real person behind the account.
- **Email verification greeting** (`localAuth.ts`): greets the actual person.
- **AdminLayout / BuyerLayout headers**: show the logged-in admin's/buyer's own
  person name (those layouts never render a seller).
- **googleAuth.ts**: buyer-only OAuth, no seller naming.

**How to apply:** Before adding or "fixing" any seller-name render, route it through
`getUserDisplayName`; before converting a person-name render, check it isn't one of
the deliberate keeps above (each preserves contact-person/identity-verification
semantics that breaks if swapped for a company name).
