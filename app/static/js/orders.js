const STATUS_LIST = [
    "Chờ xác nhận",
    "Đã xác nhận",
    "Đang chuẩn bị",
    "Đang làm",
    "Đã hoàn thành",
    "Đang giao",
    "Đã giao",
    "Hủy"
];
let ordersData = [];
let ordersCurrentPage = 1;

const ORDERS_PER_PAGE = 7;
const App = () => window.LinChauApp;

const money = (...args) => App().money(...args);
const escapeHtml = (...args) => App().escapeHtml(...args);
const formatDateVN = (...args) => App().formatDateVN(...args);
const closeModal = (...args) => App().closeModal(...args);
const showToast = (...args) => App().showToast(...args);
const loadDashboard = (...args) => App().loadDashboard(...args);
const todayISO = (...args) => App().todayISO(...args);

let editingOrderId = null;
let selectedOrderCustomer = null;

// =========================================================
// DATE / TIME HELPERS
// =========================================================

function dateInputValue(value) {

    if (!value) {
        return "";
    }

    const text = String(value).trim();

    const match = text.match(
        /^(\d{4})-(\d{2})-(\d{2})/
    );

    return match
        ? `${match[1]}-${match[2]}-${match[3]}`
        : "";
}


function timeInputValue(value) {

    if (!value) {
        return "";
    }

    const text = String(value).trim();

    const match = text.match(
        /^(\d{2}:\d{2})/
    );

    return match
        ? match[1]
        : "";
}


// =========================================================
// STATUS FILTER
// =========================================================

function initOrderStatusFilter() {

    const select =
        document.getElementById(
            "orderStatusFilter"
        );

    if (!select) {
        return;
    }

    const currentValue =
        select.value || "";

    select.innerHTML = `
        <option value="">
            Tất cả trạng thái
        </option>

        ${STATUS_LIST.map(status => `
            <option value="${escapeHtml(status)}">
                ${escapeHtml(status)}
            </option>
        `).join("")}
    `;

    select.value = currentValue;
}


// =========================================================
// LOAD ORDERS
// =========================================================

async function loadOrders() {

    const keyword =
        document
            .getElementById("orderSearch")
            ?.value
            ?.trim() || "";

    const status =
        document
            .getElementById("orderStatusFilter")
            ?.value || "";

    const paymentStatus =
    document
        .getElementById("orderPaymentFilter")
        ?.value || "";

    const dateFrom =
        document
            .getElementById("orderFrom")
            ?.value || "";

    const dateTo =
        document
            .getElementById("orderTo")
            ?.value || "";


    const params =
        new URLSearchParams();


    if (keyword) {
        params.set("q", keyword);
    }

    if (status) {
        params.set("status", status);
    }

    if (paymentStatus) {
        params.set("payment_status", paymentStatus);
    }

    if (dateFrom) {
        params.set("date_from", dateFrom);
    }

    if (dateTo) {
        params.set("date_to", dateTo);
    }


    try {

        const response =
            await fetch(
                `/api/orders?${params.toString()}`,
                {
                    method: "GET",
                    headers: {
                        "Accept":
                            "application/json"
                    }
                }
            );


        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(
                data.error ||
                "Không thể tải danh sách đơn hàng."
            );
        }


        // =====================================================
        // SEARCH / FILTER MỚI
        // LUÔN QUAY VỀ TRANG 1
        // =====================================================

        ordersCurrentPage = 1;


        // =====================================================
        // RENDER
        // =====================================================

        renderOrders(
            data.orders || data
        );


    } catch (error) {

        console.error(
            "Load orders error:",
            error
        );


        const tbody =
            document.getElementById(
                "ordersBody"
            );


        if (tbody) {

            tbody.innerHTML = `
                <tr>
                    <td
                        colspan="11"
                        class="empty"
                    >
                        Không thể tải dữ liệu đơn hàng.
                    </td>
                </tr>
            `;
        }
    }
}

// =========================================================
// STATUS BADGE
// =========================================================

function statusBadge(status) {

    let cls = "";

    if (status === "Hủy") {

        cls = "danger";

    } else if (
        status === "Đang giao"
    ) {

        cls = "warn";

    } else if (
        status === "Đang làm"
    ) {

        cls = "rose";
    }


    return `
        <span class="badge ${cls}">
            ${escapeHtml(status || "")}
        </span>
    `;
}


// =========================================================
// RENDER ORDERS
// =========================================================

