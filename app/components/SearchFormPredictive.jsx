import {useFetcher, useNavigate} from 'react-router';
import React, {useRef, useEffect, useCallback} from 'react';
import {useAside} from './Aside';

export const SEARCH_ENDPOINT = '/search';

/**
 *  Search form component that sends search requests to the `/search` route
 * Implements debouncing and request cancellation for optimal performance
 * @param {SearchFormPredictiveProps}
 */
export function SearchFormPredictive({
  children,
  className = 'predictive-search-form',
  ...props
}) {
  const fetcher = useFetcher({key: 'search'});
  const inputRef = useRef(null);
  const navigate = useNavigate();
  const aside = useAside();

  // Debounce timer ref
  const debounceTimerRef = useRef(null);

  // AbortController for canceling in-flight requests
  const abortControllerRef = useRef(null);

  /** Navigate to the search page with the current input value */
  function goToSearch(event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    const term = inputRef?.current?.value;
    void navigate(SEARCH_ENDPOINT + (term ? `?q=${term}` : ''));
    aside.close();
  }

  /**
   * Debounced fetch function - waits 200ms after user stops typing
   * Cancels previous in-flight requests to prevent stale results
   */
  const fetchResults = useCallback((event) => {
    const searchTerm = event.target.value || '';

    // Clear existing debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Cancel any in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Don't fetch if search term is empty
    if (!searchTerm.trim()) {
      return;
    }

    // Debounce: wait 200ms before fetching
    debounceTimerRef.current = setTimeout(() => {
      // Create new AbortController for this request
      abortControllerRef.current = new AbortController();

      // Submit the search request
      void fetcher.submit(
        {q: searchTerm, limit: 5, predictive: true},
        {method: 'GET', action: SEARCH_ENDPOINT},
      );
    }, 200);
  }, [fetcher]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // ensure the passed input has a type of search, because SearchResults
  // will select the element based on the input
  useEffect(() => {
    inputRef?.current?.setAttribute('type', 'search');
  }, []);

  if (typeof children !== 'function') {
    return null;
  }

  return (
    <fetcher.Form {...props} className={className} onSubmit={goToSearch}>
      {children({inputRef, fetcher, fetchResults, goToSearch})}
    </fetcher.Form>
  );
}

/**
 * @typedef {(args: {
 *   fetchResults: (event: React.ChangeEvent<HTMLInputElement>) => void;
 *   goToSearch: () => void;
 *   inputRef: React.MutableRefObject<HTMLInputElement | null>;
 *   fetcher: Fetcher<PredictiveSearchReturn>;
 * }) => React.ReactNode} SearchFormPredictiveChildren
 */
/**
 * @typedef {Omit<FormProps, 'children'> & {
 *   children: SearchFormPredictiveChildren | null;
 * }} SearchFormPredictiveProps
 */

/** @typedef {import('react-router').FormProps} FormProps */
/** @template T @typedef {import('react-router').Fetcher<T>} Fetcher */
/** @typedef {import('~/lib/search').PredictiveSearchReturn} PredictiveSearchReturn */
