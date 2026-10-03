(() => {
    "use strict";


    // =====================================================
    // ELEMENTS
    // =====================================================

    const views = [
        ...document.querySelectorAll(".view[data-view]")
    ];

    const navItems = [
        ...document.querySelectorAll("[data-nav]")
    ];


    // =====================================================
    // HELPERS
    // =====================================================

    function todayISO() {

        const now = new Date();

        const year =
            now.getFullYear();

        const month =
            String(
                now.getMonth() + 1
            ).padStart(2, "0");

        const day =
            String(
                now.getDate()
            ).padStart(2, "0");

        return `${year}-${month}-${day}`;
    }


    function money(value) {

        return new Intl.NumberFormat("vi-VN")
            .format(Number(value || 0)) + " ₫";
    }


    function formatDateVN(value) {

        if (!value) {
            return "";
        }

        const text = String(value);

        const match =
            text.match(
                /^(\d{4})-(\d{2})-(\d{2})/
            );

        if (!match) {
            return escapeHtml(text);
        }

        return `${match[3]}/${match[2]}/${match[1]}`;
    }


    function escapeHtml(value) {

        return String(value ?? "")
            .replace(/[&<>'"]/g, char => ({
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                "'": "&#39;",
                '"': "&quot;"
            }[char]));
    }


    function showToast(message) {

        const toast =
            document.getElementById("toast");

        if (!toast) {
            return;
        }

        toast.textContent = message;

        toast.classList.add("show");

        setTimeout(() => {

            toast.classList.remove("show");

        }, 2500);
    }


    // =====================================================
    // VIEW NAVIGATION
    // =====================================================

    function showView(name) {

        views.forEach(view => {

            const active =
                view.dataset.view === name;

            view.hidden = !active;

            view.classList.toggle(
                "active",
                active
            );
        });


        navItems.forEach(item => {

            item.classList.toggle(
                "active",
                item.dataset.nav === name
            );
        });


        const title =
            document
                .querySelector(
                    `[data-nav="${name}"]`
                )
                ?.textContent
                ?.trim();


        const viewTitle =
            document.getElementById(
                "viewTitle"
            );


        if (viewTitle && title) {

            viewTitle.textContent = title;
        }


        document.body.classList.remove(
            "sidebar-open"
        );


        const sidebar =
            document.getElementById(
                "sidebar"
            );


        if (sidebar) {

            sidebar.classList.remove("open");
        }


        if (name === "customers") {

            loadCustomers();
        }


        if (name === "inventory") {

            window.LinChauInventory
                ?.loadInventory();
        }


        if (name === "movements") {

            window.LinChauMovements
                ?.loadMovements();
        }


        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });
    }


    navItems.forEach(item => {

        item.addEventListener(
            "click",
            event => {

                event.preventDefault();

                showView(
                    item.dataset.nav
                );
            }
        );
    });


    // Dashboard "Xem đơn hàng", "Xem kho"

    document
        .querySelectorAll("[data-go]")
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    showView(
                        button.dataset.go
                    );
                }
            );
        });


    // Mobile menu

    document
        .getElementById("menuBtn")
        ?.addEventListener(
            "click",
            () => {

                const sidebar =
                    document.getElementById(
                        "sidebar"
                    );

                sidebar?.classList.toggle(
                    "open"
                );
            }
        );


    // =====================================================
    // TODAY LABEL
    // =====================================================

    const todayLabel =
        document.getElementById(
            "todayLabel"
        );


    if (todayLabel) {

        todayLabel.textContent =
            new Intl.DateTimeFormat(
                "vi-VN",
                {
                    weekday: "long",
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric"
                }
            ).format(new Date());
    }


    // =====================================================
    // DASHBOARD
    // =====================================================

    async function loadDashboard() {

        try {

            const response =
                await fetch(
                    "/api/dashboard",
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


            renderDashboard(data);


        } catch (error) {

            console.error(
                "Dashboard error:",
                error
            );


            showToast(
                "Không thể tải dữ liệu Dashboard."
            );
        }
    }


    // =====================================================
    // RENDER KPI
    // =====================================================

    function renderKpi(data) {

        const element =
            document.getElementById(
                "kpiCards"
            );


        if (!element) {
            return;
        }


        const kpi =
            data.kpi || {};


        element.innerHTML = `

            <div class="kpi">
                <span>Đơn hôm nay</span>
                <strong>
                    ${kpi.orders_today || 0}
                </strong>
                <small>đơn</small>
            </div>

            <div class="kpi">
                <span>Doanh thu tháng</span>
                <strong>
                    ${money(kpi.monthly_sales)}
                </strong>
                <small>tổng sau giảm</small>
            </div>

            <div class="kpi">
                <span>Còn phải thu</span>
                <strong>
                    ${money(kpi.receivable)}
                </strong>
                <small>công nợ đơn</small>
            </div>

            <div class="kpi">
                <span>Cần nhập kho</span>
                <strong>
                    ${kpi.low_stock || 0}
                </strong>
                <small>nguyên liệu</small>
            </div>

        `;
    }


    // =====================================================
    // PRIORITY ORDERS
    // =====================================================

    function renderPriorityOrders(data) {

        const element =
            document.getElementById(
                "priorityOrders"
            );


        if (!element) {
            return;
        }


        const rows =
            data.priority_orders || [];


        if (!rows.length) {

            element.innerHTML =
                `<div class="empty">
                    Không có đơn cần xử lý.
                </div>`;

            return;
        }


        element.innerHTML =
            rows.map(order => `

                <div class="stack-item">

                    <div>

                        <strong>
                            ${escapeHtml(order.id)}
                            ·
                            ${escapeHtml(order.product)}
                        </strong>

                        <span>
                            ${escapeHtml(
                                order.customer_name
                            )}

                            · giao

                            ${escapeHtml(
                                order.delivery_date
                            )}

                            ${escapeHtml(
                                order.delivery_time
                            )}
                        </span>

                    </div>

                    <span class="badge">
                        ${escapeHtml(
                            order.status
                        )}
                    </span>

                </div>

            `).join("");
    }


    // =====================================================
    // LOW STOCK
    // =====================================================

    function renderLowStock(data) {

        const element =
            document.getElementById(
                "lowStockList"
            );


        if (!element) {
            return;
        }


        const rows =
            data.low_stock_items || [];


        if (!rows.length) {

            element.innerHTML =
                `<div class="empty">
                    Tồn kho đang an toàn.
                </div>`;

            return;
        }


        element.innerHTML =
            rows.map(item => `

                <div class="stack-item">

                    <div>

                        <strong>
                            ${escapeHtml(
                                item.name
                            )}
                        </strong>

                        <span>
                            ${item.stock}
                            ${escapeHtml(
                                item.unit
                            )}

                            · tối thiểu

                            ${item.min_stock}
                        </span>

                    </div>

                    <span class="badge danger">
                        Cần nhập
                    </span>

                </div>

            `).join("");
    }


    // =====================================================
    // SALES 7 DAYS
    // =====================================================

    function renderSales(data) {

        const element =
            document.getElementById(
                "salesBars"
            );


        if (!element) {
            return;
        }


        const rows =
            data.sales_7_days || [];


        if (!rows.length) {

            element.innerHTML =
                `<div class="empty">
                    Chưa có dữ liệu doanh thu.
                </div>`;

            return;
        }


        const max =
            Math.max(
                1,
                ...rows.map(
                    row => Number(
                        row.total || 0
                    )
                )
            );


        element.innerHTML =
            rows.map(row => {

                const value =
                    Number(row.total || 0);


                const height =
                    Math.max(
                        4,
                        (value / max) * 145
                    );


                const date =
                    String(row.date);


                return `

                    <div class="bar-col">

                        <div
                            class="bar"
                            style="
                                height:${height}px
                            "
                            title="${money(value)}"
                        ></div>

                        <span>
                            ${date.slice(8, 10)}
                            /
                            ${date.slice(5, 7)}
                        </span>

                        <small>
                            ${
                                value
                                    ? Math.round(
                                        value / 1000
                                    ) + "k"
                                    : "0"
                            }
                        </small>

                    </div>

                `;

            }).join("");
    }


    // =====================================================
    // STATUS SUMMARY
    // =====================================================

    function renderStatusSummary(data) {

        const element =
            document.getElementById(
                "statusSummary"
            );


        if (!element) {
            return;
        }


        const rows =
            data.status_summary || [];


        if (!rows.length) {

            element.innerHTML =
                `<div class="empty">
                    Chưa có đơn.
                </div>`;

            return;
        }


        element.innerHTML =
            rows.map(row => `

                <div class="status-pill">

                    <strong>
                        ${row.total}
                    </strong>

                    <span>
                        ${escapeHtml(
                            row.status
                        )}
                    </span>

                </div>

            `).join("");
    }


    // =====================================================
    // RENDER DASHBOARD
    // =====================================================

    function renderDashboard(data) {

        renderKpi(data);

        renderPriorityOrders(data);

        renderLowStock(data);

        renderSales(data);

        renderStatusSummary(data);
    }


    // =====================================================
    // MODAL
    // =====================================================

    function openModal(title, body, onSubmit) {

        const modal =
            document.getElementById("modal");

        const titleElement =
            document.getElementById("modalTitle");

        const bodyElement =
            document.getElementById("modalBody");

        const form =
            document.getElementById("modalForm");


        if (
            !modal ||
            !titleElement ||
            !bodyElement ||
            !form
        ) {
            console.error(
                "Modal elements not found."
            );

            return;
        }


        // =================================================
        // FEATURE MODULE MODAL
        // =================================================

        if (
            arguments.length === 1 &&
            title === "modal"
        ) {

            modal.setAttribute(
                "aria-hidden",
                "false"
            );

            modal.classList.add("open");

            return;
        }


        // =================================================
        // STANDARD MODAL
        // =================================================

        titleElement.textContent =
            title || "";

        bodyElement.innerHTML =
            body || "";


        modal.setAttribute(
            "aria-hidden",
            "false"
        );

        modal.classList.add("open");


        if (typeof onSubmit === "function") {

            form.onsubmit = async event => {

                event.preventDefault();

                await onSubmit(
                    new FormData(form)
                );
            };

        } else {

            form.onsubmit = null;
        }
    }


    function closeModal() {

        const modal =
            document.getElementById("modal");

        if (!modal) {
            return;
        }


        modal.setAttribute(
            "aria-hidden",
            "true"
        );

        modal.classList.remove("open");
    }


    document
        .querySelectorAll("[data-close-modal]")
        .forEach(button => {

            button.addEventListener(
                "click",
                closeModal
            );
        });


    // =====================================================
    // CUSTOMERS
    // =====================================================

    let editingCustomerId = null;

    // Toàn bộ khách hàng lấy từ API
    let customersData = [];

    // Trang hiện tại
    let customersCurrentPage = 1;

    // Số record mỗi trang
    const CUSTOMERS_PER_PAGE = 10;

    // Từ khóa search hiện tại
    let customersSearchKeyword = "";


    // =====================================================
    // LOAD CUSTOMERS
    // =====================================================

    async function loadCustomers() {

        try {

            /*
             * Không truyền ?q=...
             *
             * Mục đích:
             * lấy TOÀN BỘ khách hàng về frontend
             * để search + phân trang phía client.
             */

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


            const result =
                await response.json();


            /*
             * API có thể trả:
             *
             * [
             *   {...},
             *   {...}
             * ]
             *
             * hoặc:
             *
             * {
             *   customers: [...]
             * }
             */

            customersData =
                Array.isArray(result)
                    ? result
                    : (
                        result.customers || []
                    );


            /*
             * Khi reload dữ liệu:
             * giữ search hiện tại,
             * nhưng nếu trang hiện tại vượt
             * tổng số trang thì renderCustomers()
             * sẽ tự điều chỉnh.
             */

            renderCustomers();


        } catch (error) {

            console.error(
                "Customers error:",
                error
            );

            showToast(
                "Không thể tải danh sách khách hàng."
            );
        }
    }


    // =====================================================
    // FILTER CUSTOMERS
    // =====================================================

    function getFilteredCustomers() {

        const keyword =
            customersSearchKeyword
                .trim()
                .toLowerCase();


        if (!keyword) {

            return customersData;
        }


        return customersData.filter(
            customer => {

                /*
                 * Search toàn bộ các thông tin
                 * đang có của khách hàng.
                 */

                const searchableText = [

                    customer.id,

                    customer.name,

                    customer.phone,

                    customer.birthday,

                    customer.colors,

                    customer.flowers,

                    customer.occasions,

                    customer.notes

                ]
                    .filter(
                        value =>
                            value !== null &&
                            value !== undefined
                    )
                    .join(" ")
                    .toLowerCase();


                return searchableText
                    .includes(keyword);
            }
        );
    }


    // =====================================================
    // RENDER CUSTOMERS
    // =====================================================

    function renderCustomers() {

        const body =
            document.getElementById(
                "customersBody"
            );


        if (!body) {
            return;
        }


        const filteredCustomers =
            getFilteredCustomers();


        /*
         * Tính tổng số trang
         */

        const totalPages =
            Math.max(
                1,
                Math.ceil(
                    filteredCustomers.length /
                    CUSTOMERS_PER_PAGE
                )
            );


        /*
         * Nếu xóa dữ liệu ở trang cuối
         * làm trang hiện tại không còn tồn tại
         * thì tự lùi về trang cuối.
         */

        if (
            customersCurrentPage >
            totalPages
        ) {

            customersCurrentPage =
                totalPages;
        }


        /*
         * Xác định record bắt đầu
         */

        const startIndex =
            (
                customersCurrentPage - 1
            ) *
            CUSTOMERS_PER_PAGE;


        /*
         * Chỉ lấy 10 record của trang hiện tại
         */

        const pageCustomers =
            filteredCustomers.slice(
                startIndex,
                startIndex +
                    CUSTOMERS_PER_PAGE
            );


        // =================================================
        // EMPTY
        // =================================================

        if (!pageCustomers.length) {

            body.innerHTML = `
                <tr>
                    <td
                        colspan="8"
                        class="empty"
                    >
                        ${
                            customersSearchKeyword
                                ? "Không tìm thấy khách hàng phù hợp."
                                : "Chưa có khách hàng."
                        }
                    </td>
                </tr>
            `;

        } else {

            // =============================================
            // ROWS
            // =============================================

            body.innerHTML =
                pageCustomers.map(
                    customer => `

                    <tr>

                        <td>
                            <strong>
                                ${escapeHtml(
                                    customer.id
                                )}
                            </strong>
                        </td>


                        <td>
                            ${escapeHtml(
                                customer.name
                            )}

                            ${
                                customer.notes
                                    ? `
                                        <br>
                                        <span class="muted">
                                            ${escapeHtml(
                                                customer.notes
                                            )}
                                        </span>
                                      `
                                    : ""
                            }
                        </td>


                        <td>
                            ${escapeHtml(
                                customer.phone
                            )}
                        </td>


                        <td>
                            ${escapeHtml(
                                [
                                    customer.colors,
                                    customer.flowers
                                ]
                                    .filter(Boolean)
                                    .join(" · ")
                            )}
                        </td>


                        <td>
                            ${escapeHtml(
                                customer.occasions
                            )}
                        </td>


                        <td>
                            ${customer.order_count || 0}
                        </td>


                        <td class="money">
                            ${money(
                                customer.total_purchase
                            )}
                        </td>


                        <td>

                            <div class="row-actions">

                                <button
                                    class="mini-btn"
                                    data-customer-edit="${escapeHtml(
                                        customer.id
                                    )}"
                                >
                                    Sửa
                                </button>


                                <button
                                    class="mini-btn"
                                    data-customer-delete="${escapeHtml(
                                        customer.id
                                    )}"
                                >
                                    Xóa
                                </button>

                            </div>

                        </td>

                    </tr>

                `
                ).join("");
        }


        /*
         * Render pagination
         */

        renderCustomersPagination(
            filteredCustomers.length,
            totalPages
        );
    }


    // =====================================================
    // CUSTOMERS PAGINATION
    // =====================================================

    function renderCustomersPagination(
        totalRecords,
        totalPages
    ) {
        const pagination =
            document.getElementById(
                "customersPagination"
            );

        if (!pagination) {
            return;
        }

        // Không có dữ liệu
        if (totalRecords === 0) {
            pagination.innerHTML = "";
            return;
        }

        // Tính khoảng record đang hiển thị
        const startRecord =
            (
                (customersCurrentPage - 1) *
                CUSTOMERS_PER_PAGE
            ) + 1;

        const endRecord =
            Math.min(
                customersCurrentPage *
                    CUSTOMERS_PER_PAGE,
                totalRecords
            );

        let html = `
            <div class="pagination-info">
                Hiển thị
                <strong>${startRecord}</strong>
                –
                <strong>${endRecord}</strong>
                trong
                <strong>${totalRecords}</strong>
                khách hàng
            </div>
        `;

        // Không cần nút nếu chỉ có 1 trang
        if (totalPages <= 1) {
            pagination.innerHTML = html;
            return;
        }

        html += `
            <div class="pagination-buttons">
        `;

        // =================================================
        // PREVIOUS
        // =================================================

        html += `
            <button
                type="button"
                class="page-btn"
                data-customers-page="${customersCurrentPage - 1}"
                ${
                    customersCurrentPage === 1
                        ? "disabled"
                        : ""
                }
            >
                ‹
            </button>
        `;

        // =================================================
        // PAGE NUMBERS
        // =================================================

        for (
            let page = 1;
            page <= totalPages;
            page++
        ) {
            html += `
                <button
                    type="button"
                    class="page-btn ${
                        page === customersCurrentPage
                            ? "active"
                            : ""
                    }"
                    data-customers-page="${page}"
                >
                    ${page}
                </button>
            `;
        }

        // =================================================
        // NEXT
        // =================================================

        html += `
            <button
                type="button"
                class="page-btn"
                data-customers-page="${customersCurrentPage + 1}"
                ${
                    customersCurrentPage === totalPages
                        ? "disabled"
                        : ""
                }
            >
                ›
            </button>
        `;

        html += `
            </div>
        `;

        pagination.innerHTML = html;
    }

    // =====================================================
    // CHANGE CUSTOMER PAGE
    // =====================================================

    function changeCustomersPage(page) {

        page = Number(page);

        const filteredCustomers =
            getFilteredCustomers();

        const totalPages =
            Math.max(
                1,
                Math.ceil(
                    filteredCustomers.length /
                    CUSTOMERS_PER_PAGE
                )
            );

        if (
            !Number.isInteger(page) ||
            page < 1 ||
            page > totalPages
        ) {
            return;
        }

        customersCurrentPage = page;

        renderCustomers();

        // Cuộn nhẹ về đầu bảng
        document
            .getElementById(
                "customersBody"
            )
            ?.closest(".table-wrap")
            ?.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });
    }

    // =====================================================
    // CUSTOMER SEARCH
    // =====================================================

    function searchCustomers(keyword) {

        customersSearchKeyword =
            String(keyword || "")
                .trim()
                .toLowerCase();


        /*
         * Search mới luôn quay về trang 1.
         */

        customersCurrentPage = 1;


        renderCustomers();
    }


    // =====================================================
    // CUSTOMER MODAL
    // =====================================================

    function customerForm(customer = {}) {

        return `

            <div class="form-grid">

                <div class="field">

                    <label>Mã khách</label>

                    <input
                        type="text"
                        name="id"
                        value="${escapeHtml(
                            customer.id || "Tự động"
                        )}"
                        readonly
                    >

                </div>


                <div class="field">

                    <label>Tên khách hàng</label>

                    <input
                        type="text"
                        name="name"
                        value="${escapeHtml(
                            customer.name || ""
                        )}"
                        required
                    >

                </div>


                <div class="field">

                    <label>Số điện thoại</label>

                    <input
                        type="tel"
                        name="phone"
                        value="${escapeHtml(
                            customer.phone || ""
                        )}"
                        required
                    >

                </div>


                <div class="field">

                    <label>Ngày sinh</label>

                    <input
                        type="date"
                        name="birthday"
                        value="${escapeHtml(
                            customer.birthday || ""
                        )}"
                    >

                </div>


                <div class="field">

                    <label>Màu yêu thích</label>

                    <input
                        type="text"
                        name="colors"
                        value="${escapeHtml(
                            customer.colors || ""
                        )}"
                    >

                </div>


                <div class="field">

                    <label>Hoa yêu thích</label>

                    <input
                        type="text"
                        name="flowers"
                        value="${escapeHtml(
                            customer.flowers || ""
                        )}"
                    >

                </div>


                <div class="field">

                    <label>Dịp thường mua</label>

                    <input
                        type="text"
                        name="occasions"
                        value="${escapeHtml(
                            customer.occasions || ""
                        )}"
                    >

                </div>


                <div class="field full">

                    <label>Ghi chú</label>

                    <textarea name="notes">${escapeHtml(
                        customer.notes || ""
                    )}</textarea>

                </div>

            </div>

        `;
    }


    function openCustomerModal(
        customer = null
    ) {

        editingCustomerId =
            customer?.id || null;


        const title =
            customer
                ? "Cập nhật khách hàng"
                : "Thêm khách hàng";


        openModal(
            title,
            customerForm(
                customer || {}
            ),
            async formData => {

                const data =
                    Object.fromEntries(
                        formData.entries()
                    );


                delete data.id;


                await saveCustomer(
                    data,
                    editingCustomerId
                );
            }
        );
    }


    // =====================================================
    // SAVE CUSTOMER
    // =====================================================

    async function saveCustomer(
        data,
        customerId
    ) {

        try {

            const url =
                customerId
                    ? `/api/customers/${encodeURIComponent(
                        customerId
                    )}`
                    : "/api/customers";


            const method =
                customerId
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
                        body: JSON.stringify(data)
                    }
                );


            const result =
                await response.json();


            if (!response.ok) {

                throw new Error(
                    result.error ||
                    "Không thể lưu khách hàng."
                );
            }


            closeModal();


            showToast(
                customerId
                    ? "Đã cập nhật khách hàng."
                    : "Đã thêm khách hàng."
            );


            /*
             * Reload toàn bộ customer data.
             */

            await loadCustomers();


            /*
             * Nếu Orders đang mở,
             * refresh danh sách đơn hàng để
             * SĐT khách hàng được cập nhật ngay.
             */

            if (
                window.LinChauOrders &&
                typeof window.LinChauOrders.loadOrders ===
                    "function"
            ) {

                await window.LinChauOrders
                    .loadOrders();
            }


            /*
             * Dashboard có số liệu liên quan.
             */

            await loadDashboard();


        } catch (error) {

            console.error(
                "Save customer error:",
                error
            );


            alert(error.message);
        }
    }


    // =====================================================
    // EDIT CUSTOMER
    // =====================================================

    async function editCustomer(
        customerId
    ) {

        try {

            const response =
                await fetch(
                    `/api/customers/${encodeURIComponent(
                        customerId
                    )}`
                );


            const customer =
                await response.json();


            if (!response.ok) {

                throw new Error(
                    customer.error ||
                    "Không thể tải khách hàng."
                );
            }


            openCustomerModal(
                customer
            );


        } catch (error) {

            console.error(error);

            alert(error.message);
        }
    }


    // =====================================================
    // DELETE CUSTOMER
    // =====================================================

    async function deleteCustomer(
        customerId
    ) {

        if (
            !confirm(
                `Xóa khách hàng ${customerId}?`
            )
        ) {
            return;
        }


        try {

            const response =
                await fetch(
                    `/api/customers/${encodeURIComponent(
                        customerId
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
                    "Không thể xóa khách hàng."
                );
            }


            showToast(
                "Đã xóa khách hàng."
            );


            await loadCustomers();


            /*
             * Refresh Orders nếu module đang có.
             */

            if (
                window.LinChauOrders &&
                typeof window.LinChauOrders.loadOrders ===
                    "function"
            ) {

                await window.LinChauOrders
                    .loadOrders();
            }


            await loadDashboard();


        } catch (error) {

            console.error(error);

            alert(error.message);
        }
    }


    // =====================================================
    // CUSTOMER EVENTS
    // =====================================================

    document
        .getElementById("customerSearch")
        ?.addEventListener(
            "input",
            event => {

                searchCustomers(
                    event.target.value
                );
            }
        );

    document
        .getElementById("customersPagination")
        ?.addEventListener(
            "click",
            event => {

                const pageButton =
                    event.target.closest(
                        "[data-customers-page]"
                    );

                if (
                    !pageButton ||
                    pageButton.disabled
                ) {
                    return;
                }

                const page =
                    Number(
                        pageButton.dataset
                            .customersPage
                    );

                changeCustomersPage(page);
            }
        );

    document
        .getElementById("newCustomerBtn")
        ?.addEventListener(
            "click",
            () => openCustomerModal()
        );


    document
        .getElementById("customersBody")
        ?.addEventListener(
            "click",
            event => {

                const editButton =
                    event.target.closest(
                        "[data-customer-edit]"
                    );


                if (editButton) {

                    editCustomer(
                        editButton.dataset
                            .customerEdit
                    );

                    return;
                }


                const deleteButton =
                    event.target.closest(
                        "[data-customer-delete]"
                    );


                if (deleteButton) {

                    deleteCustomer(
                        deleteButton.dataset
                            .customerDelete
                    );
                }
            }
        );


    // =====================================================
    // INITIALIZE
    // =====================================================

    const first =
        navItems[0]?.dataset.nav;


    if (first) {

        showView(first);
    }


    // Dashboard
    loadDashboard();


    // Customers
    loadCustomers();


    // =====================================================
    // SHARED FUNCTIONS
    // =====================================================

    window.LinChauApp = {

        money,

        escapeHtml,

        formatDateVN,

        todayISO,

        openModal,

        closeModal,

        showToast,

        loadDashboard,

        loadCustomers

    };

})();