function renderOrders(orders) {

    const tbody =
        document.getElementById("ordersBody");

    if (!tbody) {
        return;
    }

    if (!Array.isArray(orders)) {
        orders = [];
    }

    // =====================================================
    // Lưu toàn bộ kết quả đã search/filter và SẮP XẾP ĐƠN MỚI NHẤT LÊN ĐẦU
    // =====================================================

    ordersData = [...orders].sort((a, b) => {

        const dateA = new Date(
            a.created || a.created_at || a.id || 0
        ).getTime();

        const dateB = new Date(
            b.created || b.created_at || b.id || 0
        ).getTime();

        return dateB - dateA;
    });

    // Không có dữ liệu
    if (!ordersData.length) {

        tbody.innerHTML = `
            <tr>
                <td
                    colspan="11"
                    class="empty"
                >
                    Chưa có đơn hàng phù hợp.
                </td>
            </tr>
        `;

        renderOrderPagination();

        return;
    }

    // =====================================================
    // PHÂN TRANG
    // =====================================================

    const totalPages =
        Math.ceil(
            ordersData.length /
            ORDERS_PER_PAGE
        );

    // Nếu current page vượt quá số trang
    if (ordersCurrentPage > totalPages) {
        ordersCurrentPage = totalPages;
    }

    if (ordersCurrentPage < 1) {
        ordersCurrentPage = 1;
    }

    const startIndex =
        (ordersCurrentPage - 1) *
        ORDERS_PER_PAGE;

    const endIndex =
        startIndex +
        ORDERS_PER_PAGE;

    const pageOrders =
        ordersData.slice(
            startIndex,
            endIndex
        );

    // =====================================================
    // RENDER 7 RECORD
    // =====================================================

    tbody.innerHTML =
        pageOrders.map(order => {

            const deposit =
                Number(order.deposit || 0);

            const total =
                Number(order.total || 0);

            const balance =
                Number(order.balance || 0);

            // Đã thanh toán toàn bộ
            const isPaid =
                total > 0 &&
                balance === 0;

            // Đã cọc nhưng chưa thanh toán đủ
            const hasDeposit =
                deposit > 0 &&
                balance > 0;

            return `

                <tr>

                    <td>
                        <strong>
                            ${escapeHtml(
                                order.id || ""
                            )}
                        </strong>
                    </td>

                    <td>
                        ${escapeHtml(
                            order.customer_name ||
                            "Khách lẻ"
                        )}

                        ${
                            order.customer_phone
                                ? `
                                    <br>
                                    <small class="muted">
                                        ${escapeHtml(
                                            order.customer_phone
                                        )}
                                    </small>
                                  `
                                : ""
                        }
                    </td>

                    <td>
                        ${escapeHtml(
                            order.product || ""
                        )}
                    </td>

                    <td>
                        ${formatDateVN(
                            order.delivery_date
                        )}

                        ${
                            order.delivery_time
                                ? `
                                    <br>
                                    <small>
                                        ${escapeHtml(
                                            String(
                                                order.delivery_time
                                            ).slice(0, 5)
                                        )}
                                    </small>
                                  `
                                : ""
                        }
                    </td>

                    <td>
                        ${money(
                            order.subtotal
                        )}
                    </td>

                    <td>
                        ${money(
                            order.discount_value
                        )}
                    </td>

                    <td class="money">
                        ${money(
                            order.total
                        )}
                    </td>

                    <td class="money">
                        ${money(
                            order.balance
                        )}
                    </td>

                    <!-- TRẠNG THÁI -->
                    <td>
                        ${statusBadge(
                            order.status
                        )}
                    </td>

                    <!-- THANH TOÁN -->
                    <td>

                        <div class="payment-status-cell">

                            ${
                                isPaid
                                    ? `
                                        <span class="payment-badge">
                                            Đã thanh toán
                                        </span>
                                      `
                                    : hasDeposit
                                        ? `
                                            <span class="payment-badge">
                                                Đã cọc
                                            </span>
                                          `
                                        : ""
                            }

                        </div>

                    </td>

                    <!-- ACTION -->
                    <td>

                        <div class="row-actions">

                            <button
                                type="button"
                                class="mini-btn"
                                data-order-edit="${escapeHtml(
                                    order.id || ""
                                )}"
                            >
                                Sửa
                            </button>

                            <button
                                type="button"
                                class="mini-btn"
                                data-order-delete="${escapeHtml(
                                    order.id || ""
                                )}"
                            >
                                Xóa
                            </button>

                        </div>

                    </td>

                </tr>

            `;

        }).join("");

    renderOrderPagination();
}

function renderOrderPagination() {

    const pagination =
        document.getElementById(
            "orderPagination"
        );

    if (!pagination) {
        return;
    }

    const total =
        ordersData.length;

    const totalPages =
        Math.max(
            1,
            Math.ceil(
                total /
                ORDERS_PER_PAGE
            )
        );

    // Đảm bảo current page hợp lệ
    if (ordersCurrentPage > totalPages) {
        ordersCurrentPage = totalPages;
    }

    if (ordersCurrentPage < 1) {
        ordersCurrentPage = 1;
    }

    const start =
        total === 0
            ? 0
            : (
                (ordersCurrentPage - 1) *
                ORDERS_PER_PAGE +
                1
            );

    const end =
        Math.min(
            ordersCurrentPage *
            ORDERS_PER_PAGE,
            total
        );

    // =====================================================
    // THÔNG TIN
    // =====================================================

    let html = `
        <div class="pagination-info">
            Hiển thị
            <strong>${start}</strong>
            -
            <strong>${end}</strong>
            trong
            <strong>${total}</strong>
            đơn hàng
        </div>
    `;

    // =====================================================
    // BUTTONS
    // =====================================================

    html += `
        <div class="pagination-buttons">

            <button
                type="button"
                class="pagination-btn"
                data-order-page="prev"
                ${ordersCurrentPage <= 1 ? "disabled" : ""}
            >
                ‹
            </button>
    `;

    const maxVisiblePages = 5;

    let pageStart =
        Math.max(
            1,
            ordersCurrentPage -
            Math.floor(
                maxVisiblePages / 2
            )
        );

    let pageEnd =
        Math.min(
            totalPages,
            pageStart +
            maxVisiblePages -
            1
        );

    if (
        pageEnd - pageStart + 1 <
        maxVisiblePages
    ) {

        pageStart =
            Math.max(
                1,
                pageEnd -
                maxVisiblePages +
                1
            );
    }

    // =====================================================
    // TRANG ĐẦU
    // =====================================================

    if (pageStart > 1) {

        html += `
            <button
                type="button"
                class="pagination-btn"
                data-order-page="1"
            >
                1
            </button>
        `;

        if (pageStart > 2) {

            html += `
                <span class="pagination-dots">
                    ...
                </span>
            `;
        }
    }

    // =====================================================
    // CÁC TRANG
    // =====================================================

    for (
        let page = pageStart;
        page <= pageEnd;
        page++
    ) {

        html += `
            <button
                type="button"
                class="
                    pagination-btn
                    ${
                        page === ordersCurrentPage
                            ? "active"
                            : ""
                    }
                "
                data-order-page="${page}"
            >
                ${page}
            </button>
        `;
    }

    // =====================================================
    // TRANG CUỐI
    // =====================================================

    if (pageEnd < totalPages) {

        if (
            pageEnd <
            totalPages - 1
        ) {

            html += `
                <span class="pagination-dots">
                    ...
                </span>
            `;
        }

        html += `
            <button
                type="button"
                class="pagination-btn"
                data-order-page="${totalPages}"
            >
                ${totalPages}
            </button>
        `;
    }

    // =====================================================
    // NEXT
    // =====================================================

    html += `
            <button
                type="button"
                class="pagination-btn"
                data-order-page="next"
                ${
                    ordersCurrentPage >= totalPages
                        ? "disabled"
                        : ""
                }
            >
                ›
            </button>

        </div>
    `;

    pagination.innerHTML = html;
}

