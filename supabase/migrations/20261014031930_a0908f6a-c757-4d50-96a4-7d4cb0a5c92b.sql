ALTER TABLE public.orders DROP CONSTRAINT orders_payment_status_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_payment_status_check CHECK (payment_status IN ('demo_paid','refunded_demo','cod_pending','cod_collected','cod_cancelled'));

CREATE OR REPLACE FUNCTION public.admin_update_order(p_order_id uuid, p_status order_status, p_courier text, p_tracking text, p_note text)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_old public.order_status; v_method text; v_uid uuid := auth.uid();
BEGIN
  IF NOT private.has_role(v_uid, 'admin') THEN RAISE EXCEPTION 'Not authorised' USING ERRCODE = '42501'; END IF;
  SELECT status, payment_method INTO v_old, v_method FROM public.orders WHERE id = p_order_id FOR UPDATE;
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
    UPDATE public.orders SET payment_status = CASE WHEN v_method = 'cod' THEN 'cod_cancelled' ELSE 'refunded_demo' END WHERE id = p_order_id;
  END IF;
  IF p_status = 'delivered' AND v_method = 'cod' THEN
    UPDATE public.orders SET payment_status = 'cod_collected' WHERE id = p_order_id;
  END IF;
  UPDATE public.orders SET status = p_status,
    courier = nullif(btrim(coalesce(p_courier,'')),''), tracking_number = nullif(btrim(coalesce(p_tracking,'')),''),
    updated_at = now() WHERE id = p_order_id;
  IF p_status <> v_old OR nullif(btrim(coalesce(p_note,'')),'') IS NOT NULL THEN
    INSERT INTO public.order_status_history (order_id, status, note, changed_by) VALUES (p_order_id, p_status, nullif(btrim(coalesce(p_note,'')),''), v_uid);
  END IF;
END $function$;