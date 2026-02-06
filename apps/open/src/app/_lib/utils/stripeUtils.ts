import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

/**
 * Creates a payment link with user ID metadata
 * @param userId - The user ID to associate with the payment
 * @param priceId - The Stripe price ID for the product
 * @param customerEmail - Optional customer email to prefill
 * @param isSubscription - Whether the payment is for a subscription
 * @returns The payment link URL
 */
export async function createPaymentLink(
  userId: string, 
  priceId: string, 
  customerEmail?: string,
  isSubscription: boolean = true
) {
  try {
    const paymentLinkParams: Stripe.PaymentLinkCreateParams = {
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      metadata: {
        uid: userId // Store the user ID in payment link metadata
      }
    };
    
    // Add subscription_data with metadata only for subscription products
    // and only if we're sure the price is a recurring price
    if (isSubscription) {
      // First, retrieve the price to check if it's recurring
      const price = await stripe.prices.retrieve(priceId);
      
      if (price.type === 'recurring') {
        paymentLinkParams.subscription_data = {
          metadata: {
            uid: userId // This will be added to the subscription object
          }
        };
      }
    }
        
    const paymentLink = await stripe.paymentLinks.create(paymentLinkParams);
    
    return paymentLink.url;
  } catch (error) {
    console.error('Error creating payment link:', error);
    throw error;
  }
} 