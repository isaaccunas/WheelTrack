import { formatDurationMinutes } from "../domain/kpiCalculator.js";
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
    hasServiceableData,
    hasValidTireAssignment,
    isCriticalSubstageBlocked,
    isWheelActive,
    normalizeInspectorData,
    normalizePressureData,
    normalizeServiceableData,
    normalizeTireAssignment,
    normalizeWheelType
} from "../domain/wheelModel.js";

const TV_ROTATION_MS = 8000;

let tvRotationTimer = null;
let tvCurrentIndex = 0;
let tvActiveEntries = [];
let tvGetWheels = null;
let tvContentEventsBound = false;

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

function formatTvDateTime(isoDate) {

    if (!isoDate) {
        return null;
    }

    const date = new Date(isoDate);

    if (Number.isNaN(date.getTime())) {
        return isoDate;
    }

    return date.toLocaleString("es-EC", {
        dateStyle: "short",
        timeStyle: "short"
    });
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

function calculateElapsedMinutes(startedAt, finishedAt = null) {

    if (!startedAt) {
        return null;
    }

    const start = new Date(startedAt);

    if (Number.isNaN(start.getTime())) {
        return null;
    }

    const end = finishedAt ? new Date(finishedAt) : new Date();

    if (Number.isNaN(end.getTime())) {
        return null;
    }

    return Math.max(0, Math.round((end - start) / 60000));
}

function getCurrentStageTimingInfo(wheel) {

    const currentStage = getCurrentStage(wheel.process);

    if (!currentStage) {
        return { minutes: null, startedAt: null };
    }

    const stageEntry = normalizeStageTiming(wheel.stageTiming).find(
        (entry) => entry.stage === currentStage
    );

    if (!stageEntry) {
        return { minutes: null, startedAt: null };
    }

    const minutes = stageEntry.durationMinutes !== null
        ? stageEntry.durationMinutes
        : calculateElapsedMinutes(stageEntry.startedAt, stageEntry.finishedAt);

    return {
        minutes,
        startedAt: stageEntry.startedAt
    };
}

function getTotalWorkshopTimingInfo(wheel) {

    const stageTiming = normalizeStageTiming(wheel.stageTiming);
    let total = 0;
    let hasData = false;
    let workshopStartedAt = null;

    stageTiming.forEach((entry) => {

        if (!workshopStartedAt && entry.startedAt) {
            workshopStartedAt = entry.startedAt;
        }

        if (entry.durationMinutes !== null) {

            total += entry.durationMinutes;
            hasData = true;

            return;
        }

        if (entry.startedAt) {

            const elapsed = calculateElapsedMinutes(entry.startedAt, entry.finishedAt);

            if (elapsed !== null) {

                total += elapsed;
                hasData = true;
            }
        }
    });

    return {
        minutes: hasData ? total : null,
        startedAt: workshopStartedAt ?? wheel.fechaIngreso ?? null
    };
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

function renderTvCompactHeaderItem(label, value, extraClass = "") {

    return `
        <div class="tv-compact-header-item ${extraClass}">

            <span class="tv-compact-header-label">${label}</span>

            <strong class="tv-compact-header-value">${value}</strong>

        </div>
    `;
}

function renderTvCompactHeader(wheel) {

    const wheelType = normalizeWheelType(wheel.wheelType);
    const tireLabel = renderTireAssignedLabel(wheel);
    const tireWarningClass = tireLabel === "NO ASIGNADO"
        ? "tv-compact-header-item-warning"
        : "";

    return `
        <header class="tv-compact-header">

            ${renderTvCompactHeaderItem(
                "N° Rueda",
                wheel.numeroRueda || "-",
                "tv-compact-header-item-wheel"
            )}

            ${renderTvCompactHeaderItem(
                "S/N",
                getWheelSerialSummary(wheel)
            )}

            ${renderTvCompactHeaderItem(
                "Aeronave",
                wheel.avion || "-"
            )}

            ${renderTvCompactHeaderItem(
                "Tipo",
                getWheelTypeLabel(wheel.wheelType),
                `tv-compact-header-item-type-${wheelType.toLowerCase()}`
            )}

            ${renderTvCompactHeaderItem(
                "Caja",
                formatBoxLabel(wheel.boxData)
            )}

            ${renderTvCompactHeaderItem(
                "Tire Change",
                wheel.tireChange || "-"
            )}

            ${renderTvCompactHeaderItem(
                "Caucho asignado",
                tireLabel,
                tireWarningClass
            )}

        </header>
    `;
}

function renderTvCriticalRegisteredContent(value, date, responsible = null) {

    const responsibleHtml = responsible
        ? `<span class="tv-critical-card-responsible">${responsible}</span>`
        : "";

    return `
        <span class="tv-critical-card-badge">✓ Registrado</span>

        <strong class="tv-critical-card-value">${value}</strong>

        <span class="tv-critical-card-date">${date || "—"}</span>

        ${responsibleHtml}
    `;
}

function renderTvCriticalCard(title, sectionKey, wheelIndex, isRegistered, registeredContent) {

    if (isRegistered) {

        return `
            <article class="tv-critical-card tv-critical-card-registered">

                <span class="tv-critical-card-title">${title}</span>

                ${registeredContent}

            </article>
        `;
    }

    return `
        <article class="tv-critical-card tv-critical-card-pending">

            <span class="tv-critical-card-title">${title}</span>

            <span class="tv-critical-card-empty">Sin registrar</span>

            <button
                type="button"
                class="tv-critical-register-btn"
                data-section="${sectionKey}"
                data-wheel-index="${wheelIndex}">

                Registrar

            </button>

        </article>
    `;
}

function renderTvTimeCard(title, minutes, startedAt) {

    const sinceHtml = startedAt
        ? `<span class="tv-critical-card-since">Desde: ${formatTvDateTime(startedAt)}</span>`
        : "";

    return `
        <article class="tv-tv-time-card">

            <span class="tv-critical-card-title">${title}</span>

            <strong class="tv-critical-card-value">
                ${formatDurationMinutes(minutes)}
            </strong>

            ${sinceHtml}

        </article>
    `;
}

function renderTvCriticalDataPanel(wheel, wheelIndex) {

    const pressureData = normalizePressureData(wheel.pressureData);
    const inspectorData = normalizeInspectorData(wheel.inspectorData);
    const serviceableData = normalizeServiceableData(wheel.serviceableData);
    const currentStageTiming = getCurrentStageTimingInfo(wheel);
    const totalWorkshopTiming = getTotalWorkshopTimingInfo(wheel);

    const initialRegistered = pressureData.initialPressure !== null;
    const finalRegistered = pressureData.finalPressure !== null;
    const inspectorRegistered = hasInspectorData(inspectorData);
    const serviceableRegistered = hasServiceableData(serviceableData);

    return `
        <aside class="tv-critical-data-panel">

            ${renderTvCriticalCard(
                "Presión inicial",
                "pressure",
                wheelIndex,
                initialRegistered,
                renderTvCriticalRegisteredContent(
                    `${pressureData.initialPressure} psi`,
                    pressureData.initialPressureDate
                )
            )}

            ${renderTvCriticalCard(
                "Presión final",
                "pressure",
                wheelIndex,
                finalRegistered,
                renderTvCriticalRegisteredContent(
                    `${pressureData.finalPressure} psi`,
                    pressureData.finalPressureDate
                )
            )}

            ${renderTvCriticalCard(
                "Inspector",
                "inspector",
                wheelIndex,
                inspectorRegistered,
                renderTvCriticalRegisteredContent(
                    inspectorData.inspectorName || "-",
                    inspectorData.attendedDate || inspectorData.requestedDate
                )
            )}

            ${renderTvCriticalCard(
                "Serviciable",
                "serviceable",
                wheelIndex,
                serviceableRegistered,
                renderTvCriticalRegisteredContent(
                    serviceableData.documentNumber || "-",
                    serviceableData.receivedDate
                )
            )}

            ${renderTvTimeCard(
                "Tiempo en etapa actual",
                currentStageTiming.minutes,
                currentStageTiming.startedAt
            )}

            ${renderTvTimeCard(
                "Tiempo total en taller",
                totalWorkshopTiming.minutes,
                totalWorkshopTiming.startedAt
            )}

        </aside>
    `;
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

    const currentStage = getCurrentStage(wheel.process) || "Sin etapa activa";

    return `
        <div class="tv-monitor-slide tv-monitor-slide-compact">

            <div class="tv-compact-meta">

                <span class="tv-priority-badge">
                    Rueda ${position} de ${total}
                </span>

                <span class="tv-priority-stage">
                    Etapa actual: ${currentStage}
                </span>

            </div>

            ${renderTvCompactHeader(wheel)}

            <section class="tv-secondary-zone tv-compact-body">

                <div class="tv-secondary-flow-column">

                    <div class="tv-secondary-block tv-secondary-timeline">

                        <h3 class="tv-secondary-title">Proceso del taller</h3>

                        ${renderTvTimeline(wheel)}

                    </div>

                    ${renderTvSubstagesPanel(wheel)}

                </div>

                ${renderTvCriticalDataPanel(wheel, index)}

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

function bindTvMonitorContentEvents() {

    const content = document.getElementById("tvMonitorContent");

    if (!content || tvContentEventsBound) {
        return;
    }

    tvContentEventsBound = true;

    content.addEventListener("click", (event) => {

        const button = event.target.closest(".tv-critical-register-btn");

        if (!button) {
            return;
        }

        const wheelIndex = Number(button.dataset.wheelIndex);
        const sectionKey = button.dataset.section;

        if (
            Number.isNaN(wheelIndex) ||
            !sectionKey ||
            typeof window.openWheelOperationalSection !== "function"
        ) {
            return;
        }

        window.openWheelOperationalSection(wheelIndex, sectionKey);
    });
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

    bindTvMonitorContentEvents();
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

    bindTvMonitorContentEvents();

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
