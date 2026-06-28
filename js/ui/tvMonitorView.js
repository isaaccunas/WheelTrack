import {
    getCurrentStage,
    getCurrentStageSubstages,
    normalizeProcessState,
    normalizeStageTiming,
    PROCESS_STAGES
} from "../domain/processModel.js";
import {
    formatBoxLabel,
    getWheelSerialSummary,
    getWheelTypeLabel,
    hasInspectorData,
    hasValidTireAssignment,
    isCriticalSubstageBlocked,
    isWheelActive,
    normalizeInspectorData,
    normalizePressureData,
    normalizeTireAssignment,
    normalizeWheelType
} from "../domain/wheelModel.js";

const TV_ROTATION_MS = 8000;

let tvRotationTimer = null;
let tvCurrentIndex = 0;
let tvActiveEntries = [];
let tvGetWheels = null;

// ==========================================
// CONSULTAS
// ==========================================

export function getTvActiveWheelEntries(wheels) {

    return wheels
        .map((wheel, index) => ({ wheel, index }))
        .filter(({ wheel }) => isWheelActive(wheel));
}

function getTimelineNodeClass(status) {

    const classes = {
        "Pendiente": "tv-timeline-node-pending",
        "En proceso": "tv-timeline-node-active",
        "Completada": "tv-timeline-node-completed",
        "Bloqueada": "tv-timeline-node-blocked"
    };

    return classes[status] || "tv-timeline-node-pending";
}

function getTimelineConnectorClass(status) {

    return status === "Completada"
        ? "tv-timeline-connector-completed"
        : "tv-timeline-connector-pending";
}

function getTimelineNodeIcon(status) {

    const icons = {
        "Pendiente": "fa-regular fa-circle",
        "En proceso": "fa-solid fa-gear",
        "Completada": "fa-solid fa-check",
        "Bloqueada": "fa-solid fa-ban"
    };

    return icons[status] || "fa-regular fa-circle";
}

function renderTireAssignedLabel(wheel) {

    const tireAssignment = normalizeTireAssignment(wheel.tireAssignment);

    if (!hasValidTireAssignment(tireAssignment)) {
        return "NO ASIGNADO";
    }

    return `S/N ${tireAssignment.serial || "-"} | P/N ${tireAssignment.partNumber || "-"}`;
}

function renderInitialPressureLabel(wheel) {

    const pressureData = normalizePressureData(wheel.pressureData);

    if (pressureData.initialPressure === null) {
        return "Sin registrar";
    }

    const dateText = pressureData.initialPressureDate
        ? ` (${pressureData.initialPressureDate})`
        : "";

    return `${pressureData.initialPressure} psi${dateText}`;
}

function renderInspectorLabel(wheel) {

    const inspectorData = normalizeInspectorData(wheel.inspectorData);

    if (!hasInspectorData(inspectorData)) {
        return "Sin registrar";
    }

    const dateText = inspectorData.attendedDate
        ? ` | Atención: ${inspectorData.attendedDate}`
        : "";

    return `${inspectorData.inspectorName || "-"}${dateText}`;
}

function formatTvSubstageTime(isoDate) {

    if (!isoDate) {
        return "—";
    }

    const date = new Date(isoDate);

    if (Number.isNaN(date.getTime())) {
        return "—";
    }

    return date.toLocaleTimeString("es-EC", {
        hour: "2-digit",
        minute: "2-digit"
    });
}

function getTvSubstageDisplayState(wheel, stageName, substages, substage, index) {

    if (substage.completed) {

        return {
            statusLabel: "Completada",
            statusClass: "tv-substage-completed",
            time: "—",
            operator: "—"
        };
    }

    if (isCriticalSubstageBlocked(wheel, stageName, substage.name)) {

        return {
            statusLabel: "Bloqueada",
            statusClass: "tv-substage-blocked",
            time: "—",
            operator: "—"
        };
    }

    const firstIncompleteIndex = substages.findIndex((item) => !item.completed);

    if (index === firstIncompleteIndex) {

        const stageTiming = normalizeStageTiming(wheel.stageTiming);
        const stageEntry = stageTiming.find((entry) => entry.stage === stageName);

        return {
            statusLabel: "En proceso",
            statusClass: "tv-substage-active",
            time: formatTvSubstageTime(stageEntry?.startedAt),
            operator: "—"
        };
    }

    return {
        statusLabel: "Pendiente",
        statusClass: "tv-substage-pending",
        time: "—",
        operator: "—"
    };
}

