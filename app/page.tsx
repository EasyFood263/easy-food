'use client';

import { useEffect, useMemo, useState } from 'react';

type Role = 'customer' | 'restaurant' | 'rider' | 'admin';
type Language = 'en' | 'ur';
type PaymentMethod = 'cod' | 'online';

type MenuItem = { id: string; name: string; description: string; price: number; category: string; available: boolean; offer: number };
type Restaurant = { id: string; name: string; area: string; city: string; rating: number; eta: string; image: string; open: boolean; items: MenuItem[] };
type CartItem = MenuItem & { restaurantId: string; qty: number };
type Order = { id: string; restaurant: string; items: CartItem[]; subtotal: number; platform: number; commission: number; deliveryRate: number; delivery: number; tax: number; total: number; distance: number; payment: PaymentMethod; status: string; otp: string; createdAt: string };

const seedRestaurants: Restaurant[] = [
  { id: 'r1', name: 'Bukhara Kitchen', area: 'Gulberg', city: 'Lahore', rating: 4.8, eta: '25–35 min', image: '🍛', open: true, items: [
    { id: 'm1', name: 'Chicken Biryani', description: 'Aromatic basmati rice with tender chicken.', price: 420, category: 'Biryani', available: true, offer: 0 },
    { id: 'm2', name: 'Chicken Karahi', description: 'Traditional tomato, ginger and green chilli karahi.', price: 1250, category: 'Karahi', available: true, offer: 10 },
    { id: 'm3', name: 'Seekh Kebab', description: 'Juicy grilled beef seekh kebabs.', price: 650, category: 'BBQ', available: true, offer: 0 },
    { id: 'm4', name: 'Fresh Naan', description: 'Tandoor baked naan.', price: 80, category: 'Sides', available: true, offer: 0 },
  ] },
  { id: 'r2', name: 'Lahore Tandoor House', area: 'Johar Town', city: 'Lahore', rating: 4.6, eta: '30–40 min', image: '🥘', open: true, items: [
    { id: 'm5', name: 'Mutton Karahi', description: 'Slow cooked mutton karahi for two.', price: 1850, category: 'Karahi', available: true, offer: 5 },
    { id: 'm6', name: 'Chicken Tikka', description: 'Charcoal grilled chicken tikka.', price: 520, category: 'BBQ', available: true, offer: 0 },
  ] },
  { id: 'r3', name: 'Karachi Bites', area: 'DHA', city: 'Karachi', rating: 4.7, eta: '20–30 min', image: '🍔', open: true, items: [
    { id: 'm7', name: 'Zinger Burger', description: 'Crispy chicken burger with house sauce.', price: 690, category: 'Burgers', available: true, offer: 10 },
    { id: 'm8', name: 'Loaded Fries', description: 'Crispy fries with cheese and sauces.', price: 390, category: 'Sides', available: true, offer: 0 },
  ] },
];

const t = {
  en: { home: 'Home', restaurants: 'Restaurants', orders: 'Orders', notifications: 'Notifications', account: 'Account', customer: 'Customer', restaurant: 'Restaurant', rider: 'Rider', admin: 'Admin', search: 'Search restaurants or food...', cart: 'Cart', checkout: 'Checkout', place: 'Place order', cod: 'Cash on Delivery', online: 'Online Payment', active: 'Active order', total: 'Total', subtotal: 'Subtotal', delivery: 'Delivery', platform: 'Platform charge', commission: 'Restaurant commission', chooseRole: 'Choose your workspace', support: 'Support', settings: 'Settings', logout: 'Switch role', noOrders: 'No orders yet.', save: 'Save changes', available: 'Available', unavailable: 'Unavailable' },
  ur: { home: 'ہوم', restaurants: 'ریسٹورنٹس', orders: 'آرڈرز', notifications: 'نوٹیفکیشنز', account: 'اکاؤنٹ', customer: 'کسٹمر', restaurant: 'ریسٹورنٹ', rider: 'رائیڈر', admin: 'ایڈمن', search: 'ریسٹورنٹ یا کھانا تلاش کریں...', cart: 'کارٹ', checkout: 'چیک آؤٹ', place: 'آرڈر کریں', cod: 'کیش آن ڈیلیوری', online: 'آن لائن ادائیگی', active: 'فعال آرڈر', total: 'کل', subtotal: 'سب ٹوٹل', delivery: 'ڈیلیوری', platform: 'پلیٹ فارم چارج', commission: 'ریسٹورنٹ کمیشن', chooseRole: 'اپنا ورک اسپیس منتخب کریں', support: 'سپورٹ', settings: 'سیٹنگز', logout: 'رول تبدیل کریں', noOrders: 'ابھی کوئی آرڈر نہیں۔', save: 'محفوظ کریں', available: 'دستیاب', unavailable: 'دستیاب نہیں' }
};

