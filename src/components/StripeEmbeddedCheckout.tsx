import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import { supabase } from "@/integrations/supabase/client";

export type CheckoutRequest =
  | {
      mode: "subscription";
      priceId: string;
      customerEmail?: string;
      userId?: string;
      returnUrl: string;
    }
  | {
      mode: "boost";
      tier: "24h" | "7d" | "14d" | "30d";
      eventId: string;
      customerEmail?: string;
      userId: string;
      returnUrl: string;
    }
  | {
      mode: "tickets";
      items: Array<{
        ticket_id?: string;
        ticket_type: string;
        event_id: string;
        event_title?: string;
        unit_amount: number;
        quantity: number;
      }>;
      customerEmail?: string;
      userId?: string;
      returnUrl: string;
    };

export function StripeEmbeddedCheckout(props: CheckoutRequest) {
  const fetchClientSecret = async (): Promise<string> => {
    const { data, error } = await supabase.functions.invoke("create-checkout", {
      body: { ...props, environment: getStripeEnvironment() },
    });
    if (error || !data?.clientSecret) {
      throw new Error(error?.message || data?.error || "Failed to create checkout session");
    }
    return data.clientSecret;
  };

  return (
    <div id="checkout">
      <EmbeddedCheckoutProvider stripe={getStripe()} options={{ fetchClientSecret }}>
        <EmbeddedCheckout />
      </EmbeddedCheckoutProvider>
    </div>
  );
}
