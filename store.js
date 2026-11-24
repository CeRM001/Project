const products = {
    ps5: { name: 'PlayStation 5 Slim', price: 424.99, sku: 'SP-CON-001' },
    racing: { name: 'Racing 24 · Edición física', price: 49.99, sku: 'SP-JUE-001' },
    headset: { name: 'Wave 7 Wireless Headset', price: 65.99, sku: 'SP-ACC-001' },
    controller: { name: 'Pro Pad Control inalámbrico', price: 57.99, sku: 'SP-ACC-002' },
    xbox: { name: 'Xbox Series X', price: 499.99, sku: 'SP-CON-002' },
    switch: { name: 'Nintendo Switch OLED', price: 349.99, sku: 'SP-CON-003' },
    zelda: { name: 'The Legend of Zelda: Echoes', price: 59.99, sku: 'SP-JUE-002' },
    spider: { name: 'Spider-Man 2 · PS5', price: 69.99, sku: 'SP-JUE-003' },
    keyboard: { name: 'Keychron K2 RGB', price: 89.99, sku: 'SP-ACC-003' },
    mouse: { name: 'Logitech G Pro X Superlight', price: 129.99, sku: 'SP-ACC-004' },
    chair: { name: 'Nexus Gamer Chair', price: 179.99, sku: 'SP-ACC-005' },
    capture: { name: 'Elgato Capture Card Neo', price: 149.99, sku: 'SP-ACC-006' }
};

const state = { cart: JSON.parse(sessionStorage.getItem('storePlaysCart') || '{}') };
const orderStorageKey = 'storePlaysOrders';
let orders = [];
let ordersLoadError = false;
try {
    const savedOrders = localStorage.getItem(orderStorageKey);
    orders = savedOrders ? JSON.parse(savedOrders) : [];
    if (!Array.isArray(orders)) throw new TypeError('El historial guardado no es válido.');
    orders = orders.filter((order) => order && typeof order.orderId === 'string' &&
        typeof order.trackingId === 'string' && Array.isArray(order.items));
} catch (error) {
    ordersLoadError = true;
    console.error('No se pudo leer el historial local de pedidos.', error);
}
const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });
const get = (id) => document.getElementById(id);
const formatPrice = (value) => currency.format(value);
const cartEntries = () => Object.entries(state.cart).filter(([, quantity]) => quantity > 0);
const subtotal = () => cartEntries().reduce((total, [id, quantity]) => total + products[id].price * quantity, 0);
let audioContext;
let audioMaster;
let musicTimer;
let musicStep = 0;
let musicStarting = false;

function getAudioContext() {
    const AudioContextConstructor = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextConstructor) return null;
    if (!audioContext) {
        audioContext = new AudioContextConstructor();
        audioMaster = audioContext.createGain();
        audioMaster.gain.value = 0.9;
        audioMaster.connect(audioContext.destination);
    }
    return audioContext;
}

function playTone(frequency, duration, waveform, volume, startAt) {
    const context = getAudioContext();
    if (!context) return;
    const start = startAt ?? context.currentTime;
    const oscillator = context.createOscillator();
    const envelope = context.createGain();
    oscillator.type = waveform;
    oscillator.frequency.setValueAtTime(frequency, start);
    envelope.gain.setValueAtTime(0.0001, start);
    envelope.gain.exponentialRampToValueAtTime(volume, start + 0.02);
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(envelope);
    envelope.connect(audioMaster);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.02);
}

function playSound(effect) {
    const context = getAudioContext();
    if (!context) return;
    const now = context.currentTime;
    const sounds = {
        add: [[660, 0], [880, 0.075]],
        open: [[440, 0], [587.33, 0.07], [783.99, 0.14]],
        pay: [[523.25, 0], [659.25, 0.12], [783.99, 0.24], [1046.5, 0.36]]
    };
    (sounds[effect] || []).forEach(([frequency, offset]) => {
        playTone(frequency, effect === 'pay' ? 0.18 : 0.12, 'sine', 0.075, now + offset);
    });
}

