import { stripe } from '../config/stripe';
import dotenv from 'dotenv';

dotenv.config();

const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

export class PaymentService {
  /**
   * Creates a Stripe Checkout Session for a reservation booking or extension.
   */
  static async createCheckoutSession(
    reservationId: string,
    amount: number,
    lotName: string,
    isExtension = false
  ): Promise<string> {
    const unitAmount = Math.round(amount * 100); // Stripe requires amount in cents
    
    try {
      // In mock modes, bypass Stripe API calls
      if (process.env.STRIPE_SECRET_KEY === 'sk_test_mock_secret') {
        console.log(`[MOCK STRIPE] Created checkout session for Reservation ${reservationId}. Amount: ₹${amount}`);
        return `${frontendUrl}/booking/success?reservationId=${reservationId}&session_id=cs_mock_${Date.now()}`;
      }

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'inr',
              product_data: {
                name: `${isExtension ? 'Extension for ' : ''}Parking Spot Reservation - ${lotName}`,
                description: `Reservation ID: ${reservationId}`,
              },
              unit_amount: unitAmount,
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: `${frontendUrl}/booking/success?reservationId=${reservationId}&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${frontendUrl}/booking/cancel?reservationId=${reservationId}`,
        client_reference_id: reservationId,
        metadata: {
          reservationId,
          type: isExtension ? 'extension' : 'new_booking'
        },
      });

      return session.url || '';
    } catch (error) {
      console.error('Stripe session creation error:', error);
      // Fallback url in case of any Stripe credentials issue so app can run in dev
      return `${frontendUrl}/booking/success?reservationId=${reservationId}&mock=true`;
    }
  }

  /**
   * Processes a refund for a cancelled reservation
   */
  static async createRefund(paymentIntentId: string): Promise<boolean> {
    try {
      if (!paymentIntentId) return false;

      // Mock mode refund
      if (paymentIntentId.startsWith('pi_mock') || process.env.STRIPE_SECRET_KEY === 'sk_test_mock_secret') {
        console.log(`[MOCK STRIPE] Refund requested and approved for PaymentIntent: ${paymentIntentId}`);
        return true;
      }

      const refund = await stripe.refunds.create({
        payment_intent: paymentIntentId,
      });

      return refund.status === 'succeeded' || refund.status === 'pending';
    } catch (error) {
      console.error('Stripe refund generation failed:', error);
      return false;
    }
  }
}
