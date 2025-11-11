import {Await, Link, useLocation} from 'react-router';
import {Suspense, useId, useState, useEffect, useRef} from 'react';
import {Aside, useAside} from '~/components/Aside';
import {Footer} from '~/components/Footer';
import {Header, HeaderMenu} from '~/components/Header';
import {CartMain} from '~/components/CartMain';
import {
  SEARCH_ENDPOINT,
  SearchFormPredictive,
} from '~/components/SearchFormPredictive';
import {SearchResultsPredictive} from '~/components/SearchResultsPredictive';
import ZoomedParticleAnimation from '~/components/ZoomedParticleAnimation';

/**
 * @param {PageLayoutProps}
 */
export function PageLayout({
  cart,
  children = null,
  footer,
  header,
  isLoggedIn,
  publicStoreDomain,
}) {
  return (
    <Aside.Provider>
      <ZoomedParticleAnimation />
      <CartAside cart={cart} />
      <SearchAside />
      <MobileMenuAside header={header} publicStoreDomain={publicStoreDomain} />
      {header && (
        <Header
          header={header}
          cart={cart}
          isLoggedIn={isLoggedIn}
          publicStoreDomain={publicStoreDomain}
        />
      )}
      <main>{children}</main>
      <Footer
        footer={footer}
        header={header}
        publicStoreDomain={publicStoreDomain}
      />
    </Aside.Provider>
  );
}

/**
 * @param {{cart: PageLayoutProps['cart']}}
 */
function CartAside({cart}) {
  return (
    <Aside type="cart" heading="CART">
      <Suspense fallback={<p>Loading cart ...</p>}>
        <Await resolve={cart}>
          {(cart) => {
            return <CartMain cart={cart} layout="aside" />;
          }}
        </Await>
      </Suspense>
    </Aside>
  );
}

function SearchAside() {
  const queriesDatalistId = useId();
  const location = useLocation();
  const {close: closeAside, type: asideType} = useAside();
  const prevPathnameRef = useRef(location.pathname);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Close aside when pathname changes (user navigated to a new page)
  useEffect(() => {
    if (prevPathnameRef.current !== location.pathname && asideType === 'search') {
      closeAside();
      setSearchTerm('');
      setShowDropdown(false);
      setHasSearched(false);
    }
    prevPathnameRef.current = location.pathname;
  }, [location.pathname, asideType, closeAside]);

  useEffect(() => {
    if (searchTerm.trim()) {
      setShowDropdown(true);
      setHasSearched(true);
    } else {
      const timer = setTimeout(() => {
        setShowDropdown(false);
        setHasSearched(false);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [searchTerm]);

  return (
    <>
      <Aside type="search" heading="SEARCH">
        <div className="predictive-search">
          <SearchFormPredictive>
            {({fetchResults, inputRef}) => (
              <input
                name="q"
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  fetchResults(e);
                }}
                onFocus={fetchResults}
                onBlur={(e) => {
                  if (!e.target.value.trim()) {
                    setSearchTerm('');
                  }
                }}
                placeholder="Search"
                ref={inputRef}
                type="search"
                value={searchTerm}
              />
            )}
          </SearchFormPredictive>
        </div>
      </Aside>

      {asideType === 'search' && (
        <div className={`search-results-dropdown ${showDropdown ? 'visible' : 'hidden'}`}>
          <SearchResultsPredictive>
            {({items, total, term, state}) => {
              const {articles, collections, pages, products, queries} = items;

              // Don't render anything if no search term yet
              if (!term.current) {
                return null;
              }

              // Show loading state
              if (state === 'loading') {
                return <div style={{padding: '1rem', color: 'black'}}>Searching...</div>;
              }

              // Show empty state if no results
              if (!total) {
                return <SearchResultsPredictive.Empty term={term} />;
              }

              return (
                <>
                  <SearchResultsPredictive.Queries
                    queries={queries}
                    queriesDatalistId={queriesDatalistId}
                  />
                  <SearchResultsPredictive.Products
                    products={products}
                  />
                  <SearchResultsPredictive.Collections
                    collections={collections}
                  />
                  <SearchResultsPredictive.Pages
                    pages={pages}
                  />
                  <SearchResultsPredictive.Articles
                    articles={articles}
                  />
                  {term.current && total ? (
                    <Link to={`${SEARCH_ENDPOINT}?q=${term.current}`}>
                      <p>
                        View all results for <q>{term.current}</q>
                        &nbsp; →
                      </p>
                    </Link>
                  ) : null}
                </>
              );
            }}
          </SearchResultsPredictive>
        </div>
      )}
    </>
  );
}

/**
 * @param {{
 *   header: PageLayoutProps['header'];
 *   publicStoreDomain: PageLayoutProps['publicStoreDomain'];
 * }}
 */
function MobileMenuAside({header, publicStoreDomain}) {
  return (
    header.menu &&
    header.shop.primaryDomain?.url && (
      <Aside type="mobile" heading="MENU">
        <HeaderMenu
          menu={header.menu}
          viewport="mobile"
          primaryDomainUrl={header.shop.primaryDomain.url}
          publicStoreDomain={publicStoreDomain}
        />
      </Aside>
    )
  );
}

/**
 * @typedef {Object} PageLayoutProps
 * @property {Promise<CartApiQueryFragment|null>} cart
 * @property {Promise<FooterQuery|null>} footer
 * @property {HeaderQuery} header
 * @property {Promise<boolean>} isLoggedIn
 * @property {string} publicStoreDomain
 * @property {React.ReactNode} [children]
 */

/** @typedef {import('storefrontapi.generated').CartApiQueryFragment} CartApiQueryFragment */
/** @typedef {import('storefrontapi.generated').FooterQuery} FooterQuery */
/** @typedef {import('storefrontapi.generated').HeaderQuery} HeaderQuery */
