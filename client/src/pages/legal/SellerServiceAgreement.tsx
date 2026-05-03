import { LegalLayout } from "@/components/LegalLayout";

export default function SellerServiceAgreement() {
  return (
    <LegalLayout
      title="Service Supplier Agreement"
      effectiveDate="[date]"
      version="1.0"
      testId="text-seller-service-agreement-title"
    >
      <p>
        <strong>This Agreement</strong> is made and entered into at Colombo, Sri Lanka on the [ ] day of [ ] 20[ ], by
        and between <strong>Vaaney (Pvt) Ltd</strong>, a company incorporated under the laws of the Democratic Socialist
        Republic of Sri Lanka under registration No. [ ], having its registered office at [ ] (
        <strong>"Vaaney"</strong>), and the undersigned service provider whose details are set out in{" "}
        <strong>Schedule I</strong> (<strong>"Service Provider"</strong>).
      </p>
      <p>This Agreement mirrors the Vaaney <strong>Product Supplier Agreement</strong> with the differences set out below. Where a clause is not listed it is identical to the Product Supplier Agreement (with "Product" replaced by "Service" and "Supplier" replaced by "Service Provider").</p>

      <h2>Background</h2>
      <p>The Service Provider supplies digital services (e.g. design, print preparation, consultation) to Buyers via the Platform.</p>

      <h2>1. Definitions (additional)</h2>
      <ul>
        <li><strong>"Booking"</strong> — a confirmed engagement between a Buyer and the Service Provider on the Platform.</li>
        <li><strong>"Deliverable"</strong> — any digital file, design, document or other output produced by the Service Provider for a Buyer under a Booking.</li>
        <li><strong>"Service"</strong> — a service offering listed by the Service Provider on the Platform.</li>
        <li><strong>"Service Package"</strong> — a fixed-price package or a quoted package configured for a Booking.</li>
      </ul>

      <h2>4. Listings and Service Packages</h2>
      <ul>
        <li>The Service Provider must publish accurate Service descriptions, deliverables, scope, turnaround time, and any pre-purchase requirements (quote-required, design-approval-required).</li>
        <li>Where a Service requires a quote, the price agreed in the accepted quote is the authoritative price for that Booking. The Service Provider must not change scope or price after acceptance without the Buyer's written consent on the Platform.</li>
      </ul>

      <h2>5. Performance and Delivery</h2>
      <ul>
        <li>The Service Provider will perform each Booking with reasonable care and skill consistent with the standards of its profession.</li>
        <li>The 6-step booking workflow on the Platform (request → quote → confirmation → payment → delivery → completion) is binding on the Service Provider. The Service Provider must update Booking status at each step.</li>
        <li>Deliverables must be uploaded through the Platform's digital-delivery module. The Service Provider acknowledges that Deliverables are stored in Google Cloud Storage on Vaaney's behalf and made available to the Buyer through the Platform.</li>
        <li><strong>Performance review.</strong> Service Providers are subject to the Platform's rating system and to administrator review. Persistent low ratings or substantiated complaints may lead to suspension under clause 17.</li>
      </ul>

      <h2>6. Revisions, Refunds and Disputes</h2>
      <ul>
        <li>The Service Provider must offer the number of revisions stated in the listing. Out-of-scope revisions may be quoted as additional Bookings.</li>
        <li>If a Buyer raises a dispute on a Booking, the Service Provider must respond within <strong>[3] business days</strong>. Disputes are resolved by Vaaney's administrator under the Platform's process, with reference to the agreed scope, deliverables and the Service Provider's performance.</li>
        <li>Where a refund is granted, Vaaney processes it through MPGS or bank-transfer reversal, the Commission is reversed, and Vaaney may revoke the Buyer's licence to any Deliverables already provided (in which case the Buyer must cease use).</li>
      </ul>

      <h2>9. Quotes and Designs</h2>
      <ul>
        <li>The Service Provider must respond to quote requests within <strong>[3] business days</strong>.</li>
        <li>
          <strong>Ownership of Deliverables.</strong> On full payment of the Booking fee:
          <ul>
            <li>the Service Provider assigns to the Buyer all rights it has in the Deliverables produced under that Booking, save for the Service Provider's pre-existing tools, templates and know-how;</li>
            <li>the Service Provider grants the Buyer a perpetual, worldwide, royalty-free, sublicensable licence to use the Deliverables for the Buyer's own purposes;</li>
            <li>the Service Provider grants Vaaney a non-exclusive licence to host and display the Deliverables solely for delivering them to the Buyer and for archival/audit purposes.</li>
          </ul>
        </li>
        <li><strong>Design library.</strong> The Service Provider may store generic, non-Buyer-specific templates in the Platform's design library for re-use. Buyer-specific Deliverables may not be re-used for any other Buyer.</li>
        <li>The Service Provider warrants that the Deliverables will not infringe any third-party rights and indemnifies Vaaney and the Buyer for breach of this warranty.</li>
      </ul>

      <h2>11. Buyer Communications, Meetings and Off-Platform Contact</h2>
      <p>In addition to the corresponding Product clause, video consultations conducted via the Platform's Twilio integration:</p>
      <ul>
        <li>may be scheduled, joined and managed only through the Platform;</li>
        <li>may not be recorded without the explicit consent of all participants captured on the Platform; and</li>
        <li>must remain professional and within the agreed scope of the Booking.</li>
      </ul>

      <h2>18. Independent Contractor</h2>
      <p>The Service Provider performs all Services as an independent contractor and is solely responsible for its own taxes, social-security contributions, equipment and personnel. Nothing in this Agreement creates an employment, agency or partnership relationship with Vaaney or with any Buyer.</p>

      <h2>Other clauses</h2>
      <p>All other clauses (pricing/payouts, taxes, IP, confidentiality, data protection, indemnities and liability cap, force majeure, suspension/termination, general) track the Product Supplier Agreement.</p>

      <h2>Schedules</h2>
      <ul>
        <li><strong>Schedule I</strong> — Service Provider details</li>
        <li><strong>Schedule II</strong> — Commission and other fees (with quote-pricing handling)</li>
        <li><strong>Schedule III</strong> — Boost Package and advertising rates</li>
        <li><strong>Schedule IV</strong> — Promotion/discount tooling charges</li>
      </ul>
    </LegalLayout>
  );
}
