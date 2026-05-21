import { ChangeDetectionStrategy, Component, signal, computed } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatBadgeModule } from '@angular/material/badge';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CatalogProduct, CatalogSection, CartItem } from '../shared/marketplace-types';

// Seed data (Milestone 6 — real API comes later)
const DEMO_PRODUCTS: CatalogProduct[] = [
  {
    id: 1, productCode: 'FOOD-001', productName: 'Thai Jasmine Rice 25kg',
    description: 'Premium grade jasmine rice, double-polished',
    unitPrice: 28.50, currency: 'USD', stockStatus: 'InStock', availableQty: 500,
    leadTimeDays: 14, moq: 20, certifications: ['Halal', 'Organic'],
    section: ['New', 'Trending'], supplierId: 101, supplierName: 'Combine Thai Foods Co.',
  },
  {
    id: 2, productCode: 'FOOD-002', productName: 'Pickled Kachai in Brine 24x450g',
    description: 'Traditional Thai pickle, HS 2001.90',
    unitPrice: 42.00, currency: 'USD', stockStatus: 'InStock', availableQty: 200,
    leadTimeDays: 21, moq: 10, certifications: ['Halal', 'FDA'],
    section: ['Trending'], supplierId: 101, supplierName: 'Combine Thai Foods Co.',
  },
  {
    id: 3, productCode: 'ELEC-001', productName: 'Wireless Earbuds Pro',
    description: 'BT 5.3, 30hr battery',
    unitPrice: 18.90, currency: 'USD', stockStatus: 'InStock', availableQty: 1000,
    leadTimeDays: 30, moq: 50, certifications: ['FCC', 'CE'],
    section: ['New'], supplierId: 102, supplierName: 'Shenzhen Tech Ltd.',
  },
  {
    id: 4, productCode: 'FOOD-003', productName: 'Coconut Cream 48x400ml',
    description: 'Pure coconut cream, UHT processed',
    unitPrice: 36.00, currency: 'USD', stockStatus: 'SoldOut', availableQty: 0,
    leadTimeDays: 30, moq: 24, certifications: ['Halal', 'Organic', 'ISO22000'],
    section: ['Seasonal'], supplierId: 101, supplierName: 'Combine Thai Foods Co.',
  },
  {
    id: 5, productCode: 'HOME-001', productName: 'Bamboo Storage Baskets (Set of 3)',
    description: 'Handwoven, eco-certified',
    unitPrice: 22.50, currency: 'USD', stockStatus: 'ReadyForShipping', availableQty: 150,
    leadTimeDays: 7, moq: 12, certifications: ['FSC'],
    section: ['RecentlyOrdered', 'Trending'], supplierId: 103, supplierName: 'Artisan Craft Co.',
  },
  {
    id: 6, productCode: 'FOOD-004', productName: 'Dried Lychee 500g Bag',
    description: 'Premium sun-dried, no preservatives',
    unitPrice: 14.00, currency: 'USD', stockStatus: 'InStock', availableQty: 800,
    leadTimeDays: 14, moq: 50, certifications: ['Organic'],
    section: ['Seasonal', 'RecentlyOrdered'], supplierId: 101, supplierName: 'Combine Thai Foods Co.',
  },
];

