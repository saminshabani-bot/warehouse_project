let currentPage = 'dashboard';
let products = [];
let orders = [];
let editingProduct = null;
let orderItems = [];

// API functions
const API_BASE = 'http://localhost:3000';

async function apiCall(endpoint) {
    try {
        const response = await fetch(`${API_BASE}${endpoint}`);

        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: 'خطای ناشناخته' }));
            throw new Error(error.error || 'خطای شبکه');
        }

        return response.json();
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

// Utility functions
function formatPrice(price) {
    return new Intl.NumberFormat('fa-IR').format(price) + ' تومان';
}

function formatDate(dateString) {
    return new Intl.DateTimeFormat('fa-IR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }).format(new Date(dateString));
}

function getStatusText(status) {
    const statusMap = {
        'pending': 'در انتظار',
        'shipped': 'ارسال شده',
        'cancelled': 'لغو شده'
    };
    return statusMap[status] || status;
}

function getStatusClass(status) {
    const classMap = {
        'pending': 'status-pending',
        'shipped': 'status-shipped',
        'cancelled': 'status-cancelled'
    };
    return classMap[status] || '';
}

function getInventoryTypeText(type) {
    const typeMap = {
        'initial': 'موجودی اولیه',
        'in': 'افزودن',
        'out': 'کاهش',
        'adjustment': 'تعدیل'
    };
    return typeMap[type] || type;
}

function showLoading() {
    document.getElementById('loading').classList.remove('hidden');
}

function hideLoading() {
    document.getElementById('loading').classList.add('hidden');
}

function showError(message) {
    alert(message); // Simple error display - could be enhanced with a toast system
}

// Navigation
function initNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const page = item.dataset.page;
            if (page) {
                navigateToPage(page);
            }
        });
    });
}

function navigateToPage(page) {
    // Update active nav item
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    document.querySelector(`[data-page="${page}"]`).classList.add('active');

    // Show/hide pages
    document.querySelectorAll('.page').forEach(pageEl => {
        pageEl.classList.remove('active');
    });
    document.getElementById(`${page}-page`).classList.add('active');

    currentPage = page;

    // Load page data
    switch (page) {
        case 'products':
            loadProducts();
            break;
        case 'orders':
            loadOrders();
            break;
        case 'reports':
            loadReports();
            break;
    }
}



// Products
async function loadProducts() {
    try {
        showLoading();
        const productsData = await apiCall('/api/products');
        products = productsData;
        filterProducts();
    } catch (error) {
        showError('خطا در بارگیری محصولات: ' + error.message);
    } finally {
        hideLoading();
    }
}

function filterProducts() {
    const searchTerm = document.getElementById('product-search').value.toLowerCase();
    const showLowStock = document.getElementById('low-stock-filter').checked;

    let filtered = products.filter(product => {
        const matchesSearch = product.name.toLowerCase().includes(searchTerm);
        const matchesLowStock = !showLowStock || product.stock <= product.min_stock;

        return matchesSearch && matchesLowStock;
    });

    renderProductsTable(filtered);
}

