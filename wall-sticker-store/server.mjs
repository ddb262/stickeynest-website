import { createServer } from 'node:http';
import { readFile, writeFile, readdir, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PRODUCTS_DIR = path.join(ROOT, 'products');
const PRICES_DIR = path.join(ROOT, 'prices');
const OFFERS_DIR = path.join(ROOT, 'offers');
const STORE_DIR = path.join(ROOT, 'store');
const ANIMATIONS_DIR = path.join(ROOT, 'animations');
const DATA_DIR = path.join(ROOT, 'data');
const ORDERS_FILE = path.join(DATA_DIR, 'orders.json');
const OFFERS_FILE = path.join(OFFERS_DIR, 'offers.json');
const STORE_FILE = path.join(STORE_DIR, 'store.json');
const ANIMATIONS_FILE = path.join(ANIMATIONS_DIR, 'animations.json');
const PORT = Number(process.env.PORT) || 4173;
const HOST = process.env.HOST || (process.env.PORT ? '0.0.0.0' : '127.0.0.1');
const IMAGE_TYPES = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg']);
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.gif': 'image/gif' };
const ORDER_STATES = ['Order received', 'Confirmed', 'Packed', 'Shipped', 'Out for delivery', 'Delivered'];

await Promise.all([mkdir(PRODUCTS_DIR, { recursive: true }), mkdir(PRICES_DIR, { recursive: true }), mkdir(OFFERS_DIR, { recursive: true }), mkdir(STORE_DIR, { recursive: true }), mkdir(ANIMATIONS_DIR, { recursive: true }), mkdir(DATA_DIR, { recursive: true })]);
try { await readFile(ORDERS_FILE, 'utf8'); } catch { await writeFile(ORDERS_FILE, '[]\n', 'utf8'); }

function sendJson(response, status, data) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  response.end(JSON.stringify(data));
}
async function loadProducts() {
  const filenames = (await readdir(PRODUCTS_DIR)).filter(filename => IMAGE_TYPES.has(path.extname(filename).toLowerCase()));
  const products = [];
  for (const filename of filenames.sort((a, b) => a.localeCompare(b))) {
    const slug = path.basename(filename, path.extname(filename));
    let details = {};
    try { details = JSON.parse(await readFile(path.join(PRICES_DIR, `${slug}.json`), 'utf8')); } catch { /* An image still gets a default listing. */ }
    const price = Number(details.price);
    products.push({
      slug,
      name: String(details.name || slug.replace(/[-_]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase())),
      price: Number.isFinite(price) && price > 0 ? Math.round(price) : 499,
      compareAt: Number(details.compareAt) || null,
      description: String(details.description || 'A little colour and character for your walls.'),
      category: String(details.category || 'Wall stickers'),
      badge: String(details.badge || ''),
      rating: String(details.rating || ''),
      reviews: Number(details.reviews) || 0,
      image: `/products/${encodeURIComponent(filename)}`
    });
  }
  return products;
}
async function readOrders() {
  try { return JSON.parse(await readFile(ORDERS_FILE, 'utf8')); } catch { return []; }
}
async function readJson(file, fallback) {
  try { return { ...fallback, ...JSON.parse(await readFile(file, 'utf8')) }; } catch { return { ...fallback }; }
}
async function loadSettings() {
  const [store, animations] = await Promise.all([
    readJson(STORE_FILE, { storeName: 'StickyNest', tagline: 'happy walls, happy homes', contactEmail: 'ddbmaldini456@gmail.com', brandColor: '#2457a6', brandColorDark: '#173f80', accentColor: '#f3c65a' }),
    readJson(ANIMATIONS_FILE, { enabled: true, pageTransitionMs: 300, cardStaggerMs: 35, hoverLiftPx: 5, heroFloat: true, buttonFeedback: true, reducedMotionRespect: true })
  ]);
  return { store, animations };
}
async function loadOffers() {
  try {
    const source = JSON.parse(await readFile(OFFERS_FILE, 'utf8'));
    return Array.isArray(source.offers) ? source.offers : [];
  } catch { return []; }
}
function calculateOfferDiscount(subtotal, offer) {
  if (!offer || offer.active !== true || subtotal < Number(offer.minimumOrder || 0)) return 0;
  let discount = offer.discountType === 'percent'
    ? Math.round(subtotal * Number(offer.discountValue || 0) / 100)
    : Math.round(Number(offer.discountValue || 0));
  if (Number(offer.maximumDiscount) > 0) discount = Math.min(discount, Number(offer.maximumDiscount));
  return Math.max(0, Math.min(subtotal, discount));
}
async function getBody(request) {
  let body = '';
  for await (const chunk of request) {
    body += chunk;
    if (body.length > 1_000_000) throw new Error('Order details are too large.');
  }
  return JSON.parse(body || '{}');
}
function text(value, max = 250) { return String(value ?? '').trim().slice(0, max); }
function formatOrder(order) {
  const now = new Date();
  const stamp = `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, '0')}${String(now.getUTCDate()).padStart(2, '0')}`;
  const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();
  return { id: `SN-${stamp}-${suffix}`, createdAt: now.toISOString(), status: 'Order received', trackingCode: '', ...order };
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url, `http://localhost:${PORT}`);
  try {
    if (request.method === 'GET' && url.pathname === '/api/products') {
      return sendJson(response, 200, { products: await loadProducts() });
    }
    if (request.method === 'GET' && url.pathname === '/api/settings') {
      return sendJson(response, 200, await loadSettings());
    }
    if (request.method === 'GET' && url.pathname === '/api/offers') {
      return sendJson(response, 200, { offers: await loadOffers() });
    }
    if (request.method === 'POST' && url.pathname === '/api/orders') {
      const input = await getBody(request);
      const customerInput = input.customer || {};
      const customer = {
        name: text(customerInput.name, 90), email: text(customerInput.email, 120), phone: text(customerInput.phone, 16),
        address: text(customerInput.address, 250), landmark: text(customerInput.landmark, 100), city: text(customerInput.city, 80),
        state: text(customerInput.state, 80), pincode: text(customerInput.pincode, 6)
      };
      if (!customer.name || !customer.phone || !customer.address || !customer.city || !customer.state || !/^\d{6}$/.test(customer.pincode)) {
        return sendJson(response, 400, { error: 'Please add your name, mobile number and complete delivery address.' });
      }
      const digits = customer.phone.replace(/\D/g, '');
      if (digits.length < 10 || digits.length > 13) return sendJson(response, 400, { error: 'Please enter a valid mobile number.' });
      if (customer.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email)) return sendJson(response, 400, { error: 'Please enter a valid email address.' });
      if (!Array.isArray(input.items) || input.items.length < 1 || input.items.length > 30) return sendJson(response, 400, { error: 'Your bag is empty. Add a sticker before placing your order.' });
      const products = await loadProducts();
      const items = [];
      for (const line of input.items) {
        const product = products.find(item => item.slug === text(line.slug, 100));
        const quantity = Number(line.quantity);
        if (!product || !Number.isInteger(quantity) || quantity < 1 || quantity > 20) return sendJson(response, 400, { error: 'One of the products in your bag is no longer available. Refresh the page and try again.' });
        items.push({ slug: product.slug, name: product.name, price: product.price, quantity });
      }
      const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
      const offerCode = text(input.offerCode, 32).toUpperCase();
      let offer = null;
      let discount = 0;
      if (offerCode) {
        offer = (await loadOffers()).find(item => String(item.code || '').toUpperCase() === offerCode);
        if (!offer || offer.active !== true) return sendJson(response, 400, { error: 'That offer is only a preview and is not active.' });
        if (subtotal < Number(offer.minimumOrder || 0)) return sendJson(response, 400, { error: `Add items worth ${new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(offer.minimumOrder))} to use this offer.` });
        discount = calculateOfferDiscount(subtotal, offer);
      }
      const order = formatOrder({ customer, items, subtotal, discount, offerCode: offer ? offer.code : '', total: subtotal - discount, payment: 'Cash on Delivery' });
      const orders = await readOrders();
      orders.unshift(order);
      await writeFile(ORDERS_FILE, `${JSON.stringify(orders, null, 2)}\n`, 'utf8');
      return sendJson(response, 201, { order });
    }
    const orderMatch = request.method === 'GET' && url.pathname.match(/^\/api\/orders\/([^/]+)$/);
    if (orderMatch) {
      const id = decodeURIComponent(orderMatch[1]).toUpperCase();
      const order = (await readOrders()).find(item => item.id.toUpperCase() === id);
      if (!order) return sendJson(response, 404, { error: 'We could not find that order number.' });
      return sendJson(response, 200, { order: { id: order.id, createdAt: order.createdAt, status: ORDER_STATES.includes(order.status) ? order.status : 'Order received', trackingCode: order.trackingCode || '', items: order.items, subtotal: order.subtotal ?? order.total, discount: order.discount || 0, offerCode: order.offerCode || '', total: order.total, payment: order.payment } });
    }
    if (request.method !== 'GET' && request.method !== 'HEAD') return sendJson(response, 405, { error: 'Method not allowed.' });
    const pathname = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname);
    const filepath = path.resolve(ROOT, `.${pathname}`);
    const relativePath = path.relative(ROOT, filepath);
    const firstFolder = relativePath.split(path.sep)[0];
    const publicRootFiles = new Set(['index.html', 'app.js', 'styles.css']);
    const isPublicFile = publicRootFiles.has(relativePath) || firstFolder === 'products';
    if (relativePath.startsWith('..') || path.isAbsolute(relativePath) || !isPublicFile || filepath.startsWith(`${DATA_DIR}${path.sep}`)) {
      response.writeHead(404); response.end('Not found'); return;
    }
    const content = await readFile(filepath);
    response.writeHead(200, { 'Content-Type': MIME[path.extname(filepath).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    if (request.method === 'HEAD') response.end(); else response.end(content);
  } catch (error) {
    if (error instanceof SyntaxError) return sendJson(response, 400, { error: 'Please check the order details and try again.' });
    if (error.code === 'ENOENT') { response.writeHead(404); response.end('Not found'); return; }
    console.error(error);
    sendJson(response, 500, { error: 'Something went wrong while saving the order. Please try again.' });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Your store is ready at http://localhost:${PORT}`);
  console.log(`Orders are saved in ${path.relative(ROOT, ORDERS_FILE)}. Edit products/, prices/, offers/, store/, and animations/ to customize the store.`);
});
