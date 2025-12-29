import {useLoaderData, useSearchParams, Link} from 'react-router';
import {getPaginationVariables, Analytics} from '@shopify/hydrogen';
import {useEffect, useRef, useState} from 'react';
import {SearchForm} from '~/components/SearchForm';
import {SearchFormPredictive, SEARCH_ENDPOINT} from '~/components/SearchFormPredictive';
import {SearchResults} from '~/components/SearchResults';
import {SearchResultsPredictive} from '~/components/SearchResultsPredictive';
import {getEmptyPredictiveSearchResult} from '~/lib/search';
import {useAside} from '~/components/Aside';
import {FilterSort} from '~/components/FilterSort';
import {useMemo} from 'react';

/**
 * @type {Route.MetaFunction}
 */
export const meta = () => {
  return [{title: `Hydrogen | Search`}];
};

/**
 * @param {Route.LoaderArgs}
 */
export async function loader({request, context}) {
  const url = new URL(request.url);
  const isPredictive = url.searchParams.has('predictive');
  const searchPromise = isPredictive
    ? predictiveSearch({request, context})
    : regularSearch({request, context});

  searchPromise.catch((error) => {
    console.error(error);
    return {term: '', result: null, error: error.message};
  });

  return await searchPromise;
}

/**
 * Renders the /search route
 */
