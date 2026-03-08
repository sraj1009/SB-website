import PolicyLayout from "@/components/layout/PolicyLayout";

export default function PrivacyPolicy() {
    return (
        <PolicyLayout title="Privacy Policy" lastUpdated="March 07, 2026">
            <section>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Introduction</h2>
                <p>
                    Welcome to SinggleBee. We value your privacy and are committed to protecting your personal data.
                    This Privacy Policy explains how we collect, use, and safeguard your information when you visit our website.
                </p>
            </section>

            <section>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">2. Data Collection</h2>
                <p>
                    We collect information that you provide directly to us, such as when you create an account, make a purchase,
                    or contact our customer support. This may include your name, email address, shipping address, and payment information.
                </p>
            </section>

            <section>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">3. Use of Data</h2>
                <p>
                    We use your data to process orders, provide customer support, improve our services, and send promotional communications
                    (if you have opted in). We do not sell your personal data to third parties.
                </p>
            </section>

            <section>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Cookies</h2>
                <p>
                    Our website uses cookies to enhance your browsing experience and analyze site traffic. You can manage your
                    cookie preferences through your browser settings.
                </p>
            </section>
        </PolicyLayout>
    );
}
