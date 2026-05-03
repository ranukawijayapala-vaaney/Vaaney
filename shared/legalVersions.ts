export const LEGAL_DOCUMENT_VERSIONS = {
  privacy: "1.0.0",
  buyer_product_terms: "1.0.0",
  buyer_service_terms: "1.0.0",
  supplier_product_agreement: "1.0.0",
  supplier_service_agreement: "1.0.0",
  terms_of_service: "1.0.0",
  prohibited_items: "1.0.0",
  cookies: "1.0.0",
  returns_refunds: "1.0.0",
  shipping_customs: "1.0.0",
} as const;

export type LegalDocumentType = keyof typeof LEGAL_DOCUMENT_VERSIONS;

export const LEGAL_DOCUMENT_PATHS: Record<LegalDocumentType, string> = {
  privacy: "/legal/privacy",
  buyer_product_terms: "/legal/buyer-products",
  buyer_service_terms: "/legal/buyer-services",
  supplier_product_agreement: "/legal/seller-products",
  supplier_service_agreement: "/legal/seller-services",
  terms_of_service: "/legal/terms",
  prohibited_items: "/legal/prohibited-items",
  cookies: "/legal/cookies",
  returns_refunds: "/legal/returns-refunds",
  shipping_customs: "/legal/shipping-customs",
};

export const LEGAL_DOCUMENT_TITLES: Record<LegalDocumentType, string> = {
  privacy: "Privacy Policy",
  buyer_product_terms: "Buyer Product Purchase Terms",
  buyer_service_terms: "Buyer Service Booking Terms",
  supplier_product_agreement: "Product Supplier Agreement",
  supplier_service_agreement: "Service Supplier Agreement",
  terms_of_service: "Terms of Service",
  prohibited_items: "Prohibited & Restricted Items Policy",
  cookies: "Cookie Policy",
  returns_refunds: "Returns & Refunds Policy",
  shipping_customs: "Shipping & Customs Policy",
};

export function requiredConsentsForRole(
  role: string | null | undefined,
): LegalDocumentType[] {
  if (role === "buyer") {
    return ["privacy", "terms_of_service", "buyer_product_terms", "buyer_service_terms"];
  }
  if (role === "seller") {
    return ["privacy", "terms_of_service", "supplier_product_agreement", "supplier_service_agreement"];
  }
  return [];
}

export const LEGAL_DOCUMENT_TYPES = Object.keys(
  LEGAL_DOCUMENT_VERSIONS,
) as LegalDocumentType[];
