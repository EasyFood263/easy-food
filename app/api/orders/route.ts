import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

type PaymentMethod = 'cod' | 'online';
type OrderItemInput = { menu_item_id: string; quantity: number };

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

function getClient(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const auth = request.headers.get('authorization');
  if (!url || !key || !auth?.startsWith('Bearer ')) return null;
  return createClient(url, key, {
    global: { headers: { Authorization: auth } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function POST(request: NextRequest) {
  const supabase = getClient(request);
  if (!supabase) return jsonError('Supabase authentication is not configured.', 503);
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return jsonError('Authentication required.', 401);

  const body = await request.json().catch(() => null) as {
    restaurant_id?: string; address_id?: string; payment_method?: PaymentMethod;
    distance_km?: number; items?: OrderItemInput[];
  } | null;
  if (!body?.restaurant_id || !body.address_id || !Array.isArray(body.items) || body.items.length === 0) return jsonError('restaurant_id, address_id and at least one item are required.');
  if (body.payment_method !== 'cod' && body.payment_method !== 'online') return jsonError('Invalid payment method.');

  const distance = Number(body.distance_km ?? 0);
  if (!Number.isFinite(distance) || distance < 0) return jsonError('Invalid delivery distance.');
  const ids = body.items.map(item => item.menu_item_id);
  const quantities = new Map<string, number>();
  for (const item of body.items) {
    const quantity = Number(item.quantity);
    if (!item.menu_item_id || !Number.isInteger(quantity) || quantity < 1 || quantity > 99) return jsonError('Invalid order item quantity.');
    quantities.set(item.menu_item_id, quantity);
  }

  const { data: menuItems, error: menuError } = await supabase.from('menu_items')
    .select('id,restaurant_id,name,price,offer_percent,available')
    .in('id', ids).eq('restaurant_id', body.restaurant_id).eq('available', true);
  if (menuError) return jsonError(menuError.message, 400);
  if (!menuItems || menuItems.length !== new Set(ids).size) return jsonError('One or more menu items are unavailable.', 409);

  const subtotal = menuItems.reduce((sum, item) => {
    const discounted = Number(item.price) * (1 - Number(item.offer_percent || 0) / 100);
    return sum + discounted * (quantities.get(item.id) || 0);
  }, 0);
  const platformRate = subtotal <= 3000 ? 0.03 : 0.06;
  const restaurantCommissionRate = 0.025;
  const deliveryRate = distance <= 4 ? 0.04 : 0.08;
  const platformCharge = subtotal * platformRate;
  const restaurantCommission = subtotal * restaurantCommissionRate;
  const deliveryCharge = subtotal * deliveryRate;
  const total = subtotal + platformCharge + deliveryCharge;
  const orderNumber = `EF-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;
  const otp = String(Math.floor(1000 + Math.random() * 9000));
  const otpHash = createHash('sha256').update(otp).digest('hex');

  const { data: order, error: orderError } = await supabase.from('orders').insert({
    order_number: orderNumber, customer_id: user.id, restaurant_id: body.restaurant_id, address_id: body.address_id,
    status: 'pending', payment_method: body.payment_method, payment_status: 'pending',
    subtotal: subtotal.toFixed(2), platform_charge: platformCharge.toFixed(2), restaurant_commission: restaurantCommission.toFixed(2),
    delivery_rate: deliveryRate, delivery_charge: deliveryCharge.toFixed(2), total_amount: total.toFixed(2), distance_km: distance,
    cod_outstanding: body.payment_method === 'cod' ? total.toFixed(2) : 0, delivery_otp_hash: otpHash,
  }).select('id,order_number,status,payment_method,payment_status,subtotal,platform_charge,restaurant_commission,delivery_charge,total_amount,distance_km,placed_at').single();
  if (orderError || !order) return jsonError(orderError?.message || 'Could not create order.', 400);

  const orderRows = menuItems.map(item => {
    const quantity = quantities.get(item.id) || 0;
    const unitPrice = Number(item.price) * (1 - Number(item.offer_percent || 0) / 100);
    return { order_id: order.id, menu_item_id: item.id, item_name: item.name, unit_price: unitPrice.toFixed(2), quantity, line_total: (unitPrice * quantity).toFixed(2) };
  });
  const { error: itemsError } = await supabase.from('order_items').insert(orderRows);
  if (itemsError) {
    await supabase.from('orders').delete().eq('id', order.id);
    return jsonError(itemsError.message, 400);
  }

  return NextResponse.json({ ok: true, order, delivery_otp: otp,
    calculation: { platformRate, restaurantCommissionRate, deliveryRate, subtotal, platformCharge, restaurantCommission, deliveryCharge, total } }, { status: 201 });
}