// =====================================================
// ORDER PAGINATION CLICK
// =====================================================

document.addEventListener(
    "click",
    event => {

        const button =
            event.target.closest(
                "[data-order-page]"
            );

        if (!button) {
            return;
        }

        const action =
            button.dataset.orderPage;

        const totalPages =
            Math.ceil(
                ordersData.length /
                ORDERS_PER_PAGE
            );

        if (action === "prev") {

            if (
                ordersCurrentPage > 1
            ) {
                ordersCurrentPage--;
            }

        } else if (action === "next") {

            if (
                ordersCurrentPage <
                totalPages
            ) {
                ordersCurrentPage++;
            }

        } else {

            ordersCurrentPage =
                Number(action);
        }

        renderOrders(
            ordersData
        );

    }
);

// =========================================================
// LOAD CUSTOMERS FOR ORDER FORM
// =========================================================

async function loadCustomersForOrder() {

    try {

        const response =
            await fetch(
                "/api/customers",
                {
                    method: "GET",
                    headers: {
                        "Accept":
                            "application/json"
                    }
                }
            );


        if (!response.ok) {

            throw new Error(
                `HTTP ${response.status}`
            );
        }


        const data =
            await response.json();


        window.__customers =
            data.customers || data || [];


    } catch (error) {

        console.error(
            "Load customers for order:",
            error
        );

        window.__customers = [];
    }
}


// =========================================================
// ORDER FORM
// =========================================================