function renderTvSubstagesPanel(wheel) {

    const activeStage = getCurrentStage(wheel.process);
    const substages = getCurrentStageSubstages(wheel.process);

    if (!activeStage || substages.length === 0) {

        return `
            <section class="tv-substages-panel">

                <h3 class="tv-substages-title">Subetapas de la etapa actual</h3>

                <p class="tv-substages-empty">Sin subetapas activas.</p>

            </section>
        `;
    }

    const substageItems = substages.map((substage, index) => {

        const displayState = getTvSubstageDisplayState(
            wheel,
            activeStage,
            substages,
            substage,
            index
        );

        return `
            <div class="tv-substage-item ${displayState.statusClass}">

                <span class="tv-substage-name">
                    ${substage.name}
                </span>

                <span class="tv-substage-status">
                    ${displayState.statusLabel}
                </span>

                <span class="tv-substage-time">
                    ${displayState.time}
                </span>

                <span class="tv-substage-operator">
                    ${displayState.operator}
                </span>

            </div>
        `;
    }).join("");

    return `
        <section class="tv-substages-panel">

            <h3 class="tv-substages-title">Subetapas de la etapa actual</h3>

            <div class="tv-substages-header">
                <span>Subetapa</span>
                <span>Estado</span>
                <span>Hora</span>
                <span>Operador</span>
            </div>

            <div class="tv-substages-list">
                ${substageItems}
            </div>

        </section>
    `;
}

function renderTvTimeline(wheel) {

    const process = normalizeProcessState(wheel.process);

    const steps = PROCESS_STAGES.map((stageName, index) => {

        const stageState = process.stages.find(
            (stage) => stage.stage === stageName
        ) ?? {
            stage: stageName,
            status: "Pendiente"
        };

        const isLast = index === PROCESS_STAGES.length - 1;

        return `
            <div class="tv-timeline-step">

                <div class="tv-timeline-step-top">

                    <div class="tv-timeline-node ${getTimelineNodeClass(stageState.status)}">
                        <i class="${getTimelineNodeIcon(stageState.status)}"></i>
                    </div>

                    ${isLast ? "" : `
                        <div class="tv-timeline-connector ${getTimelineConnectorClass(stageState.status)}"></div>
                    `}

                </div>

                <div class="tv-timeline-step-body">

                    <span class="tv-timeline-stage-name">${stageState.stage}</span>

                    <span class="tv-timeline-stage-status">${stageState.status}</span>

                </div>

            </div>
        `;
    }).join("");

    return `
        <div class="tv-timeline-track">
            ${steps}
        </div>
    `;
}

function renderTvWheelContent({ wheel, index }, position, total) {

    const wheelType = normalizeWheelType(wheel.wheelType);
    const currentStage = getCurrentStage(wheel.process) || "Sin etapa activa";
    const tireLabel = renderTireAssignedLabel(wheel);

    return `
        <div class="tv-monitor-slide">

            <section class="tv-priority-zone">

                <div class="tv-priority-header">

                    <span class="tv-priority-badge">
                        Rueda ${position} de ${total}
                    </span>

                    <span class="tv-priority-stage">
                        Etapa actual: ${currentStage}
                    </span>

                </div>

                <div class="tv-priority-identity-row">

                    <article class="tv-priority-card tv-priority-card-main">

                        <span class="tv-priority-label">Número de rueda</span>

                        <strong class="tv-priority-value tv-priority-value-xl">
                            ${wheel.numeroRueda || "-"}
                        </strong>

                    </article>

                    <article class="tv-priority-card tv-priority-card-serial">

                        <span class="tv-priority-label">Serial Number (S/N)</span>

                        <strong class="tv-priority-value">
                            ${getWheelSerialSummary(wheel)}
                        </strong>

                    </article>

                    <article class="tv-priority-card tv-priority-card-aircraft">

                        <span class="tv-priority-label">Aeronave</span>

                        <strong class="tv-priority-value">
                            ${wheel.avion || "-"}
                        </strong>

                    </article>

                </div>

                <div class="tv-priority-grid">

                    <article class="tv-priority-card tv-priority-card-type-${wheelType.toLowerCase()}">

                        <span class="tv-priority-label">Tipo de rueda</span>

                        <strong class="tv-priority-value">
                            ${getWheelTypeLabel(wheel.wheelType)}
                        </strong>

                    </article>

                    <article class="tv-priority-card tv-priority-card-box">

                        <span class="tv-priority-label">Caja asignada</span>

                        <strong class="tv-priority-value">
                            ${formatBoxLabel(wheel.boxData)}
                        </strong>

                    </article>

                    <article class="tv-priority-card">

                        <span class="tv-priority-label">Tire Change</span>

                        <strong class="tv-priority-value">
                            ${wheel.tireChange || "-"}
                        </strong>

                    </article>

                    <article class="tv-priority-card tv-priority-card-tire ${tireLabel === "NO ASIGNADO" ? "tv-priority-card-warning" : ""}">

                        <span class="tv-priority-label">Caucho asignado</span>

                        <strong class="tv-priority-value">
                            ${tireLabel}
                        </strong>

                    </article>

                </div>

            </section>

            <section class="tv-secondary-zone">

                <div class="tv-secondary-flow-column">

                    <div class="tv-secondary-block tv-secondary-timeline">

                        <h3 class="tv-secondary-title">Proceso del taller</h3>

                        ${renderTvTimeline(wheel)}

                    </div>

                    ${renderTvSubstagesPanel(wheel)}

                </div>

                <div class="tv-secondary-details">

                    <article class="tv-secondary-card">

                        <span class="tv-secondary-label">Presión inicial</span>

                        <strong class="tv-secondary-value">
                            ${renderInitialPressureLabel(wheel)}
                        </strong>

                    </article>

                    <article class="tv-secondary-card">

                        <span class="tv-secondary-label">Inspector</span>

                        <strong class="tv-secondary-value">
                            ${renderInspectorLabel(wheel)}
                        </strong>

                    </article>

                </div>

            </section>

        </div>
    `;
}

