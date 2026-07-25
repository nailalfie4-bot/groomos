/**
 * The product's canonical public origin.
 *
 * Configurable via NEXT_PUBLIC_SITE_URL (set it in Vercel), defaulting to the
 * primary domain. Used for absolute URLs where no request is in hand — page
 * metadata (OpenGraph/canonical) and server-sent emails. Anywhere a request IS
 * available (Stripe success/cancel, deposit links, booking confirmations) the
 * code already derives the origin from the request, so preview deployments and
 * the live domain both stay correct automatically.
 */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://groomos.co.uk").replace(/\/+$/, "");

/** The bare host of the primary domain, e.g. "groomos.co.uk". */
export const SITE_HOST = SITE_URL.replace(/^https?:\/\//, "");

/** The legacy Vercel host we 301 to the primary domain (keeps old links alive). */
export const LEGACY_HOST = "groomos.vercel.app";
