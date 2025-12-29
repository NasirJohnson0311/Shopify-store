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
  const resultsId = useId();
  const location = useLocation();
  const {close: closeAside, type: asideType} = useAside();
  const prevPathnameRef = useRef(location.pathname);
  const [searchValue, setSearchValue] = useState('');
  const [activeDescendant, setActiveDescendant] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const dropdownRef = useRef(null);

  // Close aside when pathname changes (user navigated to a new page)
  useEffect(() => {
    if (prevPathnameRef.current !== location.pathname && asideType === 'search') {
      closeAside();
      setSearchValue('');
      setSelectedIndex(-1);
    }
    prevPathnameRef.current = location.pathname;
  }, [location.pathname, asideType, closeAside]);

  // Keyboard navigation handler
  const handleKeyDown = (e, total) => {
    if (!total || total === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => (prev < total - 1 ? prev + 1 : prev));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Escape':
        e.preventDefault();
        setSearchValue('');
        setSelectedIndex(-1);
        closeAside();
        break;
      case 'Enter':
        if (selectedIndex >= 0 && dropdownRef.current) {
          e.preventDefault();
          // Find all result links
          const links = dropdownRef.current.querySelectorAll('a[role="option"]');
          if (links[selectedIndex]) {
            links[selectedIndex].click();
          }
        }
        break;
    }
  };

  // Update aria-activedescendant when selection changes
  useEffect(() => {
    if (selectedIndex >= 0 && dropdownRef.current) {
      const options = dropdownRef.current.querySelectorAll('[role="option"]');
      if (options[selectedIndex]) {
        setActiveDescendant(options[selectedIndex].id || '');
      }
    } else {
      setActiveDescendant('');
    }
  }, [selectedIndex]);

  return (
    <>
      <Aside type="search" heading="SEARCH">
        <div className="predictive-search">
          <SearchFormPredictive>
            {({inputRef, fetchResults}) => (
              <div style={{position: 'relative', width: '80%', margin: '0 auto'}}>
                <input
                  id="predictive-search-input"
                  name="q"
                  placeholder="Search"
                  ref={inputRef}
                  type="search"
                  value={searchValue}
                  role="combobox"
                  aria-expanded={searchValue.length > 0}
                  aria-controls={resultsId}
                  aria-owns={resultsId}
                  aria-autocomplete="list"
                  aria-activedescendant={activeDescendant}
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck="false"
                  onChange={(e) => {
                    setSearchValue(e.target.value);
                    fetchResults(e);
                    setSelectedIndex(-1);
                  }}
                  onKeyDown={(e) => {
                    // Get total from dropdown
                    const total = dropdownRef.current?.querySelectorAll('[role="option"]').length || 0;
                    handleKeyDown(e, total);
                  }}
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
                />
                {searchValue && (
                  <button
                    type="button"
                    aria-label="Clear search"
                    onClick={() => {
                      setSearchValue('');
                      setSelectedIndex(-1);
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
            )}
          </SearchFormPredictive>
        </div>
      </Aside>

      {asideType === 'search' && searchValue && (
        <div
          ref={dropdownRef}
          id={resultsId}
          className="search-results-dropdown visible"
          role="listbox"
        >
          <SearchResultsPredictive>
            {({items, total, term, state, isInitialSearch}) => {
              const {articles, collections, pages, products, queries} = items;

              // Only show "Searching..." on the very first search (no previous results)
              if (isInitialSearch) {
                return <p style={{padding: '1rem', margin: 0}}>Searching...</p>;
              }

              return (
                <>
                  {/* Subtle loading indicator at the top - doesn't disrupt results */}
                  {state === 'loading' && (
                    <div className="search-loading-indicator">
                      <div className="search-loading-bar"></div>
                    </div>
                  )}

                  <SearchResultsPredictive.Queries
                    queries={queries}
                    queriesDatalistId={queriesDatalistId}
                  />
                  <SearchResultsPredictive.Products
                    products={products}
                    selectedIndex={selectedIndex}
                  />
                  <SearchResultsPredictive.Collections
                    collections={collections}
                    selectedIndex={selectedIndex}
                  />
                  <SearchResultsPredictive.Pages
                    pages={pages}
                    selectedIndex={selectedIndex}
                  />
                  <SearchResultsPredictive.Articles
                    articles={articles}
                    selectedIndex={selectedIndex}
                  />

                  {/* Always show "View results" button when there's a search term */}
                  {term.current && (
                    <Link
                      to={`${SEARCH_ENDPOINT}?q=${term.current}`}
                      onClick={() => {
                        setSearchValue('');
                        setSelectedIndex(-1);
                      }}
                    >
                      <p>
                        <span>
                          {total > 0
                            ? `View all results for "${term.current}"`
                            : `Search for "${term.current}"`}
                        </span>
                        <span>→</span>
                      </p>
                    </Link>
                  )}

                  <div
                    role="status"
                    aria-live="polite"
                    aria-atomic="true"
                    className="visually-hidden"
                  >
                    {state === 'loading' ? 'Updating results' : `${total} results found`}
                  </div>
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
