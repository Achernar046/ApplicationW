/**
 * app.js - Product Management Dashboard Application
 * จัดการการเรียกใช้งาน API สำหรับ CRUD สินค้า, ค้นหา, กรอง, และแจ้งเตือน
 */

const API_BASE = 'api';

// Application State
const state = {
    products: [],
    categories: [],
    suppliers: [],
    currentFilter: {
        search: '',
        category_id: '',
        supplier_id: ''
    },
    editingId: null,
    isLoading: false
};

// DOM Elements cache
let elements = {};

document.addEventListener('DOMContentLoaded', () => {
    initElements();
    initEventListeners();
    loadInitialData();
});

function initElements() {
    elements = {
        productsTableBody: document.getElementById('productsTableBody'),
        loadingIndicator: document.getElementById('loadingIndicator'),
        emptyState: document.getElementById('emptyState'),
        searchInput: document.getElementById('searchInput'),
        categoryFilter: document.getElementById('categoryFilter'),
        supplierFilter: document.getElementById('supplierFilter'),
        btnResetFilter: document.getElementById('btnResetFilter'),
        btnRefresh: document.getElementById('btnRefresh'),
        
        // Stats
        totalProductsCount: document.getElementById('totalProductsCount'),
        totalCategoriesCount: document.getElementById('totalCategoriesCount'),
        totalSuppliersCount: document.getElementById('totalSuppliersCount'),
        avgPriceDisplay: document.getElementById('avgPriceDisplay'),
        resultsBadge: document.getElementById('resultsBadge'),

        // Product Modal
        productModalEl: document.getElementById('productModal'),
        productModalTitle: document.getElementById('productModalTitle'),
        productForm: document.getElementById('productForm'),
        productIdInput: document.getElementById('modalProductId'),
        productNameInput: document.getElementById('modalProductName'),
        supplierSelect: document.getElementById('modalSupplierId'),
        categorySelect: document.getElementById('modalCategoryId'),
        unitInput: document.getElementById('modalUnit'),
        priceInput: document.getElementById('modalPrice'),
        modalSubmitBtn: document.getElementById('modalSubmitBtn'),
        modalSubmitText: document.getElementById('modalSubmitText'),
        modalSubmitSpinner: document.getElementById('modalSubmitSpinner'),
        modalErrorAlert: document.getElementById('modalErrorAlert'),
        modalErrorList: document.getElementById('modalErrorList'),

        // View Modal
        viewModalEl: document.getElementById('viewProductModal'),
        viewId: document.getElementById('viewProductId'),
        viewName: document.getElementById('viewProductName'),
        viewCategory: document.getElementById('viewCategoryName'),
        viewSupplier: document.getElementById('viewSupplierName'),
        viewUnit: document.getElementById('viewUnit'),
        viewPrice: document.getElementById('viewPrice')
    };

    // Initialize Bootstrap Modals
    if (elements.productModalEl) {
        state.productModal = new bootstrap.Modal(elements.productModalEl);
    }
    if (elements.viewModalEl) {
        state.viewModal = new bootstrap.Modal(elements.viewModalEl);
    }
}

function initEventListeners() {
    // Search with debounce
    let debounceTimer;
    if (elements.searchInput) {
        elements.searchInput.addEventListener('input', (e) => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                state.currentFilter.search = e.target.value.trim();
                fetchProducts();
            }, 300);
        });
    }

    // Category filter
    if (elements.categoryFilter) {
        elements.categoryFilter.addEventListener('change', (e) => {
            state.currentFilter.category_id = e.target.value;
            fetchProducts();
        });
    }

    // Supplier filter
    if (elements.supplierFilter) {
        elements.supplierFilter.addEventListener('change', (e) => {
            state.currentFilter.supplier_id = e.target.value;
            fetchProducts();
        });
    }

    // Reset filters
    if (elements.btnResetFilter) {
        elements.btnResetFilter.addEventListener('click', resetFilters);
    }

    // Refresh data
    if (elements.btnRefresh) {
        elements.btnRefresh.addEventListener('click', () => {
            fetchProducts();
            showToast('รีเฟรชข้อมูลเรียบร้อย', 'info');
        });
    }

    // Form submit for Add / Edit
    if (elements.productForm) {
        elements.productForm.addEventListener('submit', handleFormSubmit);
    }

    // Reset modal errors on modal close
    if (elements.productModalEl) {
        elements.productModalEl.addEventListener('hidden.bs.modal', () => {
            resetModalForm();
        });
    }
}

/**
 * โหลดข้อมูลเริ่มต้น (หมวดหมู่, ซัพพลายเออร์, รายการสินค้า)
 */
