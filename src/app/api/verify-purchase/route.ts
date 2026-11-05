import { NextResponse } from "next/server";

export const runtime = "nodejs";

type ShopifyOrder = {
  id: number;
  name: string;
  email: string | null;
  contact_email?: string | null;
  financial_status: string;
  cancelled_at: string | null;
  line_items?: Array<{ title?: string; vendor?: string; sku?: string; name?: string }>;
  tags?: string;
};

const PAID = new Set(["paid", "partially_paid", "authorized"]);

function normalizeOrderNumber(input: string): string {
  return input.trim().replace(/^#/, "");
}

function emailsMatch(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

function looksLikeShinnoKit(order: ShopifyOrder): boolean {
  const needle = (process.env.SHOPIFY_PRODUCT_NEEDLE ?? "shinno").toLowerCase();
  if (!needle) return true;
  const tags = (order.tags ?? "").toLowerCase();
  if (tags.includes(needle)) return true;
  for (const item of order.line_items ?? []) {
    const blob = [item.title, item.name, item.vendor, item.sku].filter(Boolean).join(" ").toLowerCase();
    if (blob.includes(needle)) return true;
  }
  // If the shop is Shinno-only, still accept paid orders with no matching line text.
  return (order.line_items ?? []).length === 0;
}

async function fetchShopifyOrders(orderNumber: string): Promise<ShopifyOrder[]> {
  const shop = (process.env.SHOPIFY_SHOP_DOMAIN ?? "").replace(/^https?:\/\//, "").replace(/\/$/, "");
  const token = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN ?? "";
  if (!shop || !token) {
    throw new Error("Shopify is not configured on the server.");
  }

  const url = new URL(`https://${shop}/admin/api/2024-10/orders.json`);
  url.searchParams.set("status", "any");
  url.searchParams.set("name", orderNumber);
  url.searchParams.set("limit", "5");

  const res = await fetch(url, {
    headers: {
      "X-Shopify-Access-Token": token,
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Shopify lookup failed (${res.status}). ${text.slice(0, 120)}`);
  }

  const data = (await res.json()) as { orders?: ShopifyOrder[] };
  return data.orders ?? [];
}

function reviewBypass(orderNumber: string, email: string): boolean {
  const reviewOrder = (process.env.APP_REVIEW_ORDER ?? "").trim().replace(/^#/, "");
  const reviewEmail = (process.env.APP_REVIEW_EMAIL ?? "").trim().toLowerCase();
  if (!reviewOrder || !reviewEmail) return false;
  return orderNumber === reviewOrder && email.trim().toLowerCase() === reviewEmail;
}

export async function POST(request: Request) {
  let body: { orderNumber?: string; email?: string };
  try {
    body = (await request.json()) as { orderNumber?: string; email?: string };
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  const orderNumber = normalizeOrderNumber(String(body.orderNumber ?? ""));
  const email = String(body.email ?? "").trim();

  if (!orderNumber || !email || !email.includes("@")) {
    return NextResponse.json(
      { ok: false, error: "Enter your Shopify order number and the email used at checkout." },
      { status: 400 },
    );
  }

  // App Review / support unlock — set APP_REVIEW_ORDER + APP_REVIEW_EMAIL in env.
  if (reviewBypass(orderNumber, email)) {
    return NextResponse.json({
      ok: true,
      orderName: `#${orderNumber}`,
      email: email.toLowerCase(),
      review: true,
    });
  }

  try {
    const orders = await fetchShopifyOrders(orderNumber);
    const match = orders.find((order) => {
      const orderEmail = order.email || order.contact_email || "";
      if (!emailsMatch(orderEmail, email)) return false;
      if (order.cancelled_at) return false;
      if (!PAID.has(order.financial_status)) return false;
      return looksLikeShinnoKit(order);
    });

    if (!match) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "No matching paid Shinno order found. Check the order number and the email from your Shopify receipt.",
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      ok: true,
      orderName: match.name,
      email: (match.email || match.contact_email || email).toLowerCase(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Verification failed.";
    const status = message.includes("not configured") ? 503 : 502;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
