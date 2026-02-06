import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const userEmail = session.user.email || undefined;

    // First, try to find an active or trialing subscription by our stored uid metadata
    const [activeSubs, trialSubs] = await Promise.all([
      stripe.subscriptions.search({
        query: `metadata["uid"]:"${userId}" AND status:"active"`,
        limit: 1,
      }),
      stripe.subscriptions.search({
        query: `metadata["uid"]:"${userId}" AND status:"trialing"`,
        limit: 1,
      }),
    ]);

    let stripeCustomerId: string | null = null;

    const subscription = activeSubs.data?.[0] || trialSubs.data?.[0] || null;
    if (subscription?.customer) {
      stripeCustomerId =
        typeof subscription.customer === "string"
          ? subscription.customer
          : subscription.customer.id;
    }

    // Fallback: look up a customer by email if we didn't find via subscription
    if (!stripeCustomerId && userEmail) {
      const customers = await stripe.customers.list({
        email: userEmail,
        limit: 1,
      });
      if (customers.data.length > 0) {
        stripeCustomerId = customers.data[0].id;
      }
    }

    if (!stripeCustomerId) {
      return NextResponse.json(
        { error: "Stripe customer not found for this user" },
        { status: 404 }
      );
    }

    const origin =
      request.headers.get("origin") || process.env.NEXT_PUBLIC_APP_URL || "";
    const returnUrl = origin ? `${origin}` : undefined;

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      ...(returnUrl ? { return_url: returnUrl } : {}),
    });

    if (!portalSession?.url) {
      return NextResponse.json(
        { error: "Failed to create Stripe billing portal session" },
        { status: 500 }
      );
    }

    return NextResponse.redirect(portalSession.url, { status: 303 });
  } catch (error) {
    console.error("Error creating Stripe billing portal session:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
