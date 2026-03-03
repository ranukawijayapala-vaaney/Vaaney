export function launchMpgsCheckout(sessionId: string, type?: string): void {
  const params = new URLSearchParams({ sessionId });
  if (type) params.set("type", type);
  window.location.href = `/payment-processing?${params.toString()}`;
}
