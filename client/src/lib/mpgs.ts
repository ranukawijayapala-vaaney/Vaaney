const MPGS_CHECKOUT_URL = "https://cbcmpgs.gateway.mastercard.com/static/checkout/checkout.min.js";

let scriptLoaded = false;
let scriptLoading: Promise<void> | null = null;

function loadMpgsScript(): Promise<void> {
  if (scriptLoaded) return Promise.resolve();
  if (scriptLoading) return scriptLoading;

  scriptLoading = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector(`script[src="${MPGS_CHECKOUT_URL}"]`);
    if (existing) {
      scriptLoaded = true;
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = MPGS_CHECKOUT_URL;
    script.async = true;
    script.onload = () => {
      scriptLoaded = true;
      resolve();
    };
    script.onerror = () => {
      scriptLoading = null;
      reject(new Error("Failed to load MPGS checkout script"));
    };
    document.head.appendChild(script);
  });

  return scriptLoading;
}

declare global {
  interface Window {
    Checkout?: {
      configure: (config: any) => void;
      showPaymentPage: () => void;
    };
  }
}

export async function launchMpgsCheckout(sessionId: string): Promise<void> {
  await loadMpgsScript();

  if (!window.Checkout) {
    throw new Error("MPGS Checkout not available");
  }

  window.Checkout.configure({
    session: { id: sessionId },
  });

  window.Checkout.showPaymentPage();
}
