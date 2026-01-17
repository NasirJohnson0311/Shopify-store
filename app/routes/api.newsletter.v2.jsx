/**
 * Newsletter subscription API route (Alternative approach)
 * Uses Shopify's native contact form endpoint
 */

export async function action({request, context}) {
  const {env} = context;

  try {
    const formData = await request.formData();
    const email = formData.get('email');

    if (!email || typeof email !== 'string') {
      return new Response(
        JSON.stringify({error: 'Email is required'}),
        {status: 400, headers: {'Content-Type': 'application/json'}}
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({error: 'Please enter a valid email address'}),
        {status: 400, headers: {'Content-Type': 'application/json'}}
      );
    }

    // Use Shopify's contact form endpoint to submit the email
    const shopifyContactUrl = `https://${env.PUBLIC_STORE_DOMAIN}/contact`;

    const contactFormData = new FormData();
    contactFormData.append('contact[email]', email);
    contactFormData.append('contact[subject]', 'Newsletter Subscription');
    contactFormData.append('contact[body]', `Newsletter signup from: ${email}`);
    contactFormData.append('form_type', 'customer');

    const response = await fetch(shopifyContactUrl, {
      method: 'POST',
      body: contactFormData,
    });

    console.log('Contact form submission status:', response.status);

    if (response.ok || response.status === 302) {
      // Save email to a simple JSON file or database for now
      console.log('Newsletter signup:', email);

      return new Response(
        JSON.stringify({success: true, message: 'Successfully subscribed!'}),
        {status: 200, headers: {'Content-Type': 'application/json'}}
      );
    } else {
      console.error('Form submission failed:', response.status);
      return new Response(
        JSON.stringify({error: 'Failed to subscribe. Please try again.'}),
        {status: 500, headers: {'Content-Type': 'application/json'}}
      );
    }

  } catch (error) {
    console.error('Newsletter subscription error:', error);
    return new Response(
      JSON.stringify({error: 'An error occurred. Please try again.'}),
      {status: 500, headers: {'Content-Type': 'application/json'}}
    );
  }
}

/** @typedef {import('./+types/api.newsletter.v2').Route} Route */
