import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';

// Load API key from environment
const PEXELS_API_KEY = process.env.PEXELS_API_KEY;

if (!PEXELS_API_KEY) {
  console.error('❌ Error: PEXELS_API_KEY environment variable is required');
  console.error('   Get a free API key from: https://www.pexels.com/api/');
  process.exit(1);
}

interface ImageDownloadResult {
  searchTerm: string;
  localPath: string;
  error?: string;
}

export async function downloadStockImage(
  searchTerm: string,
  outputDir: string = 'scripts/downloaded_images'
): Promise<ImageDownloadResult> {
  try {
    // Create output directory if it doesn't exist
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Generate filename from search term
    const filename = searchTerm.replace(/[^a-z0-9]/gi, '_').toLowerCase() + '.jpg';
    const localPath = path.join(outputDir, filename);

    // Check if image already exists in cache
    if (fs.existsSync(localPath)) {
      return {
        searchTerm,
        localPath,
      };
    }

    // Search for image on Pexels
    const searchUrl = `https://api.pexels.com/v1/search?query=${encodeURIComponent(searchTerm)}&per_page=1&orientation=landscape`;
    
    const searchResponse = await fetch(searchUrl, {
      headers: {
        'Authorization': PEXELS_API_KEY,
      },
    });

    if (!searchResponse.ok) {
      throw new Error(`Pexels API error: ${searchResponse.statusText}`);
    }

    const searchData: any = await searchResponse.json();
    
    if (!searchData.photos || searchData.photos.length === 0) {
      throw new Error(`No images found for "${searchTerm}"`);
    }

    // Get the large image URL
    const imageUrl = searchData.photos[0].src.large;
    
    // Download the image
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to download image: ${imageResponse.statusText}`);
    }

    // Save image to file
    const buffer = await imageResponse.arrayBuffer();
    fs.writeFileSync(localPath, Buffer.from(buffer));

    return {
      searchTerm,
      localPath,
    };
  } catch (error) {
    return {
      searchTerm,
      localPath: '',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function downloadMultipleImages(
  searchTerms: string[],
  concurrency: number = 3
): Promise<Map<string, string>> {
  const results = new Map<string, string>();
  const outputDir = 'scripts/downloaded_images';

  console.log(`📸 Downloading ${searchTerms.length} images...`);

  // Process in batches to avoid rate limiting
  for (let i = 0; i < searchTerms.length; i += concurrency) {
    const batch = searchTerms.slice(i, i + concurrency);
    const promises = batch.map(term => downloadStockImage(term, outputDir));
    
    const batchResults = await Promise.all(promises);
    
    for (const result of batchResults) {
      if (result.error) {
        console.log(`  ❌ Failed: ${result.searchTerm} - ${result.error}`);
      } else {
        results.set(result.searchTerm, result.localPath);
        console.log(`  ✅ Downloaded: ${result.searchTerm}`);
      }
    }

    // Small delay between batches to respect rate limits
    if (i + concurrency < searchTerms.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  console.log(`\n✅ Downloaded ${results.size} of ${searchTerms.length} images\n`);
  return results;
}

export function getAllImageSearchTerms(products: any[], services: any[]): string[] {
  const terms: Set<string> = new Set();

  // Collect product images
  for (const product of products) {
    for (const term of product.images) {
      terms.add(term);
    }
    for (const variant of product.variants) {
      terms.add(variant.imageSearch);
    }
  }

  // Collect service images
  for (const service of services) {
    for (const term of service.images) {
      terms.add(term);
    }
  }

  return Array.from(terms);
}