function renderProductsTable(productsToShow) {
    const tbody = document.getElementById('products-table-body');
    const emptyState = document.getElementById('products-empty');

    if (productsToShow.length === 0) {
        tbody.innerHTML = '';
        emptyState.classList.remove('hidden');
        return;
    }

    emptyState.classList.add('hidden');
    tbody.innerHTML = productsToShow.map(product => {
        const inventoryStatus = getInventoryStatus(product);
        return `
            <tr>
                <td>
                    <div style="display: flex; align-items: center; gap: 0.75rem;">
                        <div style="width: 2.5rem; height: 2.5rem; background: #f3f4f6; border-radius: 0.5rem; display: flex; align-items: center; justify-content: center;">
                        </div>
                        <div>
                            <div style="font-weight: 500;">${product.name}</div>
                        </div>
                    </div>
                </td>
                <td>${product.description}</td>
                <td>${formatPrice(product.price)}</td>
                <td>
                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                        ${product.stock <= product.min_stock ? `
                        ` : ''}
                        ${product.stock}
                        <span style="font-size: 0.75rem; color: #6b7280;">(حداقل: ${product.min_stock})</span>
                    </div>
                </td>
                <td><span style="color: ${inventoryStatus.color}; font-weight: 500;">${inventoryStatus.text}</span></td>
                <td style="font-size: 0.75rem; color: #6b7280;">${formatDate(product.created_at)}</td>
                <td>
                    <div style="display: flex; gap: 0.5rem;">
                        <button class="action-btn edit" onclick="editProduct(${product.id})">ویرایش
                        </button>
                        <button class="action-btn delete" onclick="deleteProduct(${product.id})">حذف
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function getInventoryStatus(product) {
    if (product.stock <= 0) {
        return { color: '#dc2626', text: 'ناموجود' };
    } else if (product.stock <= product.min_stock) {
        return { color: '#d97706', text: 'کم موجود' };
    } else {
        return { color: '#16a34a', text: 'موجود' };
    }
}

function editProduct(id) {
    const editingProduct = products.find(p => p.id === id);
    if (!editingProduct) return;

    document.getElementById('product-modal-title').textContent = 'ویرایش محصول';
    document.getElementById('product-description').value = editingProduct.description;
    document.getElementById('product-name').value = editingProduct.name;
    document.getElementById('product-price').value = editingProduct.price;
    document.getElementById('product-stock').value = editingProduct.stock;
    document.getElementById('product-min-stock').value = editingProduct.min_stock;

    showModal('product-modal');

    const form = document.getElementById('product-form');
    form.onsubmit = async (e) => {
        e.preventDefault();

        const formData = {
            name: document.getElementById('product-name').value,
            description: document.getElementById('product-description').value,
            price: parseFloat(document.getElementById('product-price').value),
            stock: parseInt(document.getElementById('product-stock').value),
            min_stock: parseInt(document.getElementById('product-min-stock').value)
        };

        try {
            const options = {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            };
            const res = await fetch(`/api/products/${id}`, options);

            hideModal('product-modal');
            loadProducts();
        } catch (error) {
            showError('خطا در ذخیره محصول: ' + error.message);
        }
    };
}


async function deleteProduct(id) {
    if (confirm('آیا از حذف این محصول اطمینان دارید؟')) {
        try {
            await apiCall(`/api/products/${id}`, { method: 'DELETE' });
            loadProducts();
        } catch (error) {
            showError('خطا در حذف محصول: ' + error.message);
        }
    }
}

// Orders
async function loadOrders() {
    try {
        showLoading();
        orders = await apiCall('/api/orders');
        filterOrders();
    } catch (error) {
        showError('خطا در بارگیری سفارشات: ' + error.message);
    } finally {
        hideLoading();
    }
}
function filterOrders() {
    const searchTerm = document.getElementById('order-search').value.toLowerCase();
    const statusFilter = document.getElementById('status-filter').value;

    let filtered = orders.filter(order => {
        const matchesSearch = !searchTerm || order.id.toString().includes(searchTerm);
        const matchesStatus = !statusFilter || order.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    renderOrdersTable(filtered);
}

function renderOrdersTable(ordersToShow) {
    const tbody = document.getElementById('orders-table-body');
    const emptyState = document.getElementById('orders-empty');

    if (ordersToShow.length === 0) {
        tbody.innerHTML = '';
        emptyState.classList.remove('hidden');
        return;
    }

    emptyState.classList.add('hidden');
    tbody.innerHTML = ordersToShow.map(order => `
        <tr>
            <td style="font-weight: 500;">${order.id}</td>
            <td>
                <div>
                    <div style="font-weight: 500;">${order.customer_name}</div>
                    ${order.customer_phone ? `<div style="font-size: 0.75rem; color: #6b7280;">${order.customer_phone}</div>` : ''}
                </div>
            </td>
            <td style="font-size: 0.75rem; color: #6b7280;">${order.product_name}</td>
            <td style="font-size: .75rem; color:#6b7280;">${order.quantity}</td>
            <td>${formatPrice(order.total_price)}</td>
            <td>
                <select onchange="updateOrderStatus(${order.id}, this.value)" class="status-badge ${getStatusClass(order.status)}" style="border: none; background: transparent; font-size: 0.75rem; font-weight: 500;">
                    <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>در انتظار</option>
                    <option value="shipped" ${order.status === 'shipped' ? 'selected' : ''}>ارسال شده</option>
                    <option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>لغو شده</option>
                </select>
            </td>
            <td style="font-size: 0.75rem; color: #6b7280;">${formatDate(order.created_at)}</td>
            <td>
                <button class="action-btn view" onclick="viewOrderDetails(${order.id})">حذف
                </button>
            </td>
        </tr>
    `).join('');
}

async function updateOrderStatus(orderId, newStatus) {
    try {
        await fetch(`http://localhost:3000/api/orders/${orderId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus })
        });
        loadOrders();
    } catch (error) {
        showError('خطا در تغییر وضعیت سفارش: ' + error.message);
        loadOrders(); // Reload to reset the select
    }
}

