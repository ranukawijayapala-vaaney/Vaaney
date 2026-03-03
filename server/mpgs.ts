const MPGS_BASE_URL = process.env.MPGS_BASE_URL || "https://cbcmpgs.gateway.mastercard.com";
const MPGS_API_VERSION = process.env.MPGS_API_VERSION || "61";
const MPGS_MERCHANT_ID = process.env.MPGS_MERCHANT_ID || "";
const MPGS_API_PASSWORD = process.env.MPGS_API_PASSWORD || "";

function getAuthHeader(): string {
  const username = `merchant.${MPGS_MERCHANT_ID}`;
  const credentials = Buffer.from(`${username}:${MPGS_API_PASSWORD}`).toString("base64");
  return `Basic ${credentials}`;
}

function getApiUrl(path: string): string {
  return `${MPGS_BASE_URL}/api/rest/version/${MPGS_API_VERSION}/merchant/${MPGS_MERCHANT_ID}${path}`;
}

export interface MpgsCheckoutSession {
  sessionId: string;
  successIndicator: string;
}

export interface MpgsSessionConfig {
  amount: string;
  currency: string;
  orderId: string;
  returnUrl: string;
  createdAt: number;
}

const sessionConfigStore = new Map<string, MpgsSessionConfig>();

const SESSION_CONFIG_TTL = 30 * 60 * 1000;

export function storeSessionConfig(sessionId: string, config: MpgsSessionConfig): void {
  sessionConfigStore.set(sessionId, config);
  setTimeout(() => sessionConfigStore.delete(sessionId), SESSION_CONFIG_TTL);
}

export function getSessionConfig(sessionId: string): MpgsSessionConfig | undefined {
  return sessionConfigStore.get(sessionId);
}

export async function createCheckoutSession(
  orderId: string,
  amount: string,
  currency: string,
  description: string,
  returnUrl: string
): Promise<MpgsCheckoutSession> {
  const url = getApiUrl("/session");

  const body: any = {
    apiOperation: "CREATE_CHECKOUT_SESSION",
    order: {
      id: orderId,
      amount: amount,
      currency: currency,
    },
    interaction: {
      operation: "PURCHASE",
      returnUrl: returnUrl,
      merchant: {
        name: "Vaaney",
      },
    },
  };

  console.log(`[MPGS] Creating checkout session for order ${orderId}, amount: ${amount} ${currency}`);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: getAuthHeader(),
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[MPGS] Failed to create checkout session: ${response.status} ${errorText}`);
    throw new Error(`MPGS session creation failed: ${response.status}`);
  }

  const data = await response.json();

  if (data.result !== "SUCCESS") {
    console.error(`[MPGS] Session creation returned non-success result:`, data);
    throw new Error(`MPGS session creation failed: ${data.result}`);
  }

  console.log(`[MPGS] Checkout session created: ${data.session.id}`);

  const sessionId = data.session.id;
  const updateUrl = getApiUrl(`/session/${sessionId}`);
  const updateResponse = await fetch(updateUrl, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: getAuthHeader(),
    },
    body: JSON.stringify({
      order: { description: description },
    }),
  });

  if (!updateResponse.ok) {
    const updateError = await updateResponse.text();
    console.warn(`[MPGS] Failed to update session with description: ${updateResponse.status} ${updateError}`);
  } else {
    console.log(`[MPGS] Session updated with order description`);
  }

  return {
    sessionId,
    successIndicator: data.successIndicator,
  };
}

export interface MpgsOrderDetails {
  id: string;
  result: string;
  status: string;
  totalAuthorizedAmount: number;
  totalCapturedAmount: number;
  totalRefundedAmount: number;
  currency: string;
  amount: number;
  gatewayCode?: string;
}

export async function retrieveOrder(orderId: string): Promise<MpgsOrderDetails> {
  const url = getApiUrl(`/order/${orderId}`);

  console.log(`[MPGS] Retrieving order ${orderId}`);

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: getAuthHeader(),
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[MPGS] Failed to retrieve order: ${response.status} ${errorText}`);
    throw new Error(`MPGS order retrieval failed: ${response.status}`);
  }

  const data = await response.json();

  return {
    id: data.id,
    result: data.result,
    status: data.status,
    totalAuthorizedAmount: data.totalAuthorizedAmount || 0,
    totalCapturedAmount: data.totalCapturedAmount || 0,
    totalRefundedAmount: data.totalRefundedAmount || 0,
    currency: data.currency || "USD",
    amount: data.amount || 0,
    gatewayCode: data.response?.gatewayCode,
  };
}

export function getMpgsCheckoutJsUrl(): string {
  return `${MPGS_BASE_URL}/checkout/version/61/checkout.js`;
}

export function getMpgsMerchantId(): string {
  return MPGS_MERCHANT_ID;
}
