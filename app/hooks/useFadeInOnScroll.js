import {useEffect, useRef, useState} from 'react';
import {useLocation} from 'react-router';

/**
 * Hook that returns a ref and visibility state for fade-in animations
 * The element will fade in when it enters the viewport
 * Animation resets on route changes for consistent behavior across navigation
 * @param {Object} options - Intersection Observer options
 * @returns {[React.RefObject, boolean]} - [ref, isVisible]
 */
export function useFadeInOnScroll(options = {}) {
  const ref = useRef(null);
  const [isVisible, setIsVisible] = useState(false);
  const [hasBeenVisible, setHasBeenVisible] = useState(false);
  const location = useLocation();

  // Reset animation state when route changes
  useEffect(() => {
    setIsVisible(false);
    setHasBeenVisible(false);
  }, [location.pathname]);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    // If already been visible on this page, don't set up observer
    if (hasBeenVisible) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasBeenVisible) {
          setIsVisible(true);
          setHasBeenVisible(true);
          // Once visible, we can disconnect the observer
          observer.disconnect();
        }
      },
      {
        threshold: 0.1,
        rootMargin: '0px',
        ...options,
      }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [hasBeenVisible, options]);

  return [ref, isVisible];
}