function playMusicStep() {
    const melody = [392, 493.88, 587.33, 493.88, 440, 493.88, 587.33, 493.88];
    const chords = [
        { notes: [196, 246.94, 293.66], bass: 98 },
        { notes: [146.83, 185, 220], bass: 73.42 },
        { notes: [164.81, 196, 246.94], bass: 82.41 },
        { notes: [130.81, 164.81, 196], bass: 65.41 }
    ];
    const context = getAudioContext();
    if (!context) return;
    const now = context.currentTime;
    const chord = chords[Math.floor(musicStep / 8) % chords.length];
    playTone(melody[musicStep % melody.length], 0.3, 'triangle', 0.045, now);
    if (musicStep % 8 === 0) {
        chord.notes.forEach((note) => playTone(note, 3.3, 'sine', 0.012, now));
    }
    if (musicStep % 4 === 0) playTone(chord.bass, 0.7, 'sine', 0.035, now);
    musicStep += 1;
}

get('musicToggle').addEventListener('click', async () => {
    const button = get('musicToggle');
    const status = get('musicStatus');
    const context = getAudioContext();
    if (!context) {
        button.disabled = true;
        button.setAttribute('aria-label', 'El audio no está disponible en este navegador');
        status.textContent = 'N/A';
        return;
    }
    if (musicTimer) {
        clearInterval(musicTimer);
        musicTimer = undefined;
        button.setAttribute('aria-pressed', 'false');
        button.setAttribute('aria-label', 'Activar música ambiental');
        status.textContent = 'OFF';
        return;
    }
    if (musicStarting) return;
    musicStarting = true;
    try {
        if (context.state === 'suspended') await context.resume();
    } catch (error) {
        console.error('No se pudo activar el audio de la tienda.', error);
        status.textContent = 'ERR';
        musicStarting = false;
        return;
    }
    musicStarting = false;
    musicStep = 0;
    playMusicStep();
    musicTimer = setInterval(playMusicStep, 430);
    button.setAttribute('aria-pressed', 'true');
    button.setAttribute('aria-label', 'Desactivar música ambiental');
    status.textContent = 'ON';
});

document.documentElement.classList.add('motion-ready');

const revealTargets = document.querySelectorAll(
    '.hero-copy, .hero-ad, .stats div, .section-heading, .product-card, .business-card, ' +
    '.audience-copy, .operation-item, .chosen-model, .panama-strip > div, .policy-block, ' +
    '.policy-contact, .catalog-badge, .catalog-toolbar, .tracking-copy, .tracking-panel'
);
revealTargets.forEach((target, index) => {
    target.classList.add('reveal');
    if (target.classList.contains('product-card') || target.classList.contains('business-card')) {
        target.classList.add(`reveal-delay-${(index % 3) + 1}`);
    }
});

