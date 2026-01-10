/**
 * @type {Route.MetaFunction}
 */
export const meta = () => {
  return [{title: 'Terms of Service'}];
};

export default function TermsOfService() {
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
          Terms of Service
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
            1. Terms
          </h2>
          <p style={{
            fontSize: '1rem',
            color: 'rgba(255, 255, 255, 0.8)',
            lineHeight: '1.6',
            marginBottom: '1rem'
          }}>
            By accessing this website, you are agreeing to be bound by these Terms of Service, all applicable laws and regulations, and agree that you are responsible for compliance with any applicable local laws.
          </p>
        </section>

        <section>
          <h2 style={{
            fontSize: '1.5rem',
            fontWeight: '500',
            marginBottom: '1rem',
            color: 'white'
          }}>
            2. Use License
          </h2>
          <p style={{
            fontSize: '1rem',
            color: 'rgba(255, 255, 255, 0.8)',
            lineHeight: '1.6',
            marginBottom: '1rem'
          }}>
            Permission is granted to temporarily download one copy of the materials on our website for personal, non-commercial transitory viewing only.
          </p>
        </section>

        <section>
          <h2 style={{
            fontSize: '1.5rem',
            fontWeight: '500',
            marginBottom: '1rem',
            color: 'white'
          }}>
            3. Disclaimer
          </h2>
          <p style={{
            fontSize: '1rem',
            color: 'rgba(255, 255, 255, 0.8)',
            lineHeight: '1.6',
            marginBottom: '1rem'
          }}>
            The materials on our website are provided on an 'as is' basis. We make no warranties, expressed or implied, and hereby disclaim and negate all other warranties including, without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.
          </p>
        </section>

        <section>
          <h2 style={{
            fontSize: '1.5rem',
            fontWeight: '500',
            marginBottom: '1rem',
            color: 'white'
          }}>
            4. Limitations
          </h2>
          <p style={{
            fontSize: '1rem',
            color: 'rgba(255, 255, 255, 0.8)',
            lineHeight: '1.6',
            marginBottom: '1rem'
          }}>
            In no event shall we or our suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on our website.
          </p>
        </section>

        <section>
          <h2 style={{
            fontSize: '1.5rem',
            fontWeight: '500',
            marginBottom: '1rem',
            color: 'white'
          }}>
            5. Contact
          </h2>
          <p style={{
            fontSize: '1rem',
            color: 'rgba(255, 255, 255, 0.8)',
            lineHeight: '1.6'
          }}>
            If you have any questions about these Terms of Service, please contact us at support@ultrlx.com.
          </p>
        </section>
      </main>
    </div>
  );
}

/** @typedef {import('./+types/terms-of-service').Route} Route */
