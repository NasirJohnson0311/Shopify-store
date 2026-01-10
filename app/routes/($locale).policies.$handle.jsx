import {Link, useLoaderData} from 'react-router';

/**
 * @type {Route.MetaFunction}
 */
export const meta = ({data}) => {
  return [{title: `Hydrogen | ${data?.policy.title ?? ''}`}];
};

/**
 * @param {Route.LoaderArgs}
 */
export async function loader({params, context}) {
  if (!params.handle) {
    throw new Response('No handle was passed in', {status: 404});
  }

  const policyName = params.handle.replace(/-([a-z])/g, (_, m1) =>
    m1.toUpperCase(),
  );

  const data = await context.storefront.query(POLICY_CONTENT_QUERY, {
    variables: {
      privacyPolicy: false,
      shippingPolicy: false,
      termsOfService: false,
      refundPolicy: false,
      [policyName]: true,
      language: context.storefront.i18n?.language,
    },
  });

  const policy = data.shop?.[policyName];

  if (!policy) {
    // Return fallback policy content if not found in Shopify
    return {
      policy: FALLBACK_POLICIES[params.handle] || null
    };
  }

  return {policy};
}

export default function Policy() {
  /** @type {LoaderReturnData} */
  const {policy} = useLoaderData();

  if (!policy) {
    throw new Response('Policy not found', {status: 404});
  }

  return (
    <div className="policy">
      <h1>{policy.title}</h1>
      <div dangerouslySetInnerHTML={{__html: policy.body}} />
    </div>
  );
}

// Fallback policy content when not configured in Shopify
const FALLBACK_POLICIES = {
  'shipping-policy': {
    title: 'Shipping Policy',
    body: `
      <h2>Shipping Information</h2>
      <p>We offer shipping to addresses within the United States and internationally.</p>

      <h2>Processing Time</h2>
      <p>Orders are typically processed within 1-2 business days. You will receive a confirmation email once your order has been shipped.</p>

      <h2>Shipping Rates</h2>
      <p>Shipping costs are calculated at checkout based on your location and the size/weight of your order. We offer free shipping on orders over $50 within the continental United States.</p>

      <h2>Delivery Time</h2>
      <p>Standard shipping typically takes 5-7 business days within the United States. International shipping times vary by location and can take 10-20 business days.</p>

      <h2>Tracking</h2>
      <p>Once your order ships, you will receive a tracking number via email. You can use this to track your package.</p>

      <h2>International Orders</h2>
      <p>International customers are responsible for any customs fees, duties, or taxes that may apply. These charges are not included in our shipping rates.</p>

      <h2>Questions?</h2>
      <p>If you have any questions about shipping, please contact us at support@ultrlx.com.</p>
    `,
    handle: 'shipping-policy',
    id: 'gid://shopify/ShopPolicy/shipping-policy-fallback',
    url: '/policies/shipping-policy',
  },
};

// NOTE: https://shopify.dev/docs/api/storefront/latest/objects/Shop
const POLICY_CONTENT_QUERY = `#graphql
  fragment Policy on ShopPolicy {
    body
    handle
    id
    title
    url
  }
  query Policy(
    $country: CountryCode
    $language: LanguageCode
    $privacyPolicy: Boolean!
    $refundPolicy: Boolean!
    $shippingPolicy: Boolean!
    $termsOfService: Boolean!
  ) @inContext(language: $language, country: $country) {
    shop {
      privacyPolicy @include(if: $privacyPolicy) {
        ...Policy
      }
      shippingPolicy @include(if: $shippingPolicy) {
        ...Policy
      }
      termsOfService @include(if: $termsOfService) {
        ...Policy
      }
      refundPolicy @include(if: $refundPolicy) {
        ...Policy
      }
    }
  }
`;

/**
 * @typedef {keyof Pick<
 *   Shop,
 *   'privacyPolicy' | 'shippingPolicy' | 'termsOfService' | 'refundPolicy'
 * >} SelectedPolicies
 */

/** @typedef {import('./+types/policies.$handle').Route} Route */
/** @typedef {import('@shopify/hydrogen/storefront-api-types').Shop} Shop */
/** @typedef {import('@shopify/remix-oxygen').SerializeFrom<typeof loader>} LoaderReturnData */
