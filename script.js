// server.js
const express = require('express');
const stripe = require('stripe')('sk_test_51ST4UF40HwZJ2DP83rA9XygygOdiVWx4MLzYvI7EElhrBzKX3sNh5CTc6iX6fBJuaSTE4VfVvVxOUOgoTq8L3uiI005sdONyGr');
const nodemailer = require('nodemailer');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
app.use(bodyParser.json());
app.use(cors());

// Email configuration
const transporter = nodemailer.createTransport({
  service: 'gmail', // or your email service
  auth: {
    user: 'abdullahadress9@gmail.com',
    pass: 'Ab8411@@1122'
  }
});

// Create Stripe checkout session
app.post('/create-checkout-session', async (req, res) => {
  const { price, productName, successUrl, cancelUrl } = req.body;
  
  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: productName,
            },
            unit_amount: Math.round(price * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: successUrl || `${req.headers.origin}/success.html`,
      cancel_url: cancelUrl || `${req.headers.origin}/cancel.html`,
    });

    res.json({ sessionId: session.id }); // Make sure this matches what HTML expects
  } catch (error) {
    console.error('Stripe error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Stripe webhook for completed payments
app.post('/webhook', express.raw({type: 'application/json'}), (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the checkout.session.completed event
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    
    // Send email notification
    sendOrderEmail(session);
  }

  res.json({received: true});
});

// Function to send order email
function sendOrderEmail(session) {
  const mailOptions = {
    from: 'your_email@gmail.com',
    to: session.customer_email,
    subject: 'Order Confirmation',
    html: `
      <h2>Thank you for your order!</h2>
      <p>Your order has been confirmed and will be processed shortly.</p>
      <p><strong>Order ID:</strong> ${session.id}</p>
      <p><strong>Amount Paid:</strong> $${(session.amount_total / 100).toFixed(2)}</p>
      <br>
      <p>We'll notify you when your item ships.</p>
    `
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.log('Error sending email:', error);
    } else {
      console.log('Email sent:', info.response);
    }
  });
}

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
