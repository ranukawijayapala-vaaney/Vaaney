---
name: Seller display-name rule (business vs individual)
description: How seller names render across the app, and the few places that intentionally keep the literal person name.
---

# Seller display name: business sellers show companyName

Use `getUserDisplayName(user)` (in `shared/schema.ts`) for **every** seller-name
render. It returns trimmed `companyName` only when `sellerType === "business"` and
`companyName` is non-empty; otherwise `"firstName lastName"`; otherwise email;
otherwise `""`. Buyers and individual sellers (`sellerType !== "business"`) are
unaffected — they always show the person name.

For the helper to work, server seller payloads must include `sellerType` +
`companyName` (any list/detail/enrichment that carries a `seller`/`sender`).
Admin Orders/Bookings/Transactions instead use a server-set
`businessName = (business && companyName) ? companyName : null` with a
`businessName || person` fallback in the table.

**Why:** Business sellers are registered companies; buyers/admins should see the
company identity, not an individual employee's name.

## The task rule: replace person name EVERYWHERE except a few intentional spots
The original requirement was explicit: company name replaces person name
**everywhere a seller's name shows**, with the ONLY hard exception being Aramex
`PersonName`. Admin verification/user views ARE in scope and DO show the company
name for business sellers — do not treat them as keeps (an earlier attempt wrongly
did and the completion review rejected it).

Intentionally NOT converted (these are not the seller's display identity):
- **Aramex `PersonName`** (`server/routes.ts`): literal contact person for the
  courier/customs handoff. (Aramex `CompanyName` separately mis-uses
  `seller.firstName || 'Seller'` — a known gap, not a keep.)
- **Admin Users profile dialog, Basic-Info person field**: kept as the person name
  but **relabeled "Contact Person Name" for business sellers**; the company name is
  the display identity shown in the dialog title/description and Seller Information
  section. So identity = company name, and the contact person is clearly separate.
- **Email salutations** (e.g. `localAuth.ts` verification greeting): greet the
  actual person, not a display-name surface.
- **Admin/Buyer layout headers**: show the logged-in admin's/buyer's OWN name;
  those layouts never render a seller.
- **googleAuth.ts**: buyer-only OAuth.

**How to apply:** route any seller-name render through `getUserDisplayName`; before
keeping a raw person name, confirm it's one of the spots above (each preserves a
contact-person / salutation / self-identity meaning that breaks if swapped for a
company name).
