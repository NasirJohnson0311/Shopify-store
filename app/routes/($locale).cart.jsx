import {useLoaderData, data, Await} from 'react-router';
import {Suspense} from 'react';
import {CartForm, useOptimisticCart} from '@shopify/hydrogen';
import {CartMain} from '~/components/CartMain';
import {CartSummary} from '~/components/CartSummary';
import {ProductItem} from '~/components/ProductItem';
import {useFadeInOnScroll} from '~/hooks/useFadeInOnScroll';

/**
 * @type {Route.MetaFunction}
 */
export const meta = () => {
  return [{title: `Hydrogen | Cart`}];
};

/**
 * @type {HeadersFunction}
 */
export const headers = ({actionHeaders}) => actionHeaders;

/**
 * @param {Route.ActionArgs}
 */
export async function action({request, context}) {
  const {cart} = context;

  const formData = await request.formData();

  const {action, inputs} = CartForm.getFormInput(formData);

  if (!action) {
    throw new Error('No action provided');
  }

  let status = 200;
  let result;

  switch (action) {
    case CartForm.ACTIONS.LinesAdd:
      result = await cart.addLines(inputs.lines);
      break;
    case CartForm.ACTIONS.LinesUpdate:
      result = await cart.updateLines(inputs.lines);
      break;
    case CartForm.ACTIONS.LinesRemove:
      result = await cart.removeLines(inputs.lineIds);
      break;
    case CartForm.ACTIONS.DiscountCodesUpdate: {
      const formDiscountCode = inputs.discountCode;

      // User inputted discount code
      const discountCodes = formDiscountCode ? [formDiscountCode] : [];

      // Combine discount codes already applied on cart
      discountCodes.push(...inputs.discountCodes);

      result = await cart.updateDiscountCodes(discountCodes);
      break;
    }
    case CartForm.ACTIONS.GiftCardCodesUpdate: {
      const formGiftCardCode = inputs.giftCardCode;

      // User inputted gift card code
      const giftCardCodes = formGiftCardCode ? [formGiftCardCode] : [];

      // Combine gift card codes already applied on cart
      giftCardCodes.push(...inputs.giftCardCodes);

      result = await cart.updateGiftCardCodes(giftCardCodes);
      break;
    }
    case CartForm.ACTIONS.GiftCardCodesRemove: {
      const appliedGiftCardIds = inputs.giftCardCodes;
      result = await cart.removeGiftCardCodes(appliedGiftCardIds);
      break;
    }
    case CartForm.ACTIONS.BuyerIdentityUpdate: {
      result = await cart.updateBuyerIdentity({
        ...inputs.buyerIdentity,
      });
      break;
    }
    default:
      throw new Error(`${action} cart action is not defined`);
  }

  const cartId = result?.cart?.id;
  const headers = cartId ? cart.setCartId(result.cart.id) : new Headers();
  const {cart: cartResult, errors, warnings} = result;

  const redirectTo = formData.get('redirectTo') ?? null;
  if (typeof redirectTo === 'string') {
    status = 303;
    headers.set('Location', redirectTo);
  }

  return data(
    {
      cart: cartResult,
      errors,
      warnings,
      analytics: {
        cartId,
      },
    },
    {status, headers},
  );
}

/**
 * @param {Route.LoaderArgs}
 */
export async function loader({context}) {
  const {cart, storefront} = context;

  const recommendedProducts = storefront
    .query(RECOMMENDED_PRODUCTS_QUERY)
    .catch((error) => {
      console.error(error);
      return null;
    });

  return {
    cart: await cart.get(),
    recommendedProducts,
  };
}

export default function Cart() {
  /** @type {LoaderReturnData} */
  const {cart: originalCart, recommendedProducts} = useLoaderData();
  const cart = useOptimisticCart(originalCart);
  const cartHasItems = cart?.totalQuantity ? cart.totalQuantity > 0 : false;

  return (
    <>
      <div className="cart-page">
        <div className="cart-header">
          <h1>Your cart</h1>
          <a href="/" className="continue-shopping">Continue shopping</a>
        </div>
        <div className="cart-page-layout">
          <div className="cart-items-column">
            <CartMain layout="page" cart={cart} />
          </div>
          {cartHasItems && (
            <div className="cart-summary-column">
              <CartSummary cart={cart} layout="page" />
            </div>
          )}
        </div>
      </div>
      <RecommendedProducts products={recommendedProducts} cart={cart} />
    </>
  );
}

function RecommendedProducts({products, cart}) {
  const [recommendedRef, isRecommendedVisible] = useFadeInOnScroll();

  return (
    <Suspense fallback={null}>
      <Await resolve={products}>
        {(response) => {
          if (!response?.products?.nodes) {
            return null;
          }

          // Get product handles from cart items
          const cartProductHandles = new Set(
            cart?.lines?.nodes?.map(line => line.merchandise?.product?.handle).filter(Boolean) || []
          );

          // Filter out products already in cart
          const filteredProducts = response.products.nodes
            .filter((product) => !cartProductHandles.has(product.handle))
            .slice(0, 4);

          // Hide entire section if no recommendations after filtering
          if (filteredProducts.length === 0) {
            return null;
          }

          return (
            <div
              ref={recommendedRef}
              className={`recommended-products-section fade-in-on-scroll ${isRecommendedVisible ? 'visible' : ''}`}
            >
              <h2>You may also like</h2>
              <div className="recommended-products-grid">
                {filteredProducts.map((product, index) => (
                  <ProductItem key={product.id} product={product} index={index} />
                ))}
              </div>
            </div>
          );
        }}
      </Await>
    </Suspense>
  );
}

const RECOMMENDED_PRODUCTS_QUERY = `#graphql
  fragment RecommendedProduct on Product {
    id
    title
    handle
    productType
    priceRange {
      minVariantPrice {
        amount
        currencyCode
      }
    }
    featuredImage {
      id
      url
      altText
      width
      height
    }
  }
  query CartRecommendedProducts ($country: CountryCode, $language: LanguageCode)
    @inContext(country: $country, language: $language) {
    products(first: 8, sortKey: UPDATED_AT, reverse: true) {
      nodes {
        ...RecommendedProduct
      }
    }
  }
`;

/** @typedef {import('react-router').HeadersFunction} HeadersFunction */
/** @typedef {import('./+types/cart').Route} Route */
/** @typedef {import('@shopify/hydrogen').CartQueryDataReturn} CartQueryDataReturn */
/** @typedef {import('@shopify/remix-oxygen').SerializeFrom<typeof loader>} LoaderReturnData */
/** @typedef {import('@shopify/remix-oxygen').SerializeFrom<typeof action>} ActionReturnData */
