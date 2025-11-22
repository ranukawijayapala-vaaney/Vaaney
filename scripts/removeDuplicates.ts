import fetch from 'node-fetch';

const BASE_URL = process.env.PRODUCTION_URL || 'https://vaaney-marketplace.replit.app';
const SELLER_EMAIL = process.env.SELLER_EMAIL || 'vaaney.info@gmail.com';
const SELLER_PASSWORD = process.env.SELLER_PASSWORD;

if (!SELLER_PASSWORD) {
  console.error('❌ Missing required environment variable: SELLER_PASSWORD');
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

  async delete(url: string) {
    if (!this.sessionCookie) {
      throw new Error('Not logged in');
    }

    const response = await fetch(`${BASE_URL}${url}`, {
      method: 'DELETE',
      headers: {
        'Cookie': this.sessionCookie,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Delete failed: ${error}`);
    }

    return response.json();
  }
}

async function main() {
  console.log('🔐 Logging in as seller...');
  const client = new ApiClient();
  await client.login(SELLER_EMAIL, SELLER_PASSWORD);
  console.log('✅ Logged in successfully\n');

  // Get all products
  console.log('📦 Fetching all products...');
  const products = await client.fetch('/api/products');
  console.log(`Found ${products.length} total products\n`);

  // Get all services
  console.log('🛠️  Fetching all services...');
  const services = await client.fetch('/api/services');
  console.log(`Found ${services.length} total services\n`);

  // Group products by name and keep only the oldest one
  const productsByName = new Map<string, any[]>();
  for (const product of products) {
    if (!productsByName.has(product.name)) {
      productsByName.set(product.name, []);
    }
    productsByName.get(product.name)!.push(product);
  }

  console.log('🗑️  Removing duplicate products...');
  let deletedProducts = 0;
  for (const [name, duplicates] of productsByName) {
    if (duplicates.length > 1) {
      // Sort by createdAt to keep the oldest one
      duplicates.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      const toKeep = duplicates[0];
      const toDelete = duplicates.slice(1);
      
      console.log(`\n  Product: ${name}`);
      console.log(`  Keeping: ${toKeep.id} (created ${toKeep.createdAt})`);
      
      for (const product of toDelete) {
        try {
          await client.delete(`/api/seller/products/${product.id}`);
          console.log(`  ✅ Deleted duplicate: ${product.id} (created ${product.createdAt})`);
          deletedProducts++;
        } catch (error: any) {
          // If deletion fails due to FK constraint, mark as inactive instead
          if (error.message.includes('foreign key constraint')) {
            try {
              await client.fetch(`/api/seller/products/${product.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isActive: false }),
              });
              console.log(`  ⚠️  Marked as inactive (has orders): ${product.id}`);
              deletedProducts++;
            } catch (patchError: any) {
              console.error(`  ❌ Failed to deactivate ${product.id}: ${patchError.message}`);
            }
          } else {
            console.error(`  ❌ Failed to delete ${product.id}: ${error.message}`);
          }
        }
      }
    }
  }

  // Group services by name and keep only the oldest one
  const servicesByName = new Map<string, any[]>();
  for (const service of services) {
    if (!servicesByName.has(service.name)) {
      servicesByName.set(service.name, []);
    }
    servicesByName.get(service.name)!.push(service);
  }

  console.log('\n🗑️  Removing duplicate services...');
  let deletedServices = 0;
  for (const [name, duplicates] of servicesByName) {
    if (duplicates.length > 1) {
      // Sort by createdAt to keep the oldest one
      duplicates.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      const toKeep = duplicates[0];
      const toDelete = duplicates.slice(1);
      
      console.log(`\n  Service: ${name}`);
      console.log(`  Keeping: ${toKeep.id} (created ${toKeep.createdAt})`);
      
      for (const service of toDelete) {
        try {
          await client.delete(`/api/seller/services/${service.id}`);
          console.log(`  ✅ Deleted duplicate: ${service.id} (created ${service.createdAt})`);
          deletedServices++;
        } catch (error: any) {
          // If deletion fails due to FK constraint, mark as inactive instead
          if (error.message.includes('foreign key constraint')) {
            try {
              await client.fetch(`/api/seller/services/${service.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isActive: false }),
              });
              console.log(`  ⚠️  Marked as inactive (has bookings): ${service.id}`);
              deletedServices++;
            } catch (patchError: any) {
              console.error(`  ❌ Failed to deactivate ${service.id}: ${patchError.message}`);
            }
          } else {
            console.error(`  ❌ Failed to delete ${service.id}: ${error.message}`);
          }
        }
      }
    }
  }

  console.log(`\n✅ Cleanup complete!`);
  console.log(`   Deleted ${deletedProducts} duplicate products`);
  console.log(`   Deleted ${deletedServices} duplicate services`);
}

main().catch(console.error);
