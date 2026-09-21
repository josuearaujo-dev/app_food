export const STOREFRONT_TRACK_EVENTS = [
  "PageView",
  "ViewContent",
  "AddToCart",
  "InitiateCheckout",
  "AddPaymentInfo",
  "Purchase",
] as const;

export type StorefrontTrackEventName = (typeof STOREFRONT_TRACK_EVENTS)[number];

export type TrackedContent = {
  id: string;
  name?: string;
  quantity: number;
  itemPriceCents: number;
  variantId?: string;
};

export type StorefrontTrackEvent = {
  name: StorefrontTrackEventName;
  eventId: string;
  valueCents?: number;
  currency: "USD";
  contents?: TrackedContent[];
  orderId?: string;
};

export function centsToUsd(cents: number) {
  return Math.round(cents) / 100;
}

export function createEventId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `evt_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export function contentsFromCartItems(
  items: Array<{ productId: string; quantity: number; price: number; name?: string; variantId?: string }>,
): TrackedContent[] {
  return items.map((item) => ({
    id: item.productId,
    name: item.name,
    quantity: item.quantity,
    itemPriceCents: item.price,
    variantId: item.variantId,
  }));
}

export function viewContentEvent(product: {
  id: string;
  name: string;
  priceCents: number;
  variantId?: string;
}): StorefrontTrackEvent {
  return {
    name: "ViewContent",
    eventId: createEventId(),
    currency: "USD",
    valueCents: product.priceCents,
    contents: [{
      id: product.id,
      name: product.name,
      quantity: 1,
      itemPriceCents: product.priceCents,
      variantId: product.variantId,
    }],
  };
}

export function cartEvent(
  name: Extract<StorefrontTrackEventName, "AddToCart" | "InitiateCheckout" | "AddPaymentInfo" | "Purchase">,
  items: TrackedContent[],
  valueCents: number,
  orderId?: string,
): StorefrontTrackEvent {
  return {
    name,
    eventId: createEventId(),
    currency: "USD",
    valueCents,
    contents: items,
    orderId,
  };
}

export function metaCustomData(event: StorefrontTrackEvent) {
  const contents = (event.contents ?? []).map((item) => ({
    id: item.id,
    quantity: item.quantity,
    item_price: centsToUsd(item.itemPriceCents),
  }));
  return {
    currency: event.currency,
    value: centsToUsd(event.valueCents ?? 0),
    contents,
    content_ids: contents.map((item) => item.id),
    content_type: "product" as const,
    content_name: event.contents?.[0]?.name,
    num_items: contents.reduce((total, item) => total + item.quantity, 0),
    order_id: event.orderId,
  };
}

export function ga4EventName(name: StorefrontTrackEventName) {
  switch (name) {
    case "PageView":
      return "page_view";
    case "ViewContent":
      return "view_item";
    case "AddToCart":
      return "add_to_cart";
    case "InitiateCheckout":
      return "begin_checkout";
    case "AddPaymentInfo":
      return "add_payment_info";
    case "Purchase":
      return "purchase";
  }
}

export function tiktokEventName(name: StorefrontTrackEventName) {
  return name === "Purchase" ? "CompletePayment" : name === "PageView" ? "Pageview" : name;
}

export function ga4Items(event: StorefrontTrackEvent) {
  return (event.contents ?? []).map((item) => ({
    item_id: item.id,
    item_name: item.name,
    quantity: item.quantity,
    price: centsToUsd(item.itemPriceCents),
  }));
}
