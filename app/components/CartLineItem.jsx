import {CartForm, Image} from '@shopify/hydrogen';
import {useVariantUrl} from '~/lib/variants';
import {Link} from 'react-router';
import {ProductPrice} from './ProductPrice';
import {useAside} from './Aside';

/**
 * A single line item in the cart. It displays the product image, title, price.
 * It also provides controls to update the quantity or remove the line item.
 * @param {{
 *   layout: CartLayout;
 *   line: CartLine;
 * }}
 */
export function CartLineItem({layout, line}) {
  const {id, merchandise} = line;
  const {product, title, image, selectedOptions} = merchandise;
  const lineItemUrl = useVariantUrl(product.handle, selectedOptions);
  const {close} = useAside();

  const isSkateboard = product.productType === 'Skateboard Decks' ||
                       product.productType === 'Skateboard Deck' ||
                       product.productType?.toLowerCase().includes('skateboard') ||
                       product.title?.toLowerCase().includes('deck');
  const cartLineClass = layout === 'page'
    ? `cart-line-page ${isSkateboard ? 'cart-line-skateboard' : ''}`
    : isSkateboard ? 'cart-line cart-line-skateboard' : 'cart-line';

  if (layout === 'page') {
    return (
      <li key={id} className={cartLineClass}>
        <div className="cart-line-product">
          {image && (
            <div className="cart-line-image-wrapper">
              <Image
                alt={title}
                data={image}
                loading="lazy"
                sizes="100px"
              />
            </div>
          )}
          <div className="cart-line-details">
            <Link
              prefetch="intent"
              to={lineItemUrl}
            >
              <strong>{product.title}</strong>
            </Link>
            <ProductPrice price={merchandise?.price} />
            <ul>
              {selectedOptions
                .filter((option) => !(option.name === 'Title' && option.value === 'Default Title'))
                .map((option) => (
                  <li key={option.name}>
                    <small>
                      {option.name}: {option.value}
                    </small>
                  </li>
                ))}
            </ul>
          </div>
        </div>
        <div className="cart-line-quantity-page">
          <CartLineQuantity line={line} layout={layout} />
        </div>
        <div className="cart-line-total">
          <ProductPrice price={line?.cost?.totalAmount} />
        </div>
      </li>
    );
  }

  return (
    <li key={id} className={cartLineClass}>
      {image && (
        <div className="cart-line-image-wrapper">
          <Image
            alt={title}
            data={image}
            loading="lazy"
            sizes="100px"
          />
        </div>
      )}

      <div className="cart-line-content">
        <div className="cart-line-info">
          <Link
            prefetch="intent"
            to={lineItemUrl}
            onClick={() => {
              if (layout === 'aside') {
                close();
              }
            }}
          >
            <p>
              <strong>{product.title}</strong>
            </p>
          </Link>
          <ProductPrice price={merchandise?.price} />
          <ul>
            {selectedOptions
              .filter((option) => !(option.name === 'Title' && option.value === 'Default Title'))
              .map((option) => (
                <li key={option.name}>
                  <small>
                    {option.name}: {option.value}
                  </small>
                </li>
              ))}
          </ul>
          <CartLineQuantity line={line} layout={layout} />
        </div>
        <div className="cart-line-price">
          <ProductPrice price={line?.cost?.totalAmount} />
        </div>
      </div>
    </li>
  );
}

/**
 * Provides the controls to update the quantity of a line item in the cart.
 * These controls are disabled when the line item is new, and the server
 * hasn't yet responded that it was successfully added to the cart.
 * @param {{line: CartLine; layout?: CartLayout}}
 */
function CartLineQuantity({line, layout}) {
  if (!line || typeof line?.quantity === 'undefined') return null;
  const {id: lineId, quantity, isOptimistic} = line;
  const prevQuantity = Number(Math.max(0, quantity - 1).toFixed(0));
  const nextQuantity = Number((quantity + 1).toFixed(0));

  return (
    <div className="cart-line-quantity">
      <div className="quantity-control-wrapper">
        <CartLineUpdateButton lines={[{id: lineId, quantity: prevQuantity}]}>
          <button
            className="quantity-btn quantity-minus"
            aria-label="Decrease quantity"
            disabled={quantity <= 1 || !!isOptimistic}
            name="decrease-quantity"
            value={prevQuantity}
          >
            <span>&#8722;</span>
          </button>
        </CartLineUpdateButton>
        <span className="quantity-number">{quantity}</span>
        <CartLineUpdateButton lines={[{id: lineId, quantity: nextQuantity}]}>
          <button
            className="quantity-btn quantity-plus"
            aria-label="Increase quantity"
            name="increase-quantity"
            value={nextQuantity}
            disabled={!!isOptimistic}
          >
            <span>&#43;</span>
          </button>
        </CartLineUpdateButton>
      </div>
      <CartLineRemoveButton lineIds={[lineId]} disabled={!!isOptimistic} />
    </div>
  );
}

/**
 * A button that removes a line item from the cart. It is disabled
 * when the line item is new, and the server hasn't yet responded
 * that it was successfully added to the cart.
 * @param {{
 *   lineIds: string[];
 *   disabled: boolean;
 * }}
 */
function CartLineRemoveButton({lineIds, disabled}) {
  return (
    <CartForm
      fetcherKey={getUpdateKey(lineIds)}
      route="/cart"
      action={CartForm.ACTIONS.LinesRemove}
      inputs={{lineIds}}
    >
      <button disabled={disabled} type="submit">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-trash" viewBox="0 0 16 16">
          <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z"/>
          <path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z"/>
        </svg>
      </button>
    </CartForm>
  );
}

/**
 * @param {{
 *   children: React.ReactNode;
 *   lines: CartLineUpdateInput[];
 * }}
 */
function CartLineUpdateButton({children, lines}) {
  const lineIds = lines.map((line) => line.id);

  return (
    <CartForm
      fetcherKey={getUpdateKey(lineIds)}
      route="/cart"
      action={CartForm.ACTIONS.LinesUpdate}
      inputs={{lines}}
    >
      {children}
    </CartForm>
  );
}

/**
 * Returns a unique key for the update action. This is used to make sure actions modifying the same line
 * items are not run concurrently, but cancel each other. For example, if the user clicks "Increase quantity"
 * and "Decrease quantity" in rapid succession, the actions will cancel each other and only the last one will run.
 * @returns
 * @param {string[]} lineIds - line ids affected by the update
 */
function getUpdateKey(lineIds) {
  return [CartForm.ACTIONS.LinesUpdate, ...lineIds].join('-');
}

/** @typedef {OptimisticCartLine<CartApiQueryFragment>} CartLine */

/** @typedef {import('@shopify/hydrogen/storefront-api-types').CartLineUpdateInput} CartLineUpdateInput */
/** @typedef {import('~/components/CartMain').CartLayout} CartLayout */
/** @typedef {import('@shopify/hydrogen').OptimisticCartLine} OptimisticCartLine */
/** @typedef {import('storefrontapi.generated').CartApiQueryFragment} CartApiQueryFragment */
