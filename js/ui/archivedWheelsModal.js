import {
    formatClosedDate,
    getWheelSerialSummary,
    isWheelArchived,
    normalizeOperationalStatus,
    normalizeWheelType,
    restoreArchivedWheel
} from "../domain/wheelModel.js";

let archivedWheelsModal = null;
let deleteArchivedModal = null;
let getWheels = null;
let onArchiveMutate = null;
let currentArchivedFilter = "all";
let pendingDeleteIndex = null;
let allArchivedEntries = [];

function formatArchiveDate(archivedAt) {

    if (!archivedAt) {
        return "-";
    }

    const date = new Date(archivedAt);

    if (Number.isNaN(date.getTime())) {
        return archivedAt;
    }

    return date.toLocaleDateString("es-EC");
}

export function getArchivedWheelEntries(wheels) {

    return wheels
        .map((wheel, index) => ({ wheel, index }))
        .filter(({ wheel }) => isWheelArchived(wheel))
        .sort((entryA, entryB) => {

            const archivedAtA = entryA.wheel.archivedAt;
            const archivedAtB = entryB.wheel.archivedAt;

            return new Date(archivedAtB || 0) - new Date(archivedAtA || 0);
        });
}

function filterArchivedEntries(entries, filter) {

    if (filter === "all") {
        return entries;
    }

    return entries.filter(({ wheel }) =>
        normalizeWheelType(wheel.wheelType) === filter
    );
}

function renderArchivedWheelCard({ wheel, index }) {

    const serialSummary = getWheelSerialSummary(wheel);
    const closedAt = normalizeOperationalStatus(wheel.operationalStatus).closedAt;

    return `
        <div class="processed-history-row archived-wheel-row">

            <div class="processed-history-content">

                <div class="processed-history-main">

                    <strong class="processed-history-number">
                        #${wheel.numeroRueda || "-"}
                    </strong>

                    <span class="processed-history-serial">
                        S/N ${serialSummary}
                    </span>

                </div>

                <div class="processed-history-meta">

                    <span>Fecha cierre: ${formatClosedDate(closedAt)}</span>
                    <span>Fecha archivo: ${formatArchiveDate(wheel.archivedAt)}</span>

                </div>

            </div>

            <div class="processed-history-actions">

                <button
                    type="button"
                    class="processed-history-action-btn"
                    title="Ver detalle"
                    onclick="showWheelDetail(${index})">

                    👁

                </button>

                <button
                    type="button"
                    class="processed-history-action-btn"
                    title="Restaurar rueda"
                    onclick="openRestoreArchivedWheel(${index})">

                    ♻

                </button>

                <button
                    type="button"
                    class="processed-history-action-btn processed-history-action-delete"
                    title="Eliminar definitivamente"
                    onclick="openDeleteArchivedWheelModal(${index})">

                    ❌

                </button>

            </div>

        </div>
    `;
}

function renderArchivedModalList(entries) {

    const listContainer = document.getElementById("archivedWheelsModalList");

    if (!listContainer) {
        return;
    }

    if (entries.length === 0) {

        listContainer.innerHTML = `
            <p class="processed-history-empty mb-0">
                No hay ruedas archivadas con este filtro.
            </p>
        `;

        return;
    }

    listContainer.innerHTML = entries
        .map((entry) => renderArchivedWheelCard(entry))
        .join("");
}

function syncArchivedFilterButtons() {

    document.querySelectorAll("[data-archived-filter]").forEach((button) => {

        const isActive = button.dataset.archivedFilter === currentArchivedFilter;

        button.classList.toggle("active", isActive);
        button.setAttribute("aria-pressed", isActive ? "true" : "false");
    });
}

export function renderArchivedWheelsSummary(wheels) {

    const summaryCard = document.getElementById("archivedWheelsSummaryCard");

    if (!summaryCard) {
        return;
    }

    const archivedCount = getArchivedWheelEntries(wheels).length;

    summaryCard.innerHTML = `
        <h3 class="summary-title mb-1">Papelera histórica</h3>

        <p class="summary-text mb-0">
            ${archivedCount} rueda(s) archivada(s)
        </p>
    `;
}

