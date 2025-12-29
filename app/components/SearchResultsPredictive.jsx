import {Link, useFetcher} from 'react-router';
import {Image, Money} from '@shopify/hydrogen';
import React, {useRef, useEffect} from 'react';
import {
  getEmptyPredictiveSearchResult,
} from '~/lib/search';
import {useAside} from './Aside';

/**
 * Component that renders predictive search results
 * @param {SearchResultsPredictiveProps}
 * @return {React.ReactNode}
 */
export function SearchResultsPredictive({children}) {
  const aside = useAside();
  const {term, inputRef, fetcher, total, items, isInitialSearch} = usePredictiveSearch();

  /*
   * Utility that resets the search input
   */
  function resetInput() {
    if (inputRef.current) {
      inputRef.current.blur();
      inputRef.current.value = '';
    }
  }

  /**
   * Utility that resets the search input and closes the search aside
   */
  function closeSearch() {
    resetInput();
    aside.close();
  }

  return children({
    items,
    closeSearch,
    inputRef,
    state: fetcher.state,
    term,
    total,
    isInitialSearch,
  });
}

SearchResultsPredictive.Articles = SearchResultsPredictiveArticles;
SearchResultsPredictive.Collections = SearchResultsPredictiveCollections;
SearchResultsPredictive.Pages = SearchResultsPredictivePages;
SearchResultsPredictive.Products = SearchResultsPredictiveProducts;
SearchResultsPredictive.Queries = SearchResultsPredictiveQueries;
SearchResultsPredictive.Empty = SearchResultsPredictiveEmpty;

/**
 * @param {PartialPredictiveSearchResult<'articles'>}
 */
