import { formatDurationMinutes } from "../domain/kpiCalculator.js";
import { normalizeWheel } from "../domain/historyModel.js";
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

const PAGE_MARGIN = 14;
const PAGE_BOTTOM = 285;

// ==========================================
// UTILIDADES
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
        minutes: row.durationMinutes ?? 0
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

function getJsPdfConstructor() {

    return window.jspdf?.jsPDF ?? null;
}

function createAutoTableOptions(startY, head, body) {

    return {
        startY,
        margin: {
            left: PAGE_MARGIN,
            right: PAGE_MARGIN
        },
        theme: "grid",
        head,
        body,
        styles: {
            fontSize: 8,
            cellPadding: 2,
            overflow: "linebreak"
        },
        headStyles: {
            fillColor: [255, 106, 0],
            textColor: [255, 255, 255],
            fontStyle: "bold"
        },
        alternateRowStyles: {
            fillColor: [255, 248, 242]
        }
    };
}

function ensurePageSpace(doc, currentY, requiredSpace = 24) {

    if (currentY + requiredSpace <= PAGE_BOTTOM) {
        return currentY;
    }

    doc.addPage();

    return PAGE_MARGIN + 8;
}

function addSectionHeading(doc, currentY, title) {

    currentY = ensurePageSpace(doc, currentY, 18);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(255, 106, 0);
    doc.text(title, PAGE_MARGIN, currentY);

    return currentY + 6;
}

function addTableSection(doc, currentY, title, head, body) {

    currentY = addSectionHeading(doc, currentY, title);
    currentY = ensurePageSpace(doc, currentY, 20);

    doc.autoTable(createAutoTableOptions(currentY, head, body));

    return doc.lastAutoTable.finalY + 8;
}

function buildSection1Rows(wheel) {

    const wheelSerialData = normalizeWheelSerialData(
        wheel.wheelSerialData,
        wheel.serial
    );
    const operationalStatus = normalizeOperationalStatus(wheel.operationalStatus);

    return [
        ["Número de rueda", wheel.numeroRueda || "-"],
        ["Fecha ingreso", wheel.fechaIngreso || "-"],
        ["Fecha salida", formatClosedDate(operationalStatus.closedAt)],
        ["Tiempo total", formatDurationMinutes(getWheelTotalProcessMinutes(wheel))],
        ["WP", wheel.wp || "-"],
        ["Aeronave", wheel.avion || "-"],
        ["S/N INNER", wheelSerialData.inner || "-"],
        ["S/N OUTER", wheelSerialData.outer || "-"],
        ["P/N", getWheelPartNumber(wheel)],
        ["Shop Visit", wheel.shopVisit || "-"],
        ["Tire Change", wheel.tireChange || "-"],
        ["NW/MW", getWheelTypeLabel(wheel.wheelType)],
        ["Caja", formatBoxLabel(wheel.boxData)],
        ["Razón", wheel.razon || "-"],
        ["Estación", wheel.estacion || "-"],
        ["Ciclos", wheel.ciclos || "-"]
    ];
}

function buildSection2Rows(wheel) {

    const tireOffData = normalizeTireOffData(wheel.tireOffData);
    const tireAssignment = normalizeTireAssignment(wheel.tireAssignment);

    return [
        [
            "Tire OFF",
            hasTireOffData(tireOffData) ? tireOffData.serialNumber : "-"
        ],
        [
            "Tire ON P/N",
            hasValidTireAssignment(tireAssignment)
                ? tireAssignment.partNumber || "-"
                : "-"
        ],
        [
            "Tire ON S/N",
            hasValidTireAssignment(tireAssignment)
                ? tireAssignment.serial || "-"
                : "-"
        ],
        [
            "Fecha emisión",
            hasValidTireAssignment(tireAssignment)
                ? tireAssignment.issueDate || "-"
                : "-"
        ]
    ];
}

function buildSection3Rows(wheel) {

    const pressureData = normalizePressureData(wheel.pressureData);

    if (!hasPressureData(pressureData)) {

        return [
            ["Estado", "Presiones no registradas"]
        ];
    }

    return [
        ["Presión inicial", formatPressureValue(pressureData.initialPressure)],
        ["Fecha inicial", pressureData.initialPressureDate || "-"],
        ["Presión final", formatPressureValue(pressureData.finalPressure)],
        ["Fecha final", pressureData.finalPressureDate || "-"]
    ];
}

function buildSection4Rows(wheel) {

    const inspectorData = normalizeInspectorData(wheel.inspectorData);
    const serviceableData = normalizeServiceableData(wheel.serviceableData);

    return [
        [
            "Inspector",
            hasInspectorData(inspectorData)
                ? inspectorData.inspectorName || "-"
                : "-"
        ],
        [
            "Fecha solicitada",
            hasInspectorData(inspectorData)
                ? inspectorData.requestedDate || "-"
                : "-"
        ],
        [
            "Fecha de atención",
            hasInspectorData(inspectorData)
                ? inspectorData.attendedDate || "-"
                : "-"
        ],
        [
            "Documento serviciable",
            hasServiceableData(serviceableData)
                ? serviceableData.documentNumber || "-"
                : "-"
        ],
        [
            "Fecha recibido serviciable",
            hasServiceableData(serviceableData)
                ? serviceableData.receivedDate || "-"
                : "-"
        ],
        [
            "Observaciones inspector",
            hasInspectorData(inspectorData)
                ? inspectorData.observations || "-"
                : "-"
        ],
        [
            "Observaciones serviciable",
            hasServiceableData(serviceableData)
                ? serviceableData.observations || "-"
                : "-"
        ]
    ];
}