export function openArchivedWheelsModal(wheels) {

    const modalElement = document.getElementById("archivedWheelsModal");

    if (!modalElement) {
        return;
    }

    allArchivedEntries = getArchivedWheelEntries(wheels);
    currentArchivedFilter = "all";
    syncArchivedFilterButtons();
    renderArchivedModalList(allArchivedEntries);

    if (!archivedWheelsModal) {
        archivedWheelsModal = new bootstrap.Modal(modalElement);
    }

    archivedWheelsModal.show();
}

function restoreArchivedWheelByIndex(index) {

    const wheels = typeof getWheels === "function" ? getWheels() : [];
    const wheel = wheels[index];

    if (!wheel || typeof onArchiveMutate !== "function") {
        return;
    }

    onArchiveMutate(index, restoreArchivedWheel(wheel));
}

function confirmPermanentDelete() {

    if (pendingDeleteIndex === null || typeof onArchiveMutate !== "function") {
        return;
    }

    onArchiveMutate(pendingDeleteIndex, null, true);
    pendingDeleteIndex = null;
    deleteArchivedModal?.hide();
}

export function openRestoreArchivedWheel(index) {

    restoreArchivedWheelByIndex(index);
}

export function openDeleteArchivedWheelModal(index) {

    const modalElement = document.getElementById("deleteArchivedWheelModal");

    if (!modalElement) {
        return;
    }

    pendingDeleteIndex = index;

    if (!deleteArchivedModal) {
        deleteArchivedModal = new bootstrap.Modal(modalElement);
    }

    deleteArchivedModal.show();
}

function bindArchivedSummaryCard() {

    const summaryCard = document.getElementById("archivedWheelsSummaryCard");

    if (!summaryCard) {
        return;
    }

    const openModal = () => {

        openArchivedWheelsModal(typeof getWheels === "function" ? getWheels() : []);
    };

    summaryCard.addEventListener("click", openModal);

    summaryCard.addEventListener("keydown", (event) => {

        if (event.key === "Enter" || event.key === " ") {

            event.preventDefault();
            openModal();
        }
    });
}

function bindArchivedFilterEvents() {

    document.querySelectorAll("[data-archived-filter]").forEach((button) => {

        button.addEventListener("click", () => {

            currentArchivedFilter = button.dataset.archivedFilter || "all";
            syncArchivedFilterButtons();
            renderArchivedModalList(
                filterArchivedEntries(allArchivedEntries, currentArchivedFilter)
            );
        });
    });
}

export function initializeArchivedWheelsModal(getWheelsFn, onMutate) {

    if (typeof getWheelsFn !== "function") {
        return;
    }

    getWheels = getWheelsFn;
    onArchiveMutate = onMutate;

    const modalElement = document.getElementById("archivedWheelsModal");

    if (modalElement && !archivedWheelsModal) {
        archivedWheelsModal = new bootstrap.Modal(modalElement);
    }

    const deleteModalElement = document.getElementById("deleteArchivedWheelModal");

    if (deleteModalElement && !deleteArchivedModal) {
        deleteArchivedModal = new bootstrap.Modal(deleteModalElement);
    }

    bindArchivedSummaryCard();
    bindArchivedFilterEvents();

    document.getElementById("btnConfirmDeleteArchivedWheel")
        ?.addEventListener("click", confirmPermanentDelete);

    window.openArchivedWheelsModal = () => {
        openArchivedWheelsModal(getWheels());
    };

    window.openRestoreArchivedWheel = openRestoreArchivedWheel;
    window.openDeleteArchivedWheelModal = openDeleteArchivedWheelModal;
}

export function refreshArchivedWheelsModal() {

    if (!getWheels) {
        return;
    }

    const wheels = getWheels();

    allArchivedEntries = getArchivedWheelEntries(wheels);
    renderArchivedWheelsSummary(wheels);

    const modalElement = document.getElementById("archivedWheelsModal");

    if (modalElement?.classList.contains("show")) {
        renderArchivedModalList(
            filterArchivedEntries(allArchivedEntries, currentArchivedFilter)
        );
    }
}
