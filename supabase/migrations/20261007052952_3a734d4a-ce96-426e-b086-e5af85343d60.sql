CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;
CREATE OR REPLACE FUNCTION private.is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT private.has_role(auth.uid(), 'admin')
$$;
REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.is_admin() TO authenticated, service_role;

DROP POLICY "Own profile read" ON public.profiles;
CREATE POLICY "Own profile read" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid() OR private.is_admin());

DROP POLICY "Public reads published" ON public.products;
CREATE POLICY "Anon reads published" ON public.products FOR SELECT TO anon USING (status = 'published');
CREATE POLICY "Users read published or admin all" ON public.products FOR SELECT TO authenticated USING (status = 'published' OR private.is_admin());
DROP POLICY "Admin insert products" ON public.products;
CREATE POLICY "Admin insert products" ON public.products FOR INSERT TO authenticated WITH CHECK (private.is_admin());
DROP POLICY "Admin update products" ON public.products;
CREATE POLICY "Admin update products" ON public.products FOR UPDATE TO authenticated USING (private.is_admin()) WITH CHECK (private.is_admin());

DROP POLICY "Own or admin orders" ON public.orders;
CREATE POLICY "Own or admin orders" ON public.orders FOR SELECT TO authenticated USING (user_id = auth.uid() OR private.is_admin());
DROP POLICY "Own or admin order items" ON public.order_items;
CREATE POLICY "Own or admin order items" ON public.order_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND (o.user_id = auth.uid() OR private.is_admin())));
DROP POLICY "Own or admin history" ON public.order_status_history;
CREATE POLICY "Own or admin history" ON public.order_status_history FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND (o.user_id = auth.uid() OR private.is_admin())));
DROP POLICY "Admin inventory read" ON public.inventory_changes;
CREATE POLICY "Admin inventory read" ON public.inventory_changes FOR SELECT TO authenticated USING (private.is_admin());

-- Re-point action functions at private helpers
CREATE OR REPLACE FUNCTION public.admin_update_order(p_order_id uuid, p_status public.order_status, p_courier text, p_tracking text, p_note text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_old public.order_status; v_uid uuid := auth.uid();
BEGIN
  IF NOT private.has_role(v_uid, 'admin') THEN RAISE EXCEPTION 'Not authorised' USING ERRCODE = '42501'; END IF;
  SELECT status INTO v_old FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF v_old = 'cancelled' AND p_status <> 'cancelled' THEN RAISE EXCEPTION 'Cancelled orders cannot be reopened'; END IF;
  IF v_old = 'delivered' AND p_status = 'cancelled' THEN RAISE EXCEPTION 'Delivered orders cannot be cancelled'; END IF;
  IF char_length(coalesce(p_courier,'')) > 80 OR char_length(coalesce(p_tracking,'')) > 80 OR char_length(coalesce(p_note,'')) > 300 THEN
    RAISE EXCEPTION 'Text too long'; END IF;
  IF p_status = 'cancelled' AND v_old <> 'cancelled' THEN
    WITH upd AS (
      UPDATE public.products p SET stock = p.stock + i.quantity, updated_at = now()
      FROM public.order_items i WHERE i.order_id = p_order_id AND i.product_id = p.id
      RETURNING p.id, i.quantity, p.stock)
    INSERT INTO public.inventory_changes (product_id, delta, new_stock, reason, order_id, changed_by)
    SELECT id, quantity, stock, 'order cancelled', p_order_id, v_uid FROM upd;
    UPDATE public.orders SET payment_status = 'refunded_demo' WHERE id = p_order_id;
  END IF;
  UPDATE public.orders SET status = p_status,
    courier = nullif(btrim(coalesce(p_courier,'')),''), tracking_number = nullif(btrim(coalesce(p_tracking,'')),''),
    updated_at = now() WHERE id = p_order_id;
  IF p_status <> v_old OR nullif(btrim(coalesce(p_note,'')),'') IS NOT NULL THEN
    INSERT INTO public.order_status_history (order_id, status, note, changed_by) VALUES (p_order_id, p_status, nullif(btrim(coalesce(p_note,'')),''), v_uid);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.admin_adjust_stock(p_product_id integer, p_delta integer, p_reason text)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_new int; v_uid uuid := auth.uid();
BEGIN
  IF NOT private.has_role(v_uid, 'admin') THEN RAISE EXCEPTION 'Not authorised' USING ERRCODE = '42501'; END IF;
  IF p_delta = 0 OR abs(p_delta) > 10000 THEN RAISE EXCEPTION 'Invalid stock change'; END IF;
  IF char_length(btrim(coalesce(p_reason,''))) NOT BETWEEN 2 AND 200 THEN RAISE EXCEPTION 'Please give a reason'; END IF;
  SELECT stock + p_delta INTO v_new FROM public.products WHERE id = p_product_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Product not found'; END IF;
  IF v_new < 0 THEN RAISE EXCEPTION 'Stock cannot go below zero'; END IF;
  UPDATE public.products SET stock = v_new, updated_at = now() WHERE id = p_product_id;
  INSERT INTO public.inventory_changes (product_id, delta, new_stock, reason, changed_by) VALUES (p_product_id, p_delta, v_new, btrim(p_reason), v_uid);
  RETURN v_new;
END $$;

DROP FUNCTION public.is_admin();
DROP FUNCTION public.has_role(uuid, public.app_role);

-- Signed-in check helper for the UI (returns only the caller's own flag)
CREATE OR REPLACE FUNCTION public.am_i_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
$$;
REVOKE ALL ON FUNCTION public.am_i_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.am_i_admin() TO authenticated;