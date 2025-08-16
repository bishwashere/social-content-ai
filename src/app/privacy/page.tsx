"use client";

import React from "react";

const PrivacyPolicyPage = () => {
  return (
    <div className="bg-gray-50 text-gray-900 min-h-screen antialiased">

      {/* Main Content */}
      <main className="mx-auto max-w-4xl px-6 py-10 space-y-10">
        <h1 className="text-3xl font-bold tracking-tight">Privacy Policy</h1>

        {/* Sections */}
        <Section title="About">
          <p>
            This privacy policy applies to the <strong>NextPostAI</strong> app (hereby referred to as
            “Application”) for mobile devices that was created by <strong>UncleSamstech LLC</strong> (hereby
            referred to as “Service Provider”) as a <strong>Free</strong> service. This service is intended for use
            “AS IS”.
          </p>
        </Section>

        <Section title="Information Collection and Use">
          <p>The Application collects information when you download and use it. This information may include:</p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li>Your device’s Internet Protocol address (IP address)</li>
            <li>The pages of the Application you visit, time and date of visit, time spent on pages</li>
            <li>The time spent on the Application</li>
            <li>The operating system you use on your device</li>
          </ul>
          <p className="mt-2">
            The Application does not gather precise location info. Information may be used to contact you for
            updates, notices, or promotions.
          </p>
        </Section>

        <Section title="Third Party Access">
          <p>
            Only aggregated, anonymized data is transmitted to external services to help improve the Application. The
            Service Provider may disclose information as required by law, to protect rights or safety, or to trusted
            service providers who agreed to this privacy policy.
          </p>
        </Section>

        <Section title="Opt-Out Rights">
          <p>
            You can stop all data collection by uninstalling the Application using standard uninstall methods provided
            by your device or marketplace.
          </p>
        </Section>

        <Section title="Data Retention Policy">
          <p>
            User data is retained while you use the Application and for a reasonable time thereafter. To delete your
            data, contact <a href="mailto:support@unclesamstech.com" className="text-indigo-600 hover:underline">support@unclesamstech.com</a>.
          </p>
        </Section>

        <Section title="Children">
          <p>
            The Service Provider does not knowingly collect data from children under 13. Parents should monitor their
            children and instruct them not to submit personal info. Users must be at least 16 to consent.
          </p>
        </Section>

        <Section title="Security">
          <p>
            The Service Provider maintains physical, electronic, and procedural safeguards to protect your information.
          </p>
        </Section>

        <Section title="Changes">
          <p>
            This Privacy Policy may be updated occasionally. Continued use of the Application constitutes acceptance
            of changes.
          </p>
        </Section>

        <Section title="Your Consent">
          <p>
            By using the Application, you consent to the processing of your information as described in this Privacy
            Policy.
          </p>
        </Section>

        <Section title="Contact Us">
          <p>
            Questions about privacy? Contact us at{" "}
            <a href="mailto:support@unclesamstech.com" className="text-indigo-600 hover:underline">
              support@unclesamstech.com
            </a>.
          </p>
        </Section>
      </main>

      {/* Footer */}
      <footer className="mt-10 border-t bg-white">
        <div className="mx-auto max-w-3xl px-6 py-8 text-sm text-gray-600">
          <p>© {new Date().getFullYear()} NextPostAI. All rights reserved.</p>
          <p className="mt-1">Provided by UncleSamstech LLC.</p>
        </div>
      </footer>
    </div>
  );
};

type SectionProps = {
  title: string;
  children: React.ReactNode;
};

const Section: React.FC<SectionProps> = ({ title, children }) => (
  <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
    <h2 className="text-xl font-semibold">{title}</h2>
    <div className="mt-3 space-y-2">{children}</div>
  </section>
);

export default PrivacyPolicyPage;
