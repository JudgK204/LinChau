(() => {
    "use strict";

    const App = () => window.LinChauApp;

    function getEl(id) {
        return document.getElementById(id);
    }

    // =========================================================
    // HELPERS
    // =========================================================

    function typeLabel(type) {
        return {
            in: "Nhập kho",
            out: "Xuất kho",
            waste: "Hao hụt / hỏng"
        }[type] || type || "";
    }


    // =========================================================
    // DATA / PAGINATION
    // =========================================================

    let movementsData = [];

    let movementsCurrentPage = 1;

    const MOVEMENTS_PER_PAGE = 10;

    let movementsSearchKeyword = "";

    let movementsTypeFilter = "";


    // =========================================================
    // FILTER
    // =========================================================

    function getFilteredMovements() {

        const keyword =
            String(
                movementsSearchKeyword || ""
            )
                .trim()
                .toLowerCase();

        const type =
            String(
                movementsTypeFilter || ""
            )
                .trim()
                .toLowerCase();


        return movementsData.filter(row => {

            // =================================================
            // FILTER TYPE
            // =================================================

            if (
                type &&
                String(row.type || "")
                    .toLowerCase() !== type
            ) {
                return false;
            }


            // =================================================
            // SEARCH
            // =================================================

            if (!keyword) {
                return true;
            }


            /*
             * Search toàn bộ thông tin của biến động kho.
             */

            const searchableText = [

                row.id,

                row.movement_date,

                typeLabel(row.type),

                row.type,

                row.item_id,

                row.item_name,

                row.unit,

                row.qty,

                row.unit_cost,

                Number(row.qty || 0) *
                    Number(row.unit_cost || 0),

                row.note

            ]
                .filter(
                    value =>
                        value !== null &&
                        value !== undefined
                )
                .join(" ")
                .toLowerCase();


            return searchableText.includes(
                keyword
            );
        });
    }


    // =========================================================
    // LOAD MOVEMENTS
    // =========================================================

    async function loadMovements() {

        try {

            /*
             * Lấy TOÀN BỘ biến động kho.
             *
             * Search + filter + pagination
             * được xử lý ở frontend.
             */

            const response =
                await fetch(
                    "/api/movements",
                    {
                        method: "GET",
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
                    `HTTP ${response.status}`
                );
            }


            movementsData =
                Array.isArray(result)
                    ? result
                    : [];


            // Giữ biến cũ để module khác có thể sử dụng
            window.__movements =
                movementsData;


            // Lấy filter hiện tại từ giao diện
            movementsSearchKeyword =
                getEl(
                    "movementSearch"
                )?.value?.trim() || "";


            movementsTypeFilter =
                getEl(
                    "movementTypeFilter"
                )?.value || "";


            // =================================================
            // CHECK CURRENT PAGE
            // =================================================

            const filteredMovements =
                getFilteredMovements();


            const totalPages =
                Math.max(
                    1,
                    Math.ceil(
                        filteredMovements.length /
                        MOVEMENTS_PER_PAGE
                    )
                );


            if (
                movementsCurrentPage >
                totalPages
            ) {

                movementsCurrentPage =
                    totalPages;
            }


            renderMovements();


        } catch (error) {

            console.error(
                "Movements error:",
                error
            );


            App()?.showToast?.(
                "Không thể tải biến động kho."
            );
        }
    }


    // =========================================================
    // RENDER MOVEMENTS
    // =========================================================

    function renderMovements() {

        const body =
            getEl(
                "movementsBody"
            );


        if (!body) {
            return;
        }


        const filteredMovements =
            getFilteredMovements();


        const totalRecords =
            filteredMovements.length;


        const totalPages =
            Math.max(
                1,
                Math.ceil(
                    totalRecords /
                    MOVEMENTS_PER_PAGE
                )
            );


        // Nếu đang ở trang không tồn tại
        if (
            movementsCurrentPage >
            totalPages
        ) {

            movementsCurrentPage =
                totalPages;
        }


        // =================================================
        // CURRENT PAGE
        // =================================================

        const startIndex =
            (
                movementsCurrentPage - 1
            ) *
            MOVEMENTS_PER_PAGE;


        const endIndex =
            startIndex +
            MOVEMENTS_PER_PAGE;


        const pageRows =
            filteredMovements.slice(
                startIndex,
                endIndex
            );


        // =================================================
        // EMPTY
        // =================================================

        if (!pageRows.length) {

            body.innerHTML = `
                <tr>
                    <td
                        colspan="9"
                        class="empty"
                    >
                        ${
                            movementsSearchKeyword ||
                            movementsTypeFilter
                                ? "Chưa có biến động kho phù hợp."
                                : "Chưa có biến động kho."
                        }
                    </td>
                </tr>
            `;


            renderMovementsPagination(
                totalRecords,
                totalPages
            );


            return;
        }


        const {
            escapeHtml,
            money,
            formatDateVN
        } = App();


        // =================================================
        // ROWS
        // =================================================

        body.innerHTML =
            pageRows
                .map(row => `

                    <tr>

                        <td>
                            ${formatDateVN(
                                row.movement_date
                            )}
                        </td>


                        <td>
                            <strong>
                                ${escapeHtml(
                                    row.id
                                )}
                            </strong>
                        </td>


                        <td>
                            ${escapeHtml(
                                typeLabel(
                                    row.type
                                )
                            )}
                        </td>


                        <td>
                            ${escapeHtml(
                                row.item_id
                            )}
                        </td>


                        <td>
                            ${escapeHtml(
                                row.item_name || ""
                            )}
                        </td>


                        <td>
                            ${Number(
                                row.qty || 0
                            )}
                            ${escapeHtml(
                                row.unit || ""
                            )}
                        </td>


                        <td class="money">
                            ${money(
                                row.unit_cost
                            )}
                        </td>


                        <td class="money">
                            ${money(
                                Number(
                                    row.qty || 0
                                ) *
                                Number(
                                    row.unit_cost || 0
                                )
                            )}
                        </td>


                        <td>
                            ${escapeHtml(
                                row.note || ""
                            )}
                        </td>

                    </tr>

                `)
                .join("");


        // =================================================
        // PAGINATION
        // =================================================

        renderMovementsPagination(
            totalRecords,
            totalPages
        );
    }


    // =========================================================
    // PAGINATION
    // =========================================================

    function renderMovementsPagination(
        totalRecords,
        totalPages
    ) {

        const pagination =
            getEl(
                "movementsPagination"
            );


        if (!pagination) {
            return;
        }


        // Không có dữ liệu
        if (!totalRecords) {

            pagination.innerHTML = "";

            return;
        }


        // =================================================
        // RECORD RANGE
        // =================================================

        const startRecord =
            (
                movementsCurrentPage - 1
            ) *
            MOVEMENTS_PER_PAGE +
            1;


        const endRecord =
            Math.min(
                movementsCurrentPage *
                    MOVEMENTS_PER_PAGE,
                totalRecords
            );


        // =================================================
        // PAGE BUTTONS
        // =================================================

        const pageNumbers =
            getMovementPageNumbers(
                totalPages,
                movementsCurrentPage
            );


        const pageButtons =
            pageNumbers
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
                                page ===
                                movementsCurrentPage
                                    ? "active"
                                    : ""
                            }"
                            data-movement-page="${page}"
                        >
                            ${page}
                        </button>
                    `;
                })
                .join("");


        // =================================================
        // RENDER
        // =================================================

        pagination.innerHTML = `

            <div class="pagination-info">

                Hiển thị
                <strong>
                    ${startRecord}
                </strong>
                –
                <strong>
                    ${endRecord}
                </strong>
                trong
                <strong>
                    ${totalRecords}
                </strong>
                biến động kho

            </div>


            <div class="pagination-buttons">

                <!-- PREVIOUS -->

                <button
                    type="button"
                    class="page-btn"
                    data-movement-page="${
                        movementsCurrentPage - 1
                    }"
                    ${
                        movementsCurrentPage === 1
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
                    data-movement-page="${
                        movementsCurrentPage + 1
                    }"
                    ${
                        movementsCurrentPage === totalPages
                            ? "disabled"
                            : ""
                    }
                >
                    ›
                </button>

            </div>

        `;
    }


    // =========================================================
    // PAGE NUMBERS
    // =========================================================

    function getMovementPageNumbers(
        totalPages,
        currentPage
    ) {

        const pages = [];


        // <= 7 trang thì hiển thị hết
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


        if (
            currentPage > 4
        ) {

            pages.push("...");
        }


        const start =
            Math.max(
                2,
                currentPage - 1
            );


        const end =
            Math.min(
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


        if (
            currentPage <
            totalPages - 3
        ) {

            pages.push("...");
        }


        pages.push(
            totalPages
        );


        return pages;
    }


    // =========================================================
    // CHANGE PAGE
    // =========================================================

    function changeMovementPage(
        page
    ) {

        const filteredMovements =
            getFilteredMovements();


        const totalPages =
            Math.max(
                1,
                Math.ceil(
                    filteredMovements.length /
                    MOVEMENTS_PER_PAGE
                )
            );


        const newPage =
            Number(page);


        if (
            !Number.isInteger(newPage) ||
            newPage < 1 ||
            newPage > totalPages
        ) {

            return;
        }


        movementsCurrentPage =
            newPage;


        renderMovements();


        // Cuộn nhẹ về đầu bảng
        getEl("movementsBody")
            ?.closest(".table-wrap")
            ?.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });
    }


    // =========================================================
    // SEARCH
    // =========================================================

    function searchMovements(
        keyword
    ) {

        movementsSearchKeyword =
            String(
                keyword || ""
            ).trim();


        // Search mới → trang 1
        movementsCurrentPage = 1;


        renderMovements();
    }


    // =========================================================
    // TYPE FILTER
    // =========================================================

    function filterMovementType(
        type
    ) {

        movementsTypeFilter =
            String(
                type || ""
            ).trim();


        // Filter mới → trang 1
        movementsCurrentPage = 1;


        renderMovements();
    }


    // =========================================================
    // MOVEMENT MODAL
    // =========================================================

    async function openMovementModal() {

        let inventory =
            window.__inventory;


        if (!Array.isArray(inventory)) {

            try {

                const response =
                    await fetch(
                        "/api/inventory",
                        {
                            headers: {
                                Accept:
                                    "application/json"
                            }
                        }
                    );


                inventory =
                    await response.json();


                if (!response.ok) {

                    throw new Error(
                        inventory.error ||
                        "Không thể tải kho."
                    );
                }


                window.__inventory =
                    inventory;


            } catch (error) {

                console.error(error);

                alert(
                    error.message
                );

                return;
            }
        }


        if (!inventory.length) {

            alert(
                "Chưa có nguyên liệu. Hãy thêm nguyên liệu trước."
            );

            return;
        }


        const {
            escapeHtml,
            todayISO
        } = App();


        const options =
            inventory
                .map(item => `

                    <option
                        value="${escapeHtml(
                            item.id
                        )}"
                    >
                        ${escapeHtml(
                            `${item.id} - ${item.name} (${Number(
                                item.stock || 0
                            )} ${item.unit || ""})`
                        )}
                    </option>

                `)
                .join("");


        App().openModal(

            "Nhập / xuất kho",

            `

                <div class="form-grid">

                    <div class="field full">

                        <label>
                            Nguyên liệu
                        </label>

                        <select
                            name="item_id"
                            required
                        >
                            ${options}
                        </select>

                    </div>


                    <div class="field">

                        <label>
                            Loại giao dịch
                        </label>

                        <select
                            name="type"
                            required
                        >

                            <option value="in">
                                Nhập kho
                            </option>

                            <option value="out">
                                Xuất kho
                            </option>

                            <option value="waste">
                                Hao hụt / hỏng
                            </option>

                        </select>

                    </div>


                    <div class="field">

                        <label>
                            Số lượng
                        </label>

                        <input
                            type="number"
                            name="qty"
                            value="1"
                            min="0.001"
                            step="any"
                            required
                        >

                    </div>


                    <div class="field">

                        <label>
                            Ngày
                        </label>

                        <input
                            type="date"
                            name="movement_date"
                            value="${todayISO()}"
                            required
                        >

                    </div>


                    <div class="field">

                        <label>
                            Đơn giá tham chiếu
                        </label>

                        <input
                            type="number"
                            name="unit_cost"
                            value="0"
                            min="0"
                            step="100"
                        >

                    </div>


                    <div class="field full">

                        <label>
                            Ghi chú
                        </label>

                        <textarea
                            name="note"
                        ></textarea>

                    </div>

                </div>

            `,

            async formData => {

                const data =
                    Object.fromEntries(
                        formData.entries()
                    );


                await saveMovement(
                    data
                );
            }
        );


        const form =
            getEl(
                "modalForm"
            );


        const itemSelect =
            form?.elements.item_id;


        const costInput =
            form?.elements.unit_cost;


        const syncCost = () => {

            const item =
                window.__inventory?.find(
                    x =>
                        x.id ===
                        itemSelect?.value
                );


            if (
                item &&
                costInput &&
                !Number(
                    costInput.value
                )
            ) {

                costInput.value =
                    Number(
                        item.cost || 0
                    );
            }
        };


        itemSelect?.addEventListener(
            "change",
            () => {

                if (costInput) {

                    costInput.value = "";
                }


                syncCost();
            }
        );


        syncCost();
    }


    // =========================================================
    // SAVE MOVEMENT
    // =========================================================

    async function saveMovement(
        data
    ) {

        const payload = {

            item_id:
                String(
                    data.item_id || ""
                ).trim(),

            type:
                String(
                    data.type || ""
                ).trim(),

            qty:
                Number(
                    data.qty || 0
                ),

            movement_date:
                data.movement_date ||
                null,

            unit_cost:
                Number(
                    data.unit_cost || 0
                ),

            note:
                String(
                    data.note || ""
                ).trim()
        };


        if (
            !Number.isFinite(
                payload.qty
            ) ||
            payload.qty <= 0
        ) {

            alert(
                "Số lượng phải lớn hơn 0."
            );

            return;
        }


        try {

            const response =
                await fetch(
                    "/api/movements",
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json",

                            Accept:
                                "application/json"
                        },

                        body:
                            JSON.stringify(
                                payload
                            )
                    }
                );


            const result =
                await response.json();


            if (!response.ok) {

                throw new Error(
                    result.error ||
                    "Không thể ghi biến động kho."
                );
            }


            App().closeModal();


            App().showToast(
                "Đã ghi biến động kho."
            );


            // Server đã cập nhật tồn kho
            await window
                .LinChauInventory
                ?.loadInventory
                ?.();


            await loadMovements();


            await App()
                .loadDashboard();


        } catch (error) {

            console.error(
                "Save movement error:",
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

    getEl(
        "movementSearch"
    )?.addEventListener(
        "input",
        event => {

            searchMovements(
                event.target.value
            );
        }
    );


    getEl(
        "movementTypeFilter"
    )?.addEventListener(
        "change",
        event => {

            filterMovementType(
                event.target.value
            );
        }
    );


    getEl(
        "movementBtn"
    )?.addEventListener(
        "click",
        openMovementModal
    );


    getEl(
        "movementBtn2"
    )?.addEventListener(
        "click",
        openMovementModal
    );


    // =========================================================
    // PAGINATION CLICK
    // =========================================================

    getEl(
        "movementsPagination"
    )?.addEventListener(
        "click",
        event => {

            const pageButton =
                event.target.closest(
                    "[data-movement-page]"
                );


            if (
                !pageButton ||
                pageButton.disabled
            ) {

                return;
            }


            changeMovementPage(
                pageButton.dataset
                    .movementPage
            );
        }
    );


    // =========================================================
    // PUBLIC API
    // =========================================================

    window.LinChauMovements = {

        loadMovements,

        renderMovements,

        openMovementModal,

        searchMovements,

        changeMovementPage

    };

})();