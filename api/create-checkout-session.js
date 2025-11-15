const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST method
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      error: 'Method not allowed',
      message: 'Only POST requests are supported' 
    });
  }

  try {
    let body;
    try {
      body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    } catch (parseError) {
      return res.status(400).json({ 
        error: 'Invalid JSON in request body' 
      });
    }

    const { price, productName, successUrl, cancelUrl } = body;

    console.log('Received request with price:', price);

    // Validate required fields
    if (!price || price <= 0) {
      return res.status(400).json({ 
        error: 'Valid price is required and must be greater than 0',
        received: price
      });
    }

    // Validate Stripe secret key
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error('STRIPE_SECRET_KEY environment variable is not set');
      return res.status(500).json({ 
        error: 'Server configuration error: Stripe secret key missing' 
      });
    }

    // Determine base URL for success/cancel URLs
    const baseUrl = req.headers.origin || req.headers.referer || 'https://' + req.headers.host;
    
    // Create Stripe checkout session
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
      success_url: successUrl || `${baseUrl}/success.html`,
      cancel_url: cancelUrl || `${baseUrl}/cancel.html`,
      metadata: {
        product_name: productName || 'Business Consultation',
        customer_price: price.toString()
      }
    });

    console.log('✅ Checkout session created successfully:', session.id);
    
    return res.status(200).json({ 
      sessionId: session.id,
      message: 'Checkout session created successfully'
    });

  } catch (error) {
    console.error('❌ Stripe API error:', error);
    
    return res.status(500).json({ 
      error: error.message || 'Failed to create checkout session',
      code: error.type || 'unknown_error',
      details: 'Check Stripe secret key and request parameters'
    });
  }
};
