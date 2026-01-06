import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Privacy Policy | Open Banana",
  description:
    "Privacy Policy for Open Banana - Free AI Image Generator. Learn how we collect, use, and protect your data.",
  robots: {
    index: true,
    follow: true,
  },
}

export default function PrivacyPolicyPage() {
  const lastUpdated = "January 6, 2026"

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="max-w-3xl mx-auto px-4 py-8 md:py-16">
        {/* Header */}
        <div className="mb-8 md:mb-12">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-white transition-colors mb-6 md:mb-8"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            Back to Home
          </Link>

          <h1 className="text-2xl md:text-4xl font-bold text-white mb-2">
            Privacy Policy
          </h1>
          <p className="text-sm text-muted-foreground">
            Last Updated: {lastUpdated}
          </p>
        </div>

        {/* Content */}
        <div className="space-y-8 md:space-y-10">
          {/* Introduction */}
          <section>
            <h2 className="text-lg md:text-xl font-semibold text-white mb-3 md:mb-4">
              1. Introduction
            </h2>
            <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
              This Privacy Policy describes how Open Banana (&quot;we&quot;,
              &quot;us&quot;, or &quot;our&quot;) collects, uses, and protects
              your information when you use our free AI image generation
              service. By using Open Banana, you agree to the collection and
              use of information in accordance with this policy.
            </p>
          </section>

          {/* Information We Collect */}
          <section>
            <h2 className="text-lg md:text-xl font-semibold text-white mb-3 md:mb-4">
              2. Information We Collect
            </h2>
            <p className="text-sm md:text-base text-muted-foreground leading-relaxed mb-4">
              We collect minimal information necessary to provide our service:
            </p>
            <ul className="list-disc list-inside space-y-2 text-sm md:text-base text-muted-foreground">
              <li>
                <span className="text-white font-medium">Uploaded Images:</span>{" "}
                Images you upload for editing are processed temporarily and are
                not stored permanently on our servers.
              </li>
              <li>
                <span className="text-white font-medium">Text Prompts:</span>{" "}
                The prompts you enter to generate or edit images are sent to our
                AI service for processing.
              </li>
              <li>
                <span className="text-white font-medium">Usage Data:</span>{" "}
                Anonymous analytics data about how you interact with our
                service, collected via Vercel Analytics.
              </li>
              <li>
                <span className="text-white font-medium">
                  Optional API Key:
                </span>{" "}
                If you choose to use your own BytePlus API key, it is stored
                locally in your browser&apos;s localStorage.
              </li>
            </ul>
          </section>

          {/* How We Use Information */}
          <section>
            <h2 className="text-lg md:text-xl font-semibold text-white mb-3 md:mb-4">
              3. How We Use Your Information
            </h2>
            <p className="text-sm md:text-base text-muted-foreground leading-relaxed mb-4">
              We use the information we collect for the following purposes:
            </p>
            <ul className="list-disc list-inside space-y-2 text-sm md:text-base text-muted-foreground">
              <li>To generate and edit images based on your prompts</li>
              <li>To improve prompt quality when you use the &quot;Improve&quot; feature</li>
              <li>To analyze usage patterns and improve our service</li>
              <li>To enforce rate limits and prevent abuse</li>
            </ul>
          </section>

          {/* Data Storage & Retention */}
          <section>
            <h2 className="text-lg md:text-xl font-semibold text-white mb-3 md:mb-4">
              4. Data Storage & Retention
            </h2>
            <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
              <span className="text-white font-medium">
                Temporary Processing:
              </span>{" "}
              Images you upload and prompts you submit are processed in
              real-time and are not permanently stored on our servers. Generated
              images are temporarily cached to allow you to download them but
              are automatically deleted after a short period.
            </p>
          </section>

          {/* Local Storage */}
          <section>
            <h2 className="text-lg md:text-xl font-semibold text-white mb-3 md:mb-4">
              5. Local Storage
            </h2>
            <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
              We use your browser&apos;s localStorage to store your optional
              BytePlus API key locally on your device. This data never leaves
              your browser and is not transmitted to our servers. You can clear
              this data at any time by clearing your browser&apos;s local
              storage or using the &quot;Clear&quot; button in the API key
              settings.
            </p>
          </section>

          {/* Third-Party Services */}
          <section>
            <h2 className="text-lg md:text-xl font-semibold text-white mb-3 md:mb-4">
              6. Third-Party Services
            </h2>
            <p className="text-sm md:text-base text-muted-foreground leading-relaxed mb-4">
              We use the following third-party services:
            </p>
            <ul className="list-disc list-inside space-y-2 text-sm md:text-base text-muted-foreground">
              <li>
                <span className="text-white font-medium">BytePlus API:</span>{" "}
                Powers our AI image generation. Your prompts and images are sent
                to BytePlus for processing. Please refer to{" "}
                <a
                  href="https://www.byteplus.com/en/legal/privacy-policy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white underline hover:text-gray-300 transition-colors"
                >
                  BytePlus Privacy Policy
                </a>{" "}
                for more information.
              </li>
              <li>
                <span className="text-white font-medium">Vercel Analytics:</span>{" "}
                Provides anonymous, privacy-friendly analytics. No personally
                identifiable information is collected. Learn more at{" "}
                <a
                  href="https://vercel.com/docs/analytics/privacy-policy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white underline hover:text-gray-300 transition-colors"
                >
                  Vercel Analytics Privacy Policy
                </a>
                .
              </li>
            </ul>
          </section>

          {/* Your Rights */}
          <section>
            <h2 className="text-lg md:text-xl font-semibold text-white mb-3 md:mb-4">
              7. Your Rights
            </h2>
            <p className="text-sm md:text-base text-muted-foreground leading-relaxed mb-4">
              You have the following rights regarding your data:
            </p>
            <ul className="list-disc list-inside space-y-2 text-sm md:text-base text-muted-foreground">
              <li>
                <span className="text-white font-medium">Clear Local Data:</span>{" "}
                You can clear your locally stored API key at any time through
                browser settings or the app interface.
              </li>
              <li>
                <span className="text-white font-medium">Data Access:</span>{" "}
                Contact us to request information about any data we may have
                associated with your usage.
              </li>
              <li>
                <span className="text-white font-medium">Opt-Out:</span>{" "}
                You can use browser extensions to block analytics if you prefer
                not to be included in anonymous usage statistics.
              </li>
            </ul>
          </section>

          {/* Children's Privacy */}
          <section>
            <h2 className="text-lg md:text-xl font-semibold text-white mb-3 md:mb-4">
              8. Children&apos;s Privacy
            </h2>
            <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
              Open Banana is not directed to children under the age of 13. We do
              not knowingly collect personal information from children. If you
              are a parent or guardian and believe your child has provided us
              with personal information, please contact us so we can take
              appropriate action.
            </p>
          </section>

          {/* Changes to This Policy */}
          <section>
            <h2 className="text-lg md:text-xl font-semibold text-white mb-3 md:mb-4">
              9. Changes to This Policy
            </h2>
            <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
              We may update this Privacy Policy from time to time. We will
              notify you of any changes by posting the new Privacy Policy on
              this page and updating the &quot;Last Updated&quot; date. You are
              advised to review this Privacy Policy periodically for any
              changes.
            </p>
          </section>

          {/* Contact Us */}
          <section>
            <h2 className="text-lg md:text-xl font-semibold text-white mb-3 md:mb-4">
              10. Contact Us
            </h2>
            <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
              If you have any questions about this Privacy Policy or our data
              practices, please contact us at:{" "}
              <a
                href="mailto:faizintifada@gmail.com"
                className="text-white underline hover:text-gray-300 transition-colors"
              >
                faizintifada@gmail.com
              </a>
            </p>
          </section>
        </div>

        {/* Footer */}
        <div className="mt-12 md:mt-16 pt-6 border-t border-border">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-white transition-colors"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            Back to Open Banana
          </Link>
        </div>
      </div>
    </main>
  )
}