function renderOrderForm(order = {}) {

    const modalTitle =
        document.getElementById(
            "modalTitle"
        );

    const modalBody =
        document.getElementById(
            "modalBody"
        );


    if (!modalBody) {
        return;
    }


    if (modalTitle) {

        modalTitle.textContent =
            editingOrderId
                ? "Cập nhật đơn hàng"
                : "Tạo đơn hàng";
    }


    const customers = window.__customers || [];

    const isGuestCustomer =
        String(order.customer_id || "").startsWith("KL");

    const selectedCustomer = customers.find(
        customer =>
            String(customer.id || "") ===
            String(order.customer_id || "")
    );

    selectedOrderCustomer = selectedCustomer || null;


    const statusOptions =
        STATUS_LIST.map(status => `

            <option
                value="${escapeHtml(status)}"
                ${
                    order.status === status
                        ? "selected"
                        : ""
                }
            >
                ${escapeHtml(status)}
            </option>

        `).join("");


    modalBody.innerHTML = `

        <div class="form-grid">

            <!-- MÃ ĐƠN -->
            <div class="field">

                <label>Mã đơn</label>

                <input
                    type="text"
                    value="${escapeHtml(
                        order.id || "Tự động"
                    )}"
                    readonly
                >

            </div>


            <!-- NGÀY NHẬN -->
            <div class="field">

                <label>Ngày nhận</label>

                <input
                    type="date"
                    name="created"
                    value="${
                        dateInputValue(
                            order.created
                        ) || todayISO()
                    }"
                    required
                >

            </div>

            <!-- KHÁCH HÀNG -->
            <div class="field full">

                <label>Khách hàng</label>

                <div class="customer-search-wrapper">

                    <!-- Giá trị thật gửi lên backend -->
                    <input
                        type="hidden"
                        name="customer_id"
                        id="orderCustomerId"
                        value="${
                            escapeHtml(order.customer_id || "")
                        }"
                    >

                    <!-- Ô tìm kiếm -->
                    <input
                        type="text"
                        id="orderCustomerSearch"
                        class="input"
                        autocomplete="off"
                        placeholder="Tìm mã khách hàng, tên hoặc SĐT..."
                        value="${
                            isGuestCustomer
                                ? "Khách lẻ"
                                : selectedCustomer
                                    ? `${selectedCustomer.id} - ${selectedCustomer.name} - ${selectedCustomer.phone || ""}`
                                    : ""
                        }"
                    >

                    <!-- Danh sách kết quả -->
                    <div
                        id="orderCustomerDropdown"
                        class="customer-search-dropdown"
                    ></div>

                </div>

            </div>
            <div
                class="field full"
                id="guestCustomerPhoneField"
                style="display:none;"
            >
                <label>SĐT khách lẻ</label>

                <input
                    type="tel"
                    name="guest_customer_phone"
                    id="guestCustomerPhone"
                    placeholder="Nhập số điện thoại nếu có"
                    value="${escapeHtml(
                        String(order.customer_id || "").startsWith("KL")
                            ? (order.customer_phone || "")
                            : ""
                    )}"
                >
            </div>


            <!-- NGƯỜI NHẬN -->
            <div class="field">

                <label>Người nhận</label>

                <input
                    type="text"
                    name="recipient"
                    value="${escapeHtml(
                        order.recipient || ""
                    )}"
                >

            </div>


            <!-- SĐT NGƯỜI NHẬN -->
            <div class="field">

                <label>SĐT người nhận</label>

                <input
                    type="tel"
                    name="recipient_phone"
                    value="${escapeHtml(
                        order.recipient_phone || ""
                    )}"
                >

            </div>


            <!-- NGÀY GIAO -->
            <div class="field">

                <label>Ngày giao</label>

                <input
                    type="date"
                    name="delivery_date"
                    value="${dateInputValue(
                        order.delivery_date
                    )}"
                    required
                >

            </div>


            <!-- GIỜ GIAO -->
            <div class="field">

                <label>Giờ giao</label>

                <input
                    type="time"
                    name="delivery_time"
                    value="${timeInputValue(
                        order.delivery_time
                    )}"
                >

            </div>


            <!-- ĐỊA CHỈ -->
            <div class="field full">

                <label>Địa chỉ giao</label>

                <input
                    type="text"
                    name="address"
                    value="${escapeHtml(
                        order.address || ""
                    )}"
                >

            </div>


            <!-- SẢN PHẨM -->
            <div class="field full">

                <label>Sản phẩm / mẫu hoa</label>

                <input
                    type="text"
                    name="product"
                    value="${escapeHtml(
                        order.product || ""
                    )}"
                    required
                >

            </div>


            <!-- TIỀN HÀNG -->
            <div class="field">

                <label>Tiền hàng</label>

                <input
                    type="number"
                    name="subtotal"
                    value="${Number(
                        order.subtotal || 0
                    )}"
                    min="0"
                    step="1000"
                    required
                >

            </div>


            <!-- PHÍ GIAO -->
            <div class="field">

                <label>Phí giao</label>

                <input
                    type="number"
                    name="shipping"
                    value="${Number(
                        order.shipping || 0
                    )}"
                    min="0"
                    step="1000"
                >

            </div>


            <!-- KIỂU GIẢM -->
            <div class="field">

                <label>Kiểu giảm giá</label>

                <select name="discount_type">

                    <option
                        value="none"
                        ${
                            !order.discount_type ||
                            order.discount_type === "none"
                                ? "selected"
                                : ""
                        }
                    >
                        Không giảm
                    </option>

                    <option
                        value="percent"
                        ${
                            order.discount_type === "percent"
                                ? "selected"
                                : ""
                        }
                    >
                        Theo %
                    </option>

                    <option
                        value="amount"
                        ${
                            order.discount_type === "amount"
                                ? "selected"
                                : ""
                        }
                    >
                        Theo số tiền
                    </option>
                    <option
                        value="percent_amount"
                        ${
                            order.discount_type === "percent_amount"
                                ? "selected"
                                : ""
                        }
                    >
                        Theo % và số tiền
                    </option>

                </select>

            </div>


            <!-- GIẢM % -->
            <div class="field">

                <label>% giảm</label>

                <input
                    type="number"
                    name="discount_percent"
                    value="${Number(
                        order.discount_percent || 0
                    )}"
                    min="0"
                    max="100"
                    step="0.1"
                >

            </div>


            <!-- GIẢM TRỰC TIẾP -->
            <div class="field">

                <label>Giảm trực tiếp (VNĐ)</label>

                <input
                    type="number"
                    name="discount_amount"
                    value="${Number(
                        order.discount_amount || 0
                    )}"
                    min="0"
                    step="1000"
                >

            </div>


            <!-- TIỀN CỌC -->
            <div class="field">

                <label>Đã cọc / đã thu</label>

                <input
                    type="number"
                    name="deposit"
                    value="${Number(
                        order.deposit || 0
                    )}"
                    min="0"
                    step="1000"
                    disabled
                >

            </div>


            <!-- PHƯƠNG THỨC THANH TOÁN -->
            <div class="field">

                <label>Thanh toán</label>

                <select name="payment">

                    <option
                        value="Tiền mặt"
                        ${
                            order.payment === "Tiền mặt"
                                ? "selected"
                                : ""
                        }
                    >
                        Tiền mặt
                    </option>

                    <option
                        value="Chuyển khoản"
                        ${
                            order.payment === "Chuyển khoản"
                                ? "selected"
                                : ""
                        }
                    >
                        Chuyển khoản
                    </option>

                    <option
                        value="Ví điện tử"
                        ${
                            order.payment === "Ví điện tử"
                                ? "selected"
                                : ""
                        }
                    >
                        Ví điện tử
                    </option>

                </select>

            </div>


            <!-- TRẠNG THÁI -->
            <div class="field">

                <label>Trạng thái</label>

                <select name="status">

                    ${statusOptions}

                </select>

            </div>


            <!-- ĐÃ CỌC -->
            <div class="field">

                <label
                    style="
                        display:flex;
                        align-items:center;
                        gap:8px;
                        cursor:pointer;
                    "
                >

                    <input
                        type="checkbox"
                        name="is_deposited"
                    >

                    <span>Đã cọc</span>

                </label>

            </div>


            <!-- ĐÃ THANH TOÁN -->
            <div class="field">

                <label
                    style="
                        display:flex;
                        align-items:center;
                        gap:8px;
                        cursor:pointer;
                    "
                >

                    <input
                        type="checkbox"
                        name="is_paid"
                    >

                    <span>Đã thanh toán</span>

                </label>

            </div>


            <!-- TÍNH TIỀN -->
            <div class="calc-box">

                <div>

                    <span>Tiền giảm</span>

                    <strong id="calcDiscount">
                        ${money(
                            order.discount_value || 0
                        )}
                    </strong>

                </div>


                <div>

                    <span>Tổng sau giảm</span>

                    <strong id="calcTotal">
                        ${money(
                            order.total || 0
                        )}
                    </strong>

                </div>


                <div>

                    <span>Đã thu</span>

                    <strong id="calcDeposit">
                        ${money(
                            order.deposit || 0
                        )}
                    </strong>

                </div>


                <div>

                    <span>Còn lại</span>

                    <strong id="calcBalance">
                        ${money(
                            order.balance || 0
                        )}
                    </strong>

                </div>

            </div>


            <!-- THIỆP -->
            <div class="field full">

                <label>Nội dung thiệp</label>

                <textarea
                    name="card"
                >${escapeHtml(
                    order.card || ""
                )}</textarea>

            </div>


            <!-- GHI CHÚ -->
            <div class="field full">

                <label>Ghi chú / yêu cầu đặc biệt</label>

                <textarea
                    name="notes"
                >${escapeHtml(
                    order.notes || ""
                )}</textarea>

            </div>

        </div>
    `;


    return document.getElementById(
        "modalForm"
    );
}

