#!/bin/bash
# Stripe CLI listen script - downloads Stripe CLI if needed and forwards webhooks to localhost
# Use this when `stripe` command is not found (Stripe CLI not installed via Homebrew)

set -e
STRIPE_VERSION="1.35.0"
STRIPE_DIR="$(cd "$(dirname "$0")/.." && pwd)/.stripe-cli"
STRIPE_BIN="$STRIPE_DIR/stripe"
ARCH=$(uname -m)
[ "$ARCH" = "arm64" ] && ARCH_STR="arm64" || ARCH_STR="x86_64"
TARBALL="stripe_${STRIPE_VERSION}_mac-os_${ARCH_STR}.tar.gz"
DOWNLOAD_URL="https://github.com/stripe/stripe-cli/releases/download/v${STRIPE_VERSION}/${TARBALL}"

if [ ! -f "$STRIPE_BIN" ]; then
  echo "Downloading Stripe CLI v${STRIPE_VERSION}..."
  mkdir -p "$STRIPE_DIR"
  curl -sL "$DOWNLOAD_URL" -o "$STRIPE_DIR/$TARBALL"
  tar -xzf "$STRIPE_DIR/$TARBALL" -C "$STRIPE_DIR"
  rm "$STRIPE_DIR/$TARBALL"
  echo "Stripe CLI installed to $STRIPE_DIR"
fi

# Login on first run (creates ~/.config/stripe/config.toml)
if [ ! -f "$HOME/.config/stripe/config.toml" ]; then
  echo "First run: Logging in to Stripe (opens browser)..."
  "$STRIPE_BIN" login
fi

echo "Forwarding Stripe webhooks to localhost:3000/api/payment/stripe-webhook"
echo "Use the webhook signing secret shown below in your .env as STRIPE_WEBHOOK_SECRET"
echo ""
"$STRIPE_BIN" listen --forward-to localhost:3000/api/payment/stripe-webhook
