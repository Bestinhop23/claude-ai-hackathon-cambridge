export const TIERS = {
  basic: {
    name: "Basic",
    price: 0,
    price_id: null,
    product_id: null,
    features: [
      "Real-time stock prices",
      "Basic market overview",
      "Stock search",
    ],
  },
  premium: {
    name: "Premium",
    price: 4.99,
    price_id: "price_1T9qaQ2SLtCL4tPr97cwwjgN",
    product_id: "prod_U86oEGng7Ihmxu",
    features: [
      "Everything in Basic",
      "Trading signals & volume analysis",
      "Government filings",
      "Bonds & commodities data",
      "News sentiment analysis",
    ],
  },
  unlimited: {
    name: "Unlimited",
    price: 14.99,
    price_id: "price_1T9qat2SLtCL4tPrXrWH2SLt",
    product_id: "prod_U86oK44bxJxmju",
    features: [
      "Everything in Premium",
      "ML-based long-term predictions",
      "Deep AI stock analysis",
      "Prediction markets",
      "Priority support",
    ],
  },
} as const;

export type TierKey = keyof typeof TIERS;

export function getTierFromProductId(productId: string | null): TierKey {
  if (!productId) return "basic";
  if (productId === TIERS.premium.product_id) return "premium";
  if (productId === TIERS.unlimited.product_id) return "unlimited";
  return "basic";
}

export function hasAccess(userTier: TierKey, requiredTier: TierKey): boolean {
  const order: TierKey[] = ["basic", "premium", "unlimited"];
  return order.indexOf(userTier) >= order.indexOf(requiredTier);
}
