import { normalizeWheel } from "../domain/historyModel.js";
import {
    getActiveStageState,
    normalizeProcessState,
    PROCESS_STAGES
} from "../domain/processModel.js";
import {
    getWheelTypeLabel,
    hasInspectorData,
    hasPressureData,
    hasServiceableData,
    hasValidTireAssignment,
    normalizeInspectorData,
    normalizePressureData,
    normalizeServiceableData,
    normalizeTireAssignment
} from "../domain/wheelModel.js";
import { refs } from "./domRefs.js";

// ==========================================
// UTILIDADES DE RENDER
// ==========================================

function formatEventDate(isoDate) {

    if (!isoDate) {
        return "-";
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

function renderHistorySection(wheel) {

    const historial = normalizeWheel(wheel).historial;

    if (historial.length === 0) {

        return `
            <div class="col-12 history-section">

                <h6 class="history-title">Historial</h6>

                <p class="history-empty mb-0">
                    Sin eventos registrados.
                </p>

            </div>
        `;
    }

    const sortedEvents = [...historial].sort(
        (a, b) => new Date(b.fecha) - new Date(a.fecha)
    );

    const historyItems = sortedEvents.map((event) => `

        <div class="history-item">

            <div class="history-item-header">

                <span class="history-date">
                    ${formatEventDate(event.fecha)}
                </span>

                <span class="history-type">
                    ${event.tipo || "-"}
                </span>

            </div>

            <p class="history-description mb-0">
                ${event.descripcion || "-"}
            </p>

        </div>

    `).join("");

    return `
        <div class="col-12 history-section">

            <h6 class="history-title">Historial</h6>

            <div class="history-list">
                ${historyItems}
            </div>

        </div>
    `;
}

function getProcessStatusClass(status) {

    const statusClasses = {

        "Pendiente": "process-status-pending",
        "En proceso": "process-status-active",
        "Completada": "process-status-completed",
        "Bloqueada": "process-status-blocked"
    };

    return statusClasses[status] || "process-status-pending";
}

function getTimelineNodeClass(status) {

    const nodeClasses = {

        "Pendiente": "wheel-timeline-node-pending",
        "En proceso": "wheel-timeline-node-active",
        "Completada": "wheel-timeline-node-completed",
        "Bloqueada": "wheel-timeline-node-blocked"
    };

    return nodeClasses[status] || "wheel-timeline-node-pending";
}

function getTimelineConnectorClass(status) {

    return status === "Completada"
        ? "wheel-timeline-connector-completed"
        : "wheel-timeline-connector-pending";
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

function renderProcessTimeline(wheel) {

    const process = normalizeProcessState(wheel.process);

    const timelineSteps = PROCESS_STAGES.map((stageName, index) => {

        const stageState = process.stages.find(
            (stage) => stage.stage === stageName
        ) ?? {
            stage: stageName,
            status: "Pendiente"
        };

        const isLast = index === PROCESS_STAGES.length - 1;

        const connectorMarkup = isLast
            ? ""
            : `
                <div
                    class="wheel-timeline-connector ${getTimelineConnectorClass(stageState.status)}"
                    aria-hidden="true">
                </div>
            `;

        return `
            <div class="wheel-timeline-step">

                <div class="wheel-timeline-step-top">

                    <div
                        class="wheel-timeline-node ${getTimelineNodeClass(stageState.status)}"
                        title="${stageState.stage}: ${stageState.status}">

                        <i class="${getTimelineNodeIcon(stageState.status)}"></i>

                    </div>

                    ${connectorMarkup}

                </div>

                <div class="wheel-timeline-step-body">

                    <span class="wheel-timeline-stage-name">
                        ${stageState.stage}
                    </span>

                    <span class="wheel-timeline-stage-status ${getProcessStatusClass(stageState.status)}">
                        ${stageState.status}
                    </span>

                </div>

            </div>
        `;
    }).join("");

    return `
        <div class="wheel-timeline" aria-label="Línea de tiempo del proceso">

            <div class="wheel-timeline-track">
                ${timelineSteps}
            </div>

            <div class="wheel-timeline-legend">

                <span class="wheel-timeline-legend-item">
                    <span class="wheel-timeline-legend-dot wheel-timeline-node-completed"></span>
                    Completada
                </span>

                <span class="wheel-timeline-legend-item">
                    <span class="wheel-timeline-legend-dot wheel-timeline-node-active"></span>
                    En proceso
                </span>

                <span class="wheel-timeline-legend-item">
                    <span class="wheel-timeline-legend-dot wheel-timeline-node-pending"></span>
                    Pendiente
                </span>

                <span class="wheel-timeline-legend-item">
                    <span class="wheel-timeline-legend-dot wheel-timeline-node-blocked"></span>
                    Bloqueada
                </span>

            </div>

        </div>
    `;
}

function renderActiveSubstagesSection(wheel) {

    const activeStage = getActiveStageState(wheel.process);

    if (!activeStage || activeStage.substages.length === 0) {

        return `
            <div class="active-substages mt-3">

                <h6 class="substages-title">Subetapas</h6>

                <p class="substages-empty mb-0">
                    No hay subetapas activas.
                </p>

            </div>
        `;
    }

    const substageItems = activeStage.substages.map((substage) => `

        <label class="substage-item">

            <input
                type="checkbox"
                class="form-check-input substage-checkbox"
                data-stage="${activeStage.stage}"
                data-substage="${substage.name}"
                ${substage.completed ? "checked disabled" : ""}
            >

            <span class="substage-name ${substage.completed ? "substage-completed" : ""}">
                ${substage.name}
            </span>

        </label>

    `).join("");

    return `
        <div class="active-substages mt-3">

            <h6 class="substages-title">
                Subetapas de ${activeStage.stage}
            </h6>

            <div class="substages-list">
                ${substageItems}
            </div>

        </div>
    `;
}

function renderOperationalSectionHeader(title, sectionKey, hasData) {

    const buttonLabel = hasData ? "Editar" : "Registrar";

    return `
        <div class="operational-section-header">

            <h6 class="operational-section-title">${title}</h6>

            <button
                type="button"
                class="btn btn-sm btn-outline-warning operational-edit-btn"
                data-section="${sectionKey}">

                ${buttonLabel}

            </button>

        </div>
    `;
}

function renderTireAssignmentForm(tireAssignment) {

    return `
        <div class="operational-form d-none" data-form="tire">

            <div class="row g-2">

                <div class="col-md-4">
                    <label class="form-label">S/N caucho *</label>
                    <input
                        type="text"
                        class="form-control operational-input"
                        data-field="serial"
                        value="${tireAssignment.serial || ""}"
                        placeholder="Ej: T-12345">
                </div>

                <div class="col-md-4">
                    <label class="form-label">Part Number *</label>
                    <input
                        type="text"
                        class="form-control operational-input"
                        data-field="partNumber"
                        value="${tireAssignment.partNumber || ""}"
                        placeholder="Ej: P/N 9876">
                </div>

                <div class="col-md-4">
                    <label class="form-label">Fecha de emisión *</label>
                    <input
                        type="date"
                        class="form-control operational-input"
                        data-field="issueDate"
                        value="${tireAssignment.issueDate || ""}">
                </div>

            </div>

            <div class="operational-form-actions">
                <button type="button" class="btn btn-sm btn-warning operational-save-btn" data-section="tire">
                    Guardar
                </button>
                <button type="button" class="btn btn-sm btn-outline-secondary operational-cancel-btn" data-section="tire">
                    Cancelar
                </button>
            </div>

        </div>
    `;
}

function renderTireAssignmentSection(wheel) {

    const tireAssignment = normalizeTireAssignment(wheel.tireAssignment);
    const hasData = hasValidTireAssignment(tireAssignment);

    const displayContent = hasData
        ? `
            <div class="row g-2 operational-display" data-display="tire">

                <div class="col-md-4">
                    <strong>S/N:</strong> ${tireAssignment.serial || "-"}
                </div>

                <div class="col-md-4">
                    <strong>Part Number:</strong> ${tireAssignment.partNumber || "-"}
                </div>

                <div class="col-md-4">
                    <strong>Fecha de emisión:</strong> ${tireAssignment.issueDate || "-"}
                </div>

            </div>
        `
        : `
            <p class="tire-assignment-empty mb-0 operational-display" data-display="tire">
                Caucho no asignado
            </p>
        `;

    return `
        <div class="col-12 tire-assignment-section operational-panel-section" data-section="tire">

            ${renderOperationalSectionHeader("Caucho asignado", "tire", hasData)}

            ${displayContent}

            ${renderTireAssignmentForm(tireAssignment)}

        </div>
    `;
}

function formatPressureValue(pressure) {

    if (pressure === null) {
        return "-";
    }

    return String(pressure);
}

function renderPressureDataForm(pressureData) {

    return `
        <div class="operational-form d-none" data-form="pressure">

            <div class="row g-2">

                <div class="col-md-6">
                    <label class="form-label">Presión inicial</label>
                    <input
                        type="number"
                        step="0.1"
                        class="form-control operational-input"
                        data-field="initialPressure"
                        value="${pressureData.initialPressure ?? ""}"
                        placeholder="Ej: 185">
                </div>

                <div class="col-md-6">
                    <label class="form-label">Fecha inicial</label>
                    <input
                        type="date"
                        class="form-control operational-input"
                        data-field="initialPressureDate"
                        value="${pressureData.initialPressureDate || ""}">
                </div>

                <div class="col-md-6">
                    <label class="form-label">Presión final</label>
                    <input
                        type="number"
                        step="0.1"
                        class="form-control operational-input"
                        data-field="finalPressure"
                        value="${pressureData.finalPressure ?? ""}"
                        placeholder="Ej: 190">
                </div>

                <div class="col-md-6">
                    <label class="form-label">Fecha final</label>
                    <input
                        type="date"
                        class="form-control operational-input"
                        data-field="finalPressureDate"
                        value="${pressureData.finalPressureDate || ""}">
                </div>

            </div>

            <div class="operational-form-actions">
                <button type="button" class="btn btn-sm btn-warning operational-save-btn" data-section="pressure">
                    Guardar
                </button>
                <button type="button" class="btn btn-sm btn-outline-secondary operational-cancel-btn" data-section="pressure">
                    Cancelar
                </button>
            </div>

        </div>
    `;
}

function renderPressureDataSection(wheel) {

    const pressureData = normalizePressureData(wheel.pressureData);
    const hasData = hasPressureData(pressureData);

    const displayContent = hasData
        ? `
            <div class="row g-2 operational-display" data-display="pressure">

                <div class="col-md-6">
                    <strong>Presión inicial:</strong>
                    ${formatPressureValue(pressureData.initialPressure)}
                </div>

                <div class="col-md-6">
                    <strong>Fecha inicial:</strong>
                    ${pressureData.initialPressureDate || "-"}
                </div>

                <div class="col-md-6">
                    <strong>Presión final:</strong>
                    ${formatPressureValue(pressureData.finalPressure)}
                </div>

                <div class="col-md-6">
                    <strong>Fecha final:</strong>
                    ${pressureData.finalPressureDate || "-"}
                </div>

            </div>
        `
        : `
            <p class="pressure-data-empty mb-0 operational-display" data-display="pressure">
                Presiones no registradas
            </p>
        `;

    return `
        <div class="col-12 pressure-data-section operational-panel-section" data-section="pressure">

            ${renderOperationalSectionHeader("Presiones", "pressure", hasData)}

            ${displayContent}

            ${renderPressureDataForm(pressureData)}

        </div>
    `;
}

function renderInspectorDataForm(inspectorData) {

    return `
        <div class="operational-form d-none" data-form="inspector">

            <div class="row g-2">

                <div class="col-md-6">
                    <label class="form-label">Fecha solicitada</label>
                    <input
                        type="date"
                        class="form-control operational-input"
                        data-field="requestedDate"
                        value="${inspectorData.requestedDate || ""}">
                </div>

                <div class="col-md-6">
                    <label class="form-label">Fecha de atención</label>
                    <input
                        type="date"
                        class="form-control operational-input"
                        data-field="attendedDate"
                        value="${inspectorData.attendedDate || ""}">
                </div>

                <div class="col-md-6">
                    <label class="form-label">Nombre del inspector *</label>
                    <input
                        type="text"
                        class="form-control operational-input"
                        data-field="inspectorName"
                        value="${inspectorData.inspectorName || ""}"
                        placeholder="Ej: Juan Pérez">
                </div>

                <div class="col-md-12">
                    <label class="form-label">Observaciones</label>
                    <textarea
                        class="form-control operational-input"
                        data-field="observations"
                        rows="2"
                        placeholder="Observaciones del inspector">${inspectorData.observations || ""}</textarea>
                </div>

            </div>

            <div class="operational-form-actions">
                <button type="button" class="btn btn-sm btn-warning operational-save-btn" data-section="inspector">
                    Guardar
                </button>
                <button type="button" class="btn btn-sm btn-outline-secondary operational-cancel-btn" data-section="inspector">
                    Cancelar
                </button>
            </div>

        </div>
    `;
}

function renderInspectorDataSection(wheel) {

    const inspectorData = normalizeInspectorData(wheel.inspectorData);
    const hasData = hasInspectorData(inspectorData);

    const displayContent = hasData
        ? `
            <div class="row g-2 operational-display" data-display="inspector">

                <div class="col-md-6">
                    <strong>Fecha solicitada:</strong>
                    ${inspectorData.requestedDate || "-"}
                </div>

                <div class="col-md-6">
                    <strong>Fecha de atención:</strong>
                    ${inspectorData.attendedDate || "-"}
                </div>

                <div class="col-md-6">
                    <strong>Nombre:</strong>
                    ${inspectorData.inspectorName || "-"}
                </div>

                <div class="col-md-12">
                    <strong>Observaciones:</strong><br>
                    ${inspectorData.observations || "-"}
                </div>

            </div>
        `
        : `
            <p class="inspector-data-empty mb-0 operational-display" data-display="inspector">
                Inspector no registrado
            </p>
        `;

    return `
        <div class="col-12 inspector-data-section operational-panel-section" data-section="inspector">

            ${renderOperationalSectionHeader("Inspector", "inspector", hasData)}

            ${displayContent}

            ${renderInspectorDataForm(inspectorData)}

        </div>
    `;
}

function renderServiceableDataForm(serviceableData) {

    return `
        <div class="operational-form d-none" data-form="serviceable">

            <div class="row g-2">

                <div class="col-md-6">
                    <label class="form-label">Nº documento *</label>
                    <input
                        type="text"
                        class="form-control operational-input"
                        data-field="documentNumber"
                        value="${serviceableData.documentNumber || ""}"
                        placeholder="Ej: SV-2024-001">
                </div>

                <div class="col-md-6">
                    <label class="form-label">Fecha recibido</label>
                    <input
                        type="date"
                        class="form-control operational-input"
                        data-field="receivedDate"
                        value="${serviceableData.receivedDate || ""}">
                </div>

                <div class="col-md-12">
                    <label class="form-label">Observaciones</label>
                    <textarea
                        class="form-control operational-input"
                        data-field="observations"
                        rows="2"
                        placeholder="Observaciones del serviciable">${serviceableData.observations || ""}</textarea>
                </div>

            </div>

            <div class="operational-form-actions">
                <button type="button" class="btn btn-sm btn-warning operational-save-btn" data-section="serviceable">
                    Guardar
                </button>
                <button type="button" class="btn btn-sm btn-outline-secondary operational-cancel-btn" data-section="serviceable">
                    Cancelar
                </button>
            </div>

        </div>
    `;
}

function renderServiceableDataSection(wheel) {

    const serviceableData = normalizeServiceableData(wheel.serviceableData);
    const hasData = hasServiceableData(serviceableData);

    const displayContent = hasData
        ? `
            <div class="row g-2 operational-display" data-display="serviceable">

                <div class="col-md-6">
                    <strong>Nº documento:</strong>
                    ${serviceableData.documentNumber || "-"}
                </div>

                <div class="col-md-6">
                    <strong>Fecha recibido:</strong>
                    ${serviceableData.receivedDate || "-"}
                </div>

                <div class="col-md-12">
                    <strong>Observaciones:</strong><br>
                    ${serviceableData.observations || "-"}
                </div>

            </div>
        `
        : `
            <p class="serviceable-data-empty mb-0 operational-display" data-display="serviceable">
                Serviciable no registrado
            </p>
        `;

    return `
        <div class="col-12 serviceable-data-section operational-panel-section" data-section="serviceable">

            ${renderOperationalSectionHeader("Serviciable", "serviceable", hasData)}

            ${displayContent}

            ${renderServiceableDataForm(serviceableData)}

        </div>
    `;
}

function renderProcessSection(wheel) {

    return `
        <div class="col-12 process-section">

            <h6 class="process-title">Proceso del Taller</h6>

            ${renderProcessTimeline(wheel)}

            ${renderActiveSubstagesSection(wheel)}

        </div>
    `;
}

function renderDetailContent(wheel) {

    return `

        <div class="row g-3">

            <div class="col-md-6">
                <strong>Nº:</strong> ${wheel.numeroRueda || "-"}
            </div>

            <div class="col-md-6">
                <strong>Fecha recepción:</strong> ${wheel.fechaRecepcion || "-"}
            </div>

            <div class="col-md-6">
                <strong>Avión:</strong> ${wheel.avion || "-"}
            </div>

            <div class="col-md-6">
                <strong>S/N:</strong> ${wheel.serial || "-"}
            </div>

            <div class="col-md-6">
                <strong>Ingreso al taller:</strong> ${wheel.fechaIngreso || "-"}
            </div>

            <div class="col-md-6">
                <strong>WP:</strong> ${wheel.wp || "-"}
            </div>

            <div class="col-md-6">
                <strong>Tire Change:</strong> ${wheel.tireChange || "-"}
            </div>

            <div class="col-md-6">
                <strong>Shop Visit:</strong> ${wheel.shopVisit || "-"}
            </div>

            <div class="col-md-6">
                <strong>Razón:</strong> ${wheel.razon || "-"}
            </div>

            <div class="col-md-6">
                <strong>Estación:</strong> ${wheel.estacion || "-"}
            </div>

            <div class="col-md-6">
                <strong>Ciclos:</strong> ${wheel.ciclos || "-"}
            </div>

            <div class="col-md-6">
                <strong>Tipo de rueda:</strong> ${getWheelTypeLabel(wheel.wheelType)}
            </div>

            <div class="col-md-12">
                <strong>Detalle:</strong><br>
                ${wheel.detalle || "-"}
            </div>

            <div class="col-md-12">
                <strong>Estado:</strong> ${wheel.estado || "-"}
            </div>

            ${renderTireAssignmentSection(wheel)}

            ${renderPressureDataSection(wheel)}

            ${renderInspectorDataSection(wheel)}

            ${renderServiceableDataSection(wheel)}

            ${renderProcessSection(wheel)}

            ${renderHistorySection(wheel)}

        </div>

    `;
}

function getSectionContainer(sectionKey) {

    return document.querySelector(
        `.operational-panel-section[data-section="${sectionKey}"]`
    );
}

function showOperationalForm(sectionKey) {

    const section = getSectionContainer(sectionKey);

    if (!section) {
        return;
    }

    section.querySelector(`[data-display="${sectionKey}"]`)?.classList.add("d-none");
    section.querySelector(`[data-form="${sectionKey}"]`)?.classList.remove("d-none");
    section.querySelector(".operational-edit-btn")?.classList.add("d-none");
}

function hideOperationalForm(sectionKey) {

    const section = getSectionContainer(sectionKey);

    if (!section) {
        return;
    }

    section.querySelector(`[data-display="${sectionKey}"]`)?.classList.remove("d-none");
    section.querySelector(`[data-form="${sectionKey}"]`)?.classList.add("d-none");
    section.querySelector(".operational-edit-btn")?.classList.remove("d-none");
}

function readOperationalFormData(sectionKey) {

    const section = getSectionContainer(sectionKey);

    if (!section) {
        return {};
    }

    const data = {};

    section.querySelectorAll(".operational-input").forEach((input) => {

        const field = input.dataset.field;

        if (!field) {
            return;
        }

        data[field] = input.value;
    });

    return data;
}

function bindOperationalPanelInteractions(callbacks) {

    const {
        onSaveTireAssignment,
        onSavePressureData,
        onSaveInspectorData,
        onSaveServiceableData
    } = callbacks || {};

    document.querySelectorAll(".operational-edit-btn").forEach((button) => {

        button.addEventListener("click", () => {

            showOperationalForm(button.dataset.section);
        });
    });

    document.querySelectorAll(".operational-cancel-btn").forEach((button) => {

        button.addEventListener("click", () => {

            hideOperationalForm(button.dataset.section);
        });
    });

    document.querySelectorAll(".operational-save-btn").forEach((button) => {

        button.addEventListener("click", () => {

            const sectionKey = button.dataset.section;
            const formData = readOperationalFormData(sectionKey);

            if (sectionKey === "tire" && onSaveTireAssignment) {
                onSaveTireAssignment(formData);
            }

            if (sectionKey === "pressure" && onSavePressureData) {
                onSavePressureData(formData);
            }

            if (sectionKey === "inspector" && onSaveInspectorData) {
                onSaveInspectorData(formData);
            }

            if (sectionKey === "serviceable" && onSaveServiceableData) {
                onSaveServiceableData(formData);
            }
        });
    });
}

function bindDetailInteractions(callbacks) {

    const { onCompleteSubstage } = callbacks || {};

    if (onCompleteSubstage) {

        document.querySelectorAll(".substage-checkbox:not(:disabled)").forEach((checkbox) => {

            checkbox.addEventListener("change", (event) => {

                if (!event.target.checked) {
                    return;
                }

                onCompleteSubstage(
                    event.target.dataset.stage,
                    event.target.dataset.substage
                );
            });
        });
    }

    bindOperationalPanelInteractions(callbacks);
}

// ==========================================
// MODAL DE DETALLE
// ==========================================

export function showWheelDetail(callbacks) {

    const { wheel } = callbacks || {};

    if (!refs.modalDetalle || !wheel) return;

    refs.detalleRuedaBody.innerHTML = renderDetailContent(wheel);

    bindDetailInteractions(callbacks);

    refs.modalDetalle.show();
}

export function refreshWheelDetail(callbacks) {

    const { wheel } = callbacks || {};

    if (!refs.modalDetalle || !wheel) return;

    refs.detalleRuedaBody.innerHTML = renderDetailContent(wheel);

    bindDetailInteractions(callbacks);
}