function money(n: number) { return `Rs. ${Math.round(n).toLocaleString()}`; }
function id(prefix: string) { return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`; }
function calculate(subtotal: number, distance: number) {
  const platform = subtotal <= 3000 ? subtotal * 0.03 : subtotal * 0.06;
  const commission = subtotal * 0.025;
  const deliveryRate = distance <= 4 ? 0.04 : 0.08;
  const delivery = subtotal * deliveryRate;
  return { platform, commission, deliveryRate, delivery, tax: 0, total: subtotal + platform + delivery };
}

export default function Home() {
  const [role, setRole] = useState<Role | null>(null);
  const [language, setLanguage] = useState<Language>('en');
  const [restaurants, setRestaurants] = useState(seedRestaurants);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [query, setQuery] = useState('');
  const [city, setCity] = useState('Lahore');
  const [payment, setPayment] = useState<PaymentMethod>('cod');
  const [distance, setDistance] = useState(3);
  const [showCart, setShowCart] = useState(false);
  const [showLogin, setShowLogin] = useState(true);
  const [toast, setToast] = useState('');
  const [tab, setTab] = useState('home');

  useEffect(() => {
    const savedRole = localStorage.getItem('easyfood-role') as Role | null;
    const savedOrders = localStorage.getItem('easyfood-orders');
    const savedLang = localStorage.getItem('easyfood-lang') as Language | null;
    if (savedRole) { setRole(savedRole); setShowLogin(false); }
    if (savedOrders) setOrders(JSON.parse(savedOrders));
    if (savedLang) setLanguage(savedLang);
  }, []);

  useEffect(() => { localStorage.setItem('easyfood-orders', JSON.stringify(orders)); }, [orders]);
  useEffect(() => { if (toast) { const x = setTimeout(() => setToast(''), 2800); return () => clearTimeout(x); } }, [toast]);

  const copy = t[language];
  const subtotal = useMemo(() => cart.reduce((sum, item) => sum + (item.price * (1 - item.offer / 100)) * item.qty, 0), [cart]);
  const fees = useMemo(() => calculate(subtotal, distance), [subtotal, distance]);
  const filtered = restaurants.filter(r => (r.name + r.area + r.city + r.items.map(i => i.name).join(' ')).toLowerCase().includes(query.toLowerCase()) && (city === 'All' || r.city === city));

  function chooseRole(next: Role) {
    setRole(next); setShowLogin(false); localStorage.setItem('easyfood-role', next); setTab('home');
    setToast(`${next[0].toUpperCase() + next.slice(1)} workspace opened`);
  }
  function addToCart(item: MenuItem, restaurantId: string) {
    if (!item.available) return;
    if (cart.length && cart[0].restaurantId !== restaurantId) { setToast('Cart can contain items from one restaurant at a time.'); return; }
    setCart(prev => { const found = prev.find(x => x.id === item.id); return found ? prev.map(x => x.id === item.id ? { ...x, qty: x.qty + 1 } : x) : [...prev, { ...item, restaurantId, qty: 1 }]; });
    setToast(`${item.name} added to cart`);
  }
  function changeQty(itemId: string, delta: number) { setCart(prev => prev.map(x => x.id === itemId ? { ...x, qty: x.qty + delta } : x).filter(x => x.qty > 0)); }
  function placeOrder() {
    if (!cart.length) { setToast('Add food to your cart first.'); return; }
    const restaurant = restaurants.find(r => r.id === cart[0].restaurantId)!;
    const order: Order = { id: id('EF'), restaurant: restaurant.name, items: cart, subtotal, ...fees, distance, payment, status: 'pending', otp: String(Math.floor(1000 + Math.random() * 9000)), createdAt: new Date().toISOString() };
    setOrders(prev => [order, ...prev]); setCart([]); setShowCart(false); setTab('orders');
    setToast(payment === 'online' ? 'Payment initiated and order placed.' : 'COD order placed successfully.');
  }
  function updateOrderStatus(orderId: string, status: string) { setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o)); setToast(`Order updated: ${status.replace('_', ' ')}`); }

  if (showLogin || !role) return <RoleGate language={language} setLanguage={setLanguage} onChoose={chooseRole} />;

  return <div className="app-shell" dir={language === 'ur' ? 'rtl' : 'ltr'}>
    <header className="topbar">
      <button className="brand" onClick={() => setTab('home')}><span className="brand-mark">EF</span><span>Easy <b>Food</b></span></button>
      <div className="top-actions"><select value={city} onChange={e => setCity(e.target.value)}><option>All</option><option>Lahore</option><option>Karachi</option></select><button className="lang" onClick={() => { const n = language === 'en' ? 'ur' : 'en'; setLanguage(n); localStorage.setItem('easyfood-lang', n); }}>{language === 'en' ? 'اردو' : 'English'}</button><button className="avatar" onClick={() => setTab('account')}>{role[0].toUpperCase()}</button></div>
    </header>
    <div className="layout">
      <aside className="sidebar">
        <div className="role-pill">{role === 'admin' ? '⚙️' : role === 'rider' ? '🛵' : role === 'restaurant' ? '🍔' : '👤'} <span>{copy[role]}</span></div>
        {['home','restaurants','orders','notifications','account'].map(x => <button key={x} className={tab === x ? 'nav active' : 'nav'} onClick={() => setTab(x)}>{x === 'home' ? '⌂' : x === 'restaurants' ? '▦' : x === 'orders' ? '◴' : x === 'notifications' ? '🔔' : '◉'} <span>{copy[x as keyof typeof copy] || x}</span></button>)}
        {role === 'admin' && <button className={tab === 'admin' ? 'nav active' : 'nav'} onClick={() => setTab('admin')}>⚙ <span>{copy.admin} Control</span></button>}
        {role === 'restaurant' && <button className={tab === 'manage' ? 'nav active' : 'nav'} onClick={() => setTab('manage')}>🍽 <span>Menu & Orders</span></button>}
        {role === 'rider' && <button className={tab === 'rider' ? 'nav active' : 'nav'} onClick={() => setTab('rider')}>🛵 <span>Rider Center</span></button>}
        <div className="sidebar-bottom"><button className="support" onClick={() => setToast('Support: 03702283429 • bukharaofficial321@gmail.com')}>☎ {copy.support}</button><button className="switch" onClick={() => { setShowLogin(true); setRole(null); }}>↪ {copy.logout}</button></div>
      </aside>
      <main className="main">
        {role === 'customer' && <CustomerView {...{tab, setTab, copy, query, setQuery, filtered, selectedRestaurant, setSelectedRestaurant, addToCart, showCart, setShowCart, cart, changeQty, subtotal, fees, distance, setDistance, payment, setPayment, placeOrder, orders, updateOrderStatus, city}} />}
        {role === 'restaurant' && <RestaurantView tab={tab} restaurants={restaurants} setRestaurants={setRestaurants} orders={orders} updateOrderStatus={updateOrderStatus} copy={copy} />}
        {role === 'rider' && <RiderView tab={tab} orders={orders} updateOrderStatus={updateOrderStatus} copy={copy} />}
        {role === 'admin' && <AdminView tab={tab} orders={orders} restaurants={restaurants} copy={copy} onNotify={msg => setToast(msg)} />}
      </main>
    </div>
    {toast && <div className="toast">✓ {toast}</div>}
  </div>;
}

function RoleGate({ language, setLanguage, onChoose }: { language: Language; setLanguage: (x: Language) => void; onChoose: (x: Role) => void }) {
  return <main className="gate" dir={language === 'ur' ? 'rtl' : 'ltr'}><div className="gate-card"><div className="gate-logo">EF</div><span className="eyebrow">🇵🇰 Pakistan-wide marketplace</span><h1>Easy <em>Food</em></h1><p>One role-based platform for customers, restaurants, independent riders and the owner.</p><div className="gate-head"><h2>{t[language].chooseRole}</h2><button onClick={() => setLanguage(language === 'en' ? 'ur' : 'en')}>{language === 'en' ? 'اردو' : 'English'}</button></div><div className="role-grid">{([['customer','👤','Customer','Order food & track deliveries'],['restaurant','🍔','Restaurant','Manage menu, orders & settlements'],['rider','🛵','Rider','Accept deliveries & earnings'],['admin','⚙️','Admin','Full marketplace control']] as const).map(([r, icon, name, desc]) => <button className="role-card" key={r} onClick={() => onChoose(r)}><span>{icon}</span><b>{name}</b><small>{desc}</small></button>)}</div><div className="demo-note">Demo workspace is ready. Production authentication, live GPS, OTP and payment webhooks require the configured Supabase/provider environment variables.</div></div></main>;
}

function CustomerView(p: any) {
  const { tab, setTab, copy, query, setQuery, filtered, selectedRestaurant, setSelectedRestaurant, addToCart, showCart, setShowCart, cart, changeQty, subtotal, fees, distance, setDistance, payment, setPayment, placeOrder, orders } = p;
  if (tab === 'orders') return <section><PageTitle title={copy.orders} subtitle="Track active deliveries and view order history." /><div className="order-list">{orders.length ? orders.map((o: Order) => <div className="order-card" key={o.id}><div><span className="order-id">{o.id}</span><h3>{o.restaurant}</h3><p>{o.items.map(i => `${i.name} × ${i.qty}`).join(', ')}</p></div><div className="order-right"><span className="status">{o.status}</span><b>{money(o.total)}</b><small>{o.payment.toUpperCase()}</small></div></div>) : <Empty text={copy.noOrders} />}</div></section>;
  if (tab === 'notifications') return <Notifications />;
  if (tab === 'account') return <Account copy={copy} />;
  return <>
    <section className="hero-banner"><div><span className="eyebrow">Fresh food. Fast delivery.</span><h1>Good food is <em>one tap</em> away.</h1><p>Discover nearby restaurants across Pakistan and order securely.</p><div className="search"><span>⌕</span><input value={query} onChange={e => setQuery(e.target.value)} placeholder={copy.search} /><button onClick={() => setTab('restaurants')}>Search</button></div></div><div className="hero-art">🍱<span>🍔</span><span>🍕</span></div></section>
    <PageTitle title={copy.restaurants} subtitle="Popular near you" action={<button className="link-btn" onClick={() => setTab('restaurants')}>View all →</button>} />
    <div className="restaurant-grid">{filtered.slice(0, 6).map((r: Restaurant) => <button className="restaurant-card" key={r.id} onClick={() => setSelectedRestaurant(r)}><div className="restaurant-photo">{r.image}<span>★ {r.rating}</span></div><div className="restaurant-info"><h3>{r.name}</h3><p>{r.area}, {r.city}</p><small>⏱ {r.eta} • {r.open ? 'Open' : 'Closed'}</small></div></button>)}</div>
    {selectedRestaurant && <RestaurantModal r={selectedRestaurant} onClose={() => setSelectedRestaurant(null)} addToCart={addToCart} />}
    <button className="floating-cart" onClick={() => setShowCart(true)}>🛒 {copy.cart} <b>{cart.reduce((a: number, x: CartItem) => a + x.qty, 0)}</b></button>
    {showCart && <CartDrawer {...{cart, changeQty, subtotal, fees, distance, setDistance, payment, setPayment, placeOrder, onClose: () => setShowCart(false)}} />}
  </>;
}

function RestaurantModal({ r, onClose, addToCart }: any) { return <div className="modal-backdrop"><div className="modal"><button className="close" onClick={onClose}>×</button><div className="modal-cover"><span>{r.image}</span><div><h2>{r.name}</h2><p>★ {r.rating} • {r.area}, {r.city} • {r.eta}</p></div></div><div className="menu-list">{r.items.map((item: MenuItem) => <div className="menu-row" key={item.id}><div><b>{item.name}</b><p>{item.description}</p>{item.offer ? <span className="offer">{item.offer}% OFF</span> : null}</div><div className="menu-price"><b>{money(item.price * (1 - item.offer / 100))}</b><button onClick={() => addToCart(item, r.id)}>+ Add</button></div></div>)}</div></div></div>; }
function CartDrawer(p: any) { const { cart, changeQty, subtotal, fees, distance, setDistance, payment, setPayment, placeOrder, onClose } = p; return <div className="modal-backdrop"><div className="drawer"><button className="close" onClick={onClose}>×</button><h2>🛒 Your Cart</h2>{cart.length ? <>{cart.map((x: CartItem) => <div className="cart-row" key={x.id}><div><b>{x.name}</b><small>{money(x.price * (1 - x.offer / 100))}</small></div><div className="qty"><button onClick={() => changeQty(x.id, -1)}>−</button><b>{x.qty}</b><button onClick={() => changeQty(x.id, 1)}>+</button></div></div>)}<label>Delivery distance (km)<input type="number" min="0.5" step="0.5" value={distance} onChange={e => setDistance(Number(e.target.value))} /></label><div className="payment-choice"><button className={payment === 'cod' ? 'selected' : ''} onClick={() => setPayment('cod')}>💵 Cash on Delivery</button><button className={payment === 'online' ? 'selected' : ''} onClick={() => setPayment('online')}>💳 Online Payment</button></div><div className="bill"><span>Subtotal <b>{money(subtotal)}</b></span><span>Platform ({subtotal <= 3000 ? '3%' : '6%'}) <b>{money(fees.platform)}</b></span><span>Delivery ({distance <= 4 ? '4%' : '8%'}) <b>{money(fees.delivery)}</b></span><span className="grand">Total <b>{money(fees.total)}</b></span></div><button className="primary full" onClick={placeOrder}>Place {payment === 'cod' ? 'COD ' : ''}Order • {money(fees.total)}</button></> : <Empty text="Your cart is empty." />}</div></div>; }
function PageTitle({ title, subtitle, action }: any) { return <div className="page-title"><div><h2>{title}</h2><p>{subtitle}</p></div>{action}</div>; }
function Empty({ text }: { text: string }) { return <div className="empty"><span>🍽️</span><b>{text}</b></div>; }
function Notifications() { return <section><PageTitle title="Notifications" subtitle="Important updates for your account." /><div className="notice-list"><div className="notice"><b>Order updates</b><p>You will receive alerts when your restaurant accepts, prepares and hands over your order.</p></div><div className="notice pink"><b>Easy Food announcement</b><p>Maintenance and important marketplace announcements will appear here.</p></div><div className="notice"><b>Security</b><p>Never share your delivery OTP with anyone except the authorized delivery flow.</p></div></div></section>; }
function Account({ copy }: any) { return <section><PageTitle title={copy.account} subtitle="Your Easy Food profile and support." /><div className="profile-card"><div className="big-avatar">UF</div><div><h2>Umar Farooq</h2><p>03702283429</p><p>bukharaofficial321@gmail.com</p></div></div><div className="settings-grid"><div><b>Language</b><p>English / Urdu</p></div><div><b>Support</b><p>03702283429</p></div><div><b>Security</b><p>OTP confirmation enabled</p></div><div><b>Privacy</b><p>Location shared only for active delivery</p></div></div></section>; }

function RestaurantView({ tab, restaurants, setRestaurants, orders, updateOrderStatus, copy }: any) {
  const r = restaurants[0];
  if (tab === 'notifications') return <Notifications />;
  if (tab === 'account') return <Account copy={copy} />;
  return <section><PageTitle title="Restaurant Dashboard" subtitle="Bukhara Kitchen • owner workspace" action={<span className="live-chip">● Open</span>} /><div className="stats"><Stat label="Today Sales" value="Rs. 48,650" /><Stat label="Orders" value={String(orders.length || 18)} /><Stat label="Commission" value="2.5%" /><Stat label="Settlement" value="Daily" /></div><div className="dashboard-grid"><div className="panel"><h3>Incoming Orders</h3>{orders.length ? orders.slice(0, 6).map((o: Order) => <div className="mini-order" key={o.id}><div><b>{o.id}</b><p>{o.items.length} items • {money(o.total)}</p></div><select value={o.status} onChange={e => updateOrderStatus(o.id, e.target.value)}><option>pending</option><option>accepted</option><option>preparing</option><option>ready</option><option>assigned</option></select></div>) : <Empty text="No live orders. New orders will appear here." />}</div><div className="panel"><h3>Menu</h3>{r.items.map((m: MenuItem) => <div className="mini-order" key={m.id}><div><b>{m.name}</b><p>{money(m.price)} • {m.category}</p></div><button className={m.available ? 'toggle on' : 'toggle'} onClick={() => setRestaurants((prev: Restaurant[]) => prev.map(x => x.id === r.id ? { ...x, items: x.items.map(i => i.id === m.id ? { ...i, available: !i.available } : i) } : x))}>{m.available ? copy.available : copy.unavailable}</button></div>)}</div></div><div className="panel"><h3>Settlement & policy</h3><div className="settings-grid"><div><b>Commission</b><p>2.5% per order</p></div><div><b>COD</b><p>Commission added to outstanding balance</p></div><div><b>Warnings</b><p>2 warnings → restriction</p></div><div><b>Reviews</b><p>Customer rating: 1–5 stars</p></div></div></div></section>;
}
function RiderView({ tab, orders, updateOrderStatus, copy }: any) { if (tab === 'notifications') return <Notifications />; if (tab === 'account') return <Account copy={copy} />; const [online, setOnline] = useState(false); const [paid, setPaid] = useState(false); return <section><PageTitle title="Rider Center" subtitle="Independent rider workspace" action={<span className={online ? 'live-chip' : 'muted-chip'}>● {online ? 'Online' : 'Off duty'}</span>} /><div className="rider-hero"><div><span className="eyebrow">Daily access</span><h2>Rs. 50 entry fee</h2><p>Pay once per day to receive delivery offers.</p></div><button className="primary" onClick={() => { setPaid(true); setOnline(true); }}>{paid ? '✓ Paid today' : 'Pay Rs. 50'}</button></div><div className="stats"><Stat label="Earnings" value="Rs. 8,420" /><Stat label="Deliveries" value="24" /><Stat label="Rating" value="5.0 ★" /><Stat label="Tracking" value={online ? 'Active' : 'Off'} /></div><div className="panel"><h3>Available deliveries</h3>{online && orders.length ? orders.slice(0, 5).map((o: Order) => <div className="mini-order" key={o.id}><div><b>{o.id} • {o.restaurant}</b><p>{money(o.total)} • {o.distance} km • {o.payment.toUpperCase()}</p></div><button className="primary small" onClick={() => updateOrderStatus(o.id, 'picked_up')}>Accept / Pickup</button></div>) : <Empty text={online ? 'No delivery offers right now.' : 'Pay the daily fee and go online to receive orders.'} />}</div></section>; }
function AdminView({ tab, orders, restaurants, copy, onNotify }: any) { const [announcement, setAnnouncement] = useState(''); if (tab === 'notifications') return <Notifications />; if (tab === 'account') return <Account copy={copy} />; return <section><PageTitle title="Admin Control Center" subtitle="Umar Farooq • complete marketplace control" /><div className="stats"><Stat label="Customers" value="1,284" /><Stat label="Restaurants" value="126" /><Stat label="Riders" value="348" /><Stat label="Orders" value={String(orders.length || 4_862)} /></div><div className="stats"><Stat label="Revenue" value="Rs. 2.84M" /><Stat label="Platform commission" value="Rs. 184K" /><Stat label="COD outstanding" value="Rs. 76K" /><Stat label="Rider fees" value="Rs. 17.4K" /></div><div className="dashboard-grid"><div className="panel"><h3>Announcement</h3><textarea value={announcement} onChange={e => setAnnouncement(e.target.value)} placeholder="App mein maintenance ka kaam chal raha hai..." /><div className="audience"><button onClick={() => { if (announcement) onNotify('Announcement sent to all customers, restaurants and riders.'); }}>All</button><button onClick={() => { if (announcement) onNotify('Announcement sent to customers.'); }}>Customers</button><button onClick={() => { if (announcement) onNotify('Announcement sent to restaurants.'); }}>Restaurants</button><button onClick={() => { if (announcement) onNotify('Announcement sent to riders.'); }}>Riders</button></div></div><div className="panel"><h3>Marketplace rules</h3><div className="rule"><span>Restaurant commission</span><b>2.5%</b></div><div className="rule"><span>Subtotal ≤ Rs. 3,000</span><b>3%</b></div><div className="rule"><span>Subtotal &gt; Rs. 3,000</span><b>6%</b></div><div className="rule"><span>Delivery ≤ 4 km</span><b>4%</b></div><div className="rule"><span>Delivery &gt; 4 km</span><b>8%</b></div><div className="rule"><span>Rider entry</span><b>Rs. 50/day</b></div></div></div><div className="panel"><h3>Operations</h3><div className="ops-grid">{['Cities & Areas','Restaurant approvals','Rider verification','Payments & refunds','Settlements','Complaints','Reviews','Suspensions','Audit logs','System settings','Tax settings','Backup & recovery'].map(x => <button key={x} onClick={() => onNotify(`${x} module opened — ready for backend data.`)}>{x}<span>→</span></button>)}</div></div></section>; }
function Stat({ label, value }: { label: string; value: string }) { return <div className="stat"><small>{label}</small><b>{value}</b></div>; }
