-- Roles
CREATE TYPE public.app_role AS ENUM ('admin','customer');
CREATE TYPE public.order_status AS ENUM ('pending','confirmed','packed','shipped','delivered','cancelled');
CREATE TYPE public.product_status AS ENUM ('published','hidden','archived');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(), 'admin')
$$;
REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated, service_role;

-- Profiles
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,
  full_name text NOT NULL DEFAULT '' CHECK (char_length(full_name) <= 120),
  phone text NOT NULL DEFAULT '' CHECK (char_length(phone) <= 20),
  address text NOT NULL DEFAULT '' CHECK (char_length(address) <= 500),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.profiles TO authenticated;
GRANT UPDATE (full_name, phone, address, updated_at) ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own profile read" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid() OR public.is_admin());
CREATE POLICY "Own profile update" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name) VALUES (NEW.id, left(coalesce(NEW.raw_user_meta_data->>'full_name', ''), 120))
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'customer') ON CONFLICT DO NOTHING;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Products
CREATE TABLE public.products (
  id serial PRIMARY KEY,
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  style text NOT NULL DEFAULT '',
  fabric text NOT NULL,
  color text NOT NULL,
  pattern text NOT NULL DEFAULT '',
  occasion text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '' CHECK (char_length(description) <= 2000),
  price_paise integer NOT NULL CHECK (price_paise > 0),
  stock integer NOT NULL DEFAULT 0 CHECK (stock >= 0),
  status public.product_status NOT NULL DEFAULT 'published',
  image_key integer,
  image_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX products_status_idx ON public.products(status);
CREATE INDEX products_fabric_idx ON public.products(fabric);
CREATE INDEX products_color_idx ON public.products(color);
CREATE INDEX products_occasion_idx ON public.products(occasion);
GRANT SELECT ON public.products TO anon, authenticated;
GRANT INSERT (title,style,fabric,color,pattern,occasion,description,price_paise,status,image_key,image_url) ON public.products TO authenticated;
GRANT UPDATE (title,style,fabric,color,pattern,occasion,description,price_paise,status,image_key,image_url,updated_at) ON public.products TO authenticated;
GRANT USAGE ON SEQUENCE public.products_id_seq TO authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public reads published" ON public.products FOR SELECT TO anon, authenticated USING (status = 'published' OR public.is_admin());
CREATE POLICY "Admin insert products" ON public.products FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Admin update products" ON public.products FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Cart
CREATE TABLE public.cart_items (
  user_id uuid NOT NULL,
  product_id integer NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity integer NOT NULL CHECK (quantity BETWEEN 1 AND 10),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, product_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cart_items TO authenticated;
GRANT ALL ON public.cart_items TO service_role;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own cart" ON public.cart_items FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Orders
CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text NOT NULL UNIQUE,
  user_id uuid NOT NULL,
  idempotency_key uuid NOT NULL,
  customer_name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  address text NOT NULL,
  total_paise integer NOT NULL CHECK (total_paise > 0),
  payment_status text NOT NULL DEFAULT 'demo_paid' CHECK (payment_status IN ('demo_paid','refunded_demo')),
  status public.order_status NOT NULL DEFAULT 'pending',
  courier text,
  tracking_number text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, idempotency_key)
);
CREATE INDEX orders_user_idx ON public.orders(user_id, created_at DESC);
CREATE INDEX orders_status_idx ON public.orders(status, created_at DESC);
GRANT SELECT ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own or admin orders" ON public.orders FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin());

CREATE TABLE public.order_items (
  id bigserial PRIMARY KEY,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id integer REFERENCES public.products(id) ON DELETE SET NULL,
  product_title text NOT NULL,
  unit_price_paise integer NOT NULL CHECK (unit_price_paise > 0),
  quantity integer NOT NULL CHECK (quantity > 0),
  line_total_paise integer NOT NULL
);
CREATE INDEX order_items_order_idx ON public.order_items(order_id);
GRANT SELECT ON public.order_items TO authenticated;
GRANT ALL ON public.order_items TO service_role;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own or admin order items" ON public.order_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND (o.user_id = auth.uid() OR public.is_admin())));