function updateGuestCustomerField() {

    const customerSelect =
        document.querySelector(
            '#modalForm select[name="customer_id"]'
        );

    const guestField =
        document.getElementById(
            "guestCustomerPhoneField"
        );

    if (
        !customerSelect ||
        !guestField
    ) {
        return;
    }


    const value =
        customerSelect.value || "";


    const isGuest =
        value === "__guest__" ||
        value.startsWith("KL");


    if (isGuest) {

        guestField.style.display = "";

    } else {

        guestField.style.display = "none";

    }
}

// =========================================================
// SEARCH CUSTOMER FOR ORDER
// =========================================================

function initOrderCustomerSearch(order = {}) {

    const searchInput =
        document.getElementById("orderCustomerSearch");

    const customerIdInput =
        document.getElementById("orderCustomerId");

    const dropdown =
        document.getElementById("orderCustomerDropdown");

    const guestField =
        document.getElementById("guestCustomerPhoneField");

    if (
        !searchInput ||
        !customerIdInput ||
        !dropdown
    ) {
        return;
    }

    const customers =
        window.__customers || [];

    function showGuestField() {

        const value =
            customerIdInput.value || "";

        const isGuest =
            value === "__guest__" ||
            value.startsWith("KL");

        if (guestField) {
            guestField.style.display =
                isGuest ? "" : "none";
        }
    }

    function renderResults(keyword = "") {

        const search =
            String(keyword || "")
                .trim()
                .toLowerCase();

        // =====================================================
        // KHÁCH LẺ
        // =====================================================

        let html = `
            <div
                class="customer-search-item customer-guest-item"
                data-customer-id="__guest__"
            >
                <strong>Khách lẻ</strong>
                <small>
                    Không thuộc danh sách khách hàng
                </small>
            </div>
        `;

        // =====================================================
        // LỌC KHÁCH HÀNG
        // =====================================================

        const results = customers
            .filter(customer => {

                // Không đưa KLxxxxxxx vào danh sách
                // vì đây là khách lẻ
                if (
                    String(customer.id || "")
                        .startsWith("KL")
                ) {
                    return false;
                }

                if (!search) {
                    return true;
                }

                const id =
                    String(customer.id || "")
                        .toLowerCase();

                const name =
                    String(customer.name || "")
                        .toLowerCase();

                const phone =
                    String(customer.phone || "")
                        .toLowerCase();

                return (
                    id.includes(search) ||
                    name.includes(search) ||
                    phone.includes(search)
                );
            })
            .slice(0, 30);

        // =====================================================
        // KHÔNG CÓ KẾT QUẢ
        // =====================================================

        if (!results.length && search) {

            html += `
                <div class="customer-search-empty">
                    Không tìm thấy khách hàng phù hợp.
                </div>
            `;

        } else {

            html += results.map(customer => `
                <div
                    class="customer-search-item"
                    data-customer-id="${escapeHtml(customer.id)}"
                >

                    <strong>
                        ${escapeHtml(customer.name || "")}
                    </strong>

                    <small>
                        ${escapeHtml(customer.id || "")}
                        ${
                            customer.phone
                                ? ` · ${escapeHtml(customer.phone)}`
                                : ""
                        }
                    </small>

                </div>
            `).join("");
        }

        dropdown.innerHTML = html;
        dropdown.classList.add("open");
    }

    // =====================================================
    // CLICK CHỌN KHÁCH HÀNG
    // =====================================================

    dropdown.addEventListener(
        "click",
        event => {

            const item =
                event.target.closest(
                    "[data-customer-id]"
                );

            if (!item) {
                return;
            }

            const customerId =
                item.dataset.customerId;

            // ---------------------------------------------
            // KHÁCH LẺ
            // ---------------------------------------------

            if (customerId === "__guest__") {

                customerIdInput.value =
                    "__guest__";

                searchInput.value =
                    "Khách lẻ";

                dropdown.classList.remove("open");

                showGuestField();

                return;
            }

            // ---------------------------------------------
            // KHÁCH HÀNG THẬT
            // ---------------------------------------------

            const customer =
                customers.find(
                    x =>
                        String(x.id) ===
                        String(customerId)
                );

            if (!customer) {
                return;
            }

            selectedOrderCustomer =
                customer;

            customerIdInput.value =
                customer.id;

            searchInput.value =
                `${customer.id} - ${customer.name} - ${customer.phone || ""}`;

            dropdown.classList.remove("open");

            showGuestField();
        }
    );

    // =====================================================
    // SEARCH
    // =====================================================

    searchInput.addEventListener(
        "input",
        () => {

            // Khi người dùng sửa nội dung tìm kiếm,
            // chưa chọn khách hàng mới
            customerIdInput.value = "";

            showGuestField();

            renderResults(
                searchInput.value
            );
        }
    );

    searchInput.addEventListener(
        "focus",
        () => {

            renderResults(
                searchInput.value
            );
        }
    );

    // =====================================================
    // CLICK RA NGOÀI
    // =====================================================

    document.addEventListener(
        "click",
        event => {

            if (
                !event.target.closest(
                    ".customer-search-wrapper"
                )
            ) {
                dropdown.classList.remove("open");
            }
        }
    );

    // =====================================================
    // ESC
    // =====================================================

    searchInput.addEventListener(
        "keydown",
        event => {

            if (event.key === "Escape") {

                dropdown.classList.remove(
                    "open"
                );

                searchInput.blur();
            }
        }
    );

    // =====================================================
    // KHỞI TẠO
    // =====================================================

    showGuestField();
}

// =========================================================
// OPEN ORDER MODAL
// Không dùng App.openModal()
// vì app.js hiện tại openModal(title, body, onSubmit)
// =========================================================

