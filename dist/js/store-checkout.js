
import { cifrarDato, encryptSensitivePayload, maskCardNumber } from "./crypto-vault.js";

const CAPS_DATA = [
  { id: "cap-01", name: "SKATE RIOT SNAPBACK", tag: "EDICIÓN CALLE", price: 650 },
  { id: "cap-02", name: "STENCIL FLAME DAD HAT", tag: "GRAFFITI", price: 580 },
  { id: "cap-03", name: "UNDERGROUND 5-PANEL", tag: "DROP #01", price: 720 }
];

const catalogEl = document.getElementById("capCatalog");
const cartBoxEl = document.getElementById("cartBox");
const paymentFormEl = document.getElementById("paymentForm");
const receiptEl = document.getElementById("paymentReceipt");
const cartCountEl = document.getElementById("cartCount");
const cardFieldsEl = document.getElementById("cardFields");
const paypalInfoEl = document.getElementById("paypalInfo");
const checkoutAuthGateEl = document.getElementById("checkoutAuthGate");

window.addEventListener("ymc-session-change", (event) => {
  const loggedIn = Boolean(event.detail?.loggedIn);
  checkoutAuthGateEl?.classList.toggle("hidden", loggedIn);
  paymentFormEl?.classList.toggle("hidden", !loggedIn);
});

const cardNumberInput = paymentFormEl?.querySelector('[name="cardNumber"]') || document.getElementById("cardNumber");
const cardExpiryInput = paymentFormEl?.querySelector('[name="cardExpiry"]') || document.getElementById("cardExpiry");
const cardCvvInput = paymentFormEl?.querySelector('[name="cardCvv"]') || document.getElementById("cardCvv");

const cart = new Map();

function getCartTotal() {
  let total = 0;
  for (const item of cart.values()) {
    total += item.price * item.qty;
  }
  return total;
}

function renderCatalog() {
  if (!catalogEl) return;
  catalogEl.innerHTML = "";

  CAPS_DATA.forEach((cap) => {
    const card = document.createElement("article");
    card.className = "cap-card";
    card.innerHTML = `
      <span class="cap-badge">${cap.tag}</span>
      <div>
        <h4>${cap.name}</h4>
        <p class="cap-price">$${cap.price} MXN</p>
      </div>
      <button type="button" class="btn-solid" data-add-cap="${cap.id}">AGREGAR AL CARRITO</button>
    `;
    catalogEl.appendChild(card);
  });
}

function renderCart() {
  if (cartCountEl) cartCountEl.textContent = Array.from(cart.values()).reduce((sum, item) => sum + item.qty, 0);
  if (!cartBoxEl) return;

  if (cart.size === 0) {
    cartBoxEl.innerHTML = `<p class="empty-msg">Tu carrito está vacío. Agrega una gorra del drop.</p>`;
    return;
  }

  let itemsHtml = "";
  for (const item of cart.values()) {
    const subtotal = item.price * item.qty;
    itemsHtml += `
      <div class="cart-item-row" style="display:flex;justify-content:space-between;align-items:center;gap:0.75rem;padding:0.6rem 0.75rem;margin-bottom:0.5rem;border:1px solid #333;">
        <span><strong>${item.name}</strong> — $${subtotal} MXN</span>
        <div class="cart-qty-controls" style="display:flex;align-items:center;gap:0.35rem;">
          <button type="button" class="btn-qty-dec" data-dec-cap="${item.id}" aria-label="Disminuir cantidad" style="cursor:pointer;padding:0.15rem 0.45rem;">▼</button>
          <span class="cart-item-qty" style="min-width:1.5rem;text-align:center;font-weight:700;">${item.qty}</span>
          <button type="button" class="btn-qty-inc" data-inc-cap="${item.id}" aria-label="Aumentar cantidad" style="cursor:pointer;padding:0.15rem 0.45rem;">▲</button>
          <button type="button" class="btn-remove-item" data-remove-cap="${item.id}" style="cursor:pointer;padding:0.2rem 0.55rem;margin-left:0.25rem;">✕</button>
        </div>
      </div>
    `;
  }

  cartBoxEl.innerHTML = `
    <div class="cart-items-list">${itemsHtml}</div>
    <div class="cart-summary-bar" style="display:flex;justify-content:space-between;align-items:center;gap:0.75rem;margin-top:0.75rem;padding-top:0.75rem;border-top:1px solid #333;">
      <strong id="cartTotalLabel">TOTAL: $${getCartTotal()} MXN</strong>
      <button type="button" id="btnClearCart" class="btn-outline" style="cursor:pointer;padding:0.35rem 0.75rem;">VACIAR CARRITO</button>
    </div>
  `;
}

function addToCart(capId) {
  const cap = CAPS_DATA.find((c) => c.id === capId);
  if (!cap) return;

  const existing = cart.get(cap.id);
  if (existing) {
    existing.qty += 1;
  } else {
    cart.set(cap.id, { ...cap, qty: 1 });
  }
  renderCart();
}

function changeItemQty(capId, delta) {
  const existing = cart.get(capId);
  if (!existing) return;

  const nextQty = existing.qty + delta;
  if (nextQty <= 0) {
    cart.delete(capId);
  } else {
    existing.qty = nextQty;
  }
  renderCart();
}

