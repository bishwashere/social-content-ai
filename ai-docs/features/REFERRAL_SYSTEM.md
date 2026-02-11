# Referral System Documentation

## Overview

The referral system allows you to track referrals and signups from external partners. It consists of:

1. **Super Admin** - You, with full control over the system
2. **Referral Partners** - People who promote your product and get unique referral links
3. **Tracking** - Automatic tracking of clicks and signups

## Setup

### 1. Install Dependencies

```bash
pnpm install
```

This will install `bcryptjs` and its types for password hashing.

### 2. Generate Super Admin Credentials

Run the script to generate random super admin credentials:

```bash
npx tsx scripts/generate-super-admin-credentials.ts
```

This will output something like:
```
REFERRAL_SUPER_ADMIN_USERNAME=admin_74a6a6dd
REFERRAL_SUPER_ADMIN_PASSWORD=e0faea9134a45a7acb4ec40b
```

### 3. Add to Environment Variables

Add the generated credentials to your `.env` file:

```env
REFERRAL_SUPER_ADMIN_USERNAME=admin_74a6a6dd
REFERRAL_SUPER_ADMIN_PASSWORD=e0faea9134a45a7acb4ec40b
```

### 4. Update Database Schema

Run Prisma migrations to add the referral tables:

```bash
pnpm db:push
```

Or if using migrations:

```bash
npx prisma migrate dev --name add_referral_system
```

## Usage

### Super Admin Access

1. Navigate to `/referral` in your browser
2. Login with your super admin credentials
3. You'll be redirected to `/referral/admin` dashboard

### Super Admin Dashboard Features

- **View Statistics**: See total partners, clicks, signups, and conversion rates
- **Add Partners**: Create new referral partners with:
  - Name
  - Email
  - Username
  - Password (will be encrypted and stored)
- **View Partner Stats**: See individual partner performance
- **Delete Partners**: Remove partners from the system

### Referral Partner Access

1. Partners can access their dashboard at `/referral/partner`
2. They login with credentials you set for them
3. They can see:
   - Their unique referral link
   - Total clicks on their link
   - Total signups from their link
   - Conversion rate
   - Recent clicks (last 10)
   - List of users who signed up through their link

### How Referral Links Work

1. Each partner gets a unique username (e.g., `john_doe`)
2. Their referral link is: `https://nextpostai.com/{username}` (e.g., `https://nextpostai.com/john_doe`)
3. When someone clicks the link:
   - A click is tracked in the database
   - A cookie is set for 30 days to remember the referral username
   - User is redirected to the home page
4. When the user signs up (via Google OAuth):
   - The system checks for the referral username cookie
   - If found, a signup is recorded for that partner
   - The user is associated with the referral partner

## API Endpoints

### Super Admin

- `POST /api/referral/admin/login` - Super admin login
- `GET /api/referral/admin/stats` - Get overall statistics
- `GET /api/referral/admin/partners` - List all partners
- `POST /api/referral/admin/partners` - Create a new partner
- `PUT /api/referral/admin/partners/[id]` - Update a partner
- `DELETE /api/referral/admin/partners/[id]` - Delete a partner

### Referral Partner

- `POST /api/referral/partner/login` - Partner login
- `GET /api/referral/partner/stats` - Get partner's own statistics

## Database Models

### ReferralPartner
- Stores partner information (name, email, username, hashed password)
- Each partner has a unique `code` for their referral link

### ReferralClick
- Tracks each click on a referral link
- Stores IP address and user agent

### ReferralSignup
- Tracks users who signed up through a referral link
- Links a User to a ReferralPartner
- Ensures one signup per user (unique constraint)

## Security Features

1. **Password Hashing**: All passwords are hashed using bcrypt before storage
2. **JWT Authentication**: Both super admin and partners use JWT tokens
3. **Role-Based Access**: Super admin and partners have different permissions
4. **Cookie Security**: Referral tracking cookies are set with secure flags in production

## Notes

- Referral links are now username-based for a friendlier experience (e.g., `nextpostai.com/john_doe`)
- The `code` field is still maintained in the database for backward compatibility
- Referral cookies last for 30 days
- A user can only be associated with one referral signup (unique constraint)
- The system automatically tracks clicks and signups without manual intervention
- Usernames must be unique and will be used directly in referral URLs

## Troubleshooting

### Middleware Issues

If referral links aren't working, check:
1. The middleware is running (check `src/middleware.ts`)
2. The referral code exists in the database
3. The path doesn't conflict with other routes

### Authentication Issues

If login fails:
1. Check that environment variables are set correctly
2. Verify JWT_SECRET is configured
3. Check browser console for errors

### Database Issues

If you see Prisma errors:
1. Run `pnpm db:push` to sync schema
2. Check that MongoDB connection is working
3. Verify all required fields are provided when creating partners
