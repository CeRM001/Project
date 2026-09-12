const products = {
    ps5: { name: 'PlayStation 5 Slim', price: 499.99 },
    racing: { name: 'Racing 24 · Edición física', price: 49.99 },
    headset: { name: 'Wave 7 Wireless Headset', price: 65.99 },
    controller: { name: 'Pro Pad Control inalámbrico', price: 57.99 },
    xbox: { name: 'Xbox Series X', price: 499.99 },
    switch: { name: 'Nintendo Switch OLED', price: 349.99 },
    zelda: { name: 'The Legend of Zelda: Echoes', price: 59.99 },
    spider: { name: 'Spider-Man 2 · PS5', price: 69.99 },
    keyboard: { name: 'Keychron K2 RGB', price: 89.99 },
    mouse: { name: 'Logitech G Pro X Superlight', price: 129.99 },
    chair: { name: 'Nexus Gamer Chair', price: 179.99 },
    capture: { name: 'Elgato Capture Card Neo', price: 149.99 }
};

const state = { cart: JSON.parse(sessionStorage.getItem('storePlaysCart') || '{}') };
const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });
const get = (id) => document.getElementById(id);
const formatPrice = (value) => currency.format(value);
const cartEntries = () => Object.entries(state.cart).filter(([, quantity]) => quantity > 0);
const subtotal = () => cartEntries().reduce((total, [id, quantity]) => total + products[id].price * quantity, 0);

function saveCart() {
    sessionStorage.setItem('storePlaysCart', JSON.stringify(state.cart));
}

function renderCart() {
    const entries = cartEntries();
    const itemCount = entries.reduce((total, [, quantity]) => total + quantity, 0);
    get('cartCount').textContent = itemCount;
    get('drawerCount').textContent = `(${itemCount})`;
    const cartItems = get('cartItems');
    const cartSummary = get('cartSummary');

    if (!entries.length) {
        cartItems.innerHTML = '<p class="empty-cart">Tu carrito está esperando una buena partida.</p>';
        cartSummary.hidden = true;
        return;
    }

    cartSummary.hidden = false;
    cartItems.innerHTML = entries.map(([id, quantity]) => `
        <article class="cart-item">
            <div class="mini-art art-${id}"><span>SP</span></div>
            <div class="cart-item-info"><strong>${products[id].name}</strong><span>${formatPrice(products[id].price)}</span><div class="quantity-control"><button type="button" data-action="decrease" data-id="${id}" aria-label="Reducir cantidad">−</button><span>${quantity}</span><button type="button" data-action="increase" data-id="${id}" aria-label="Aumentar cantidad">+</button></div></div>
            <button class="remove-item" type="button" data-action="remove" data-id="${id}" aria-label="Eliminar producto">×</button>
        </article>`).join('');
    updateTotals();
}

function getShipping() {
    const method = get('deliveryMethod').value;
    return method === 'express' ? 14.99 : method === 'pickup' ? 0 : 7.99;
}

function updateTotals() {
    const value = subtotal();
    const tax = Math.round(value * 0.07 * 100) / 100;
    const customs = get('destination').value === 'international' ? Math.round(value * 0.10 * 100) / 100 : 0;
    const shipping = getShipping();
    const total = value + tax + customs + shipping;
    get('cartSubtotal').textContent = formatPrice(value);
    get('cartTax').textContent = formatPrice(tax);
    get('cartTotal').textContent = formatPrice(total);
    get('checkoutSubtotal').textContent = formatPrice(value);
    get('checkoutTax').textContent = formatPrice(tax);
    get('checkoutCustoms').textContent = formatPrice(customs);
    get('checkoutShipping').textContent = formatPrice(shipping);
    get('checkoutTotal').textContent = formatPrice(total);
}

function setLayer(layer, visible) {
    layer.classList.toggle('open', visible);
    layer.setAttribute('aria-hidden', String(!visible));
    if (layer.id === 'overlay') layer.hidden = !visible;
}

function openCart() {
    setLayer(get('overlay'), true);
    setLayer(get('cartDrawer'), true);
}

function closeLayers() {
    ['cartDrawer', 'checkoutModal', 'successModal', 'overlay'].forEach((id) => setLayer(get(id), false));
}

document.querySelectorAll('.add-button').forEach((button) => button.addEventListener('click', () => {
    const id = button.dataset.product;
    state.cart[id] = (state.cart[id] || 0) + 1;
    saveCart();
    renderCart();
    openCart();
}));

