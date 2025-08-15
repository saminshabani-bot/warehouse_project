let currentPage = 'dashboard';
let products = [];
let orders = [];
let categories = [];
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
        case 'dashboard':
            loadDashboard();
            break;
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

// Dashboard
async function loadDashboard() {
    try {
        showLoading();
        const stats = await apiCall('/reports/dashboard');
        
        document.getElementById('total-products').textContent = stats.totalProducts;
        document.getElementById('total-orders').textContent = stats.totalOrders;
        document.getElementById('pending-orders').textContent = stats.pendingOrders;
        document.getElementById('weekly-revenue').textContent = formatPrice(stats.weeklyRevenue);

        renderLowStockProducts(stats.lowStockProducts);
        renderRecentOrders(stats.recentOrders);
    } catch (error) {
        showError('خطا در بارگیری داشبورد: ' + error.message);
    } finally {
        hideLoading();
    }
}

function renderLowStockProducts(lowStockProducts) {
    const container = document.getElementById('low-stock-products');
    
    if (lowStockProducts.length === 0) {
        container.innerHTML = '<p class="text-center">موجودی همه محصولات مناسب است</p>';
        return;
    }

    container.innerHTML = lowStockProducts.map(product => `
        <div class="product-item low-stock">
            <div class="item-info">
                <h4>${product.name}</h4>
                <p>${product.category}</p>
            </div>
            <div class="item-stats">
                <div class="stat">موجودی: ${product.inventory}</div>
                <div class="label">حداقل: ${product.min_stock}</div>
            </div>
        </div>
    `).join('');
}

function renderRecentOrders(recentOrders) {
    const container = document.getElementById('recent-orders');
    
    if (recentOrders.length === 0) {
        container.innerHTML = '<p class="text-center">سفارشی وجود ندارد</p>';
        return;
    }

    container.innerHTML = recentOrders.map(order => `
        <div class="order-item-display">
            <div class="item-info">
                <h4>${order.order_number}</h4>
                <p>${order.customer_name}</p>
            </div>
            <div class="item-stats">
                <span class="status-badge ${getStatusClass(order.status)}">${getStatusText(order.status)}</span>
                <div class="stat">${formatPrice(order.total_amount)}</div>
            </div>
        </div>
    `).join('');
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
        const matchesLowStock = !showLowStock || product.inventory <= product.min_stock;
        
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
    if (product.inventory <= 0) {
        return { color: '#dc2626', text: 'ناموجود' };
    } else if (product.inventory <= product.min_stock) {
        return { color: '#d97706', text: 'کم موجود' };
    } else {
        return { color: '#16a34a', text: 'موجود' };
    }
}

function editProduct(id) {
    editingProduct = products.find(p => p.id === id);
    if (editingProduct) {
        document.getElementById('product-modal-title').textContent = 'ویرایش محصول';
        document.getElementById('product-name').value = editingProduct.name;
        document.getElementById('product-price').value = editingProduct.price;
        document.getElementById('product-inventory').value = editingProduct.inventory;
        document.getElementById('product-min-stock').value = editingProduct.min_stock;
        showModal('product-modal');
    }
}

async function deleteProduct(id) {
    if (confirm('آیا از حذف این محصول اطمینان دارید؟')) {
        try {
            await apiCall(`/products/${id}`, { method: 'DELETE' });
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
        await apiCall(`/orders/${orderId}/status`, {
            method: 'PUT',
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
        const order = await apiCall(`/orders/${orderId}`);
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
                <p style="font-size: 1.125rem; font-weight: 600;">${order.order_number}</p>
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
                    ${order.customer_email ? `
                        <div>
                            <label style="font-size: 0.875rem; color: #6b7280;">ایمیل</label>
                            <p>${order.customer_email}</p>
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
                            <th>دسته‌بندی</th>
                            <th>قیمت واحد</th>
                            <th>تعداد</th>
                            <th>مجموع</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${order.items.map(item => `
                            <tr>
                                <td style="font-weight: 500;">${item.product_name}</td>
                                <td>${item.category}</td>
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
                <span style="color: #2563eb;">${formatPrice(order.total_amount)}</span>
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
            price: parseFloat(document.getElementById('product-price').value),
            stock: parseInt(document.getElementById('product-stock').value),
            min_stock: parseInt(document.getElementById('product-min-stock').value)
        };

        try {
            if (editingProduct) {
                await apiCall(`/products/${editingProduct.id}`, {
                    method: 'PUT',
                    body: JSON.stringify(formData)
                });
            } else {
                await apiCall('/products', {
                    method: 'POST',
                    body: JSON.stringify(formData)
                });
            }
            
            hideModal('product-modal');
            loadProducts();
        } catch (error) {
            showError('خطا در ذخیره محصول: ' + error.message);
        }
    });
}

// Order form
function initOrderForm() {
    document.getElementById('add-order-btn').addEventListener('click', () => {
        orderItems = [{ product_id: 0, quantity: 1 }];
        document.getElementById('order-form').reset();
        renderOrderItems();
        showModal('order-modal');
    });

    document.getElementById('add-order-item').addEventListener('click', () => {
        orderItems.push({ product_id: 0, quantity: 1 });
        renderOrderItems();
    });

    document.getElementById('order-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const validItems = orderItems.filter(item => item.product_id > 0 && item.quantity > 0);
        if (validItems.length === 0) {
            showError('حداقل یک آیتم باید انتخاب شود');
            return;
        }

        const formData = {
            customer_name: document.getElementById('customer-name').value,
            customer_email: document.getElementById('customer-email').value,
            items: validItems
        };

        try {
            await apiCall('/orders', {
                method: 'POST',
                body: JSON.stringify(formData)
            });
            
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
            products = await apiCall('/products');
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
                    ${products.filter(p => p.inventory > 0).map(product => `
                        <option value="${product.id}" ${item.product_id === product.id ? 'selected' : ''}>
                            ${product.name} - ${formatPrice(product.price)} (موجودی: ${product.inventory})
                        </option>
                    `).join('')}
                </select>
                
                <input type="number" class="quantity-input" value="${item.quantity}" min="1" 
                       max="${selectedProduct?.inventory || 999}"
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

    // Reports filter
    document.getElementById('reports-days').addEventListener('change', loadReports);
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