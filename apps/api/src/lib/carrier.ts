// Auto-detect carrier from a tracking number, return label + URL.

export interface CarrierInfo {
  carrier: string;
  tracking_url: string;
}

export function detectCarrier(tracking: string): CarrierInfo {
  const t = tracking.trim().toUpperCase();

  if (t.startsWith("1Z")) {
    return {
      carrier: "UPS",
      tracking_url: `https://www.ups.com/track?tracknum=${encodeURIComponent(t)}`,
    };
  }

  if (/^\d{20,22}$/.test(t) || /^9\d+$/.test(t)) {
    return {
      carrier: "USPS",
      tracking_url: `https://tools.usps.com/go/TrackConfirmAction?tLabels=${encodeURIComponent(t)}`,
    };
  }

  if (/^\d{12,15}$/.test(t)) {
    return {
      carrier: "FedEx",
      tracking_url: `https://www.fedex.com/fedextrack/?trknbr=${encodeURIComponent(t)}`,
    };
  }

  if (/^\d{10,11}$/.test(t)) {
    return {
      carrier: "DHL",
      tracking_url: `https://www.dhl.com/en/express/tracking.html?AWB=${encodeURIComponent(t)}`,
    };
  }

  return {
    carrier: "Unknown",
    tracking_url: `https://www.google.com/search?q=${encodeURIComponent(t + " tracking")}`,
  };
}