get('cartItems').addEventListener('click', (event) => {
    const button = event.target.closest('[data-action]');
    if (!button) return;
    const { action, id } = button.dataset;
    if (action === 'increase') state.cart[id] += 1;
    if (action === 'decrease') state.cart[id] -= 1;
    if (action === 'remove' || state.cart[id] <= 0) delete state.cart[id];
    saveCart();
    renderCart();
});

document.querySelectorAll('input[name="payment"]').forEach((input) => input.addEventListener('change', () => {
    document.querySelectorAll('.payment-option').forEach((option) => option.classList.remove('selected'));
    input.closest('.payment-option').classList.add('selected');
}));

get('deliveryMethod').addEventListener('change', updateTotals);
get('destination').addEventListener('change', updateTotals);
get('cartTrigger').addEventListener('click', openCart);
get('closeCart').addEventListener('click', closeLayers);
get('closeCheckout').addEventListener('click', closeLayers);
get('overlay').addEventListener('click', closeLayers);
get('checkoutTrigger').addEventListener('click', () => {
    if (!cartEntries().length) return;
    setLayer(get('cartDrawer'), false);
    setLayer(get('checkoutModal'), true);
    updateTotals();
});

get('checkoutForm').addEventListener('submit', (event) => {
    event.preventDefault();
    if (!cartEntries().length) return;
    const name = get('customerName').value.trim().split(' ')[0];
    get('successMessage').textContent = `Gracias, ${name}. Tu orden de prueba por ${get('checkoutTotal').textContent} quedó registrada con entrega simulada.`;
    state.cart = {};
    saveCart();
    renderCart();
    setLayer(get('checkoutModal'), false);
    setLayer(get('successModal'), true);
});

get('closeSuccess').addEventListener('click', closeLayers);

document.querySelectorAll('.filter-chip').forEach((chip) => chip.addEventListener('click', () => {
    document.querySelectorAll('.filter-chip').forEach((item) => item.classList.remove('active'));
    chip.classList.add('active');
    const category = chip.textContent.trim().toLowerCase();
    document.querySelectorAll('.catalog-grid .product-card').forEach((card) => {
        card.hidden = category !== 'todos' && card.dataset.category !== category;
    });
}));

