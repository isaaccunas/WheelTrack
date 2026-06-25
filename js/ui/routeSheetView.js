import { formatDurationMinutes } from "../domain/kpiCalculator.js";
import { normalizeWheel } from "../domain/historyModel.js";
import { normalizeProcessState, normalizeStageTiming, PROCESS_STAGES } from "../domain/processModel.js";
import {
    formatBoxLabel,
    formatClosedDate,
    getWheelSerialSummary,
    getWheelTotalProcessMinutes,
    getWheelTypeLabel,
    hasInspectorData,
    hasPressureData,
    hasServiceableData,
    hasTireOffData,
    hasValidTireAssignment,
    normalizeInspectorData,
    normalizeOperationalStatus,
    normalizePressureData,
    normalizeServiceableData,
    normalizeTireAssignment,
    normalizeTireOffData,
    normalizeWheelSerialData
} from "../domain/wheelModel.js";

// ==========================================
// UTILIDADES DE FORMATO
// ==========================================

function formatSheetDate(isoDate) {

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

function formatPressureValue(pressure) {

    if (pressure === null || pressure === undefined) {
        return "-";
    }

    return `${pressure} psi`;
}

function getStageIndicatorClass(status) {

    const classes = {
        "Completada": "route-sheet-stage-completed",
        "En proceso": "route-sheet-stage-active",
        "Pendiente": "route-sheet-stage-pending",
        "Bloqueada": "route-sheet-stage-blocked"
    };

    return classes[status] || "route-sheet-stage-pending";
}

function getStageIndicatorSymbol(status) {

    const symbols = {
        "Completada": "✓",
        "En proceso": "●",
        "Pendiente": "○",
        "Bloqueada": "!"
    };

    return symbols[status] || "○";
}

// ==========================================
// SECCIONES DE LA HOJA
// ==========================================

function renderGeneralDataSection(wheel) {

    const wheelSerialData = normalizeWheelSerialData(
        wheel.wheelSerialData,
        wheel.serial
    );
    const operationalStatus = normalizeOperationalStatus(wheel.operationalStatus);

    return `
        <section class="route-sheet-section">

            <h2 class="route-sheet-section-title">Datos generales</h2>

            <div class="route-sheet-grid">

                <div class="route-sheet-field">
                    <span class="route-sheet-label">Número de rueda</span>
                    <span class="route-sheet-value">${wheel.numeroRueda || "-"}</span>
                </div>

                <div class="route-sheet-field">
                    <span class="route-sheet-label">Tipo</span>
                    <span class="route-sheet-value">${getWheelTypeLabel(wheel.wheelType)}</span>
                </div>

                <div class="route-sheet-field">
                    <span class="route-sheet-label">Caja utilizada</span>
                    <span class="route-sheet-value">${formatBoxLabel(wheel.boxData)}</span>
                </div>

                <div class="route-sheet-field">
                    <span class="route-sheet-label">Aeronave</span>
                    <span class="route-sheet-value">${wheel.avion || "-"}</span>
                </div>

                <div class="route-sheet-field">
                    <span class="route-sheet-label">S/N INNER</span>
                    <span class="route-sheet-value">${wheelSerialData.inner || "-"}</span>
                </div>

                <div class="route-sheet-field">
                    <span class="route-sheet-label">S/N OUTER</span>
                    <span class="route-sheet-value">${wheelSerialData.outer || "-"}</span>
                </div>

                <div class="route-sheet-field">
                    <span class="route-sheet-label">Serial resumido</span>
                    <span class="route-sheet-value">${getWheelSerialSummary(wheel)}</span>
                </div>

                <div class="route-sheet-field">
                    <span class="route-sheet-label">WP</span>
                    <span class="route-sheet-value">${wheel.wp || "-"}</span>
                </div>

                <div class="route-sheet-field">
                    <span class="route-sheet-label">Shop Visit</span>
                    <span class="route-sheet-value">${wheel.shopVisit || "-"}</span>
                </div>

                <div class="route-sheet-field">
                    <span class="route-sheet-label">Tire Change</span>
                    <span class="route-sheet-value">${wheel.tireChange || "-"}</span>
                </div>

                <div class="route-sheet-field">
                    <span class="route-sheet-label">Razón</span>
                    <span class="route-sheet-value">${wheel.razon || "-"}</span>
                </div>

                <div class="route-sheet-field">
                    <span class="route-sheet-label">Estación</span>
                    <span class="route-sheet-value">${wheel.estacion || "-"}</span>
                </div>

                <div class="route-sheet-field">
                    <span class="route-sheet-label">Ciclos</span>
                    <span class="route-sheet-value">${wheel.ciclos || "-"}</span>
                </div>

                <div class="route-sheet-field">
                    <span class="route-sheet-label">Fecha de ingreso</span>
                    <span class="route-sheet-value">${wheel.fechaIngreso || "-"}</span>
                </div>

                <div class="route-sheet-field">
                    <span class="route-sheet-label">Fecha de cierre</span>
                    <span class="route-sheet-value">${formatClosedDate(operationalStatus.closedAt)}</span>
                </div>

                <div class="route-sheet-field">
                    <span class="route-sheet-label">Tiempo total del proceso</span>
                    <span class="route-sheet-value">${formatDurationMinutes(getWheelTotalProcessMinutes(wheel))}</span>
                </div>

            </div>

        </section>
    `;
}

function renderTireOffSection(wheel) {

    const tireOffData = normalizeTireOffData(wheel.tireOffData);

    if (!hasTireOffData(tireOffData)) {

        return `
            <div class="route-sheet-subsection">
                <h3 class="route-sheet-subtitle">Tire OFF</h3>
                <p class="route-sheet-empty">Tire OFF no registrado</p>
            </div>
        `;
    }

    return `
        <div class="route-sheet-subsection">

            <h3 class="route-sheet-subtitle">Tire OFF</h3>

            <div class="route-sheet-grid">

                <div class="route-sheet-field">
                    <span class="route-sheet-label">S/N</span>
                    <span class="route-sheet-value">${tireOffData.serialNumber || "-"}</span>
                </div>

            </div>

        </div>
    `;
}

function renderTireSection(wheel) {

    const tireAssignment = normalizeTireAssignment(wheel.tireAssignment);

    if (!hasValidTireAssignment(tireAssignment)) {

        return `
            <div class="route-sheet-subsection">
                <h3 class="route-sheet-subtitle">Tire ON (caucho asignado)</h3>
                <p class="route-sheet-empty">Caucho no asignado</p>
            </div>
        `;
    }

    return `
        <div class="route-sheet-subsection">

            <h3 class="route-sheet-subtitle">Tire ON (caucho asignado)</h3>

            <div class="route-sheet-grid">

                <div class="route-sheet-field">
                    <span class="route-sheet-label">S/N</span>
                    <span class="route-sheet-value">${tireAssignment.serial || "-"}</span>
                </div>

                <div class="route-sheet-field">
                    <span class="route-sheet-label">Part Number</span>
                    <span class="route-sheet-value">${tireAssignment.partNumber || "-"}</span>
                </div>

                <div class="route-sheet-field">
                    <span class="route-sheet-label">Fecha de emisión</span>
                    <span class="route-sheet-value">${tireAssignment.issueDate || "-"}</span>
                </div>

            </div>

        </div>
    `;
}

function renderPressureSection(wheel) {

    const pressureData = normalizePressureData(wheel.pressureData);

    if (!hasPressureData(pressureData)) {

        return `
            <div class="route-sheet-subsection">
                <h3 class="route-sheet-subtitle">Presiones</h3>
                <p class="route-sheet-empty">Presiones no registradas</p>
            </div>
        `;
    }

    return `
        <div class="route-sheet-subsection">

            <h3 class="route-sheet-subtitle">Presiones</h3>

            <div class="route-sheet-grid">

                <div class="route-sheet-field">
                    <span class="route-sheet-label">Presión inicial</span>
                    <span class="route-sheet-value">${formatPressureValue(pressureData.initialPressure)}</span>
                </div>

                <div class="route-sheet-field">
                    <span class="route-sheet-label">Fecha inicial</span>
                    <span class="route-sheet-value">${pressureData.initialPressureDate || "-"}</span>
                </div>

                <div class="route-sheet-field">
                    <span class="route-sheet-label">Presión final</span>
                    <span class="route-sheet-value">${formatPressureValue(pressureData.finalPressure)}</span>
                </div>

                <div class="route-sheet-field">
                    <span class="route-sheet-label">Fecha final</span>
                    <span class="route-sheet-value">${pressureData.finalPressureDate || "-"}</span>
                </div>

            </div>

        </div>
    `;
}

function renderInspectorSection(wheel) {

    const inspectorData = normalizeInspectorData(wheel.inspectorData);

    if (!hasInspectorData(inspectorData)) {

        return `
            <div class="route-sheet-subsection">
                <h3 class="route-sheet-subtitle">Inspector</h3>
                <p class="route-sheet-empty">Inspector no registrado</p>
            </div>
        `;
    }

    return `
        <div class="route-sheet-subsection">

            <h3 class="route-sheet-subtitle">Inspector</h3>

            <div class="route-sheet-grid">

                <div class="route-sheet-field">
                    <span class="route-sheet-label">Fecha solicitada</span>
                    <span class="route-sheet-value">${inspectorData.requestedDate || "-"}</span>
                </div>

                <div class="route-sheet-field">
                    <span class="route-sheet-label">Fecha de atención</span>
                    <span class="route-sheet-value">${inspectorData.attendedDate || "-"}</span>
                </div>

                <div class="route-sheet-field">
                    <span class="route-sheet-label">Nombre</span>
                    <span class="route-sheet-value">${inspectorData.inspectorName || "-"}</span>
                </div>

                <div class="route-sheet-field route-sheet-field-full">
                    <span class="route-sheet-label">Observaciones</span>
                    <span class="route-sheet-value">${inspectorData.observations || "-"}</span>
                </div>

            </div>

        </div>
    `;
}

function renderServiceableSection(wheel) {

    const serviceableData = normalizeServiceableData(wheel.serviceableData);

    if (!hasServiceableData(serviceableData)) {

        return `
            <div class="route-sheet-subsection">
                <h3 class="route-sheet-subtitle">Serviciable</h3>
                <p class="route-sheet-empty">Serviciable no registrado</p>
            </div>
        `;
    }

    return `
        <div class="route-sheet-subsection">

            <h3 class="route-sheet-subtitle">Serviciable</h3>

            <div class="route-sheet-grid">

                <div class="route-sheet-field">
                    <span class="route-sheet-label">Nº documento</span>
                    <span class="route-sheet-value">${serviceableData.documentNumber || "-"}</span>
                </div>

                <div class="route-sheet-field">
                    <span class="route-sheet-label">Fecha recibido</span>
                    <span class="route-sheet-value">${serviceableData.receivedDate || "-"}</span>
                </div>

                <div class="route-sheet-field route-sheet-field-full">
                    <span class="route-sheet-label">Observaciones</span>
                    <span class="route-sheet-value">${serviceableData.observations || "-"}</span>
                </div>

            </div>

        </div>
    `;
}

function renderOperationalDataSection(wheel) {

    return `
        <section class="route-sheet-section">

            <h2 class="route-sheet-section-title">Datos operacionales</h2>

            ${renderTireOffSection(wheel)}
            ${renderTireSection(wheel)}
            ${renderPressureSection(wheel)}
            ${renderInspectorSection(wheel)}
            ${renderServiceableSection(wheel)}

        </section>
    `;
}

function renderProcessSection(wheel) {

    const process = normalizeProcessState(wheel.process);
    const stageTiming = normalizeStageTiming(wheel.stageTiming);

    const stageItems = PROCESS_STAGES.map((stageName) => {

        const stageState = process.stages.find(
            (stage) => stage.stage === stageName
        ) ?? {
            stage: stageName,
            status: "Pendiente"
        };

        const timingEntry = stageTiming.find(
            (entry) => entry.stage === stageName
        ) ?? {
            startedAt: null,
            finishedAt: null,
            durationMinutes: null
        };

        return `
            <div class="route-sheet-stage ${getStageIndicatorClass(stageState.status)}">

                <span class="route-sheet-stage-indicator">
                    ${getStageIndicatorSymbol(stageState.status)}
                </span>

                <div class="route-sheet-stage-content">

                    <span class="route-sheet-stage-name">${stageState.stage}</span>

                    <span class="route-sheet-stage-status">${stageState.status}</span>

                    <span class="route-sheet-stage-timing">
                        Inicio: ${formatSheetDate(timingEntry.startedAt)}
                        · Fin: ${formatSheetDate(timingEntry.finishedAt)}
                        · Duración: ${formatDurationMinutes(timingEntry.durationMinutes)}
                    </span>

                </div>

            </div>
        `;
    }).join("");

    return `
        <section class="route-sheet-section">

            <h2 class="route-sheet-section-title">Timeline del proceso</h2>

            <div class="route-sheet-stages">
                ${stageItems}
            </div>

        </section>
    `;
}

function renderHistorySection(wheel) {

    const historial = normalizeWheel(wheel).historial;
    const sortedEvents = [...historial]
        .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

    if (sortedEvents.length === 0) {

        return `
            <section class="route-sheet-section">

                <h2 class="route-sheet-section-title">Historial de eventos</h2>

                <p class="route-sheet-empty">Sin eventos registrados.</p>

            </section>
        `;
    }

    const historyItems = sortedEvents.map((event) => `

        <div class="route-sheet-history-item">

            <div class="route-sheet-history-header">

                <span class="route-sheet-history-date">
                    ${formatSheetDate(event.fecha)}
                </span>

                <span class="route-sheet-history-type">
                    ${event.tipo || "-"}
                </span>

            </div>

            <p class="route-sheet-history-description">
                ${event.descripcion || "-"}
            </p>

        </div>

    `).join("");

    return `
        <section class="route-sheet-section">

            <h2 class="route-sheet-section-title">
                Historial de eventos
            </h2>

            <p class="route-sheet-note">
                ${sortedEvents.length} evento(s) registrados.
            </p>

            <div class="route-sheet-history">
                ${historyItems}
            </div>

        </section>
    `;
}

// ==========================================
// GENERACIÓN E IMPRESIÓN
// ==========================================

export function buildRouteSheetHtml(wheel) {

    const generatedAt = new Date().toLocaleString("es-EC", {
        dateStyle: "short",
        timeStyle: "short"
    });

    return `
        <article class="route-sheet">

            <header class="route-sheet-header">

                <div>

                    <p class="route-sheet-brand">WheelTrack</p>

                    <h1 class="route-sheet-title">
                        Hoja de Ruta Operacional
                    </h1>

                </div>

                <div class="route-sheet-meta">

                    <p><strong>Rueda:</strong> ${wheel.numeroRueda || "-"}</p>
                    <p><strong>Generada:</strong> ${generatedAt}</p>

                </div>

            </header>

            ${renderGeneralDataSection(wheel)}
            ${renderOperationalDataSection(wheel)}
            ${renderProcessSection(wheel)}
            ${renderHistorySection(wheel)}

            <footer class="route-sheet-footer">
                Documento generado desde WheelTrack para uso operativo en taller.
            </footer>

        </article>
    `;
}

export function printRouteSheet(wheel) {

    const printWindow = window.open("", "_blank", "noopener,noreferrer");

    if (!printWindow) {

        alert("Permite ventanas emergentes para imprimir la hoja de ruta.");

        return;
    }

    printWindow.document.open();
    printWindow.document.write(`
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Hoja de Ruta - Rueda ${wheel.numeroRueda || "-"}</title>
            <link rel="stylesheet" href="css/style.css">
        </head>
        <body class="route-sheet-document">
            ${buildRouteSheetHtml(wheel)}
            <script>
                window.addEventListener("load", function () {
                    window.focus();
                    window.print();
                });

                window.addEventListener("afterprint", function () {
                    window.close();
                });
            <\/script>
        </body>
        </html>
    `);
    printWindow.document.close();
}

export function buildRouteSheetFilename(wheel) {

    const wheelNumber = String(wheel.numeroRueda || "sin-numero")
        .trim()
        .replace(/[^\w.-]+/g, "-");

    return `Hoja-Ruta-Rueda-${wheelNumber}.pdf`;
}

function createRouteSheetPdfContainer(wheel) {

    const container = document.createElement("div");

    container.className = "route-sheet-document route-sheet-pdf-source";
    container.innerHTML = buildRouteSheetHtml(wheel);

    return container;
}

export async function downloadRouteSheetPdf(wheel) {

    const html2pdf = window.html2pdf;

    if (typeof html2pdf !== "function") {

        alert("No se pudo cargar la librería de PDF. Recarga la página e intenta de nuevo.");

        return;
    }

    const container = createRouteSheetPdfContainer(wheel);

    document.body.appendChild(container);

    try {

        await html2pdf()
            .set({
                margin: [10, 10, 10, 10],
                filename: buildRouteSheetFilename(wheel),
                image: {
                    type: "jpeg",
                    quality: 0.98
                },
                html2canvas: {
                    scale: 2,
                    useCORS: true,
                    logging: false
                },
                jsPDF: {
                    unit: "mm",
                    format: "a4",
                    orientation: "portrait"
                },
                pagebreak: {
                    mode: ["avoid-all", "css", "legacy"]
                }
            })
            .from(container)
            .save();

    } catch (error) {

        console.error(error);

        alert("No se pudo generar el PDF. Intenta nuevamente.");

    } finally {

        container.remove();
    }
}
