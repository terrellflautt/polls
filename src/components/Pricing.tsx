import React, { useState } from 'react';
import { authService } from '../utils/auth';
import './Pricing.css';

interface PricingTier {
  id: string;
  name: string;
  price: string;
  period: string;
  popular?: boolean;
  features: string[];
}

const API_URL = (window as any).SNAPIT_CONFIG?.API_BASE_URL || 'https://polls-api.snapitsoftware.com';

const pricingTiers: PricingTier[] = [
  {
    id: 'free',
    name: 'FREE',
    price: '$0',
    period: 'forever',
    features: [
      '3 Dynamic QR Codes',
      '10 Short URLs/month',
      '1 Form (50 submissions)',
      'Unlimited Basic Polls',
      'Basic Analytics'
    ]
  },
  {
    id: 'personal',
    name: 'Personal',
    price: '$9.99',
    period: 'month',
    features: [
      '50 Dynamic QR Codes',
      '250 Short URLs/month',
      '5 Forms (500 submissions)',
      'Basic Polls',
      'Basic Analytics'
    ]
  },
  {
    id: 'small',
    name: 'Small Business',
    price: '$29.99',
    period: 'month',
    popular: true,
    features: [
      '150 Dynamic QR Codes',
      '750 Short URLs/month',
      '15 Forms (2K submissions)',
      'Advanced Polls (50)',
      'Advanced Analytics',
      'CSV Export'
    ]
  },
  {
    id: 'medium',
    name: 'Medium Business',
    price: '$69.99',
    period: 'month',
    features: [
      '3 Custom Domains',
      '500 Dynamic QR Codes',
      '2,500 Short URLs/month',
      '50 Forms (10K submissions)',
      'Advanced Polls (200)',
      'Team (5 users)',
      'API Access (5K req/mo)'
    ]
  },
  {
    id: 'large',
    name: 'Large Business',
    price: '$149.99',
    period: 'month',
    features: [
      '10 Custom Domains',
      '2,000 Dynamic QR Codes',
      '10K Short URLs/month',
      '200 Forms (50K submissions)',
      'Advanced Polls (1K)',
      'Team (10 users)',
      'API Access (50K req/mo)',
      'White-label Options'
    ]
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: '$299.99',
    period: 'month',
    features: [
      'UNLIMITED Everything',
      'Unlimited QR Codes',
      'Unlimited Short URLs',
      'Unlimited Forms & Submissions',
      'Unlimited Polls',
      'Unlimited Domains',
      'Unlimited Team Members',
      'Unlimited API Access',
      'Dedicated Support',
      'White-labeling & SLA'
    ]
  }
];

export const Pricing: React.FC = () => {
  const [loading, setLoading] = useState<string | null>(null);
  const [currentPlan, setCurrentPlan] = useState<string>('free');
  const user = authService.getUser();

  const handleUpgrade = async (planId: string) => {
    if (planId === 'free') {
      alert('You are already on the free plan!');
      return;
    }

    if (!user) {
      alert('Please sign in to upgrade your plan');
      return;
    }

    setLoading(planId);
    try {
      const response = await fetch(`${API_URL}/billing/create-checkout-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authService.getAuthHeaders()
        },
        body: JSON.stringify({
          planId: planId,
          successUrl: `${window.location.origin}/account?success=true`,
          cancelUrl: `${window.location.origin}/pricing?canceled=true`
        })
      });

      if (response.ok) {
        const data = await response.json();
        // Redirect to Stripe Checkout
        window.location.href = data.url;
      } else {
        throw new Error('Failed to create checkout session');
      }
    } catch (error) {
      console.error('Upgrade error:', error);
      alert('Failed to start upgrade process. Please try again.');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="pricing-container">
      <div className="pricing-header">
        <h1>Choose Your Plan</h1>
        <p>Unlock features across all SnapIT apps with one subscription</p>
        <div className="pricing-apps">
          <span>SnapIT QR</span>
          <span>•</span>
          <span>SnapIT URL</span>
          <span>•</span>
          <span>SnapIT Forms</span>
          <span>•</span>
          <span>SnapIT Polls</span>
        </div>
      </div>

      <div className="pricing-grid">
        {pricingTiers.map((tier) => (
          <div
            key={tier.id}
            className={`pricing-card ${tier.popular ? 'popular' : ''} ${tier.id === currentPlan ? 'current' : ''}`}
          >
            {tier.popular && <div className="popular-badge">Most Popular</div>}
            {tier.id === currentPlan && <div className="current-badge">Current Plan</div>}

            <div className="pricing-card-header">
              <h3>{tier.name}</h3>
              <div className="price">
                <span className="amount">{tier.price}</span>
                <span className="period">/{tier.period}</span>
              </div>
            </div>

            <ul className="features-list">
              {tier.features.map((feature, index) => (
                <li key={index}>
                  <span className="checkmark">✅</span>
                  {feature}
                </li>
              ))}
            </ul>

            <button
              className={`upgrade-button ${tier.popular ? 'popular-button' : ''}`}
              onClick={() => handleUpgrade(tier.id)}
              disabled={loading !== null || tier.id === currentPlan}
            >
              {loading === tier.id ? 'Processing...' : tier.id === currentPlan ? 'Current Plan' : `Choose ${tier.name}`}
            </button>
          </div>
        ))}
      </div>

      <div className="pricing-footer">
        <h3>All plans include:</h3>
        <div className="pricing-includes">
          <div>✓ Unified dashboard across all apps</div>
          <div>✓ Single sign-on with Google</div>
          <div>✓ Real-time analytics</div>
          <div>✓ 24/7 support</div>
          <div>✓ 30-day money-back guarantee</div>
        </div>
      </div>
    </div>
  );
};
