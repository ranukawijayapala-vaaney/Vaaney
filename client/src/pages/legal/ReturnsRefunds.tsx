import { LegalLayout } from "@/components/LegalLayout";

export default function ReturnsRefunds() {
  return (
    <LegalLayout
      title="Returns & Refunds Policy"
      effectiveDate="[date]"
      version="1.0"
      testId="text-returns-title"
    >
      <p>
        This Returns &amp; Refunds Policy explains how Buyers can return products and request refunds on the Vaaney
        marketplace ("Platform"). It supplements the Buyer Product Purchase Terms and the Buyer Service Booking Terms.
        Vaaney holds Buyer payments in escrow and only releases them to the Seller once delivery is confirmed and the
        return window has closed.
      </p>

      <h2>1. When you can request a return or refund</h2>

      <h3>1.1 Products</h3>
      <p>You may request a return and refund within <strong>7 calendar days</strong> of marking the order as delivered, where:</p>
      <ul>
        <li>the product is materially different from the listing description or images;</li>
        <li>the product arrived damaged, defective, expired, or non-functional;</li>
        <li>the wrong item was sent;</li>
        <li>the order is incomplete (missing items or accessories);</li>
        <li>the product is counterfeit or breaches our Prohibited &amp; Restricted Items Policy.</li>
      </ul>
      <p>
        Standard "change of mind" returns are at the Seller's discretion and may incur return-shipping costs and a
        restocking fee.
      </p>

      <h3>1.2 Custom or made-to-order products</h3>
      <p>
        Custom items produced from a Buyer-approved quote or design are <strong>non-refundable</strong> except where
        the Seller has materially deviated from the approved specification, the item is defective, or the item is not
        delivered.
      </p>

      <h3>1.3 Services and bookings</h3>
      <ul>
        <li>If a Seller cancels a confirmed booking, the Buyer is entitled to a full refund of amounts paid into escrow.</li>
        <li>Buyer cancellation more than 48 hours before the scheduled service: full refund minus payment-processing fees.</li>
        <li>Buyer cancellation within 48 hours: refund subject to the Seller's deposit/no-show terms shown at booking.</li>
        <li>If a service is delivered substantially below the agreed specification, the Buyer may request a partial or full refund through the dispute process.</li>
        <li>Digital deliverables (design files, recordings, etc.) are non-refundable once delivered, except where they are materially defective or breach the agreed specification.</li>
      </ul>

      <h3>1.4 Items that cannot be returned</h3>
      <ul>
        <li>Perishable goods (food, flowers) once delivered in the agreed condition;</li>
        <li>Personal-care items where hygiene seals are broken (cosmetics, intimate apparel, earrings);</li>
        <li>Digital products and services already delivered or performed;</li>
        <li>Customised items (see 1.2);</li>
        <li>Gift cards and promotional credits.</li>
      </ul>

      <h2>2. How to request a return or refund</h2>
      <ol>
        <li>Sign in and open the order or booking.</li>
        <li>Click <em>Request return</em> or <em>Request refund</em> within the applicable window.</li>
        <li>Choose a reason and upload supporting evidence (photos, videos, screenshots) clearly showing the issue.</li>
        <li>Submit. The Seller has <strong>3 calendar days</strong> to respond.</li>
      </ol>

      <h2>3. Seller response</h2>
      <p>The Seller may:</p>
      <ul>
        <li><strong>Accept</strong> the request — issue a return label / instructions and refund once the item is returned in saleable condition;</li>
        <li><strong>Offer a partial refund</strong> or replacement;</li>
        <li><strong>Reject</strong> the request with reasons and supporting evidence.</li>
      </ul>
      <p>If the Seller does not respond within 3 days, the request is automatically escalated to Vaaney for resolution.</p>

      <h2>4. Vaaney dispute resolution</h2>
      <ul>
        <li>If the Buyer and Seller cannot agree, either party may escalate to Vaaney within the dispute window shown on the order.</li>
        <li>Vaaney will review the listing, communications, evidence and any prior order history. We may request additional information.</li>
        <li>Vaaney aims to issue a decision within <strong>7 calendar days</strong> of receiving all evidence.</li>
        <li>Vaaney's decision is final on the Platform; it does not affect any rights you may have under the consumer-protection laws of your country.</li>
      </ul>

      <h2>5. Return shipping</h2>
      <ul>
        <li>If the return is due to Seller fault (damage, wrong item, counterfeit, materially-different goods), the Seller pays return shipping.</li>
        <li>If the return is due to Buyer change of mind (where accepted), the Buyer pays return shipping and any original-shipping cost is non-refundable.</li>
        <li>Returns must be shipped via a tracked service and the tracking number provided through the dispute thread.</li>
        <li>Items must be returned in their original condition, with original packaging and accessories.</li>
      </ul>

      <h2>6. How and when refunds are paid</h2>
      <ul>
        <li>Refunds are issued to the original payment method.</li>
        <li><strong>Card payments (MPGS):</strong> refunds typically appear in your account within 5–14 business days after Vaaney releases them, depending on your card issuer.</li>
        <li><strong>Bank-transfer payments:</strong> refunds are paid back to the originating bank account; Buyers must confirm bank details with Vaaney to enable cross-border refunds.</li>
        <li>Where commission has been collected, Vaaney reverses the commission proportionally to the refunded amount.</li>
        <li>Currency conversion losses, third-party gateway fees and bank charges are not refundable except where the law requires.</li>
      </ul>

      <h2>7. Customs duties and import taxes</h2>
      <p>
        Maldives import duty, GGST or other taxes paid by the Buyer at importation are <strong>not refunded by
        Vaaney</strong>. Buyers may be able to claim these from Maldives Customs directly under their own procedures.
      </p>

      <h2>8. Damaged or lost in transit</h2>
      <ul>
        <li>If a product is damaged in transit, take photographs of the package and contents on opening and submit a return request within 48 hours of delivery.</li>
        <li>If a tracked shipment shows no movement for an unusually long period, contact us — Vaaney will work with Aramex to investigate before any refund is issued.</li>
      </ul>

      <h2>9. Fraud, abuse and repeat returns</h2>
      <p>
        Returns systems exist to protect honest Buyers and Sellers. We may refuse refunds, ban accounts and report
        offences to authorities where we identify fraud (false claims of non-delivery, item-switch returns, repeated
        unsubstantiated returns).
      </p>

      <h2>10. Contact</h2>
      <p>
        Questions about a return or refund: <a href="mailto:info@vaaney.com">info@vaaney.com</a>. Questions about
        this Policy: <a href="mailto:info@vaaney.com">info@vaaney.com</a>.
      </p>
    </LegalLayout>
  );
}
