(() => {
    "use strict";

    // ============================================================
    // HELPERS
    // ============================================================

    const getEl = (id) => document.getElementById(id);

    function showToast(message, type = "success") {
        // Ưu tiên dùng toast của app.js nếu có
        if (
            window.LinChauApp &&
            typeof window.LinChauApp.showToast === "function"
        ) {
            window.LinChauApp.showToast(message, type);
            return;
        }

        const toast = getEl("toast");

        if (!toast) {
            alert(message);
            return;
        }

        toast.textContent = message;
        toast.className = `toast show ${type}`;

        setTimeout(() => {
            toast.className = "toast";
        }, 3000);
    }


    // ============================================================
    // DOWNLOAD FILE FROM API
    // ============================================================

    async function downloadFile(url, fallbackFilename) {
        try {
            const response = await fetch(url);

            if (!response.ok) {
                let message = `Không thể tải file. HTTP ${response.status}`;

                try {
                    const data = await response.json();

                    if (data && data.message) {
                        message = data.message;
                    }
                } catch (error) {
                    // Response không phải JSON
                }

                throw new Error(message);
            }

            const blob = await response.blob();

            let filename = fallbackFilename;

            const disposition =
                response.headers.get("Content-Disposition");

            if (disposition) {
                const match = disposition.match(
                    /filename\*=UTF-8''([^;]+)|filename="?([^"]+)"?/i
                );

                if (match) {
                    filename = decodeURIComponent(
                        match[1] || match[2]
                    );
                }
            }

            const objectUrl = URL.createObjectURL(blob);

            const link = document.createElement("a");

            link.href = objectUrl;
            link.download = filename;

            document.body.appendChild(link);

            link.click();

            link.remove();

            setTimeout(() => {
                URL.revokeObjectURL(objectUrl);
            }, 1000);

            return true;

        } catch (error) {

            console.error(
                "Download error:",
                error
            );

            showToast(
                error.message ||
                "Không thể tải file.",
                "error"
            );

            return false;
        }
    }


    // ============================================================
    // EXPORT ALL EXCEL
    // ============================================================

    async function exportAllExcel() {

        showToast(
            "Đang tạo file Excel...",
            "info"
        );

        return downloadFile(
            "/api/export/all",
            "LinChau_Full_Data.xlsx"
        );
    }


    // ============================================================
    // EXPORT ALL ORDERS
    // ============================================================

    async function exportOrders() {

        showToast(
            "Đang tạo file đơn hàng...",
            "info"
        );

        return downloadFile(
            "/api/export/orders",
            "Don_Hang.xlsx"
        );
    }


    // ============================================================
    // EXPORT FILTERED ORDERS
    // ============================================================

    async function exportFilteredOrders() {

        const params = new URLSearchParams();

        const searchInput =
            getEl("orderSearch");

        const statusInput =
            getEl("orderStatusFilter");

        const fromInput =
            getEl("orderFrom");

        const toInput =
            getEl("orderTo");

        const keyword =
            searchInput?.value?.trim() || "";

        const status =
            statusInput?.value?.trim() || "";

        const dateFrom =
            fromInput?.value?.trim() || "";

        const dateTo =
            toInput?.value?.trim() || "";


        if (keyword) {
            params.set("q", keyword);
        }

        if (status) {
            params.set("status", status);
        }

        if (dateFrom) {
            params.set("date_from", dateFrom);
        }

        if (dateTo) {
            params.set("date_to", dateTo);
        }


        const queryString =
            params.toString();

        const url = queryString
            ? `/api/export/orders?${queryString}`
            : "/api/export/orders";


        showToast(
            "Đang xuất danh sách đơn hàng đang lọc...",
            "info"
        );

        return downloadFile(
            url,
            "Don_Hang_Dang_Loc.xlsx"
        );
    }


    // ============================================================
    // EXPORT FILTERED CUSTOMERS
    // ============================================================

    async function exportFilteredCustomers() {

        const params =
            new URLSearchParams();

        const searchInput =
            getEl("customerSearch");

        const keyword =
            searchInput?.value?.trim() || "";


        if (keyword) {
            params.set(
                "q",
                keyword
            );
        }


        const queryString =
            params.toString();

        const url = queryString
            ? `/api/export/customers?${queryString}`
            : "/api/export/customers";


        showToast(
            keyword
                ? "Đang xuất danh sách khách hàng đang lọc..."
                : "Đang xuất toàn bộ danh sách khách hàng...",
            "info"
        );


        return downloadFile(
            url,
            keyword
                ? "Khach_Hang_Dang_Loc.xlsx"
                : "Khach_Hang.xlsx"
        );
    }


    // ============================================================
    // EXPORT FILTERED INVENTORY
    // ============================================================

    async function exportFilteredInventory() {

        const params =
            new URLSearchParams();

        const searchInput =
            getEl("inventorySearch");

        const keyword =
            searchInput?.value?.trim() || "";


        if (keyword) {
            params.set(
                "q",
                keyword
            );
        }


        const queryString =
            params.toString();

        const url = queryString
            ? `/api/export/inventory?${queryString}`
            : "/api/export/inventory";


        showToast(
            keyword
                ? "Đang xuất danh sách nguyên liệu đang lọc..."
                : "Đang xuất toàn bộ danh sách nguyên liệu...",
            "info"
        );


        return downloadFile(
            url,
            keyword
                ? "Kho_Dang_Loc.xlsx"
                : "Kho.xlsx"
        );
    }


    // ============================================================
    // EXPORT FILTERED MOVEMENTS
    // ============================================================

    async function exportFilteredMovements() {

        const params =
            new URLSearchParams();

        const searchInput =
            getEl("movementSearch");

        const typeInput =
            getEl("movementTypeFilter");

        const keyword =
            searchInput?.value?.trim() || "";

        const type =
            typeInput?.value?.trim() || "";


        if (keyword) {
            params.set(
                "q",
                keyword
            );
        }

        if (type) {
            params.set(
                "type",
                type
            );
        }


        const queryString =
            params.toString();

        const url = queryString
            ? `/api/export/movements?${queryString}`
            : "/api/export/movements";


        showToast(
            keyword || type
                ? "Đang xuất danh sách biến động kho đang lọc..."
                : "Đang xuất toàn bộ biến động kho...",
            "info"
        );


        return downloadFile(
            url,
            keyword || type
                ? "Bien_Dong_Kho_Dang_Loc.xlsx"
                : "Bien_Dong_Kho.xlsx"
        );
    }


    // ============================================================
    // EXPORT WORKFLOW
    // ============================================================

    async function exportWorkflow() {

        showToast(
            "Đang tạo file sản xuất & giao...",
            "info"
        );

        return downloadFile(
            "/api/export/workflow",
            "San_Xuat_Giao.xlsx"
        );
    }


    // ============================================================
    // BACKUP JSON
    // ============================================================

    async function backupJson() {

        showToast(
            "Đang tạo bản sao lưu...",
            "info"
        );

        return downloadFile(
            "/api/backup",
            "LinChau_Backup.json"
        );
    }


    // ============================================================
    // RESTORE JSON
    // ============================================================

    async function restoreJson(file) {

        if (!file) {
            return;
        }


        // --------------------------------------------------------
        // Basic file validation
        // --------------------------------------------------------

        if (
            file.type &&
            file.type !== "application/json" &&
            !file.name.toLowerCase().endsWith(".json")
        ) {
            showToast(
                "Vui lòng chọn file JSON.",
                "error"
            );

            return;
        }


        // --------------------------------------------------------
        // Read file
        // --------------------------------------------------------

        let data;

        try {

            const text =
                await file.text();

            data =
                JSON.parse(text);

        } catch (error) {

            console.error(
                "JSON parse error:",
                error
            );

            showToast(
                "File JSON không hợp lệ hoặc bị lỗi.",
                "error"
            );

            return;
        }


        // --------------------------------------------------------
        // Basic backup validation
        // --------------------------------------------------------

        if (
            !data ||
            typeof data !== "object"
        ) {
            showToast(
                "File backup không hợp lệ.",
                "error"
            );

            return;
        }


        if (
            data.app &&
            data.app !== "LinChau Floral"
        ) {
            showToast(
                "File này không phải backup của LinChau Floral.",
                "error"
            );

            return;
        }


        if (
            !data.tables ||
            typeof data.tables !== "object"
        ) {
            showToast(
                "File backup không có dữ liệu hợp lệ.",
                "error"
            );

            return;
        }


        // --------------------------------------------------------
        // Count data
        // --------------------------------------------------------

        const customers =
            Array.isArray(data.tables.customers)
                ? data.tables.customers.length
                : 0;

        const inventory =
            Array.isArray(data.tables.inventory)
                ? data.tables.inventory.length
                : 0;

        const movements =
            Array.isArray(data.tables.movements)
                ? data.tables.movements.length
                : 0;

        const orders =
            Array.isArray(data.tables.orders)
                ? data.tables.orders.length
                : 0;


        // --------------------------------------------------------
        // Confirm
        // --------------------------------------------------------

        const message =
            "⚠️ KHÔI PHỤC DỮ LIỆU\n\n" +

            "Toàn bộ dữ liệu hiện tại sẽ bị thay thế " +
            "bằng dữ liệu trong file backup.\n\n" +

            `Khách hàng: ${customers}\n` +
            `Nguyên liệu: ${inventory}\n` +
            `Biến động kho: ${movements}\n` +
            `Đơn hàng: ${orders}\n\n` +

            "Bạn có chắc chắn muốn tiếp tục?";


        const confirmed =
            window.confirm(message);


        if (!confirmed) {
            return;
        }


        // --------------------------------------------------------
        // Disable button while restoring
        // --------------------------------------------------------

        const input =
            getEl("importInput");

        const label =
            input?.closest(".file-label");

        const originalText =
            label?.childNodes?.[0]?.textContent || "";


        if (label) {
            label.childNodes[0].textContent =
                "Đang khôi phục... ";
        }


        try {

            // ----------------------------------------------------
            // Send JSON to Flask
            // ----------------------------------------------------

            const response =
                await fetch(
                    "/api/restore",
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json",
                        },

                        body:
                            JSON.stringify(data),
                    }
                );


            const result =
                await response.json();


            if (!response.ok) {

                throw new Error(
                    result.message ||
                    "Khôi phục dữ liệu thất bại."
                );
            }


            showToast(
                result.message ||
                "Khôi phục dữ liệu thành công.",
                "success"
            );


            // ----------------------------------------------------
            // Reload all application data
            // ----------------------------------------------------

            await reloadApplicationData();


            // ----------------------------------------------------
            // Refresh health
            // ----------------------------------------------------

            await loadDataHealth();

        } catch (error) {

            console.error(
                "Restore error:",
                error
            );

            showToast(
                error.message ||
                "Không thể khôi phục dữ liệu.",
                "error"
            );

        } finally {

            if (label) {
                label.childNodes[0].textContent =
                    originalText;
            }

            if (input) {
                input.value = "";
            }
        }
    }


    // ============================================================
    // RELOAD APPLICATION DATA
    // ============================================================

    async function reloadApplicationData() {

        const tasks = [];


        // Dashboard
        if (
            window.LinChauApp &&
            typeof window.LinChauApp.loadDashboard === "function"
        ) {
            tasks.push(
                window.LinChauApp.loadDashboard()
            );
        }


        // Orders
        if (
            window.LinChauOrders &&
            typeof window.LinChauOrders.loadOrders === "function"
        ) {
            tasks.push(
                window.LinChauOrders.loadOrders()
            );
        }


        // Customers
        if (
            window.LinChauApp &&
            typeof window.LinChauApp.loadCustomers === "function"
        ) {
            tasks.push(
                window.LinChauApp.loadCustomers()
            );
        }


        // Inventory
        if (
            window.LinChauInventory &&
            typeof window.LinChauInventory.loadInventory === "function"
        ) {
            tasks.push(
                window.LinChauInventory.loadInventory()
            );
        }


        // Movements
        if (
            window.LinChauMovements &&
            typeof window.LinChauMovements.loadMovements === "function"
        ) {
            tasks.push(
                window.LinChauMovements.loadMovements()
            );
        }


        // Workflow
        if (
            window.LinChauWorkflow &&
            typeof window.LinChauWorkflow.loadWorkflow === "function"
        ) {
            tasks.push(
                window.LinChauWorkflow.loadWorkflow()
            );
        }


        try {

            await Promise.all(tasks);

        } catch (error) {

            console.error(
                "Reload application error:",
                error
            );
        }
    }


    // ============================================================
    // DATA HEALTH
    // ============================================================

    async function loadDataHealth() {

        const container =
            getEl("dataHealth");

        if (!container) {
            return;
        }


        container.innerHTML = `
            <div class="muted">
                Đang kiểm tra dữ liệu...
            </div>
        `;


        try {

            const response =
                await fetch(
                    "/api/data-health"
                );

            const result =
                await response.json();


            if (!response.ok) {

                throw new Error(
                    result.message ||
                    "Không thể kiểm tra dữ liệu."
                );
            }


            renderDataHealth(result);

        } catch (error) {

            console.error(
                "Data health error:",
                error
            );


            container.innerHTML = `
                <div class="data-health-error">
                    Không thể kiểm tra tình trạng dữ liệu:
                    ${escapeHtml(error.message)}
                </div>
            `;
        }
    }


    // ============================================================
    // RENDER DATA HEALTH
    // ============================================================

    function renderDataHealth(data) {

        const container =
            getEl("dataHealth");

        if (!container) {
            return;
        }


        const counts =
            data.counts || {};

        const warnings =
            data.warnings || {};

        const healthy =
            Boolean(data.healthy);


        const orphanOrders =
            Number(
                warnings.orphan_orders || 0
            );

        const orphanMovements =
            Number(
                warnings.orphan_movements || 0
            );

        const negativeStock =
            Number(
                warnings.negative_stock || 0
            );

        const lowStock =
            Number(
                warnings.low_stock || 0
            );

        const ordersWithoutDelivery =
            Number(
                warnings.orders_without_delivery || 0
            );


        const hasWarnings =
            orphanOrders > 0 ||
            orphanMovements > 0 ||
            negativeStock > 0 ||
            lowStock > 0 ||
            ordersWithoutDelivery > 0;


        const statusClass =
            healthy && !hasWarnings
                ? "healthy"
                : "warning";


        const statusText =
            healthy && !hasWarnings
                ? "Dữ liệu đang ổn định"
                : "Có dữ liệu cần kiểm tra";


        container.innerHTML = `
            <div class="data-health-summary ${statusClass}">

                <div class="data-health-status">
                    <strong>${statusText}</strong>
                </div>

                <div class="data-health-grid">

                    <div class="data-health-item">
                        <span>Khách hàng</span>
                        <strong>
                            ${formatNumber(counts.customers)}
                        </strong>
                    </div>

                    <div class="data-health-item">
                        <span>Đơn hàng</span>
                        <strong>
                            ${formatNumber(counts.orders)}
                        </strong>
                    </div>

                    <div class="data-health-item">
                        <span>Nguyên liệu</span>
                        <strong>
                            ${formatNumber(counts.inventory)}
                        </strong>
                    </div>

                    <div class="data-health-item">
                        <span>Biến động kho</span>
                        <strong>
                            ${formatNumber(counts.movements)}
                        </strong>
                    </div>

                </div>

                <div class="data-health-warnings">

                    <div class="health-row">
                        <span>Đơn hàng thiếu khách hàng</span>
                        <strong>${orphanOrders}</strong>
                    </div>

                    <div class="health-row">
                        <span>Biến động kho thiếu nguyên liệu</span>
                        <strong>${orphanMovements}</strong>
                    </div>

                    <div class="health-row">
                        <span>Nguyên liệu tồn âm</span>
                        <strong>${negativeStock}</strong>
                    </div>

                    <div class="health-row">
                        <span>Nguyên liệu dưới mức tối thiểu</span>
                        <strong>${lowStock}</strong>
                    </div>

                    <div class="health-row">
                        <span>Đơn chưa có ngày giao</span>
                        <strong>${ordersWithoutDelivery}</strong>
                    </div>

                </div>

            </div>
        `;
    }


    // ============================================================
    // SIMPLE HTML ESCAPE
    // ============================================================

    function escapeHtml(value) {

        return String(value ?? "")

            .replace(/&/g, "&amp;")

            .replace(/</g, "&lt;")

            .replace(/>/g, "&gt;")

            .replace(/"/g, "&quot;")

            .replace(/'/g, "&#039;");
    }


    function formatNumber(value) {

        const number =
            Number(value || 0);

        return number.toLocaleString("vi-VN");
    }

    // ============================================================
    // EXPORT ALL CUSTOMERS
    // ============================================================

    async function exportCustomers() {
        showToast(
            "Đang tạo file khách hàng...",
            "info"
        );

        return downloadFile(
            "/api/export/customers",
            "Khach_Hang.xlsx"
        );
    }


    // ============================================================
    // EXPORT ALL INVENTORY
    // ============================================================

    async function exportInventory() {
        showToast(
            "Đang tạo file kho...",
            "info"
        );

        return downloadFile(
            "/api/export/inventory",
            "Kho.xlsx"
        );
    }


    // ============================================================
    // EXPORT ALL MOVEMENTS
    // ============================================================

    async function exportMovements() {
        showToast(
            "Đang tạo file biến động kho...",
            "info"
        );

        return downloadFile(
            "/api/export/movements",
            "Bien_Dong_Kho.xlsx"
        );
}
    // ============================================================
    // EVENT BINDING
    // ============================================================

    function bindEvents() {

        // --------------------------------------------------------
        // Topbar quick Excel
        // --------------------------------------------------------

        getEl(
            "quickExcelBtn"
        )?.addEventListener(
            "click",
            exportAllExcel
        );


        // --------------------------------------------------------
        // Data page - all Excel
        // --------------------------------------------------------

        getEl(
            "exportAllExcelBtn"
        )?.addEventListener(
            "click",
            exportAllExcel
        );


        // --------------------------------------------------------
        // Data page - orders
        // --------------------------------------------------------

        getEl(
            "exportOrdersBtn"
        )?.addEventListener(
            "click",
            exportOrders
        );


        // --------------------------------------------------------
        // Data page - customers
        // --------------------------------------------------------

        getEl(
            "exportCustomersBtn2"
        )?.addEventListener(
            "click",
            exportCustomers
        );


        // --------------------------------------------------------
        // Data page - stock
        // --------------------------------------------------------

        getEl(
            "exportStockBtn"
        )?.addEventListener(
            "click",
            exportInventory
        );


        // --------------------------------------------------------
        // Data page - workflow
        // --------------------------------------------------------

        getEl(
            "exportWorkflowBtn"
        )?.addEventListener(
            "click",
            exportWorkflow
        );


        // --------------------------------------------------------
        // Orders page - FILTERED
        // --------------------------------------------------------

        getEl(
            "exportFilteredOrdersBtn"
        )?.addEventListener(
            "click",
            exportFilteredOrders
        );


        // --------------------------------------------------------
        // Customers page - FILTERED
        // --------------------------------------------------------

        getEl(
            "exportCustomersBtn"
        )?.addEventListener(
            "click",
            exportFilteredCustomers
        );


        // --------------------------------------------------------
        // Inventory page - FILTERED
        // --------------------------------------------------------

        getEl(
            "exportInventoryBtn"
        )?.addEventListener(
            "click",
            exportFilteredInventory
        );


        // --------------------------------------------------------
        // Movements page - FILTERED
        // --------------------------------------------------------

        getEl(
            "exportMovementsBtn"
        )?.addEventListener(
            "click",
            exportFilteredMovements
        );


        // --------------------------------------------------------
        // Backup
        // --------------------------------------------------------

        getEl(
            "backupJsonBtn"
        )?.addEventListener(
            "click",
            backupJson
        );


        // --------------------------------------------------------
        // Restore
        // --------------------------------------------------------

        getEl(
            "importInput"
        )?.addEventListener(
            "change",
            async (event) => {

                const file =
                    event.target.files?.[0];

                await restoreJson(file);
            }
        );


        // --------------------------------------------------------
        // Data page navigation
        // --------------------------------------------------------

        document.addEventListener(
            "click",
            (event) => {

                const navItem =
                    event.target.closest(
                        "[data-nav]"
                    );

                if (!navItem) {
                    return;
                }


                const target =
                    navItem.dataset.nav;


                if (target === "data") {

                    setTimeout(
                        loadDataHealth,
                        50
                    );
                }
            }
        );


        // --------------------------------------------------------
        // Refresh when data view becomes visible
        // --------------------------------------------------------

        const dataSection =
            getEl("data");


        if (dataSection) {

            const observer =
                new MutationObserver(
                    () => {

                        if (
                            dataSection.classList.contains(
                                "active"
                            )
                        ) {
                            loadDataHealth();
                        }
                    }
                );


            observer.observe(
                dataSection,
                {
                    attributes: true,
                    attributeFilter: [
                        "class"
                    ],
                }
            );
        }
    }


    // ============================================================
    // INITIALIZE
    // ============================================================

    function init() {

        bindEvents();


        const dataSection =
            getEl("data");


        if (
            dataSection &&
            dataSection.classList.contains("active")
        ) {
            loadDataHealth();
        }
    }


    // ============================================================
    // PUBLIC API
    // ============================================================

    window.LinChauData = {
        exportAllExcel,

        // Export toàn bộ
        exportOrders,
        exportCustomers,
        exportInventory,
        exportMovements,
        exportWorkflow,

        // Export danh sách đang lọc
        exportFilteredOrders,
        exportFilteredCustomers,
        exportFilteredInventory,
        exportFilteredMovements,

        // Backup / restore
        backupJson,
        restoreJson,
        loadDataHealth,
    };


    // ============================================================
    // START
    // ============================================================

    if (
        document.readyState === "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            init
        );

    } else {

        init();
    }

})();