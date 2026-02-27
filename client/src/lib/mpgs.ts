const MPGS_BASE_URL = "https://cbcmpgs.gateway.mastercard.com";

export function launchMpgsCheckout(sessionId: string): void {
  window.location.href = `${MPGS_BASE_URL}/checkout/pay/${sessionId}`;
}