async function openOrderModal(order = null) {

    editingOrderId =
        order?.id || null;


    // Load customer trước khi render form
    await loadCustomersForOrder();


    renderOrderForm(
        order || {}
    );


    const modal =
        document.getElementById("modal");

    const form =
        document.getElementById("modalForm");

    // Khởi tạo tìm kiếm khách hàng
    initOrderCustomerSearch(
        order || {}
    );

    // =====================================================
    // KHÁCH LẺ
    // =====================================================

    // Khởi tạo tìm kiếm khách hàng
    initOrderCustomerSearch(
        order || {}
    );

    if (!modal || !form) {

        console.error(
            "Order modal elements not found."
        );

        return;
    }


    // app.js dùng form.onsubmit cho customer modal.
    // Khi mở order modal phải xóa handler cũ.
    form.onsubmit = null;


    // Xác định trạng thái thanh toán
    const depositCheckbox =
        form.elements["is_deposited"];

    const paidCheckbox =
        form.elements["is_paid"];

    const depositInput =
        form.elements["deposit"];


    if (depositCheckbox) {
        depositCheckbox.checked = false;
    }

    if (paidCheckbox) {
        paidCheckbox.checked = false;
    }


    if (depositInput) {
        depositInput.disabled = true;
    }


    if (order) {

        const deposit =
            Number(
                order.deposit || 0
            );

        const balance =
            Number(
                order.balance || 0
            );

        const total =
            Number(
                order.total || 0
            );


        // Đã thanh toán
        if (
            total > 0 &&
            balance === 0
        ) {

            if (paidCheckbox) {
                paidCheckbox.checked = true;
            }

            if (depositInput) {
                depositInput.value = total;
                depositInput.disabled = true;
            }

        }

        // Đã cọc
        else if (deposit > 0) {

            if (depositCheckbox) {
                depositCheckbox.checked = true;
            }

            if (depositInput) {
                depositInput.value = deposit;
                depositInput.disabled = false;
            }
        }
    }


    // Bind calculation
    bindOrderCalculation();


    // Submit của order
    form.onsubmit =
        saveOrder;


    // Mở modal trực tiếp
    // Không gọi App.openModal()
    modal.setAttribute(
        "aria-hidden",
        "false"
    );

    modal.classList.add("open");
}


// =========================================================
// ORDER CALCULATION
// =========================================================

function bindOrderCalculation() {
    const form = document.getElementById("modalForm");
    if (!form) return;

    const subtotalInput = form.querySelector('[name="subtotal"]');
    const shippingInput = form.querySelector('[name="shipping"]');

    const discountTypeInput = form.querySelector('[name="discount_type"]');
    const discountPercentInput = form.querySelector('[name="discount_percent"]');
    const discountAmountInput = form.querySelector('[name="discount_amount"]');

    const depositCheckbox = form.querySelector('[name="is_deposited"]');
    const paidCheckbox = form.querySelector('[name="is_paid"]');
    const depositInput = form.querySelector('[name="deposit"]');

    const calcDiscount = document.getElementById("calcDiscount");
    const calcTotal = document.getElementById("calcTotal");
    const calcDeposit = document.getElementById("calcDeposit");
    const calcBalance = document.getElementById("calcBalance");

    let timer = null;

    function updateDiscountInputState() {
        const type = discountTypeInput?.value || "none";

        // Ô % được nhập khi:
        // - Theo %
        // - Theo % và số tiền
        const enablePercent =
            type === "percent" ||
            type === "percent_amount";

        // Ô giảm trực tiếp được nhập khi:
        // - Theo số tiền
        // - Theo % và số tiền
        const enableAmount =
            type === "amount" ||
            type === "percent_amount";


        // =========================
        // Ô % GIẢM
        // =========================

        if (discountPercentInput) {

            discountPercentInput.disabled =
                !enablePercent;

            if (!enablePercent) {
                discountPercentInput.value = 0;
            }
        }


        // =========================
        // Ô GIẢM TRỰC TIẾP
        // =========================

        if (discountAmountInput) {

            discountAmountInput.disabled =
                !enableAmount;

            if (!enableAmount) {
                discountAmountInput.value = 0;
            }
        }
    }

    function calculate() {
        const subtotal = Math.max(
            0,
            Number(subtotalInput?.value || 0)
        );

        const shipping = Math.max(
            0,
            Number(shippingInput?.value || 0)
        );

        const discountType =
            discountTypeInput?.value || "none";

        let discount = 0;


        // =========================================
        // KHÔNG GIẢM
        // =========================================

        if (discountType === "none") {

            discount = 0;

        }


        // =========================================
        // THEO %
        // =========================================

        else if (discountType === "percent") {

            const percent = Math.min(
                100,
                Math.max(
                    0,
                    Number(
                        discountPercentInput?.value || 0
                    )
                )
            );

            // % CHỈ tính trên tiền hàng
            discount =
                subtotal * percent / 100;

        }


        // =========================================
        // THEO SỐ TIỀN
        // =========================================

        else if (discountType === "amount") {

            discount = Math.max(
                0,
                Number(
                    discountAmountInput?.value || 0
                )
            );

        }


        // =========================================
        // THEO % VÀ SỐ TIỀN
        // =========================================

        else if (discountType === "percent_amount") {

            const percent = Math.min(
                100,
                Math.max(
                    0,
                    Number(
                        discountPercentInput?.value || 0
                    )
                )
            );

            const amount = Math.max(
                0,
                Number(
                    discountAmountInput?.value || 0
                )
            );


            // Phần giảm theo %
            // Chỉ tính trên TIỀN HÀNG
            const percentDiscount =
                subtotal * percent / 100;


            // Tổng giảm
            discount =
                percentDiscount + amount;
        }


        // =========================================
        // KHÔNG CHO GIẢM VƯỢT QUÁ TIỀN HÀNG
        // =========================================

        discount = Math.min(
            discount,
            subtotal
        );


        // =========================================
        // TỔNG SAU GIẢM
        // =========================================

        const total = Math.max(
            0,
            subtotal + shipping - discount
        );


        // =========================================
        // TIỀN CỌC / ĐÃ THU
        // =========================================

        let deposit = 0;
        let balance = total;


        // ĐÃ THANH TOÁN
        if (paidCheckbox?.checked) {

            deposit = total;
            balance = 0;

            if (depositInput) {

                depositInput.disabled = true;

                depositInput.value = total;
            }

        }


        // ĐÃ CỌC
        else if (depositCheckbox?.checked) {

            if (depositInput) {
                depositInput.disabled = false;
            }

            deposit = Math.min(
                total,
                Math.max(
                    0,
                    Number(
                        depositInput?.value || 0
                    )
                )
            );

            balance =
                total - deposit;

        }


        // CHƯA CỌC / CHƯA THANH TOÁN
        else {

            if (depositInput) {

                depositInput.disabled = true;

                depositInput.value = 0;
            }

            deposit = 0;

            balance = total;
        }


        // =========================================
        // HIỂN THỊ KẾT QUẢ
        // =========================================

        if (calcDiscount) {

            calcDiscount.textContent =
                money(discount);
        }


        if (calcTotal) {

            calcTotal.textContent =
                money(total);
        }


        if (calcDeposit) {

            calcDeposit.textContent =
                money(deposit);
        }


        if (calcBalance) {

            calcBalance.textContent =
                money(balance);
        }
    }

    function scheduleCalculate() {
        clearTimeout(timer);

        timer = setTimeout(() => {
            calculate();
        }, 40);
    }

    // =========================
    // GIẢM GIÁ
    // =========================

    discountTypeInput?.addEventListener("change", () => {
        updateDiscountInputState();
        calculate();
    });

    discountPercentInput?.addEventListener("input", scheduleCalculate);

    discountAmountInput?.addEventListener("input", scheduleCalculate);

    // =========================
    // TIỀN HÀNG / PHÍ GIAO
    // =========================

    subtotalInput?.addEventListener("input", scheduleCalculate);
    shippingInput?.addEventListener("input", scheduleCalculate);

    // =========================
    // ĐÃ CỌC
    // =========================

    depositCheckbox?.addEventListener("change", () => {
        if (depositCheckbox.checked) {
            // Đã cọc thì bỏ Đã thanh toán
            if (paidCheckbox) {
                paidCheckbox.checked = false;
            }

            if (depositInput) {
                depositInput.disabled = false;
            }
        } else {
            if (depositInput) {
                depositInput.value = 0;
                depositInput.disabled = true;
            }
        }

        calculate();
    });

    // =========================
    // ĐÃ THANH TOÁN
    // =========================

    paidCheckbox?.addEventListener("change", () => {
        if (paidCheckbox.checked) {
            // Đã thanh toán thì bỏ Đã cọc
            if (depositCheckbox) {
                depositCheckbox.checked = false;
            }

            if (depositInput) {
                depositInput.disabled = true;
            }
        } else {
            if (depositInput) {
                depositInput.value = 0;
                depositInput.disabled = true;
            }
        }

        calculate();
    });

    // =========================
    // NHẬP TIỀN CỌC
    // =========================

    depositInput?.addEventListener("input", scheduleCalculate);

    // Khởi tạo trạng thái ô giảm giá
    updateDiscountInputState();

    // Tính lần đầu
    calculate();
}

