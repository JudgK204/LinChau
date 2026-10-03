(() => {
    "use strict";

    const App = () => window.LinChauApp;

    const WORKFLOW_STATUSES = [
        "Chờ xác nhận",
        "Đã xác nhận",
        "Đang chuẩn bị",
        "Đang làm",
        "Đã hoàn thành",
        "Đang giao",
        "Đã giao",
        "Hủy"
    ];

    function getEl(id) {
        return document.getElementById(id);
    }

    function sortOrders(a, b) {
        const dateA = String(a.delivery_date || "");
        const timeA = String(a.delivery_time || "");

        const dateB = String(b.delivery_date || "");
        const timeB = String(b.delivery_time || "");

        return `${dateA}${timeA}`.localeCompare(
            `${dateB}${timeB}`
        );
    }

    async function loadWorkflow() {
        const board = getEl("workflowBoard");

        if (!board) {
            return;
        }

        board.innerHTML = `
            <div class="empty">
                Đang tải dữ liệu...
            </div>
        `;

        try {
            const response = await fetch(
                "/api/orders",
                {
                    method: "GET",
                    headers: {
                        Accept: "application/json"
                    }
                }
            );

            const result = await response.json();

            if (!response.ok) {
                throw new Error(
                    result.error ||
                    `HTTP ${response.status}`
                );
            }

            const orders = Array.isArray(result)
                ? result
                : [];

            window.__workflowOrders = orders;

            renderWorkflow(orders);

        } catch (error) {
            console.error(
                "Workflow error:",
                error
            );

            board.innerHTML = `
                <div class="empty">
                    Không thể tải dữ liệu sản xuất & giao.
                </div>
            `;

            App()?.showToast?.(
                "Không thể tải dữ liệu Workflow."
            );
        }
    }

    function renderWorkflow(orders) {
        const board = getEl("workflowBoard");

        if (!board) {
            return;
        }

        const {
            escapeHtml
        } = App();

        const searchInput =
            getEl("workflowOrderSearch");

        const keyword =
            searchInput?.value
                ?.trim()
                .toLowerCase() || "";

        // =====================================================
        // SEARCH MÃ ĐƠN - SEARCH TẤT CẢ TRẠNG THÁI
        // =====================================================

        let filteredOrders = Array.isArray(orders)
            ? [...orders]
            : [];

        if (keyword) {
            filteredOrders =
                filteredOrders.filter(order =>
                    String(order.id || "")
                        .toLowerCase()
                        .includes(keyword)
                );
        }

        // =====================================================
        // RENDER CÁC TRẠNG THÁI
        // =====================================================

        board.innerHTML =
            WORKFLOW_STATUSES.map(status => {

                const rows = filteredOrders
                    .filter(order =>
                        order.status === status
                    )
                    .sort(sortOrders);

                return `
                    <div class="workflow-col">

                        <h3>
                            <span>
                                ${escapeHtml(status)}
                            </span>

                            <span>
                                ${rows.length}
                            </span>
                        </h3>

                        <div class="workflow-orders-list">

                            ${
                                rows.length
                                    ? rows
                                        .map(renderWorkflowCard)
                                        .join("")
                                    : `
                                        <div class="empty">
                                            ${
                                                keyword
                                                    ? "Không tìm thấy đơn"
                                                    : "Trống"
                                            }
                                        </div>
                                    `
                            }

                        </div>

                    </div>
                `;
            }).join("");
    }

    function renderWorkflowCard(order) {
        const {
            escapeHtml,
            formatDateVN,
            money
        } = App();

        const customerName =
            order.customer_name || "Khách lẻ";

        const customerPhone =
            order.customer_phone || "";

        const recipient =
            order.recipient || "Chưa có tên";

        const recipientPhone =
            order.recipient_phone || "";

        const deliveryDate =
            order.delivery_date
                ? formatDateVN(order.delivery_date)
                : "Chưa có ngày";

        const deliveryTime =
            order.delivery_time
                ? String(order.delivery_time).slice(0, 5)
                : "";

        return `
            <div
                class="workflow-card"
                data-workflow-order="${escapeHtml(order.id)}"
            >

                <!-- Phần luôn hiển thị -->
                <div class="workflow-card-summary">

                    <strong class="workflow-order-title">
                        ${escapeHtml(order.id)}
                        ·
                        ${escapeHtml(order.product || "")}
                    </strong>

                    <!-- Thanh trạng thái dùng để thay đổi trạng thái -->
                    <select
                        class="workflow-status-select"
                        data-workflow-order="${escapeHtml(order.id)}"
                    >
                        ${WORKFLOW_STATUSES.map(status => `
                            <option
                                value="${escapeHtml(status)}"
                                ${status === order.status ? "selected" : ""}
                            >
                                ${escapeHtml(status)}
                            </option>
                        `).join("")}
                    </select>

                </div>


                <!-- Chi tiết: mặc định đóng -->
                <div class="workflow-card-detail">

                    <p>

                        <strong>Khách đặt:</strong>
                        ${escapeHtml(customerName)}

                        ${
                            customerPhone
                                ? ` · ${escapeHtml(customerPhone)}`
                                : ""
                        }

                        <br>

                        <strong>Người nhận:</strong>
                        ${escapeHtml(recipient)}

                        ${
                            recipientPhone
                                ? ` · ${escapeHtml(recipientPhone)}`
                                : ""
                        }

                        <br>

                        <strong>Giao:</strong>
                        ${escapeHtml(deliveryDate)}

                        ${
                            deliveryTime
                                ? ` · ${escapeHtml(deliveryTime)}`
                                : ""
                        }

                        <br>

                        <strong>Địa chỉ:</strong>
                        ${escapeHtml(order.address || "")}

                        <br>

                        <strong>Thực tế phải thu:</strong>
                        <span class="money">
                            ${money(order.balance)}
                        </span>

                    </p>

                </div>

            </div>
        `;
    }

    async function updateWorkflowStatus(orderId, newStatus) {
        if (!orderId || !newStatus) {
            return;
        }

        try {
            const response = await fetch(
                `/api/orders/${encodeURIComponent(orderId)}/status`,
                {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                        Accept: "application/json"
                    },
                    body: JSON.stringify({
                        status: newStatus
                    })
                }
            );

            const result = await response.json();

            if (!response.ok) {
                throw new Error(
                    result.error ||
                    "Không thể cập nhật trạng thái."
                );
            }

            App()?.showToast?.(
                `Đã chuyển ${orderId} → ${newStatus}.`
            );

            await loadWorkflow();
            await App()?.loadDashboard?.();

        } catch (error) {
            console.error(
                "Update workflow status error:",
                error
            );

            alert(error.message);

            // Nếu cập nhật thất bại,
            // tải lại để select quay về trạng thái thật trong DB.
            await loadWorkflow();
        }
    }
    function initWorkflow() {
        loadWorkflow();

        const board = getEl("workflowBoard");
        const searchInput =
            getEl("workflowOrderSearch");

        searchInput?.addEventListener(
            "input",
            () => {
                renderWorkflow(
                    window.__workflowOrders || []
                );
            }
        );
        board?.addEventListener("change", event => {
            const select = event.target.closest(
                ".workflow-status-select"
            );

            if (!select) {
                return;
            }

            const orderId =
                select.dataset.workflowOrder;

            const newStatus =
                select.value;

            updateWorkflowStatus(
                orderId,
                newStatus
            );
        });
        board?.addEventListener("click", event => {

            // Nếu click vào dropdown thì không toggle card
            if (
                event.target.closest(
                    ".workflow-status-select"
                )
            ) {
                return;
            }

            const summary =
                event.target.closest(
                    ".workflow-card-summary"
                );

            if (!summary) {
                return;
            }

            const card =
                summary.closest(
                    ".workflow-card"
                );

            if (!card) {
                return;
            }

            card.classList.toggle("expanded");
        });
    }

    window.LinChauWorkflow = {
        loadWorkflow,
        renderWorkflow,
        WORKFLOW_STATUSES
    };

    if (document.readyState === "loading") {
        document.addEventListener(
            "DOMContentLoaded",
            initWorkflow,
            { once: true }
        );
    } else {
        initWorkflow();
    }

})();