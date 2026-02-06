import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const PRICE_IDS = {
  monthly: process.env.STRIPE_PRICE_ID_MONTHLY!,
  blockAnnual: process.env.STRIPE_PRICE_ID_BLOCK_ANNUAL!,
  blockAnnual2027: process.env.STRIPE_PRICE_ID_BLOCK_ANNUAL_2027!,
};

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const plan = formData.get("plan") as
      | "monthly"
      | "blockAnnual"
      | "blockAnnual2027";

    if (!plan || !PRICE_IDS[plan]) {
      return NextResponse.json({ error: "Invalid plan type" }, { status: 400 });
    }

    const email = session.user.email;
    if (!email) {
      return NextResponse.json({ error: "Email not found" }, { status: 400 });
    }

    // Set checkout mode based on plan type
    const mode = plan.includes("block") ? "payment" : "subscription";

    const stripeSessionOptions: Stripe.Checkout.SessionCreateParams = {
      line_items: [
        {
          price: PRICE_IDS[plan],
          quantity: 1,
        },
      ],
      mode: mode as Stripe.Checkout.SessionCreateParams.Mode,
      success_url: `${request.headers.get("origin")}/thankyou`,
      cancel_url: `${request.headers.get("origin")}/plan`,
      automatic_tax: { enabled: false },
      allow_promotion_codes: true,
      customer_email: email,
    };

    // Only add subscription_data for subscription mode (monthly)
    if (mode === "subscription") {
      stripeSessionOptions.subscription_data = {
        metadata: {
          uid: session.user.id,
        },
      };
    } else {
      // For one-time payments (2026/2027), add metadata at the session level
      stripeSessionOptions.metadata = {
        uid: session.user.id,
        plan: plan,
      };
    }

    const stripeSession =
      await stripe.checkout.sessions.create(stripeSessionOptions);

    if (!stripeSession || !stripeSession.url) {
      return NextResponse.json(
        { error: "Failed to create Stripe checkout session" },
        { status: 400 }
      );
    }

    return NextResponse.redirect(stripeSession.url, 303);
  } catch (error) {
    console.error("Error creating Stripe checkout session:", error);
    return NextResponse.json(
      { error: "Failed to create Stripe checkout session" },
      { status: 500 }
    );
  }
}
