/**
 * Newsletter subscription API route
 * Handles email signups for the coming soon page and footer
 */

export async function action({request, context}) {
  const {storefront} = context;

  try {
    const formData = await request.formData();
    const email = formData.get('email');

    if (!email || typeof email !== 'string') {
      return new Response(
        JSON.stringify({error: 'Email is required'}),
        {status: 400, headers: {'Content-Type': 'application/json'}}
      );
    }

    // Create a customer in Shopify with newsletter opt-in
    const CREATE_CUSTOMER_MUTATION = `#graphql
      mutation customerCreate($input: CustomerCreateInput!) {
        customerCreate(input: $input) {
          customer {
            id
            email
            emailMarketingConsent {
              marketingState
              marketingOptInLevel
            }
          }
          customerUserErrors {
            code
            field
            message
          }
        }
      }
    `;

    const {customerCreate} = await storefront.mutate(CREATE_CUSTOMER_MUTATION, {
      variables: {
        input: {
          email: email,
          acceptsMarketing: true,
          emailMarketingConsent: {
            marketingState: 'SUBSCRIBED',
            marketingOptInLevel: 'SINGLE_OPT_IN',
          },
        },
      },
    });

    if (customerCreate?.customerUserErrors?.length > 0) {
      const error = customerCreate.customerUserErrors[0];

      // If customer already exists, that's okay - they're already subscribed
      if (error.code === 'TAKEN') {
        return new Response(
          JSON.stringify({success: true, message: 'You are already subscribed!'}),
          {status: 200, headers: {'Content-Type': 'application/json'}}
        );
      }

      return new Response(
        JSON.stringify({error: error.message}),
        {status: 400, headers: {'Content-Type': 'application/json'}}
      );
    }

    return new Response(
      JSON.stringify({success: true, message: 'Successfully subscribed!'}),
      {status: 200, headers: {'Content-Type': 'application/json'}}
    );

  } catch (error) {
    console.error('Newsletter subscription error:', error);
    return new Response(
      JSON.stringify({error: 'An error occurred. Please try again.'}),
      {status: 500, headers: {'Content-Type': 'application/json'}}
    );
  }
}

/** @typedef {import('./+types/api.newsletter').Route} Route */