const productDetails = {
    ps5: { specs: '1 TB SSD · 4K · Wi-Fi 6 · 1 control incluido', image: 'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?auto=format&fit=crop&w=1200&q=85' },
    xbox: { specs: '1 TB SSD · 4K UHD · Quick Resume · 1 control incluido', image: 'https://images.unsplash.com/photo-1621259182978-fbf93132d53d?auto=format&fit=crop&w=1200&q=85' },
    switch: { specs: 'Pantalla OLED 7” · 64 GB · modo TV y portátil', image: 'https://images.unsplash.com/photo-1578303512597-81e6cc155b3e?auto=format&fit=crop&w=1200&q=85' },
    racing: { specs: 'PS5 · 1 jugador · multijugador online · +3 años', image: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=1200&q=85' },
    zelda: { specs: 'Nintendo Switch · aventura · 1 jugador · +10 años', image: 'https://images.unsplash.com/photo-1612287230202-1ff1d85d1bdf?auto=format&fit=crop&w=1200&q=85' },
    spider: { specs: 'PS5 · acción · modo historia · +16 años', image: 'https://images.unsplash.com/photo-1607853202273-797f1c22a38e?auto=format&fit=crop&w=1200&q=85' },
    headset: { specs: 'Audio 7.1 · Bluetooth · micrófono extraíble · 30 h', image: 'https://images.unsplash.com/photo-1599669454699-248893623440?auto=format&fit=crop&w=1200&q=85' },
    controller: { specs: 'Bluetooth · vibración háptica · batería 20 h', image: 'https://images.unsplash.com/photo-1592840496694-26d035b52b48?auto=format&fit=crop&w=1200&q=85' },
    keyboard: { specs: 'Mecánico · RGB · Bluetooth · distribución US', image: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=1200&q=85' },
    mouse: { specs: 'Sensor 25K DPI · inalámbrico · 63 g · USB-C', image: 'https://images.unsplash.com/photo-1527814050087-3793815479db?auto=format&fit=crop&w=1200&q=85' },
    chair: { specs: 'Espuma premium · reclinable 135° · soporte lumbar', image: 'https://images.unsplash.com/photo-1598550476439-6847785fcea6?auto=format&fit=crop&w=1200&q=85' },
    capture: { specs: '4K HDR · 60 FPS · HDMI · USB 3.0', image: 'https://images.unsplash.com/photo-1593305841991-05c297ba4575?auto=format&fit=crop&w=1200&q=85' }
};
const demoReviews = [
    ['★★★★★', 'Llegó rápido y muy bien protegido.', 'María G. · hace 2 días'],
    ['★★★★★', 'La descripción coincide con el producto.', 'Carlos R. · hace 5 días'],
    ['★★★★☆', 'Buen precio y atención clara por el chat.', 'Luis A. · hace 1 semana'],
    ['★★★★★', 'La entrega en Ciudad de Panamá fue puntual.', 'Andrea P. · hace 1 semana'],
    ['★★★★★', 'Volvería a comprar en Store Plays.', 'Diego M. · hace 2 semanas']
];

function productName(id) {
    return products[id] ? products[id].name : 'Producto Store Plays';
}

function openProductDetails(id) {
    const detail = productDetails[id] || { specs: 'Producto original · garantía Store Plays', image: '' };
    let modal = document.getElementById('productModal');
    if (!modal) {
        modal = document.createElement('section');
        modal.id = 'productModal';
        modal.className = 'product-modal';
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');
        document.body.appendChild(modal);
    }
    modal.innerHTML = `<button class="close-button product-modal-close" type="button" aria-label="Cerrar detalles">×</button><div class="detail-image"><img src="${detail.image}" alt="${productName(id)}"></div><div class="detail-content"><p class="eyebrow">DETALLE DEL PRODUCTO · DEMO</p><h2>${productName(id)}</h2><strong class="detail-price">${formatPrice(products[id].price)}</strong><p class="detail-specs">${detail.specs}</p><button class="checkout-button detail-add" type="button">Añadir al carrito <span>+</span></button><div class="reviews"><div class="reviews-heading"><h3>Comentarios recientes</h3><span>5 reseñas demo</span></div>${demoReviews.map(([rating, text, author]) => `<article><strong>${rating}</strong><p>“${text}”</p><small>${author}</small></article>`).join('')}</div></div>`;
    modal.classList.add('open');
    modal.querySelector('.product-modal-close').addEventListener('click', () => modal.classList.remove('open'));
    modal.querySelector('.detail-add').addEventListener('click', () => {
        state.cart[id] = (state.cart[id] || 0) + 1;
        saveCart();
        renderCart();
        modal.classList.remove('open');
        openCart();
    });
}

if (document.querySelector('.catalog-grid')) {
    document.querySelectorAll('.catalog-grid .product-card').forEach((card) => {
        const button = card.querySelector('[data-product]');
        if (!button) return;
        const id = button.dataset.product;
        const art = card.querySelector('.product-art');
        if (!art.querySelector('.product-photo') && productDetails[id].image) {
            const image = document.createElement('img');
            image.className = 'product-photo';
            image.src = productDetails[id].image;
            image.alt = productName(id);
            art.prepend(image);
        }
        const detailsButton = document.createElement('button');
        detailsButton.className = 'details-button';
        detailsButton.type = 'button';
        detailsButton.textContent = 'Ver detalles';
        card.querySelector('.product-info').insertBefore(detailsButton, card.querySelector('.product-bottom'));
        detailsButton.addEventListener('click', () => openProductDetails(id));
    });
}

const locationButton = get('locationButton');
if (locationButton) {
    locationButton.addEventListener('click', () => {
        const status = get('locationStatus');
        if (!navigator.geolocation) {
            status.textContent = 'Tu navegador no permite consultar la ubicación.';
            return;
        }
        status.textContent = 'Solicitando ubicación del dispositivo...';
        navigator.geolocation.getCurrentPosition((position) => {
            const latitude = position.coords.latitude.toFixed(4);
            const longitude = position.coords.longitude.toFixed(4);
            status.textContent = `Ubicación detectada: ${latitude}, ${longitude}. El paquete SP-2409 está en ruta hacia tu destino.`;
            locationButton.classList.add('location-found');
        }, () => {
            status.textContent = 'No se pudo acceder a la ubicación. El mapa sigue mostrando la ruta estimada en Panamá.';
        });
    });
}

renderCart();
