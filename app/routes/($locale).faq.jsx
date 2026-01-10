/**
 * @type {Route.MetaFunction}
 */
export const meta = () => {
  return [{title: 'FAQ'}];
};

export default function FAQ() {
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
          Frequently Asked Questions
        </h1>
      </header>

      <main style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '2rem'
      }}>
        <div>
          <h2 style={{
            fontSize: '1.25rem',
            fontWeight: '500',
            marginBottom: '0.5rem',
            color: 'white'
          }}>
            What is your shipping policy?
          </h2>
          <p style={{
            fontSize: '1rem',
            color: 'rgba(255, 255, 255, 0.8)',
            lineHeight: '1.6'
          }}>
            We offer free shipping on all orders over $50. Orders are typically processed within 1-2 business days and shipped via standard delivery.
          </p>
        </div>

        <div>
          <h2 style={{
            fontSize: '1.25rem',
            fontWeight: '500',
            marginBottom: '0.5rem',
            color: 'white'
          }}>
            How can I track my order?
          </h2>
          <p style={{
            fontSize: '1rem',
            color: 'rgba(255, 255, 255, 0.8)',
            lineHeight: '1.6'
          }}>
            Once your order ships, you'll receive a tracking number via email. You can use this to track your package.
          </p>
        </div>

        <div>
          <h2 style={{
            fontSize: '1.25rem',
            fontWeight: '500',
            marginBottom: '0.5rem',
            color: 'white'
          }}>
            What is your return policy?
          </h2>
          <p style={{
            fontSize: '1rem',
            color: 'rgba(255, 255, 255, 0.8)',
            lineHeight: '1.6'
          }}>
            We accept returns within 30 days of purchase. Items must be unused and in original packaging. See our Returns page for more details.
          </p>
        </div>

        <div>
          <h2 style={{
            fontSize: '1.25rem',
            fontWeight: '500',
            marginBottom: '0.5rem',
            color: 'white'
          }}>
            How do I contact customer support?
          </h2>
          <p style={{
            fontSize: '1rem',
            color: 'rgba(255, 255, 255, 0.8)',
            lineHeight: '1.6'
          }}>
            You can reach us at support@ultrlx.com for any questions or concerns.
          </p>
        </div>
      </main>
    </div>
  );
}

/** @typedef {import('./+types/faq').Route} Route */