function removeFromCart(capId) {
  cart.delete(capId);
  renderCart();
}

function clearCart() {
  cart.clear();
  renderCart();
}

function updatePaymentMethod() {
  const selected = paymentFormEl?.querySelector('input[name="paymentMethod"]:checked')?.value || "card";
  const useCard = selected === "card";
  if (cardFieldsEl) cardFieldsEl.classList.toggle("hidden", !useCard);
  if (paypalInfoEl) paypalInfoEl.classList.toggle("hidden", useCard);
  [cardNumberInput, cardExpiryInput, cardCvvInput].forEach((input) => { if (input) input.required = useCard; });
  const holderInput = paymentFormEl?.querySelector('[name="cardHolder"]');
  if (holderInput) holderInput.required = useCard;
}
paymentFormEl?.querySelectorAll('input[name="paymentMethod"]').forEach((radio) => radio.addEventListener("change", updatePaymentMethod));
updatePaymentMethod();

if (cardNumberInput) {
  cardNumberInput.setAttribute("maxlength", "16");
  cardNumberInput.addEventListener("input", (e) => {
    e.target.value = e.target.value.replace(/\D/g, "").slice(0, 16);
  });
}

if (cardExpiryInput) {
  cardExpiryInput.setAttribute("maxlength", "5");
  cardExpiryInput.addEventListener("input", (e) => {
    const digits = e.target.value.replace(/\D/g, "").slice(0, 4);
    e.target.value = digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
  });
}

if (cardCvvInput) {
  cardCvvInput.setAttribute("maxlength", "3");
  cardCvvInput.addEventListener("input", (e) => {
    e.target.value = e.target.value.replace(/\D/g, "").slice(0, 3);
  });
}

if (catalogEl) {
  catalogEl.addEventListener("click", (e) => {
    const addBtn = e.target.closest("[data-add-cap]");
    if (!addBtn) return;
    addToCart(addBtn.dataset.addCap);
  });
}

if (cartBoxEl) {
  cartBoxEl.addEventListener("click", (e) => {
    const incBtn = e.target.closest("[data-inc-cap]");
    if (incBtn) {
      changeItemQty(incBtn.dataset.incCap, 1);
      return;
    }

    const decBtn = e.target.closest("[data-dec-cap]");
    if (decBtn) {
      changeItemQty(decBtn.dataset.decCap, -1);
      return;
    }

    const removeBtn = e.target.closest("[data-remove-cap]");
    if (removeBtn) {
      removeFromCart(removeBtn.dataset.removeCap);
      return;
    }

    const clearBtn = e.target.closest("#btnClearCart");
    if (clearBtn) {
      clearCart();
    }
  });
}

if (paymentFormEl) {
  paymentFormEl.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (cart.size === 0) {
      if (receiptEl) {
        receiptEl.classList.remove("hidden");
        receiptEl.innerHTML = `<p>Agrega al menos una gorra al carrito antes de procesar el pago.</p>`;
      }
      return;
    }
    const formData = new FormData(paymentFormEl);
    const method = String(formData.get("paymentMethod") || "card");
    const total = getCartTotal();

    if (method === "paypal") {
      if (receiptEl) {
        receiptEl.classList.remove("hidden");
        receiptEl.innerHTML = `<p><strong>MÉTODO:</strong> PayPal</p><p><strong>TOTAL:</strong> $${total} MXN</p><p>Esta es una demostración. Para recibir pagos reales, conecta una cuenta PayPal y su checkout oficial.</p>`;
      }
      return;
    }

    const holder = String(formData.get("cardHolder") || "").trim();
    const rawCard = String(formData.get("cardNumber") || "").replace(/\D/g, "").slice(0, 16);
    const expiry = String(formData.get("cardExpiry") || "").trim();
    const cvv = String(formData.get("cardCvv") || "").replace(/\D/g, "").slice(0, 3);
    if (rawCard.length !== 16 || cvv.length !== 3 || !holder || !expiry) {
      if (receiptEl) {
        receiptEl.classList.remove("hidden");
        receiptEl.innerHTML = `<p>Revisa los datos de tu tarjeta antes de continuar.</p>`;
      }
      return;
    }
    const resumenPrueba = `TITULAR:${holder}|CARD:${rawCard}`;
    cifrarDato(resumenPrueba).then((paqueteCifrado) => console.log("Payload cifrado AES-GCM:", paqueteCifrado));
    const payload = { holder, cardNumber: rawCard, expiry, cvv, total, items: Array.from(cart.values()) };
    const encrypted = await encryptSensitivePayload(payload);
    void encrypted;
    const masked = maskCardNumber(rawCard);
    if (receiptEl) {
      receiptEl.classList.remove("hidden");
      receiptEl.innerHTML = `<p><strong>TITULAR:</strong> ${holder}</p><p><strong>TARJETA:</strong> ${masked}</p><p><strong>TOTAL:</strong> $${total} MXN</p><p>Datos preparados en la demostración de pago cifrado.</p>`;
    }
    clearCart();
    paymentFormEl.reset();
    updatePaymentMethod();
  });
}

renderCatalog();
renderCart();