const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

module.exports = async (req, res) => {
  console.log('=== CREATE CHECKOUT SESSION REQUEST ===');
  console.log('Method:', req.method);
  console.log('Headers:', req.headers);
  console.log('Body:', req.body);

  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    console.log('Handling OPTIONS request');
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    console.log('Method not allowed:', req.method);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { price, productName } = req.body;
    
    console.log('Processing request - Price:', price, 'Product:', productName);
    
    if (!price || price <= 0) {
      console.log('Invalid price:', price);
      return res.status(400).json({ error: 'Valid price is required' });
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      console.log('STRIPE_SECRET_KEY is missing');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    console.log('Creating Stripe session...');
    
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: productName || 'Business Process Consultation',
              description: 'Expert business consultation service with dynamic pricing',
            },
            unit_amount: Math.round(price * 100),
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${req.headers.origin || 'https://your-app.vercel.app'}/success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.origin || 'https://your-app.vercel.app'}/cancel.html`,
    });

    console.log('Stripe session created successfully:', session.id);
    
    res.json({ 
      sessionId: session.id,
      url: session.url 
    });

  } catch (error) {
    console.error('STRIPE ERROR DETAILS:');
    console.error('Error type:', error.type);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
    res.status(500).json({ 
      error: error.message,
      type: error.type,
      code: error.code
    });
  }
};
