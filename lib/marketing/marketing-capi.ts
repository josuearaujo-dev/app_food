import { createHash } from "node:crypto";
import { centsToUsd, metaCustomData, tiktokEventName, type StorefrontTrackEvent } from "./marketing-events";

export function hashIdentifier(value: string | undefined) {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) return undefined;
  return createHash("sha256").update(normalized).digest("hex");
}

export function hashPhone(value: string | undefined) {
  const digits = value?.replace(/\D/g, "");
  if (!digits) return undefined;
  return createHash("sha256").update(digits).digest("hex");
}

export async function sendMetaCapiEvent(input: {
  pixelId: string;
  accessToken: string;
  event: StorefrontTrackEvent;
  sourceUrl?: string;
  email?: string;
  phone?: string;
  clientIp?: string | null;
  userAgent?: string | null;
  fbp?: string;
  fbc?: string;
}) {
  const customData = metaCustomData(input.event);
  const payload = {
    data: [{
      event_name: input.event.name,
      event_time: Math.floor(Date.now() / 1000),
      event_id: input.event.eventId,
      event_source_url: input.sourceUrl,
      action_source: "website",
      user_data: {
        client_ip_address: input.clientIp || undefined,
        client_user_agent: input.userAgent || undefined,
        em: hashIdentifier(input.email) ? [hashIdentifier(input.email)] : undefined,
        ph: hashPhone(input.phone) ? [hashPhone(input.phone)] : undefined,
        fbp: input.fbp,
        fbc: input.fbc,
      },
      custom_data: {
        currency: customData.currency,
        value: customData.value,
        contents: customData.contents,
        content_ids: customData.content_ids,
        content_type: customData.content_type,
        content_name: customData.content_name,
        num_items: customData.num_items,
        order_id: customData.order_id,
      },
    }],
  };

  const response = await fetch(`https://graph.facebook.com/v21.0/${encodeURIComponent(input.pixelId)}/events?access_token=${encodeURIComponent(input.accessToken)}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  return response.ok;
}

export async function sendTiktokEvent(input: {
  pixelId: string;
  accessToken: string;
  event: StorefrontTrackEvent;
  sourceUrl?: string;
  email?: string;
  phone?: string;
  clientIp?: string | null;
  userAgent?: string | null;
}) {
  const payload = {
    event_source: "web",
    event_source_id: input.pixelId,
    data: [{
      event: tiktokEventName(input.event.name),
      event_time: Math.floor(Date.now() / 1000),
      event_id: input.event.eventId,
      user: {
        email: hashIdentifier(input.email),
        phone: hashPhone(input.phone),
        ip: input.clientIp || undefined,
        user_agent: input.userAgent || undefined,
      },
      page: { url: input.sourceUrl },
      properties: {
        currency: input.event.currency,
        value: centsToUsd(input.event.valueCents ?? 0),
        order_id: input.event.orderId,
        contents: (input.event.contents ?? []).map((item) => ({
          content_id: item.id,
          content_name: item.name,
          quantity: item.quantity,
          price: centsToUsd(item.itemPriceCents),
        })),
      },
    }],
  };

  const response = await fetch("https://business-api.tiktok.com/open_api/v1.3/event/track/", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "access-token": input.accessToken,
    },
    body: JSON.stringify(payload),
  });
  return response.ok;
}
