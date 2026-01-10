import {Await, Link, useLocation} from 'react-router';
import {Suspense, useId, useState, useEffect, useRef, useCallback} from 'react';
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
      <MobileMenuAside header={header} publicStoreDomain={publicStoreDomain} isLoggedIn={isLoggedIn} />
      <div className="page-layout-wrapper">
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
      </div>
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
  const [dropdownMaxHeight, setDropdownMaxHeight] = useState('60vh');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const searchInputRef = useRef(null);
  const fetchResultsRef = useRef(null);
  const asideRef = useRef(null);
  const [dropdownTopPosition, setDropdownTopPosition] = useState('calc(var(--header-height) + 25px)');

  // Synchronized dropdown state: opens when aside is open AND there's a search value
  useEffect(() => {
    const shouldBeOpen = asideType === 'search' && searchValue.trim().length > 0;
    setIsDropdownOpen(shouldBeOpen);
  }, [asideType, searchValue]);

  // Refetch results when aside reopens with existing search value
  useEffect(() => {
    if (asideType === 'search' && searchValue.trim().length > 0 && fetchResultsRef.current) {
      // Create synthetic event to trigger fetchResults
      const syntheticEvent = {
        target: { value: searchValue }
      };
      fetchResultsRef.current(syntheticEvent);
    }
  }, [asideType]); // Only trigger when asideType changes (aside opens/closes)

  // Clear search state when navigating to a new page
  useEffect(() => {
    if (prevPathnameRef.current !== location.pathname) {
      // Always clear search on navigation, regardless of aside state
      setSearchValue('');
      setSelectedIndex(-1);
      setIsDropdownOpen(false);
      // Close aside if it's currently the search aside
      if (asideType === 'search') {
        closeAside();
      }
    }
    prevPathnameRef.current = location.pathname;
  }, [location.pathname, asideType, closeAside]);

  // Unified close function - closes both aside and dropdown
  // NOTE: We don't clear searchValue here - it should persist across open/close cycles
  // searchValue is only cleared when: user clicks × button, navigates, or goes to search results
  const handleClose = useCallback(() => {
    setSelectedIndex(-1);
    setIsDropdownOpen(false);
    closeAside();
  }, [closeAside]);

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
        handleClose();
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

  // Dynamic dropdown positioning - position from aside bottom on mobile
  useEffect(() => {
    function calculateDropdownPosition() {
      const isMobile = window.innerWidth <= 768;

      if (isMobile && asideType === 'search') {
        // Wait for aside animation to complete (200ms transition)
        // Then calculate the aside's bottom position
        setTimeout(() => {
          // Query for the actual aside element (not the wrapper)
          const asideElement = document.querySelector('aside[data-type="search"]');

          if (asideElement) {
            const asideRect = asideElement.getBoundingClientRect();
            const asideBottom = asideRect.bottom;

            // Fallback if aside isn't rendered yet
            if (asideBottom <= 0) {
              // Estimate: header (64px) + search input area (~80-100px)
              setDropdownTopPosition('140px');
              const remainingHeight = window.innerHeight - 140;
              setDropdownMaxHeight(`${Math.max(200, remainingHeight)}px`);
            } else {
              // Position dropdown right below the aside
              setDropdownTopPosition(`${asideBottom}px`);

              // Calculate remaining viewport height for dropdown
              const remainingHeight = window.innerHeight - asideBottom;
              setDropdownMaxHeight(`${Math.max(200, remainingHeight)}px`);
            }
          } else {
            // Fallback if aside element not found
            setDropdownTopPosition('140px');
            const remainingHeight = window.innerHeight - 140;
            setDropdownMaxHeight(`${Math.max(200, remainingHeight)}px`);
          }
        }, 250); // Wait slightly longer than aside animation (200ms)
      } else if (!isMobile) {
        // Desktop: use original positioning from header
        setDropdownTopPosition('calc(var(--header-height) + 25px)');
        const headerHeight = 64;
        const searchAsideHeight = 100;
        const bottomPadding = 20;
        const availableHeight = window.innerHeight - headerHeight - searchAsideHeight - bottomPadding;
        setDropdownMaxHeight(`${Math.max(400, availableHeight)}px`);
      }
    }

    // Calculate when aside opens/closes
    if (asideType === 'search') {
      calculateDropdownPosition();
    }

    // Recalculate on window resize with debouncing
    let resizeTimer;
    function handleResize() {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(calculateDropdownPosition, 100);
    }

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', calculateDropdownPosition);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', calculateDropdownPosition);
      clearTimeout(resizeTimer);
    };
  }, [asideType, isDropdownOpen]);

  return (
    <>
      <div ref={asideRef}>
        <Aside type="search" heading="SEARCH">
          <div className="predictive-search">
            <SearchFormPredictive>
            {({inputRef, fetchResults}) => {
              // Store fetchResults in ref for programmatic fetching
              fetchResultsRef.current = fetchResults;

              return (
              <div className="search-input-wrapper" style={{position: 'relative'}}>
                <input
                  id="predictive-search-input"
                  name="q"
                  placeholder="Search"
                  ref={inputRef}
                  type="search"
                  value={searchValue}
                  role="combobox"
                  aria-expanded={isDropdownOpen}
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
              );
            }}
          </SearchFormPredictive>
        </div>
      </Aside>
      </div>

      <div
        ref={dropdownRef}
        id={resultsId}
        className={isDropdownOpen ? 'search-results-dropdown visible' : 'search-results-dropdown hidden'}
        role="listbox"
        aria-hidden={!isDropdownOpen}
        style={{
          maxHeight: dropdownMaxHeight,
          top: dropdownTopPosition
        }}
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
                      className={total > 0 ? 'search-link-with-results' : 'search-link-no-results'}
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
    </>
  );
}

