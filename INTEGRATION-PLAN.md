# SnapIT Polls - Unified Platform Integration Plan

**Date:** October 21, 2025
**Status:** Planning Phase

---

## 🎯 Integration Goal

Integrate polls.snapitsoftware.com into the unified SnapIT ecosystem with shared authentication, pricing, and cross-app functionality.

---

## 🔄 Unified Configuration (To Be Implemented)

### 1. Google OAuth (Shared with all SnapIT apps)
```javascript
GOOGLE_CLIENT_ID: '242648112266-pkub2fo21h5o9edm19921ul6hed20tb4.apps.googleusercontent.com'
```

### 2. Stripe Pricing (5-Tier Unified Model)
```javascript
{
  personal: { monthlyPriceId: 'price_1SKiKkRE8RY21XQRngjn0Xzb', price: '$9.99/mo' },
  small: { monthlyPriceId: 'price_1SKiKlRE8RY21XQRzRedBJ1S', price: '$29.99/mo' },
  medium: { monthlyPriceId: 'price_1SKiKmRE8RY21XQR3brcJ2tf', price: '$69.99/mo' },
  large: { monthlyPriceId: 'price_1SKiKmRE8RY21XQRSPox4Z75', price: '$149.99/mo' },
  enterprise: { monthlyPriceId: 'price_1SKiKnRE8RY21XQRx6LMuYC7', price: '$299.99/mo' }
}
```

### 3. API Endpoints
- **Primary:** https://api.snapitqr.com (shared backend)
- **Forms:** https://api.snapitforms.com
- **URL:** https://api.snapiturl.com

---

## 📊 Free vs Paid Features

### FREE Tier (with Google sign-in):
- Unlimited basic polls
- Up to 100 responses per poll
- Basic analytics
- Share polls via link

### PAID Tiers Unlock:
- **Personal ($9.99/mo):**
  - Advanced poll types (ranking, matrix)
  - 500 responses per poll
  - Access to forms (5 forms, 500 submissions)
  - Access to QR codes (50 dynamic)
  - Access to URL shortener (250 URLs/month)

- **Small Business ($29.99/mo):**
  - Polls with form submission integration
  - 50 advanced polls
  - 2,000 responses per poll
  - Full access to forms, QR, URL features

- **Medium/Large/Enterprise:**
  - Unlimited polls and responses
  - Full cross-app integration
  - API access
  - Team collaboration

---

## 🔗 Cross-App Integration Features

### Phase 1: Authentication & Pricing
- [ ] Add Google OAuth (shared client ID)
- [ ] Add Stripe checkout integration
- [ ] Create unified pricing modal
- [ ] Add subscription status check

### Phase 2: Cross-App Features
- [ ] Create poll + collect responses via SnapIT Forms
- [ ] Generate QR codes for polls
- [ ] Create short URLs for polls
- [ ] Unified analytics dashboard

### Phase 3: Advanced Integration
- [ ] Polls embedded in forms
- [ ] QR code campaigns with polls
- [ ] Poll response analytics in unified dashboard
- [ ] API access for poll data

---

## 🏗️ Technical Implementation

### Current Status:
- ✅ React/TypeScript app deployed
- ⏳ No authentication yet
- ⏳ No pricing integration
- ⏳ No cross-app features

### Next Steps:
1. Add config.js or .env file with unified credentials
2. Install @google-oauth/react and @stripe/react-stripe-js
3. Create authentication component
4. Create pricing modal component
5. Add subscription check middleware
6. Deploy to production

---

## 📝 Notes

**One Subscription Unlocks All:**
- Users subscribe once, get access to QR codes, URL shortener, forms, and polls
- All apps share the same Stripe subscription
- Authentication works across all 4 apps
- Unified billing portal

**Database:**
- Polls can use existing DynamoDB tables or dedicated tables
- User data syncs across all apps
- Subscription status stored centrally

---

**Status:** Awaiting implementation
**Priority:** Medium (after snapitforms integration)
**Est. Time:** 4-6 hours for full integration