@Component({
  selector: 'ulp-marketplace-catalog',
  standalone: true,
  imports: [DecimalPipe, FormsModule, RouterLink, MatButtonModule, MatIconModule, MatBadgeModule, MatTooltipModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="marketplace">
      <!-- Header -->
      <header class="mkt-header">
        <div class="mkt-title">
          <h1>Marketplace</h1>
          <p>Browse supplier catalogs — add items to cart and create a Purchase Order.</p>
        </div>
        <button mat-stroked-button class="cart-btn" (click)="cartOpen.set(!cartOpen())"
                [matBadge]="cartCount() || ''" matBadgeColor="warn" [matBadgeHidden]="cartCount() === 0">
          <mat-icon>shopping_cart</mat-icon> Cart ({{ cartCount() }})
        </button>
      </header>

      <!-- Search + Section tabs -->
      <div class="mkt-controls">
        <div class="search-wrap">
          <mat-icon class="search-icon">search</mat-icon>
          <input class="search-input" [ngModel]="searchQ()" (ngModelChange)="searchQ.set($event)" placeholder="Search products, suppliers, codes…" />
        </div>
        <nav class="section-tabs">
          @for (s of sections; track s.key) {
            <button class="stab" [class.stab--active]="activeSection() === s.key" (click)="activeSection.set(s.key)">
              {{ s.label }}
            </button>
          }
        </nav>
      </div>

      <!-- Catalog grid -->
      <div class="catalog-grid">
        @for (p of filteredProducts(); track p.id) {
          <div class="product-card" [class.product-card--soldout]="p.stockStatus === 'SoldOut'">
            <!-- Image -->
            <div class="product-img">
              @if (p.imageUrl) {
                <img [src]="p.imageUrl" [alt]="p.productName" />
              } @else {
                <div class="product-img-placeholder"><mat-icon>inventory_2</mat-icon></div>
              }
              @if (p.stockStatus === 'SoldOut') { <div class="soldout-overlay">SOLD OUT</div> }
              @if (p.stockStatus === 'ReadyForShipping') { <div class="ready-badge">Ready to Ship</div> }
            </div>
            <!-- Body -->
            <div class="product-body">
              <div class="product-supplier">{{ p.supplierName }}</div>
              <div class="product-name">{{ p.productName }}</div>
              <code class="product-code">{{ p.productCode }}</code>
              @if (p.description) { <div class="product-desc">{{ p.description }}</div> }

              <div class="product-meta">
                @if (p.leadTimeDays) { <span class="meta-tag"><mat-icon>schedule</mat-icon> {{ p.leadTimeDays }}d lead</span> }
                @if (p.moq) { <span class="meta-tag"><mat-icon>shopping_bag</mat-icon> MOQ {{ p.moq }}</span> }
                @if (p.availableQty && p.stockStatus !== 'SoldOut') {
                  <span class="meta-tag"><mat-icon>inventory</mat-icon> {{ p.availableQty }} avail</span>
                }
              </div>

              @if (p.certifications.length > 0) {
                <div class="cert-list">
                  @for (c of p.certifications; track c) {
                    <span class="cert-badge">{{ c }}</span>
                  }
                </div>
              }

              <div class="product-price">
                <span class="price">{{ p.unitPrice | number:'1.2-2' }} <span class="currency">{{ p.currency }}</span></span>
                <span class="per-unit">/unit</span>
              </div>
            </div>
            <!-- Footer -->
            <div class="product-footer">
              @if (p.stockStatus === 'SoldOut') {
                <button mat-stroked-button disabled class="full-btn">Sold Out</button>
              } @else {
                @if (cartQty(p.id) > 0) {
                  <div class="qty-ctrl">
                    <button mat-icon-button (click)="changeQty(p, -1)"><mat-icon>remove</mat-icon></button>
                    <span class="qty-val">{{ cartQty(p.id) }}</span>
                    <button mat-icon-button (click)="changeQty(p, 1)"><mat-icon>add</mat-icon></button>
                  </div>
                } @else {
                  <button mat-flat-button color="primary" class="full-btn" (click)="addToCart(p)">
                    <mat-icon>add_shopping_cart</mat-icon> Add to Cart
                  </button>
                }
              }
            </div>
          </div>
        } @empty {
          <div class="no-results"><mat-icon>search_off</mat-icon><p>No products match your search.</p></div>
        }
      </div>
    </div>

    <!-- Cart sidebar -->
    @if (cartOpen()) {
      <div class="cart-backdrop" (click)="cartOpen.set(false)"></div>
      <aside class="cart-panel">
        <div class="cart-head">
          <h2>Cart ({{ cartCount() }} items)</h2>
          <button mat-icon-button (click)="cartOpen.set(false)"><mat-icon>close</mat-icon></button>
        </div>
        @if (cart().length === 0) {
          <div class="cart-empty"><mat-icon>shopping_cart</mat-icon><p>Your cart is empty.</p></div>
        } @else {
          <div class="cart-items">
            @for (item of cart(); track item.product.id) {
              <div class="cart-item">
                <div class="ci-info">
                  <div class="ci-name">{{ item.product.productName }}</div>
                  <div class="ci-code">{{ item.product.productCode }} · {{ item.product.supplierName }}</div>
                  <div class="ci-price">{{ (item.product.unitPrice * item.quantity) | number:'1.2-2' }} {{ item.product.currency }}</div>
                </div>
                <div class="ci-qty">
                  <button mat-icon-button (click)="changeQty(item.product, -1)"><mat-icon>remove</mat-icon></button>
                  <span>{{ item.quantity }}</span>
                  <button mat-icon-button (click)="changeQty(item.product, 1)"><mat-icon>add</mat-icon></button>
                </div>
              </div>
            }
          </div>
          <div class="cart-total">
            <span>Subtotal</span>
            <strong>USD {{ cartTotal() | number:'1.2-2' }}</strong>
          </div>
          <div class="cart-note">
            <mat-icon>info_outline</mat-icon>
            Accessorial charges, freight, and taxes are not included in this estimate.
          </div>
          <div class="cart-actions">
            <button mat-stroked-button (click)="clearCart()">Clear Cart</button>
            <button mat-flat-button color="primary" routerLink="/app/procurement/pos/new" (click)="cartOpen.set(false)">
              <mat-icon>receipt_long</mat-icon> Create Purchase Order
            </button>
          </div>
        }
      </aside>
    }
  `,
  styles: [`
    :host { display: block; }
    .marketplace { max-width: 1200px; margin: 0 auto; position: relative; }
    .mkt-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; flex-wrap: wrap; gap: 12px; }
    .mkt-title h1 { font-size: 28px; font-weight: 800; margin: 0 0 4px;
      background: linear-gradient(90deg, #E54A8A, #5B3FA0, #3F2D7C);
      -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
    .mkt-title p { color: #6B5BA0; margin: 0; }
    .cart-btn { position: relative; }
    .mkt-controls { display: flex; align-items: center; gap: 16px; margin-bottom: 24px; flex-wrap: wrap; }
    .search-wrap { display: flex; align-items: center; gap: 8px; flex: 1; min-width: 240px;
      border: 1px solid #E8E2F4; border-radius: 8px; padding: 8px 12px; background: #fff; }
    .search-icon { color: #9A9AA3; font-size: 20px; }
    .search-input { border: none; outline: none; font-size: 14px; font-family: inherit; flex: 1; color: #1A1A33; }
    .section-tabs { display: flex; gap: 4px; flex-wrap: wrap; }
    .stab { background: #F5F2FB; border: none; cursor: pointer; padding: 7px 14px; border-radius: 999px;
      font-size: 12px; font-weight: 600; color: #6B5BA0; font-family: inherit; }
    .stab--active { background: #3F2D7C; color: #fff; }
    /* Catalog grid */
    .catalog-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 20px; }
    .product-card { background: #fff; border: 1px solid #E8E2F4; border-radius: 14px; overflow: hidden;
      box-shadow: 0 4px 16px rgba(63,45,124,.06); display: flex; flex-direction: column;
      transition: transform .15s, box-shadow .15s; }
    .product-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(63,45,124,.12); }
    .product-card--soldout { opacity: .7; }
    .product-img { height: 160px; background: #F5F2FB; display: flex; align-items: center; justify-content: center; position: relative; overflow: hidden; }
    .product-img img { width: 100%; height: 100%; object-fit: cover; }
    .product-img-placeholder mat-icon { font-size: 48px; width: 48px; height: 48px; color: #C9BEEC; }
    .soldout-overlay { position: absolute; inset: 0; background: rgba(0,0,0,.5); display: flex; align-items: center;
      justify-content: center; color: #fff; font-weight: 800; font-size: 18px; letter-spacing: 2px; }
    .ready-badge { position: absolute; top: 10px; right: 10px; background: #1F7A3D; color: #fff;
      padding: 3px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; }
    .product-body { padding: 14px; flex: 1; }
    .product-supplier { font-size: 11px; color: #9A9AA3; font-weight: 600; margin-bottom: 4px; }
    .product-name { font-size: 15px; font-weight: 700; color: #1A1A33; margin-bottom: 2px; }
    code.product-code { background: #F5F2FB; padding: 1px 6px; border-radius: 4px; font-size: 11px; color: #3F2D7C; }
    .product-desc { font-size: 12px; color: #6B5BA0; margin-top: 4px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
    .product-meta { display: flex; gap: 6px; flex-wrap: wrap; margin: 10px 0; }
    .meta-tag { display: flex; align-items: center; gap: 3px; font-size: 11px; color: #6B5BA0; background: #F5F2FB;
      padding: 2px 8px; border-radius: 999px; }
    .meta-tag mat-icon { font-size: 12px; width: 12px; height: 12px; }
    .cert-list { display: flex; gap: 4px; flex-wrap: wrap; margin-bottom: 10px; }
    .cert-badge { background: #DCF5E4; color: #1F7A3D; padding: 2px 8px; border-radius: 999px; font-size: 10px; font-weight: 700; }
    .product-price { display: flex; align-items: baseline; gap: 4px; }
    .price { font-size: 20px; font-weight: 800; color: #3F2D7C; }
    .currency { font-size: 13px; font-weight: 600; }
    .per-unit { font-size: 12px; color: #9A9AA3; }
    .product-footer { padding: 12px 14px; border-top: 1px solid #F0EBF8; }
    .full-btn { width: 100%; }
    .qty-ctrl { display: flex; align-items: center; justify-content: center; gap: 12px; }
    .qty-val { font-size: 16px; font-weight: 700; color: #3F2D7C; min-width: 24px; text-align: center; }
    .no-results { grid-column: 1 / -1; text-align: center; padding: 48px; color: #9A9AA3; }
    .no-results mat-icon { font-size: 36px; width: 36px; height: 36px; color: #C9BEEC; display: block; margin: 0 auto 12px; }
    /* Cart */
    .cart-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,.4); z-index: 100; }
    .cart-panel { position: fixed; right: 0; top: 0; bottom: 0; width: 380px; background: #fff; z-index: 101;
      display: flex; flex-direction: column; box-shadow: -4px 0 24px rgba(0,0,0,.15); }
    .cart-head { display: flex; justify-content: space-between; align-items: center; padding: 20px; border-bottom: 1px solid #E8E2F4; }
    .cart-head h2 { font-size: 18px; font-weight: 800; color: #3F2D7C; margin: 0; }
    .cart-empty { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #9A9AA3; }
    .cart-empty mat-icon { font-size: 40px; width: 40px; height: 40px; color: #C9BEEC; margin-bottom: 12px; }
    .cart-items { flex: 1; overflow-y: auto; padding: 16px; }
    .cart-item { display: flex; justify-content: space-between; align-items: center;
      padding: 10px 0; border-bottom: 1px solid #F0EBF8; gap: 8px; }
    .ci-info { flex: 1; }
    .ci-name { font-size: 13px; font-weight: 600; color: #1A1A33; }
    .ci-code { font-size: 11px; color: #9A9AA3; }
    .ci-price { font-size: 13px; font-weight: 700; color: #3F2D7C; margin-top: 2px; }
    .ci-qty { display: flex; align-items: center; gap: 4px; }
    .cart-total { display: flex; justify-content: space-between; padding: 14px 16px; background: #F5F2FB; font-size: 14px; }
    .cart-note { display: flex; align-items: flex-start; gap: 6px; padding: 10px 16px; color: #6B5BA0; font-size: 11px; background: #FFFBF0; }
    .cart-note mat-icon { font-size: 14px; width: 14px; height: 14px; flex-shrink: 0; margin-top: 1px; }
    .cart-actions { display: flex; gap: 8px; padding: 16px; border-top: 1px solid #E8E2F4; }
    .cart-actions button { flex: 1; }
  `],
})
export class CatalogComponent {
  readonly searchQ = signal('');
  readonly activeSection = signal<CatalogSection>('All');
  readonly cartOpen = signal(false);
  readonly cart = signal<CartItem[]>([]);

  readonly sections = [
    { key: 'All' as CatalogSection,             label: 'All Products' },
    { key: 'New' as CatalogSection,             label: 'New Items' },
    { key: 'Trending' as CatalogSection,        label: 'Trending' },
    { key: 'Seasonal' as CatalogSection,        label: 'Seasonal' },
    { key: 'RecentlyOrdered' as CatalogSection, label: 'Recently Ordered' },
  ];

  readonly filteredProducts = computed(() => {
    const q = this.searchQ().toLowerCase();
    const sec = this.activeSection();
    return DEMO_PRODUCTS.filter(p => {
      const matchSec = sec === 'All' || p.section.includes(sec);
      const matchQ = !q || p.productName.toLowerCase().includes(q) ||
                     p.productCode.toLowerCase().includes(q) ||
                     p.supplierName.toLowerCase().includes(q);
      return matchSec && matchQ;
    });
  });

  readonly cartCount = computed(() => this.cart().reduce((s, i) => s + i.quantity, 0));
  readonly cartTotal = computed(() => this.cart().reduce((s, i) => s + i.product.unitPrice * i.quantity, 0));

  cartQty(productId: number): number {
    return this.cart().find(i => i.product.id === productId)?.quantity ?? 0;
  }

  addToCart(p: CatalogProduct) {
    this.cart.update(cart => {
      const existing = cart.find(i => i.product.id === p.id);
      if (existing) return cart.map(i => i.product.id === p.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...cart, { product: p, quantity: p.moq ?? 1 }];
    });
    this.cartOpen.set(true);
  }

  changeQty(p: CatalogProduct, delta: number) {
    this.cart.update(cart =>
      cart
        .map(i => i.product.id === p.id ? { ...i, quantity: Math.max(0, i.quantity + delta) } : i)
        .filter(i => i.quantity > 0)
    );
  }

  clearCart() { this.cart.set([]); }
}