// =========================================================
// SAVE ORDER
// =========================================================

async function saveOrder(event) {

    event.preventDefault();


    const form =
        document.getElementById(
            "modalForm"
        );


    if (!form) {
        return;
    }


    const formData =
        new FormData(form);


    const data =
        Object.fromEntries(
            formData.entries()
        );


    const subtotal =
        Number(
            data.subtotal || 0
        );


    const shipping =
        Number(
            data.shipping || 0
        );


    // -----------------------------------------------------
    // GIẢM GIÁ
    // -----------------------------------------------------

    const discountType =
        data.discount_type || "none";

    const discountPercent =
        Math.max(
            0,
            Number(
                data.discount_percent || 0
            )
        );

    const discountAmount =
        Math.max(
            0,
            Number(
                data.discount_amount || 0
            )
        );

    let discount = 0;


    // -----------------------------------------------------
    // KHÔNG GIẢM
    // -----------------------------------------------------

    if (discountType === "none") {

        discount = 0;

    }


    // -----------------------------------------------------
    // THEO %
    // -----------------------------------------------------

    else if (discountType === "percent") {

        // % chỉ tính trên TIỀN HÀNG
        discount =
            subtotal *
            Math.min(100, discountPercent) /
            100;

    }


    // -----------------------------------------------------
    // THEO SỐ TIỀN
    // -----------------------------------------------------

    else if (discountType === "amount") {

        discount =
            discountAmount;

    }


    // -----------------------------------------------------
    // THEO % VÀ SỐ TIỀN
    // -----------------------------------------------------

    else if (discountType === "percent_amount") {

        // Phần giảm theo %
        const percentDiscount =
            subtotal *
            Math.min(100, discountPercent) /
            100;

        // Tổng giảm = % + giảm trực tiếp
        discount =
            percentDiscount +
            discountAmount;
    }


    // -----------------------------------------------------
    // KHÔNG CHO GIẢM VƯỢT QUÁ TIỀN HÀNG
    // -----------------------------------------------------

    discount =
        Math.min(
            Math.max(
                0,
                discount
            ),
            subtotal
        );


    // -----------------------------------------------------
    // TỔNG
    // -----------------------------------------------------

    const total =
        Math.max(
            0,
            subtotal +
            shipping -
            discount
        );


    // -----------------------------------------------------
    // THANH TOÁN
    // -----------------------------------------------------

    const isDeposited =
        form.elements[
            "is_deposited"
        ]?.checked === true;


    const isPaid =
        form.elements[
            "is_paid"
        ]?.checked === true;


    let deposit = 0;
    let balance = total;


    if (isPaid) {

        deposit = total;
        balance = 0;

    }

    else if (isDeposited) {

        deposit =
            Number(
                data.deposit || 0
            );


        deposit =
            Math.max(
                0,
                Math.min(
                    deposit,
                    total
                )
            );


        balance =
            total - deposit;
    }

    else {

        deposit = 0;
        balance = total;
    }


    // -----------------------------------------------------
    // DATA GỬI BACKEND
    // -----------------------------------------------------

    data.discount_value =
        discount;

    data.total =
        total;

    data.deposit =
        deposit;

    data.balance =
        balance;

    // Checkbox chỉ dùng ở frontend
    delete data.is_deposited;
    delete data.is_paid;


    // =====================================================
    // KIỂM TRA KHÁCH HÀNG
    // =====================================================

    const customerType =
        data.customer_id || "";


    if (!customerType) {

        alert(
            "Vui lòng chọn khách hàng hoặc chọn Khách lẻ."
        );

        return;
    }
    console.log(
        "ORDER DATA:",
        data
    );

    try {

        const url =
            editingOrderId

                ? `/api/orders/${encodeURIComponent(
                    editingOrderId
                )}`

                : "/api/orders";


        const method =
            editingOrderId
                ? "PUT"
                : "POST";


        const response =
            await fetch(
                url,
                {
                    method,

                    headers: {
                        "Content-Type":
                            "application/json",

                        "Accept":
                            "application/json"
                    },

                    body:
                        JSON.stringify(data)
                }
            );


        let result = {};

        const contentType =
            response.headers.get("content-type") || "";

        if (contentType.includes("application/json")) {

            result = await response.json();

        } else {

            const serverText =
                await response.text();

            console.error(
                "Server trả về HTML thay vì JSON:",
                serverText
            );

            throw new Error(
                `Server lỗi HTTP ${response.status}. Kiểm tra terminal Flask để xem lỗi chi tiết.`
            );
        }


        if (!response.ok) {

            throw new Error(
                result.error ||
                "Không thể lưu đơn hàng."
            );
        }


        closeModal();


        showToast(
            editingOrderId
                ? "Đã cập nhật đơn hàng."
                : "Đã tạo đơn hàng."
        );


        editingOrderId =
            null;


        await loadOrders();


        await loadDashboard();


        if (
            window.LinChauWorkflow &&
            typeof
                window.LinChauWorkflow
                    .loadWorkflow ===
                "function"
        ) {

            await
                window.LinChauWorkflow
                    .loadWorkflow();
        }


    } catch (error) {

        console.error(
            "Save order error:",
            error
        );


        alert(
            error.message
        );
    }
}


