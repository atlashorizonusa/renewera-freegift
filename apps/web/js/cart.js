/* ============================================================
   Renewera cart — client-side, stored in localStorage.
   Checkout hands off to Amazon (no on-site payment).
   ============================================================ */
(function () {
  const KEY = "renewera_cart";
  const AMAZON_CHECKOUT_URL = "https://www.amazon.com/dp/B0GVDGNDZZ";

  // ── storage helpers ──
  function read() {
    try { return JSON.parse(localStorage.getItem(KEY)) || []; }
    catch { return []; }
  }
  function write(items) {
    localStorage.setItem(KEY, JSON.stringify(items));
    updateCount();
  }

  // ── public API on window.ReneweraCart ──
  const Cart = {
    items: read,
    count() { return read().reduce((n, i) => n + i.qty, 0); },
    add(product, qty) {
      qty = Math.max(1, parseInt(qty || 1, 10));
      const items = read();
      const found = items.find((i) => i.id === product.id);
      if (found) found.qty += qty;
      else items.push({ id: product.id, name: product.name, image: product.image, qty });
      write(items);
      toast(`Added to cart — ${product.name}`);
    },
    setQty(id, qty) {
      qty = parseInt(qty, 10);
      let items = read();
      if (qty <= 0) items = items.filter((i) => i.id !== id);
      else { const it = items.find((i) => i.id === id); if (it) it.qty = qty; }
      write(items);
    },
    remove(id) { write(read().filter((i) => i.id !== id)); },
    clear() { write([]); },
    checkoutUrl: AMAZON_CHECKOUT_URL,
  };
  window.ReneweraCart = Cart;

  // ── nav badge ──
  function updateCount() {
    const n = Cart.count();
    document.querySelectorAll(".cart-count").forEach((el) => {
      el.textContent = n;
      el.hidden = n === 0;
    });
  }

  // ── toast ──
  let toastEl;
  function toast(msg) {
    if (!toastEl) {
      toastEl = document.createElement("div");
      toastEl.className = "toast";
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    clearTimeout(toast._t);
    toast._t = setTimeout(() => toastEl.classList.remove("show"), 2200);
  }

  // ── wire up [data-add-to-cart] buttons ──
  document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-add-to-cart]");
    if (!btn) return;
    e.preventDefault();
    const qtyInput = btn.closest("[data-product]")?.querySelector(".qty input");
    Cart.add(
      {
        id: btn.dataset.id,
        name: btn.dataset.name,
        image: btn.dataset.image,
      },
      qtyInput ? qtyInput.value : 1,
    );
  });

  document.addEventListener("DOMContentLoaded", updateCount);
  updateCount();
})();
