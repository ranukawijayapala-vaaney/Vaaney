import { LegalLayout } from "@/components/LegalLayout";

export default function CookiePolicy() {
  return (
    <LegalLayout title="Cookie Policy" effectiveDate="[date]" version="1.0" testId="text-cookie-title">
      <p>
        This Cookie Policy explains how Vaaney (Pvt) Ltd ("Vaaney", "we", "our", "us") uses cookies and similar
        technologies on our marketplace platform at vaaney.com and our applications (the "Platform"). It should be read
        together with our <a href="/legal/privacy">Privacy Policy</a>.
      </p>

      <h2>1. What are cookies?</h2>
      <p>
        Cookies are small text files that are placed on your device when you visit a website. They allow the website to
        recognise your device and to store information about your preferences, sign-in state and activity. We also use
        related technologies such as <strong>localStorage</strong>, <strong>sessionStorage</strong> and{" "}
        <strong>pixel tags</strong> that work in a similar way; references to "cookies" in this Policy include those
        technologies.
      </p>
      <ul>
        <li><strong>Session cookies</strong> are deleted when you close your browser.</li>
        <li><strong>Persistent cookies</strong> remain on your device for a set period or until you delete them.</li>
        <li><strong>First-party cookies</strong> are set by Vaaney; <strong>third-party cookies</strong> are set by services we use (such as Google for OAuth or analytics).</li>
      </ul>

      <h2>2. Categories of cookies we use</h2>

      <h3>2.1 Strictly necessary cookies (always on)</h3>
      <p>These cookies are required for the Platform to function and cannot be turned off. They include:</p>
      <ul>
        <li>Session cookies that keep you signed in (Express session cookie);</li>
        <li>CSRF / authentication tokens that protect form submissions;</li>
        <li>Cookies that remember items in your basket or quote requests;</li>
        <li>Cookies set by our payment partner (MPGS / Commercial Bank of Ceylon) during checkout to detect fraud and complete the payment.</li>
      </ul>
      <p>
        Without these cookies the Platform cannot keep you signed in, process payments, or protect your account, and
        you cannot opt out while using the Platform.
      </p>

      <h3>2.2 Functional cookies</h3>
      <p>
        These cookies remember choices you make so we can provide a better experience. Examples: your preferred
        language and currency, whether you have dismissed a notice, and your light/dark theme preference (typically
        stored in <code>localStorage</code> rather than as a cookie).
      </p>

      <h3>2.3 Analytics cookies</h3>
      <p>
        These cookies help us understand how Buyers and Sellers use the Platform so we can improve it. They collect
        information in an aggregated way — for example, which pages are most visited, how long users spend on a page,
        and how users move through the site.
      </p>

      <h3>2.4 Marketing / advertising cookies</h3>
      <p>
        Where used, these cookies help us measure the effectiveness of campaigns and show relevant content. We do not
        sell your personal data and we do not use your personal data for cross-site advertising without your consent.
      </p>

      <h2>3. Third-party services that may set cookies</h2>
      <p>The Platform integrates with the following third parties that may set cookies on your device:</p>
      <ul>
        <li><strong>Google</strong> — for "Sign in with Google" (OAuth 2.0) and reCAPTCHA where used.</li>
        <li><strong>MPGS / Commercial Bank of Ceylon</strong> — for processing card payments.</li>
        <li><strong>Twilio</strong> — for video meetings between Buyers and Sellers.</li>
        <li><strong>Resend</strong> — for transactional email (does not typically set browser cookies).</li>
        <li><strong>Replit hosting</strong> — for serving the Platform; may set infrastructure cookies for performance and routing.</li>
      </ul>
      <p>These services have their own privacy and cookie policies, which you can find on their websites.</p>

      <h2>4. How long cookies last</h2>
      <ul>
        <li>The Vaaney session cookie expires when you sign out or after a period of inactivity (typically 30 days).</li>
        <li>Functional preferences (theme, dismissed notices) persist until you clear your browser storage.</li>
        <li>Third-party cookies last as long as the third party determines (commonly between a session and 24 months).</li>
      </ul>

      <h2>5. How to control cookies</h2>
      <p>You can control cookies in several ways:</p>
      <ul>
        <li><strong>Browser settings.</strong> Most browsers let you block or delete cookies. Blocking strictly-necessary cookies will prevent the Platform from working.</li>
        <li><strong>Sign-out.</strong> Signing out of your account will remove most session cookies set by Vaaney.</li>
        <li><strong>Clear local storage.</strong> Browser developer tools allow you to clear localStorage / sessionStorage entries we use for preferences.</li>
        <li><strong>Third parties.</strong> You can opt out of Google services and most analytics providers using the controls on their websites.</li>
        <li><strong>Do Not Track.</strong> The Platform does not currently respond to "Do Not Track" browser signals because there is no agreed standard for them.</li>
      </ul>

      <h2>6. Children</h2>
      <p>
        The Platform is not directed to children under 18 and we do not knowingly use cookies to collect data from
        them.
      </p>

      <h2>7. Changes to this Policy</h2>
      <p>
        We may update this Cookie Policy from time to time. The current version and effective date are shown above. If
        we make material changes, we will notify registered users by email or in-app notice.
      </p>

      <h2>8. Contact</h2>
      <p>
        If you have questions about this Policy, please email{" "}
        <a href="mailto:info@vaaney.com">info@vaaney.com</a>.
      </p>
    </LegalLayout>
  );
}
