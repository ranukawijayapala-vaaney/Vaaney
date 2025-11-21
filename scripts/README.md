# Vaaney Production Seeding Script

This script populates the Vaaney production marketplace with sample products and services for testing and demonstration purposes.

## What It Creates

- **10 Print Products** with 56 total variants (e.g., Business Cards, Flyers, Banners, Vehicle Wraps, etc.)
- **10 Digital Services** with 30 total packages (e.g., Logo Design, Web Development, Video Editing, etc.)
- Each item has different workflow configurations:
  - Simple direct purchase
  - Design approval required
  - Quote required
  - Both quote AND design approval required
- Professional stock images for all products and variants
- Realistic Maldivian marketplace content with proper pricing, inventory, and shipping dimensions

## Prerequisites

1. **Admin Access**: You need admin credentials for the production app
2. **Pexels API Key**: Free API key from [Pexels](https://www.pexels.com/api/) for downloading stock images

## Environment Variables

Create a `.env` file in the `scripts/` directory or set these variables:

```bash
# Required
ADMIN_EMAIL=your-admin-email@example.com
ADMIN_PASSWORD=your-admin-password
PEXELS_API_KEY=your-pexels-api-key

# Optional (with defaults)
SELLER_EMAIL=vaaney.info@gmail.com
SELLER_PASSWORD=VaaneySeller@123
PRODUCTION_URL=https://vaaney-marketplace.replit.app
```

## How to Run

### Option 1: Using environment variables directly

```bash
ADMIN_EMAIL="ranuka.wijayapala@gmail.com" \
ADMIN_PASSWORD="Admin@123" \
PEXELS_API_KEY="your-key-here" \
tsx scripts/seedProduction.ts
```

### Option 2: Using a .env file

1. Create `scripts/.env`:
```bash
ADMIN_EMAIL=ranuka.wijayapala@gmail.com
ADMIN_PASSWORD=Admin@123
PEXELS_API_KEY=your-pexels-key-here
```

2. Load environment variables and run:
```bash
cd scripts
source .env
tsx seedProduction.ts
```

## What the Script Does

1. **Authentication**: 
   - Logs in as admin to create/verify the seller account
   - Logs in as the seller to get a seller session

2. **Seller Setup**:
   - Checks if `vaaney.info@gmail.com` seller exists
   - Creates the seller account if it doesn't exist
   - Ensures the seller is verified (approved status)

3. **Image Download**:
   - Downloads 60+ professional stock images from Pexels
   - Saves them locally in `scripts/downloaded_images/`

4. **Upload & Create**:
   - Uploads all images to production Google Cloud Storage
   - Creates 10 products with all their variants
   - Creates 10 services with all their packages

## Expected Output

```
🚀 Vaaney Production Seeding Script

📍 Target: https://vaaney-marketplace.replit.app

📊 Will create:
   - 10 products with 56 variants
   - 10 services with 30 packages

👤 Setting up seller account...
🔐 Authenticating as admin...
✅ Authenticated successfully

✅ Seller account exists: vaaney.info@gmail.com
🔐 Logging in as seller...
✅ Logged in as seller

📸 Downloading stock images from Pexels...
  ✅ Downloaded: professional business cards
  ✅ Downloaded: matte business cards stack
  ...

📦 Creating Products & Variants...

📦 Creating product: Premium Business Cards
  ✅ Uploaded main image
  ✅ Product created (ID: xxx)
    ✅ Variant: Standard Matte - 100 cards
    ✅ Variant: Standard Glossy - 100 cards
    ...

💼 Creating Services & Packages...

💼 Creating service: Professional Logo Design
  ✅ Uploaded service image
  ✅ Service created (ID: xxx)
    ✅ Package: Basic ($150)
    ✅ Package: Standard ($300)
    ✅ Package: Premium ($550)

✨ Seeding complete!

📊 Summary:
   ✅ Seller verified: vaaney.info@gmail.com
   ✅ 10 products created
   ✅ 10 services created

🌐 Visit https://vaaney-marketplace.replit.app/buyer/marketplace to see your products!
```

## Troubleshooting

### Error: Missing required environment variables
- Make sure you've set `ADMIN_EMAIL` and `ADMIN_PASSWORD`

### Error: Pexels API error
- Check that your `PEXELS_API_KEY` is valid
- Get a free key from https://www.pexels.com/api/

### Error: Login failed
- Verify your admin credentials are correct
- Check that the production app is running

### Error: API request failed
- Make sure the production app is accessible
- Check that all API endpoints are working

## Security Notes

⚠️ **NEVER commit credentials to version control!**

- Always use environment variables
- Never hardcode passwords or API keys in the script
- Use `.gitignore` to exclude `.env` files
- Rotate API keys if they're exposed

## Cleanup

If you need to remove the seeded data:

1. Log in as admin to the production app
2. Navigate to Users → Sellers
3. Find the `vaaney.info@gmail.com` seller
4. Delete the seller account (this will cascade delete all products/services)

## Data Details

### Products (with workflow types)

1. **Premium Business Cards** - Simple (direct purchase)
2. **A4 Promotional Flyers** - Design Approval Required
3. **Custom Vinyl Banners** - Quote Required
4. **Vehicle Wraps & Graphics** - Quote + Design Approval
5. **Professional Brochures** - Design Approval Required
6. **Promotional Posters** - Simple (direct purchase)
7. **Restaurant Menu Cards** - Design Approval Required
8. **Custom Stickers & Decals** - Simple (direct purchase)
9. **Custom Product Packaging** - Quote Required
10. **Commercial Signage Boards** - Quote + Design Approval

### Services (with workflow types)

1. **Professional Logo Design** - Simple (direct booking)
2. **Social Media Graphics Design** - Design Approval Required
3. **Custom Digital Illustrations** - Quote Required
4. **Complete Brand Identity Package** - Quote + Design Approval
5. **Professional Web Development** - Simple (direct booking)
6. **Professional Video Editing** - Design Approval Required
7. **Architectural 3D Rendering** - Quote Required
8. **Mobile App UI/UX Design** - Quote + Design Approval
9. **Professional Content Writing** - Simple (direct booking)
10. **Professional Photo Retouching** - Design Approval Required

Each product has 5-6 variants with unique images, SKUs, pricing, and shipping dimensions.
Each service has 3 packages (Basic, Standard, Premium) with different features and pricing.
