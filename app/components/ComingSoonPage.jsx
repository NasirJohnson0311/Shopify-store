import * as React from 'react';

/**
 * Newsletter Signup Form Component
 */
function NewsletterForm() {
  const [email, setEmail] = React.useState('');
  const [status, setStatus] = React.useState('idle'); // idle, loading, success, error
  const [message, setMessage] = React.useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('loading');

    try {
      const response = await fetch('/api/newsletter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({email}),
      });

      const data = await response.json();

      if (response.ok) {
        setStatus('success');
        setMessage(data.message || 'Successfully subscribed!');
        setEmail('');
      } else {
        setStatus('error');
        setMessage(data.error || 'An error occurred');
      }
    } catch (error) {
      setStatus('error');
      setMessage('An error occurred. Please try again.');
    }

    // Reset status after 5 seconds
    setTimeout(() => {
      setStatus('idle');
      setMessage('');
    }, 5000);
  };

  return (
    <div style={{ marginBottom: '0.75rem', width: '100%', display: 'flex', justifyContent: 'center' }}>
      <form
        onSubmit={handleSubmit}
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '475px',
        }}
      >
        <input
          type="email"
          name="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email"
          required
          disabled={status === 'loading'}
          style={{
            width: '100%',
            padding: '0.625rem 1rem',
            fontSize: '16px',
            borderRadius: '8px',
            border: `1px solid ${status === 'error' ? 'rgba(239, 68, 68, 0.5)' : status === 'success' ? 'rgba(34, 197, 94, 0.5)' : 'rgba(255, 255, 255, 0.3)'}`,
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            color: '#ffffff',
            outline: 'none',
            transition: 'all 0.3s ease',
            opacity: status === 'loading' ? 0.6 : 1,
            boxSizing: 'border-box',
            paddingRight: '3rem',
          }}
        />
        <button
          type="submit"
          disabled={status === 'loading'}
          style={{
            position: 'absolute',
            right: '1rem',
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'none',
            border: 'none',
            color: status === 'success' ? '#22c55e' : status === 'error' ? '#ef4444' : '#ffffff',
            cursor: status === 'loading' ? 'not-allowed' : 'pointer',
            padding: '0.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.3s ease',
            opacity: status === 'loading' ? 0.6 : 1,
          }}
          aria-label="Subscribe"
        >
          {status === 'loading' ? '...' : status === 'success' ? '✓' : status === 'error' ? '✗' : '→'}
        </button>
      </form>
      {message && (
        <p style={{
          fontSize: '0.75rem',
          color: status === 'error' ? '#fca5a5' : '#86efac',
          margin: '0.5rem 0 0 0',
          textAlign: 'left',
        }}>
          {message}
        </p>
      )}
    </div>
  );
}

/**
 * Coming Soon Page Component
 */
