import { LegalLayout } from "@/components/LegalLayout";

export default function ProhibitedItems() {
  return (
    <LegalLayout
      title="Prohibited & Restricted Items Policy"
      effectiveDate="[date]"
      version="1.0"
      testId="text-prohibited-title"
    >
      <p>
        Vaaney connects Sellers in Sri Lanka with Buyers in the Maldives. Both jurisdictions impose strict rules on
        what may be sold, listed, exported and imported. This policy lists items and services that are{" "}
        <strong>prohibited</strong> on the Platform and items that are <strong>restricted</strong> (allowed only with
        proof of compliance). Sellers are responsible for ensuring every listing complies with this policy and with
        applicable law in both countries; Buyers are responsible for ensuring imports are lawful in their destination.
      </p>
      <p>
        This list is non-exhaustive. If an item is illegal under Sri Lankan law to sell or export, or under Maldivian
        law to import, it is not permitted on Vaaney even if not specifically listed below.
      </p>

      <h2>1. Items strictly prohibited (cannot be listed)</h2>

      <h3>1.1 Goods banned from import into the Maldives</h3>
      <p>The Maldives prohibits, among others, the import of:</p>
      <ul>
        <li><strong>Alcohol</strong> in any form, including beverages, sprays, perfumes containing alcohol intended for ingestion, and brewing kits;</li>
        <li><strong>Pork and pork products</strong>, including processed foods containing pork-derived ingredients (gelatin, lard, ham, bacon);</li>
        <li><strong>Pornographic material</strong> in any format (print, digital, audio, video) and sex toys;</li>
        <li><strong>Idols of worship</strong> and items intended for use in non-Islamic religious worship;</li>
        <li><strong>Materials deemed contrary to Islam</strong> by Maldivian authorities, including offensive or anti-Islamic publications;</li>
        <li><strong>Live pigs and dogs</strong> (subject to limited regulated exceptions for trained service dogs).</li>
      </ul>

      <h3>1.2 Goods banned everywhere</h3>
      <ul>
        <li>Narcotics, psychotropic substances and drug paraphernalia;</li>
        <li>Firearms, ammunition, explosives, fireworks, replica or air weapons;</li>
        <li>Knives, swords, batons or other offensive weapons (other than ordinary kitchenware shipped as a standard product);</li>
        <li>Counterfeit goods, replicas of branded products, and items bearing forged trademarks;</li>
        <li>Stolen property or property obtained by fraud;</li>
        <li>Human remains, organs, body parts or bodily fluids;</li>
        <li>Endangered species, ivory, coral, turtle shell and any product covered by CITES;</li>
        <li>Currency, securities, lottery tickets, gambling services, and any service that constitutes unlicensed financial activity;</li>
        <li>Hazardous materials including radioactive substances, asbestos, mercury, and chemical-warfare agents;</li>
        <li>Child sexual abuse material and any content sexualising minors (zero tolerance — accounts will be reported to authorities and permanently banned);</li>
        <li>Live animals, except where permitted by both export and import authorities and only via approved logistics partners.</li>
      </ul>

      <h3>1.3 Services prohibited on the Platform</h3>
      <ul>
        <li>Adult, escort or sexually-explicit services;</li>
        <li>Services that facilitate fraud, hacking, identity theft or evasion of taxes/customs;</li>
        <li>Academic dishonesty services (essay-mills, exam impersonation);</li>
        <li>Services requiring a professional licence (medical, legal, immigration, financial advice) unless the Seller can produce a valid licence on demand;</li>
        <li>Multi-level marketing recruitment, pyramid schemes and "get rich quick" offers.</li>
      </ul>

      <h2>2. Items that may only be listed with proof of compliance</h2>
      <p>The following may be listed only if the Seller can produce, on demand, the documentation noted:</p>
      <ul>
        <li><strong>Food, beverages, supplements:</strong> manufacturer details, ingredient list, expiry, and (for export) Sri Lanka health-certification or equivalent. Pork ingredients are still prohibited.</li>
        <li><strong>Cosmetics, perfumes, skincare:</strong> ingredient list, batch numbers, and (for Maldives import) Maldives Food and Drug Authority registration where required.</li>
        <li><strong>Pharmaceuticals and medical devices:</strong> only with valid Sri Lanka NMRA licence and a valid Maldives MFDA import permit; OTC items only — no controlled substances.</li>
        <li><strong>Electronics with radio transmitters</strong> (Wi-Fi routers, walkie-talkies, drones): must comply with Maldives Communications Authority (CAM) type-approval requirements; drones may need import authorisation.</li>
        <li><strong>Knives, tools and equipment:</strong> kitchenware and craft tools are allowed; tactical/combat-style items are not.</li>
        <li><strong>Plants, seeds, agricultural inputs:</strong> only with phytosanitary certification and import permission from Maldives Plant Quarantine Authority.</li>
        <li><strong>Tobacco products:</strong> heavily restricted in Maldives and subject to import duty &amp; permits; not permitted on Vaaney without case-by-case approval.</li>
        <li><strong>Used / second-hand goods:</strong> permitted, but must be honestly described and free from health hazards; certain used items (e.g. used undergarments, used cosmetics) are not permitted.</li>
        <li><strong>Cultural artefacts and antiques:</strong> only with proof that export from Sri Lanka and import to Maldives are lawful (Sri Lanka Department of Archaeology / Customs declaration).</li>
        <li><strong>Jewellery and precious metals:</strong> permitted; high-value items above declared thresholds require additional KYC and may attract import duty in the Maldives.</li>
      </ul>

      <h2>3. Intellectual-property rules</h2>
      <ul>
        <li>You must own or have a licence to use any trademark, logo, copyrighted image, design or text on your listings.</li>
        <li>"Inspired by" or "[Brand] style" listings of branded goods you do not own are not permitted; they are treated as counterfeits.</li>
        <li>Use of celebrity images, athlete names, music or copyrighted artwork without permission is not allowed.</li>
        <li>Vaaney complies with takedown notices — see the IP section of our Terms of Service.</li>
      </ul>

      <h2>4. Health, safety and product-quality basics</h2>
      <ul>
        <li>Listings must include accurate ingredients/materials, allergen information where relevant, and any safety warnings.</li>
        <li>Children's products must comply with applicable safety standards and must not contain small loose parts for products marketed for under-3s.</li>
        <li>Battery-powered products must use compliant batteries; loose lithium batteries are subject to airline restrictions and Aramex carriage rules.</li>
        <li>Liquids, aerosols and gels are subject to logistics restrictions and may not ship by air.</li>
      </ul>

      <h2>5. Reporting and enforcement</h2>
      <ul>
        <li>If you see a listing that breaches this policy, please report it to <a href="mailto:info@vaaney.com">info@vaaney.com</a> with the listing URL and a brief description.</li>
        <li>We may remove listings, suspend or ban Sellers, withhold payouts, refund Buyers, and report serious breaches to law-enforcement.</li>
        <li>Repeated or wilful breaches will result in permanent suspension and forfeiture of fees paid for promotional packages.</li>
      </ul>

      <h2>6. Updates</h2>
      <p>
        We may update this policy as laws and risks evolve. The current version and effective date are shown above. We
        will notify registered Sellers of material changes by email or in-app notice.
      </p>
    </LegalLayout>
  );
}
