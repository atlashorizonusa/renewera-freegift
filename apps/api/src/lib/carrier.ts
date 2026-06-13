// Auto-detect carrier from a tracking number, return label + URL.

export interface CarrierInfo {
  carrier: string;
  tracking_url: string;
}

export function detectCarrier(tracking: string): CarrierInfo {
  let t = tracking.trim().toUpperCase().replace(/[\s-]/g, "");

  // UPS — 1Z…
  if (t.startsWith("1Z")) {
    return {
      carrier: "UPS",
      tracking_url: `https://www.ups.com/track?tracknum=${encodeURIComponent(t)}`,
    };
  }

  // USPS IMpb full label barcode: "420" + ZIP5 (or ZIP+4 = 9 digits) +
  // the real tracking number. Shipping labels print this long form, so
  // strip the routing prefix down to the actual trackable number.
  //   e.g. 420 62812 2838 9400130109355374900962
  //         └ZIP┘└+4 ┘ └──── real USPS tracking ────┘
  const impb = t.match(/^420\d{5}(?:\d{4})?(9\d{21}|\d{20,22})$/);
  if (impb && impb[1]) {
    t = impb[1];
  }

  // USPS — 20–22 digit (IMpb, commonly starts 92/93/94/95) or S10
  // international (2 letters + 9 digits + "US").
  if (/^9\d{19,21}$/.test(t) || /^\d{20,22}$/.test(t) || /^[A-Z]{2}\d{9}US$/.test(t)) {
    return {
      carrier: "USPS",
      tracking_url: `https://tools.usps.com/go/TrackConfirmAction?tLabels=${encodeURIComponent(t)}`,
    };
  }

  // FedEx — 12 or 15 digit
  if (/^\d{12}$/.test(t) || /^\d{15}$/.test(t)) {
    return {
      carrier: "FedEx",
      tracking_url: `https://www.fedex.com/fedextrack/?trknbr=${encodeURIComponent(t)}`,
    };
  }

  // DHL — 10–11 digit
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