async function loadInitialData() {
    try {
        await Promise.all([
            fetchCategories(),
            fetchSuppliers()
        ]);
        await fetchProducts();
    } catch (error) {
        console.error('Initial load error:', error);
        Swal.fire({
            icon: 'error',
            title: 'เกิดข้อผิดพลาดในการโหลดข้อมูล',
            text: 'ไม่สามารถเชื่อมต่อกับ API หรือฐานข้อมูลได้ กรุณาตรวจสอบการตั้งค่า'
        });
    }
}

/**
 * ดึงรายการหมวดหมู่ (GET /api/categories)
 */
async function fetchCategories() {
    try {
        const res = await fetch(`${API_BASE}/categories`);
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
            state.categories = json.data;
            renderCategoryOptions();
            if (elements.totalCategoriesCount) {
                elements.totalCategoriesCount.textContent = state.categories.length;
            }
        }
    } catch (err) {
        console.error('Error fetching categories:', err);
    }
}

/**
 * ดึงรายการผู้จัดจำหน่าย (GET /api/suppliers)
 */
async function fetchSuppliers() {
    try {
        const res = await fetch(`${API_BASE}/suppliers`);
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
            state.suppliers = json.data;
            renderSupplierOptions();
            if (elements.totalSuppliersCount) {
                elements.totalSuppliersCount.textContent = state.suppliers.length;
            }
        }
    } catch (err) {
        console.error('Error fetching suppliers:', err);
    }
}

function renderCategoryOptions() {
    // Fill Filter Dropdown
    if (elements.categoryFilter) {
        elements.categoryFilter.innerHTML = '<option value="">ทุกหมวดหมู่ (All Categories)</option>';
        state.categories.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.id;
            opt.textContent = `${c.name} (#${c.id})`;
            elements.categoryFilter.appendChild(opt);
        });
    }

    // Fill Modal Dropdown
    if (elements.categorySelect) {
        elements.categorySelect.innerHTML = '<option value="" disabled selected>-- เลือกหมวดหมู่ --</option>';
        state.categories.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.id;
            opt.textContent = `${c.name} (#${c.id})`;
            elements.categorySelect.appendChild(opt);
        });
    }
}

function renderSupplierOptions() {
    // Fill Filter Dropdown
    if (elements.supplierFilter) {
        elements.supplierFilter.innerHTML = '<option value="">ทุกผู้จัดจำหน่าย (All Suppliers)</option>';
        state.suppliers.forEach(s => {
            const opt = document.createElement('option');
            opt.value = s.id;
            opt.textContent = `${s.name} (#${s.id})`;
            elements.supplierFilter.appendChild(opt);
        });
    }

    // Fill Modal Dropdown
    if (elements.supplierSelect) {
        elements.supplierSelect.innerHTML = '<option value="" disabled selected>-- เลือกผู้จัดจำหน่าย --</option>';
        state.suppliers.forEach(s => {
            const opt = document.createElement('option');
            opt.value = s.id;
            opt.textContent = `${s.name} (#${s.id})`;
            elements.supplierSelect.appendChild(opt);
        });
    }
}

/**
 * ดึงรายการสินค้า (GET /api/products) พร้อมเงื่อนไขค้นหา
 */
