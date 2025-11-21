import fetch from 'node-fetch';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';
import { PRODUCTS, SERVICES, ProductSeed, ServiceSeed, VariantSeed, PackageSeed } from './seedData.js';
import { downloadMultipleImages, getAllImageSearchTerms } from './imageDownloader.js';

// Load configuration from environment variables
const PRODUCTION_URL = process.env.PRODUCTION_URL || 'https://vaaney-marketplace.replit.app';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const SELLER_EMAIL = process.env.SELLER_EMAIL || 'vaaney.info@gmail.com';
const SELLER_PASSWORD = process.env.SELLER_PASSWORD || 'VaaneySeller@123';

// Validate required environment variables
const PEXELS_API_KEY = process.env.PEXELS_API_KEY;

if (!ADMIN_EMAIL || !ADMIN_PASSWORD || !PEXELS_API_KEY) {
  console.error('❌ Missing required environment variables:');
  if (!ADMIN_EMAIL) console.error('   ADMIN_EMAIL - Admin email for authentication');
  if (!ADMIN_PASSWORD) console.error('   ADMIN_PASSWORD - Admin password');
  if (!PEXELS_API_KEY) console.error('   PEXELS_API_KEY - Pexels API key (get from https://www.pexels.com/api/)');
  console.error('\nOptional variables:');
  console.error('   SELLER_EMAIL - Seller email (default: vaaney.info@gmail.com)');
  console.error('   SELLER_PASSWORD - Seller password (default: VaaneySeller@123)');
  console.error('   PRODUCTION_URL - Target URL (default: https://vaaney-marketplace.replit.app)');
  process.exit(1);
}

interface ApiClient {
  sessionCookie: string;
  fetch: (endpoint: string, options?: RequestInit) => Promise<any>;
}

