# StickyNest wall sticker store

A small, self-contained storefront with a product catalog, search and category browsing, cart, three-step checkout, cash on delivery, delivery details, order email, and order tracking.

## Start the store

On Windows, double-click **Start Store.bat**. It opens the site at `http://localhost:4173`. Node.js (LTS) must be installed. Keep the black server window open while using the site.

## Add your own products

The four included SVG product pictures are sample artwork for the layout. Replace these with your real product photos before opening the store to customers.

1. Copy each product photo into `products/` (`.jpg`, `.jpeg`, `.png`, `.webp`, `.gif`, and `.svg` are supported).
2. Give it a simple name such as `pink-rose-wall-sticker.jpg`.
3. Create a matching file in `prices/` named `pink-rose-wall-sticker.json`:

```json
{
  "name": "Pink Rose Wall Sticker",
  "price": 599,
  "compareAt": 749,
  "category": "Botanical",
  "badge": "New",
  "description": "Soft pink roses for a lovely wall."
}
```

The image name and price-file name (without their extensions) must match. The product appears after you refresh the store. If you add a photo without a matching price file, a product slot still appears using a title from its filename and a default price of ₹499. Edit or remove that product by changing its photo or matching file in `prices/`. Only add `compareAt` when it is a genuine previous price.

## Change the store without editing the page

| Folder | Change |
|---|---|
| `products/` | Add or remove product photos. |
| `prices/` | Set each product name, price, category, badge, description, and optional genuine previous price. |
| `offers/` | Add preview coupons or activate a real coupon. |
| `store/` | Change the store name, tagline, order email, and brand colors. |
| `animations/` | Turn motion on/off and adjust transition, card-stagger, and hover-lift settings. |
| `data/` | View saved orders and update fulfilment status. Keep this folder private. |

Edit the JSON files in these folders with Notepad, save, then refresh the store. Product, store, animation, and offer settings are read from these files. To rename the store, change `storeName` in `store/store.json`; the header, footer, page title, and order emails use that name.

In `offers/offers.json`, each offer has an `active` setting. The included examples are `false`, so they are clearly shown as previews and never change a customer's bill. Set `active` to `true` only when you intend to honor that offer. `discountType` can be `percent` or `flat`; set `discountValue`, `minimumOrder`, and optional `maximumDiscount` to the real terms.

In `animations/animations.json`, set `enabled` to `false` to disable motion. `pageTransitionMs`, `cardStaggerMs`, and `hoverLiftPx` adjust the motion speed and lift; `heroFloat` and `buttonFeedback` control those individual effects. The site respects the customer's reduced-motion setting by default.

The sun/moon button in the header switches between light and dark themes and remembers the choice in that browser. If the shopper has not chosen a theme before, the store follows their device setting. For quicker product loading, use reasonably sized `.webp` product photos when available; the catalog lazy-loads product images as shoppers scroll.

## Orders and email

Checkout asks customers to confirm quantities, add or choose a saved delivery address, then review COD and billing. Addresses saved from the Delivery details page stay in that customer's browser; order addresses are also saved with each order in `data/orders.json`. The checkout sends order details to **ddbmaldini456@gmail.com** through FormSubmit. FormSubmit sends a one-time activation email to that inbox; click its confirmation link before expecting customer orders to arrive. If automatic email sending is unavailable, checkout offers a ready-to-send email link.

The `WALLJOY10` and `NEST50` offers shown in checkout are clearly marked, inactive sample previews. They do not reduce the bill. Add only discounts and offer terms that you intend to honor.

To update an order during fulfilment, edit its `status` in `data/orders.json` to one of: `Order received`, `Confirmed`, `Packed`, `Shipped`, `Out for delivery`, or `Delivered`. Add a `trackingCode` value if you have a carrier reference. Tracking shows the saved status; carrier scans and live delivery estimates need a shipping-provider integration.

## Putting the store online

This store needs a public Node.js web service. It also needs persistent storage for `data/orders.json`, which contains customer delivery details.

### Deploy with Render

The included `render.yaml` is set up for Render in Singapore, with a small paid Node web service and a 1 GB disk mounted at `data/`.

1. Create a private GitHub repository for the contents of this folder. Include `render.yaml`, `package.json`, `server.mjs`, `index.html`, `app.js`, `styles.css`, and the product/configuration folders. Do not upload real customer order details.
2. In Render, choose **New → Blueprint**, connect that GitHub repository, and review the settings from `render.yaml`.
3. Review the current monthly price in Render before creating the service. A persistent disk requires a paid web service; Render's free web service does not support a persistent disk, and its filesystem can lose saved orders on a restart or deploy.
4. When deployment finishes, open the `onrender.com` address shown in the Render dashboard. You can add a custom domain in Render later.
5. Confirm the FormSubmit activation email sent to the store address before relying on order emails.

Product photos, prices, offers, store settings, and animations are part of the GitHub repository. After changing them, commit the changes to GitHub; Render will redeploy from that repository. The order file is on the attached disk and is kept separate from those deploys. Keep access to that disk and repository private because orders contain customer information.