if ('IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
        });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    revealTargets.forEach((target) => revealObserver.observe(target));
} else {
    revealTargets.forEach((target) => target.classList.add('is-visible'));
}

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
            <div class="cart-item-info"><strong>${products[id].name}</strong><span>SKU: ${products[id].sku}</span><span>${formatPrice(products[id].price)}</span><div class="quantity-control"><button type="button" data-action="decrease" data-id="${id}" aria-label="Reducir cantidad">−</button><span>${quantity}</span><button type="button" data-action="increase" data-id="${id}" aria-label="Aumentar cantidad">+</button></div></div>
            <button class="remove-item" type="button" data-action="remove" data-id="${id}" aria-label="Eliminar producto">×</button>
        </article>`).join('');
    updateTotals();
}

function getShipping() {
    const method = get('deliveryMethod').value;
    return method === 'express' ? 14.99 : method === 'pickup' ? 0 : 7.99;
}

function calculateTotals() {
    const value = subtotal();
    const tax = Math.round(value * 0.07 * 100) / 100;
    const customs = get('destination').value === 'international' ? Math.round(value * 0.10 * 100) / 100 : 0;
    const shipping = getShipping();
    return { value, tax, customs, shipping, total: value + tax + customs + shipping };
}

function updateTotals() {
    const { value, tax, customs, shipping, total } = calculateTotals();
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
    const wasOpen = layer.classList.contains('open');
    layer.classList.toggle('open', visible);
    layer.setAttribute('aria-hidden', String(!visible));
    if (layer.id === 'overlay') layer.hidden = !visible;
    if (visible && !wasOpen && layer.id !== 'overlay' && layer.id !== 'successModal') playSound('open');
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
    if (!id) return;
    playSound('add');
    state.cart[id] = (state.cart[id] || 0) + 1;
    saveCart();
    renderCart();
    get('cartTrigger').classList.remove('bump');
    void get('cartTrigger').offsetWidth;
    get('cartTrigger').classList.add('bump');
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

document.querySelectorAll('.payment-option').forEach((option) => {
    const method = option.querySelector('input[name="payment"]').value;
    if (method === 'card') {
        const brands = document.createElement('span');
        brands.className = 'payment-brands';
        brands.setAttribute('aria-label', 'Visa y Mastercard');
        const visa = document.createElement('span');
        visa.className = 'visa-logo';
        visa.textContent = 'VISA';
        const mastercard = document.createElement('span');
        mastercard.className = 'mastercard-logo';
        mastercard.setAttribute('aria-label', 'Mastercard');
        mastercard.innerHTML = '<i></i><i></i>';
        brands.append(visa, mastercard);
        option.append(brands);
    } else if (method === 'transfer') {
        const bankIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        bankIcon.setAttribute('class', 'payment-transfer-icon');
        bankIcon.setAttribute('viewBox', '0 0 24 24');
        bankIcon.setAttribute('aria-hidden', 'true');
        bankIcon.innerHTML = '<path d="M3 9h18L12 4 3 9Zm2 2v7m5-7v7m4-7v7m5-7v7M3 21h18M2 18h20"/>';
        option.append(bankIcon);
    }
});

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
    const errorMessage = get('checkoutError');
    errorMessage.textContent = '';
    if (ordersLoadError) {
        errorMessage.textContent = 'No se pudo leer el historial guardado; no se creó el pedido. Revisa el almacenamiento del navegador e inténtalo de nuevo.';
        return;
    }

    const name = get('customerName').value.trim().split(' ')[0];
    const orderId = createReference('ORD');
    const trackingId = createReference('TRK');
    const totals = calculateTotals();
    const order = {
        orderId,
        trackingId,
        createdAt: new Date().toISOString(),
        deliveryMethod: get('deliveryMethod').value,
        paymentMethod: document.querySelector('input[name="payment"]:checked').value,
        paymentStatus: 'Pendiente · pago de demostración',
        status: 'Pedido recibido · demostración',
        total: totals.total,
        items: cartEntries().map(([id, quantity]) => ({
            sku: products[id].sku,
            name: products[id].name,
            quantity
        }))
    };

    orders.unshift(order);
    try {
        localStorage.setItem(orderStorageKey, JSON.stringify(orders));
    } catch (error) {
        orders.shift();
        console.error('No se pudo guardar el pedido en este navegador.', error);
        errorMessage.textContent = 'No se pudo guardar el pedido en este navegador. Libera espacio o habilita el almacenamiento e inténtalo de nuevo.';
        return;
    }

    get('successMessage').textContent = `Gracias, ${name}. Registramos tu pedido de demostración por ${formatPrice(totals.total)}.`;
    get('successOrderId').textContent = orderId;
    get('successTrackingId').textContent = trackingId;
    get('successPayment').textContent = order.paymentMethod === 'card' ? 'Tarjeta' :
        order.paymentMethod === 'yappy' ? 'Yappy' : 'Transferencia';
    state.cart = {};
    saveCart();
    renderCart();
    playSound('pay');
    setLayer(get('checkoutModal'), false);
    setLayer(get('successModal'), true);
});

get('closeSuccess').addEventListener('click', closeLayers);

document.querySelectorAll('.filter-chip').forEach((chip) => chip.addEventListener('click', () => {
    document.querySelectorAll('.filter-chip').forEach((item) => item.classList.remove('active'));
    chip.classList.add('active');
    chip.classList.remove('is-changing');
    void chip.offsetWidth;
    chip.classList.add('is-changing');
    const category = chip.textContent.trim().toLowerCase();
    document.querySelectorAll('.catalog-grid .product-card').forEach((card) => {
        card.hidden = category !== 'todos' && card.dataset.category !== category;
    });
}));

const productDetails = {
    ps5: { specs: '1 TB SSD · 4K · Wi-Fi 6 · 1 control incluido', image: 'assets/ps5-promocion.png' },
    xbox: { specs: '1 TB SSD · 4K UHD · Quick Resume · 1 control incluido', image: 'https://images.unsplash.com/photo-1621259182978-fbf93132d53d?auto=format&fit=crop&w=1200&q=85' },
    switch: { specs: 'Pantalla OLED 7” · 64 GB · modo TV y portátil', image: 'https://images.unsplash.com/photo-1578303512597-81e6cc155b3e?auto=format&fit=crop&w=1200&q=85' },
    racing: { specs: 'PS5 · 1 jugador · multijugador online · +3 años', image: 'assets/racing-24.webp' },
    zelda: { specs: 'Nintendo Switch · aventura · 1 jugador · +10 años', image: 'assets/zelda-echoes-of-wisdom.jpg' },
    spider: { specs: 'PS5 · acción · modo historia · +16 años', image: 'assets/spider-man-2.webp' },
    headset: { specs: 'Audio 7.1 · Bluetooth · micrófono extraíble · 30 h', image: 'https://images.unsplash.com/photo-1599669454699-248893623440?auto=format&fit=crop&w=1200&q=85' },
    controller: { specs: 'Bluetooth · vibración háptica · batería 20 h', image: 'https://images.unsplash.com/photo-1592840496694-26d035b52b48?auto=format&fit=crop&w=1200&q=85' },
    keyboard: { specs: 'Mecánico · RGB · Bluetooth · distribución US', image: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=1200&q=85' },
    mouse: { specs: 'Sensor 25K DPI · inalámbrico · 63 g · USB-C', image: 'https://images.unsplash.com/photo-1527814050087-3793815479db?auto=format&fit=crop&w=1200&q=85' },
    chair: { specs: 'Espuma premium · reclinable 135° · soporte lumbar', image: 'assets/nexus-gamer-chair.jpg' },
    capture: { specs: '4K HDR · 60 FPS · HDMI · USB 3.0', image: 'assets/elgato-capture.jpg' }
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
    modal.innerHTML = `<button class="close-button product-modal-close" type="button" aria-label="Cerrar detalles">×</button><div class="detail-image"><img src="${detail.image}" alt="${productName(id)}"></div><div class="detail-content"><p class="eyebrow">DETALLE DEL PRODUCTO · DEMO</p><h2>${productName(id)}</h2><p class="detail-sku">SKU: ${products[id].sku}</p><strong class="detail-price">${formatPrice(products[id].price)}</strong><p class="detail-specs">${detail.specs}</p><button class="checkout-button detail-add" type="button">Añadir al carrito <span>+</span></button><div class="reviews"><div class="reviews-heading"><h3>Comentarios recientes</h3><span>5 reseñas demo</span></div>${demoReviews.map(([rating, text, author]) => `<article><strong>${rating}</strong><p>“${text}”</p><small>${author}</small></article>`).join('')}</div></div>`;
    modal.classList.add('open');
    playSound('open');
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
        const sku = document.createElement('p');
        sku.className = 'product-sku';
        sku.textContent = `SKU: ${products[id].sku}`;
        card.querySelector('.product-info').insertBefore(sku, card.querySelector('.product-bottom'));
        const detailsButton = document.createElement('button');
        detailsButton.className = 'details-button';
        detailsButton.type = 'button';
        detailsButton.textContent = 'Ver detalles';
        card.querySelector('.product-info').insertBefore(detailsButton, card.querySelector('.product-bottom'));
        detailsButton.addEventListener('click', () => openProductDetails(id));
    });
}

function createReference(prefix) {
    const date = new Date().toISOString().slice(0, 10).replaceAll('-', '');
    const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();
    return `${prefix}-${date}-${suffix}`;
}

function showTrackingOrder(order) {
    const result = get('trackingResult');
    result.replaceChildren();
    const heading = document.createElement('h3');
    heading.textContent = 'Estado del pedido';
    const summary = document.createElement('p');
    summary.textContent = `Pedido ${order.orderId} · Guía ${order.trackingId}`;
    const status = document.createElement('p');
    status.className = 'tracking-current-status';
    status.textContent = order.status;
    const note = document.createElement('p');
    note.textContent = `Pago: ${order.paymentStatus}. El estado de envío es de demostración y no consulta a una empresa transportista.`;
    const itemsHeading = document.createElement('h4');
    itemsHeading.textContent = 'Productos del pedido';
    const itemList = document.createElement('ul');
    order.items.forEach((item) => {
        const listItem = document.createElement('li');
        listItem.textContent = `${item.sku} · ${item.name} × ${item.quantity}`;
        itemList.appendChild(listItem);
    });
    const steps = document.createElement('ol');
    steps.className = 'tracking-steps';
    ['Pedido registrado', 'Preparación del paquete', 'En tránsito', 'Entregado'].forEach((label, index) => {
        const step = document.createElement('li');
        step.textContent = label;
        if (index === 0) step.classList.add('completed');
        steps.appendChild(step);
    });
    result.append(heading, summary, status, note, itemsHeading, itemList, steps);
    result.hidden = false;
}

const trackingForm = get('trackingForm');
function showTrackingMessage(message) {
    const result = get('trackingResult');
    result.textContent = message;
    result.hidden = false;
}

function findOrderByReference(reference) {
    const normalizedReference = reference.trim().toUpperCase();
    return orders.find((item) => item.orderId.toUpperCase() === normalizedReference ||
        item.trackingId.toUpperCase() === normalizedReference);
}

if (trackingForm) {
    if (ordersLoadError) {
        showTrackingMessage('No se pudo leer el historial de pedidos de este navegador. Revisa el almacenamiento del navegador e inténtalo de nuevo.');
    }
    trackingForm.addEventListener('submit', (event) => {
        event.preventDefault();
        if (ordersLoadError) {
            showTrackingMessage('No se pudo leer el historial de pedidos de este navegador. Revisa el almacenamiento del navegador e inténtalo de nuevo.');
            return;
        }
        const order = findOrderByReference(get('trackingReference').value);
        if (!order) {
            showTrackingMessage('No encontramos ese pedido en este navegador. Verifica el número; los pedidos de demostración solo se guardan en el dispositivo donde se crearon.');
            return;
        }
        showTrackingOrder(order);
    });

    const referenceFromUrl = new URLSearchParams(location.search).get('tracking');
    if (referenceFromUrl) {
        get('trackingReference').value = referenceFromUrl;
        const order = findOrderByReference(referenceFromUrl);
        if (ordersLoadError) {
            showTrackingMessage('No se pudo leer el historial de pedidos de este navegador. Revisa el almacenamiento del navegador e inténtalo de nuevo.');
        } else if (order) {
            showTrackingOrder(order);
        } else {
            showTrackingMessage('No encontramos ese pedido en este navegador. Verifica el número; los pedidos de demostración solo se guardan en el dispositivo donde se crearon.');
        }
    }
}

const trackCreatedOrder = get('trackCreatedOrder');
if (trackCreatedOrder) {
    trackCreatedOrder.addEventListener('click', () => {
        const orderId = get('successOrderId').textContent;
        if (!trackingForm) {
            location.href = `catalogo.html?tracking=${encodeURIComponent(orderId)}#seguimiento`;
            return;
        }
        get('trackingReference').value = orderId;
        closeLayers();
        document.getElementById('seguimiento').scrollIntoView({ behavior: 'smooth' });
        const order = findOrderByReference(orderId);
        if (order) showTrackingOrder(order);
    });
}

renderCart();
