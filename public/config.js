// Configuration for SnapIT Polls
// Shared configuration across SnapIT ecosystem

window.SNAPIT_CONFIG = {
    // Google OAuth Configuration (Shared across all SnapIT apps)
    GOOGLE_CLIENT_ID: '242648112266-pkub2fo21h5o9edm19921ul6hed20tb4.apps.googleusercontent.com',

    // Stripe Configuration (Shared across all SnapIT apps)
    STRIPE_PUBLISHABLE_KEY: 'pk_live_51RZK4aRE8RY21XQRpweG5ctPcGaRzShfajNWraIKOCLg4vYpqS88EqhpTGfj2joQbTjRK3spfP6uA6pGp2F4vRD700dBUbZ4aV',

    // Web3Forms Configuration (for contact forms and email notifications)
    WEB3FORMS_ACCESS_KEY: '',

    // Business Configuration
    BUSINESS_EMAIL: 'support@polls.snapitsoftware.com',

    // API Endpoints
    API_BASE_URL: 'https://polls-api.snapitsoftware.com',
    API_BASE_URL_SNAPITQR: 'https://api.snapitqr.com',
    API_BASE_URL_SNAPITURL: 'https://api.snapiturl.com',
    API_BASE_URL_SNAPITFORMS: 'https://api.snapitforms.com',

    // Authentication Endpoints
    AUTH_BASE_URL: 'https://auth.polls.snapitsoftware.com',

    // Stripe Price IDs - LIVE MODE (Unified 5-tier pricing across all SnapIT apps)
    // Users pay once to unlock features across QR, URL, Forms, and Polls
    STRIPE_PLANS: {
        personal: {
            monthlyPriceId: 'price_1SKiKkRE8RY21XQRngjn0Xzb',
            monthlyAmount: '$9.99',
            name: 'Personal',
            features: [
                'Unlimited Polls',
                'Short URL Creation',
                'QR Code Integration',
                'Basic Analytics',
                'Email Notifications'
            ]
        },
        small: {
            monthlyPriceId: 'price_1SKiKlRE8RY21XQRzRedBJ1S',
            monthlyAmount: '$29.99',
            name: 'Small Business',
            features: [
                'All Personal features',
                'Polls with Form Submission',
                'Custom Branding',
                'Advanced Analytics',
                'Priority Support'
            ]
        },
        medium: {
            monthlyPriceId: 'price_1SKiKmRE8RY21XQR3brcJ2tf',
            monthlyAmount: '$69.99',
            name: 'Medium Business',
            features: [
                'All Small Business features',
                'API Access',
                'White Label Options',
                'Team Collaboration',
                'Custom Domains'
            ]
        },
        large: {
            monthlyPriceId: 'price_1SKiKmRE8RY21XQRSPox4Z75',
            monthlyAmount: '$149.99',
            name: 'Large Business',
            features: [
                'All Medium Business features',
                'Advanced Integrations',
                'Dedicated Account Manager',
                'SLA Guarantee',
                'Custom Development'
            ]
        },
        enterprise: {
            monthlyPriceId: 'price_1SKiKnRE8RY21XQRx6LMuYC7',
            monthlyAmount: '$299.99',
            name: 'Enterprise',
            features: [
                'All Large Business features',
                'Enterprise SLA',
                'On-Premise Deployment Options',
                'Compliance Support (HIPAA, SOC 2)',
                'Unlimited Everything'
            ]
        }
    },

    // Feature flags
    FEATURES: {
        GOOGLE_OAUTH: true,
        SHORT_URLS: true,
        QR_CODES: true,
        FORM_SUBMISSION: true,
        EMAIL_DELIVERY: true,
        STRIPE_BILLING: true
    }
};