function SearchResultsPredictiveArticles({articles}) {
  if (!articles.length) return null;

  return (
    <div className="predictive-search-result" key="articles">
      <h5>Articles</h5>
      <ul>
        {articles.map((article) => (
          <li className="predictive-search-result-item" key={article.id}>
            <Link to={`/blogs/${article.blog.handle}/${article.handle}`}>
              {article.image && (
                <div className="predictive-search-image-wrapper">
                  <Image
                    alt={article.image.altText ?? ''}
                    data={article.image}
                    loading="lazy"
                    sizes="100px"
                  />
                </div>
              )}
              <div>
                <span>{article.title}</span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * @param {PartialPredictiveSearchResult<'collections'>}
 */
function SearchResultsPredictiveCollections({collections, selectedIndex = -1}) {
  if (!collections.length) return null;

  return (
    <div className="predictive-search-result" key="collections">
      <h5 id="predictive-search-collections">Collections</h5>
      <ul role="group" aria-labelledby="predictive-search-collections">
        {collections.map((collection, index) => (
          <li
            className="predictive-search-result-item"
            key={collection.id}
            id={`predictive-search-option-collection-${index}`}
            role="option"
            aria-selected={false}
          >
            <Link to={`/collections/${collection.handle}`} role="option" tabIndex={-1}>
              {collection.image && (
                <div className="predictive-search-image-wrapper">
                  <Image
                    alt={collection.image.altText ?? ''}
                    data={collection.image}
                    loading="lazy"
                    sizes="100px"
                  />
                </div>
              )}
              <div>
                <span>{collection.title}</span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * @param {PartialPredictiveSearchResult<'pages'>}
 */
function SearchResultsPredictivePages({pages, selectedIndex = -1}) {
  if (!pages.length) return null;

  return (
    <div className="predictive-search-result" key="pages">
      <h5 id="predictive-search-pages">Pages</h5>
      <ul role="group" aria-labelledby="predictive-search-pages">
        {pages.map((page, index) => (
          <li
            className="predictive-search-result-item"
            key={page.id}
            id={`predictive-search-option-page-${index}`}
            role="option"
            aria-selected={false}
          >
            <Link to={`/pages/${page.handle}`} role="option" tabIndex={-1}>
              <div>
                <span>{page.title}</span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * @param {PartialPredictiveSearchResult<'products'>}
 */
function SearchResultsPredictiveProducts({products, selectedIndex = -1}) {
  if (!products.length) return null;

  return (
    <div className="predictive-search-result" key="products">
      <h5 id="predictive-search-products">Products</h5>
      <ul role="group" aria-labelledby="predictive-search-products">
        {products.map((product, index) => {
          const price = product?.selectedOrFirstAvailableVariant?.price;
          const image = product?.selectedOrFirstAvailableVariant?.image;
          const isSkateboard = product.productType === 'Skateboard Decks' ||
                               product.productType === 'Skateboard Deck' ||
                               product.productType?.toLowerCase().includes('skateboard') ||
                               product.title?.toLowerCase().includes('deck');

          const itemClass = isSkateboard ? 'predictive-search-result-item predictive-search-skateboard' : 'predictive-search-result-item';

          return (
            <li
              className={itemClass}
              key={product.id}
              id={`predictive-search-option-product-${index}`}
              role="option"
              aria-selected={false}
            >
              <Link to={`/products/${product.handle}`} role="option" tabIndex={-1}>
                {image && (
                  <div className="predictive-search-image-wrapper">
                    <Image
                      alt={image.altText ?? ''}
                      data={image}
                      loading="lazy"
                      sizes="100px"
                    />
                  </div>
                )}
                <div>
                  <p>{product.title}</p>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/**
 * @param {PartialPredictiveSearchResult<'queries', never> & {
 *   queriesDatalistId: string;
 * }}
 */
function SearchResultsPredictiveQueries({queries, queriesDatalistId}) {
  if (!queries.length) return null;

  return (
    <datalist id={queriesDatalistId}>
      {queries.map((suggestion) => {
        if (!suggestion) return null;

        return <option key={suggestion.text} value={suggestion.text} />;
      })}
    </datalist>
  );
}

/**
 * @param {{
 *   term: React.MutableRefObject<string>;
 * }}
 */
function SearchResultsPredictiveEmpty({term}) {
  if (!term.current) {
    return null;
  }

  return (
    <p>
      No results found for <q>{term.current}</q>
    </p>
  );
}

/**
 * Hook that returns the predictive search results and fetcher and input ref.
 * Implements optimistic UI by caching previous results while loading new ones.
 * @example
 * '''ts
 * const { items, total, inputRef, term, fetcher, isInitialSearch } = usePredictiveSearch();
 * '''
 * @return {UsePredictiveSearchReturn}
 */
function usePredictiveSearch() {
  const fetcher = useFetcher({key: 'search'});
  const term = useRef('');
  const inputRef = useRef(null);

  // Cache previous results for optimistic UI
  const cachedResults = useRef(getEmptyPredictiveSearchResult());
  const hasSearchedBefore = useRef(false);

  const currentTerm = String(fetcher.formData?.get('q') || '');
  if (fetcher?.state === 'loading') {
    term.current = currentTerm;
  }

  // Update cache when new results arrive
  if (fetcher?.data?.result && fetcher.state === 'idle') {
    cachedResults.current = fetcher.data.result;
    hasSearchedBefore.current = true;
  }

  // capture the search input element as a ref
  useEffect(() => {
    if (!inputRef.current) {
      inputRef.current = document.querySelector('input[type="search"]');
    }
  }, []);

  // Use cached results while loading new ones (optimistic UI)
  // Only show empty results if this is the very first search
  const {items, total} =
    fetcher.state === 'loading' && hasSearchedBefore.current
      ? cachedResults.current
      : fetcher?.data?.result ?? cachedResults.current;

  const isInitialSearch = fetcher.state === 'loading' && !hasSearchedBefore.current;

  return {items, total, inputRef, term, fetcher, isInitialSearch};
}

/** @typedef {PredictiveSearchReturn['result']['items']} PredictiveSearchItems */
/**
 * @typedef {{
 *   term: React.MutableRefObject<string>;
 *   total: number;
 *   inputRef: React.MutableRefObject<HTMLInputElement | null>;
 *   items: PredictiveSearchItems;
 *   fetcher: Fetcher<PredictiveSearchReturn>;
 *   isInitialSearch: boolean;
 * }} UsePredictiveSearchReturn
 */
/**
 * @typedef {Pick<
 *   UsePredictiveSearchReturn,
 *   'term' | 'total' | 'inputRef' | 'items'
 * > & {
 *   state: Fetcher['state'];
 *   closeSearch: () => void;
 *   isInitialSearch: boolean;
 * }} SearchResultsPredictiveArgs
 */
/**
 * @typedef {Pick<PredictiveSearchItems, ItemType> &
 *   Pick<SearchResultsPredictiveArgs, ExtraProps>} PartialPredictiveSearchResult
 * @template {keyof PredictiveSearchItems} ItemType
 * @template {keyof SearchResultsPredictiveArgs} [ExtraProps='term' | 'closeSearch']
 */
/**
 * @typedef {{
 *   children: (args: SearchResultsPredictiveArgs) => React.ReactNode;
 * }} SearchResultsPredictiveProps
 */

/** @template T @typedef {import('react-router').Fetcher<T>} Fetcher */
/** @typedef {import('~/lib/search').PredictiveSearchReturn} PredictiveSearchReturn */
