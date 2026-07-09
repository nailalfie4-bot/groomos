/**
 * One-off: create the GroomOS subscription products + monthly GBP prices in
 * Stripe, then print the price-id env vars to paste into Vercel.
 *
 *   STRIPE_SECRET_KEY=sk_live_xxx node scripts/stripe-setup.mjs
 *
 * Uses a lookup_key per plan, so re-running is safe (it reuses existing prices
 * rather than creating duplicates). The mode (live vs test) is whatever the
 * secret key you pass is — use your LIVE key to create live products.
 */
import Stripe from "stripe";

const key = process.env.STRIPE_SECRET_KEY;
if (!key) {
  console.error("Set STRIPE_SECRET_KEY first, e.g. STRIPE_SECRET_KEY=sk_live_… node scripts/stripe-setup.mjs");
  process.exit(1);
}
const stripe = new Stripe(key);
const mode = key.startsWith("sk_live") ? "LIVE" : "TEST";

const PLANS = [
  { plan: "starter", name: "GroomOS Starter", amount: 2900 },
  { plan: "pro", name: "GroomOS Pro", amount: 3900 },
  { plan: "team", name: "GroomOS Team", amount: 5900 },
];

console.log(`Creating GroomOS plans in ${mode} mode…\n`);
const envLines = [];

for (const { plan, name, amount } of PLANS) {
  const lookupKey = `groomos_${plan}_monthly`;
  let price = (await stripe.prices.list({ lookup_keys: [lookupKey], active: true, limit: 1 })).data[0];

  if (price) {
    console.log(`• ${name}: reused existing price ${price.id}`);
  } else {
    const product = await stripe.products.create({ name, metadata: { groomos_plan: plan } });
    price = await stripe.prices.create({
      product: product.id,
      unit_amount: amount,
      currency: "gbp",
      recurring: { interval: "month" },
      lookup_key: lookupKey,
      metadata: { groomos_plan: plan },
    });
    console.log(`• ${name}: created £${(amount / 100).toFixed(0)}/mo → ${price.id}`);
  }
  envLines.push(`STRIPE_PRICE_${plan.toUpperCase()}=${price.id}`);
}

console.log(`\nAdd these to Vercel (Production + Preview) env vars:\n`);
console.log(envLines.join("\n"));
