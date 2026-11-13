import type { Metadata } from "next";
import { LegalPage } from "@/components/site/LegalPage";

export const metadata: Metadata = { title: "Privacy policy" };

const sections = [
  {
    heading: "Who we are",
    body: (
      <>
        <p>
          Brave Skill is a skill acquisition academy operated by <strong>Emyphill-Tech Global Solutions Limited</strong>,
          a company registered in the Federal Republic of Nigeria (“we”, “us”, “our”). This policy explains what personal
          data we collect through academy.emyphilltech.com.ng and the Brave Skill Android application, why we collect it,
          and the choices you have.
        </p>
        <p>
          We process personal data in line with the Nigeria Data Protection Act 2023 and applicable data protection
          principles: lawfulness, purpose limitation, data minimisation, accuracy, storage limitation, integrity and
          accountability.
        </p>
      </>
    ),
  },
  {
    heading: "Data we collect",
    body: (
      <>
        <ul>
          <li><strong>Account data:</strong> name, email address, phone number, password hash, role and account status.</li>
          <li><strong>Learning data:</strong> enrolments, lesson progress, quiz and examination attempts, certificates issued.</li>
          <li><strong>Payment data:</strong> transaction references, amounts, status, receipts and refund records. Card details are entered directly into Paystack and are never stored on our servers.</li>
          <li><strong>Technical data:</strong> IP address, browser and device information, and limited security logs used to prevent abuse.</li>
          <li><strong>Communications:</strong> messages you send through the contact form or by email.</li>
        </ul>
      </>
    ),
  },
  {
    heading: "How we use your data",
    body: (
      <>
        <p>We use your data to:</p>
        <ul>
          <li>create and secure your account, and authenticate you on web and Android;</li>
          <li>grant access to courses you have purchased or been enrolled in;</li>
          <li>track progress and issue certificates;</li>
          <li>process payments, receipts and refunds through Paystack;</li>
          <li>send transactional messages (payment confirmations, access changes, certificate notices);</li>
          <li>maintain platform security, investigate abuse and meet legal obligations;</li>
          <li>improve the academy using aggregated, non-identifying analytics.</li>
        </ul>
        <p>We do not sell your personal data, and we do not use your data for third-party advertising.</p>
      </>
    ),
  },
  {
    heading: "Brave AI Assistant and voice",
    body: (
      <>
        <p>
          The academy offers an AI assistant on the website and Android app. When you use
          it, we store the conversation text, the assistant's replies, the tools used and
          any support ticket created. When you choose the microphone, your device or
          browser asks for permission before recording. Voice recognition may be performed
          by your browser, operating system or a configured speech provider.
        </p>
        <p>
          Brave Skill does not store raw microphone audio. If a premium server voice is
          enabled, the text of the reply is sent to the speech provider to generate audio;
          the text you speak is handled by the selected speech-recognition service. Do not
          share passwords, PINs, one-time codes or card details with the assistant — it is
          designed never to ask for them.
        </p>
        <p>
          Conversations are used to answer your question, improve the assistant, review
          escalations and maintain security. Administrators can access transcripts for
          support and quality purposes. AI guidance is informational; payments, enrolment
          and certificates are only confirmed by the academy's verified records.
        </p>
      </>
    ),
  },
  {
    heading: "Lawful basis",
    body: (
      <p>
        We process account and learning data to perform our contract with you; payment and tax records to comply with
        legal obligations; security logs under our legitimate interest in protecting the platform; and optional
        communications with your consent, which you may withdraw at any time.
      </p>
    ),
  },
  {
    heading: "Sharing and processors",
    body: (
      <>
        <p>We share only what is necessary with trusted processors:</p>
        <ul>
          <li><strong>Paystack</strong> — payment processing, verification and refunds.</li>
          <li><strong>Hosting and infrastructure providers</strong> — to operate the website, database and media storage.</li>
          <li><strong>Email delivery providers</strong> — to send transactional messages.</li>
          <li><strong>Professional advisers or authorities</strong> — where required by law or to protect legal rights.</li>
        </ul>
        <p>Processors act on our instructions and are bound by confidentiality and security obligations.</p>
      </>
    ),
  },
  {
    heading: "Cookies",
    body: (
      <p>
        We use a single essential, HTTP-only session cookie to keep you signed in. It contains a signed token and no
        advertising identifiers. Blocking it will prevent you from signing in. We do not use third-party advertising or
        cross-site tracking cookies.
      </p>
    ),
  },
  {
    heading: "Retention",
    body: (
      <p>
        Account and learning records are retained while your account is active and for a reasonable period afterwards to
        preserve certificate verifiability. Payment and tax records are retained for the period required by Nigerian law.
        Security logs are kept for a short operational window. When data is no longer needed, it is deleted or anonymised.
      </p>
    ),
  },
  {
    heading: "Your rights",
    body: (
      <>
        <p>Subject to applicable law, you may request to:</p>
        <ul>
          <li>access a copy of the personal data we hold about you;</li>
          <li>correct inaccurate data;</li>
          <li>delete data that is no longer necessary (some records, such as issued certificates and payment history, may need to be retained);</li>
          <li>restrict or object to certain processing;</li>
          <li>withdraw consent for optional communications;</li>
          <li>receive a portable copy of data you provided.</li>
        </ul>
        <p>Requests can be sent to support@academy.emyphilltech.com.ng. We may need to verify your identity first.</p>
      </>
    ),
  },
  {
    heading: "Security",
    body: (
      <p>
        Passwords are hashed with bcrypt. Sessions use signed, HTTP-only cookies. Course videos and PDFs are served only
        after an entitlement check. Administrative actions are recorded in an audit log, and payment fulfilment occurs only
        after server-side verification with Paystack. No system is perfectly secure, but we work continuously to protect
        your data and will notify affected users of a material breach as required by law.
      </p>
    ),
  },
  {
    heading: "Children",
    body: (
      <p>
        The academy is intended for users aged 16 and above. We do not knowingly collect personal data from children under
        16. If you believe a child has created an account, contact us and we will remove it.
      </p>
    ),
  },
  {
    heading: "Changes and contact",
    body: (
      <>
        <p>
          We may update this policy as the platform evolves. Material changes will be announced on this page with a new
          effective date.
        </p>
        <p>
          Emyphill-Tech Global Solutions Limited<br />
          Email: support@academy.emyphilltech.com.ng<br />
          Website: https://academy.emyphilltech.com.ng
        </p>
      </>
    ),
  },
];

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy policy"
      intro="How Brave Skill collects, uses and protects your personal information."
      updated="12 November 2026"
      sections={sections}
    />
  );
}
