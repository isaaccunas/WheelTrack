import { formatDurationMinutes } from "../domain/kpiCalculator.js";
import { normalizeWheel } from "../domain/historyModel.js";
import { generateRouteSheetPdfDocument } from "./routeSheetPdfView.js";
import { normalizeProcessState, normalizeStageTiming, PROCESS_STAGES } from "../domain/processModel.js";
import {
    formatBoxLabel,
    formatClosedDate,
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

let routeSheetModal = null;

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

function getStageStatusClass(status) {

    const classes = {
        "Completada": "route-sheet-status-completed",
        "En proceso": "route-sheet-status-active",
        "Pendiente": "route-sheet-status-pending",
        "Bloqueada": "route-sheet-status-blocked"
    };

    return classes[status] || "route-sheet-status-pending";
}

function getWheelPartNumber(wheel) {

    const tireAssignment = normalizeTireAssignment(wheel.tireAssignment);

    if (hasValidTireAssignment(tireAssignment) && tireAssignment.partNumber) {
        return tireAssignment.partNumber;
    }

    return "-";
}

function getRouteSheetStageRows(wheel) {

    const process = normalizeProcessState(wheel.process);
    const stageTiming = normalizeStageTiming(wheel.stageTiming);

    return PROCESS_STAGES.map((stageName) => {

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

        return {
            stage: stageName,
            status: stageState.status,
            startedAt: timingEntry.startedAt,
            finishedAt: timingEntry.finishedAt,
            durationMinutes: timingEntry.durationMinutes
        };
    });
}

function getRouteSheetChartData(wheel) {

    const stageRows = getRouteSheetStageRows(wheel);
    const stageTiming = normalizeStageTiming(wheel.stageTiming);
    const pressureData = normalizePressureData(wheel.pressureData);

    const stageDurations = stageRows.map((row) => ({
        stage: row.stage,
        minutes: row.durationMinutes ?? 0,
        status: row.status
    }));

    let workMinutes = 0;
    let waitMinutes = 0;

    stageDurations.forEach((entry) => {

        if (entry.minutes > 0) {
            workMinutes += entry.minutes;
        }
    });

    for (let index = 0; index < PROCESS_STAGES.length - 1; index += 1) {

        const currentEntry = stageTiming.find(
            (entry) => entry.stage === PROCESS_STAGES[index]
        );
        const nextEntry = stageTiming.find(
            (entry) => entry.stage === PROCESS_STAGES[index + 1]
        );

        if (!currentEntry?.finishedAt || !nextEntry?.startedAt) {
            continue;
        }

        const gapMinutes = Math.round(
            (new Date(nextEntry.startedAt) - new Date(currentEntry.finishedAt)) / 60000
        );

        if (gapMinutes > 0) {
            waitMinutes += gapMinutes;
        }
    }

    return {
        stageDurations,
        workMinutes,
        waitMinutes,
        initialPressure: pressureData.initialPressure,
        finalPressure: pressureData.finalPressure
    };
}

function renderBarChartRow(label, value, maxValue, displayValue) {

    const numericValue = Number(value) || 0;
    const numericMax = Number(maxValue) || 0;
    const widthPercent = numericMax > 0
        ? Math.min(100, Math.round((numericValue / numericMax) * 100))
        : 0;

    return `
        <div class="route-sheet-bar-row">

            <span class="route-sheet-bar-label">${label}</span>

            <div class="route-sheet-bar-track">

                <div
                    class="route-sheet-bar-fill"
                    style="width: ${widthPercent}%;">
                </div>

            </div>

            <span class="route-sheet-bar-value">${displayValue}</span>

        </div>
    `;
}

// ==========================================
// SECCIONES DE LA HOJA
// ==========================================

function renderSection1GeneralData(wheel) {

    const wheelSerialData = normalizeWheelSerialData(
        wheel.wheelSerialData,
        wheel.serial
    );
    const operationalStatus = normalizeOperationalStatus(wheel.operationalStatus);

    return `
        <section class="route-sheet-section">

            <h2 class="route-sheet-section-title">
                Sección 1: Datos generales
            </h2>

            <div class="route-sheet-grid">

                <div class="route-sheet-field">
                    <span class="route-sheet-label">Número de rueda</span>
                    <span class="route-sheet-value">${wheel.numeroRueda || "-"}</span>
                </div>

                <div class="route-sheet-field">
                    <span class="route-sheet-label">Fecha ingreso</span>
                    <span class="route-sheet-value">${wheel.fechaIngreso || "-"}</span>
                </div>

                <div class="route-sheet-field">
                    <span class="route-sheet-label">Fecha salida</span>
                    <span class="route-sheet-value">${formatClosedDate(operationalStatus.closedAt)}</span>
                </div>

                <div class="route-sheet-field">
                    <span class="route-sheet-label">Tiempo total</span>
                    <span class="route-sheet-value">${formatDurationMinutes(getWheelTotalProcessMinutes(wheel))}</span>
                </div>

                <div class="route-sheet-field">
                    <span class="route-sheet-label">WP</span>
                    <span class="route-sheet-value">${wheel.wp || "-"}</span>
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
                    <span class="route-sheet-label">P/N</span>
                    <span class="route-sheet-value">${getWheelPartNumber(wheel)}</span>
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
                    <span class="route-sheet-label">NW/MW</span>
                    <span class="route-sheet-value">${getWheelTypeLabel(wheel.wheelType)}</span>
                </div>

                <div class="route-sheet-field">
                    <span class="route-sheet-label">Caja</span>
                    <span class="route-sheet-value">${formatBoxLabel(wheel.boxData)}</span>
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

            </div>

        </section>
    `;
}

function renderSection2Tires(wheel) {

    const tireOffData = normalizeTireOffData(wheel.tireOffData);
    const tireAssignment = normalizeTireAssignment(wheel.tireAssignment);

    return `
        <section class="route-sheet-section">

            <h2 class="route-sheet-section-title">
                Sección 2: Cauchos
            </h2>

            <div class="route-sheet-grid">

                <div class="route-sheet-field">
                    <span class="route-sheet-label">Tire OFF</span>
                    <span class="route-sheet-value">
                        ${hasTireOffData(tireOffData)
                            ? tireOffData.serialNumber
                            : "-"}
                    </span>
                </div>

                <div class="route-sheet-field">
                    <span class="route-sheet-label">Tire ON P/N</span>
                    <span class="route-sheet-value">
                        ${hasValidTireAssignment(tireAssignment)
                            ? tireAssignment.partNumber || "-"
                            : "-"}
                    </span>
                </div>

                <div class="route-sheet-field">
                    <span class="route-sheet-label">Tire ON S/N</span>
                    <span class="route-sheet-value">
                        ${hasValidTireAssignment(tireAssignment)
                            ? tireAssignment.serial || "-"
                            : "-"}
                    </span>
                </div>

                <div class="route-sheet-field">
                    <span class="route-sheet-label">Fecha emisión</span>
                    <span class="route-sheet-value">
                        ${hasValidTireAssignment(tireAssignment)
                            ? tireAssignment.issueDate || "-"
                            : "-"}
                    </span>
                </div>

            </div>

        </section>
    `;
}

function renderSection3Pressures(wheel) {

    const pressureData = normalizePressureData(wheel.pressureData);

    if (!hasPressureData(pressureData)) {

        return `
            <section class="route-sheet-section">

                <h2 class="route-sheet-section-title">
                    Sección 3: Presiones
                </h2>

                <p class="route-sheet-empty">Presiones no registradas.</p>

            </section>
        `;
    }

    return `
        <section class="route-sheet-section">

            <h2 class="route-sheet-section-title">
                Sección 3: Presiones
            </h2>

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

        </section>
    `;
}

function renderSection4InspectorServiceable(wheel) {

    const inspectorData = normalizeInspectorData(wheel.inspectorData);
    const serviceableData = normalizeServiceableData(wheel.serviceableData);

    return `
        <section class="route-sheet-section">

            <h2 class="route-sheet-section-title">
                Sección 4: Inspector y Serviciable
            </h2>

            <div class="route-sheet-grid">

                <div class="route-sheet-field">
                    <span class="route-sheet-label">Inspector</span>
                    <span class="route-sheet-value">
                        ${hasInspectorData(inspectorData)
                            ? inspectorData.inspectorName || "-"
                            : "-"}
                    </span>
                </div>

                <div class="route-sheet-field">
                    <span class="route-sheet-label">Fecha solicitada</span>
                    <span class="route-sheet-value">
                        ${hasInspectorData(inspectorData)
                            ? inspectorData.requestedDate || "-"
                            : "-"}
                    </span>
                </div>

                <div class="route-sheet-field">
                    <span class="route-sheet-label">Fecha de atención</span>
                    <span class="route-sheet-value">
                        ${hasInspectorData(inspectorData)
                            ? inspectorData.attendedDate || "-"
                            : "-"}
                    </span>
                </div>

                <div class="route-sheet-field">
                    <span class="route-sheet-label">Documento serviciable</span>
                    <span class="route-sheet-value">
                        ${hasServiceableData(serviceableData)
                            ? serviceableData.documentNumber || "-"
                            : "-"}
                    </span>
                </div>

                <div class="route-sheet-field">
                    <span class="route-sheet-label">Fecha recibido serviciable</span>
                    <span class="route-sheet-value">
                        ${hasServiceableData(serviceableData)
                            ? serviceableData.receivedDate || "-"
                            : "-"}
                    </span>
                </div>

                <div class="route-sheet-field route-sheet-field-full">
                    <span class="route-sheet-label">Observaciones inspector</span>
                    <span class="route-sheet-value">
                        ${hasInspectorData(inspectorData)
                            ? inspectorData.observations || "-"
                            : "-"}
                    </span>
                </div>

                <div class="route-sheet-field route-sheet-field-full">
                    <span class="route-sheet-label">Observaciones serviciable</span>
                    <span class="route-sheet-value">
                        ${hasServiceableData(serviceableData)
                            ? serviceableData.observations || "-"
                            : "-"}
                    </span>
                </div>

            </div>

        </section>
    `;
}

function renderSection5Timeline(wheel) {

    const stageRows = getRouteSheetStageRows(wheel);

    const tableRows = stageRows.map((row) => `

        <tr class="${getStageIndicatorClass(row.status)}">

            <td>${row.stage}</td>
            <td>${formatSheetDate(row.startedAt)}</td>
            <td>${formatSheetDate(row.finishedAt)}</td>
            <td>${formatDurationMinutes(row.durationMinutes)}</td>
            <td>
                <span class="route-sheet-status-badge ${getStageStatusClass(row.status)}">
                    ${row.status}
                </span>
            </td>

        </tr>

    `).join("");

    return `
        <section class="route-sheet-section">

            <h2 class="route-sheet-section-title">
                Sección 5: Timeline completa
            </h2>

            <div class="route-sheet-table-wrap">

                <table class="route-sheet-table">

                    <thead>

                        <tr>

                            <th>Etapa</th>
                            <th>Inicio</th>
                            <th>Fin</th>
                            <th>Duración</th>
                            <th>Estado</th>

                        </tr>

                    </thead>

                    <tbody>
                        ${tableRows}
                    </tbody>

                </table>

            </div>

        </section>
    `;
}

function renderSection6Charts(wheel) {

    const chartData = getRouteSheetChartData(wheel);
    const maxStageMinutes = Math.max(
        ...chartData.stageDurations.map((entry) => entry.minutes || 0),
        1
    );

    const stageChartRows = chartData.stageDurations.map((entry) =>

        renderBarChartRow(
            entry.stage,
            entry.minutes,
            maxStageMinutes,
            formatDurationMinutes(entry.minutes || null)
        )

    ).join("");

    const totalWorkWait = chartData.workMinutes + chartData.waitMinutes;
    const workPercent = totalWorkWait > 0
        ? Math.round((chartData.workMinutes / totalWorkWait) * 100)
        : 0;
    const waitPercent = totalWorkWait > 0
        ? Math.round((chartData.waitMinutes / totalWorkWait) * 100)
        : 0;

    const pressureValues = [
        chartData.initialPressure,
        chartData.finalPressure
    ].filter((value) => value !== null && value !== undefined);
    const maxPressure = Math.max(...pressureValues, 1);

    const pressureChart = pressureValues.length > 0
        ? `
            ${renderBarChartRow(
                "Presión inicial",
                chartData.initialPressure ?? 0,
                maxPressure,
                formatPressureValue(chartData.initialPressure)
            )}
            ${renderBarChartRow(
                "Presión final",
                chartData.finalPressure ?? 0,
                maxPressure,
                formatPressureValue(chartData.finalPressure)
            )}
        `
        : `<p class="route-sheet-empty">Presiones no registradas para graficar.</p>`;

    const workWaitChart = totalWorkWait > 0
        ? `
            <div class="route-sheet-split-bar">

                <div
                    class="route-sheet-split-segment route-sheet-split-work"
                    style="width: ${workPercent}%;">

                    Trabajo ${formatDurationMinutes(chartData.workMinutes)}

                </div>

                <div
                    class="route-sheet-split-segment route-sheet-split-wait"
                    style="width: ${waitPercent}%;">

                    Espera ${formatDurationMinutes(chartData.waitMinutes)}

                </div>

            </div>

            <div class="route-sheet-split-legend">

                <span class="route-sheet-legend-item route-sheet-legend-work">
                    Trabajo: ${formatDurationMinutes(chartData.workMinutes)}
                </span>

                <span class="route-sheet-legend-item route-sheet-legend-wait">
                    Espera: ${formatDurationMinutes(chartData.waitMinutes)}
                </span>

            </div>
        `
        : `<p class="route-sheet-empty">Sin tiempos suficientes para calcular trabajo vs espera.</p>`;

    return `
        <section class="route-sheet-section route-sheet-section-charts">

            <h2 class="route-sheet-section-title">
                Sección 6: Gráficos
            </h2>

            <div class="route-sheet-charts-grid">

                <div class="route-sheet-chart-card">

                    <h3 class="route-sheet-chart-title">Tiempo por etapa</h3>

                    <div class="route-sheet-chart-body">
                        ${stageChartRows}
                    </div>

                </div>

                <div class="route-sheet-chart-card">

                    <h3 class="route-sheet-chart-title">
                        Distribución trabajo vs espera
                    </h3>

                    <div class="route-sheet-chart-body">
                        ${workWaitChart}
                    </div>

                </div>

                <div class="route-sheet-chart-card">

                    <h3 class="route-sheet-chart-title">
                        Presiones inicial / final
                    </h3>

                    <div class="route-sheet-chart-body">
                        ${pressureChart}
                    </div>

                </div>

            </div>

        </section>
    `;
}

function renderSection7History(wheel) {

    const historial = normalizeWheel(wheel).historial;
    const sortedEvents = [...historial]
        .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

    if (sortedEvents.length === 0) {

        return `
            <section class="route-sheet-section">

                <h2 class="route-sheet-section-title">
                    Sección 7: Historial completo
                </h2>

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
                Sección 7: Historial completo
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
// GENERACIÓN, VISTA PREVIA E IMPRESIÓN
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

            ${renderSection1GeneralData(wheel)}
            ${renderSection2Tires(wheel)}
            ${renderSection3Pressures(wheel)}
            ${renderSection4InspectorServiceable(wheel)}
            ${renderSection5Timeline(wheel)}
            ${renderSection6Charts(wheel)}
            ${renderSection7History(wheel)}

            <footer class="route-sheet-footer">
                Documento generado desde WheelTrack para uso operativo en taller.
            </footer>

        </article>
    `;
}

function logRouteSheetPrintAreaContent(contextLabel) {

    const printArea = document.getElementById("routeSheetPrintArea");
    const htmlContent = printArea?.innerHTML?.trim() ?? "";

    console.log(
        `[WheelTrack] ${contextLabel} - routeSheetPrintArea HTML length:`,
        htmlContent.length
    );
    console.log(
        `[WheelTrack] ${contextLabel} - routeSheetPrintArea has content:`,
        htmlContent.length > 0
    );

    return printArea;
}

function populateRouteSheetPrintArea(wheel) {

    const printArea = logRouteSheetPrintAreaContent("populateRouteSheetPrintArea");

    if (!printArea) {
        return null;
    }

    printArea.innerHTML = buildRouteSheetHtml(wheel);

    logRouteSheetPrintAreaContent("after populateRouteSheetPrintArea");

    return printArea;
}

function triggerRouteSheetPrint() {

    logRouteSheetPrintAreaContent("before print");

    document.body.classList.add("printing-route-sheet");

    const cleanupPrintMode = () => {

        document.body.classList.remove("printing-route-sheet");
        window.removeEventListener("afterprint", cleanupPrintMode);
    };

    window.addEventListener("afterprint", cleanupPrintMode);

    window.print();
}

function getRouteSheetModalInstance() {

    const modalElement = document.getElementById("modalRouteSheet");

    if (!modalElement || typeof bootstrap === "undefined") {
        return null;
    }

    if (!routeSheetModal) {
        routeSheetModal = new bootstrap.Modal(modalElement);
    }

    return routeSheetModal;
}

export function initializeRouteSheetView() {

    const printButton = document.getElementById("btnPrintRouteSheet");

    if (printButton) {

        printButton.addEventListener("click", () => {
            triggerRouteSheetPrint();
        });
    }
}

export function printRouteSheet(wheel) {

    const titleElement = document.getElementById("routeSheetPreviewTitle");
    const modal = getRouteSheetModalInstance();

    if (!populateRouteSheetPrintArea(wheel) || !modal) {

        alert("No se pudo abrir la vista previa de la hoja de ruta.");

        return;
    }

    if (titleElement) {

        titleElement.textContent = `Hoja de Ruta - Rueda ${wheel.numeroRueda || "-"}`;
    }

    modal.show();
}

export function buildRouteSheetFilename(wheel) {

    const wheelNumber = String(wheel.numeroRueda || "sin-numero")
        .trim()
        .replace(/[^\w.-]+/g, "-");

    return `Hoja-Ruta-Rueda-${wheelNumber}.pdf`;
}

export function downloadRouteSheetPdf(wheel) {

    const pdfDocument = generateRouteSheetPdfDocument(wheel);

    if (!pdfDocument) {

        alert("No se pudo cargar jsPDF. Recarga la página e intenta de nuevo.");

        return;
    }

    try {

        pdfDocument.save(buildRouteSheetFilename(wheel));

    } catch (error) {

        console.error(error);

        alert("No se pudo generar el PDF. Intenta nuevamente.");
    }
}
