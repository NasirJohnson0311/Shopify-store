import {redirect} from 'react-router';
import {useEffect} from 'react';
import {useLoaderData} from 'react-router';

/**
 * Redirects to Shopify's hosted account pages
 * @param {Route.LoaderArgs}
 */
export async function loader({context, request}) {
  // Check if customer is logged in
  const isLoggedIn = await context.customerAccount.isLoggedIn();

  if (!isLoggedIn) {
    // Redirect to login if not authenticated
    return redirect('/account/login');
  }

  // Get the Shopify store domain from environment
  const shopDomain = context.env.PUBLIC_STORE_DOMAIN;
  const accountUrl = `https://${shopDomain}/account`;

  // For server-side requests, use Response.redirect for proper external redirect
  const url = new URL(request.url);
  if (!url.searchParams.has('_data')) {
    // This is a document request (not a data fetch), do a proper redirect
    return new Response(null, {
      status: 302,
      headers: {
        Location: accountUrl,
      },
    });
  }

  // For client-side navigation, return the URL for client-side redirect
  return {accountUrl};
}

export default function Account() {
  const data = useLoaderData();

  // Handle client-side redirect
  useEffect(() => {
    if (data?.accountUrl) {
      window.location.href = data.accountUrl;
    }
  }, [data]);

  return (
    <div style={{padding: '2rem', textAlign: 'center', color: 'white'}}>
      <p>Redirecting to your account...</p>
    </div>
  );
}

/** @typedef {import('./+types/account').Route} Route */
/** @typedef {import('@shopify/remix-oxygen').SerializeFrom<typeof loader>} LoaderReturnData */
