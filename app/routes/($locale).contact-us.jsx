/**
 * @type {Route.MetaFunction}
 */
export const meta = () => {
  return [{title: 'Contact Us'}];
};

export default function ContactUs() {
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
          Contact Us
        </h1>
      </header>

      <main style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        minHeight: '30vh'
      }}>
        <div>
          <p style={{
            fontSize: '1.2rem',
            color: 'rgba(255, 255, 255, 0.9)',
            marginBottom: '1rem',
            lineHeight: '1.6'
          }}>
            For general inquiries & sales
          </p>
          <a
            href="mailto:support@ultrlx.com"
            style={{
              fontSize: '1.5rem',
              color: 'white',
              textDecoration: 'none',
              transition: 'opacity 0.3s ease'
            }}
            onMouseOver={(e) => e.currentTarget.style.opacity = '0.7'}
            onMouseOut={(e) => e.currentTarget.style.opacity = '1'}
          >
            support@ultrlx.com
          </a>
        </div>
      </main>
    </div>
  );
}

/** @typedef {import('./+types/contact-us').Route} Route */
