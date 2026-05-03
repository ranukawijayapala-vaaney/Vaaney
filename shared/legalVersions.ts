export const LEGAL_DOCUMENT_VERSIONS = {
  privacy: "1.0.0",
  buyer_product_terms: "1.0.0",
  buyer_service_terms: "1.0.0",
  supplier_product_agreement: "1.0.0",
  supplier_service_agreement: "1.0.0",
} as const;

export type LegalDocumentType = keyof typeof LEGAL_DOCUMENT_VERSIONS;

export const LEGAL_DOCUMENT_PATHS: Record<LegalDocumentType, string> = {
  privacy: "/legal/privacy",
  buyer_product_terms: "/legal/buyer-products",
  buyer_service_terms: "/legal/buyer-services",
  supplier_product_agreement: "/legal/seller-products",
  supplier_service_agreement: "/legal/seller-services",
};

export const LEGAL_DOCUMENT_TITLES: Record<LegalDocumentType, string> = {
  privacy: "Privacy Policy",
  buyer_product_terms: "Buyer Product Purchase Terms",
  buyer_service_terms: "Buyer Service Booking Terms",
  supplier_product_agreement: "Product Supplier Agreement",
  supplier_service_agreement: "Service Supplier Agreement",
};

export function requiredConsentsForRole(
  role: string | null | undefined,
): LegalDocumentType[] {
  if (role === "buyer") {
    return ["privacy", "buyer_product_terms", "buyer_service_terms"];
  }
  if (role === "seller") {
    return ["privacy", "supplier_product_agreement", "supplier_service_agreement"];
  }
  return [];
}

export const LEGAL_DOCUMENT_TYPES = Object.keys(
  LEGAL_DOCUMENT_VERSIONS,
) as LegalDocumentType[];
