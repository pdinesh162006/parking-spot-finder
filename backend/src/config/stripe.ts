import Stripe from 'stripe';
import dotenv from 'dotenv';

dotenv.config();

const stripeSecretKey = process.env.STRIPE_SECRET_KEY || 'sk_test_mock_secret';

export const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2023-10-16' as any,
});
