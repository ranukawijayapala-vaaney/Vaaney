import fetch from 'node-fetch';

const BASE_URL = process.env.PRODUCTION_URL || 'https://vaaney-marketplace.replit.app';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error('❌ Missing required environment variables: ADMIN_EMAIL, ADMIN_PASSWORD');
  process.exit(1);
}

class ApiClient {
  private sessionCookie: string | null = null;

  async login(email: string, password: string) {
    const response = await fetch(`${BASE_URL}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Login failed: ${error}`);
    }

    const setCookie = response.headers.get('set-cookie');
    if (!setCookie) {
      throw new Error('No session cookie received');
    }
    this.sessionCookie = setCookie.split(';')[0];
    return response.json();
  }

  async fetch(url: string, options: any = {}) {
    if (!this.sessionCookie) {
      throw new Error('Not logged in');
    }

    const response = await fetch(`${BASE_URL}${url}`, {
      ...options,
      headers: {
        ...options.headers,
        'Cookie': this.sessionCookie,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Request failed: ${error}`);
    }

    return response.json();
  }
}

async function updateImageAcl(client: ApiClient, objectPath: string): Promise<void> {
  try {
    // Finalize with public visibility
    await client.fetch('/api/object-storage/finalize-upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        objectPath,
        visibility: 'public'
      }),
    });
    console.log(`  ✅ Updated ACL for ${objectPath}`);
  } catch (error: any) {
    console.error(`  ❌ Failed to update ACL for ${objectPath}: ${error.message}`);
  }
}

async function main() {
  console.log('🔐 Logging in as admin...');
  const client = new ApiClient();
  await client.login(ADMIN_EMAIL, ADMIN_PASSWORD);
  console.log('✅ Logged in successfully\n');

  // Get all products
  console.log('📦 Fetching all products...');
  const products = await client.fetch('/api/products');
  console.log(`Found ${products.length} products\n`);

  // Get all services
  console.log('🛠️  Fetching all services...');
  const services = await client.fetch('/api/services');
  console.log(`Found ${services.length} services\n`);

  // Update product images
  console.log('🖼️  Updating product image ACLs...');
  for (const product of products) {
    console.log(`Product: ${product.name}`);
    if (product.images && Array.isArray(product.images)) {
      for (const imagePath of product.images) {
        await updateImageAcl(client, imagePath);
      }
    }
    
    // Update variant images
    if (product.variants && Array.isArray(product.variants)) {
      for (const variant of product.variants) {
        console.log(`  Variant: ${variant.name}`);
        if (variant.images && Array.isArray(variant.images)) {
          for (const imagePath of variant.images) {
            await updateImageAcl(client, imagePath);
          }
        }
      }
    }
  }

  // Update service images
  console.log('\n🖼️  Updating service image ACLs...');
  for (const service of services) {
    console.log(`Service: ${service.name}`);
    if (service.images && Array.isArray(service.images)) {
      for (const imagePath of service.images) {
        await updateImageAcl(client, imagePath);
      }
    }
  }

  console.log('\n✅ ACL migration complete!');
}

main().catch(console.error);
