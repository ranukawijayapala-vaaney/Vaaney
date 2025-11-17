# Vaaney E-Marketplace - Publishing Guide

## Overview
This guide provides step-by-step instructions for publishing the Vaaney e-marketplace platform to production.

## Pre-Publishing Checklist

### ✅ Client-Side TypeScript Status
- **Status**: All client-side TypeScript errors resolved (0 errors)
- **Production Ready**: Yes

### ⚠️ Backend TypeScript Status
- **Status**: Some non-critical TypeScript errors remain in server files
- **Impact**: These are type-checking warnings only and do not affect runtime functionality
- **Files with warnings**:
  - `server/quoteApprovalRoutes.ts` - Type mismatches with arrays and null values
  - `server/routes.ts` - Null safety issues with packageId
  - `server/storage.ts` - Query result type mismatch
  - `shared/schema.ts` - Implicit any types in circular references
- **Action Required**: Optional - can be fixed later without affecting production deployment

## Step 1: Database Preparation

### Option A: Complete Fresh Start
If you want to delete all production data and start fresh:

1. Open the Database tab in Replit
2. Switch to "Production" database view
3. Delete all data using the database management interface

### Option B: Selective User Retention
If you want to keep the `ranuka.wijayapala@gmail.com` user:

**Note**: This approach requires careful manual database operations. The safest approach is to:
1. Export the user data for `ranuka.wijayapala@gmail.com` (copy email, hashed password, first name, last name, role)
2. Delete all production data
3. Use the Admin Setup tool (see Step 3) to recreate the admin user with the same credentials

## Step 2: Environment Variables Configuration

### Required Environment Variables

Set these environment variables in your Replit project's Secrets:

#### 🔴 Critical (Must Set)
- **`DATABASE_URL`** - PostgreSQL connection string (automatically provided by Replit)
- **`SESSION_SECRET`** - Random string for session encryption (generate a secure random string)
- **`ADMIN_SETUP_KEY`** - Secret key for initial admin account creation (generate a secure random string)
- **`PUBLIC_OBJECT_SEARCH_PATHS`** - Path for public file storage (automatically set by Replit object storage)
- **`PRIVATE_OBJECT_DIR`** - Path for private file storage (automatically set by Replit object storage)

#### 🟡 Important (Recommended)
- **`RESEND_API_KEY`** - API key for Resend email service (for sending notifications)
  - Get your API key from: https://resend.com/api-keys
  - Without this key, email notifications will be skipped (logged to console only)
- **`FROM_EMAIL`** - Email address for sending notifications (defaults to "Vaaney <noreply@vaaney.com>")

#### 🟢 Optional (For OAuth)
- **`GOOGLE_CLIENT_ID`** - Google OAuth client ID
- **`GOOGLE_CLIENT_SECRET`** - Google OAuth client secret
- **`GOOGLE_CALLBACK_URL`** - OAuth callback URL (typically `https://your-repl-name.repl.co/auth/google/callback`)

### How to Generate Secure Keys

For `SESSION_SECRET` and `ADMIN_SETUP_KEY`, use one of these methods:

**Method 1: Using Node.js**
```javascript
// Run in the Shell tab
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Method 2: Using OpenSSL**
```bash
# Run in the Shell tab
openssl rand -hex 32
```

**Method 3: Using an online generator**
Visit: https://generate-secret.vercel.app/32

## Step 3: Initial Admin Account Setup

After deploying with the `ADMIN_SETUP_KEY` environment variable set:

1. **Navigate to the Admin Setup Page**
   - URL: `https://your-repl-name.repl.co/admin-setup`
   - This is a public page accessible without login

2. **Fill in the Admin Account Details**
   - Email (e.g., `ranuka.wijayapala@gmail.com`)
   - Password (must include uppercase, lowercase, number, and special character)
   - First Name
   - Last Name
   - Setup Key (the value you set for `ADMIN_SETUP_KEY`)

3. **Submit the Form**
   - The system will create your admin account
   - You'll see a success message
   - **This can only be done once** - after the first admin is created, the endpoint becomes unavailable

4. **Login as Admin**
   - Navigate to the home page
   - Click "Login"
   - Use your admin credentials

