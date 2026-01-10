/**
 * @type {Route.MetaFunction}
 */
export const meta = () => {
  return [{title: 'Returns'}];
};

export default function Returns() {
  return (
    <div className="policy">
      <h1>Returns & Refunds</h1>

      <h2>Return Policy</h2>
      <p>We accept returns within 30 days of purchase. To be eligible for a return, your item must be unused and in the same condition that you received it. It must also be in the original packaging.</p>

      <h2>How to Return</h2>
      <p>To initiate a return, please contact us at support@ultrlx.com with your order number and reason for return. We will provide you with a return shipping label and instructions.</p>

      <h2>Refunds</h2>
      <p>Once we receive your return, we will inspect it and notify you of the approval or rejection of your refund. If approved, your refund will be processed, and a credit will automatically be applied to your original method of payment within 5-10 business days.</p>

      <h2>Exchanges</h2>
      <p>We only replace items if they are defective or damaged. If you need to exchange an item, contact us at support@ultrlx.com.</p>

      <h2>Questions?</h2>
      <p>If you have any questions about our return policy, please contact us at support@ultrlx.com.</p>
    </div>
  );
}

/** @typedef {import('./+types/returns').Route} Route */
