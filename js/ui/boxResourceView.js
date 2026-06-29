import {
    buildWorkshopBoxStates,
    formatUsageFriendlyLabel,
    formatUsageLabel,
    formatWheelOperationalReference,
    getBoxDetailSnapshot,
    hasAssignedBoxes
} from "../domain/boxResourceModel.js";

let getWheels = null;
let boxDetailModal = null;

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

function renderUnassignedLegacyNotice() {

    return `
        <div class="col-12">
            <p class="box-resource-empty mb-0">
                Sin cajas asignadas
            </p>
        </div>
    `;
}

export function renderBoxesInUse(wheels) {

    const grid = document.getElementById("workshopBoxesGrid");

    if (!grid) {
        return;
    }

    const activeWheels = wheels.filter((wheel) => !wheel.operationalStatus ||
        wheel.operationalStatus.active !== false);
    const hasAnyAssignments = activeWheels.some((wheel) => hasAssignedBoxes(wheel));

    if (!hasAnyAssignments) {

        grid.innerHTML = renderUnassignedLegacyNotice();

        return;
    }

    const boxStates = buildWorkshopBoxStates(wheels);
    const occupiedStates = boxStates.filter((boxState) => !boxState.isAvailable);
    const availableStates = boxStates.filter((boxState) => boxState.isAvailable);
    const visibleStates = [...occupiedStates, ...availableStates];

    grid.innerHTML = visibleStates.map((boxState) =>
        boxState.isAvailable
            ? renderAvailableBoxCard(boxState)
            : renderOccupiedBoxCard(boxState)
    ).join("");
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

    const grid = document.getElementById("workshopBoxesGrid");

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

export function initializeBoxResourceView(getWheelsFn) {

    if (typeof getWheelsFn !== "function") {
        return;
    }

    getWheels = getWheelsFn;

    bindBoxesGridEvents();
}