export default function SearchPage() {
  /** @type {LoaderReturnData} */
  const {type, term, result, error} = useLoaderData();
  const {type: asideType, close: closeAside} = useAside();
  const miniSearchInputRef = useRef(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchParams] = useSearchParams();
  const [searchValue, setSearchValue] = useState(term || '');

  // Blur the mini search bar when the navbar search aside opens
  useEffect(() => {
    if (asideType === 'search' && miniSearchInputRef.current) {
      miniSearchInputRef.current.blur();
      setShowDropdown(false);
    }
  }, [asideType]);

  // Apply client-side filters to products
  const filteredResult = useMemo(() => {
    if (!result?.items?.products) return result;

    const availability = searchParams.get('availability')?.split(',').filter(Boolean) || [];
    const minPrice = parseFloat(searchParams.get('minPrice') || '0');
    const maxPrice = parseFloat(searchParams.get('maxPrice') || 'Infinity');
    const sortBy = searchParams.get('sort') || 'relevance';

    let filteredProducts = [...result.items.products.nodes];

    // Apply availability filter
    if (availability.length > 0) {
      filteredProducts = filteredProducts.filter(product => {
        const isAvailable = product.availableForSale || product.selectedOrFirstAvailableVariant?.availableForSale;
        if (availability.includes('in_stock') && isAvailable) return true;
        if (availability.includes('out_of_stock') && !isAvailable) return true;
        return false;
      });
    }

    // Apply price filter
    if (minPrice > 0 || maxPrice < Infinity) {
      filteredProducts = filteredProducts.filter(product => {
        const price = parseFloat(product.selectedOrFirstAvailableVariant?.price?.amount || '0');
        return price >= minPrice && price <= maxPrice;
      });
    }

    // Apply sorting (client-side for price sorting)
    if (sortBy === 'price_asc') {
      filteredProducts.sort((a, b) => {
        const priceA = parseFloat(a.selectedOrFirstAvailableVariant?.price?.amount || '0');
        const priceB = parseFloat(b.selectedOrFirstAvailableVariant?.price?.amount || '0');
        return priceA - priceB;
      });
    } else if (sortBy === 'price_desc') {
      filteredProducts.sort((a, b) => {
        const priceA = parseFloat(a.selectedOrFirstAvailableVariant?.price?.amount || '0');
        const priceB = parseFloat(b.selectedOrFirstAvailableVariant?.price?.amount || '0');
        return priceB - priceA;
      });
    }

    return {
      ...result,
      items: {
        ...result.items,
        products: {
          ...result.items.products,
          nodes: filteredProducts,
        },
      },
      total: filteredProducts.length + (result.items.pages?.nodes?.length || 0) + (result.items.articles?.nodes?.length || 0),
    };
  }, [result, searchParams]);

  // Calculate stock counts for filter UI
  const stockCounts = useMemo(() => {
    if (!result?.items?.products?.nodes) return { inStock: 0, outOfStock: 0 };

    const inStock = result.items.products.nodes.filter(
      p => p.availableForSale || p.selectedOrFirstAvailableVariant?.availableForSale
    ).length;
    const outOfStock = result.items.products.nodes.length - inStock;

    return { inStock, outOfStock };
  }, [result]);

  if (type === 'predictive') return null;

  return (
    <div className="search" style={{minHeight: 'calc(100vh - var(--header-height, 80px))'}}>
      <h1>Search Results</h1>
      <div style={{width: '100%', display: 'flex', justifyContent: 'center', marginBottom: '20px', position: 'relative'}}>
        <SearchFormPredictive style={{width: '100%', maxWidth: '1400px', display: 'flex', justifyContent: 'center', padding: '0 20px', boxSizing: 'border-box', position: 'relative'}}>
          {({inputRef, fetcher, fetchResults, goToSearch}) => {
            // Set the miniSearchInputRef to the inputRef from the form
            if (inputRef.current && !miniSearchInputRef.current) {
              miniSearchInputRef.current = inputRef.current;
            }

            return (
              <>
                <div style={{position: 'relative', width: '80%', maxWidth: '800px'}}>
                  <input
                    id="search-results-page-input"
                    value={searchValue}
                    name="q"
                    placeholder="Search"
                    ref={inputRef}
                    type="search"
                    role="combobox"
                    aria-expanded={showDropdown && searchValue.length > 0}
                    aria-autocomplete="list"
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck="false"
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      backdropFilter: 'blur(20px)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '12px',
                      color: '#fff',
                      padding: '0.6em 2.5em 0.6em 1.2em',
                      fontSize: '1rem',
                      width: '100%',
                      boxSizing: 'border-box',
                      outline: 'none'
                    }}
                    onChange={(e) => {
                      setSearchValue(e.target.value);
                      fetchResults(e);
                      setShowDropdown(true);
                    }}
                    onFocus={(e) => {
                      // Close the navbar search aside when the mini search bar is focused
                      if (asideType === 'search') {
                        closeAside();
                      }
                      // Show dropdown and fetch results if there's a value
                      if (e.target.value) {
                        fetchResults(e);
                        setShowDropdown(true);
                      }
                    }}
                    onBlur={() => {
                      // Delay closing to allow clicking on dropdown items
                      setTimeout(() => setShowDropdown(false), 200);
                    }}
                  />
                  {searchValue && (
                    <button
                      type="button"
                      aria-label="Clear search"
                      onClick={() => {
                        setSearchValue('');
                        setShowDropdown(false);
                        if (inputRef.current) {
                          inputRef.current.value = '';
                          inputRef.current.focus();
                        }
                      }}
                      style={{
                        position: 'absolute',
                        right: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'transparent',
                        border: 'none',
                        color: 'rgba(255, 255, 255, 0.6)',
                        cursor: 'pointer',
                        padding: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '18px',
                        lineHeight: '1',
                        transition: 'color 0.2s ease'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.color = '#fff'}
                      onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.6)'}
                    >
                      ×
                    </button>
                  )}
                </div>
                {/* Optimistic UI - show previous results while loading new ones */}
                {showDropdown && searchValue && (
                  <SearchResultsPredictive goToSearch={goToSearch}>
                    {({items, total, state, isInitialSearch, term}) => {
                      // Only show "Searching..." on the very first search
                      if (isInitialSearch) {
                        return (
                          <div className="search-results-dropdown visible">
                            <p style={{padding: '1rem', margin: 0}}>Searching...</p>
                          </div>
                        );
                      }

                      return (
                        <div className="search-results-dropdown visible">
                          {/* Subtle loading indicator at the top - doesn't disrupt results */}
                          {state === 'loading' && (
                            <div className="search-loading-indicator">
                              <div className="search-loading-bar"></div>
                            </div>
                          )}

                          <SearchResultsPredictive.Products products={items.products} closeSearch={goToSearch} term={term} />
                          <SearchResultsPredictive.Pages pages={items.pages} closeSearch={goToSearch} term={term} />
                          <SearchResultsPredictive.Articles articles={items.articles} closeSearch={goToSearch} term={term} />

                          {/* Always show "View results" button when there's a search term */}
                          {searchValue && (
                            <Link
                              to={`${SEARCH_ENDPOINT}?q=${searchValue}`}
                              onClick={() => {
                                setShowDropdown(false);
                              }}
                            >
                              <p>
                                <span>
                                  {total > 0
                                    ? `View all results for "${searchValue}"`
                                    : `Search for "${searchValue}"`}
                                </span>
                                <span>→</span>
                              </p>
                            </Link>
                          )}
                        </div>
                      );
                    }}
                  </SearchResultsPredictive>
                )}
              </>
            );
          }}
        </SearchFormPredictive>
      </div>
      {error && <p style={{color: 'red', marginBottom: '20px'}}>{error}</p>}
      {!term || !result?.total ? (
        <SearchResults.Empty />
      ) : (
        <>
          <FilterSort
            totalProducts={filteredResult?.items?.products?.nodes?.length || 0}
            inStockCount={stockCounts.inStock}
            outOfStockCount={stockCounts.outOfStock}
          />
          <SearchResults result={filteredResult} term={term}>
            {({articles, pages, products, term}) => (
              <div>
                <SearchResults.Products products={products} term={term} />
                <SearchResults.Pages pages={pages} term={term} />
                <SearchResults.Articles articles={articles} term={term} />
              </div>
            )}
          </SearchResults>
        </>
      )}
      <Analytics.SearchView data={{searchTerm: term, searchResults: result}} />
    </div>
  );
}