// =========================================================
// GET ORDER
// =========================================================

async function getOrder(orderId) {

    const response =
        await fetch(
            `/api/orders/${encodeURIComponent(
                orderId
            )}`,
            {
                method: "GET",
                headers: {
                    "Accept":
                        "application/json"
                }
            }
        );


    const result =
        await response.json();


    if (!response.ok) {

        throw new Error(
            result.error ||
            "Không thể lấy thông tin đơn hàng."
        );
    }


    return result.order ||
        result;
}


// =========================================================
// DELETE ORDER
// =========================================================

async function deleteOrder(orderId) {

    if (!orderId) {
        return;
    }


    if (
        !confirm(
            `Bạn có chắc muốn xóa đơn ${orderId}?`
        )
    ) {

        return;
    }


    try {

        const response =
            await fetch(
                `/api/orders/${encodeURIComponent(
                    orderId
                )}`,
                {
                    method: "DELETE",

                    headers: {
                        "Accept":
                            "application/json"
                    }
                }
            );


        const result =
            await response.json();


        if (!response.ok) {

            throw new Error(
                result.error ||
                "Không thể xóa đơn hàng."
            );
        }


        showToast(
            result.message ||
            "Đã xóa đơn hàng."
        );


        await loadOrders();


        await loadDashboard();


        if (
            window.LinChauWorkflow &&
            typeof
                window.LinChauWorkflow
                    .loadWorkflow ===
                "function"
        ) {

            await
                window.LinChauWorkflow
                    .loadWorkflow();
        }


    } catch (error) {

        console.error(
            "Delete order error:",
            error
        );


        alert(
            error.message
        );
    }
}


// =========================================================
// EVENTS
// =========================================================

function initOrders() {

    // Bộ lọc trạng thái
    initOrderStatusFilter();


    // Search
    document
        .getElementById(
            "orderSearch"
        )
        ?.addEventListener(
            "input",
            loadOrders
        );


    // Status
    document
        .getElementById(
            "orderStatusFilter"
        )
        ?.addEventListener(
            "change",
            loadOrders
        );

    // Payment status
    document
        .getElementById("orderPaymentFilter")
        ?.addEventListener("change", loadOrders);

    // Date from
    document
        .getElementById(
            "orderFrom"
        )
        ?.addEventListener(
            "change",
            loadOrders
        );


    // Date to
    document
        .getElementById(
            "orderTo"
        )
        ?.addEventListener(
            "change",
            loadOrders
        );


    // Tạo đơn
    document
        .getElementById(
            "newOrderBtn"
        )
        ?.addEventListener(
            "click",
            () => {
                openOrderModal();
            }
        );


    // Edit / Delete
    document
        .getElementById(
            "ordersBody"
        )
        ?.addEventListener(
            "click",
            async event => {

                const editButton =
                    event.target.closest(
                        "[data-order-edit]"
                    );


                if (editButton) {

                    const orderId =
                        editButton.dataset
                            .orderEdit;


                    try {

                        const order =
                            await getOrder(
                                orderId
                            );


                        await
                            openOrderModal(
                                order
                            );


                    } catch (error) {

                        console.error(
                            error
                        );


                        alert(
                            error.message
                        );
                    }


                    return;
                }


                const deleteButton =
                    event.target.closest(
                        "[data-order-delete]"
                    );


                if (deleteButton) {

                    await deleteOrder(
                        deleteButton.dataset
                            .orderDelete
                    );
                }
            }
        );


    // Load lần đầu
    loadOrders();
}


// =========================================================
// INITIALIZE
// =========================================================

document.addEventListener(
    "DOMContentLoaded",
    initOrders
);


// =========================================================
// PUBLIC API
// =========================================================

window.LinChauOrders = {

    loadOrders,

    openOrderModal,

    saveOrder,

    deleteOrder,

    getOrder

};