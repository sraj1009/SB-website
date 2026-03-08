import PolicyLayout from "@/components/layout/PolicyLayout";

export default function ShippingPolicy() {
    return (
        <PolicyLayout title="Shipping Policy" lastUpdated="March 07, 2026">
            <section>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Domestic Shipping</h2>
                <p>
                    We provide free shipping on all orders above ₹499 within India. For orders below ₹499,
                    a flat shipping fee of ₹50 will be applicable.
                </p>
            </section>

            <section>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">2. Processing Time</h2>
                <p>
                    All orders are processed within 1-2 business days. Orders are not shipped or delivered
                    on weekends or holidays.
                </p>
            </section>

            <section>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">3. Delivery Times</h2>
                <p>
                    Estimated delivery time is 3-7 business days depending on your location.
                    Delivery delays can occasionally occur due to unforeseen circumstances.
                </p>
            </section>

            <section>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Tracking</h2>
                <p>
                    You will receive a Shipment Confirmation email once your order has shipped containing
                    your tracking number(s).
                </p>
            </section>
        </PolicyLayout>
    );
}