CREATE TABLE public.order_status_history (
  id bigserial PRIMARY KEY,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  status public.order_status NOT NULL,
  note text,
  changed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX osh_order_idx ON public.order_status_history(order_id, created_at);
GRANT SELECT ON public.order_status_history TO authenticated;
GRANT ALL ON public.order_status_history TO service_role;
ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own or admin history" ON public.order_status_history FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND (o.user_id = auth.uid() OR public.is_admin())));

CREATE TABLE public.inventory_changes (
  id bigserial PRIMARY KEY,
  product_id integer NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  delta integer NOT NULL,
  new_stock integer NOT NULL,
  reason text NOT NULL,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  changed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX inv_product_idx ON public.inventory_changes(product_id, created_at DESC);
GRANT SELECT ON public.inventory_changes TO authenticated;
GRANT ALL ON public.inventory_changes TO service_role;
ALTER TABLE public.inventory_changes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin inventory read" ON public.inventory_changes FOR SELECT TO authenticated USING (public.is_admin());

-- Place order
CREATE OR REPLACE FUNCTION public.place_order(p_name text, p_email text, p_phone text, p_address text, p_idempotency_key uuid)
RETURNS TABLE(order_id uuid, order_number text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_order public.orders%ROWTYPE;
  v_total bigint := 0;
  v_count int;
  r record;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Please sign in' USING ERRCODE = '42501'; END IF;
  IF p_idempotency_key IS NULL THEN RAISE EXCEPTION 'Missing checkout key'; END IF;
  p_name := btrim(coalesce(p_name,'')); p_email := btrim(coalesce(p_email,''));
  p_phone := btrim(coalesce(p_phone,'')); p_address := btrim(coalesce(p_address,''));
  IF char_length(p_name) NOT BETWEEN 2 AND 120 THEN RAISE EXCEPTION 'Please enter your name'; END IF;
  IF p_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' OR char_length(p_email) > 255 THEN RAISE EXCEPTION 'Please enter a valid email'; END IF;
  IF p_phone !~ '^[0-9+ -]{7,20}$' THEN RAISE EXCEPTION 'Please enter a valid phone number'; END IF;
  IF char_length(p_address) NOT BETWEEN 10 AND 500 THEN RAISE EXCEPTION 'Please enter your full delivery address'; END IF;

  SELECT * INTO v_order FROM public.orders o WHERE o.user_id = v_uid AND o.idempotency_key = p_idempotency_key;
  IF FOUND THEN RETURN QUERY SELECT v_order.id, v_order.order_number; RETURN; END IF;

  SELECT count(*) INTO v_count FROM public.cart_items c WHERE c.user_id = v_uid;
  IF v_count = 0 THEN RAISE EXCEPTION 'Your cart is empty'; END IF;

  FOR r IN SELECT c.product_id, c.quantity, p.title, p.price_paise, p.stock, p.status
           FROM public.cart_items c JOIN public.products p ON p.id = c.product_id
           WHERE c.user_id = v_uid ORDER BY c.product_id FOR UPDATE OF p LOOP
    IF r.status <> 'published' THEN RAISE EXCEPTION '% is no longer available', r.title; END IF;
    IF r.quantity <= 0 THEN RAISE EXCEPTION 'Invalid quantity'; END IF;
    IF r.stock < r.quantity THEN RAISE EXCEPTION 'Only % left of %', r.stock, r.title; END IF;
    v_total := v_total + r.price_paise::bigint * r.quantity;
  END LOOP;
  IF v_total > 2147483647 THEN RAISE EXCEPTION 'Order too large'; END IF;

  INSERT INTO public.orders (order_number, user_id, idempotency_key, customer_name, email, phone, address, total_paise)
  VALUES ('JT-' || to_char(now(),'YYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,6)),
          v_uid, p_idempotency_key, p_name, p_email, p_phone, p_address, v_total::int)
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

  INSERT INTO public.order_status_history (order_id, status, note, changed_by) VALUES (v_order.id, 'pending', 'Order placed (demo payment)', v_uid);
  DELETE FROM public.cart_items c WHERE c.user_id = v_uid;
  RETURN QUERY SELECT v_order.id, v_order.order_number;
END $$;
REVOKE ALL ON FUNCTION public.place_order(text,text,text,text,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.place_order(text,text,text,text,uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_update_order(p_order_id uuid, p_status public.order_status, p_courier text, p_tracking text, p_note text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_old public.order_status; v_uid uuid := auth.uid();
BEGIN
  IF NOT public.has_role(v_uid, 'admin') THEN RAISE EXCEPTION 'Not authorised' USING ERRCODE = '42501'; END IF;
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
REVOKE ALL ON FUNCTION public.admin_update_order(uuid, public.order_status, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_update_order(uuid, public.order_status, text, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_adjust_stock(p_product_id integer, p_delta integer, p_reason text)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_new int; v_uid uuid := auth.uid();
BEGIN
  IF NOT public.has_role(v_uid, 'admin') THEN RAISE EXCEPTION 'Not authorised' USING ERRCODE = '42501'; END IF;
  IF p_delta = 0 OR abs(p_delta) > 10000 THEN RAISE EXCEPTION 'Invalid stock change'; END IF;
  IF char_length(btrim(coalesce(p_reason,''))) NOT BETWEEN 2 AND 200 THEN RAISE EXCEPTION 'Please give a reason'; END IF;
  SELECT stock + p_delta INTO v_new FROM public.products WHERE id = p_product_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Product not found'; END IF;
  IF v_new < 0 THEN RAISE EXCEPTION 'Stock cannot go below zero'; END IF;
  UPDATE public.products SET stock = v_new, updated_at = now() WHERE id = p_product_id;
  INSERT INTO public.inventory_changes (product_id, delta, new_stock, reason, changed_by) VALUES (p_product_id, p_delta, v_new, btrim(p_reason), v_uid);
  RETURN v_new;
END $$;
REVOKE ALL ON FUNCTION public.admin_adjust_stock(integer, integer, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_adjust_stock(integer, integer, text) TO authenticated;

-- Seed the 100 demo sarees
INSERT INTO public.products (id, title, style, fabric, color, pattern, occasion, description, price_paise, stock, image_key)
SELECT i,
  c || ' - ' || s || ' - ' || f || ' Saree with ' || pt,
  s, f, c, pt, oc,
  'This ' || lower(f) || ' saree is crafted for effortless elegance, finished with ' || lower(pt) || ' and a contrast pallu — ideal for ' || lower(oc) || '. 6.2 mtr with unstitched blouse.',
  (bp + (i % 5) * 100) * 100,
  10 + (i * 7) % 15,
  i
FROM (
  SELECT i,
    (ARRAY['Magenta','Cobalt Blue','Coral','Lavender','Sandal Beige','Candy Pink','Mustard Yellow','Midnight Blue','Ivory','Teal','Wine Red','Mulberry Purple','Charcoal Grey','Olive Green','Beet Pink','Mint Green','Rust Orange','Peacock Blue','Emerald Green','Maroon'])[((i-1) % 20) + 1] AS c,
    (ARRAY['Ananya','Roopa','Meenakshi','Kanimozhi','Ambigai','Sundari','Shalini','Vaibhogam','Narayani','Isha','Rukmani','Yamini','Vadhanam','Hamsavalli','Andal','Raaga','Mookuthi','Thendral','Manjari','Kumudavalli','Avantika','Sowmiya','Sithara','Pragathi'])[((i-1) % 24) + 1] AS s,
    (ARRAY['Soft Silk','Linen Cotton','Kota Silk','Tussar Silk','Banarasi Silk','Mysore Silk','Chanderi Cotton','Organza Silk','Mangalgiri Cotton','Gadwal Silk Cotton','Khadi Cotton','Jute Silk','Paper Silk','Mul Cotton','Sungudi Cotton','Kanjivaram Silk'])[((i-1) % 16) + 1] AS f,
    (ARRAY[2799,1599,1999,4499,6499,5999,1799,3299,1399,2999,1299,1899,1699,999,1199,8999])[((i-1) % 16) + 1] AS bp,
    (ARRAY['Kolam Weaving with Skirt Border','Zari Buttas All-over','Batik Prints with Contrast Pallu','Rettapet Border','Paalum Pazhamum Checks','Woven Stripes with Butta Motifs','Ikat Weave Pattern','Kalamkari Motifs','Plain Body with Contrast Pallu','Floral Hand-block Prints','Mayil (Peacock) Border','Temple Border with Zari Weaving'])[((i-1) % 12) + 1] AS pt,
    (ARRAY['Office Wear','Pooja & Small Functions','Reception','Wedding'])[((i-1) % 4) + 1] AS oc
  FROM generate_series(1, 100) AS i
) t;
SELECT setval('public.products_id_seq', 100);