async function viewOrderDetails(orderId) {
    try {
        const order = await apiCall(`http://localhost:3000/api/orders/${orderId}`);
        renderOrderDetails(order);
        showModal('order-details-modal');
    } catch (error) {
        showError('خطا در بارگیری جزئیات سفارش: ' + error.message);
    }
}

function renderOrderDetails(order) {
    const content = document.getElementById('order-details-content');
    content.innerHTML = `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem;">
            <div>
                <label style="font-size: 0.875rem; color: #6b7280;">شماره سفارش</label>
                <p style="font-size: 1.125rem; font-weight: 600;">${order.id}</p>
            </div>
            <div>
                <label style="font-size: 0.875rem; color: #6b7280;">تاریخ ثبت</label>
                <p style="font-size: 1.125rem;">${formatDate(order.created_at)}</p>
            </div>
        </div>

        <div style="margin-bottom: 1.5rem;">
            <h4 style="font-size: 1rem; font-weight: 500; margin-bottom: 0.75rem;">اطلاعات مشتری</h4>
            <div style="background: #f9fafb; padding: 1rem; border-radius: 0.5rem;">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                    <div>
                        <label style="font-size: 0.875rem; color: #6b7280;">نام مشتری</label>
                        <p>${order.customer_name}</p>
                    </div>
                    ${order.customer_phone ? `
                        <div>
                            <label style="font-size: 0.875rem; color: #6b7280;">ایمیل</label>
                            <p>${order.customer_phone}</p>
                        </div>
                    ` : ''}
                </div>
            </div>
        </div>

        <div style="margin-bottom: 1.5rem;">
            <h4 style="font-size: 1rem; font-weight: 500; margin-bottom: 0.75rem;">آیتم‌های سفارش</h4>
            <div style="overflow-x: auto;">
                <table class="table">
                    <thead>
                        <tr>
                            <th>محصول</th>
                            <th>قیمت واحد</th>
                            <th>تعداد</th>
                            <th>مجموع</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${order.items.map(item => `
                            <tr>
                                <td style="font-weight: 500;">${item.product_name}</td>
                                <td>${formatPrice(item.unit_price)}</td>
                                <td>${item.quantity}</td>
                                <td style="font-weight: 500;">${formatPrice(item.total_price)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>

        <div style="border-top: 1px solid #e5e7eb; padding-top: 1rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 1.25rem; font-weight: bold;">
                <span>مجموع کل:</span>
                <span style="color: #2563eb;">${formatPrice(order.total_price)}</span>
            </div>
        </div>
    `;
}

// Modal functions
function showModal(modalId) {
    document.getElementById('modal-overlay').classList.remove('hidden');
    document.getElementById(modalId).classList.remove('hidden');
}

function hideModal(modalId) {
    document.getElementById('modal-overlay').classList.add('hidden');
    document.getElementById(modalId).classList.add('hidden');
}

function initModals() {
    // Close modal when clicking overlay
    document.getElementById('modal-overlay').addEventListener('click', (e) => {
        if (e.target === e.currentTarget) {
            hideAllModals();
        }
    });

    // Close modal buttons
    document.querySelectorAll('.modal-close, [data-modal]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const modalId = btn.dataset.modal;
            if (modalId) {
                hideModal(modalId);
            } else {
                hideAllModals();
            }
        });
    });
}

function hideAllModals() {
    document.getElementById('modal-overlay').classList.add('hidden');
    document.querySelectorAll('.modal').forEach(modal => {
        modal.classList.add('hidden');
    });
}

// Product form
function initProductForm() {
    document.getElementById('add-product-btn').addEventListener('click', () => {
        editingProduct = null;
        document.getElementById('product-modal-title').textContent = 'افزودن محصول جدید';
        document.getElementById('product-form').reset();
        showModal('product-modal');
    });

    document.getElementById('product-form').addEventListener('submit', async (e) => {
        e.preventDefault();

        const formData = {
            name: document.getElementById('product-name').value,
            description: document.getElementById('product-description').value,
            price: parseFloat(document.getElementById('product-price').value),
            stock: parseInt(document.getElementById('product-stock').value),
            min_stock: parseInt(document.getElementById('product-min-stock').value)
        };
        try {
            const options = {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            };
            await fetch(`http://localhost:3000/api/products`, options);

            hideModal('product-modal');
            loadProducts();
        } catch (error) {
            showError('خطا در ذخیره محصول: ' + error.message);
        }
    });
}

