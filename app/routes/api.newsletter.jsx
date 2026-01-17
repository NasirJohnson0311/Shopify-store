/**
 * Newsletter subscription API route
 * Handles email signups for the coming soon page and footer
 * Uses Storefront API to create customer accounts with email marketing consent
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

    // Use Shopify Storefront API to create customer with email marketing consent
    const storefrontApiUrl = `https://${env.PUBLIC_STORE_DOMAIN}/api/2024-10/graphql.json`;

    const CREATE_CUSTOMER_MUTATION = `
      mutation customerCreate($input: CustomerCreateInput!) {
        customerCreate(input: $input) {
          customer {
            id
            email
          }
          customerUserErrors {
            code
            field
            message
          }
        }
      }
    `;

    // Generate a random password for the customer account
    // Users won't use this - it's just required by Shopify
    const randomPassword = Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-12);

    const response = await fetch(storefrontApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': env.PUBLIC_STOREFRONT_API_TOKEN,
      },
      body: JSON.stringify({
        query: CREATE_CUSTOMER_MUTATION,
        variables: {
          input: {
            email: email,
            password: randomPassword,
            acceptsMarketing: true,
          },
        },
      }),
    });

    const result = await response.json();
    console.log('Newsletter subscription response:', JSON.stringify(result, null, 2));
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));

    // Check for GraphQL errors
    if (result.errors) {
      console.error('GraphQL errors:', result.errors);
      console.error('Full error details:', JSON.stringify(result.errors, null, 2));

      // Check if it's a throttle error - likely means customer already exists
      const isThrottled = result.errors.some(error =>
        error.extensions?.code === 'THROTTLED' ||
        error.message?.toLowerCase().includes('limit exceeded')
      );

      if (isThrottled) {
        // Throttling often happens when trying to create duplicate customers
        return new Response(
          JSON.stringify({success: true, message: 'You are already subscribed!'}),
          {status: 200, headers: {'Content-Type': 'application/json'}}
        );
      }

      return new Response(
        JSON.stringify({error: 'Failed to subscribe. Please try again.'}),
        {status: 500, headers: {'Content-Type': 'application/json'}}
      );
    }

    const {customerCreate} = result.data || {};

    if (customerCreate?.customerUserErrors?.length > 0) {
      const error = customerCreate.customerUserErrors[0];
      console.error('Customer creation error:', error);

      // Check if customer already exists - treat as success
      if (error.code === 'TAKEN' ||
          error.code === 'CUSTOMER_ALREADY_EXISTS' ||
          error.message?.toLowerCase().includes('taken') ||
          error.message?.toLowerCase().includes('already exists') ||
          error.message?.toLowerCase().includes('has already been taken') ||
          error.field?.includes('email')) {
        return new Response(
          JSON.stringify({success: true, message: 'You are already subscribed!'}),
          {status: 200, headers: {'Content-Type': 'application/json'}}
        );
      }

      // Only show error for actual invalid emails or other issues
      return new Response(
        JSON.stringify({error: error.message || 'Failed to subscribe'}),
        {status: 400, headers: {'Content-Type': 'application/json'}}
      );
    }

    // Verify customer was created
    if (customerCreate?.customer?.email) {
      console.log('Customer created successfully:', customerCreate.customer.email);
      return new Response(
        JSON.stringify({success: true, message: 'Successfully subscribed!'}),
        {status: 200, headers: {'Content-Type': 'application/json'}}
      );
    } else {
      console.error('Customer creation completed but no customer data returned');
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

/** @typedef {import('./+types/api.newsletter').Route} Route */
