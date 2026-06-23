import { normalizeWheel } from "../domain/historyModel.js";
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

// ==========================================
// MODAL DE DETALLE
// ==========================================

export function showWheelDetail(wheel) {

    if (!refs.modalDetalle) return;

    refs.detalleRuedaBody.innerHTML = `

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

            ${renderHistorySection(wheel)}

        </div>

    `;

    refs.modalDetalle.show();
}
