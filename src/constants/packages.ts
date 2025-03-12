import { User } from "@/db/auth/schema/user";
import Stripe from "stripe";

export const PACKAGES = {
  BASIC: "basic",
} as const;

export type Package = (typeof PACKAGES)[keyof typeof PACKAGES];

export const PACKAGES_DATA = (
  user: User
): Record<Package, Stripe.Checkout.SessionCreateParams.LineItem> => ({
  [PACKAGES.BASIC]: {
    price_data: {
      currency: "usd",
      product_data: {
        name: "Basic Plan",
        images: [
          // sample images
          "https://imgs.search.brave.com/_TzAQBr01Wop5N--emTUCD4iHbyjQNRjXkOMFjwIlgY/rs:fit:500:0:0:0/g:ce/aHR0cHM6Ly9jZG4t/ZnJvbnQuZnJlZXBp/ay5jb20vaW1hZ2Vz/L2FpL2ltYWdlLWdl/bmVyYXRvci9hZHZh/bnRhZ2VzL2ltYWdl/LWdlbmVyYXRvci1m/cmVlcGlrLTcud2Vi/cD93PTM4NDAmaD0x/OTIwJnE9NzU",
        ],
        metadata: {
          userId: user._id.toString(),
          name: user.name,
          email: user.email,
        },
      },
      unit_amount: 1000, // Monthly price in cents ($10.00 per month)
      recurring: {
        interval: "month", // Subscription is monthly
      },
    },
    quantity: 1,
  },
});

export const TRIAL_PERIOD_IN_DAYS = 1;
