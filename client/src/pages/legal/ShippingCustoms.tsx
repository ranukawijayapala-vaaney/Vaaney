import { LegalLayout } from "@/components/LegalLayout";

export default function ShippingCustoms() {
  return (
    <LegalLayout
      title="Shipping & Customs Policy"
      effectiveDate="[date]"
      version="1.0"
      testId="text-shipping-title"
    >
      <p>
        This Shipping &amp; Customs Policy explains how products purchased on the Vaaney marketplace are shipped from
        Sri Lanka to the Maldives (and other destinations), how shipping costs are calculated, and how customs duties
        and import taxes are handled. It supplements the Buyer Product Purchase Terms and the Supplier Agreements.
      </p>

      <h2>1. Shipping partners and route</h2>
      <ul>
        <li>Cross-border shipping is fulfilled through our integrated logistics partner, <strong>Aramex</strong>, unless we expressly offer a different option at checkout.</li>
        <li>The standard route is Sri Lanka (origin) → Maldives (destination). Other destinations may be supported on a case-by-case basis.</li>
        <li>Sellers drop off or hand over packages according to the shipment label; Vaaney books the shipment and the Buyer's order is updated with tracking details.</li>
      </ul>

      <h2>2. How shipping cost is calculated</h2>
      <p>
        At checkout, Vaaney calculates shipping cost based on information supplied by the Seller and Aramex's published
        rates:
      </p>
      <ul>
        <li><strong>Actual weight</strong> declared by the Seller for each variant;</li>
        <li><strong>Dimensional / volumetric weight</strong> calculated as Length × Width × Height ÷ 5000 (in centimetres / kilograms);</li>
        <li>The greater of actual weight and volumetric weight is used to price the shipment;</li>
        <li>For multi-item orders, dimensions are stacked (height multiplied by quantity) and combined where possible to avoid duplicate fees;</li>
        <li>Origin and destination postcodes, and any remote-area surcharges that Aramex applies.</li>
      </ul>
      <p>
        The shipping cost shown at checkout is the amount you pay. If Aramex later applies surcharges that were not
        disclosed (for example, oversize or remote-delivery fees), Vaaney will notify the Buyer and seek written
        agreement before charging.
      </p>

      <h2>3. Delivery times</h2>
      <p>Indicative delivery times to the Maldives once a shipment leaves the origin facility:</p>
      <ul>
        <li><strong>Malé and surrounding atolls:</strong> typically 5 – 9 business days;</li>
        <li><strong>Outer atolls:</strong> typically 7 – 14 business days, depending on inter-atoll transfer schedules;</li>
        <li>Custom or made-to-order items have additional production lead time, shown on the listing.</li>
      </ul>
      <p>
        Delivery times are estimates only and may be affected by customs clearance, weather, public holidays and other
        events outside our control. Vaaney is not liable for delays caused by such events but will work with the
        Seller and Aramex to provide updates.
      </p>

      <h2>4. Tracking and confirmation</h2>
      <ul>
        <li>Once a shipment is booked, the Buyer receives an email and in-app notification with the Aramex tracking number and a tracking link.</li>
        <li>Where multiple items ship together, Vaaney consolidates them into a single shipment to reduce cost; in those cases a single tracking number covers all items.</li>
        <li>Buyers should confirm receipt promptly when the order is delivered; this triggers escrow release to the Seller (subject to the Returns &amp; Refunds Policy).</li>
      </ul>

      <h2>5. Customs duties, GGST and import taxes</h2>
      <p>
        The Buyer is the <strong>importer of record</strong> for goods entering the Maldives, unless we explicitly say
        otherwise.
      </p>
      <ul>
        <li>The price shown on the Platform is the cost of the goods plus shipping; <strong>it does not include Maldives import duty, Goods and Services Tax (GGST), Customs Service Charge or any other Maldivian tax or fee</strong>, unless expressly stated.</li>
        <li>Aramex (or Maldives Customs) may contact the Buyer to collect duties and taxes before delivery. The Buyer is responsible for paying these promptly.</li>
        <li>Failure to pay customs charges may result in the package being held, returned to origin, or destroyed by Customs. In such cases, refunds are limited as described in our Returns &amp; Refunds Policy.</li>
        <li>For high-value items, additional documentation (commercial invoice, ID, business registration) may be required. Vaaney and the Seller will provide what we can; the Buyer is responsible for clearing the goods.</li>
        <li>Sri Lankan export duties and any taxes on Sellers are paid by the Seller and are already reflected in the listing price.</li>
      </ul>

      <h2>6. Restricted and prohibited items</h2>
      <p>
        Some goods may not be exported from Sri Lanka or imported into the Maldives, or may require permits — see our{" "}
        <a href="/legal/prohibited-items">Prohibited &amp; Restricted Items Policy</a>. Listings that breach those
        rules are removed and orders cancelled with full refund.
      </p>

      <h2>7. Packaging</h2>
      <ul>
        <li>Sellers must package products to withstand international transit, including waterproof outer wrap for journeys involving sea legs to outer atolls.</li>
        <li>Fragile items must be marked and protected; Aramex's standard liability rules apply if packaging is inadequate.</li>
        <li>Hazardous, flammable or pressurised goods may be subject to additional packaging rules or refused entirely.</li>
      </ul>

      <h2>8. Lost, damaged or undelivered shipments</h2>
      <ul>
        <li><strong>Lost in transit:</strong> if tracking shows no movement for an unusually long time, contact us. We will open a trace with Aramex; resolution typically takes 10–21 business days. If confirmed lost, the Buyer is refunded in full or the Seller dispatches a replacement.</li>
        <li><strong>Damaged on arrival:</strong> photograph the package and contents on opening and submit a return request within 48 hours. See the Returns &amp; Refunds Policy.</li>
        <li><strong>Returned by Customs:</strong> where a package is returned because the Buyer did not pay customs charges or the goods were prohibited at the destination, return-leg shipping and any restocking fee may be deducted from the refund.</li>
        <li><strong>Refused on delivery:</strong> if the Buyer refuses delivery without cause, return-leg shipping and a restocking fee may be charged.</li>
      </ul>

      <h2>9. Address accuracy</h2>
      <p>
        Buyers must provide a complete and accurate shipping address, including atoll, island and a working phone
        number. Aramex needs this information to clear customs and arrange final-mile delivery. If a shipment is
        misdelivered or returned because of incomplete address information, the resulting cost may be passed to the
        Buyer.
      </p>

      <h2>10. Insurance</h2>
      <p>
        Standard Aramex carriage covers limited liability per shipment in line with their published terms. Higher-value
        items may be insured for an additional fee, shown at checkout where available. If insurance is not purchased
        and the package is lost or damaged, recovery is limited to Aramex's standard liability.
      </p>

      <h2>11. Changes to this Policy</h2>
      <p>
        We may update this Policy from time to time as carriers' rates and customs rules change. The current version
        and effective date are shown above. Material changes will be notified by email and in-app notice.
      </p>

      <h2>12. Contact</h2>
      <p>
        Shipping or customs questions: <a href="mailto:info@vaaney.com">info@vaaney.com</a>. Policy questions:{" "}
        <a href="mailto:info@vaaney.com">info@vaaney.com</a>.
      </p>
    </LegalLayout>
  );
}
