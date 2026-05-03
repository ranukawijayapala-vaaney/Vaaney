import { LegalLayout } from "@/components/LegalLayout";

export default function BuyerProductTerms() {
  return (
    <LegalLayout
      title="Buyer Product Purchase Terms"
      effectiveDate="[date]"
      version="1.0"
      testId="text-buyer-product-terms-title"
    >
      <p>
        These Buyer Product Purchase Terms ("Terms") apply when you purchase physical products through the Vaaney
        marketplace (the "Platform") operated by <strong>Vaaney (Pvt) Ltd</strong>, a company incorporated in Sri Lanka
        under registration No. [ ], with its registered office at [ ] ("Vaaney", "we", "our", "us").
      </p>
      <p>By placing an order on the Platform you accept these Terms. If you do not accept them, do not place the order.</p>
      <p>These Terms should be read together with the Vaaney <strong>Privacy Policy</strong> and (where applicable) the <strong>Buyer Service Booking Terms</strong>.</p>

      <h2>1. Definitions</h2>
      <ul>
        <li><strong>"Buyer"</strong>, <strong>"you"</strong> — an individual or entity with a verified buyer account on the Platform.</li>
        <li><strong>"Order"</strong> — a confirmed purchase of one or more Products through the Platform.</li>
        <li><strong>"Product"</strong> — a physical good listed by a Seller on the Platform.</li>
        <li><strong>"Seller"</strong> — the Sri Lankan supplier offering the Product, who contracts with you for the sale of the Product.</li>
        <li><strong>"Variant"</strong> — a specific configuration of a Product (size, finish, etc.) with its own price and inventory.</li>
        <li><strong>"MPGS"</strong> — the card-payment gateway (Mastercard Payment Gateway Services via Commercial Bank of Ceylon) used by the Platform.</li>
        <li><strong>"Aramex"</strong> — the international shipping partner used by the Platform.</li>
        <li><strong>"Total Price"</strong> — the price of the Product, plus shipping, plus any taxes, duties and Platform fees shown at checkout.</li>
      </ul>

      <h2>2. The Platform's role</h2>
      <p>
        Vaaney operates the Platform. Vaaney is <strong>not</strong> the seller of the Product. The contract of sale for
        each Product is between <strong>you and the Seller</strong>. Vaaney facilitates the listing, payment, shipping,
        communications and dispute resolution.
      </p>
      <p>Vaaney holds Buyer payments via an escrow-style mechanism and only releases them to the Seller once the Order is completed under these Terms.</p>

      <h2>3. Eligibility and account</h2>
      <ul>
        <li>You must be at least 18 years old and able to enter into a binding contract.</li>
        <li>You must register a buyer account, verify your email address, and complete first-time onboarding (basic profile and shipping address). For some purchases additional verification may be required.</li>
        <li>You are responsible for keeping your login credentials confidential and for activity on your account.</li>
      </ul>

      <h2>4. Listings, descriptions and pricing</h2>
      <ul>
        <li>Listings show the Product name, description, category, images, and per-Variant pricing. Prices are displayed in USD.</li>
        <li>Listings are provided by Sellers. Vaaney works to keep listings accurate but does not warrant that every listing is error-free. If you receive a Product that materially differs from its listing, the Returns flow in clause 11 applies.</li>
        <li>The "From $X" price shown on browse pages is the lowest available variant price. The price you actually pay is the variant-level price plus shipping, taxes and duties shown at checkout.</li>
        <li>Promotions, discounts and Boost-promoted listings are clearly indicated. Promotional prices apply only while the promotion is live.</li>
      </ul>

      <h2>5. Quotes and design approvals</h2>
      <p>Some Products require a quote or design approval before purchase. In those cases:</p>
      <ol>
        <li>you submit a quote/design request with the details requested by the Seller;</li>
        <li>the Seller responds with a quoted price and/or a proposed design;</li>
        <li>once you accept the quote and (where applicable) approve the design through the Platform, the accepted quote/design is the authoritative specification for the resulting Order;</li>
        <li>accepted quotes are valid until the expiry date shown.</li>
      </ol>
      <p>Approved designs may be saved to your design library on the Platform and may be reused by you for future Orders. The Seller may <strong>not</strong> reuse Buyer-specific designs for other Buyers without your consent.</p>

      <h2>6. Placing an Order</h2>
      <ul>
        <li>An Order is placed when you complete checkout and pay (or, for bank-transfer Orders, when Vaaney verifies your payment slip).</li>
        <li>An Order is <strong>accepted</strong> when the Seller marks it accepted on the Platform, or when the Platform automatically accepts it under the relevant Seller's settings. Until acceptance, no contract of sale exists; if the Seller declines or fails to accept within the displayed window, you will be refunded in full.</li>
        <li>We may refuse, cancel or limit Orders where (a) the listing contained a manifest pricing error, (b) the Product is unavailable, (c) we suspect fraud or violation of these Terms, or (d) we are required by law.</li>
      </ul>

      <h2>7. Payment</h2>
      <p>You may pay by:</p>
      <ul>
        <li><strong>MPGS card payment</strong> — your card is charged in USD via the secure MPGS hosted checkout. Vaaney does not see or store your full card number.</li>
        <li><strong>Bank transfer</strong> — you upload a payment slip; Vaaney administrators verify receipt before the Order is released to the Seller. Bank-transfer Orders may take additional time to confirm.</li>
      </ul>
      <p>If a card payment fails, you may use the "Retry Payment" flow on the Platform. You are responsible for any fees your bank or card issuer charges for international payment in USD.</p>

      <h2>8. Shipping, customs and delivery</h2>
      <ul>
        <li>Vaaney arranges international shipping from Sri Lanka to Maldives via Aramex (or another carrier we engage). Shipping costs and estimated delivery times are calculated at checkout based on the Product's dimensions and weight and your shipping address.</li>
        <li>You may consolidate eligible Orders into a single shipment using the Platform's consolidation feature. Consolidated shipments use combined dimensions and the higher of actual or volumetric weight.</li>
        <li><strong>Customs duties, GST and Maldivian import charges</strong> are your responsibility unless the Platform explicitly shows them as included in the Total Price. Where shown, the Platform collects them at checkout and remits them on your behalf. Where not shown, you may be required to pay the carrier on delivery.</li>
        <li>You are the <strong>importer of record</strong> in Maldives unless we agree otherwise in writing.</li>
        <li>You must provide an accurate shipping address. Re-routing fees, return-to-origin charges or storage fees caused by an incorrect address are your responsibility.</li>
        <li><strong>Risk of loss</strong> passes to you on delivery to your shipping address (or to a person at that address, or to a recipient nominated by you). Title passes to you on delivery and after full payment has cleared.</li>
        <li>Delivery time estimates are estimates only. We are not liable for delays caused by carriers, customs clearance, force majeure or incorrect Buyer information.</li>
      </ul>

      <h2>9. Inspection on delivery</h2>
      <ul>
        <li>Please inspect your Product at delivery. If the package is visibly damaged, take photos before opening and refuse delivery if appropriate.</li>
        <li>Report any damage, missing items or wrong items through the Platform within <strong>[3] days</strong> of delivery so we can help quickly. Issues reported later may still be eligible for resolution under clause 11 but resolution may take longer.</li>
      </ul>

      <h2>10. Ratings, reviews and communications</h2>
      <ul>
        <li>You may rate and review a Product after the Order is completed, including photos. Reviews must be honest, lawful and your own experience.</li>
        <li>We may remove reviews that are abusive, defamatory, contain personal data, or breach these Terms.</li>
        <li>All buyer-seller communications must take place through the Platform. Sellers are contractually prohibited from contacting you for marketing purposes outside the Platform — please report any such contact to <a href="mailto:support@vaaney.com">support@vaaney.com</a>.</li>
      </ul>

      <h2>11. Returns, refunds and dispute resolution</h2>
      <p>You may request a return through the Platform within <strong>[7] days</strong> of delivery if:</p>
      <ul>
        <li>the Product is defective, damaged in transit or materially not as described;</li>
        <li>you received the wrong Product or the wrong quantity; or</li>
        <li>any other reason is permitted under the Seller's published return policy or applicable law.</li>
      </ul>
      <p>The Platform's returns workflow is: <strong>Buyer raises return → Seller responds within 3 business days → if not resolved, Vaaney administrator decides</strong>.</p>
      <p>Where a return is approved:</p>
      <ul>
        <li>the refund is processed back to your original payment method (MPGS) or bank account (for bank-transfer Orders), normally within <strong>[7] business days</strong> of approval, subject to your bank's processing times;</li>
        <li>any return shipping is paid by the Seller where the Product was defective, damaged in their packaging or materially not as described, and otherwise by you.</li>
      </ul>
      <p>Statutory consumer rights under Sri Lankan and Maldivian law that cannot be excluded are not affected by anything in these Terms. If your card payment is genuinely disputed (chargeback), please use the Platform's dispute flow before contacting your card issuer.</p>

      <h2>12. Acceptable use</h2>
      <p>You will not:</p>
      <ul>
        <li>use the Platform for any unlawful purpose;</li>
        <li>place fraudulent Orders;</li>
        <li>misuse the returns flow (e.g. claim non-receipt of items actually delivered, return non-genuine items in place of genuine ones);</li>
        <li>abuse, threaten or harass Sellers, other Buyers or Vaaney staff;</li>
        <li>attempt to circumvent the Platform's payment, messaging or dispute systems;</li>
        <li>scrape, reverse engineer or interfere with the Platform's technical operation;</li>
        <li>post unlawful, infringing or misleading content (including in reviews and design files);</li>
        <li>impersonate any person.</li>
      </ul>
      <p>We may suspend or terminate accounts that breach this clause.</p>

      <h2>13. Buyer data and privacy</h2>
      <p>Our collection and use of your personal data is described in the <strong>Vaaney Privacy Policy</strong>. Sellers receive only the contact and shipping details strictly necessary to fulfil your Order. Sellers are contractually required not to use that information for any other purpose.</p>

      <h2>14. Intellectual property</h2>
      <ul>
        <li>The Platform (including its software, design and content other than Seller and Buyer content) is owned by Vaaney and licensed to you for use in accordance with these Terms.</li>
        <li>You retain ownership of any content you submit (e.g. design briefs, files, review photos) and grant Vaaney a non-exclusive, worldwide, royalty-free licence to host, display and use that content for the purpose of operating the Platform and fulfilling your Orders.</li>
        <li>Approved designs delivered to you under clause 5 are licensed to you for your own use under the relevant Seller agreement.</li>
      </ul>

      <h2>15. Vaaney's liability</h2>
      <ul>
        <li>Vaaney is <strong>not the seller</strong> of the Product. The Seller is responsible for the Product's quality, conformity and fitness for purpose.</li>
        <li>Subject to clause 15.4, Vaaney is liable to you only for losses directly caused by Vaaney's gross negligence, wilful misconduct, or breach of these Terms or the Privacy Policy.</li>
        <li>Subject to clause 15.4, Vaaney's total aggregate liability to you in any 12-month period is capped at the <strong>higher of (a) the total fees Vaaney earned from your Orders in that period and (b) USD [200]</strong>. Vaaney is not liable for indirect, consequential, incidental or special losses, or for loss of profit, data or goodwill.</li>
        <li>Nothing in these Terms excludes or limits liability for fraud, death or personal injury caused by negligence, or any liability that cannot be excluded under applicable law (including non-excludable Sri Lankan and Maldivian consumer-protection rights).</li>
      </ul>

      <h2>16. Force majeure</h2>
      <p>We are not liable for any failure or delay caused by events beyond our reasonable control, including natural disasters, pandemics, currency restrictions, acts of government, port closures or sustained third-party gateway/carrier outages.</p>

      <h2>17. Suspension and termination</h2>
      <ul>
        <li>We may suspend or close your account on notice if you breach these Terms, breach the Privacy Policy, or where required by law. Where reasonable, we will give you a chance to address the issue.</li>
        <li>You may close your account at any time through the Platform. Active Orders must be completed (or cancelled) before closure takes effect.</li>
        <li>Clauses that by their nature should survive termination (including clauses 8, 11, 13, 14, 15 and 18) survive.</li>
      </ul>

      <h2>18. General</h2>
      <ul>
        <li><strong>Changes.</strong> We may update these Terms from time to time. Material changes will be notified by email and/or in-app at least <strong>[14] days</strong> before they take effect. Continued use of the Platform after the effective date is acceptance of the new version.</li>
        <li><strong>Notices.</strong> Notices to you go to the email address on your account. Notices to Vaaney go to <a href="mailto:support@vaaney.com">support@vaaney.com</a> (general) and <a href="mailto:legal@vaaney.com">legal@vaaney.com</a> (legal).</li>
        <li><strong>Assignment.</strong> You may not assign these Terms. Vaaney may assign to an affiliate or in connection with a corporate reorganisation.</li>
        <li><strong>Severability and waiver.</strong> If any provision is unenforceable, the rest stands. A delay in enforcing a right is not a waiver.</li>
        <li><strong>Governing law and jurisdiction.</strong> These Terms are governed by the laws of <strong>Sri Lanka</strong>. The courts of <strong>Colombo</strong> have non-exclusive jurisdiction; nothing in this clause prevents you from bringing proceedings in your country of residence to enforce non-excludable consumer rights.</li>
        <li><strong>Languages.</strong> These Terms are issued in English. Translations are for convenience; the English version prevails.</li>
      </ul>
    </LegalLayout>
  );
}