export function ComingSoonPage() {
  // Prevent scrolling and cleanup on unmount
  React.useEffect(() => {
    // Store original values
    const originalBodyOverflow = document.body.style.overflow;
    const originalHtmlOverflow = document.documentElement.style.overflow;
    const originalBodyPosition = document.body.style.position;
    const originalHtmlPosition = document.documentElement.style.position;

    // Apply coming soon styles
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.documentElement.style.position = 'fixed';
    document.body.style.width = '100%';
    document.documentElement.style.width = '100%';
    document.body.style.height = '100%';
    document.documentElement.style.height = '100%';

    // Cleanup function - restore original values when component unmounts
    return () => {
      document.body.style.overflow = originalBodyOverflow;
      document.documentElement.style.overflow = originalHtmlOverflow;
      document.body.style.position = originalBodyPosition;
      document.documentElement.style.position = originalHtmlPosition;
      document.body.style.width = '';
      document.documentElement.style.width = '';
      document.body.style.height = '';
      document.documentElement.style.height = '';
    };
  }, []);

  return (
    <>
      <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
      <style dangerouslySetInnerHTML={{__html: `
        .coming-soon-bg {
          background-image: url(/coming-soon-bg.png);
        }

        .signup-text {
          font-size: 1.1rem;
        }

        @media (max-width: 768px) {
          .coming-soon-bg {
            background-image: url(/coming-soon-bg-mobile.png);
          }

          .signup-text {
            font-size: 0.9rem;
          }
        }

        @media (max-width: 480px) {
          .signup-text {
            font-size: 0.85rem;
          }
        }
      `}} />
      <div className="coming-soon-bg" style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        minHeight: '100vh',
        minHeight: '-webkit-fill-available',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        padding: 0,
        margin: 0,
        zIndex: 999999,
        overflow: 'hidden',
        touchAction: 'pan-y',
        isolation: 'isolate',
      }}>
      {/* Dark overlay for better text readability */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0)',
        zIndex: 1,
      }} />
      <div style={{
        maxWidth: '500px',
        width: '100%',
        background: 'rgba(0, 0, 0, 0.8)',
        backdropFilter: 'blur(10px)',
        padding: '1.5rem',
        borderRadius: '16px',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
        position: 'relative',
        zIndex: 2,
      }}>
        {/* Logo */}
        <h1 style={{
          fontSize: '3rem',
          fontWeight: '700',
          margin: '0 0 0.5rem 0',
          color: '#ffffff',
          textShadow: '0 2px 10px rgba(0, 0, 0, 0.5)',
          fontFamily: '"manifold-extd-cf", sans-serif',
          textAlign: 'center',
        }}>
          ULTRLX
        </h1>

        {/* Tagline */}
        <p style={{
          fontSize: '0.9rem',
          color: '#e2e8f0',
          margin: '0 0 1.5rem 0',
          textAlign: 'center',
          fontWeight: '300',
          letterSpacing: '0.05em',
        }}>
          Ultra-modern Art Gallery
        </p>

        {/* Message */}
        <h2 style={{
          fontSize: '2rem',
          margin: '0 0 0.4rem 0',
          color: '#ffffff',
          textShadow: '0 2px 10px rgba(0, 0, 0, 0.5)',
          textAlign: 'center',
          fontWeight: '400',
        }}>
          It's Coming
        </h2>
        <p className="signup-text" style={{
          color: '#e2e8f0',
          margin: '0 0 0.75rem 0',
          lineHeight: '1.6',
          textAlign: 'center',
        }}>
          Sign up for our newsletter to be the first to know when we launch.
        </p>

        {/* Email Signup Form */}
        <NewsletterForm />

        {/* Social Media Icons */}
        <div style={{
          display: 'flex',
          gap: '32px',
          alignItems: 'center',
          justifyContent: 'center',
          marginTop: '1.5rem',
        }}>
          <a href="https://www.instagram.com/" target="_blank" rel="noopener noreferrer" style={{color: 'rgba(255, 255, 255, 0.6)', transition: 'color 0.3s'}}>
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16">
              <path d="M8 0C5.829 0 5.556.01 4.703.048 3.85.088 3.269.222 2.76.42a3.9 3.9 0 0 0-1.417.923A3.9 3.9 0 0 0 .42 2.76C.222 3.268.087 3.85.048 4.7.01 5.555 0 5.827 0 8.001c0 2.172.01 2.444.048 3.297.04.852.174 1.433.372 1.942.205.526.478.972.923 1.417.444.445.89.719 1.416.923.51.198 1.09.333 1.942.372C5.555 15.99 5.827 16 8 16s2.444-.01 3.298-.048c.851-.04 1.434-.174 1.943-.372a3.9 3.9 0 0 0 1.416-.923c.445-.445.718-.891.923-1.417.197-.509.332-1.09.372-1.942C15.99 10.445 16 10.173 16 8s-.01-2.445-.048-3.299c-.04-.851-.175-1.433-.372-1.941a3.9 3.9 0 0 0-.923-1.417A3.9 3.9 0 0 0 13.24.42c-.51-.198-1.092-.333-1.943-.372C10.443.01 10.172 0 7.998 0zm-.717 1.442h.718c2.136 0 2.389.007 3.232.046.78.035 1.204.166 1.486.275.373.145.64.319.92.599s.453.546.598.92c.11.281.24.705.275 1.485.039.843.047 1.096.047 3.231s-.008 2.389-.047 3.232c-.035.78-.166 1.203-.275 1.485a2.5 2.5 0 0 1-.599.919c-.28.28-.546.453-.92.598-.28.11-.704.24-1.485.276-.843.038-1.096.047-3.232.047s-2.39-.009-3.233-.047c-.78-.036-1.203-.166-1.485-.276a2.5 2.5 0 0 1-.92-.598 2.5 2.5 0 0 1-.6-.92c-.109-.281-.24-.705-.275-1.485-.038-.843-.046-1.096-.046-3.233s.008-2.388.046-3.231c.036-.78.166-1.204.276-1.486.145-.373.319-.64.599-.92s.546-.453.92-.598c.282-.11.705-.24 1.485-.276.738-.034 1.024-.044 2.515-.045zm4.988 1.328a.96.96 0 1 0 0 1.92.96.96 0 0 0 0-1.92m-4.27 1.122a4.109 4.109 0 1 0 0 8.217 4.109 4.109 0 0 0 0-8.217m0 1.441a2.667 2.667 0 1 1 0 5.334 2.667 2.667 0 0 1 0-5.334"/>
            </svg>
          </a>
          <a href="https://www.tiktok.com/" target="_blank" rel="noopener noreferrer" style={{color: 'rgba(255, 255, 255, 0.6)', transition: 'color 0.3s'}}>
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16">
              <path d="M9 0h1.98c.144.715.54 1.617 1.235 2.512C12.895 3.389 13.797 4 15 4v2c-1.753 0-3.07-.814-4-1.829V11a5 5 0 1 1-5-5v2a3 3 0 1 0 3 3z"/>
            </svg>
          </a>
          <a href="https://x.com/" target="_blank" rel="noopener noreferrer" style={{color: 'rgba(255, 255, 255, 0.6)', transition: 'color 0.3s'}}>
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16">
              <path d="M12.6.75h2.454l-5.36 6.142L16 15.25h-4.937l-3.867-5.07-4.425 5.07H.316l5.733-6.57L0 .75h5.063l3.495 4.633L12.601.75Zm-.86 13.028h1.36L4.323 2.145H2.865z"/>
            </svg>
          </a>
        </div>
      </div>
    </div>
    </>
  );
}