/**
 * @param {{
 *   header: PageLayoutProps['header'];
 *   publicStoreDomain: PageLayoutProps['publicStoreDomain'];
 *   isLoggedIn: PageLayoutProps['isLoggedIn'];
 * }}
 */
function MobileMenuAside({header, publicStoreDomain, isLoggedIn}) {
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
        <MobileMenuFooterLinks />
        <MobileMenuAccountSection isLoggedIn={isLoggedIn} />
      </Aside>
    )
  );
}

/**
 * Footer links section in mobile menu
 */
function MobileMenuFooterLinks() {
  const {close} = useAside();

  return (
    <nav className="mobile-menu-footer-links">
      <Link to="/contact-us" onClick={close}>Contact us</Link>
      <Link to="/policies/privacy-policy" onClick={close}>Privacy Policy</Link>
      <Link to="/returns" onClick={close}>Refund Policy</Link>
      <Link to="/policies/shipping-policy" onClick={close}>Shipping Policy</Link>
      <Link to="/faq" onClick={close}>FAQ</Link>
      <Link to="/terms-of-service" onClick={close}>Terms of Service</Link>
    </nav>
  );
}

/**
 * Account section at the bottom of mobile menu aside
 * @param {{isLoggedIn: PageLayoutProps['isLoggedIn']}}
 */
function MobileMenuAccountSection({isLoggedIn}) {
  return (
    <Suspense fallback={<AccountSectionFallback />}>
      <Await resolve={isLoggedIn}>
        {(isLoggedIn) => (
          <div className="mobile-menu-account-section">
            <div className="account-button-wrapper">
              <a href="/account" className="account-button">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 16 16" style={{marginRight: '8px'}}>
                  <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6m2-3a2 2 0 1 1-4 0 2 2 0 0 1 4 0m4 8c0 1-1 1-1 1H3s-1 0-1-1 1-4 6-4 6 3 6 4m-1-.004c-.001-.246-.154-.986-.832-1.664C11.516 10.68 10.289 10 8 10s-3.516.68-4.168 1.332c-.678.678-.83 1.418-.832 1.664z"/>
                </svg>
                {isLoggedIn ? 'Account' : 'Log in'}
              </a>
            </div>
          </div>
        )}
      </Await>
    </Suspense>
  );
}

/**
 * Fallback component while checking login status
 */
function AccountSectionFallback() {
  return (
    <div className="mobile-menu-account-section">
      <div className="account-button-wrapper">
        <div className="account-button">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 16 16" style={{marginRight: '8px'}}>
            <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6m2-3a2 2 0 1 1-4 0 2 2 0 0 1 4 0m4 8c0 1-1 1-1 1H3s-1 0-1-1 1-4 6-4 6 3 6 4m-1-.004c-.001-.246-.154-.986-.832-1.664C11.516 10.68 10.289 10 8 10s-3.516.68-4.168 1.332c-.678.678-.83 1.418-.832 1.664z"/>
          </svg>
          Account
        </div>
      </div>
    </div>
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