async function fetchProducts() {
    setLoading(true);

    try {
        const params = new URLSearchParams();
        if (state.currentFilter.search) {
            params.append('q', state.currentFilter.search);
        }
        if (state.currentFilter.category_id) {
            params.append('category_id', state.currentFilter.category_id);
        }
        if (state.currentFilter.supplier_id) {
            params.append('supplier_id', state.currentFilter.supplier_id);
        }

        const url = `${API_BASE}/products${params.toString() ? '?' + params.toString() : ''}`;
        const res = await fetch(url);
        const json = await res.json();

        if (json.success && Array.isArray(json.data)) {
            state.products = json.data;
            renderProductsTable(state.products);
            updateStats(state.products);
        } else {
            throw new Error(json.message || 'ไม่สามารถโหลดข้อมูลสินค้าได้');
        }
    } catch (err) {
        console.error('Error fetching products:', err);
        elements.productsTableBody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center py-4 text-danger">
                    <i class="bi bi-exclamation-triangle fs-3 d-block mb-2"></i>
                    เกิดข้อผิดพลาดในการโหลดข้อมูล: ${err.message}
                </td>
            </tr>
        `;
    } finally {
        setLoading(false);
    }
}

function setLoading(isLoading) {
    state.isLoading = isLoading;
    if (elements.loadingIndicator) {
        elements.loadingIndicator.classList.toggle('d-none', !isLoading);
    }
    if (elements.productsTableBody && isLoading) {
        elements.productsTableBody.classList.add('opacity-50');
    } else if (elements.productsTableBody) {
        elements.productsTableBody.classList.remove('opacity-50');
    }
}

/**
 * วาดตารางแสดงรายการสินค้า
 */
function renderProductsTable(products) {
    if (!elements.productsTableBody) return;

    elements.productsTableBody.innerHTML = '';

    if (products.length === 0) {
        if (elements.emptyState) elements.emptyState.classList.remove('d-none');
        if (elements.resultsBadge) elements.resultsBadge.textContent = '0 รายการ';
        return;
    }

    if (elements.emptyState) elements.emptyState.classList.add('d-none');
    if (elements.resultsBadge) elements.resultsBadge.textContent = `${products.length} รายการ`;

    const fragment = document.createDocumentFragment();

    products.forEach((p, idx) => {
        const tr = document.createElement('tr');
        tr.className = 'align-middle product-row';

        // หมวดหมู่ Badge หลากสี
        const catBadgeClass = getCategoryBadgeClass(p.category_id);
        const formattedPrice = Number(p.price).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

        tr.innerHTML = `
            <td class="text-center fw-bold text-secondary">
                <span class="badge bg-light text-dark border">#${p.id}</span>
            </td>
            <td>
                <div class="fw-semibold text-dark product-title">${escapeHtml(p.name)}</div>
            </td>
            <td>
                <span class="badge ${catBadgeClass} rounded-pill px-3 py-1">
                    <i class="bi bi-tag-fill me-1"></i>${escapeHtml(p.category_name)}
                </span>
            </td>
            <td>
                <span class="text-muted small"><i class="bi bi-building me-1"></i>${escapeHtml(p.supplier_name)}</span>
            </td>
            <td>
                <span class="badge bg-secondary-subtle text-secondary-emphasis px-2 py-1">${escapeHtml(p.unit)}</span>
            </td>
            <td class="text-end fw-bold text-success">
                <span class="fs-6">฿${formattedPrice}</span>
            </td>
            <td class="text-center">
                <div class="btn-group btn-group-sm" role="group">
                    <button class="btn btn-outline-info" onclick="viewProduct(${p.id})" title="ดูรายละเอียด">
                        <i class="bi bi-eye"></i>
                    </button>
                    <button class="btn btn-outline-primary" onclick="openEditModal(${p.id})" title="แก้ไข">
                        <i class="bi bi-pencil-square"></i>
                    </button>
                    <button class="btn btn-outline-danger" onclick="confirmDeleteProduct(${p.id}, '${escapeJs(p.name)}')" title="ลบ">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </td>
        `;

        fragment.appendChild(tr);
    });

    elements.productsTableBody.appendChild(fragment);
}

function getCategoryBadgeClass(categoryId) {
    const classes = [
        'bg-primary-subtle text-primary-emphasis border border-primary-subtle',
        'bg-success-subtle text-success-emphasis border border-success-subtle',
        'bg-warning-subtle text-warning-emphasis border border-warning-subtle',
        'bg-info-subtle text-info-emphasis border border-info-subtle',
        'bg-danger-subtle text-danger-emphasis border border-danger-subtle',
        'bg-secondary-subtle text-secondary-emphasis border border-secondary-subtle'
    ];
    return classes[(categoryId || 0) % classes.length];
}

function updateStats(products) {
    if (elements.totalProductsCount) {
        elements.totalProductsCount.textContent = products.length;
    }

    if (elements.avgPriceDisplay && products.length > 0) {
        const sum = products.reduce((acc, curr) => acc + Number(curr.price || 0), 0);
        const avg = sum / products.length;
        elements.avgPriceDisplay.textContent = `฿${avg.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    } else if (elements.avgPriceDisplay) {
        elements.avgPriceDisplay.textContent = '฿0.00';
    }
}

function resetFilters() {
    if (elements.searchInput) elements.searchInput.value = '';
    if (elements.categoryFilter) elements.categoryFilter.value = '';
    if (elements.supplierFilter) elements.supplierFilter.value = '';
    state.currentFilter = { search: '', category_id: '', supplier_id: '' };
    fetchProducts();
}

/**
 * เปิด Modal สำหรับเพิ่มสินค้าใหม่ (Create Mode)
 */
function openCreateModal() {
    state.editingId = null;
    resetModalForm();

    if (elements.productModalTitle) {
        elements.productModalTitle.innerHTML = '<i class="bi bi-plus-circle me-2 text-success"></i>เพิ่มข้อมูลสินค้าใหม่';
    }
    if (elements.modalSubmitText) {
        elements.modalSubmitText.textContent = 'บันทึกข้อมูลสินค้า';
    }
    if (elements.modalSubmitBtn) {
        elements.modalSubmitBtn.className = 'btn btn-success px-4';
    }

    state.productModal.show();
    setTimeout(() => elements.productNameInput?.focus(), 300);
}

/**
 * เปิด Modal สำหรับแก้ไขข้อมูลสินค้า (Update Mode)
 */
async function openEditModal(productId) {
    state.editingId = productId;
    resetModalForm();

    if (elements.productModalTitle) {
        elements.productModalTitle.innerHTML = `<i class="bi bi-pencil-square me-2 text-warning"></i>แก้ไขสินค้า <span class="badge bg-warning text-dark">#${productId}</span>`;
    }
    if (elements.modalSubmitText) {
        elements.modalSubmitText.textContent = 'อัปเดตข้อมูลสินค้า';
    }
    if (elements.modalSubmitBtn) {
        elements.modalSubmitBtn.className = 'btn btn-warning px-4 text-dark fw-semibold';
    }

    state.productModal.show();

    // ดึงข้อมูลสินค้าจาก API หรือจาก state
    try {
        let product = state.products.find(p => p.id === productId);
        if (!product) {
            const res = await fetch(`${API_BASE}/products/${productId}`);
            const json = await res.json();
            if (json.success && json.data) {
                product = json.data;
            } else {
                throw new Error(json.message || 'ไม่พบข้อมูล');
            }
        }

        // Prefill Form
        if (elements.productIdInput) elements.productIdInput.value = product.id;
        if (elements.productNameInput) elements.productNameInput.value = product.name;
        if (elements.supplierSelect) elements.supplierSelect.value = product.supplier_id;
        if (elements.categorySelect) elements.categorySelect.value = product.category_id;
        if (elements.unitInput) elements.unitInput.value = product.unit;
        if (elements.priceInput) elements.priceInput.value = product.price;

    } catch (err) {
        Swal.fire({
            icon: 'error',
            title: 'เกิดข้อผิดพลาด',
            text: `ไม่สามารถดึงข้อมูลสินค้ารหัส #${productId} ได้: ${err.message}`
        });
        state.productModal.hide();
    }
}

/**
 * จัดการการส่งฟอร์ม (Create / Update)
 */
async function handleFormSubmit(e) {
    e.preventDefault();
    clearModalErrors();

    const form = elements.productForm;
    if (!form.checkValidity()) {
        e.stopPropagation();
        form.classList.add('was-validated');
        return;
    }
    form.classList.add('was-validated');

    const isEdit = state.editingId !== null;
    const payload = {
        name: elements.productNameInput.value.trim(),
        supplier_id: parseInt(elements.supplierSelect.value, 10),
        category_id: parseInt(elements.categorySelect.value, 10),
        unit: elements.unitInput.value.trim(),
        price: parseFloat(elements.priceInput.value)
    };

    setModalSubmitting(true);

    try {
        const url = isEdit ? `${API_BASE}/products/${state.editingId}` : `${API_BASE}/products`;
        const method = isEdit ? 'PUT' : 'POST';

        const res = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const result = await res.json();

        if (res.ok && result.success) {
            state.productModal.hide();
            await fetchProducts();

            Swal.fire({
                icon: 'success',
                title: isEdit ? 'อัปเดตข้อมูลสำเร็จ!' : 'เพิ่มข้อมูลสำเร็จ!',
                html: `
                    <div class="text-start p-2 bg-light rounded small mt-2">
                        <div><strong>รหัสสินค้า:</strong> #${result.data?.id || state.editingId}</div>
                        <div><strong>ชื่อสินค้า:</strong> ${escapeHtml(payload.name)}</div>
                        <div><strong>ราคา:</strong> ฿${payload.price.toFixed(2)}</div>
                    </div>
                `,
                timer: 2500,
                showConfirmButton: false
            });
        } else if (res.status === 422 || result.errors) {
            showModalErrors(result.errors || { general: result.message || 'ข้อมูลไม่ผ่านการตรวจสอบ' });
        } else {
            throw new Error(result.message || 'บันทึกข้อมูลไม่สำเร็จ');
        }

    } catch (err) {
        console.error('Submit error:', err);
        showModalErrors({ 'ข้อผิดพลาด': err.message });
    } finally {
        setModalSubmitting(false);
    }
}

function setModalSubmitting(isSubmitting) {
    if (elements.modalSubmitBtn) elements.modalSubmitBtn.disabled = isSubmitting;
    if (elements.modalSubmitSpinner) elements.modalSubmitSpinner.classList.toggle('d-none', !isSubmitting);
}

function resetModalForm() {
    if (elements.productForm) {
        elements.productForm.reset();
        elements.productForm.classList.remove('was-validated');
    }
    if (elements.productIdInput) elements.productIdInput.value = '';
    clearModalErrors();
}

function clearModalErrors() {
    if (elements.modalErrorAlert) elements.modalErrorAlert.classList.add('d-none');
    if (elements.modalErrorList) elements.modalErrorList.innerHTML = '';
}

function showModalErrors(errors) {
    if (!elements.modalErrorAlert || !elements.modalErrorList) return;
    elements.modalErrorList.innerHTML = '';

    Object.keys(errors).forEach(key => {
        const li = document.createElement('li');
        li.textContent = `${key}: ${errors[key]}`;
        elements.modalErrorList.appendChild(li);
    });

    elements.modalErrorAlert.classList.remove('d-none');
}

/**
 * ยืนยันการลบสินค้า (Delete)
 */
function confirmDeleteProduct(productId, productName) {
    Swal.fire({
        title: 'ยืนยันการลบสินค้า?',
        html: `คุณต้องการลบ <strong>${escapeHtml(productName)}</strong> (รหัส #${productId}) ออกจากระบบหรือไม่?<br><span class="text-danger small">การดำเนินการนี้ไม่สามารถเรียกคืนได้</span>`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dc3545',
        cancelButtonColor: '#6c757d',
        confirmButtonText: '<i class="bi bi-trash-fill me-1"></i>ยืนยันลบ',
        cancelButtonText: 'ยกเลิก',
        reverseButtons: true
    }).then(async (result) => {
        if (result.isConfirmed) {
            await deleteProduct(productId, productName);
        }
    });
}

/**
 * ส่งคำขอลบไปยัง API (DELETE /api/products/{id})
 */
async function deleteProduct(productId, productName) {
    try {
        const res = await fetch(`${API_BASE}/products/${productId}`, {
            method: 'DELETE',
            headers: { 'Accept': 'application/json' }
        });
        const result = await res.json();

        if (res.ok && result.success) {
            Swal.fire({
                icon: 'success',
                title: 'ลบข้อมูลสำเร็จ!',
                text: result.message || `ลบสินค้า '${productName}' เรียบร้อยแล้ว`,
                timer: 2000,
                showConfirmButton: false
            });
            await fetchProducts();
        } else if (res.status === 409) {
            // ติด Foreign Key OrderDetails
            Swal.fire({
                icon: 'warning',
                title: 'ไม่สามารถลบสินค้านี้ได้',
                text: result.message || 'เนื่องจากมีข้อมูลคำสั่งซื้อ (Order Details) อ้างอิงถึงสินค้านี้ในระบบ'
            });
        } else {
            throw new Error(result.message || 'ไม่สามารถลบข้อมูลสินค้าได้');
        }
    } catch (err) {
        Swal.fire({
            icon: 'error',
            title: 'เกิดข้อผิดพลาดในการลบ',
            text: err.message
        });
    }
}

/**
 * ดูรายละเอียดสินค้ารายตัว
 */
async function viewProduct(productId) {
    try {
        let p = state.products.find(item => item.id === productId);
        if (!p) {
            const res = await fetch(`${API_BASE}/products/${productId}`);
            const json = await res.json();
            p = json.data;
        }

        if (!p) throw new Error('ไม่พบข้อมูล');

        if (elements.viewId) elements.viewId.textContent = `#${p.id}`;
        if (elements.viewName) elements.viewName.textContent = p.name;
        if (elements.viewCategory) elements.viewCategory.textContent = p.category_name;
        if (elements.viewSupplier) elements.viewSupplier.textContent = p.supplier_name;
        if (elements.viewUnit) elements.viewUnit.textContent = p.unit;
        if (elements.viewPrice) {
            elements.viewPrice.textContent = `฿${Number(p.price).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        }

        state.viewModal.show();
    } catch (err) {
        Swal.fire({
            icon: 'error',
            title: 'ข้อผิดพลาด',
            text: err.message
        });
    }
}

/**
 * Helper แสดง Toast สั้นๆ
 */
function showToast(message, icon = 'success') {
    const Toast = Swal.mixin({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 2000,
        timerProgressBar: true
    });
    Toast.fire({ icon, title: message });
}

// Security Escape Helpers
function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function escapeJs(str) {
    if (!str) return '';
    return String(str).replace(/'/g, "\\'").replace(/"/g, '\\"');
}
