import { LegalLayout } from "@/components/LegalLayout";

export default function PrivacyPolicy() {
  return (
    <LegalLayout title="Privacy Policy" effectiveDate="[date]" version="1.0" testId="text-privacy-title">
      <h2>1. Who we are</h2>
      <p>
        Vaaney (Pvt) Ltd ("Vaaney", "we", "our", "us") is a company incorporated in Sri Lanka under registration
        No. PV-00333267, with its registered office at 307/1, Kotte Road, Mirihana, Nugegoda, Sri Lanka 10250. We
        operate the Vaaney marketplace platform at vaaney.com and our
        mobile/web applications (the "Platform").
      </p>
      <p>
        For the purposes of the Sri Lanka <strong>Personal Data Protection Act No. 9 of 2022</strong> ("PDPA"), Vaaney
        is the <strong>controller</strong> of the personal data described in this Policy, except where this Policy says
        otherwise.
      </p>
      <p>
        Contact for data-protection matters: <a href="mailto:info@vaaney.com">info@vaaney.com</a> (or write to the
        registered office above, marked for the attention of the Data Protection Officer).
      </p>

      <h2>2. Who this Policy applies to</h2>
      <ul>
        <li><strong>Buyers</strong> — individuals in Maldives (and elsewhere) who use the Platform to browse, request quotes, place orders or book services.</li>
        <li><strong>Sellers</strong> — sole traders or company representatives in Sri Lanka who supply products or services through the Platform.</li>
        <li><strong>Visitors</strong> to our website who do not yet have an account.</li>
      </ul>
      <p>If you are using the Platform on behalf of a company, you confirm that you may give us the personal data required and that you will share this Policy with the individuals concerned.</p>

      <h2>3. What personal data we collect</h2>
      <h3>3.1 Information you give us when you sign up or use the Platform</h3>
      <ul>
        <li><strong>All users:</strong> name, email address, password (hashed), phone number, country, profile photo (optional).</li>
        <li><strong>Buyers:</strong> shipping addresses, billing details, government ID where required for verification, optional preferences.</li>
        <li><strong>Sellers:</strong> business name, registration number, address, NIC of authorised signatories, verification documents (ID, business registration), bank account details for payouts, shop description, expertise, portfolio images.</li>
        <li><strong>Either side, when you transact:</strong> order details, quote requests, design files and deliverables, ratings and reviews, messages between buyer and seller, returns/refund records.</li>
      </ul>

      <h3>3.2 Information we collect automatically</h3>
      <ul>
        <li>Device and browser data: IP address, device identifier, browser type, operating system, screen size, language.</li>
        <li>Usage data: pages and listings viewed, search queries, clicks, time on page, referral source.</li>
        <li>Cookies and similar technologies (see clause 9).</li>
        <li>Logs of API calls, errors and security events.</li>
      </ul>

      <h3>3.3 Information from third parties</h3>
      <ul>
        <li><strong>Google</strong> when you sign in with your Google account (name, email, Google profile ID, profile photo).</li>
        <li><strong>MPGS / Commercial Bank of Ceylon</strong> when processing card payments (transaction reference, success/failure indicator, last 4 digits of the card — we do not store full card numbers).</li>
        <li><strong>Aramex</strong> for shipment tracking and delivery confirmation.</li>
        <li><strong>Twilio</strong> for video-meeting room metadata (joined participants, duration).</li>
        <li><strong>Resend</strong> for delivery status of transactional emails.</li>
      </ul>

      <h3>3.4 Sensitive personal data</h3>
      <p>
        We do not seek to collect sensitive personal data (health, religion, biometric data) as defined under the PDPA.
        If you choose to upload any such data (for example in a design file), we will treat it with the same protections.
      </p>

      <h2>4. Why we use your personal data and the legal basis</h2>
      <p>We process personal data only where we have a lawful basis under the PDPA. The main bases we rely on are: contract performance, legitimate interest, legal obligation, and consent (which you can withdraw at any time).</p>
      <table>
        <thead>
          <tr><th>Purpose</th><th>Examples</th><th>Lawful basis</th></tr>
        </thead>
        <tbody>
          <tr><td>Operating your account</td><td>Sign-up, login, email verification, password reset</td><td>Contract</td></tr>
          <tr><td>Processing orders and bookings</td><td>Checkout, MPGS payments, bank-transfer verification, escrow release, refunds</td><td>Contract</td></tr>
          <tr><td>Shipping and delivery</td><td>Sending addresses to Aramex, generating labels, tracking, customs declarations</td><td>Contract</td></tr>
          <tr><td>Buyer-seller communication</td><td>Messaging, video meetings, quote and design-approval workflows</td><td>Contract</td></tr>
          <tr><td>Trust, safety and dispute resolution</td><td>Verifying sellers, reviewing reported listings, resolving returns/disputes, anti-fraud checks</td><td>Legitimate interest, legal obligation</td></tr>
          <tr><td>Notifications</td><td>Order updates, booking events, meeting reminders, transactional emails</td><td>Contract</td></tr>
          <tr><td>Marketing communications</td><td>Newsletters, promotions, recommendations</td><td>Consent (you can opt out anytime)</td></tr>
          <tr><td>Improving the Platform</td><td>Analytics, debugging, A/B testing</td><td>Legitimate interest</td></tr>
          <tr><td>Legal and tax compliance</td><td>Records retention, tax reporting, responding to lawful requests</td><td>Legal obligation</td></tr>
          <tr><td>Seller payouts</td><td>Calculating commission, processing payouts to sellers' bank accounts</td><td>Contract</td></tr>
        </tbody>
      </table>

      <h2>5. Who we share your personal data with</h2>
      <p>We share personal data only with parties that need it for the purposes above:</p>
      <ul>
        <li><strong>The other side of a transaction</strong> — Buyers' shipping/contact details are shared with Sellers for the limited purpose of fulfilling the Order. Sellers' shop name, ratings and approved business details are shown to Buyers. Sellers may <strong>not</strong> use Buyer data for off-platform marketing (this is contractually required — see the Supplier Agreement).</li>
        <li>
          <strong>Service providers ("processors")</strong> acting on our instructions:
          <ul>
            <li>Hosting and infrastructure: Replit / Neon (PostgreSQL), Google Cloud (object storage)</li>
            <li>Payments: MPGS via Commercial Bank of Ceylon</li>
            <li>Shipping: Aramex</li>
            <li>Video meetings: Twilio</li>
            <li>Email: Resend</li>
            <li>Authentication: Google (Sign-in with Google)</li>
            <li>AI assistant: OpenAI (when you use the in-app assistant)</li>
          </ul>
        </li>
        <li><strong>Vaaney administrators</strong> — for trust-and-safety review of conversations, listings and disputes.</li>
        <li><strong>Authorities and legal claims</strong> — where we are required by law, court order, or to protect Vaaney's rights and the safety of users.</li>
        <li><strong>Business transfers</strong> — in connection with a merger, acquisition or sale of assets, with appropriate safeguards.</li>
      </ul>
      <p>We do <strong>not</strong> sell your personal data.</p>

      <h2>6. International transfers</h2>
      <p>
        Your data may be processed outside Sri Lanka — for example by Google Cloud, Twilio, Resend or OpenAI which
        operate globally. Where data leaves Sri Lanka, we rely on the recipient's contractual data-protection
        commitments and on safeguards required by the PDPA.
      </p>

      <h2>7. How long we keep your data</h2>
      <table>
        <thead><tr><th>Data</th><th>Retention</th></tr></thead>
        <tbody>
          <tr><td>Active account data</td><td>While your account is active</td></tr>
          <tr><td>Order, booking, payment and tax records</td><td>At least [7] years after the transaction (Sri Lankan and Maldivian tax/audit requirements)</td></tr>
          <tr><td>KYC / seller verification documents</td><td>[5] years after account closure</td></tr>
          <tr><td>Messages and dispute records</td><td>[3] years after the related transaction</td></tr>
          <tr><td>Marketing preferences</td><td>Until you withdraw consent</td></tr>
          <tr><td>Server, error and security logs</td><td>Up to [12] months</td></tr>
          <tr><td>Backups</td><td>Rolling [30]–[90] day cycle</td></tr>
        </tbody>
      </table>
      <p>When retention ends we delete or anonymise the data.</p>

      <h2>8. Security</h2>
      <ul>
        <li>Encryption in transit (TLS) and at rest for sensitive fields;</li>
        <li>Bcrypt-hashed passwords;</li>
        <li>Role-based access control inside Vaaney's admin tools;</li>
        <li>Session-based authentication with secure HTTP-only cookies;</li>
        <li>Webhook-secret authentication for payment notifications;</li>
        <li>Audit logs of administrator actions;</li>
        <li>Regular security reviews of dependencies and infrastructure.</li>
      </ul>
      <p>No system is 100% secure. If you suspect your account is compromised, contact <a href="mailto:info@vaaney.com">info@vaaney.com</a> immediately.</p>

      <h2>9. Cookies and similar technologies</h2>
      <ul>
        <li><strong>Strictly necessary cookies</strong> for login sessions, security and basic site function.</li>
        <li><strong>Functional cookies</strong> to remember preferences (e.g. language, theme).</li>
        <li><strong>Analytics cookies</strong> to understand how the Platform is used.</li>
      </ul>
      <p>You can control non-essential cookies through your browser settings or our cookie banner.</p>

      <h2>10. Your rights under the Sri Lanka PDPA</h2>
      <p>Subject to the conditions in the PDPA, you have the right to:</p>
      <ul>
        <li><strong>Access</strong> the personal data we hold about you;</li>
        <li><strong>Correct</strong> inaccurate or incomplete data;</li>
        <li><strong>Delete</strong> data, where there is no overriding legal or contractual reason to keep it;</li>
        <li><strong>Withdraw consent</strong> for processing based on consent (e.g. marketing);</li>
        <li><strong>Object</strong> to processing based on legitimate interest;</li>
        <li><strong>Data portability</strong> — receive your data in a commonly used machine-readable format;</li>
        <li><strong>Lodge a complaint</strong> with the Data Protection Authority of Sri Lanka.</li>
      </ul>
      <p>
        To exercise any right, email <a href="mailto:info@vaaney.com">info@vaaney.com</a>. We will respond within
        the timelines required by law (and in any event within [30] days). If you are a Buyer based in Maldives, the
        protections above apply equally to you regardless of jurisdiction.
      </p>

      <h2>11. Children</h2>
      <p>The Platform is not intended for use by anyone under 18. We do not knowingly collect personal data from minors. If you believe a minor has provided us personal data, contact <a href="mailto:info@vaaney.com">info@vaaney.com</a> and we will delete it.</p>

      <h2>12. Marketing and communications</h2>
      <ul>
        <li><strong>Transactional messages</strong> (order confirmations, shipment updates, payment receipts, booking events, returns, security notices) are part of the service and you cannot opt out while you have an active account.</li>
        <li><strong>Marketing messages</strong> (newsletters, promotional offers) are sent only with your consent. Each marketing email includes a one-click unsubscribe link.</li>
      </ul>

      <h2>13. AI features</h2>
      <p>
        Where you use Vaaney's AI assistant, your messages are processed by our AI provider (OpenAI) under contractual
        safeguards. We do not share more personal data than necessary for the assistant to answer, and we do not allow
        the provider to train its public models on your messages.
      </p>

      <h2>14. Changes to this Policy</h2>
      <p>
        We may update this Policy from time to time. Material changes will be notified by email and/or by an in-app
        notice at least [14] days before they take effect. Continued use of the Platform after the effective date
        constitutes acceptance.
      </p>

      <h2>15. Contact us</h2>
      <p>
        Vaaney (Pvt) Ltd (PV-00333267)<br />
        307/1, Kotte Road, Mirihana, Nugegoda, Sri Lanka 10250<br />
        Email: <a href="mailto:info@vaaney.com">info@vaaney.com</a><br />
        Phone: +94 77 302 8600 (Sri Lanka) &middot; +960 931 3486 (Maldives)
      </p>
    </LegalLayout>
  );
}
