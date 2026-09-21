"use client";

import { useEffect, useState } from "react";
import type { PublicMarketingConfig } from "./marketing.schema";
import {
  initStorefrontTracking,
  readStoredConsent,
  storeConsent,
  trackPageViewOnce,
} from "./storefront-tracker";

export function StorefrontTracking({
  config,
  locale = "pt",
}: {
  config: PublicMarketingConfig;
  locale?: "pt" | "en";
}) {
  const [consent, setConsent] = useState<"unknown" | "granted" | "denied">("granted");

  useEffect(() => {
    const current = config.requireStorefrontConsent ? readStoredConsent(config.consentVersion) : "granted";
    setConsent(current);
    initStorefrontTracking(config);
    if (!config.requireStorefrontConsent || current === "granted") {
      trackPageViewOnce();
    }
  }, [config]);

  if (!config.requireStorefrontConsent || consent !== "unknown") return null;

  const copy = locale === "en"
    ? {
      text: "We use measurement and marketing tags to understand the menu, products, and checkout. Your order still works if you decline.",
      accept: "Allow tracking",
      deny: "Decline",
    }
    : {
      text: "Usamos tags de medição e marketing para entender o cardápio, os produtos e o checkout. O pedido funciona mesmo se você recusar.",
      accept: "Permitir rastreio",
      deny: "Recusar",
    };

  return (
    <div className="marketing-consent" role="dialog" aria-label="Consentimento de marketing">
      <p>{copy.text}</p>
      <div>
        <button
          onClick={() => {
            storeConsent(config.consentVersion, "denied");
            setConsent("denied");
          }}
          type="button"
        >
          {copy.deny}
        </button>
        <button
          className="is-primary"
          onClick={() => {
            storeConsent(config.consentVersion, "granted");
            setConsent("granted");
            initStorefrontTracking(config);
            trackPageViewOnce();
          }}
          type="button"
        >
          {copy.accept}
        </button>
      </div>
    </div>
  );
}
