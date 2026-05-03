import { LegalLayout } from "@/components/LegalLayout";

export default function SellerProductAgreement() {
  return (
    <LegalLayout
      title="Product Supplier Agreement"
      effectiveDate="[date]"
      version="1.0"
      testId="text-seller-product-agreement-title"
    >
      <p>
        <strong>This Agreement</strong> is made and entered into at Colombo, Sri Lanka on the [ ] day of [ ] 20[ ], by
        and between:
      </p>
      <p>
        <strong>Vaaney (Pvt) Ltd</strong>, a company incorporated under the laws of the Democratic Socialist Republic of
        Sri Lanka under registration No. [ ], having its registered office at [ ] (<strong>"Vaaney"</strong>), and the
        undersigned product supplier whose details are set out in <strong>Schedule A</strong> (
        <strong>"Supplier"</strong>). Each a <strong>"Party"</strong>; together the <strong>"Parties"</strong>.
      </p>

      <h2>Background</h2>
      <ol>
        <li>Vaaney operates an online marketplace platform that connects Maldivian buyers with Sri Lankan suppliers of physical goods (the <strong>"Platform"</strong>).</li>
        <li>The Supplier wishes to offer products for sale to buyers via the Platform on the terms of this Agreement.</li>
      </ol>

      <h2>1. Definitions and Interpretation</h2>
      <ul>
        <li><strong>"Aramex"</strong> — Aramex Sri Lanka (Pvt) Ltd or any other international shipping partner Vaaney engages from time to time.</li>
        <li><strong>"Boost Package"</strong> — a paid promotional placement made available through the Platform's seller-promotion module.</li>
        <li><strong>"Buyer"</strong> — an end customer with a verified buyer account on the Platform.</li>
        <li><strong>"Buyer Data"</strong> — any personal data of Buyers that the Supplier becomes aware of through the Platform.</li>
        <li><strong>"Confidential Information"</strong> — non-public information of either Party disclosed in connection with this Agreement.</li>
        <li><strong>"Commission"</strong> — the percentage of gross sales described in <strong>Schedule C</strong>, as adjusted under clause 7.4.</li>
        <li><strong>"Effective Date"</strong> — the date on which both Parties have signed this Agreement.</li>
        <li><strong>"Gross Sale Price"</strong> — the total amount paid by the Buyer for a Product, excluding shipping fees, taxes and Platform fees.</li>
        <li><strong>"MPGS"</strong> — the Mastercard Payment Gateway Services hosted-checkout integration used by the Platform.</li>
        <li><strong>"Order"</strong> — an accepted purchase of one or more Products through the Platform.</li>
        <li><strong>"Platform Policies"</strong> — the Platform's published Terms of Use, Community Guidelines, Privacy Policy and any seller-facing operating policies, as amended.</li>
        <li><strong>"Product"</strong> — any physical good listed by the Supplier on the Platform.</li>
        <li><strong>"Variant"</strong> — a sellable configuration of a Product (with its own price, inventory and shipping dimensions).</li>
      </ul>
      <p>Headings are for convenience only. Singular includes plural. Schedules form part of this Agreement. References to "writing" include effective email.</p>

      <h2>2. Commencement and Term</h2>
      <p>This Agreement commences on the Effective Date and continues until terminated under clause 17.</p>

      <h2>3. Grant of Rights; Platform Services</h2>
      <ul>
        <li>Subject to this Agreement, Vaaney grants the Supplier a non-exclusive, non-transferable, revocable right to use the Platform to list and sell Products to Buyers.</li>
        <li>Vaaney provides the Platform Services described in <strong>Schedule B</strong>: account hosting; product/Variant listing tools; order management; payment collection (MPGS card payments and verified bank transfers); buyer-seller messaging; rating system; quote and design-approval workflows; consolidated international shipping via Aramex; and admin-mediated dispute resolution.</li>
        <li>Vaaney may modify, add to, or discontinue features of the Platform on reasonable notice. Material changes that adversely affect the Supplier's economics will be notified at least [30] days in advance.</li>
      </ul>

      <h2>4. Listings and Catalogue Obligations</h2>
      <ul>
        <li>
          The Supplier must list each Product accurately, including:
          <ul>
            <li>name, description and category;</li>
            <li>clear, high-resolution images that the Supplier is licensed to use;</li>
            <li>per-Variant price, inventory level, shipping dimensions (length, width, height in cm) and weight;</li>
            <li>any flags for quote-required, design-approval-required or other purchase prerequisites;</li>
            <li>accurate origin, materials, and any regulatory information.</li>
          </ul>
        </li>
        <li>The Supplier warrants that each Product complies with all applicable laws of Sri Lanka and Maldives, is not on the Platform's prohibited-items list, and does not infringe any third-party rights.</li>
        <li>The Supplier must keep inventory levels accurate in real time and must not mark a Variant as in-stock if it cannot fulfil the Order within the dispatch SLA in clause 5.</li>
        <li>Vaaney may remove or suspend any listing that, in its reasonable opinion, breaches this Agreement, Platform Policies or applicable law. Where practicable Vaaney will give the Supplier the opportunity to cure.</li>
      </ul>

      <h2>5. Order Fulfilment and Shipping</h2>
      <ul>
        <li>The Supplier must accept or reject each Order within <strong>[24] hours</strong> of receipt and must dispatch accepted Orders to Vaaney's designated consolidation point (or directly to Aramex, as Vaaney specifies) within <strong>[3] business days</strong> of acceptance.</li>
        <li>
          The Supplier acknowledges that Vaaney manages international shipping via Aramex (consolidation, dimensions/volumetric weight, customs documentation, tracking). The Supplier is responsible for:
          <ul>
            <li>providing accurate Variant dimensions and weight in the Platform;</li>
            <li>packaging items so they survive consolidated international transit;</li>
            <li>attaching the Platform-generated shipping label and any documentation required by Aramex;</li>
            <li>handing over Orders on time.</li>
          </ul>
        </li>
        <li>If the Supplier provides inaccurate dimensions or weight resulting in additional Aramex charges, Vaaney may deduct those charges from the Supplier's next payout under clause 7.</li>
        <li>Title and risk in the Product remain with the Supplier until Aramex (or Vaaney's nominated carrier) takes possession of the Order.</li>
      </ul>

      <h2>6. Returns, Refunds and Buyer Disputes</h2>
      <ul>
        <li>The Platform operates a buyer-initiated returns flow with administrator resolution. The Supplier agrees to participate in that flow and to be bound by the administrator's reasoned decision.</li>
        <li>The Supplier must respond to any return or dispute notification on the Platform within <strong>[3] business days</strong>. Failure to respond within that period entitles Vaaney to resolve the matter in the Buyer's favour.</li>
        <li>
          Where a return is approved (whether by the Supplier or by Vaaney's administrator), Vaaney will:
          <ul>
            <li>process the refund to the Buyer through MPGS or by bank-transfer reversal;</li>
            <li>reverse the related Commission from the Supplier's account; and</li>
            <li>deduct any agreed return-shipping cost from the Supplier's payout.</li>
          </ul>
        </li>
        <li>The Supplier bears the cost of return shipping where the Product is defective, damaged in the Supplier's packaging, materially not as described, or otherwise non-conforming. For all other returns the Buyer bears the cost.</li>
        <li>Nothing in this clause limits any non-excludable Buyer rights under Sri Lankan or Maldivian consumer-protection law.</li>
      </ul>

      <h2>7. Pricing, Commission and Payouts</h2>
      <ul>
        <li>The Supplier sets the Gross Sale Price of each Variant.</li>
        <li>Vaaney is the sole party authorised to collect Buyer payment. Buyers may pay via MPGS card payment or via manual bank transfer subject to administrator verification.</li>
        <li>For each Order, Vaaney will retain the Commission and any other fees specified in <strong>Schedule C</strong> and remit the balance to the Supplier per the payout schedule in <strong>Schedule D</strong>.</li>
        <li><strong>7.4</strong> Vaaney may adjust the Commission applicable to a Supplier on <strong>[30] days'</strong> written notice. Continued use of the Platform after the notice period constitutes acceptance.</li>
        <li>Payouts are released only after (a) the Order is marked completed on the Platform, (b) any return window has expired, and (c) for bank-transfer Orders, after administrator verification of receipt.</li>
        <li><strong>Currency.</strong> Buyers are charged in USD via MPGS. Supplier payouts are made in [LKR / USD] at the [bank's TT buying / [other]] rate on the payout date. The Supplier bears the risk of exchange-rate movement between Order date and payout date.</li>
        <li><strong>Chargebacks.</strong> If MPGS, the acquirer or any payment partner reverses or holds funds, Vaaney may correspondingly hold or recover the matching payout, provided Vaaney acts in good faith and gives the Supplier a chance to provide evidence.</li>
      </ul>

      <h2>8. Taxes and Customs</h2>
      <ul>
        <li>Each Party is responsible for its own income, business and corporate taxes.</li>
        <li>Sri Lankan VAT/SVAT, withholding tax and any similar levies on the Supplier's sales or payouts are the Supplier's responsibility. Vaaney may withhold and remit any tax it is required by law to withhold.</li>
        <li>Maldivian import duties, GST and customs clearance fees on Products imported into Maldives are passed through to Buyers via the Platform's checkout, except where Schedule C states otherwise. The Supplier acts as the consignor; the Buyer is the importer of record unless the Parties agree otherwise in writing.</li>
      </ul>

      <h2>9. Quotes, Design Approvals and Custom Orders</h2>
      <ul>
        <li>Where a Product requires a quote or design approval, the Supplier must respond to each request within <strong>[3] business days</strong> with either a quoted price or a design proposal.</li>
        <li>Designs that are approved by a Buyer become Buyer Designs. The Supplier may store approved designs in the Platform's design library for re-use <strong>only with the Buyer's explicit consent recorded on the Platform</strong>.</li>
        <li>The Supplier retains ownership of generic templates, brushes and underlying tools used to create Buyer Designs, but grants the Buyer a perpetual, worldwide, royalty-free licence to use the final approved design for the Buyer's own purposes.</li>
        <li>The Supplier must not re-use a Buyer-specific design (including text, logos and personalised elements) for any other Buyer.</li>
      </ul>

      <h2>10. Promotion, Advertising and Boost Packages</h2>
      <ul>
        <li>The Supplier may purchase Boost Packages or other promotional placements on the terms in <strong>Schedule E</strong>.</li>
        <li>The Supplier must comply with the Platform's advertising guidelines and applicable law (including Sri Lankan and Maldivian advertising/consumer-protection rules).</li>
        <li>If a Boost Package is interrupted by suspension or termination caused by the Supplier, no refund is due. If interrupted for reasons attributable to Vaaney, the unused portion is refunded or extended on a pro-rata basis.</li>
        <li>The Supplier may run its own promotions and discounts where the Platform's tooling permits; such discounts are funded entirely by the Supplier and the Commission is calculated on the discounted Gross Sale Price.</li>
      </ul>

      <h2>11. Buyer Communications and Off-Platform Contact</h2>
      <ul>
        <li>
          The Supplier may use Buyer Data only for the purpose of fulfilling the Order in question and complying with this Agreement. The Supplier must not use Buyer Data to:
          <ul>
            <li>market to or otherwise contact the Buyer outside the Platform;</li>
            <li>solicit the Buyer to transact off the Platform;</li>
            <li>build a contact database; or</li>
            <li>share Buyer Data with any third party other than carriers and customs authorities to the extent strictly necessary.</li>
          </ul>
        </li>
        <li>All buyer-seller communication relating to an Order must take place through the Platform's messaging system. Messages, video meetings and call records may be reviewed by Vaaney administrators for trust-and-safety purposes.</li>
        <li>Video meetings hosted via the Platform's Twilio integration may not be recorded without the consent of all participants captured on the Platform.</li>
      </ul>

      <h2>12. Reviews and Ratings</h2>
      <ul>
        <li>The Supplier consents to the public display of Buyer ratings, reviews and uploaded photos.</li>
        <li>The Supplier must not solicit fake reviews, offer Buyers consideration in exchange for reviews, or attempt to manipulate the rating system. Breach is grounds for suspension or termination.</li>
      </ul>

      <h2>13. Intellectual Property</h2>
      <ul>
        <li>As between the Parties, the Supplier owns all rights in its Products, listings content, brand assets and Supplier-supplied images.</li>
        <li>The Supplier grants Vaaney a non-exclusive, royalty-free, worldwide licence (with the right to sublicense to its hosting, CDN and marketing partners) to host, reproduce, reformat, display, transmit and use the Supplier's listings content, images and brand assets for the purpose of operating, marketing and promoting the Platform. The licence survives termination only to the extent reasonably necessary for archival, legal and historical-order purposes.</li>
        <li>As between the Parties, Vaaney owns all rights in the Platform itself, including its software, design, look and feel, and aggregated data.</li>
        <li>The Supplier warrants that its Products and listings do not infringe any third-party intellectual-property rights and indemnifies Vaaney for breach of this warranty under clause 15.</li>
      </ul>

      <h2>14. Confidentiality and Data Protection</h2>
      <ul>
        <li>Each Party will keep the other's Confidential Information confidential, use it only as needed to perform this Agreement, and protect it with at least the same care it uses for its own confidential information.</li>
        <li>Confidentiality obligations survive termination for <strong>[3] years</strong>, save that obligations relating to Buyer Data and trade secrets continue indefinitely.</li>
        <li>The Parties will comply with the Sri Lanka Personal Data Protection Act No. 9 of 2022 and any other applicable data-protection law in handling Buyer Data. The Supplier acts as a processor of Vaaney's controlled Buyer Data for fulfilment purposes only.</li>
      </ul>

      <h2>15. Indemnities; Limitation of Liability</h2>
      <ul>
        <li>The Supplier indemnifies Vaaney, its directors, officers, employees and agents against all third-party claims, liabilities, losses and reasonable costs arising out of: (a) any Product (including product-liability claims); (b) the Supplier's breach of this Agreement; (c) the Supplier's breach of any law; or (d) infringement of third-party rights by the Supplier.</li>
        <li>Vaaney indemnifies the Supplier against third-party claims arising out of Vaaney's gross negligence or wilful breach of this Agreement.</li>
        <li><strong>Cap.</strong> Save for indemnities under clause 15.1, fraud, wilful misconduct, and breach of clauses 11 (Buyer Data) and 14 (Confidentiality), each Party's total aggregate liability under this Agreement is capped at the <strong>total fees paid or payable between the Parties in the 12 months preceding the event giving rise to the claim</strong>.</li>
        <li><strong>Excluded losses.</strong> Neither Party is liable for indirect, consequential, incidental, special or punitive damages, or for loss of profit, revenue, data or goodwill, even if advised of the possibility.</li>
      </ul>

      <h2>16. Force Majeure</h2>
      <p>Neither Party is liable for failure to perform where prevented by an event beyond its reasonable control (including natural disasters, pandemics, acts of government, port closures, currency restrictions, prolonged carrier outages or third-party gateway/payment-processor outages). The affected Party must notify promptly and use reasonable efforts to mitigate. If a force-majeure event continues for more than <strong>[60] days</strong>, either Party may terminate without liability.</p>

      <h2>17. Suspension and Termination</h2>
      <ul>
        <li><strong>Suspension.</strong> Vaaney may suspend the Supplier's account or specific listings on notice where the Supplier is in material breach, where there is a credible safety, fraud or compliance concern, or where required by law. Suspension does not relieve the Supplier of obligations on Orders already in progress.</li>
        <li><strong>Termination for cause.</strong> Either Party may terminate immediately on written notice if the other Party (a) commits a material breach not cured within <strong>[14] days</strong> of notice, (b) becomes insolvent, or (c) commits fraud.</li>
        <li><strong>Termination for convenience.</strong> Vaaney may terminate this Agreement on <strong>[30] days'</strong> written notice. The Supplier may terminate on <strong>[30] days'</strong> written notice.</li>
        <li><strong>On termination:</strong> the Supplier must complete any in-flight Orders, hand over any Vaaney materials, and stop using the Platform. Vaaney will pay the Supplier all amounts properly due, less any deductions allowed under this Agreement.</li>
        <li><strong>Survival.</strong> Clauses 1, 6 (for accrued returns), 7.7, 8, 11, 13, 14, 15, 16, 17 and 18 survive termination.</li>
      </ul>

      <h2>18. General</h2>
      <ul>
        <li><strong>Independent contractor.</strong> The Supplier is an independent merchant. Nothing in this Agreement creates an employment, agency, partnership or joint-venture relationship.</li>
        <li><strong>Notices.</strong> Notices must be in writing to the email and postal addresses in <strong>Schedule A</strong>. Email notices are effective on transmission to the address specified.</li>
        <li><strong>Assignment.</strong> The Supplier may not assign this Agreement without Vaaney's written consent. Vaaney may assign to an affiliate or in connection with a corporate reorganisation.</li>
        <li><strong>No third-party rights.</strong> No person other than the Parties has any right to enforce this Agreement.</li>
        <li><strong>Severability.</strong> If any provision is held unenforceable, the remainder continues in force.</li>
        <li><strong>Waiver.</strong> No failure or delay in exercising a right is a waiver.</li>
        <li><strong>Entire agreement.</strong> This Agreement (with the Schedules and the Platform Policies) is the entire agreement between the Parties on its subject matter and supersedes prior discussions.</li>
        <li><strong>Amendment.</strong> Amendments must be in writing signed by both Parties, save that Vaaney may update operational rules in the Platform Policies on reasonable notice.</li>
        <li><strong>Governing law and jurisdiction.</strong> This Agreement is governed by the law of Sri Lanka. The Parties submit to the exclusive jurisdiction of the Commercial High Court of Colombo, save that either Party may seek interim relief in any court of competent jurisdiction.</li>
      </ul>

      <h2>Schedules</h2>
      <ul>
        <li><strong>Schedule A</strong> — Supplier details (company, registration, NIC of authorised signatory, registered office, notice address, notice email, bank account for payouts)</li>
        <li><strong>Schedule B</strong> — Platform Services</li>
        <li><strong>Schedule C</strong> — Commission and other fees</li>
        <li><strong>Schedule D</strong> — Payout schedule and currency</li>
        <li><strong>Schedule E</strong> — Boost Package and advertising rates</li>
        <li><strong>Schedule F</strong> — Promotion/discount tooling charges</li>
      </ul>
    </LegalLayout>
  );
}
