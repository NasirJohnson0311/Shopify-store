import {useState, useRef, useEffect} from 'react';
import {useNavigate, useSearchParams} from 'react-router';

export function FilterSort({totalProducts, inStockCount, outOfStockCount}) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [showAvailability, setShowAvailability] = useState(false);
  const [showPrice, setShowPrice] = useState(false);
  const [showSort, setShowSort] = useState(false);

  const availabilityRef = useRef(null);
  const priceRef = useRef(null);
  const sortRef = useRef(null);

  // Get current filter values from URL
  const availability = searchParams.get('availability')?.split(',').filter(Boolean) || [];
  const minPrice = searchParams.get('minPrice') || '';
  const maxPrice = searchParams.get('maxPrice') || '';
  const sortBy = searchParams.get('sort') || 'relevance';
  const searchTerm = searchParams.get('q') || '';

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (availabilityRef.current && !availabilityRef.current.contains(event.target)) {
        setShowAvailability(false);
      }
      if (priceRef.current && !priceRef.current.contains(event.target)) {
        setShowPrice(false);
      }
      if (sortRef.current && !sortRef.current.contains(event.target)) {
        setShowSort(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const updateFilters = (updates) => {
    const newParams = new URLSearchParams(searchParams);

    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === '' || (Array.isArray(value) && value.length === 0)) {
        newParams.delete(key);
      } else {
        newParams.set(key, value);
      }
    });

    // Keep the search term
    if (searchTerm) {
      newParams.set('q', searchTerm);
    }

    navigate(`?${newParams.toString()}`, {replace: true});
  };

  const handleAvailabilityChange = (value) => {
    let newAvailability = [...availability];

    if (newAvailability.includes(value)) {
      newAvailability = newAvailability.filter(v => v !== value);
    } else {
      newAvailability.push(value);
    }

    updateFilters({availability: newAvailability.join(',')});
  };

  const handlePriceFilter = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const min = formData.get('minPrice');
    const max = formData.get('maxPrice');

    updateFilters({
      minPrice: min || null,
      maxPrice: max || null,
    });
    setShowPrice(false);
  };

  const handleSortChange = (value) => {
    updateFilters({sort: value});
    setShowSort(false);
  };

  const resetAvailability = () => {
    updateFilters({availability: null});
  };

  const selectedAvailabilityCount = availability.length;

  return (
    <div className="filter-sort-container">
      <div className="filter-section">
        <span className="filter-label">Filter:</span>

        {/* Availability Filter */}
        <div className="filter-dropdown" ref={availabilityRef}>
          <button
            className="filter-button"
            onClick={() => setShowAvailability(!showAvailability)}
          >
            Availability
            <span className="dropdown-arrow">
              <svg width="12" height="8" viewBox="0 0 12 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M1 1L6 6L11 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </span>
          </button>

          {showAvailability && (
            <div className="dropdown-content">
              <div className="dropdown-header">
                <span>{selectedAvailabilityCount} selected</span>
                <button
                  className="reset-button"
                  onClick={resetAvailability}
                >
                  Reset
                </button>
              </div>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={availability.includes('in_stock')}
                  onChange={() => handleAvailabilityChange('in_stock')}
                />
                <span>In stock ({inStockCount})</span>
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={availability.includes('out_of_stock')}
                  onChange={() => handleAvailabilityChange('out_of_stock')}
                />
                <span>Out of stock ({outOfStockCount})</span>
              </label>
            </div>
          )}
        </div>

        {/* Price Filter */}
        <div className="filter-dropdown" ref={priceRef}>
          <button
            className="filter-button"
            onClick={() => setShowPrice(!showPrice)}
          >
            Price
            <span className="dropdown-arrow">
              <svg width="12" height="8" viewBox="0 0 12 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M1 1L6 6L11 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </span>
          </button>

          {showPrice && (
            <div className="dropdown-content price-dropdown">
              <form onSubmit={handlePriceFilter}>
                <div className="price-inputs">
                  <div className="price-input-group">
                    <label>From</label>
                    <input
                      type="number"
                      name="minPrice"
                      placeholder="$ 0"
                      defaultValue={minPrice}
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div className="price-input-group">
                    <label>To</label>
                    <input
                      type="number"
                      name="maxPrice"
                      placeholder="$ 0"
                      defaultValue={maxPrice}
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>
                <button type="submit" className="apply-button">
                  Apply
                </button>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* Sort Section */}
      <div className="sort-section">
        <span className="sort-label">Sort by:</span>
        <div className="filter-dropdown" ref={sortRef}>
          <button
            className="filter-button"
            onClick={() => setShowSort(!showSort)}
          >
            {sortBy === 'price_asc' ? 'Price, low to high' :
             sortBy === 'price_desc' ? 'Price, high to low' :
             'Relevance'}
            <span className="dropdown-arrow">
              <svg width="12" height="8" viewBox="0 0 12 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M1 1L6 6L11 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </span>
          </button>

          {showSort && (
            <div className="dropdown-content sort-dropdown">
              <button
                className={`sort-option ${sortBy === 'relevance' ? 'active' : ''}`}
                onClick={() => handleSortChange('relevance')}
              >
                Relevance
              </button>
              <button
                className={`sort-option ${sortBy === 'price_asc' ? 'active' : ''}`}
                onClick={() => handleSortChange('price_asc')}
              >
                Price, low to high
              </button>
              <button
                className={`sort-option ${sortBy === 'price_desc' ? 'active' : ''}`}
                onClick={() => handleSortChange('price_desc')}
              >
                Price, high to low
              </button>
            </div>
          )}
        </div>

        <span className="results-count">{totalProducts} results</span>
      </div>
    </div>
  );
}