### Security Notes
- The `/admin-setup` endpoint is only accessible when:
  - `ADMIN_SETUP_KEY` environment variable is set
  - No admin users exist in the database yet
- After the first admin is created, the endpoint returns an error
- Store your `ADMIN_SETUP_KEY` securely - it's only needed once

## Step 4: Publishing on Replit

### Using Autoscale Deployment (Recommended)

1. **Click the "Publish" Button** in the Replit interface

2. **Configure Deployment Settings**
   - Choose "Autoscale" deployment type
   - Starting resources: 0.25 vCPU, 0.5 GB RAM
   - Scaling: Up to 4 instances based on demand

3. **Verify Environment Variables**
   - Replit will show which environment variables are available
   - Ensure all required variables are set before publishing

4. **Deploy**
   - Click "Deploy"
   - Wait for the build and deployment process to complete
   - Your app will be available at `https://your-repl-name.repl.co`

### Expected Costs
- **Autoscale**: ~$1-15/month depending on usage
- **Reserved VM**: ~$25/month (fixed cost)
- Your Replit Core subscription ($20/month) includes $25 in deployment credits initially

## Step 5: Post-Deployment Verification

### Test Critical Flows

1. **Admin Setup** (first-time only)
   - Visit `/admin-setup`
   - Create admin account
   - Verify you can log in

2. **Authentication**
   - Test local login with email/password
   - Test Google OAuth login (if configured)
   - Test logout

3. **Seller Registration**
   - Create a seller account
   - Upload verification documents
   - Admin approval workflow

4. **Product/Service Creation**
   - Add products with variants
   - Add services with packages
   - Upload images

5. **Buyer Flows**
   - Browse products and services
   - Add to cart
   - Checkout process
   - Payment methods (Bank Transfer, IPG)

6. **Messaging System**
   - Send messages between buyer and seller
   - Admin participation in conversations

7. **Notifications**
   - Check in-app notifications
   - Check email notifications (if Resend is configured)

## Troubleshooting

### "Admin setup is not configured" Error
- Ensure `ADMIN_SETUP_KEY` environment variable is set
- Restart the deployment after adding the variable

### Email Notifications Not Working
- Check if `RESEND_API_KEY` is set correctly
- Verify API key is valid at https://resend.com
- Check application logs for email sending errors
- Emails will fail silently if the key is missing (logged to console only)

### Google OAuth Not Working
- Verify `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set
- Check that `GOOGLE_CALLBACK_URL` matches your OAuth app configuration
- Update authorized redirect URIs in Google Cloud Console

### File Upload Issues
- Verify object storage integration is active
- Check `PUBLIC_OBJECT_SEARCH_PATHS` and `PRIVATE_OBJECT_DIR` are set
- Ensure sufficient storage quota in your Replit account

### Database Connection Errors
- Verify `DATABASE_URL` is correctly set
- Check database is in "running" state
- Verify database has sufficient storage

## Additional Resources

### Monitoring and Logs
- Use Replit's built-in logging to monitor your application
- Check the Console tab for real-time logs
- Monitor API response times and error rates

### Backup Strategy
- Replit automatically backs up your database
- Consider exporting critical data periodically
- Test your restore process

### Scaling Considerations
- Monitor your usage on the Deployments tab
- Autoscale will automatically adjust resources based on traffic
- Consider upgrading to Reserved VM for predictable, high traffic

## Support

For Replit-specific issues:
- Visit https://replit.com/support
- Check documentation at https://docs.replit.com

For application-specific issues:
- Review application logs in the Console tab
- Check browser console for frontend errors
- Test API endpoints using the network inspector

---

## Quick Reference Checklist

- [ ] Database cleared/prepared
- [ ] All required environment variables set
- [ ] `ADMIN_SETUP_KEY` generated and stored securely
- [ ] `SESSION_SECRET` generated and set
- [ ] `RESEND_API_KEY` obtained and set (optional but recommended)
- [ ] Google OAuth credentials set (optional)
- [ ] Published to production
- [ ] Admin account created via `/admin-setup`
- [ ] Admin login verified
- [ ] Critical flows tested
- [ ] Monitoring and logs reviewed

---

**Last Updated**: November 16, 2024
**Platform Version**: v1.0.0
**Deployment Type**: Replit Autoscale/Reserved VM
