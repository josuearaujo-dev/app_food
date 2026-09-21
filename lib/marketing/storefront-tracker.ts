import {
  pixelsToInstall,
  trackingHasPixels,
  type PixelInstallPlan,
  type PublicMarketingConfig,
} from "./marketing.schema";
import {
  createEventId,
  ga4EventName,
  ga4Items,
  metaCustomData,
  tiktokEventName,
  type StorefrontTrackEvent,
} from "./marketing-events";

type Fbq = ((...args: unknown[]) => void) & { callMethod?: (...args: unknown[]) => void; queue?: unknown[]; loaded?: boolean; version?: string };
type Gtag = (...args: unknown[]) => void;
type Ttq = { track: (...args: unknown[]) => void; page: () => void; identify?: (profile: Record<string, string>) => void; load?: (id: string) => void };

type TrackingUser = { email?: string; phone?: string };

declare global {
  interface Window {
    dataLayer?: unknown[];
    fbq?: Fbq;
    _fbq?: Fbq;
    gtag?: Gtag;
    ttq?: Ttq;
  }
}

const CONSENT_KEY = 'cadu-marketing-consent'

let activeConfig: PublicMarketingConfig | null = null;
let installedKey = "";
let userData: TrackingUser = {};

export function readStoredConsent(consentVersion: string): "unknown" | "granted" | "denied" {
  if (typeof window === "undefined") return "unknown";
  try {
    const raw = window.localStorage.getItem(CONSENT_KEY);
    if (!raw) return "unknown";
    const parsed = JSON.parse(raw) as { version?: string; value?: string };
    if (parsed.version !== consentVersion) return "unknown";
    if (parsed.value === "granted" || parsed.value === "denied") return parsed.value;
  } catch {
    return "unknown";
  }
  return "unknown";
}

export function storeConsent(consentVersion: string, value: "granted" | "denied") {
  window.localStorage.setItem(CONSENT_KEY, JSON.stringify({ version: consentVersion, value }));
}

export function setTrackingUser(next: TrackingUser) {
  userData = {
    email: next.email?.trim() || undefined,
    phone: next.phone?.trim() || undefined,
  };
}

export function initStorefrontTracking(config: PublicMarketingConfig) {
  activeConfig = config;
  const consent = config.requireStorefrontConsent ? readStoredConsent(config.consentVersion) : "granted";
  const plan = pixelsToInstall(config, consent);
  installPixels(plan, config);
}

function installKey(plan: PixelInstallPlan) {
  return [plan.gtm, plan.meta, plan.ga4, plan.ads, plan.adsLabel, plan.tiktok].join("|");
}

function installPixels(plan: PixelInstallPlan, config: PublicMarketingConfig) {
  if (typeof window === "undefined") return;
  if (!trackingHasPixels(plan)) return;
  const key = installKey(plan);
  if (installedKey === key) return;
  installedKey = key;

  if (plan.gtm) installGtm(plan.gtm);
  if (plan.meta) installMeta(plan.meta, config.enableAdvancedMatching);
  if (plan.ga4 || plan.ads) installGoogle(plan.ga4, plan.ads);
  if (plan.tiktok) installTiktok(plan.tiktok);
}

function appendScript(id: string, src?: string, inline?: string) {
  if (document.getElementById(id)) return;
  const script = document.createElement("script");
  script.id = id;
  script.async = true;
  if (src) script.src = src;
  if (inline) script.text = inline;
  document.head.appendChild(script);
}

function installGtm(containerId: string) {
  window.dataLayer = window.dataLayer ?? [];
  window.dataLayer.push({ "gtm.start": Date.now(), event: "gtm.js" });
  appendScript("gtm-js", `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(containerId)}`);
}

function installMeta(pixelId: string, advancedMatching: boolean) {
  if (window.fbq) {
    window.fbq("init", pixelId, advancedMatching ? matchingPayload() : undefined);
    return;
  }
  const fbq: Fbq = function fbqWrapper(...args: unknown[]) {
    if (fbq.callMethod) fbq.callMethod(...args);
    else (fbq.queue = fbq.queue ?? []).push(args);
  };
  fbq.loaded = true;
  fbq.version = "2.0";
  fbq.queue = [];
  window.fbq = fbq;
  window._fbq = fbq;
  appendScript("meta-pixel-sdk", "https://connect.facebook.net/en_US/fbevents.js");
  window.fbq("init", pixelId, advancedMatching ? matchingPayload() : undefined);
  if (!document.getElementById("meta-pixel-pageview")) {
    const img = document.createElement("img");
    img.id = "meta-pixel-pageview";
    img.alt = "";
    img.height = 1;
    img.width = 1;
    img.src = `https://www.facebook.com/tr?id=${encodeURIComponent(pixelId)}&ev=PageView&noscript=1`;
    img.style.display = "none";
    document.body.appendChild(img);
  }
}