function buildSection5Rows(wheel) {

    return getRouteSheetStageRows(wheel).map((row) => [
        row.stage,
        formatSheetDate(row.startedAt),
        formatSheetDate(row.finishedAt),
        formatDurationMinutes(row.durationMinutes),
        row.status
    ]);
}

function buildSection6Rows(wheel) {

    const chartData = getRouteSheetChartData(wheel);

    const stageSummaryRows = chartData.stageDurations.map((entry) => [
        entry.stage,
        formatDurationMinutes(entry.minutes || null)
    ]);

    const distributionRows = [
        ["Trabajo", formatDurationMinutes(chartData.workMinutes)],
        ["Espera", formatDurationMinutes(chartData.waitMinutes)]
    ];

    const pressureRows = [
        ["Presión inicial", formatPressureValue(chartData.initialPressure)],
        ["Presión final", formatPressureValue(chartData.finalPressure)]
    ];

    return {
        stageSummaryRows,
        distributionRows,
        pressureRows
    };
}

function buildSection7Rows(wheel) {

    const historial = normalizeWheel(wheel).historial;
    const sortedEvents = [...historial]
        .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

    if (sortedEvents.length === 0) {

        return [
            ["-", "Sin eventos", "Sin eventos registrados"]
        ];
    }

    return sortedEvents.map((event) => [
        formatSheetDate(event.fecha),
        event.tipo || "-",
        event.descripcion || "-"
    ]);
}

// ==========================================
// GENERACIÓN PDF
// ==========================================

export function generateRouteSheetPdfDocument(wheel) {

    const JsPdfConstructor = getJsPdfConstructor();

    if (!JsPdfConstructor) {
        return null;
    }

    const doc = new JsPdfConstructor({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
    });

    const generatedAt = new Date().toLocaleString("es-EC", {
        dateStyle: "short",
        timeStyle: "short"
    });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(34, 34, 34);
    doc.text("Hoja de Ruta Operacional", PAGE_MARGIN, PAGE_MARGIN + 2);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(102, 102, 102);
    doc.text(`WheelTrack | Rueda ${wheel.numeroRueda || "-"}`, PAGE_MARGIN, PAGE_MARGIN + 10);
    doc.text(`Generada: ${generatedAt}`, PAGE_MARGIN, PAGE_MARGIN + 16);

    let currentY = PAGE_MARGIN + 24;

    currentY = addTableSection(
        doc,
        currentY,
        "Sección 1: Datos generales",
        [["Campo", "Valor"]],
        buildSection1Rows(wheel)
    );

    currentY = addTableSection(
        doc,
        currentY,
        "Sección 2: Cauchos",
        [["Campo", "Valor"]],
        buildSection2Rows(wheel)
    );

    currentY = addTableSection(
        doc,
        currentY,
        "Sección 3: Presiones",
        [["Campo", "Valor"]],
        buildSection3Rows(wheel)
    );

    currentY = addTableSection(
        doc,
        currentY,
        "Sección 4: Inspector y Serviciable",
        [["Campo", "Valor"]],
        buildSection4Rows(wheel)
    );

    currentY = addTableSection(
        doc,
        currentY,
        "Sección 5: Timeline del proceso",
        [["Etapa", "Inicio", "Fin", "Duración", "Estado"]],
        buildSection5Rows(wheel)
    );

    const chartSections = buildSection6Rows(wheel);

    currentY = addTableSection(
        doc,
        currentY,
        "Sección 6: Resumen gráfico - Tiempo por etapa",
        [["Etapa", "Duración"]],
        chartSections.stageSummaryRows
    );

    currentY = addTableSection(
        doc,
        currentY,
        "Sección 6: Resumen gráfico - Trabajo vs espera",
        [["Concepto", "Tiempo"]],
        chartSections.distributionRows
    );

    currentY = addTableSection(
        doc,
        currentY,
        "Sección 6: Resumen gráfico - Presiones",
        [["Indicador", "Valor"]],
        chartSections.pressureRows
    );

    currentY = addTableSection(
        doc,
        currentY,
        "Sección 7: Historial completo",
        [["Fecha", "Tipo", "Descripción"]],
        buildSection7Rows(wheel)
    );

    const totalPages = doc.getNumberOfPages();

    for (let page = 1; page <= totalPages; page += 1) {

        doc.setPage(page);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(136, 136, 136);
        doc.text(
            `Página ${page} de ${totalPages}`,
            PAGE_MARGIN,
            292
        );
    }

    return doc;
}
