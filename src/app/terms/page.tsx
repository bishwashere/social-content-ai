import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Footer from "@/components/footer"

export default function TermsPage() {
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
            <span className="text-muted-foreground">Terms &amp; Conditions</span>
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
          <h1 className="text-4xl lg:text-5xl font-bold tracking-tight mb-8">Terms &amp; Conditions</h1>
          <p className="text-muted-foreground mb-12">Last updated: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>

          {/* Content */}
          <div className="prose prose-gray dark:prose-invert max-w-none space-y-8">
            <section>
              <h2 className="text-2xl font-semibold mb-4">1. Acceptance of Terms</h2>
              <p className="text-muted-foreground">
                By accessing and using NextPostAI, you accept and agree to be bound by these Terms &amp; Conditions. If you do not agree, please do not use our service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">2. Service Description</h2>
              <p className="text-muted-foreground">
                NextPostAI is an AI-powered marketing assistant that helps users create, plan, and schedule social media content. We reserve the right to modify or discontinue the service at any time.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">3. User Accounts</h2>
              <p className="text-muted-foreground">
                You are responsible for maintaining the confidentiality of your account credentials. You agree to notify us immediately of any unauthorized use of your account.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">4. Acceptable Use</h2>
              <p className="text-muted-foreground mb-2">You agree not to:</p>
              <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                <li>Use the service for any illegal or unauthorized purpose</li>
                <li>Violate any laws or regulations</li>
                <li>Infringe on intellectual property rights</li>
                <li>Transmit harmful code or malware</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">5. Intellectual Property</h2>
              <p className="text-muted-foreground">
                All content, features, and functionality of NextPostAI are owned by UncleSamstech LLC and are protected by copyright, trademark, and other intellectual property laws.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">6. Limitation of Liability</h2>
              <p className="text-muted-foreground">
                NextPostAI is provided &quot;AS IS&quot; without warranties. We are not liable for any damages arising from your use of the service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">7. Termination</h2>
              <p className="text-muted-foreground">
                We may terminate or suspend your account immediately, without prior notice, for conduct that we believe violates these Terms.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">8. Changes to Terms</h2>
              <p className="text-muted-foreground">
                We reserve the right to modify these Terms at any time. Continued use of the service after changes constitutes acceptance of the new Terms.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">9. Contact</h2>
              <p className="text-muted-foreground">
                Questions about these Terms? Contact us at{" "}
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
