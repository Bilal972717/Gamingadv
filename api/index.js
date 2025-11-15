const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const cors = require('cors');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Create Stripe checkout session
app.post('/create-checkout-session', async (req, res) => {
  const { price, productName, successUrl, cancelUrl } = req.body;
  
  try {
    // Validate input
    if (!price || price <= 0) {
      return res.status(400).json({ error: 'Valid price is required' });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: productName || 'Business Process Consultation',
              description: 'Expert business consultation with dynamic pricing'
            },
            unit_amount: Math.round(price * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: successUrl || `${req.headers.origin}/success.html`,
      cancel_url: cancelUrl || `${req.headers.origin}/cancel.html`,
      metadata: {
        product_name: productName || 'Business Consultation',
        customer_price: price.toString()
      }
    });

    console.log('Checkout session created:', session.id);
    res.json({ sessionId: session.id });
    
  } catch (error) {
    console.error('Stripe error:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to create checkout session' 
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Handle root route
app.get('/', (req, res) => {
  res.json({ 
    message: 'CoreTech BPO Backend API',
    endpoints: {
      'POST /create-checkout-session': 'Create Stripe checkout session',
      'GET /health': 'Health check'
    }
  });
});

// Export the app for Vercel
module.exports = app;
