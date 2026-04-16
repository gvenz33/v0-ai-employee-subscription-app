import { Navbar } from "@/components/landing/navbar"
import { Footer } from "@/components/landing/footer"

export const metadata = {
  title: "Terms of Use - 247 AI Employees",
  description: "Terms of Use for 247 AI Employees",
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-4xl px-6 py-16">
        <h1 className="text-4xl font-display font-bold text-foreground mb-8">Terms of Use</h1>
        <p className="text-muted-foreground mb-8">Last updated: March 26, 2026</p>
        
        <div className="prose prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">1. Acceptance of Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              By accessing or using 247 AI Employees (&quot;Service&quot;), you agree to be bound by these Terms of Use (&quot;Terms&quot;). If you do not agree to these Terms, you may not access or use the Service. We reserve the right to modify these Terms at any time, and your continued use of the Service constitutes acceptance of any modifications.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">2. Description of Service</h2>
            <p className="text-muted-foreground leading-relaxed">
              247 AI Employees provides AI-powered virtual assistants (&quot;AI Employees&quot;) that can perform various business and personal tasks. Our Service includes access to different AI Employees based on your subscription tier, task automation capabilities, and related features. The Service is provided on an &quot;as is&quot; and &quot;as available&quot; basis.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">3. Account Registration</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">To use our Service, you must:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Be at least 18 years of age</li>
              <li>Provide accurate and complete registration information</li>
              <li>Maintain the security of your account credentials</li>
              <li>Promptly notify us of any unauthorized use of your account</li>
              <li>Accept responsibility for all activities under your account</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">4. Subscription Plans and Billing</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              We offer various subscription plans (Personal, Entrepreneur, Business, Enterprise) with different features and task limits. By subscribing:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>You authorize us to charge your payment method on a recurring basis</li>
              <li>Subscription fees are non-refundable except as required by law</li>
              <li>You may cancel your subscription at any time, effective at the end of the current billing period</li>
              <li>Task limits reset at the beginning of each billing cycle</li>
              <li>Unused tasks do not roll over to the next billing period</li>
              <li>Token Packs purchased separately do not expire</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">5. A La Carte Agents</h2>
            <p className="text-muted-foreground leading-relaxed">
              Users on Personal or Entrepreneur plans may purchase access to individual premium AI Employees on a monthly basis (&quot;A La Carte&quot;). A La Carte subscriptions are billed monthly at $9.99 per agent and may be canceled at any time. Access to A La Carte agents ends at the conclusion of the paid billing period.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">6. Acceptable Use</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">You agree not to use the Service to:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Violate any applicable laws or regulations</li>
              <li>Infringe upon intellectual property rights of others</li>
              <li>Generate harmful, abusive, harassing, or discriminatory content</li>
              <li>Create content that promotes violence or illegal activities</li>
              <li>Attempt to circumvent security measures or access restrictions</li>
              <li>Use automated systems to abuse or overload the Service</li>
              <li>Impersonate any person or entity</li>
              <li>Generate spam or unsolicited communications</li>
              <li>Use outputs for deceptive purposes or misinformation</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">7. AI-Generated Content</h2>
            <p className="text-muted-foreground leading-relaxed">
              Content generated by AI Employees is provided for informational and assistance purposes only. You acknowledge that AI-generated content may contain errors, inaccuracies, or inappropriate material. You are solely responsible for reviewing, verifying, and determining the appropriateness of any AI-generated content before use. AI Employees should not be relied upon for legal, medical, financial, or other professional advice.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">8. Intellectual Property</h2>
            <p className="text-muted-foreground leading-relaxed">
              The Service, including all software, designs, text, graphics, and other content, is owned by 247 AI Employees and protected by intellectual property laws. You retain ownership of content you input into the Service. You grant us a limited license to process your content solely to provide the Service. Output generated by AI Employees based on your inputs belongs to you, subject to these Terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">9. Limitation of Liability</h2>
            <p className="text-muted-foreground leading-relaxed">
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, 247 AI EMPLOYEES SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING LOSS OF PROFITS, DATA, OR BUSINESS OPPORTUNITIES, ARISING FROM YOUR USE OF THE SERVICE. OUR TOTAL LIABILITY SHALL NOT EXCEED THE AMOUNT YOU PAID US IN THE TWELVE (12) MONTHS PRECEDING THE CLAIM.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">10. Disclaimer of Warranties</h2>
            <p className="text-muted-foreground leading-relaxed">
              THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, OR SECURE. WE MAKE NO WARRANTIES REGARDING THE ACCURACY, RELIABILITY, OR COMPLETENESS OF AI-GENERATED CONTENT.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">11. Indemnification</h2>
            <p className="text-muted-foreground leading-relaxed">
              You agree to indemnify and hold harmless 247 AI Employees, its officers, directors, employees, and agents from any claims, damages, losses, or expenses arising from your use of the Service, violation of these Terms, or infringement of any third-party rights.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">12. Termination</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may suspend or terminate your access to the Service at any time for violation of these Terms or for any other reason at our sole discretion. Upon termination, your right to use the Service ceases immediately. Provisions that by their nature should survive termination shall remain in effect.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">13. Governing Law</h2>
            <p className="text-muted-foreground leading-relaxed">
              These Terms shall be governed by and construed in accordance with the laws of the State of Delaware, United States, without regard to its conflict of law provisions. Any disputes arising from these Terms shall be resolved in the courts of Delaware.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">14. Contact Information</h2>
            <p className="text-muted-foreground leading-relaxed">
              For questions about these Terms of Use, please contact us at legal@247aiemployees.net.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  )
}
