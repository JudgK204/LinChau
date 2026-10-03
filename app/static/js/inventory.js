(() => {
    "use strict";

    const App = () => window.LinChauApp;
    let editingItemId = null;

    // =========================================================
    // INVENTORY DATA / PAGINATION
    // =========================================================

    let inventoryData = [];
    let inventoryCurrentPage = 1;
    const INVENTORY_PER_PAGE = 10;
    let inventorySearchKeyword = "";

    function getEl(id) {
        return document.getElementById(id);
    }

    // =========================================================
    // LOAD INVENTORY
    // =========================================================

    async function loadInventory() {
        try {
            // Lấy TOÀN BỘ nguyên liệu.
            // Search + pagination xử lý ở frontend.
            const response = await fetch(
                "/api/inventory",
                {
                    method: "GET",
                    headers: { Accept: "application/json" }
                }
            );

            const result = await response.json();

            if (!response.ok) {
                throw new Error(
                    result.error || `HTTP ${response.status}`
                );
            }

            inventoryData = Array.isArray(result) ? result : [];

            // Giữ lại biến cũ để các phần khác nếu có đang dùng
            window.__inventory = inventoryData;

            // Lấy keyword hiện tại
            inventorySearchKeyword =
                getEl("inventorySearch")?.value?.trim() || "";

            // Nếu trang hiện tại vượt quá tổng số trang
            const filteredItems = getFilteredInventory();
            const totalPages = Math.max(
                1,
                Math.ceil(
                    filteredItems.length / INVENTORY_PER_PAGE
                )
            );

            if (inventoryCurrentPage > totalPages) {
                inventoryCurrentPage = totalPages;
            }

            renderInventory(inventoryData);

        } catch (error) {
            console.error("Inventory error:", error);
            App()?.showToast?.(
                "Không thể tải kho nguyên liệu."
            );
        }
    }

    // =========================================================
    // SEARCH
    // =========================================================

    function getFilteredInventory() {
        const keyword = String(
            inventorySearchKeyword || ""
        )
            .trim()
            .toLowerCase();

        if (!keyword) {
            return inventoryData;
        }

        return inventoryData.filter(item => {
            /*
             * Search toàn bộ các thông tin của nguyên liệu.
             */
            const searchableText = [
                item.id,
                item.name,
                item.category,
                item.unit,
                item.stock,
                item.min_stock,
                item.cost,
                item.low_stock
            ]
                .map(value =>
                    value === null ||
                    value === undefined
                        ? ""
                        : String(value)
                )
                .join(" ")
                .toLowerCase();

            return searchableText.includes(keyword);
        });
    }

    function searchInventory(keyword) {
        inventorySearchKeyword =
            String(keyword || "").trim();

        // Search mới luôn quay về trang 1
        inventoryCurrentPage = 1;

        renderInventory(inventoryData);
    }

    // =========================================================
    // RENDER INVENTORY
    // =========================================================

    function renderInventory(items = inventoryData) {
        const body = getEl("inventoryBody");
        if (!body) return;

        /*
         * Nếu renderInventory được gọi từ bên ngoài,
         * vẫn đồng bộ inventoryData.
         */
        if (items !== inventoryData) {
            inventoryData = Array.isArray(items)
                ? items
                : [];

            window.__inventory = inventoryData;
        }

        const filteredItems = getFilteredInventory();

        const totalRecords = filteredItems.length;

        const totalPages = Math.max(
            1,
            Math.ceil(
                totalRecords / INVENTORY_PER_PAGE
            )
        );

        if (inventoryCurrentPage > totalPages) {
            inventoryCurrentPage = totalPages;
        }

        const startIndex =
            (inventoryCurrentPage - 1) *
            INVENTORY_PER_PAGE;

        const endIndex =
            startIndex + INVENTORY_PER_PAGE;

        const pageItems = filteredItems.slice(
            startIndex,
            endIndex
        );

        if (!pageItems.length) {
            body.innerHTML = `
                <tr>
                    <td colspan="9" class="empty">
                        Chưa có nguyên liệu phù hợp.
                    </td>
                </tr>
            `;

            renderInventoryPagination(
                totalRecords,
                totalPages
            );

            return;
        }

        const { escapeHtml, money } = App();

        body.innerHTML = pageItems.map(item => {
            const stock = Number(item.stock || 0);
            const minStock = Number(
                item.min_stock || 0
            );
            const cost = Number(item.cost || 0);

            const stockValue = stock * cost;

            const lowStock =
                item.low_stock ??
                stock <= minStock;

            return `
                <tr>
                    <td>
                        <strong>
                            ${escapeHtml(item.id)}
                        </strong>
                    </td>

                    <td>
                        ${escapeHtml(item.name)}
                    </td>

                    <td>
                        ${escapeHtml(
                            item.category || ""
                        )}
                    </td>

                    <td>
                        ${stock}
                        ${escapeHtml(
                            item.unit || ""
                        )}
                    </td>

                    <td>
                        ${minStock}
                        ${escapeHtml(
                            item.unit || ""
                        )}
                    </td>

                    <td class="money">
                        ${money(cost)}
                    </td>

                    <td class="money">
                        ${money(stockValue)}
                    </td>

                    <td>
                        ${
                            lowStock
                                ? '<span class="badge danger">Cần nhập</span>'
                                : '<span class="badge">Bình thường</span>'
                        }
                    </td>

                    <td>
                        <div class="row-actions">
                            <button
                                class="mini-btn"
                                data-inventory-edit="${escapeHtml(item.id)}"
                            >
                                Sửa
                            </button>

                            <button
                                class="mini-btn"
                                data-inventory-delete="${escapeHtml(item.id)}"
                            >
                                Xóa
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join("");

        renderInventoryPagination(
            totalRecords,
            totalPages
        );
    }

    // =========================================================
    // PAGINATION
    // =========================================================
    function renderInventoryPagination(
        totalRecords,
        totalPages
    ) {
        const pagination =
            getEl("inventoryPagination");

        if (!pagination) {
            return;
        }

        // Không có dữ liệu
        if (!totalRecords) {
            pagination.innerHTML = "";
            return;
        }

        // =====================================================
        // RECORD RANGE
        // =====================================================

        const startRecord =
            (inventoryCurrentPage - 1) *
            INVENTORY_PER_PAGE +
            1;

        const endRecord =
            Math.min(
                inventoryCurrentPage *
                    INVENTORY_PER_PAGE,
                totalRecords
            );


        // =====================================================
        // PAGE BUTTONS
        // =====================================================

        const pageNumbers =
            getInventoryPageNumbers(
                totalPages,
                inventoryCurrentPage
            );


        const pageButtons = pageNumbers
            .map(page => {

                // Dấu ...
                if (page === "...") {

                    return `
                        <span class="page-dots">
                            ...
                        </span>
                    `;
                }


                return `
                    <button
                        type="button"
                        class="page-btn ${
                            page === inventoryCurrentPage
                                ? "active"
                                : ""
                        }"
                        data-inventory-page="${page}"
                    >
                        ${page}
                    </button>
                `;
            })
            .join("");


        // =====================================================
        // RENDER
        // =====================================================

        pagination.innerHTML = `

            <div class="pagination-info">

                Hiển thị
                <strong>${startRecord}</strong>
                –
                <strong>${endRecord}</strong>
                trong
                <strong>${totalRecords}</strong>
                nguyên liệu

            </div>


            <div class="pagination-buttons">

                <!-- PREVIOUS -->

                <button
                    type="button"
                    class="page-btn"
                    data-inventory-page="${
                        inventoryCurrentPage - 1
                    }"
                    ${
                        inventoryCurrentPage === 1
                            ? "disabled"
                            : ""
                    }
                >
                    ‹
                </button>


                <!-- PAGE NUMBERS -->

                ${pageButtons}


                <!-- NEXT -->

                <button
                    type="button"
                    class="page-btn"
                    data-inventory-page="${
                        inventoryCurrentPage + 1
                    }"
                    ${
                        inventoryCurrentPage === totalPages
                            ? "disabled"
                            : ""
                    }
                >
                    ›
                </button>

            </div>

        `;
    }

    function getInventoryPageNumbers(
        totalPages,
        currentPage
    ) {
        const pages = [];

        if (totalPages <= 7) {
            for (
                let i = 1;
                i <= totalPages;
                i++
            ) {
                pages.push(i);
            }

            return pages;
        }

        pages.push(1);

        if (currentPage > 4) {
            pages.push("...");
        }

        const start = Math.max(
            2,
            currentPage - 1
        );

        const end = Math.min(
            totalPages - 1,
            currentPage + 1
        );

        for (
            let i = start;
            i <= end;
            i++
        ) {
            pages.push(i);
        }

        if (currentPage < totalPages - 3) {
            pages.push("...");
        }

        pages.push(totalPages);

        return pages;
    }

    function changeInventoryPage(page) {
        const filteredItems =
            getFilteredInventory();

        const totalPages = Math.max(
            1,
            Math.ceil(
                filteredItems.length /
                INVENTORY_PER_PAGE
            )
        );

        const newPage = Number(page);

        if (
            !Number.isInteger(newPage) ||
            newPage < 1 ||
            newPage > totalPages
        ) {
            return;
        }

        inventoryCurrentPage = newPage;

        renderInventory(inventoryData);
    }

    // =========================================================
    // INVENTORY FORM
    // =========================================================

    function inventoryForm(item = {}) {
        const { escapeHtml } = App();

        return `
            <div class="form-grid">

                <div class="field">
                    <label>Mã nguyên liệu</label>

                    <input
                        type="text"
                        value="${escapeHtml(
                            item.id || "Tự động"
                        )}"
                        readonly
                    >
                </div>

                <div class="field">
                    <label>Tên nguyên liệu</label>

                    <input
                        type="text"
                        name="name"
                        value="${escapeHtml(
                            item.name || ""
                        )}"
                        required
                    >
                </div>

                <div class="field">
                    <label>Nhóm</label>

                    <input
                        type="text"
                        name="category"
                        value="${escapeHtml(
                            item.category ||
                            "Hoa tươi"
                        )}"
                    >
                </div>

                <div class="field">
                    <label>Đơn vị</label>

                    <input
                        type="text"
                        name="unit"
                        value="${escapeHtml(
                            item.unit || "Cành"
                        )}"
                        required
                    >
                </div>

                <div class="field">
                    <label>Tồn hiện tại</label>

                    <input
                        type="number"
                        name="stock"
                        value="${Number(
                            item.stock || 0
                        )}"
                        min="0"
                        step="0.1"
                        required
                    >
                </div>

                <div class="field">
                    <label>Tồn tối thiểu</label>

                    <input
                        type="number"
                        name="min_stock"
                        value="${Number(
                            item.min_stock || 0
                        )}"
                        min="0"
                        step="0.1"
                        required
                    >
                </div>

                <div class="field">
                    <label>Giá nhập</label>

                    <input
                        type="number"
                        name="cost"
                        value="${Number(
                            item.cost || 0
                        )}"
                        min="0"
                        step="100"
                        required
                    >
                </div>

            </div>
        `;
    }

    // =========================================================
    // OPEN MODAL
    // =========================================================

    async function openInventoryModal(
        itemId = null
    ) {
        editingItemId = itemId;

        let item = {};

        if (itemId) {
            try {
                const response = await fetch(
                    `/api/inventory/${encodeURIComponent(
                        itemId
                    )}`,
                    {
                        headers: {
                            Accept:
                                "application/json"
                        }
                    }
                );

                item = await response.json();

                if (!response.ok) {
                    throw new Error(
                        item.error ||
                        "Không thể tải nguyên liệu."
                    );
                }

            } catch (error) {
                console.error(error);
                alert(error.message);
                return;
            }
        }

        App().openModal(
            itemId
                ? "Cập nhật nguyên liệu"
                : "Thêm nguyên liệu",

            inventoryForm(item),

            async formData => {
                const data =
                    Object.fromEntries(
                        formData.entries()
                    );

                await saveInventory(
                    data,
                    editingItemId
                );
            }
        );
    }

    // =========================================================
    // SAVE INVENTORY
    // =========================================================

    async function saveInventory(
        data,
        itemId = null
    ) {
        const payload = {
            name: String(
                data.name || ""
            ).trim(),

            category: String(
                data.category || ""
            ).trim(),

            unit: String(
                data.unit || ""
            ).trim(),

            stock: Number(
                data.stock || 0
            ),

            min_stock: Number(
                data.min_stock || 0
            ),

            cost: Number(
                data.cost || 0
            )
        };

        try {
            const url = itemId
                ? `/api/inventory/${encodeURIComponent(
                      itemId
                  )}`
                : "/api/inventory";

            const response = await fetch(
                url,
                {
                    method: itemId
                        ? "PUT"
                        : "POST",

                    headers: {
                        "Content-Type":
                            "application/json",

                        Accept:
                            "application/json"
                    },

                    body: JSON.stringify(
                        payload
                    )
                }
            );

            const result =
                await response.json();

            if (!response.ok) {
                throw new Error(
                    result.error ||
                    "Không thể lưu nguyên liệu."
                );
            }

            App().closeModal();

            App().showToast(
                itemId
                    ? "Đã cập nhật nguyên liệu."
                    : "Đã thêm nguyên liệu."
            );

            await loadInventory();
            await App().loadDashboard();

        } catch (error) {
            console.error(
                "Save inventory error:",
                error
            );

            alert(error.message);
        }
    }

    // =========================================================
    // DELETE INVENTORY
    // =========================================================

    async function deleteInventory(
        itemId
    ) {
        if (
            !confirm(
                `Xóa nguyên liệu ${itemId}?`
            )
        ) {
            return;
        }

        try {
            const response = await fetch(
                `/api/inventory/${encodeURIComponent(
                    itemId
                )}`,
                {
                    method: "DELETE",
                    headers: {
                        Accept:
                            "application/json"
                    }
                }
            );

            const result =
                await response.json();

            if (!response.ok) {
                throw new Error(
                    result.error ||
                    "Không thể xóa nguyên liệu."
                );
            }

            App().showToast(
                "Đã xóa nguyên liệu."
            );

            await loadInventory();
            await App().loadDashboard();

        } catch (error) {
            console.error(
                "Delete inventory error:",
                error
            );

            alert(error.message);
        }
    }

    // =========================================================
    // INIT
    // =========================================================

    function initInventory() {
        /*
         * Search client-side.
         * Không gọi API mỗi lần gõ.
         */
        getEl("inventorySearch")
            ?.addEventListener(
                "input",
                event => {
                    searchInventory(
                        event.target.value
                    );
                }
            );

        // New item
        const newItemButton =
            getEl("newItemBtn");

        if (newItemButton) {
            newItemButton.addEventListener(
                "click",
                event => {
                    event.preventDefault();
                    openInventoryModal();
                }
            );
        } else {
            console.warn(
                "LinChau Inventory: #newItemBtn not found."
            );
        }

        // Table actions
        getEl("inventoryBody")
            ?.addEventListener(
                "click",
                event => {
                    const editButton =
                        event.target.closest(
                            "[data-inventory-edit]"
                        );

                    if (editButton) {
                        openInventoryModal(
                            editButton.dataset
                                .inventoryEdit
                        );

                        return;
                    }

                    const deleteButton =
                        event.target.closest(
                            "[data-inventory-delete]"
                        );

                    if (deleteButton) {
                        deleteInventory(
                            deleteButton.dataset
                                .inventoryDelete
                        );
                    }
                }
            );

        // Pagination
        getEl("inventoryPagination")
            ?.addEventListener(
                "click",
                event => {
                    const pageButton =
                        event.target.closest(
                            "[data-inventory-page]"
                        );

                    if (
                        !pageButton ||
                        pageButton.disabled
                    ) {
                        return;
                    }

                    changeInventoryPage(
                        pageButton.dataset
                            .inventoryPage
                    );
                }
            );
    }

    // =========================================================
    // PUBLIC API
    // =========================================================

    window.LinChauInventory = {
        loadInventory,
        renderInventory,
        openInventoryModal,
        searchInventory,
        changeInventoryPage
    };

    // =========================================================
    // DOM READY
    // =========================================================

    if (
        document.readyState ===
        "loading"
    ) {
        document.addEventListener(
            "DOMContentLoaded",
            initInventory,
            { once: true }
        );
    } else {
        initInventory();
    }

})();