function installGoogle(ga4: string | null, ads: string | null) {
  const primary = ga4 || ads;
  if (!primary) return;
  window.dataLayer = window.dataLayer ?? [];
  if (!window.gtag) {
    window.gtag = function gtag(...args: unknown[]) {
      window.dataLayer?.push(args);
    };
    appendScript("gtag-js", `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(primary)}`);
    window.gtag("js", new Date());
  }
  if (ga4) window.gtag?.("config", ga4, { send_page_view: false });
  if (ads) window.gtag?.("config", ads);
}

function installTiktok(pixelId: string) {
  if (window.ttq?.load) {
    window.ttq.load(pixelId);
    return;
  }
  const ttq = {
    load(id: string) {
      appendScript("tiktok-pixel", `https://analytics.tiktok.com/i18n/pixel/events.js?sdkid=${encodeURIComponent(id)}&lib=ttq`);
    },
    page() {},
    track() {},
  } satisfies Ttq;
  window.ttq = ttq;
  ttq.load(pixelId);
}

function matchingPayload() {
  const payload: Record<string, string> = {};
  if (userData.email) payload.em = userData.email.toLowerCase();
  if (userData.phone) payload.ph = userData.phone.replace(/\D/g, "");
  return Object.keys(payload).length ? payload : undefined;
}

function readBrowserIds() {
  if (typeof document === "undefined") return {};
  const cookies = document.cookie.split(";").map((part) => part.trim());
  const read = (name: string) => cookies.find((part) => part.startsWith(`${name}=`))?.slice(name.length + 1);
  return { fbp: read("_fbp"), fbc: read("_fbc") };
}

let pageViewSent = false;

export function trackPageViewOnce() {
  if (pageViewSent) return;
  pageViewSent = true;
  trackStorefrontEvent({ name: "PageView", eventId: createEventId(), currency: "USD" });
}

export function trackStorefrontEvent(event: StorefrontTrackEvent) {
  if (!activeConfig) return;
  const consent = activeConfig.requireStorefrontConsent ? readStoredConsent(activeConfig.consentVersion) : "granted";
  const plan = pixelsToInstall(activeConfig, consent);
  if (!trackingHasPixels(plan)) return;

  installPixels(plan, activeConfig);
  const metaData = metaCustomData(event);

  if (plan.meta && window.fbq) {
    if (event.name === "PageView") window.fbq("track", "PageView", {}, { eventID: event.eventId });
    else window.fbq("track", event.name, metaData, { eventID: event.eventId });
  }

  if ((plan.ga4 || plan.ads) && window.gtag) {
    window.gtag("event", ga4EventName(event.name), {
      currency: event.currency,
      value: metaData.value,
      transaction_id: event.orderId,
      items: ga4Items(event),
      event_id: event.eventId,
    });
    if (event.name === "Purchase" && plan.ads && plan.adsLabel) {
      window.gtag("event", "conversion", {
        send_to: `${plan.ads}/${plan.adsLabel}`,
        value: metaData.value,
        currency: event.currency,
        transaction_id: event.orderId,
      });
    }
  }

  if (plan.tiktok && window.ttq?.track) {
    if (event.name === "PageView") window.ttq.page();
    else window.ttq.track(tiktokEventName(event.name), {
      contents: (event.contents ?? []).map((item) => ({
        content_id: item.id,
        content_name: item.name,
        quantity: item.quantity,
        price: item.itemPriceCents / 100,
      })),
      value: metaData.value,
      currency: event.currency,
      event_id: event.eventId,
    });
  }

  window.dataLayer?.push({
    event: ga4EventName(event.name),
    event_id: event.eventId,
    ecommerce: {
      currency: event.currency,
      value: metaData.value,
      transaction_id: event.orderId,
      items: ga4Items(event),
    },
  });

  if (activeConfig.enableServerSide) {
    const ids = readBrowserIds();
    void fetch("/api/marketing/events", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: event.name,
        eventId: event.eventId,
        valueCents: event.valueCents,
        currency: event.currency,
        contents: event.contents,
        orderId: event.orderId,
        sourceUrl: window.location.href,
        email: activeConfig.enableAdvancedMatching ? userData.email : undefined,
        phone: activeConfig.enableAdvancedMatching ? userData.phone : undefined,
        fbp: ids.fbp,
        fbc: ids.fbc,
      }),
      keepalive: true,
    }).catch(() => undefined);
  }
}
