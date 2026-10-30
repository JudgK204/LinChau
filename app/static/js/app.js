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
        const element = document.getElementById("kpiCards");
        if (!element) return;

        const kpi = data.kpi || {};

        const cards = [
            {
                icon: "↗",
                label: "Doanh thu ngày",
                value: money(kpi.daily_sales),
                unit: "",
                note: "Theo ngày tạo đơn",
                theme: "green"
            },
            {
                icon: "▤",
                label: "Doanh thu tháng",
                value: money(kpi.monthly_sales),
                unit: "",
                note: "Lũy kế tháng hiện tại",
                theme: "purple"
            },
            {
                icon: "✳",
                label: "Doanh thu năm",
                value: money(kpi.yearly_sales),
                unit: "",
                note: "Lũy kế năm hiện tại",
                theme: "orange"
            },
                        {
                icon: "▦",
                label: "Đơn hôm nay",
                value: Number(kpi.orders_today || 0).toLocaleString("vi-VN"),
                unit: "đơn hàng",
                note: "Đơn được tạo hôm nay",
                theme: "mint"
            },
            {
                icon: "₫",
                label: "Còn phải thu",
                value: money(kpi.receivable),
                unit: "",
                note: "Công nợ các đơn hàng",
                theme: "blue"
            },
            {
                icon: "!",
                label: "Cảnh báo tồn kho",
                value: Number(kpi.low_stock || 0).toLocaleString("vi-VN"),
                unit: "nguyên liệu",
                note: "Cần kiểm tra hoặc nhập thêm",
                theme: "rose"
            }
        ];

        element.innerHTML = cards.map(card => `
            <article class="kpi kpi-${card.theme}">
                <div class="kpi-top">
                    <span class="kpi-label">${card.label}</span>
                    <span class="kpi-icon" aria-hidden="true">${card.icon}</span>
                </div>

                <div class="kpi-value">${card.value}</div>

                ${card.unit
                    ? `<div class="kpi-unit">${card.unit}</div>`
                    : ""}

                <div class="kpi-divider"></div>
                <div class="kpi-note">${card.note}</div>
            </article>
        `).join("");
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
    // EXPORT REVENUE / ORDERS / RECEIVABLES / INVENTORY
    // Dán trước phần INITIALIZE
    // =====================================================

    const REPORT_PENDING = "Chờ xác nhận";
    const REPORT_CANCELLED = "Hủy";

    function reportNum(value) {
        const n = Number(value);
        return Number.isFinite(n) ? n : 0;
    }

    function reportDate(value) {
        if (!value) return "";
        const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (match) return `${match[1]}-${match[2]}-${match[3]}`;

        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return "";

        return [
            date.getFullYear(),
            String(date.getMonth() + 1).padStart(2, "0"),
            String(date.getDate()).padStart(2, "0")
        ].join("-");
    }

    function reportRevenue(order) {
        const status = String(order.status || "").trim();

        if (status === REPORT_PENDING) return 0;

        if (status === REPORT_CANCELLED) {
            return reportNum(
                order.deposit ?? order.deposit_amount ?? order.amount_paid
            );
        }

        return reportNum(order.total);
    }

    async function reportGet(url, keys) {
        const response = await fetch(url, {
            headers: { Accept: "application/json" }
        });

        if (!response.ok) {
            throw new Error(`Không thể tải dữ liệu từ ${url}`);
        }

        const result = await response.json();

        if (Array.isArray(result)) return result;

        for (const key of keys) {
            if (Array.isArray(result?.[key])) return result[key];
        }

        return [];
    }

    function reportColumn(index) {
        let name = "";
        let n = index + 1;

        while (n > 0) {
            const remainder = (n - 1) % 26;
            name = String.fromCharCode(65 + remainder) + name;
            n = Math.floor((n - 1) / 26);
        }

        return name;
    }

    function reportEscape(value) {
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&apos;");
    }

    function reportSerial(dateValue) {
        const date = new Date(`${dateValue}T00:00:00`);
        if (Number.isNaN(date.getTime())) return null;

        return Math.floor(date.getTime() / 86400000) + 25569;
    }

    function reportSheetXml(sheet) {
        const allRows = [sheet.headers, ...sheet.rows];

        const rowsXml = allRows.map((row, rowIndex) => {
            const cells = row.map((value, colIndex) => {
                const ref = `${reportColumn(colIndex)}${rowIndex + 1}`;

                // Các cột types đang khai báo theo chỉ số bắt đầu từ 1.
                const type = sheet.types?.[colIndex] || "text";

                const style = rowIndex === 0 ? 1 :
                    type === "money" ? 2 :
                    type === "date" ? 3 :
                    type === "percent" ? 4 :
                    type === "number" ? 5 : 0;

                if (rowIndex > 0 && type === "date") {
                    const serial = reportSerial(value);

                    if (serial !== null) {
                        return `<c r="${ref}" s="${style}"><v>${serial}</v></c>`;
                    }
                }

                if (
                    rowIndex > 0 &&
                    ["money", "number", "percent"].includes(type)
                ) {
                    return `<c r="${ref}" s="${style}"><v>${reportNum(value)}</v></c>`;
                }

                return `<c r="${ref}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${reportEscape(value)}</t></is></c>`;
            }).join("");

            return `<row r="${rowIndex + 1}">${cells}</row>`;
        }).join("");

        const widths = sheet.headers.map((header, index) => {
            const width = Math.min(
                35,
                Math.max(12, String(header).length + 3)
            );

            return `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`;
        }).join("");

        const lastColumn = reportColumn(sheet.headers.length - 1);
        const lastRow = allRows.length;

        return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
    <worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
        <dimension ref="A1:${lastColumn}${lastRow}"/>
        <sheetViews>
            <sheetView workbookViewId="0">
                <pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/>
            </sheetView>
        </sheetViews>
        <cols>${widths}</cols>
        <sheetData>${rowsXml}</sheetData>
        <autoFilter ref="A1:${lastColumn}${lastRow}"/>
    </worksheet>`;
    }

    function reportU16(n) {
        return [n & 255, (n >>> 8) & 255];
    }

    function reportU32(n) {
        return [
            n & 255, (n >>> 8) & 255,
            (n >>> 16) & 255, (n >>> 24) & 255
        ];
    }

    function reportCrc32(bytes) {
        let crc = -1;

        for (let i = 0; i < bytes.length; i++) {
            crc ^= bytes[i];

            for (let j = 0; j < 8; j++) {
                crc = (crc >>> 1) ^ (0xEDB88320 & -(crc & 1));
            }
        }

        return (crc ^ -1) >>> 0;
    }

    function reportZip(files) {
        const encoder = new TextEncoder();
        const local = [];
        const central = [];
        let offset = 0;

        for (const file of files) {
            const name = encoder.encode(file.name);
            const data = encoder.encode(file.data);
            const crc = reportCrc32(data);

            const header = new Uint8Array([
                ...reportU32(0x04034b50),
                ...reportU16(20), ...reportU16(0x0800),
                ...reportU16(0), ...reportU16(0), ...reportU16(0),
                ...reportU32(crc),
                ...reportU32(data.length), ...reportU32(data.length),
                ...reportU16(name.length), ...reportU16(0)
            ]);

            local.push(header, name, data);

            const centralHeader = new Uint8Array([
                ...reportU32(0x02014b50),
                ...reportU16(20), ...reportU16(20),
                ...reportU16(0x0800),
                ...reportU16(0), ...reportU16(0), ...reportU16(0),
                ...reportU32(crc),
                ...reportU32(data.length), ...reportU32(data.length),
                ...reportU16(name.length),
                ...reportU16(0), ...reportU16(0),
                ...reportU16(0), ...reportU16(0),
                ...reportU32(0), ...reportU32(offset)
            ]);

            central.push(centralHeader, name);
            offset += header.length + name.length + data.length;
        }

        const centralSize = central.reduce((sum, part) => sum + part.length, 0);

        const end = new Uint8Array([
            ...reportU32(0x06054b50),
            ...reportU16(0), ...reportU16(0),
            ...reportU16(files.length), ...reportU16(files.length),
            ...reportU32(centralSize), ...reportU32(offset),
            ...reportU16(0)
        ]);

        return new Blob([...local, ...central, end], {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        });
    }

    function reportMakeWorkbook(sheets) {
        const files = [];
        const sheetNames = sheets.map((sheet, index) => ({
            ...sheet,
            name: String(sheet.name || `Sheet${index + 1}`)
                .slice(0, 31)
                .replace(/[\\/?*[\]:]/g, "_")
        }));

        const overrides = sheetNames.map((_, i) =>
            `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`
        ).join("");

        files.push({
            name: "[Content_Types].xml",
            data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
${overrides}</Types>`
        });

        files.push({
            name: "_rels/.rels",
            data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`
        });

        files.push({
            name: "xl/workbook.xml",
            data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets>${sheetNames.map((sheet, i) =>
                `<sheet name="${reportEscape(sheet.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`
            ).join("")}</sheets></workbook>`
        });

        files.push({
            name: "xl/_rels/workbook.xml.rels",
            data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
${sheetNames.map((_, i) =>
                `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`
            ).join("")}</Relationships>`
        });

        files.push({
            name: "xl/styles.xml",
            data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<fonts count="2">
<font><sz val="11"/><name val="Arial"/></font>
<font><b/><color rgb="FFFFFFFF"/><sz val="11"/><name val="Arial"/></font>
</fonts>
<fills count="3">
<fill><patternFill patternType="none"/></fill>
<fill><patternFill patternType="gray125"/></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FF315F4B"/><bgColor indexed="64"/></patternFill></fill>
</fills>
<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="6">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/>
<xf numFmtId="3" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
<xf numFmtId="14" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
<xf numFmtId="10" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
<xf numFmtId="3" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
</cellXfs></styleSheet>`
        });

        sheetNames.forEach((sheet, i) => {
            files.push({
                name: `xl/worksheets/sheet${i + 1}.xml`,
                data: reportSheetXml(sheet)
            });
        });

        return reportZip(files);
    }

    function reportPeriodKey(date, period) {
        if (!date) return "";
        if (period === "day") return date;
        if (period === "month") return date.slice(0, 7);
        return date.slice(0, 4);
    }

    function reportOrderDate(order) {
        return reportDate(order.created ?? order.created_at ?? order.order_date);
    }

    function reportMovementDate(movement) {
        return reportDate(movement.date ?? movement.created ?? movement.created_at);
    }

    function reportMovementEffect(movement) {
        const type = String(
            movement.type ?? movement.movement_type ?? ""
        ).toLowerCase();

        const qty = reportNum(movement.qty ?? movement.quantity);

        if (["in", "nhập", "nhap", "import"].includes(type)) return qty;

        if ([
            "out", "xuất", "xuat", "export",
            "waste", "hao hụt", "hao hut"
        ].includes(type)) return -qty;

        return 0;
    }

    function reportInventoryAt(items, movements, cutoff) {
        return items.map(item => {
            const itemId = String(
                item.id ?? item.item_id ?? item.material_id ?? ""
            );

            const currentStock = reportNum(
                item.stock ?? item.current_stock ?? item.quantity
            );

            const laterMovement = movements.reduce((sum, movement) => {
                const movementItemId = String(
                    movement.itemId ?? movement.item_id ?? movement.material_id ?? ""
                );

                const date = reportMovementDate(movement);

                if (movementItemId !== itemId || !date || date <= cutoff) {
                    return sum;
                }

                return sum + reportMovementEffect(movement);
            }, 0);

            const stock = currentStock - laterMovement;
            const cost = reportNum(
                item.cost ?? item.unit_cost ?? item.last_cost ?? item.latest_cost
            );

            return {
                id: itemId,
                name: item.name ?? item.item_name ?? item.material_name ?? "",
                category: item.category ?? item.group_name ?? "",
                unit: item.unit ?? item.unit_name ?? "",
                stock,
                min: reportNum(item.min ?? item.min_stock ?? item.minimum_stock),
                cost,
                value: stock * cost
            };
        });
    }

    function reportPeriodKeys(orders, movements, period, today) {
        const keys = new Set([reportPeriodKey(today, period)]);

        orders.forEach(order => {
            const date = reportOrderDate(order);
            if (date) keys.add(reportPeriodKey(date, period));
        });

        movements.forEach(movement => {
            const date = reportMovementDate(movement);
            if (date) keys.add(reportPeriodKey(date, period));
        });

        return [...keys].filter(Boolean).sort();
    }

    function reportCutoff(key, period, today) {
        let date = key;

        if (period === "month") date = `${key}-31`;
        if (period === "year") date = `${key}-12-31`;

        // Clamp future period to today.
        return date > today ? today : date;
    }

    function reportSummary(period, keys, orders, items, movements, today) {
        const headers = [
            period === "day" ? "Ngày" : period === "month" ? "Tháng" : "Năm",
            "Doanh thu",
            "Số đơn",
            "Đơn chờ xác nhận",
            "Đơn hủy",
            "Dư nợ hiện tại",
            "Giá trị tồn kho ước tính",
            "Số NVL cần nhập"
        ];

        const rows = keys.map(key => {
            const periodOrders = orders.filter(order =>
                reportPeriodKey(reportOrderDate(order), period) === key
            );

            const stock = reportInventoryAt(
                items, movements, reportCutoff(key, period, today)
            );

            return [
                key,
                periodOrders.reduce((sum, order) => sum + reportRevenue(order), 0),
                periodOrders.length,
                periodOrders.filter(o => o.status === REPORT_PENDING).length,
                periodOrders.filter(o => o.status === REPORT_CANCELLED).length,
                periodOrders.reduce((sum, order) =>
                    sum + reportNum(order.balance ?? order.remaining ?? order.receivable), 0
                ),
                stock.reduce((sum, item) => sum + item.value, 0),
                stock.filter(item => item.stock <= item.min).length
            ];
        });

        return {
            name: period === "day" ? "Bao_Cao_Ngay" :
                  period === "month" ? "Bao_Cao_Thang" : "Bao_Cao_Nam",
            headers,
            types: {
                1: "money", 2: "number", 3: "number", 4: "number",
                5: "money", 6: "money", 7: "number"
            },
            rows
        };
    }

    function reportInventorySheet(name, period, keys, items, movements, today) {
        const headers = [
            period === "day" ? "Ngày" : period === "month" ? "Tháng" : "Năm",
            "Mã NVL", "Tên nguyên liệu", "Nhóm", "ĐVT",
            "Tồn cuối kỳ ước tính", "Tồn tối thiểu",
            "Đơn giá hiện tại", "Giá trị tồn ước tính", "Trạng thái"
        ];

        const rows = [];

        keys.forEach(key => {
            const stock = reportInventoryAt(
                items, movements, reportCutoff(key, period, today)
            );

            stock.forEach(item => {
                rows.push([
                    key, item.id, item.name, item.category, item.unit,
                    item.stock, item.min, item.cost, item.value,
                    item.stock <= item.min ? "CẦN NHẬP" : "Bình thường"
                ]);
            });
        });

        return {
            name,
            headers,
            types: { 5: "number", 6: "number", 7: "money", 8: "money" },
            rows
        };
    }

    async function exportRevenueReport() {
        const button = document.getElementById("exportRevenueReportBtn");

        if (button) {
            button.disabled = true;
            button.dataset.originalText = button.textContent;
            button.textContent = "Đang tạo báo cáo...";
        }

        try {
            const [orders, items, movements] = await Promise.all([
                reportGet("/api/orders", ["orders", "data", "items"]),
                reportGet("/api/inventory", ["inventory", "items", "data", "materials"]),
                reportGet("/api/movements", ["movements", "data", "items"])
            ]);

            const today = todayISO();

            const dailyKeys = reportPeriodKeys(orders, movements, "day", today);
            const monthlyKeys = reportPeriodKeys(orders, movements, "month", today);
            const yearlyKeys = reportPeriodKeys(orders, movements, "year", today);

            const sheets = [
                reportSummary("day", dailyKeys, orders, items, movements, today),
                reportSummary("month", monthlyKeys, orders, items, movements, today),
                reportSummary("year", yearlyKeys, orders, items, movements, today),
                reportInventorySheet("Ton_Kho_Ngay", "day", dailyKeys, items, movements, today),
                reportInventorySheet("Ton_Kho_Thang", "month", monthlyKeys, items, movements, today),
                reportInventorySheet("Ton_Kho_Nam", "year", yearlyKeys, items, movements, today)
            ];

            const blob = reportMakeWorkbook(sheets);
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");

            link.href = url;
            link.download = `LinChau_Floral_Bao_Cao_Doanh_Thu_${today}.xlsx`;

            document.body.appendChild(link);
            link.click();
            link.remove();

            setTimeout(() => URL.revokeObjectURL(url), 1000);
            showToast("Đã xuất báo cáo doanh thu và tồn kho.");
        } catch (error) {
            console.error("Export revenue report error:", error);
            showToast(error.message || "Xuất báo cáo thất bại. Hãy kiểm tra API.");
        } finally {
            if (button) {
                button.disabled = false;
                button.textContent = button.dataset.originalText || "Báo cáo Excel";
            }
        }
    }

    function installRevenueReportButton() {
        if (document.getElementById("exportRevenueReportBtn")) return;

        const existingButton =
            document.getElementById("quickExcelBtn") ||
            document.getElementById("exportAllExcelBtn") ||
            [...document.querySelectorAll("button, a")].find(element =>
                /xuất excel|export excel/i.test(element.textContent || "")
            );

        if (!existingButton) {
            console.warn("Không tìm thấy nút Xuất Excel để đặt nút báo cáo.");
            return;
        }

        const button = document.createElement("button");
        button.type = "button";
        button.id = "exportRevenueReportBtn";
        button.className = existingButton.className || "btn ghost";
        button.textContent = "Xuất doanh thu và tồn kho";
        button.title = "Xuất doanh thu, số đơn, dư nợ và tồn kho theo ngày/tháng/năm";
        button.addEventListener("click", exportRevenueReport);

        existingButton.insertAdjacentElement("afterend", button);
    }

    // =====================================================
    // INITIALIZE
    // =====================================================

    const first =
        navItems[0]?.dataset.nav;


    if (first) {

        showView(first);
    }

    // Nút xuất báo cáo doanh thu đặt cạnh nút Xuất Excel.
    installRevenueReportButton();

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