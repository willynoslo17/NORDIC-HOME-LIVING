/** Per-store identity. This is the only checkout/webhook file that differs between the NORDIC-* repos. */
export const STORE = {
  slug: "nordic-home-living",
  brand: "Domheim",
  domain: "domheim.no",
  siteUrl: "https://domheim.no/",
  /** Catalog sector used by the Gelato/Printful endpoints (never taken from the query string). */
  sector: "home living",
} as const;
