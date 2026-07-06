
-- Subscriptions
CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  stripe_subscription_id text NOT NULL UNIQUE,
  stripe_customer_id text NOT NULL,
  product_id text NOT NULL,
  price_id text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean DEFAULT false,
  environment text NOT NULL DEFAULT 'sandbox',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX idx_subscriptions_stripe_id ON public.subscriptions(stripe_subscription_id);
GRANT SELECT ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own subscription" ON public.subscriptions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Service role manages subscriptions" ON public.subscriptions FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Ticket orders (dynamic pricing per event ticket)
CREATE TABLE public.ticket_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  buyer_email text,
  event_id uuid REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  ticket_id uuid REFERENCES public.tickets(id) ON DELETE SET NULL,
  ticket_type text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  unit_amount integer NOT NULL,
  total_amount integer NOT NULL,
  currency text NOT NULL DEFAULT 'gbp',
  stripe_session_id text UNIQUE,
  stripe_payment_intent_id text,
  status text NOT NULL DEFAULT 'pending',
  environment text NOT NULL DEFAULT 'sandbox',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_ticket_orders_buyer ON public.ticket_orders(buyer_id);
CREATE INDEX idx_ticket_orders_event ON public.ticket_orders(event_id);
GRANT SELECT ON public.ticket_orders TO authenticated;
GRANT ALL ON public.ticket_orders TO service_role;
ALTER TABLE public.ticket_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Buyers view own ticket orders" ON public.ticket_orders FOR SELECT TO authenticated USING (auth.uid() = buyer_id);
CREATE POLICY "Organisers view ticket orders for their events" ON public.ticket_orders FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.events e WHERE e.id = ticket_orders.event_id AND e.organiser_id = auth.uid())
);
CREATE POLICY "Service role manages ticket orders" ON public.ticket_orders FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE TRIGGER update_ticket_orders_updated_at BEFORE UPDATE ON public.ticket_orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Event boost purchases
CREATE TABLE public.event_boost_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organiser_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  event_id uuid REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  tier text NOT NULL,
  price_id text NOT NULL,
  amount integer NOT NULL,
  currency text NOT NULL DEFAULT 'gbp',
  duration_hours integer NOT NULL,
  active_from timestamptz,
  active_until timestamptz,
  stripe_session_id text UNIQUE,
  stripe_payment_intent_id text,
  status text NOT NULL DEFAULT 'pending',
  environment text NOT NULL DEFAULT 'sandbox',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_boost_purchases_event ON public.event_boost_purchases(event_id);
CREATE INDEX idx_boost_purchases_organiser ON public.event_boost_purchases(organiser_id);
GRANT SELECT ON public.event_boost_purchases TO authenticated;
GRANT ALL ON public.event_boost_purchases TO service_role;
ALTER TABLE public.event_boost_purchases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Organisers view own boost purchases" ON public.event_boost_purchases FOR SELECT TO authenticated USING (auth.uid() = organiser_id);
CREATE POLICY "Service role manages boost purchases" ON public.event_boost_purchases FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE TRIGGER update_boost_purchases_updated_at BEFORE UPDATE ON public.event_boost_purchases FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
