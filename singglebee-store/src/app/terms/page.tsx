import PolicyLayout from "@/components/layout/PolicyLayout";

export default function TermsAndConditions() {
    return (
        <PolicyLayout title="Terms & Conditions" lastUpdated="March 07, 2026">
            <section>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Agreement to Terms</h2>
                <p>
                    By accessing or using SinggleBee, you agree to be bound by these Terms and Conditions.
                    If you do not agree, please do not use our services.
                </p>
            </section>

            <section>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">2. Use of License</h2>
                <p>
                    Permission is granted to temporarily download one copy of the materials (information or software)
                    on SinggleBee&apos;s website for personal, non-commercial transitory viewing only.
                </p>
            </section>

            <section>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">3. Disclaimer</h2>
                <p>
                    The materials on SinggleBee&apos;s website are provided on an &apos;as is&apos; basis. SinggleBee makes no
                    warranties, expressed or implied, and hereby disclaims and negates all other warranties.
                </p>
            </section>

            <section>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Governing Law</h2>
                <p>
                    These terms and conditions are governed by and construed in accordance with the laws of India
                    and you irrevocably submit to the exclusive jurisdiction of the courts in that State or location.
                </p>
            </section>
        </PolicyLayout>
    );
}
