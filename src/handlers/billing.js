const { DynamoDB } = require('aws-sdk');
const Stripe = require('stripe');

const dynamodb = new DynamoDB.DocumentClient();
const USERS_TABLE = process.env.USERS_TABLE;
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

const stripe = new Stripe(STRIPE_SECRET_KEY);

// Stripe Price IDs matching config.js
const PRICE_IDS = {
  personal: 'price_1SKiKkRE8RY21XQRngjn0Xzb',
  small: 'price_1SKiKlRE8RY21XQRzRedBJ1S',
  medium: 'price_1SKiKmRE8RY21XQR3brcJ2tf',
  large: 'price_1SKiKmRE8RY21XQRSPox4Z75',
  enterprise: 'price_1SKiKnRE8RY21XQRx6LMuYC7'
};

/**
 * Create Stripe Checkout Session
 * POST /billing/create-checkout-session
 * Requires authentication
 */
exports.createCheckoutSession = async (event) => {
  try {
    const userId = event.requestContext.authorizer.userId;
    const body = JSON.parse(event.body);
    const { planId, successUrl, cancelUrl } = body;

    if (!planId || !PRICE_IDS[planId]) {
      return {
        statusCode: 400,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Invalid plan ID' })
      };
    }

    // Get user from database
    const userResult = await dynamodb.get({
      TableName: USERS_TABLE,
      Key: { userId }
    }).promise();

    if (!userResult.Item) {
      return {
        statusCode: 404,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'User not found' })
      };
    }

    const user = userResult.Item;

    // Create or retrieve Stripe customer
    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          userId: userId,
          source: 'polls.snapitsoftware.com'
        }
      });
      customerId = customer.id;

      // Save customer ID to user record
      await dynamodb.update({
        TableName: USERS_TABLE,
        Key: { userId },
        UpdateExpression: 'SET stripeCustomerId = :customerId',
        ExpressionAttributeValues: {
          ':customerId': customerId
        }
      }).promise();
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{
        price: PRICE_IDS[planId],
        quantity: 1
      }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        userId: userId,
        planId: planId
      }
    });

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        url: session.url,
        sessionId: session.id
      })
    };
  } catch (error) {
    console.error('Create checkout session error:', error);
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Failed to create checkout session' })
    };
  }
};

/**
 * Get user's subscription status
 * GET /billing/subscription
 * Requires authentication
 */
exports.getSubscription = async (event) => {
  try {
    const userId = event.requestContext.authorizer.userId;

    // Get user from database
    const userResult = await dynamodb.get({
      TableName: USERS_TABLE,
      Key: { userId }
    }).promise();

    if (!userResult.Item) {
      return {
        statusCode: 404,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'User not found' })
      };
    }

    const user = userResult.Item;

    // If user has no Stripe customer ID, they're on free plan
    if (!user.stripeCustomerId || !user.stripeSubscriptionId) {
      return {
        statusCode: 200,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({
          plan: 'free',
          status: 'active',
          features: {
            qrCodes: { limit: 3, used: user.usageLimits?.dynamicQRs?.used || 0 },
            shortUrls: { limit: 10, used: user.usageLimits?.shortURLs?.used || 0 },
            forms: { limit: 1, used: 0 },
            polls: { limit: -1, used: 0 }
          }
        })
      };
    }

    // Get subscription from Stripe
    const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        plan: user.plan || 'free',
        status: subscription.status,
        nextBillingDate: subscription.current_period_end * 1000,
        cancelAt: subscription.cancel_at ? subscription.cancel_at * 1000 : null,
        features: user.usageLimits || {}
      })
    };
  } catch (error) {
    console.error('Get subscription error:', error);
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Failed to get subscription' })
    };
  }
};

/**
 * Stripe Webhook Handler
 * POST /billing/webhook
 * Handles Stripe events (subscription created, updated, canceled)
 */
exports.webhook = async (event) => {
  try {
    const sig = event.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let stripeEvent;
    try {
      stripeEvent = stripe.webhooks.constructEvent(event.body, sig, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid signature' })
      };
    }

    // Handle the event
    switch (stripeEvent.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(stripeEvent.data.object);
        break;

      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        await handleSubscriptionChange(stripeEvent.data.object);
        break;

      default:
        console.log(`Unhandled event type: ${stripeEvent.type}`);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ received: true })
    };
  } catch (error) {
    console.error('Webhook error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Webhook handler failed' })
    };
  }
};

/**
 * Handle successful checkout
 */
async function handleCheckoutCompleted(session) {
  const userId = session.metadata.userId;
  const planId = session.metadata.planId;
  const subscriptionId = session.subscription;

  // Update user record with subscription details
  await dynamodb.update({
    TableName: USERS_TABLE,
    Key: { userId },
    UpdateExpression: 'SET plan = :plan, stripeSubscriptionId = :subId, updatedAt = :now',
    ExpressionAttributeValues: {
      ':plan': planId,
      ':subId': subscriptionId,
      ':now': Date.now()
    }
  }).promise();

  console.log(`User ${userId} upgraded to ${planId}`);
}

/**
 * Handle subscription changes (updated or canceled)
 */
async function handleSubscriptionChange(subscription) {
  const customerId = subscription.customer;

  // Find user by Stripe customer ID
  const scanResult = await dynamodb.scan({
    TableName: USERS_TABLE,
    FilterExpression: 'stripeCustomerId = :customerId',
    ExpressionAttributeValues: {
      ':customerId': customerId
    },
    Limit: 1
  }).promise();

  if (scanResult.Items && scanResult.Items.length > 0) {
    const user = scanResult.Items[0];

    if (subscription.status === 'canceled' || subscription.cancel_at_period_end) {
      // Downgrade to free plan
      await dynamodb.update({
        TableName: USERS_TABLE,
        Key: { userId: user.userId },
        UpdateExpression: 'SET plan = :plan, updatedAt = :now',
        ExpressionAttributeValues: {
          ':plan': 'free',
          ':now': Date.now()
        }
      }).promise();

      console.log(`User ${user.userId} downgraded to free`);
    }
  }
}
