import '../dino.css';
import './privacy.css';

export const metadata = {
  title: 'Privacy Policy — DinosaurAI',
  description: 'Privacy policy for DinosaurAI games and apps.',
};

const EFFECTIVE = 'May 10, 2026';
const CONTACT   = 'bribradley@gmail.com';
const STUDIO    = 'DinosaurAI';
const SITE      = 'dinosaurai.vercel.app';

export default function PrivacyPage() {
  return (
    <div className="prv-page">
      <nav className="prv-nav">
        <a className="nav-logo" href="/">🦕 DINOSAUR<span className="logo-ai">AI</span></a>
      </nav>

      <div className="prv-wrap">
        <div className="prv-eyebrow">Legal</div>
        <h1 className="prv-h1">Privacy Policy</h1>
        <p className="prv-meta">Effective: {EFFECTIVE}</p>

        <Section title="Who We Are">
          <p>{STUDIO} (&ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;) is an independent games and apps studio. Our products include mobile games and web apps available at <strong>{SITE}</strong> and through the Apple App Store.</p>
        </Section>

        <Section title="Data We Do Not Collect">
          <p>Our games and apps are designed to work without collecting personal information. We do <strong>not</strong> collect, store, or share:</p>
          <ul>
            <li>Names, email addresses, or contact information</li>
            <li>Device identifiers or advertising IDs</li>
            <li>Location data</li>
            <li>Health or financial data</li>
            <li>Photos, contacts, or files from your device</li>
          </ul>
        </Section>

        <Section title="Local Data">
          <p>Some games save progress (high scores, settings, game state) locally on your device using browser <code>localStorage</code> or native storage. This data never leaves your device and is not transmitted to us or any third party.</p>
        </Section>

        <Section title="Analytics">
          <p>We currently use <strong>no third-party analytics</strong> or tracking SDKs in our apps. If this changes in a future update, this policy will be updated before that version ships and you will be notified via an App Store update description.</p>
        </Section>

        <Section title="Advertising">
          <p>Our apps contain <strong>no advertising</strong> and do not use any ad networks or advertising identifiers.</p>
        </Section>

        <Section title="Third-Party Services">
          <p>Our apps may use the following services whose own privacy policies govern their data handling:</p>
          <ul>
            <li><strong>Apple Game Center</strong> — optional leaderboard integration (governed by Apple&apos;s Privacy Policy)</li>
            <li><strong>Apple App Store</strong> — standard purchase and distribution platform</li>
          </ul>
          <p>We do not share data with any other third parties.</p>
        </Section>

        <Section title="Children">
          <p>Our apps are rated for general audiences and are suitable for all ages. We do not knowingly collect any personal information from children under 13. Because we collect no personal data at all, our apps are safe for children to use.</p>
        </Section>

        <Section title="Changes to This Policy">
          <p>If we make material changes to this privacy policy, we will update the effective date above and describe the change in the App Store release notes for the corresponding app update.</p>
        </Section>

        <Section title="Contact">
          <p>Questions about this policy? Reach us at:</p>
          <a className="prv-contact" href={`mailto:${CONTACT}`}>{CONTACT}</a>
        </Section>
      </div>

      <footer className="prv-footer">
        <div className="footer-logo">🦕 DINOSAUR<span className="footer-ai">AI</span></div>
        <p className="footer-sub">{SITE} &nbsp;·&nbsp; 2026</p>
      </footer>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="prv-section">
      <h2 className="prv-h2">{title}</h2>
      <div className="prv-body">{children}</div>
    </section>
  );
}
