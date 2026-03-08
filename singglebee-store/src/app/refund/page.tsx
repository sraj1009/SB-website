import PolicyLayout from "@/components/layout/PolicyLayout";

export default function RefundPolicy() {
    return (
        <PolicyLayout title="Refund Policy" lastUpdated="March 07, 2026">
            <section>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Refund Eligibility</h2>
                <p>
                    We offer a 7-day return and refund policy for most items. To be eligible for a return,
                    your item must be unused and in the same condition that you received it.
                </p>
            </section>

            <section>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">2. Process</h2>
                <p>
                    To initiate a return, please contact our support team at singglebee.rsventures@gmail.com with your order details.
                    Once your return is received and inspected, we will notify you of the approval or rejection of your refund.
                </p>
            </section>

            <section>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">3. Late or Missing Refunds</h2>
                <p>
                    If you haven’t received a refund yet, first check your bank account again. Then contact your
                    credit card company; it may take some time before your refund is officially posted.
                </p>
            </section>

            <section>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Shipping Costs</h2>
                <p>
                    You will be responsible for paying for your own shipping costs for returning your item.
                    Shipping costs are non-refundable.
                </p>
            </section>
        </PolicyLayout>
    );
}
