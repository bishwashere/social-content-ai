import { User } from "@prisma/client";
import Stripe from "stripe";

export const PACKAGES = {
  MONTHLY: "monthly",
  YEARLY: "yearly",
} as const;

export type Package = (typeof PACKAGES)[keyof typeof PACKAGES];

// Pricing constants
export const MONTHLY_PRICE = 4999; // $49.99 per month
export const YEARLY_PRICE = 47988; // $479.88 per year ($39.99/month equivalent, 20% off)
export const YEARLY_SAVINGS_PERCENT = 20;

export const PACKAGES_DATA = (
  user: User
): Record<Package, Stripe.Checkout.SessionCreateParams.LineItem> => ({
  [PACKAGES.MONTHLY]: {
    price_data: {
      currency: "usd",
      product_data: {
        name: "Premium Plan (Monthly)",
        images: [
          "https://imgs.search.brave.com/_TzAQBr01Wop5N--emTUCD4iHbyjQNRjXkOMFjwIlgY/rs:fit:500:0:0:0/g:ce/aHR0cHM6Ly9jZG4t/ZnJvbnQuZnJlZXBp/ay5jb20vaW1hZ2Vz/L2FpL2ltYWdlLWdl/bmVyYXRvci9hZHZh/bnRhZ2VzL2ltYWdl/LWdlbmVyYXRvci1m/cmVlcGlrLTcud2Vi/cD93PTM4NDAmaD0x/OTIwJnE9NzU",
        ],
        metadata: {
          userId: user.id,
          name: user.name,
          email: user.email,
        },
      },
      unit_amount: MONTHLY_PRICE,
      recurring: {
        interval: "month",
      },
    },
    quantity: 1,
  },
  [PACKAGES.YEARLY]: {
    price_data: {
      currency: "usd",
      product_data: {
        name: "Premium Plan (Yearly)",
        images: [
          "https://imgs.search.brave.com/_TzAQBr01Wop5N--emTUCD4iHbyjQNRjXkOMFjwIlgY/rs:fit:500:0:0:0/g:ce/aHR0cHM6Ly9jZG4t/ZnJvbnQuZnJlZXBp/ay5jb20vaW1hZ2Vz/L2FpL2ltYWdlLWdl/bmVyYXRvci9hZHZh/bnRhZ2VzL2ltYWdl/LWdlbmVyYXRvci1m/cmVlcGlrLTcud2Vi/cD93PTM4NDAmaD0x/OTIwJnE9NzU",
        ],
        metadata: {
          userId: user.id,
          name: user.name,
          email: user.email,
        },
      },
      unit_amount: YEARLY_PRICE,
      recurring: {
        interval: "year",
      },
    },
    quantity: 1,
  },
});