// Order form
function initOrderForm() {
    const addBtn = document.getElementById('add-order-btn');
    const form = document.getElementById('order-form');

    // اضافه کردن سفارش جدید
    addBtn.addEventListener('click', () => {
        orderItems = [{ product_id: 0, quantity: 1 }];
        form.reset();
        renderOrderItems();
        showModal('order-modal');
    });

    // ارسال فرم
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        // فیلتر آیتم‌های معتبر
        let validItems = [];
        orderItems.forEach(item => {
            if (item.product_id > 0 && item.quantity > 0) {
                validItems.push(item);
            }
        });

        if (validItems.length === 0) {
            showError('حداقل یک آیتم باید انتخاب شود');
            return;
        }

        const firstItem = validItems[0];

        // محاسبه قیمت کل برای اولین آیتم
        const selectedProduct = products.find(p => p.id === firstItem.product_id);
        const totalPrice = selectedProduct
            ? selectedProduct.price * firstItem.quantity
            : 0;

        // اعتبارسنجی نام مشتری
        const customerName = document.getElementById('customer-name').value.trim();
        if (!customerName || customerName.length > 100) {
            showError('نام مشتری باید وارد شود و کمتر از 100 کاراکتر باشد');
            return;
        }

        // اعتبارسنجی شماره تماس
        const customerPhone = document.getElementById('customer-phone').value.trim();
        if (!customerPhone) {
            showError('شماره تماس باید وارد شود');
            return;
        }
        if (customerPhone.length > 20) {
            showError('شماره تماس نمی‌تواند بیشتر از 20 کاراکتر باشد');
            return;
        }

        // ساخت داده‌های فرم
        const formData = {
            product_id: parseInt(firstItem.product_id, 10),
            quantity: parseInt(firstItem.quantity, 10),
            total_price: Number(totalPrice.toFixed(2)),
            customer_name: customerName,
            customer_phone: customerPhone,
            notes: '',
            status: 'pending'
        };

        try {
            const response = await fetch('http://localhost:3000/api/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (!response.ok) {
                showError(data.message || 'خطا در ثبت سفارش');
                return;
            }

            hideModal('order-modal');
            loadOrders();
        } catch (error) {
            showError('خطا در ثبت سفارش: ' + error.message);
        }
    });

}


async function renderOrderItems() {
    if (products.length === 0) {
        try {
            products = await apiCall('/api/products');
        } catch (error) {
            showError('خطا در بارگیری محصولات: ' + error.message);
            return;
        }
    }

    const container = document.getElementById('order-items');
    container.innerHTML = orderItems.map((item, index) => {
        const selectedProduct = products.find(p => p.id === item.product_id);
        const totalPrice = selectedProduct ? selectedProduct.price * item.quantity : 0;

        return `
            <div class="order-item">
                <select class="product-select" onchange="updateOrderItem(${index}, 'product_id', parseInt(this.value))">
                    <option value="0">محصول را انتخاب کنید</option>
                    ${products.filter(p => p.stock > 0).map(product => `
                        <option value="${product.id}" ${item.product_id === product.id ? 'selected' : ''}>
                            ${product.name} - ${formatPrice(product.price)} (موجودی: ${product.stock})
                        </option>
                    `).join('')}
                </select>
                
                <input type="number" class="quantity-input" value="${item.quantity}" min="1" 
                       max="${selectedProduct?.stock || 999}"
                       onchange="updateOrderItem(${index}, 'quantity', parseInt(this.value))">
                
                <div class="price-display">${formatPrice(totalPrice)}</div>
                
                ${orderItems.length > 1 ? `
                    <button type="button" class="remove-btn" onclick="removeOrderItem(${index})">
                    </button>
                ` : ''}
            </div>
        `;
    }).join('');

    updateOrderTotal();
}

function updateOrderItem(index, field, value) {
    orderItems[index][field] = value;
    renderOrderItems();
}

function removeOrderItem(index) {
    orderItems.splice(index, 1);
    renderOrderItems();
}

function updateOrderTotal() {
    const total = orderItems.reduce((sum, item) => {
        const product = products.find(p => p.id === item.product_id);
        return sum + (product ? product.price * item.quantity : 0);
    }, 0);

    document.getElementById('order-total-amount').textContent = formatPrice(total);
}

// Event listeners
function initEventListeners() {
    // Product filters
    document.getElementById('product-search').addEventListener('input', filterProducts);
    document.getElementById('low-stock-filter').addEventListener('change', filterProducts);

    // Order filters
    document.getElementById('order-search').addEventListener('input', filterOrders);
    document.getElementById('status-filter').addEventListener('change', filterOrders);
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    initModals();
    initProductForm();
    initOrderForm();
    initEventListeners();

    // Load initial page
    loadDashboard();
});