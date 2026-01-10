/**
 * @type {Route.MetaFunction}
 */
export const meta = () => {
  return [{title: 'Contact Us'}];
};

export default function ContactUs() {
  return (
    <div className="policy">
      <h1>Contact Us</h1>

      <p>For general inquiries & sales</p>

      <p>
        <a href="mailto:support@ultrlx.com">support@ultrlx.com</a>
      </p>
    </div>
  );
}

/** @typedef {import('./+types/contact-us').Route} Route */
