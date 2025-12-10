import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Footer from "@/components/footer"

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header similar to /ideas */}
      <div className="w-full px-4 border-b h-fit relative overflow-hidden flex items-center justify-center">
        <div className="flex h-16 items-center justify-between bg-background w-full md:px-8">
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="cursor-pointer hover:opacity-80 transition-opacity flex items-center gap-2"
            >
              <Image
                src="/logo-transparent.png"
                width="100"
                height="100"
                alt="NextPostAI"
                className="size-6"
              />
              <span className="font-semibold text-lg">NextPostAI</span>
            </Link>
            <span className="text-muted-foreground mx-2">/</span>
            <span className="text-muted-foreground">Privacy Policy</span>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <article className="max-w-4xl mx-auto">
          {/* Navigation */}
          <Button asChild variant="ghost" className="mb-8 -ml-4">
            <Link href="/">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Link>
          </Button>

          {/* Title */}
          <h1 className="text-4xl lg:text-5xl font-bold tracking-tight mb-8">Privacy Policy</h1>
          <p className="text-muted-foreground mb-12">Last updated: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>

          {/* Content */}
          <div className="prose prose-gray dark:prose-invert max-w-none space-y-8">
            <section>
              <h2 className="text-2xl font-semibold mb-4">1. Information We Collect</h2>
              <p className="text-muted-foreground">
                We collect information when you use NextPostAI, including your IP address, device information, usage data, and account information. We do not collect precise location data.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">2. How We Use Information</h2>
              <p className="text-muted-foreground">
                We use collected information to provide, maintain, and improve our services, send updates and notifications, and ensure security.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">3. Data Sharing</h2>
              <p className="text-muted-foreground">
                We share aggregated, anonymized data with service providers to improve the application. We may disclose information as required by law or to protect rights and safety.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">4. Data Security</h2>
              <p className="text-muted-foreground">
                We implement physical, electronic, and procedural safeguards to protect your information. However, no method of transmission over the internet is 100% secure.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">5. Your Rights</h2>
              <p className="text-muted-foreground mb-2">You can:</p>
              <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                <li>Access and update your account information</li>
                <li>Request deletion of your data</li>
                <li>Opt-out of data collection by uninstalling the application</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">6. Children&apos;s Privacy</h2>
              <p className="text-muted-foreground">
                We do not knowingly collect data from children under 13. Users must be at least 16 to consent to data processing.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">7. Data Retention</h2>
              <p className="text-muted-foreground">
                We retain your data while you use the service and for a reasonable time thereafter. To delete your data, contact us at{" "}
                <a href="mailto:support@unclesamstech.com" className="text-primary hover:underline">
                  support@unclesamstech.com
                </a>
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">8. Changes to Privacy Policy</h2>
              <p className="text-muted-foreground">
                We may update this Privacy Policy from time to time. Continued use of the service after changes constitutes acceptance of the updated policy.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">9. Contact Us</h2>
              <p className="text-muted-foreground">
                Questions about privacy? Contact us at{" "}
                <a href="mailto:support@unclesamstech.com" className="text-primary hover:underline">
                  support@unclesamstech.com
                </a>
              </p>
            </section>
          </div>
        </article>
      </div>
      <Footer />
    </div>
  )
}