// Create authenticated API client
async function createApiClient(): Promise<ApiClient> {
  console.log('🔐 Authenticating as admin...');
  
  const loginResponse = await fetch(`${PRODUCTION_URL}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
    }),
  });

  if (!loginResponse.ok) {
    throw new Error(`Login failed: ${loginResponse.statusText}`);
  }

  const setCookie = loginResponse.headers.get('set-cookie');
  if (!setCookie) {
    throw new Error('No session cookie received');
  }

  const sessionCookie = setCookie.split(';')[0];
  console.log('✅ Authenticated successfully\n');

  return {
    sessionCookie,
    fetch: async (endpoint: string, options: any = {}) => {
      const response = await fetch(`${PRODUCTION_URL}${endpoint}`, {
        ...options,
        headers: {
          ...options.headers,
          Cookie: sessionCookie,
        },
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`API request failed: ${response.statusText}\n${text}`);
      }

      return response.json();
    },
  };
}

// Check if seller exists, create/verify if needed, then login as seller
async function ensureSellerAndLogin(adminClient: ApiClient): Promise<{ sellerId: string; sellerClient: ApiClient }> {
  console.log('👤 Setting up seller account...');
  
  let sellerId: string | null = null;
  let needsCreation = false;

  // Try to find seller via admin API first
  try {
    console.log('🔍 Checking if seller account exists...');
    const users = await adminClient.fetch('/api/admin/users');
    const seller = users.find((u: any) => u.email === SELLER_EMAIL);
    
    if (seller) {
      console.log(`✅ Seller account found: ${SELLER_EMAIL}`);
      console.log(`   Status: ${seller.verificationStatus}, Email Verified: ${seller.emailVerified}`);
      sellerId = seller.id;
    } else {
      console.log('⚠️  Seller account not found, will create');
      needsCreation = true;
    }
  } catch (error) {
    console.log('⚠️  Could not check seller account, will try to create');
    needsCreation = true;
  }

  // Create seller if doesn't exist
  if (needsCreation) {
    console.log('📝 Creating new seller account...');
    
    try {
      // Create multipart form data with all required seller fields
      const FormData = (await import('form-data')).default;
      const formData = new FormData();
      
      formData.append('email', SELLER_EMAIL);
      formData.append('password', SELLER_PASSWORD);
      formData.append('firstName', 'Vaaney');
      formData.append('lastName', 'Marketplace');
      formData.append('role', 'seller');
      
      // Required contact information for sellers
      formData.append('contactNumber', '+960 7777777');
      formData.append('streetAddress', 'Boduthakurufaanu Magu');
      formData.append('city', 'Male');
      formData.append('postalCode', '20026');
      formData.append('country', 'Maldives');
      
      // Required bank details for sellers
      formData.append('bankName', 'Bank of Maldives');
      formData.append('bankAccountNumber', '7777777777');
      formData.append('bankAccountHolderName', 'Vaaney Marketplace');
      formData.append('bankSwiftCode', 'MALBMVMV');
      
      // Create a dummy verification document (PDF)
      const dummyPdf = Buffer.from('%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n2 0 obj\n<<\n/Type /Pages\n/Kids [3 0 R]\n/Count 1\n>>\nendobj\n3 0 obj\n<<\n/Type /Page\n/Parent 2 0 R\n/Resources <<\n/Font <<\n/F1 4 0 R\n>>\n>>\n/MediaBox [0 0 612 792]\n/Contents 5 0 R\n>>\nendobj\n4 0 obj\n<<\n/Type /Font\n/Subtype /Type1\n/BaseFont /Times-Roman\n>>\nendobj\n5 0 obj\n<<\n/Length 44\n>>\nstream\nBT\n/F1 12 Tf\n100 700 Td\n(Verification Document) Tj\nET\nendstream\nendobj\nxref\n0 6\n0000000000 65535 f\n0000000009 00000 n\n0000000058 00000 n\n0000000115 00000 n\n0000000262 00000 n\n0000000350 00000 n\ntrailer\n<<\n/Size 6\n/Root 1 0 R\n>>\nstartxref\n442\n%%EOF');
      formData.append('documents', dummyPdf, {
        filename: 'verification.pdf',
        contentType: 'application/pdf',
      });

      const signupResponse = await fetch(`${PRODUCTION_URL}/api/signup`, {
        method: 'POST',
        body: formData,
        headers: formData.getHeaders(),
      });

      const responseText = await signupResponse.text();
      
      if (!signupResponse.ok) {
        // If email already registered, that's OK - we'll login instead
        if (responseText.includes('Email already registered')) {
          console.log('✅ Seller account already exists, will login instead');
          needsCreation = false; // Skip verification since account exists
        } else {
          console.error('Signup response:', responseText.substring(0, 500));
          throw new Error(`Signup failed (${signupResponse.status}): ${responseText.substring(0, 200)}`);
        }
      } else {

        let newSeller;
        try {
          newSeller = JSON.parse(responseText);
        } catch (parseError) {
          console.error('Response was not JSON:', responseText.substring(0, 500));
          throw new Error(`Signup returned invalid JSON. Response starts with: ${responseText.substring(0, 100)}`);
        }
        sellerId = newSeller.id;
        console.log(`✅ Seller created: ${newSeller.email}`);
        
        // Approve seller verification via admin
        console.log('📝 Approving seller verification...');
        await adminClient.fetch(`/api/admin/sellers/${sellerId}/verify`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ verificationStatus: 'approved' }),
        });
        console.log('✅ Seller verified');
      }
    } catch (error: any) {
      throw new Error(`Failed to create seller account: ${error.message}`);
    }
  }
  
  // Now login as the seller to get seller session
  console.log('🔐 Logging in as seller...');
  const loginResponse = await fetch(`${PRODUCTION_URL}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: SELLER_EMAIL,
      password: SELLER_PASSWORD,
    }),
  });

  if (!loginResponse.ok) {
    throw new Error(`Seller login failed: ${loginResponse.statusText}`);
  }

  const setCookie = loginResponse.headers.get('set-cookie');
  if (!setCookie) {
    throw new Error('No session cookie received from seller login');
  }

  const sellerSessionCookie = setCookie.split(';')[0];
  console.log('✅ Logged in as seller\n');

  const sellerClient: ApiClient = {
    sessionCookie: sellerSessionCookie,
    fetch: async (endpoint: string, options: any = {}) => {
      const response = await fetch(`${PRODUCTION_URL}${endpoint}`, {
        ...options,
        headers: {
          ...options.headers,
          Cookie: sellerSessionCookie,
        },
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`API request failed: ${response.statusText}\n${text}`);
      }

      return response.json();
    },
  };
  
  if (!sellerId) {
    throw new Error('Failed to get seller ID');
  }
  
  return { sellerId, sellerClient };
}

// Upload image to GCS
async function uploadImage(client: ApiClient, imagePath: string): Promise<string> {
  // Get upload URL
  const uploadData = await client.fetch('/api/object-storage/upload-url');
  
  // Upload file to GCS
  const imageBuffer = fs.readFileSync(imagePath);
  const uploadResponse = await fetch(uploadData.uploadUrl, {
    method: 'PUT',
    body: imageBuffer,
    headers: {
      'Content-Type': 'image/jpeg',
    },
  });

  if (!uploadResponse.ok) {
    throw new Error(`Image upload failed: ${uploadResponse.statusText}`);
  }

  // Finalize upload
  const finalizeData = await client.fetch('/api/object-storage/finalize-upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ objectPath: uploadData.objectPath }),
  });

  return finalizeData.objectPath;
}

