import type { Metadata } from "next";
import { LegalPage } from "@/components/site/LegalPage";

export const metadata: Metadata = { title: "Refund policy" };

const sections = [
  {
    heading: "Our approach",
    body: (
      <p>
        We want you to feel confident enrolling. If a course is not what you expected, contact us quickly and we will review
        your situation fairly. This policy explains when refunds are available and how to request one.
      </p>
    ),
  },
  {
    heading: "Seven-day window",
    body: (
      <>
        <p>
          You may request a refund within <strong>seven (7) days</strong> of purchase if you have completed{" "}
          <strong>less than 20%</strong> of the course lessons. Refunds are returned through Paystack to the original payment
          method.
        </p>
        <p>
          After this window, or once a substantial portion of the course has been consumed, refunds are generally not
          available because access to digital content has already been delivered.
        </p>
      </>
    ),
  },
  {
    heading: "When we always help",
    body: (
      <ul>
        <li>You were charged twice for the same course.</li>
        <li>Payment succeeded but access was not granted, and we cannot resolve it.</li>
        <li>The course was materially different from its published description.</li>
        <li>A course was withdrawn shortly after purchase with no suitable alternative.</li>
      </ul>
    ),
  },
  {
    heading: "When refunds are not available",
    body: (
      <ul>
        <li>You changed your mind after completing a substantial part of the course.</li>
        <li>You lost interest, lacked time, or no longer need the skill.</li>
        <li>You were suspended for breaching the terms or sharing course materials.</li>
        <li>A certificate was revoked because it was obtained through cheating.</li>
        <li>The request is made after the seven-day window and outside the cases above.</li>
      </ul>
    ),
  },
  {
    heading: "How to request a refund",
    body: (
      <>
        <p>
          Email support@academy.emyphilltech.com.ng with your account email, the transaction reference or order number, and
          a short reason. You may also contact us through the support page.
        </p>
        <p>We aim to respond within three business days and to complete approved refunds within ten business days, subject to Paystack and your bank’s processing times.</p>
      </>
    ),
  },
  {
    heading: "Effect of a refund",
    body: (
      <p>
        When a refund is approved, the related enrolment, progress and certificate are revoked, and access to the course is
        removed. Any certificate serial previously issued for that enrolment will show as revoked on our verification page.
      </p>
    ),
  },
  {
    heading: "Chargebacks",
    body: (
      <p>
        Please contact us before raising a chargeback — most issues are resolved faster directly. Accounts with an
        unresolved chargeback may be suspended while the dispute is investigated.
      </p>
    ),
  },
];

export default function RefundsPage() {
  return (
    <LegalPage
      title="Refund policy"
      intro="Fair, clear rules for refunds on Brave Skill course purchases."
      updated="12 November 2026"
      sections={sections}
    />
  );
}
