export function launchMpgsCheckout(sessionId: string, type?: string, ref?: string): void {
  const params = new URLSearchParams({ sessionId });
  if (type) params.set("type", type);
  if (ref) params.set("ref", ref);
  window.location.href = `/payment-processing?${params.toString()}`;
}
