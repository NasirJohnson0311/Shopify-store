/**
 * @type {Route.MetaFunction}
 */
export const meta = () => {
  return [{title: 'Returns'}];
};

export default function Returns() {
  return (
    <div className="page" style={{
      maxWidth: '800px',
      margin: '0 auto',
      padding: '2rem 1rem',
      color: 'white'
    }}>
      <header style={{marginBottom: '2rem'}}>
        <h1 style={{
          fontSize: '2.5rem',
          fontWeight: '400',
          marginBottom: '1rem',
          color: 'white'
        }}>
          Returns & Refunds
        </h1>
      </header>

      <main style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem'
      }}>
        <section>
          <h2 style={{
            fontSize: '1.5rem',
            fontWeight: '500',
            marginBottom: '1rem',
            color: 'white'
          }}>
            Return Policy
          </h2>
          <p style={{
            fontSize: '1rem',
            color: 'rgba(255, 255, 255, 0.8)',
            lineHeight: '1.6',
            marginBottom: '1rem'
          }}>
            We accept returns within 30 days of purchase. To be eligible for a return, your item must be unused and in the same condition that you received it. It must also be in the original packaging.
          </p>
        </section>

        <section>
          <h2 style={{
            fontSize: '1.5rem',
            fontWeight: '500',
            marginBottom: '1rem',
            color: 'white'
          }}>
            How to Return
          </h2>
          <p style={{
            fontSize: '1rem',
            color: 'rgba(255, 255, 255, 0.8)',
            lineHeight: '1.6',
            marginBottom: '1rem'
          }}>
            To initiate a return, please contact us at support@ultrlx.com with your order number and reason for return. We will provide you with a return shipping label and instructions.
          </p>
        </section>

        <section>
          <h2 style={{
            fontSize: '1.5rem',
            fontWeight: '500',
            marginBottom: '1rem',
            color: 'white'
          }}>
            Refunds
          </h2>
          <p style={{
            fontSize: '1rem',
            color: 'rgba(255, 255, 255, 0.8)',
            lineHeight: '1.6',
            marginBottom: '1rem'
          }}>
            Once we receive your return, we will inspect it and notify you of the approval or rejection of your refund. If approved, your refund will be processed, and a credit will automatically be applied to your original method of payment within 5-10 business days.
          </p>
        </section>

        <section>
          <h2 style={{
            fontSize: '1.5rem',
            fontWeight: '500',
            marginBottom: '1rem',
            color: 'white'
          }}>
            Exchanges
          </h2>
          <p style={{
            fontSize: '1rem',
            color: 'rgba(255, 255, 255, 0.8)',
            lineHeight: '1.6',
            marginBottom: '1rem'
          }}>
            We only replace items if they are defective or damaged. If you need to exchange an item, contact us at support@ultrlx.com.
          </p>
        </section>

        <section>
          <h2 style={{
            fontSize: '1.5rem',
            fontWeight: '500',
            marginBottom: '1rem',
            color: 'white'
          }}>
            Questions?
          </h2>
          <p style={{
            fontSize: '1rem',
            color: 'rgba(255, 255, 255, 0.8)',
            lineHeight: '1.6'
          }}>
            If you have any questions about our return policy, please contact us at support@ultrlx.com.
          </p>
        </section>
      </main>
    </div>
  );
}

/** @typedef {import('./+types/returns').Route} Route */