function renderTvEmptyState() {

    return `
        <div class="tv-monitor-empty">

            <i class="fa-solid fa-tv tv-monitor-empty-icon"></i>

            <h2>Sin ruedas activas</h2>

            <p>No hay ruedas en proceso para mostrar en el monitor TV.</p>

        </div>
    `;
}

function renderCurrentTvSlide() {

    const content = document.getElementById("tvMonitorContent");
    const footer = document.getElementById("tvMonitorFooter");

    if (!content) {
        return;
    }

    if (tvActiveEntries.length === 0) {

        content.innerHTML = renderTvEmptyState();

        if (footer) {
            footer.textContent = "WheelTrack · Monitor TV";
        }

        return;
    }

    if (tvCurrentIndex >= tvActiveEntries.length) {
        tvCurrentIndex = 0;
    }

    const entry = tvActiveEntries[tvCurrentIndex];

    content.innerHTML = renderTvWheelContent(
        entry,
        tvCurrentIndex + 1,
        tvActiveEntries.length
    );

    if (footer) {

        footer.textContent =
            `WheelTrack · Rueda ${tvCurrentIndex + 1} de ${tvActiveEntries.length} · Rotación cada 8 s`;
    }
}

function stopTvRotation() {

    if (tvRotationTimer) {

        clearInterval(tvRotationTimer);
        tvRotationTimer = null;
    }
}

function startTvRotation() {

    stopTvRotation();

    tvRotationTimer = setInterval(() => {

        if (!tvGetWheels) {
            return;
        }

        tvActiveEntries = getTvActiveWheelEntries(tvGetWheels());

        if (tvActiveEntries.length === 0) {

            tvCurrentIndex = 0;
            renderCurrentTvSlide();

            return;
        }

        tvCurrentIndex = (tvCurrentIndex + 1) % tvActiveEntries.length;

        renderCurrentTvSlide();

    }, TV_ROTATION_MS);
}

function isTvMonitorOpen() {

    const overlay = document.getElementById("tvMonitorOverlay");

    return overlay && !overlay.classList.contains("d-none");
}

// ==========================================
// CONTROL DEL MODO TV
// ==========================================

export function openTvMonitor(getWheels) {

    const overlay = document.getElementById("tvMonitorOverlay");

    if (!overlay || typeof getWheels !== "function") {
        return;
    }

    tvGetWheels = getWheels;
    tvActiveEntries = getTvActiveWheelEntries(getWheels());
    tvCurrentIndex = 0;

    overlay.classList.remove("d-none");
    document.body.classList.add("tv-monitor-open");

    renderCurrentTvSlide();
    startTvRotation();

    if (overlay.requestFullscreen) {

        overlay.requestFullscreen().catch(() => {});
    }
}

export function closeTvMonitor() {

    const overlay = document.getElementById("tvMonitorOverlay");

    stopTvRotation();
    tvGetWheels = null;
    tvActiveEntries = [];
    tvCurrentIndex = 0;

    if (overlay) {
        overlay.classList.add("d-none");
    }

    document.body.classList.remove("tv-monitor-open");

    if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
    }
}

export function refreshTvMonitorIfOpen(wheels) {

    if (!isTvMonitorOpen()) {
        return;
    }

    tvActiveEntries = getTvActiveWheelEntries(wheels);

    if (tvCurrentIndex >= tvActiveEntries.length) {
        tvCurrentIndex = 0;
    }

    renderCurrentTvSlide();
}

export function initializeTvMonitor(getWheels) {

    const openButton = document.getElementById("openTvMonitorBtn");
    const closeButton = document.getElementById("closeTvMonitorBtn");
    const overlay = document.getElementById("tvMonitorOverlay");

    if (openButton) {

        openButton.addEventListener("click", () => {

            openTvMonitor(getWheels);
        });
    }

    if (closeButton) {

        closeButton.addEventListener("click", () => {

            closeTvMonitor();
        });
    }

    document.addEventListener("keydown", (event) => {

        if (event.key === "Escape" && isTvMonitorOpen()) {
            closeTvMonitor();
        }
    });

    if (overlay) {

        overlay.addEventListener("click", (event) => {

            if (event.target === overlay) {
                closeTvMonitor();
            }
        });
    }
}
