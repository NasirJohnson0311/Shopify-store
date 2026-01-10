/**
 * @type {Route.MetaFunction}
 */
export const meta = () => {
  return [{title: 'Terms of Service'}];
};

export default function TermsOfService() {
  return (
    <div className="policy">
      <h1>Terms of Service</h1>

      <h2>1. Terms</h2>
      <p>By accessing this website, you are agreeing to be bound by these Terms of Service, all applicable laws and regulations, and agree that you are responsible for compliance with any applicable local laws.</p>

      <h2>2. Use License</h2>
      <p>Permission is granted to temporarily download one copy of the materials on our website for personal, non-commercial transitory viewing only.</p>

      <h2>3. Disclaimer</h2>
      <p>The materials on our website are provided on an 'as is' basis. We make no warranties, expressed or implied, and hereby disclaim and negate all other warranties including, without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.</p>

      <h2>4. Limitations</h2>
      <p>In no event shall we or our suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on our website.</p>

      <h2>5. Contact</h2>
      <p>If you have any questions about these Terms of Service, please contact us at support@ultrlx.com.</p>
    </div>
  );
}

/** @typedef {import('./+types/terms-of-service').Route} Route */
