
document.addEventListener("DOMContentLoaded", () => {
    "use strict";

    // =========================================
    // 1. CONFIGURATION AND ELEMENTS
    // =========================================

    const STORAGE_KEY = "voucherStudioVouchers";

    const $ = (selector, parent = document) =>
        parent.querySelector(selector);

    const form = $("#voucher-form");
    const createButton = $("#open-create-form");

    const nameInput = $("#voucher-name");
    const typeInput = $("#discount-type");
    const discountInput = $("#discount-value");
    const quantityInput = $("#voucher-quantity");
    const startDateInput = $("#start-date");
    const expiryDateInput = $("#expiry-date");
    const messageElement = $("#form-message");

    const previewDiscount = $("#preview-discount");
    const previewName = $("#preview-name");
    const previewQuantity = $("#preview-quantity");
    const previewValidity = $("#preview-validity");
    const previewCode = $("#preview-code");

    const searchInput = $("#voucher-search");
    const statusFilter = $("#status-filter");
    const tableBody = $("#voucher-table-body");
    const emptyState = $("#empty-state");

    const totalElement = $("#total-vouchers");
    const activeElement = $("#active-vouchers");
    const scheduledElement = $("#scheduled-vouchers");
    const expiredElement = $("#expired-vouchers");

    // =========================================
    // 2. STORAGE
    // =========================================

    function loadVouchers() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);

            if (!saved) return [];

            const data = JSON.parse(saved);

            return Array.isArray(data) ? data : [];
        } catch (error) {
            console.error("Failed to load vouchers:", error);
            return [];
        }
    }

    let vouchers = loadVouchers();

    function saveVouchers() {
        try {
            localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify(vouchers)
            );

            return true;
        } catch (error) {
            console.error("Failed to save vouchers:", error);

            showMessage(
                "Unable to save vouchers. Check browser storage.",
                "error"
            );

            return false;
        }
    }

    // =========================================
    // 3. HELPER FUNCTIONS
    // =========================================

    function getToday() {
        const date = new Date();

        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");

        return `${year}-${month}-${day}`;
    }

    function formatDate(dateString) {
        if (!dateString) return "Not set";

        const [year, month, day] = dateString.split("-");

        return `${day}/${month}/${year}`;
    }

    function escapeHTML(value) {
        return String(value ?? "").replace(
            /[&<>"']/g,
            character => ({
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#39;"
            })[character]
        );
    }

    function generateVoucherCode() {
        const characters = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

        let code;

        do {
            code = "VCH-";

            for (let i = 0; i < 8; i++) {
                code += characters[
                    Math.floor(Math.random() * characters.length)
                ];
            }
        } while (
            vouchers.some(
                voucher =>
                    voucher.code.toLowerCase() === code.toLowerCase()
            )
        );

        return code;
    }

    function getStatus(voucher) {
        const today = getToday();

        if (voucher.expiryDate < today) {
            return "Expired";
        }

        if (voucher.startDate > today) {
            return "Scheduled";
        }

        return "Active";
    }

    function formatDiscount(voucher) {
        const amount = Number(voucher.discount);

        if (voucher.discountType === "fixed") {
            return `${amount.toLocaleString()} MMK`;
        }

        return `${amount}%`;
    }

    function showMessage(message, type = "success") {
        messageElement.textContent = message;
        messageElement.dataset.type = type;

        messageElement.style.color =
            type === "error"
                ? "#ff7c9c"
                : "#55d6a0";

        messageElement.style.display = message ? "block" : "none";
    }

    // =========================================
    // 4. DISCOUNT INPUT SETTINGS
    // =========================================

    function updateDiscountSettings() {
        const isPercentage = typeInput.value === "percentage";
        const hint = $("#discount-hint");

        if (isPercentage) {
            discountInput.max = "100";

            if (hint) {
                hint.textContent =
                    "Enter a percentage from 1 to 100.";
            }
        } else {
            discountInput.removeAttribute("max");

            if (hint) {
                hint.textContent =
                    "Enter a fixed discount amount in MMK.";
            }
        }

        updatePreview();
    }

    typeInput.addEventListener("change", updateDiscountSettings);

    // =========================================
    // 5. LIVE PREVIEW
    // =========================================

    function updatePreview() {
        const name = nameInput.value.trim();
        const discount = Number(discountInput.value) || 0;
        const quantity = Number(quantityInput.value) || 0;
        const startDate = startDateInput.value;
        const expiryDate = expiryDateInput.value;

        if (typeInput.value === "fixed") {
            previewDiscount.textContent =
                `${discount.toLocaleString()} MMK OFF`;
        } else {
            previewDiscount.textContent = `${discount}% OFF`;
        }

        previewName.textContent = name || "Your Voucher Name";

        previewQuantity.textContent = `Quantity: ${quantity}`;

        if (startDate && expiryDate) {
            previewValidity.textContent =
                `Valid: ${formatDate(startDate)} - ${formatDate(expiryDate)}`;
        } else if (startDate) {
            previewValidity.textContent =
                `Starts: ${formatDate(startDate)}`;
        } else if (expiryDate) {
            previewValidity.textContent =
                `Expires: ${formatDate(expiryDate)}`;
        } else {
            previewValidity.textContent =
                "Validity: Select your dates";
        }
    }

    [
        nameInput,
        typeInput,
        discountInput,
        quantityInput,
        startDateInput,
        expiryDateInput
    ].forEach(element => {
        element.addEventListener("input", updatePreview);
        element.addEventListener("change", updatePreview);
    });

    // =========================================
    // 6. DATE VALIDATION
    // =========================================

    function updateDateLimits() {
        expiryDateInput.min = startDateInput.value || getToday();

        if (
            expiryDateInput.value &&
            startDateInput.value &&
            expiryDateInput.value < startDateInput.value
        ) {
            expiryDateInput.setCustomValidity(
                "Expiry date cannot be before the start date."
            );
        } else {
            expiryDateInput.setCustomValidity("");
        }
    }

    startDateInput.addEventListener("change", updateDateLimits);

    expiryDateInput.addEventListener("change", updateDateLimits);

    // =========================================
    // 7. VALIDATION
    // =========================================

    function validateVoucher() {
        if (!form.checkValidity()) {
            form.reportValidity();
            return false;
        }

        const discount = Number(discountInput.value);
        const quantity = Number(quantityInput.value);

        if (!Number.isFinite(discount) || discount <= 0) {
            showMessage(
                "Please enter a discount greater than zero.",
                "error"
            );
            discountInput.focus();
            return false;
        }

        if (
            typeInput.value === "percentage" &&
            discount > 100
        ) {
            showMessage(
                "Percentage discount cannot exceed 100%.",
                "error"
            );
            discountInput.focus();
            return false;
        }

        if (
            !Number.isInteger(quantity) ||
            quantity < 1 ||
            quantity > 500
        ) {
            showMessage(
                "Quantity must be between 1 and 500.",
                "error"
            );
            quantityInput.focus();
            return false;
        }

        if (expiryDateInput.value < startDateInput.value) {
            showMessage(
                "Expiry date cannot be before the start date.",
                "error"
            );
            expiryDateInput.focus();
            return false;
        }

        return true;
    }

    // =========================================
    // 8. CREATE VOUCHER
    // =========================================

    function createVoucher(event) {
        event.preventDefault();

        showMessage("");

        if (!validateVoucher()) return;

        const voucher = {
            id: (
                typeof crypto !== "undefined" &&
                typeof crypto.randomUUID === "function"
            )
                ? crypto.randomUUID()
                : `${Date.now()}-${Math.random().toString(36).slice(2)}`,

            name: nameInput.value.trim(),
            code: generateVoucherCode(),
            discountType: typeInput.value,
            discount: Number(discountInput.value),
            quantity: Number(quantityInput.value),
            startDate: startDateInput.value,
            expiryDate: expiryDateInput.value,
            createdAt: new Date().toISOString()
        };

        vouchers.unshift(voucher);

        if (!saveVouchers()) {
            vouchers.shift();
            return;
        }

        renderVouchers();
        updateDashboard();

        previewCode.textContent = `Voucher Code: ${voucher.code}`;

        showMessage("Voucher created successfully!", "success");

        form.reset();

        startDateInput.value = getToday();
        expiryDateInput.min = getToday();

        updateDiscountSettings();
        updateDateLimits();
        updatePreview();

        showSection("voucher-list");
    }

    form.addEventListener("submit", createVoucher);

    // =========================================
    // 9. CLEAR FORM
    // =========================================

    form.addEventListener("reset", () => {
        setTimeout(() => {
            showMessage("");

            startDateInput.value = getToday();
            expiryDateInput.min = getToday();

            updateDateLimits();
            updateDiscountSettings();
            updatePreview();

            previewCode.textContent =
                "Code will be generated when saved";
        }, 0);
    });

    // =========================================
    // 10. RENDER VOUCHER TABLE
    // =========================================

    function renderVouchers() {
        const searchTerm = searchInput.value.trim().toLowerCase();
        const selectedStatus = statusFilter.value.toLowerCase();

        const filtered = vouchers.filter(voucher => {
            const matchesSearch =
                voucher.name.toLowerCase().includes(searchTerm) ||
                voucher.code.toLowerCase().includes(searchTerm);

            const status = getStatus(voucher).toLowerCase();

            const matchesStatus =
                selectedStatus === "all" ||
                status === selectedStatus;

            return matchesSearch && matchesStatus;
        });

        emptyState.style.display =
            filtered.length === 0 ? "block" : "none";

        tableBody.innerHTML = filtered.map(voucher => {
            const status = getStatus(voucher);
            const statusClass = status.toLowerCase();

            return `
                <tr>
                    <td>${escapeHTML(voucher.name)}</td>

                    <td>${escapeHTML(voucher.code)}</td>

                    <td>${escapeHTML(formatDiscount(voucher))}</td>

                    <td>${escapeHTML(voucher.quantity)}</td>

                    <td>${escapeHTML(formatDate(voucher.expiryDate))}</td>

                    <td>
                        <span class="status-badge ${statusClass}">
                            ${escapeHTML(status)}
                        </span>

                        <button
                            type="button"
                            class="secondary-button"
                            data-delete-id="${escapeHTML(voucher.id)}"
                            aria-label="Delete ${escapeHTML(voucher.name)}"
                        >
                            Delete
                        </button>
                    </td>
                </tr>
            `;
        }).join("");
    }

    searchInput.addEventListener("input", renderVouchers);
    statusFilter.addEventListener("change", renderVouchers);

    // =========================================
    // 11. DELETE VOUCHER
    // =========================================

    tableBody.addEventListener("click", event => {
        const button = event.target.closest("[data-delete-id]");

        if (!button) return;

        const id = button.dataset.deleteId;

        const voucher = vouchers.find(
            item => String(item.id) === String(id)
        );

        if (!voucher) return;

        if (!window.confirm(`Delete "${voucher.name}"?`)) {
            return;
        }

        const previousVouchers = vouchers;

        vouchers = vouchers.filter(
            item => String(item.id) !== String(id)
        );

        if (!saveVouchers()) {
            vouchers = previousVouchers;
            return;
        }

        renderVouchers();
        updateDashboard();
        showMessage("Voucher deleted successfully.", "success");
    });

    // =========================================
    // 12. DASHBOARD STATISTICS
    // =========================================

    function updateDashboard() {
        const total = vouchers.length;

        const active = vouchers.filter(
            voucher => getStatus(voucher) === "Active"
        ).length;

        const scheduled = vouchers.filter(
            voucher => getStatus(voucher) === "Scheduled"
        ).length;

        const expired = vouchers.filter(
            voucher => getStatus(voucher) === "Expired"
        ).length;

        totalElement.textContent = total;
        activeElement.textContent = active;
        scheduledElement.textContent = scheduled;
        expiredElement.textContent = expired;
    }

    // =========================================
    // 13. SIDEBAR NAVIGATION
    // =========================================

    const dashboard = $("#dashboard");
    const createSection = $("#create-voucher");
    const voucherListSection = $("#voucher-list");
    const navLinks = document.querySelectorAll(".sidebar-nav .nav-link");

    function showSection(sectionId) {
        const sections = [
            dashboard,
            createSection,
            voucherListSection
        ];

        sections.forEach(section => {
            if (section) {
                section.style.display =
                    section.id === sectionId ? "block" : "none";
            }
        });

        navLinks.forEach(link => {
            const target = link.getAttribute("href").slice(1);

            link.classList.toggle("active", target === sectionId);
        });

        if (sectionId === "voucher-list") {
            renderVouchers();
        }
    }

    navLinks.forEach(link => {
        link.addEventListener("click", event => {
            event.preventDefault();

            const sectionId = link.getAttribute("href").slice(1);

            showSection(sectionId);
        });
    });

    createButton.addEventListener("click", () => {
        showSection("create-voucher");
        nameInput.focus();
    });

    // =========================================
    // 14. INITIALIZE APPLICATION
    // =========================================

    startDateInput.value = getToday();
    expiryDateInput.min = getToday();

    updateDiscountSettings();
    updateDateLimits();
    updatePreview();

    renderVouchers();
    updateDashboard();

    showSection("dashboard");
});
