/**
 * Persisted in localStorage (not sessionStorage) so we recognize returning browsers
 * after logout or days later.
 */

export const EVER_AUTHENTICATED_KEY = "nextpostai_ever_authenticated";
export const LANDING_VISIT_COUNT_KEY = "nextpostai_landing_visit_count";

/** After this many loads of the marketing landing, treat as returning (no urgency timer). */
export const RETURNING_LANDING_VISITS_THRESHOLD = 2;

export function markEverAuthenticated(): void {
  try {
    if (typeof window === "undefined") return;
    localStorage.setItem(EVER_AUTHENTICATED_KEY, "1");
  } catch {
    /* ignore quota / private mode */
  }
}

export function incrementLandingVisitCount(): number {
  try {
    if (typeof window === "undefined") return 0;
    const raw = localStorage.getItem(LANDING_VISIT_COUNT_KEY);
    const n = Math.min(9999, (parseInt(raw || "0", 10) || 0) + 1);
    localStorage.setItem(LANDING_VISIT_COUNT_KEY, String(n));
    return n;
  } catch {
    return 0;
  }
}

export function getLandingVisitCount(): number {
  try {
    if (typeof window === "undefined") return 0;
    return parseInt(localStorage.getItem(LANDING_VISIT_COUNT_KEY) || "0", 10) || 0;
  } catch {
    return 0;
  }
}

/**
 * Returning visitor: has signed in at least once on this browser (including after logout),
 * or has opened the landing page multiple times.
 */
export function isReturningVisitorForOffer(): boolean {
  try {
    if (typeof window === "undefined") return false;
    if (localStorage.getItem(EVER_AUTHENTICATED_KEY) === "1") return true;
    return getLandingVisitCount() >= RETURNING_LANDING_VISITS_THRESHOLD;
  } catch {
    return false;
  }
}

export const NEW_VISITOR_PRIMARY_CTA = "Start Free with 100 Posts";
export const RETURNING_VISITOR_PRIMARY_CTA = "Continue with Google";
