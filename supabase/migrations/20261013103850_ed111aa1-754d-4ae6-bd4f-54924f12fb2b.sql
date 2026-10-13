CREATE TABLE public.store_settings (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  shipping_fee_paise int NOT NULL DEFAULT 9900 CHECK (shipping_fee_paise BETWEEN 0 AND 1000000),
  free_shipping_min_paise int NOT NULL DEFAULT 299900 CHECK (free_shipping_min_paise >= 0),
  tax_percent numeric(5,2) NOT NULL DEFAULT 5 CHECK (tax_percent BETWEEN 0 AND 28),
  cod_enabled boolean NOT NULL DEFAULT true,
  cod_fee_paise int NOT NULL DEFAULT 4900 CHECK (cod_fee_paise BETWEEN 0 AND 100000),
  cod_max_paise int NOT NULL DEFAULT 1500000 CHECK (cod_max_paise >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.store_settings TO anon, authenticated;
GRANT UPDATE (shipping_fee_paise, free_shipping_min_paise, tax_percent, cod_enabled, cod_fee_paise, cod_max_paise, updated_at) ON public.store_settings TO authenticated;
GRANT ALL ON public.store_settings TO service_role;
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads settings" ON public.store_settings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admin updates settings" ON public.store_settings FOR UPDATE TO authenticated USING (private.is_admin()) WITH CHECK (private.is_admin());
INSERT INTO public.store_settings (id) VALUES (1);

CREATE TABLE public.wishlist_items (
  user_id uuid NOT NULL,
  product_id int NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, product_id)
);
GRANT SELECT, INSERT, DELETE ON public.wishlist_items TO authenticated;
GRANT ALL ON public.wishlist_items TO service_role;
ALTER TABLE public.wishlist_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own wishlist" ON public.wishlist_items FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

ALTER TABLE public.orders
  ADD COLUMN payment_method text NOT NULL DEFAULT 'demo' CHECK (payment_method IN ('demo','cod')),
  ADD COLUMN subtotal_paise int NOT NULL DEFAULT 0,
  ADD COLUMN shipping_paise int NOT NULL DEFAULT 0,
  ADD COLUMN tax_paise int NOT NULL DEFAULT 0,
  ADD COLUMN cod_fee_paise int NOT NULL DEFAULT 0,
  ADD COLUMN pincode text NOT NULL DEFAULT '',
  ADD COLUMN cancel_requested boolean NOT NULL DEFAULT false;

DROP FUNCTION public.place_order(text, text, text, text, uuid);
CREATE FUNCTION public.place_order(p_name text, p_email text, p_phone text, p_address text, p_pincode text, p_payment_method text, p_idempotency_key uuid)
RETURNS TABLE(order_id uuid, order_number text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_order public.orders%ROWTYPE;
  s public.store_settings%ROWTYPE;
  v_sub bigint := 0; v_ship int := 0; v_tax int := 0; v_cod int := 0; v_total bigint;
  v_count int; r record;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Please sign in' USING ERRCODE = '42501'; END IF;
  IF p_idempotency_key IS NULL THEN RAISE EXCEPTION 'Missing checkout key'; END IF;
  p_name := btrim(coalesce(p_name,'')); p_email := btrim(coalesce(p_email,''));
  p_phone := btrim(coalesce(p_phone,'')); p_address := btrim(coalesce(p_address,'')); p_pincode := btrim(coalesce(p_pincode,''));
  IF char_length(p_name) NOT BETWEEN 2 AND 120 THEN RAISE EXCEPTION 'Please enter your name'; END IF;
  IF p_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' OR char_length(p_email) > 255 THEN RAISE EXCEPTION 'Please enter a valid email'; END IF;
  IF p_phone !~ '^[0-9+ -]{7,20}$' THEN RAISE EXCEPTION 'Please enter a valid phone number'; END IF;
  IF char_length(p_address) NOT BETWEEN 10 AND 500 THEN RAISE EXCEPTION 'Please enter your full delivery address'; END IF;
  IF p_pincode !~ '^[1-9][0-9]{5}$' THEN RAISE EXCEPTION 'Please enter a valid 6-digit PIN code'; END IF;
  IF p_payment_method NOT IN ('demo','cod') THEN RAISE EXCEPTION 'Choose a payment method'; END IF;

  SELECT * INTO v_order FROM public.orders o WHERE o.user_id = v_uid AND o.idempotency_key = p_idempotency_key;
  IF FOUND THEN RETURN QUERY SELECT v_order.id, v_order.order_number; RETURN; END IF;

  SELECT * INTO s FROM public.store_settings WHERE id = 1;
  SELECT count(*) INTO v_count FROM public.cart_items c WHERE c.user_id = v_uid;
  IF v_count = 0 THEN RAISE EXCEPTION 'Your bag is empty'; END IF;

  FOR r IN SELECT c.product_id, c.quantity, p.title, p.price_paise, p.stock, p.status
           FROM public.cart_items c JOIN public.products p ON p.id = c.product_id
           WHERE c.user_id = v_uid ORDER BY c.product_id FOR UPDATE OF p LOOP
    IF r.status <> 'published' THEN RAISE EXCEPTION '% is no longer available', r.title; END IF;
    IF r.quantity <= 0 OR r.quantity > 10 THEN RAISE EXCEPTION 'Invalid quantity'; END IF;
    IF r.stock < r.quantity THEN RAISE EXCEPTION 'Only % left of %', r.stock, r.title; END IF;
    v_sub := v_sub + r.price_paise::bigint * r.quantity;
  END LOOP;
  IF v_sub > 100000000 THEN RAISE EXCEPTION 'Order too large'; END IF;
  v_ship := CASE WHEN v_sub >= s.free_shipping_min_paise THEN 0 ELSE s.shipping_fee_paise END;
  v_tax := round(v_sub * s.tax_percent / 100)::int;
  IF p_payment_method = 'cod' THEN
    IF NOT s.cod_enabled THEN RAISE EXCEPTION 'Cash on Delivery is not available right now'; END IF;
    IF v_sub > s.cod_max_paise THEN RAISE EXCEPTION 'Cash on Delivery is not available for orders this large'; END IF;
    v_cod := s.cod_fee_paise;
  END IF;
  v_total := v_sub + v_ship + v_tax + v_cod;

  INSERT INTO public.orders (order_number, user_id, idempotency_key, customer_name, email, phone, address, pincode,
    subtotal_paise, shipping_paise, tax_paise, cod_fee_paise, total_paise, payment_method, payment_status)
  VALUES ('JT-' || to_char(now(),'YYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,6)),
    v_uid, p_idempotency_key, p_name, p_email, p_phone, p_address, p_pincode,
    v_sub::int, v_ship, v_tax, v_cod, v_total::int, p_payment_method,
    CASE WHEN p_payment_method = 'cod' THEN 'cod_pending' ELSE 'demo_paid' END)
  RETURNING * INTO v_order;

  INSERT INTO public.order_items (order_id, product_id, product_title, unit_price_paise, quantity, line_total_paise)
  SELECT v_order.id, p.id, p.title, p.price_paise, c.quantity, p.price_paise * c.quantity
  FROM public.cart_items c JOIN public.products p ON p.id = c.product_id WHERE c.user_id = v_uid;

  WITH upd AS (
    UPDATE public.products p SET stock = p.stock - c.quantity, updated_at = now()
    FROM public.cart_items c WHERE c.user_id = v_uid AND c.product_id = p.id
    RETURNING p.id, c.quantity, p.stock)
  INSERT INTO public.inventory_changes (product_id, delta, new_stock, reason, order_id, changed_by)
  SELECT id, -quantity, stock, 'order', v_order.id, v_uid FROM upd;

  INSERT INTO public.order_status_history (order_id, status, note, changed_by)
  VALUES (v_order.id, 'pending', CASE WHEN p_payment_method='cod' THEN 'Order placed (Cash on Delivery)' ELSE 'Order placed (demo payment)' END, v_uid);
  DELETE FROM public.cart_items c WHERE c.user_id = v_uid;
  RETURN QUERY SELECT v_order.id, v_order.order_number;
END $$;
REVOKE ALL ON FUNCTION public.place_order(text,text,text,text,text,text,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.place_order(text,text,text,text,text,text,uuid) TO authenticated;

CREATE FUNCTION public.request_cancel(p_order_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_uid uuid := auth.uid(); v_status public.order_status;
BEGIN
  SELECT status INTO v_status FROM public.orders WHERE id = p_order_id AND user_id = v_uid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF v_status NOT IN ('pending','confirmed') THEN RAISE EXCEPTION 'This order can no longer be cancelled online'; END IF;
  UPDATE public.orders SET cancel_requested = true, updated_at = now() WHERE id = p_order_id;
  INSERT INTO public.order_status_history (order_id, status, note, changed_by) VALUES (p_order_id, v_status, 'Customer requested cancellation', v_uid);
END $$;
REVOKE ALL ON FUNCTION public.request_cancel(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_cancel(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.admin_update_order(uuid, public.order_status, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_update_order(uuid, public.order_status, text, text, text) TO authenticated;
REVOKE ALL ON FUNCTION public.admin_adjust_stock(int, int, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_adjust_stock(int, int, text) TO authenticated;
CREATE OR REPLACE FUNCTION public.clear_cancel_flag() RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN IF NEW.status IS DISTINCT FROM OLD.status THEN NEW.cancel_requested := false; END IF; RETURN NEW; END $$;
CREATE TRIGGER orders_clear_cancel BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.clear_cancel_flag();