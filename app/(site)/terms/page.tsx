import type { Metadata } from "next";
import { LegalPage } from "@/components/site/LegalPage";

export const metadata: Metadata = { title: "Terms and conditions" };

const sections = [
  {
    heading: "Agreement",
    body: (
      <p>
        These terms govern your use of the Brave Skill platform — the website at academy.emyphilltech.com.ng, the
        administrator and student portals, and the Brave Skill Android application. The platform is operated by
        Emyphill-Tech Global Solutions Limited. By creating an account or using the platform, you agree to these terms.
        If you do not agree, do not use the platform.
      </p>
    ),
  },
  {
    heading: "Accounts",
    body: (
      <>
        <p>
          You must provide accurate information and keep your password confidential. You are responsible for activity under
          your account. Accounts are personal and may not be shared, sold or transferred without our written consent.
        </p>
        <p>
          We may suspend or terminate an account that breaches these terms, engages in fraud, shares course materials, or
          abuses other users or staff.
        </p>
      </>
    ),
  },
  {
    heading: "Courses and access",
    body: (
      <>
        <p>
          Course content, structure, pricing and availability may change as the academy improves. A purchase grants you a
          personal, non-exclusive, non-transferable licence to access the course for as long as it remains on the platform,
          subject to these terms.
        </p>
        <p>
          We may update lessons, add materials or retire content. If a course is permanently withdrawn, affected learners
          will be offered an alternative or a proportionate remedy.
        </p>
      </>
    ),
  },
  {
    heading: "Payments",
    body: (
      <>
        <p>
          Prices are displayed in Nigerian Naira and include applicable taxes unless stated otherwise. Payments are processed
          by Paystack. Access is granted only after our server verifies a successful transaction; a browser confirmation
          alone is not sufficient.
        </p>
        <p>
          You are responsible for any charges imposed by your bank or card issuer. Where a payment is reversed, disputed or
          found to be fraudulent, we may suspend access while the matter is investigated.
        </p>
      </>
    ),
  },
  {
    heading: "Refunds",
    body: (
      <p>
        Refunds are governed by our <a href="/refunds">Refund policy</a>. Please read it before purchasing. Statutory rights
        that cannot be excluded by agreement remain unaffected.
      </p>
    ),
  },
  {
    heading: "Intellectual property",
    body: (
      <>
        <p>
          All course videos, documents, assessments, graphics, branding and software on the platform are owned by or licensed
          to Emyphill-Tech Global Solutions Limited and are protected by copyright and other laws.
        </p>
        <p>
          You may not download, record, reproduce, resell, publish or distribute course materials, except for the PDF field
          guides we explicitly provide for your personal use. Certificates may be shared to demonstrate your achievement, but
          may not be altered.
        </p>
      </>
    ),
  },
  {
    heading: "Acceptable use",
    body: (
      <ul>
        <li>Do not attempt to bypass payment, entitlement or access controls.</li>
        <li>Do not probe, scan or attack the platform, or interfere with other users.</li>
        <li>Do not upload malicious files or use the platform for unlawful purposes.</li>
        <li>Do not misrepresent a Brave Skill certificate or your identity.</li>
        <li>Do not scrape, mirror or automate access to course content.</li>
      </ul>
    ),
  },
  {
    heading: "Certificates and assessments",
    body: (
      <p>
        Certificates are issued after you complete the required lessons and pass the final assessment. They certify
        completion of training, not professional licensing or a guarantee of employment. We may revoke a certificate if it
        was obtained through cheating, impersonation or error, and the public verification page will reflect that status.
      </p>
    ),
  },
  {
    heading: "Educational disclaimer",
    body: (
      <p>
        Our courses teach practical techniques, but electrical, solar, networking and security work can be dangerous. You are
        responsible for working safely, following applicable regulations, using appropriate protective equipment and obtaining
        any required licences. Always follow manufacturer instructions and local codes. Brave Skill is not liable for work
        you perform on third-party property.
      </p>
    ),
  },
  {
    heading: "Availability and liability",
    body: (
      <p>
        We aim for high availability but do not guarantee uninterrupted service. The platform is provided on an “as
        available” basis. To the maximum extent permitted by law, our total liability arising from your use of the platform
        is limited to the amount you paid us in the twelve months preceding the claim. We are not liable for indirect or
        consequential loss. Nothing in these terms limits liability that cannot lawfully be limited.
      </p>
    ),
  },
  {
    heading: "Changes, governing law and contact",
    body: (
      <>
        <p>
          We may update these terms; material changes will be posted on this page. Continued use after an update constitutes
          acceptance. These terms are governed by the laws of the Federal Republic of Nigeria, and the courts of Nigeria have
          jurisdiction over disputes.
        </p>
        <p>Questions: support@academy.emyphilltech.com.ng</p>
      </>
    ),
  },
];

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms & conditions"
      intro="The rules that govern your use of Brave Skill, our courses and your account."
      updated="12 November 2026"
      sections={sections}
    />
  );
}
