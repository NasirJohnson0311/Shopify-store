import {Link} from 'react-router';
import {Image, Money} from '@shopify/hydrogen';
import {useVariantUrl} from '~/lib/variants';
import {motion} from 'framer-motion';

/**
 * @param {{
 *   product:
 *     | CollectionItemFragment
 *     | ProductItemFragment
 *     | RecommendedProductFragment;
 *   loading?: 'eager' | 'lazy';
 *   index?: number;
 * }}
 */
export function ProductItem({product, loading, index = 0}) {
  const variantUrl = useVariantUrl(product.handle);
  const image = product.featuredImage;
  const isSkateboard = product.productType === 'Skateboard Decks' ||
                       product.productType === 'Skateboard Deck' ||
                       product.productType?.toLowerCase().includes('skateboard') ||
                       product.title?.toLowerCase().includes('deck');
  const productClass = isSkateboard ? 'product-item product-item-skateboard' : 'product-item';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.6,
        ease: 'easeOut',
        delay: index * 0.1
      }}
    >
      <Link
        className={productClass}
        key={product.id}
        prefetch="intent"
        to={variantUrl}
      >
        {image && (
          <div className="product-item__image-wrapper">
            <Image
              alt={image.altText || product.title}
              data={image}
              loading={loading}
              sizes="(min-width: 45em) 400px, 100vw"
            />
          </div>
        )}
        <h4>{product.title}</h4>
        <small>
          <Money data={product.priceRange.minVariantPrice} />
        </small>
      </Link>
    </motion.div>
  );
}

/** @typedef {import('storefrontapi.generated').ProductItemFragment} ProductItemFragment */
/** @typedef {import('storefrontapi.generated').CollectionItemFragment} CollectionItemFragment */
/** @typedef {import('storefrontapi.generated').RecommendedProductFragment} RecommendedProductFragment */
