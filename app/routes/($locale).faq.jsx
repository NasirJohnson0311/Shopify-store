/**
 * @type {Route.MetaFunction}
 */
export const meta = () => {
  return [{title: 'FAQ'}];
};

export default function FAQ() {
  return (
    <div className="policy">
      <h1>Frequently Asked Questions</h1>

      <h2>What is your shipping policy?</h2>
      <p>We offer free shipping on all orders over $50. Orders are typically processed within 1-2 business days and shipped via standard delivery.</p>

      <h2>How can I track my order?</h2>
      <p>Once your order ships, you'll receive a tracking number via email. You can use this to track your package.</p>

      <h2>What is your return policy?</h2>
      <p>We accept returns within 30 days of purchase. Items must be unused and in original packaging. See our Returns page for more details.</p>

      <h2>How do I contact customer support?</h2>
      <p>You can reach us at support@ultrlx.com for any questions or concerns.</p>
    </div>
  );
}

/** @typedef {import('./+types/faq').Route} Route */