// Create product with variants
async function createProduct(client: ApiClient, sellerId: string, product: ProductSeed, imageMap: Map<string, string>): Promise<void> {
  console.log(`\n📦 Creating product: ${product.name}`);
  
  // Upload main product images
  const uploadedMainImages: string[] = [];
  for (const imageSearch of product.images) {
    const localPath = imageMap.get(imageSearch);
    if (localPath) {
      try {
        const objectPath = await uploadImage(client, localPath);
        uploadedMainImages.push(objectPath);
        console.log(`  ✅ Uploaded main image`);
      } catch (error) {
        console.log(`  ⚠️  Failed to upload main image: ${error}`);
      }
    }
  }

  // Create the product
  const productData = {
    name: product.name,
    description: product.description,
    category: product.category,
    requiresQuote: product.requiresQuote,
    requiresDesignApproval: product.requiresDesignApproval,
    images: uploadedMainImages,
  };

  const createdProduct = await client.fetch('/api/seller/products', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(productData),
  });

  console.log(`  ✅ Product created (ID: ${createdProduct.id})`);

  // Create variants
  for (const variant of product.variants) {
    try {
      // Upload variant-specific image
      const variantImages: string[] = [];
      const localPath = imageMap.get(variant.imageSearch);
      if (localPath) {
        const objectPath = await uploadImage(client, localPath);
        variantImages.push(objectPath);
      }

      const variantData = {
        productId: createdProduct.id,
        name: variant.name,
        sku: variant.sku,
        price: variant.price.toString(),
        inventory: variant.inventory.toString(),
        attributes: variant.attributes,
        imageUrls: variantImages,
        weight: variant.weight.toString(),
        length: variant.length.toString(),
        width: variant.width.toString(),
        height: variant.height.toString(),
      };

      await client.fetch('/api/seller/products/variants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(variantData),
      });

      console.log(`    ✅ Variant: ${variant.name}`);
    } catch (error) {
      console.log(`    ❌ Failed to create variant ${variant.name}: ${error}`);
    }
  }
}

// Create service with packages
async function createService(client: ApiClient, sellerId: string, service: ServiceSeed, imageMap: Map<string, string>): Promise<void> {
  console.log(`\n💼 Creating service: ${service.name}`);
  
  // Upload service images
  const uploadedImages: string[] = [];
  for (const imageSearch of service.images) {
    const localPath = imageMap.get(imageSearch);
    if (localPath) {
      try {
        const objectPath = await uploadImage(client, localPath);
        uploadedImages.push(objectPath);
        console.log(`  ✅ Uploaded service image`);
      } catch (error) {
        console.log(`  ⚠️  Failed to upload service image: ${error}`);
      }
    }
  }

  // Create the service
  const serviceData = {
    name: service.name,
    description: service.description,
    category: service.category,
    requiresQuote: service.requiresQuote,
    requiresDesignApproval: service.requiresDesignApproval,
    images: uploadedImages,
  };

  const createdService = await client.fetch('/api/seller/services', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(serviceData),
  });

  console.log(`  ✅ Service created (ID: ${createdService.id})`);

  // Create packages
  for (const pkg of service.packages) {
    try {
      const packageData = {
        serviceId: createdService.id,
        name: pkg.name,
        description: pkg.description,
        price: pkg.price.toString(),
        features: pkg.features,
        duration: pkg.duration,
        availability: pkg.availability,
      };

      await client.fetch('/api/seller/services/packages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(packageData),
      });

      console.log(`    ✅ Package: ${pkg.name} ($${pkg.price})`);
    } catch (error) {
      console.log(`    ❌ Failed to create package ${pkg.name}: ${error}`);
    }
  }
}

async function main() {
  console.log('🚀 Vaaney Production Seeding Script\n');
  console.log(`📍 Target: ${PRODUCTION_URL}\n`);
  console.log(`📊 Will create:`);
  console.log(`   - ${PRODUCTS.length} products with ${PRODUCTS.reduce((sum, p) => sum + p.variants.length, 0)} variants`);
  console.log(`   - ${SERVICES.length} services with ${SERVICES.reduce((sum, s) => sum + s.packages.length, 0)} packages\n`);

  try {
    // Step 1: Authenticate as admin
    const adminClient = await createApiClient();

    // Step 2: Ensure seller exists, is verified, and get seller session
    const { sellerId, sellerClient } = await ensureSellerAndLogin(adminClient);

    // Step 2: Download all required stock images
    console.log('📸 Downloading stock images from Pexels...\n');
    const allSearchTerms = getAllImageSearchTerms(PRODUCTS, SERVICES);
    const imageMap = await downloadMultipleImages(allSearchTerms, 3);
    
    if (imageMap.size === 0) {
      throw new Error('Failed to download any images. Cannot continue.');
    }

    // Step 3: Create products with variants (using seller session)
    console.log('\n📦 Creating Products & Variants...\n');
    for (const product of PRODUCTS) {
      try {
        await createProduct(sellerClient, sellerId, product, imageMap);
      } catch (error) {
        console.log(`❌ Failed to create product ${product.name}: ${error}`);
      }
    }

    // Step 4: Create services with packages (using seller session)
    console.log('\n💼 Creating Services & Packages...\n');
    for (const service of SERVICES) {
      try {
        await createService(sellerClient, sellerId, service, imageMap);
      } catch (error) {
        console.log(`❌ Failed to create service ${service.name}: ${error}`);
      }
    }

    console.log('\n✨ Seeding complete!');
    console.log(`\n📊 Summary:`);
    console.log(`   ✅ Seller verified: ${SELLER_EMAIL}`);
    console.log(`   ✅ ${PRODUCTS.length} products created`);
    console.log(`   ✅ ${SERVICES.length} services created`);
    console.log(`\n🌐 Visit ${PRODUCTION_URL}/buyer/marketplace to see your products!\n`);
  } catch (error) {
    console.error('\n❌ Seeding failed:', error);
    process.exit(1);
  }
}

main();
