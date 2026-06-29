import {
    buildWorkshopBoxStates,
    formatUsageFriendlyLabel,
    formatUsageLabel,
    getBoxDetailSnapshot
} from "../domain/boxResourceModel.js";
import { TOTAL_BOXES } from "../domain/wheelModel.js";

let getWheels = null;
let boxDetailModal = null;
let boxResourcesModal = null;
let currentBoxFilter = "all";

function renderOccupiedBoxCard(boxState) {

    const { boxId, boxEntry, progressData, reference, currentStage } = boxState;

    return `
        <div class="col-lg-3 col-md-4 col-sm-6">

            <button
                type="button"
                class="box-resource-card box-resource-card-occupied box-resource-state-${progressData.visualState}"
                data-box-id="${boxId}">

                <span class="box-resource-title">CAJA #${boxId}</span>

                <span class="box-resource-usage">
                    Uso: ${formatUsageLabel(boxEntry.usage)}
                </span>

                <span class="box-resource-wheel">
                    Rueda: ${reference.wheelNumber}
                </span>

                <span class="box-resource-serial">
                    ${reference.serialLabel}
                </span>

                <span class="box-resource-status">
                    ${progressData.visualIcon} ${currentStage}
                </span>

                <span class="box-resource-progress">
                    Avance: ${progressData.progress}%
                </span>

            </button>

        </div>
    `;
}

function renderAvailableBoxCard(boxState) {

    const { boxId, lastUsage } = boxState;
    const lastUsageLabel = lastUsage
        ? formatUsageFriendlyLabel(lastUsage)
        : "Sin registro";

    return `
        <div class="col-lg-3 col-md-4 col-sm-6">

            <button
                type="button"
                class="box-resource-card box-resource-card-available"
                data-box-id="${boxId}">

                <span class="box-resource-title">CAJA #${boxId}</span>

                <span class="box-resource-available-label">DISPONIBLE</span>

                <span class="box-resource-last-usage">
                    Último uso: ${lastUsageLabel}
                </span>

                <span class="box-resource-status">
                    ⚪ Libre
                </span>

            </button>

        </div>
    `;
}

function getNextReleaseBox(boxStates) {

    const occupiedStates = boxStates
        .filter((boxState) => !boxState.isAvailable)
        .sort((stateA, stateB) =>
            stateB.progressData.progress - stateA.progressData.progress
        );

    return occupiedStates[0] ?? null;
}

function renderSummaryContent(boxStates) {

    const occupiedCount = boxStates.filter((boxState) => !boxState.isAvailable).length;
    const availableCount = TOTAL_BOXES - occupiedCount;
    const nextRelease = getNextReleaseBox(boxStates);

    const nextReleaseHtml = nextRelease
        ? `
            <div class="box-resources-next-release">
                <span class="box-resources-next-release-label">Próxima liberación:</span>
                <strong>CAJA #${nextRelease.boxId}</strong>
                <span>${nextRelease.reference.serialLabel}</span>
                <span>${nextRelease.currentStage}</span>
                <span>${nextRelease.progressData.progress}%</span>
            </div>
        `
        : `
            <div class="box-resources-next-release">
                <span class="box-resources-next-release-label">Próxima liberación:</span>
                <span>Sin cajas ocupadas</span>
            </div>
        `;

    return `
        <h3 class="summary-title mb-1">Cajas en uso</h3>

        <p class="summary-text mb-3">
            Estado operativo actual de las cajas del taller.
        </p>

        <div class="box-resources-summary-metrics">
            <div class="box-resources-summary-metric">
                <span class="box-resources-summary-value">${TOTAL_BOXES}</span>
                <span class="box-resources-summary-label">cajas totales</span>
            </div>
            <div class="box-resources-summary-metric">
                <span class="box-resources-summary-value">${occupiedCount}</span>
                <span class="box-resources-summary-label">ocupadas</span>
            </div>
            <div class="box-resources-summary-metric">
                <span class="box-resources-summary-value">${availableCount}</span>
                <span class="box-resources-summary-label">disponibles</span>
            </div>
        </div>

        ${nextReleaseHtml}
    `;
}

function filterBoxStates(boxStates, filter) {

    if (filter === "occupied") {
        return boxStates.filter((boxState) => !boxState.isAvailable);
    }

    if (filter === "available") {
        return boxStates.filter((boxState) => boxState.isAvailable);
    }

    return boxStates;
}

function renderModalGrid(boxStates) {

    const grid = document.getElementById("boxResourcesModalGrid");

    if (!grid) {
        return;
    }

    const filteredStates = filterBoxStates(boxStates, currentBoxFilter);

    grid.innerHTML = filteredStates.map((boxState) =>
        boxState.isAvailable
            ? renderAvailableBoxCard(boxState)
            : renderOccupiedBoxCard(boxState)
    ).join("");
}

function syncFilterButtons() {

    document.querySelectorAll("[data-box-filter]").forEach((button) => {

        const isActive = button.dataset.boxFilter === currentBoxFilter;

        button.classList.toggle("active", isActive);
        button.setAttribute("aria-pressed", isActive ? "true" : "false");
    });
}