/**
 * Regular search query and fragments
 * (adjust as needed)
 */
const SEARCH_PRODUCT_FRAGMENT = `#graphql
  fragment SearchProduct on Product {
    __typename
    handle
    id
    publishedAt
    title
    trackingParameters
    vendor
    availableForSale
    selectedOrFirstAvailableVariant(
      selectedOptions: []
      ignoreUnknownOptions: true
      caseInsensitiveMatch: true
    ) {
      id
      availableForSale
      image {
        url
        altText
        width
        height
      }
      price {
        amount
        currencyCode
      }
      compareAtPrice {
        amount
        currencyCode
      }
      selectedOptions {
        name
        value
      }
      product {
        handle
        title
      }
    }
  }
`;

const SEARCH_PAGE_FRAGMENT = `#graphql
  fragment SearchPage on Page {
     __typename
     handle
    id
    title
    trackingParameters
  }
`;

const SEARCH_ARTICLE_FRAGMENT = `#graphql
  fragment SearchArticle on Article {
    __typename
    handle
    id
    title
    trackingParameters
  }
`;

const PAGE_INFO_FRAGMENT = `#graphql
  fragment PageInfoFragment on PageInfo {
    hasNextPage
    hasPreviousPage
    startCursor
    endCursor
  }
`;

// NOTE: https://shopify.dev/docs/api/storefront/latest/queries/search
export const SEARCH_QUERY = `#graphql
  query RegularSearch(
    $country: CountryCode
    $endCursor: String
    $first: Int
    $language: LanguageCode
    $last: Int
    $term: String!
    $startCursor: String
  ) @inContext(country: $country, language: $language) {
    articles: search(
      query: $term,
      types: [ARTICLE],
      first: $first,
    ) {
      nodes {
        ...on Article {
          ...SearchArticle
        }
      }
    }
    pages: search(
      query: $term,
      types: [PAGE],
      first: $first,
    ) {
      nodes {
        ...on Page {
          ...SearchPage
        }
      }
    }
    products: search(
      after: $endCursor,
      before: $startCursor,
      first: $first,
      last: $last,
      query: $term,
      sortKey: RELEVANCE,
      types: [PRODUCT],
      unavailableProducts: SHOW,
    ) {
      nodes {
        ...on Product {
          ...SearchProduct
        }
      }
      pageInfo {
        ...PageInfoFragment
      }
    }
  }
  ${SEARCH_PRODUCT_FRAGMENT}
  ${SEARCH_PAGE_FRAGMENT}
  ${SEARCH_ARTICLE_FRAGMENT}
  ${PAGE_INFO_FRAGMENT}
`;

/**
 * Regular search fetcher
 * @param {Pick<
 *   Route.LoaderArgs,
 *   'request' | 'context'
 * >}
 * @return {Promise<RegularSearchReturn>}
 */
async function regularSearch({request, context}) {
  const {storefront} = context;
  const url = new URL(request.url);
  const variables = getPaginationVariables(request, {pageBy: 8});
  const term = String(url.searchParams.get('q') || '');

  // Search articles, pages, and products for the `q` term
  const {errors, ...items} = await storefront.query(SEARCH_QUERY, {
    variables: {...variables, term},
  });

  if (!items) {
    throw new Error('No search data returned from Shopify API');
  }

  const total = Object.values(items).reduce(
    (acc, {nodes}) => acc + nodes.length,
    0,
  );

  const error = errors
    ? errors.map(({message}) => message).join(', ')
    : undefined;

  return {type: 'regular', term, error, result: {total, items}};
}

/**
 * Predictive search query and fragments
 * (adjust as needed)
 */
