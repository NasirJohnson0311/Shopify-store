/**
 * Store Configuration
 *
 * STORE_IS_CLOSED: Set to true to show "Coming Soon" page, false to show the store
 *
 * This is the SINGLE SOURCE OF TRUTH for the store open/closed state.
 * Change this value here and it will update everywhere automatically.
 */
export const STORE_IS_CLOSED = true;

/**
 * LAUNCH_DATE: The date/time the countdown timer on the Coming Soon page counts down to.
 * Must be a format parseable by `new Date(...)`, e.g. '2026-09-01T09:00:00-04:00'.
 * Include a timezone offset so the countdown is the same for every visitor regardless of their local timezone.
 */
export const LAUNCH_DATE = '2026-08-21T12:00:00-06:00';