export function renderBoxesInUse(wheels) {

    const summaryCard = document.getElementById("boxResourcesSummaryCard");

    if (!summaryCard) {
        return;
    }

    const boxStates = buildWorkshopBoxStates(wheels);

    summaryCard.innerHTML = renderSummaryContent(boxStates);

    const modalElement = document.getElementById("boxResourcesModal");

    if (modalElement?.classList.contains("show")) {
        renderModalGrid(boxStates);
    }
}

export function openBoxResourcesModal() {

    const modalElement = document.getElementById("boxResourcesModal");
    const wheels = typeof getWheels === "function" ? getWheels() : [];

    if (!modalElement) {
        return;
    }

    currentBoxFilter = "all";
    syncFilterButtons();
    renderModalGrid(buildWorkshopBoxStates(wheels));

    if (!boxResourcesModal) {
        boxResourcesModal = new bootstrap.Modal(modalElement);
    }

    boxResourcesModal.show();
}

function openBoxDetailModal(boxId) {

    const wheels = typeof getWheels === "function" ? getWheels() : [];
    const snapshot = getBoxDetailSnapshot(wheels, boxId);
    const modalElement = document.getElementById("boxResourceDetailModal");
    const contentElement = document.getElementById("boxResourceDetailContent");
    const titleElement = document.getElementById("boxResourceDetailTitle");

    if (!snapshot || !modalElement || !contentElement || !titleElement) {
        return;
    }

    titleElement.textContent = `CAJA #${snapshot.boxId}`;

    if (snapshot.isAvailable) {

        contentElement.innerHTML = `
            <dl class="box-detail-list">
                <div class="box-detail-item">
                    <dt>Estado:</dt>
                    <dd>DISPONIBLE</dd>
                </div>
                <div class="box-detail-item">
                    <dt>Último uso:</dt>
                    <dd>${snapshot.lastUsage}</dd>
                </div>
                <div class="box-detail-item">
                    <dt>Estado operativo:</dt>
                    <dd>⚪ Libre</dd>
                </div>
            </dl>
        `;

    } else {

        contentElement.innerHTML = `
            <dl class="box-detail-list">
                <div class="box-detail-item">
                    <dt>Rueda:</dt>
                    <dd>${snapshot.reference.wheelNumber}</dd>
                </div>
                <div class="box-detail-item">
                    <dt>S/N:</dt>
                    <dd>${snapshot.reference.serialLabel.replace("S/N ", "")}</dd>
                </div>
                <div class="box-detail-item">
                    <dt>Uso:</dt>
                    <dd>${snapshot.usage}</dd>
                </div>
                <div class="box-detail-item">
                    <dt>Etapa actual:</dt>
                    <dd>${snapshot.currentStage}</dd>
                </div>
                <div class="box-detail-item">
                    <dt>Subetapa actual:</dt>
                    <dd>${snapshot.currentSubstage}</dd>
                </div>
                <div class="box-detail-item">
                    <dt>Avance:</dt>
                    <dd>${snapshot.progress}%</dd>
                </div>
                <div class="box-detail-item">
                    <dt>Estado:</dt>
                    <dd>${snapshot.statusLabel}</dd>
                </div>
            </dl>
        `;
    }

    if (!boxDetailModal) {
        boxDetailModal = new bootstrap.Modal(modalElement);
    }

    boxDetailModal.show();
}

function bindBoxesGridEvents() {

    const grid = document.getElementById("boxResourcesModalGrid");

    if (!grid) {
        return;
    }

    grid.addEventListener("click", (event) => {

        const card = event.target.closest("[data-box-id]");

        if (!card) {
            return;
        }

        openBoxDetailModal(Number(card.dataset.boxId));
    });
}

function bindFilterEvents() {

    document.querySelectorAll("[data-box-filter]").forEach((button) => {

        button.addEventListener("click", () => {

            currentBoxFilter = button.dataset.boxFilter || "all";
            syncFilterButtons();

            const wheels = typeof getWheels === "function" ? getWheels() : [];

            renderModalGrid(buildWorkshopBoxStates(wheels));
        });
    });
}

function bindSummaryCard() {

    const summaryCard = document.getElementById("boxResourcesSummaryCard");

    if (!summaryCard) {
        return;
    }

    const openModal = () => {
        openBoxResourcesModal();
    };

    summaryCard.addEventListener("click", openModal);

    summaryCard.addEventListener("keydown", (event) => {

        if (event.key === "Enter" || event.key === " ") {

            event.preventDefault();
            openModal();
        }
    });
}

export function initializeBoxResourceView(getWheelsFn) {

    if (typeof getWheelsFn !== "function") {
        return;
    }

    getWheels = getWheelsFn;

    const modalElement = document.getElementById("boxResourcesModal");

    if (modalElement && !boxResourcesModal) {
        boxResourcesModal = new bootstrap.Modal(modalElement);
    }

    bindSummaryCard();
    bindBoxesGridEvents();
    bindFilterEvents();

    window.openBoxResourcesModal = openBoxResourcesModal;
}