const PREDICTIVE_SEARCH_ARTICLE_FRAGMENT = `#graphql
  fragment PredictiveArticle on Article {
    __typename
    id
    title
    handle
    blog {
      handle
    }
    image {
      url
      altText
      width
      height
    }
    trackingParameters
  }
`;

const PREDICTIVE_SEARCH_COLLECTION_FRAGMENT = `#graphql
  fragment PredictiveCollection on Collection {
    __typename
    id
    title
    handle
    image {
      url
      altText
      width
      height
    }
    trackingParameters
  }
`;

const PREDICTIVE_SEARCH_PAGE_FRAGMENT = `#graphql
  fragment PredictivePage on Page {
    __typename
    id
    title
    handle
    trackingParameters
  }
`;

const PREDICTIVE_SEARCH_PRODUCT_FRAGMENT = `#graphql
  fragment PredictiveProduct on Product {
    __typename
    id
    title
    handle
    productType
    trackingParameters
    selectedOrFirstAvailableVariant(
      selectedOptions: []
      ignoreUnknownOptions: true
      caseInsensitiveMatch: true
    ) {
      id
      image {
        url
        altText
        width
        height
      }
      price {
        amount
        currencyCode
      }
    }
  }
`;

const PREDICTIVE_SEARCH_QUERY_FRAGMENT = `#graphql
  fragment PredictiveQuery on SearchQuerySuggestion {
    __typename
    text
    styledText
    trackingParameters
  }
`;

// NOTE: https://shopify.dev/docs/api/storefront/latest/queries/predictiveSearch
const PREDICTIVE_SEARCH_QUERY = `#graphql
  query PredictiveSearch(
    $country: CountryCode
    $language: LanguageCode
    $limit: Int!
    $limitScope: PredictiveSearchLimitScope!
    $term: String!
    $types: [PredictiveSearchType!]
  ) @inContext(country: $country, language: $language) {
    predictiveSearch(
      limit: $limit,
      limitScope: $limitScope,
      query: $term,
      types: $types,
    ) {
      articles {
        ...PredictiveArticle
      }
      collections {
        ...PredictiveCollection
      }
      pages {
        ...PredictivePage
      }
      products {
        ...PredictiveProduct
      }
      queries {
        ...PredictiveQuery
      }
    }
  }
  ${PREDICTIVE_SEARCH_ARTICLE_FRAGMENT}
  ${PREDICTIVE_SEARCH_COLLECTION_FRAGMENT}
  ${PREDICTIVE_SEARCH_PAGE_FRAGMENT}
  ${PREDICTIVE_SEARCH_PRODUCT_FRAGMENT}
  ${PREDICTIVE_SEARCH_QUERY_FRAGMENT}
`;

/**
 * Predictive search fetcher
 * @param {Pick<
 *   Route.ActionArgs,
 *   'request' | 'context'
 * >}
 * @return {Promise<PredictiveSearchReturn>}
 */
async function predictiveSearch({request, context}) {
  const {storefront} = context;
  const url = new URL(request.url);
  const term = String(url.searchParams.get('q') || '').trim();
  const limit = Number(url.searchParams.get('limit') || 10);
  const type = 'predictive';

  if (!term) return {type, term, result: getEmptyPredictiveSearchResult()};

  // Predictively search articles, collections, pages, products, and queries (suggestions)
  const {predictiveSearch: items, errors} = await storefront.query(
    PREDICTIVE_SEARCH_QUERY,
    {
      variables: {
        // customize search options as needed
        limit,
        limitScope: 'EACH',
        term,
      },
    },
  );

  if (errors) {
    throw new Error(
      `Shopify API errors: ${errors.map(({message}) => message).join(', ')}`,
    );
  }

  if (!items) {
    throw new Error('No predictive search data returned from Shopify API');
  }

  const total = Object.values(items).reduce(
    (acc, item) => acc + item.length,
    0,
  );

  return {type, term, result: {items, total}};
}

/** @typedef {import('./+types/search').Route} Route */
/** @typedef {import('~/lib/search').RegularSearchReturn} RegularSearchReturn */
/** @typedef {import('~/lib/search').PredictiveSearchReturn} PredictiveSearchReturn */
/** @typedef {import('storefrontapi.generated').RegularSearchQuery} RegularSearchQuery */
/** @typedef {import('storefrontapi.generated').PredictiveSearchQuery} PredictiveSearchQuery */
/** @typedef {import('@shopify/remix-oxygen').SerializeFrom<typeof loader>} LoaderReturnData */
