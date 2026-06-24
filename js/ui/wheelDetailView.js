import { normalizeWheel } from "../domain/historyModel.js";
import {
    canAdvanceProcess,
    normalizeProcessState
} from "../domain/processModel.js";
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

function renderProcessSection(wheel, canAdvance) {

    const process = normalizeProcessState(wheel.process);

    const stageItems = process.stages.map((stageState) => `

        <div class="process-stage-item">

            <span class="process-stage-name">
                ${stageState.stage}
            </span>

            <span class="process-stage-status ${getProcessStatusClass(stageState.status)}">
                ${stageState.status}
            </span>

        </div>

    `).join("");

    return `
        <div class="col-12 process-section">

            <h6 class="process-title">Proceso del Taller</h6>

            <div class="process-stage-list">
                ${stageItems}
            </div>

            <button
                type="button"
                id="btnAvanzarEtapa"
                class="btn btn-warning process-advance-btn mt-3"
                ${canAdvance ? "" : "disabled"}
            >
                Avanzar Etapa
            </button>

        </div>
    `;
}

function renderDetailContent(wheel, canAdvance) {

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

            <div class="col-md-12">
                <strong>Detalle:</strong><br>
                ${wheel.detalle || "-"}
            </div>

            <div class="col-md-12">
                <strong>Estado:</strong> ${wheel.estado || "-"}
            </div>

            ${renderProcessSection(wheel, canAdvance)}

            ${renderHistorySection(wheel)}

        </div>

    `;
}

// ==========================================
// MODAL DE DETALLE
// ==========================================

export function showWheelDetail({ wheel, onAdvanceStage }) {

    if (!refs.modalDetalle) return;

    const canAdvance = canAdvanceProcess(wheel.process);

    refs.detalleRuedaBody.innerHTML = renderDetailContent(wheel, canAdvance);

    const advanceButton = document.getElementById("btnAvanzarEtapa");

    if (advanceButton && onAdvanceStage) {

        advanceButton.addEventListener("click", () => {

            onAdvanceStage();
        });
    }

    refs.modalDetalle.show();
}

export function refreshWheelDetail({ wheel, onAdvanceStage }) {

    if (!refs.modalDetalle) return;

    const canAdvance = canAdvanceProcess(wheel.process);

    refs.detalleRuedaBody.innerHTML = renderDetailContent(wheel, canAdvance);

    const advanceButton = document.getElementById("btnAvanzarEtapa");

    if (advanceButton && onAdvanceStage) {

        advanceButton.addEventListener("click", () => {

            onAdvanceStage();
        });
    }
}
