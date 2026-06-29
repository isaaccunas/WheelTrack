import {
    averageStageTime,
    formatDurationMinutes,
    getHistoricalAverageStageTimes,
    slowestStage
} from "../domain/kpiCalculator.js";
import {
    normalizeStageTiming,
    PROCESS_STAGES
} from "../domain/processModel.js";
import {
    getWheelTotalProcessMinutes,
    isWheelActive,
    isWheelProcessed,
    normalizeOperationalStatus
} from "../domain/wheelModel.js";

const ACTIVE_BAR_COLOR = "#1a5276";
const CLOSED_BAR_COLOR = "#888888";

const ANALYSIS_MODES = {
    WHEEL: "wheel-comparative",
    STAGE: "stage-comparative",
    STAGES_OVERVIEW: "stages-overview"
};

let productivityChartModal = null;
let productivityChartInstance = null;
let getWheels = null;
let currentAnalysis = {
    mode: ANALYSIS_MODES.WHEEL,
    stageName: null,
    monthKey: null,
    stageSource: "fixed"
};

const groupBoundaryPlugin = {
    id: "groupBoundaryPlugin",

    afterDraw(chart) {

        const boundaryIndex = chart.$groupBoundaryIndex;

        if (boundaryIndex === null || boundaryIndex === undefined) {
            return;
        }

        const {
            ctx,
            chartArea,
            scales: { x }
        } = chart;

        if (!x) {
            return;
        }

        const xPos = x.getPixelForValue(boundaryIndex - 0.5);

        ctx.save();
        ctx.beginPath();
        ctx.setLineDash([6, 6]);
        ctx.strokeStyle = "#cccccc";
        ctx.lineWidth = 1;
        ctx.moveTo(xPos, chartArea.top);
        ctx.lineTo(xPos, chartArea.bottom);
        ctx.stroke();
        ctx.restore();
    }
};

const barValueLabelPlugin = {
    id: "barValueLabelPlugin",

    afterDatasetsDraw(chart) {

        const { ctx } = chart;

        chart.data.datasets.forEach((dataset, datasetIndex) => {

            const meta = chart.getDatasetMeta(datasetIndex);

            if (meta.hidden) {
                return;
            }

            meta.data.forEach((barElement, index) => {

                const value = dataset.data[index];

                if (value === null || value === undefined) {
                    return;
                }

                const label = formatDurationMinutes(value);
                const position = barElement.tooltipPosition();

                ctx.save();
                ctx.fillStyle = "#333333";
                ctx.font = "600 11px sans-serif";
                ctx.textAlign = "center";
                ctx.fillText(label, position.x, position.y - 8);
                ctx.restore();
            });
        });
    }
};

function destroyProductivityChart() {

    if (productivityChartInstance) {

        productivityChartInstance.destroy();
        productivityChartInstance = null;
    }
}

function getCurrentMonthKey(referenceDate = new Date()) {

    return `${referenceDate.getFullYear()}-${String(referenceDate.getMonth() + 1).padStart(2, "0")}`;
}

function getMonthKeyFromIso(isoDate) {

    const date = new Date(isoDate);

    if (Number.isNaN(date.getTime())) {
        return null;
    }

    return getCurrentMonthKey(date);
}

function getMonthKeyFromDateString(dateString) {

    if (!dateString) {
        return null;
    }

    const date = new Date(`${dateString}T00:00:00`);

    if (Number.isNaN(date.getTime())) {
        return null;
    }

    return getCurrentMonthKey(date);
}

function formatMonthLabel(monthKey) {

    const [year, month] = monthKey.split("-");
    const date = new Date(Number(year), Number(month) - 1, 1);

    if (Number.isNaN(date.getTime())) {
        return monthKey;
    }

    return date.toLocaleDateString("es-EC", {
        month: "long",
        year: "numeric"
    });
}

function getSuggestedMax(values) {

    const numericValues = values.filter(
        (value) => value !== null && value !== undefined && !Number.isNaN(value)
    );

    if (numericValues.length === 0) {
        return 10;
    }

    return Math.ceil(Math.max(...numericValues) * 1.1);
}

function getAvailableMonthKeys(wheels) {

    const monthKeys = new Set([getCurrentMonthKey()]);

    wheels.forEach((wheel) => {

        if (isWheelProcessed(wheel)) {

            const monthKey = getMonthKeyFromIso(
                normalizeOperationalStatus(wheel.operationalStatus).closedAt
            );

            if (monthKey) {
                monthKeys.add(monthKey);
            }

            return;
        }

        const ingressMonth = getMonthKeyFromDateString(
            wheel.fechaIngreso || wheel.fechaRecepcion
        );

        if (ingressMonth) {
            monthKeys.add(ingressMonth);
        }
    });

    return [...monthKeys].sort().reverse();
}

function isWheelInMonth(wheel, monthKey) {

    if (isWheelProcessed(wheel)) {

        const closedMonth = getMonthKeyFromIso(
            normalizeOperationalStatus(wheel.operationalStatus).closedAt
        );

        return closedMonth === monthKey;
    }

    if (!isWheelActive(wheel)) {
        return false;
    }

    const ingressMonth = getMonthKeyFromDateString(
        wheel.fechaIngreso || wheel.fechaRecepcion
    );

    if (ingressMonth === monthKey) {
        return true;
    }

    return monthKey === getCurrentMonthKey();
}

function filterWheelsByMonth(wheels, monthKey) {

    return wheels.filter((wheel) => isWheelInMonth(wheel, monthKey));
}

function getStageMinutesForWheel(wheel, stageName) {

    const stageEntry = normalizeStageTiming(wheel.stageTiming).find(
        (entry) => entry.stage === stageName
    );

    if (!stageEntry) {
        return null;
    }

    if (
        stageEntry.durationMinutes !== null &&
        stageEntry.durationMinutes !== undefined
    ) {
        return stageEntry.durationMinutes;
    }

    if (!stageEntry.startedAt) {
        return null;
    }

    const start = new Date(stageEntry.startedAt);
    const end = stageEntry.finishedAt
        ? new Date(stageEntry.finishedAt)
        : new Date();

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        return null;
    }

    return Math.max(0, Math.round((end - start) / 60000));
}

function sortWheelNumber(a, b) {

    const numberA = Number(a);
    const numberB = Number(b);

    if (!Number.isNaN(numberA) && !Number.isNaN(numberB)) {
        return numberA - numberB;
    }

    return String(a).localeCompare(String(b));
}

function buildGroupedWheelEntries(wheels, monthKey, valueResolver) {

    const filteredWheels = filterWheelsByMonth(wheels, monthKey);
    const activeEntries = [];
    const closedEntries = [];

    filteredWheels.forEach((wheel) => {

        const minutes = valueResolver(wheel);

        if (minutes === null || minutes === undefined) {
            return;
        }

        const entry = {
            wheel,
            label: wheel.numeroRueda || "-",
            minutes,
            isActive: isWheelActive(wheel)
        };

        if (entry.isActive) {
            activeEntries.push(entry);
        } else {
            closedEntries.push(entry);
        }
    });

    activeEntries.sort((entryA, entryB) =>
        sortWheelNumber(entryA.label, entryB.label)
    );
    closedEntries.sort((entryA, entryB) =>
        sortWheelNumber(entryA.label, entryB.label)
    );

    return [...activeEntries, ...closedEntries];
}

function buildGroupedBarChartConfig(entries) {

    const labels = entries.map((entry) => `#${entry.label}`);
    const data = entries.map((entry) => entry.minutes);
    const backgroundColor = entries.map((entry) =>
        entry.isActive ? ACTIVE_BAR_COLOR : CLOSED_BAR_COLOR
    );

    const firstClosedIndex = entries.findIndex((entry) => !entry.isActive);
    const groupBoundaryIndex = firstClosedIndex > 0 ? firstClosedIndex : null;

    return {
        type: "bar",
        data: {
            labels,
            datasets: [
                {
                    label: "Tiempo (min)",
                    data,
                    backgroundColor,
                    borderColor: backgroundColor,
                    borderWidth: 1,
                    borderRadius: 6
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    suggestedMax: getSuggestedMax(data),
                    title: {
                        display: true,
                        text: "Minutos"
                    }
                }
            }
        },
        plugins: [groupBoundaryPlugin, barValueLabelPlugin],
        $groupBoundaryIndex: groupBoundaryIndex
    };
}

function buildStagesOverviewChartConfig(wheels, monthKey) {

    const filteredWheels = filterWheelsByMonth(wheels, monthKey);
    const stageAverages = getHistoricalAverageStageTimes(filteredWheels);
    const labels = PROCESS_STAGES;
    const data = labels.map((stageName) => stageAverages[stageName] ?? null);
    const backgroundColor = labels.map((_, index) =>
        index % 2 === 0 ? ACTIVE_BAR_COLOR : "#2e86c1"
    );

    return {
        type: "bar",
        data: {
            labels,
            datasets: [
                {
                    label: "Promedio (min)",
                    data,
                    backgroundColor,
                    borderRadius: 6
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    suggestedMax: getSuggestedMax(data),
                    title: {
                        display: true,
                        text: "Minutos"
                    }
                }
            }
        },
        plugins: [barValueLabelPlugin],
        $groupBoundaryIndex: null
    };
}

function computeEntryStats(entries) {

    if (entries.length === 0) {

        return {
            activeCount: 0,
            closedCount: 0,
            averageMinutes: null,
            maxEntry: null,
            minEntry: null,
            totalAnalyzed: 0
        };
    }

    const activeCount = entries.filter((entry) => entry.isActive).length;
    const closedCount = entries.length - activeCount;
    const totalMinutes = entries.reduce(
        (sum, entry) => sum + entry.minutes,
        0
    );

    let maxEntry = entries[0];
    let minEntry = entries[0];

    entries.forEach((entry) => {

        if (entry.minutes > maxEntry.minutes) {
            maxEntry = entry;
        }

        if (entry.minutes < minEntry.minutes) {
            minEntry = entry;
        }
    });

    return {
        activeCount,
        closedCount,
        averageMinutes: Math.round(totalMinutes / entries.length),
        maxEntry,
        minEntry,
        totalAnalyzed: entries.length
    };
}

function renderSummaryPanel(monthKey, stats, averageLabel = "Promedio etapa:") {

    const summaryElement = document.getElementById("productivityAnalyticsSummary");

    if (!summaryElement) {
        return;
    }

    const maxText = stats.maxEntry
        ? `${formatDurationMinutes(stats.maxEntry.minutes)}<br><span class="productivity-summary-detail">(Rueda #${stats.maxEntry.label})</span>`
        : "Sin datos";
    const minText = stats.minEntry
        ? `${formatDurationMinutes(stats.minEntry.minutes)}<br><span class="productivity-summary-detail">(Rueda #${stats.minEntry.label})</span>`
        : "Sin datos";

    summaryElement.innerHTML = `
        <h6 class="productivity-summary-title">
            Resumen — ${formatMonthLabel(monthKey)}
        </h6>

        <dl class="productivity-summary-list">
            <div class="productivity-summary-item">
                <dt>Ruedas activas:</dt>
                <dd>${stats.activeCount}</dd>
            </div>
            <div class="productivity-summary-item">
                <dt>Ruedas cerradas:</dt>
                <dd>${stats.closedCount}</dd>
            </div>
            <div class="productivity-summary-item">
                <dt>${averageLabel}</dt>
                <dd>${formatDurationMinutes(stats.averageMinutes)}</dd>
            </div>
            <div class="productivity-summary-item">
                <dt>Máximo:</dt>
                <dd>${maxText}</dd>
            </div>
            <div class="productivity-summary-item">
                <dt>Mínimo:</dt>
                <dd>${minText}</dd>
            </div>
            <div class="productivity-summary-item">
                <dt>Ruedas analizadas:</dt>
                <dd>${stats.totalAnalyzed}</dd>
            </div>
        </dl>
    `;
}

function populateMonthSelector(monthKeys, selectedMonthKey) {

    const monthSelect = document.getElementById("productivityMonthSelect");

    if (!monthSelect) {
        return;
    }

    monthSelect.innerHTML = monthKeys.map((monthKey) => `

        <option value="${monthKey}" ${monthKey === selectedMonthKey ? "selected" : ""}>
            ${formatMonthLabel(monthKey)}
        </option>

    `).join("");
}

function updateLegendVisibility(mode) {

    const legendElement = document.querySelector(".productivity-analytics-legend");

    if (!legendElement) {
        return;
    }

    legendElement.hidden = mode === ANALYSIS_MODES.STAGES_OVERVIEW;
}

function resolveStageNameForAnalysis(wheels, monthKey) {

    if (currentAnalysis.stageSource !== "slowest-by-month") {
        return currentAnalysis.stageName;
    }

    const slowestStageResult = slowestStage(filterWheelsByMonth(wheels, monthKey));

    return slowestStageResult?.stage ?? null;
}

function updateModalHeader(mode, stageName = null) {

    const titleElement = document.getElementById("productivityChartTitle");
    const subtitleElement = document.getElementById("productivityChartSubtitle");

    if (!titleElement || !subtitleElement) {
        return;
    }

    updateLegendVisibility(mode);

    if (mode === ANALYSIS_MODES.WHEEL) {

        titleElement.textContent = "Análisis comparativo de ruedas";
        subtitleElement.textContent =
            "Tiempo total por rueda del mes seleccionado.";

        return;
    }

    if (mode === ANALYSIS_MODES.STAGE && stageName) {

        titleElement.textContent = `Análisis comparativo — ${stageName}`;
        subtitleElement.textContent =
            `Tiempos de trabajo registrados en la etapa de ${stageName}.`;

        return;
    }

    titleElement.textContent = "Análisis comparativo — Promedios por etapa";
    subtitleElement.textContent =
        "Comparación general de todas las etapas del mes seleccionado.";
}

function renderCurrentAnalysis() {

    const wheels = typeof getWheels === "function" ? getWheels() : [];
    const canvas = document.getElementById("productivityChartCanvas");
    const monthKey = currentAnalysis.monthKey || getCurrentMonthKey();

    if (!canvas || typeof Chart === "undefined") {
        return;
    }

    if (currentAnalysis.mode === ANALYSIS_MODES.STAGE) {

        const stageName = resolveStageNameForAnalysis(wheels, monthKey);

        if (!stageName) {
            return;
        }

        currentAnalysis.stageName = stageName;
    }

    updateModalHeader(currentAnalysis.mode, currentAnalysis.stageName);

    destroyProductivityChart();

    let chartConfig;
    let stats;
    let averageLabel = "Promedio etapa:";

    if (currentAnalysis.mode === ANALYSIS_MODES.WHEEL) {

        const entries = buildGroupedWheelEntries(
            wheels,
            monthKey,
            (wheel) => getWheelTotalProcessMinutes(wheel)
        );

        chartConfig = buildGroupedBarChartConfig(entries);
        stats = computeEntryStats(entries);
        averageLabel = "Promedio total:";

    } else if (currentAnalysis.mode === ANALYSIS_MODES.STAGE) {

        const stageName = currentAnalysis.stageName;

        const entries = buildGroupedWheelEntries(
            wheels,
            monthKey,
            (wheel) => getStageMinutesForWheel(wheel, stageName)
        );

        chartConfig = buildGroupedBarChartConfig(entries);
        stats = computeEntryStats(entries);

        if (stats.totalAnalyzed > 0) {

            stats.averageMinutes = averageStageTime(
                entries.map((entry) => entry.wheel),
                stageName
            );
        }

    } else {

        chartConfig = buildStagesOverviewChartConfig(wheels, monthKey);

        const filteredWheels = filterWheelsByMonth(wheels, monthKey);
        const stageAverages = getHistoricalAverageStageTimes(filteredWheels);
        const averageValues = PROCESS_STAGES
            .map((stageName) => stageAverages[stageName])
            .filter((value) => value !== null && value !== undefined);

        stats = {
            activeCount: filteredWheels.filter((wheel) => isWheelActive(wheel)).length,
            closedCount: filteredWheels.filter((wheel) => isWheelProcessed(wheel)).length,
            averageMinutes: averageValues.length === 0
                ? null
                : Math.round(
                    averageValues.reduce((sum, value) => sum + value, 0) /
                    averageValues.length
                ),
            maxEntry: null,
            minEntry: null,
            totalAnalyzed: filteredWheels.length
        };

        averageLabel = "Promedio general:";
    }

    productivityChartInstance = new Chart(canvas.getContext("2d"), chartConfig);
    productivityChartInstance.$groupBoundaryIndex = chartConfig.$groupBoundaryIndex;

    renderSummaryPanel(monthKey, stats, averageLabel);
}

function showAnalysisModal(mode, options = {}) {

    const modalElement = document.getElementById("productivityChartModal");
    const wheels = typeof getWheels === "function" ? getWheels() : [];
    const monthKeys = getAvailableMonthKeys(wheels);
    const monthKey = options.monthKey || monthKeys[0] || getCurrentMonthKey();

    if (!modalElement) {
        return;
    }

    currentAnalysis = {
        mode,
        stageName: options.stageName ?? null,
        monthKey,
        stageSource: options.stageSource ?? "fixed"
    };

    populateMonthSelector(monthKeys, monthKey);
    renderCurrentAnalysis();

    if (!productivityChartModal) {
        productivityChartModal = new bootstrap.Modal(modalElement);
    }

    productivityChartModal.show();
}

function bindProductivityKpiCard(elementId, chartType) {

    const card = document.getElementById(elementId);

    if (!card) {
        return;
    }

    const openChart = () => {

        openProductivityChart(chartType);
    };

    card.addEventListener("click", openChart);

    card.addEventListener("keydown", (event) => {

        if (event.key === "Enter" || event.key === " ") {

            event.preventDefault();
            openChart();
        }
    });
}

export function openStageComparativeAnalysis(stageName, monthKey = null) {

    if (!stageName) {
        return;
    }

    showAnalysisModal(ANALYSIS_MODES.STAGE, {
        stageName,
        monthKey,
        stageSource: "fixed"
    });
}

export function openProductivityChart(type) {

    const wheels = typeof getWheels === "function" ? getWheels() : [];

    if (type === "wheel-time") {

        showAnalysisModal(ANALYSIS_MODES.WHEEL);
        return;
    }

    if (type === "slowest-stage") {

        const monthKey = getCurrentMonthKey();
        const slowestStageResult = slowestStage(filterWheelsByMonth(wheels, monthKey));

        if (!slowestStageResult) {
            window.alert("No hay datos suficientes para la etapa más lenta del mes seleccionado.");
            return;
        }

        showAnalysisModal(ANALYSIS_MODES.STAGE, {
            stageName: slowestStageResult.stage,
            monthKey,
            stageSource: "slowest-by-month"
        });

        return;
    }

    if (type === "stage-average") {

        showAnalysisModal(ANALYSIS_MODES.STAGES_OVERVIEW);
    }
}

function bindStageQuickViewGrid(gridId, stageNameSelector) {

    const grid = document.getElementById(gridId);

    if (!grid) {
        return;
    }

    grid.addEventListener("click", (event) => {

        const card = event.target.closest(stageNameSelector);

        if (!card) {
            return;
        }

        const stageNameElement = card.querySelector(
            ".historical-stage-name, .operational-stage-name"
        );
        const stageName = stageNameElement?.textContent?.trim();

        if (stageName) {
            openStageComparativeAnalysis(stageName);
        }
    });
}

function printProductivityChart() {

    const canvas = document.getElementById("productivityChartCanvas");

    if (!canvas) {
        return;
    }

    const printWindow = window.open("", "_blank");

    if (!printWindow) {
        return;
    }

    printWindow.document.write(`
        <!DOCTYPE html>
        <html lang="es">
            <head>
                <title>WheelTrack — Gráfica analítica</title>
                <style>
                    body {
                        margin: 24px;
                        font-family: sans-serif;
                        text-align: center;
                    }
                    img {
                        max-width: 100%;
                        height: auto;
                    }
                </style>
            </head>
            <body>
                <h1>${document.getElementById("productivityChartTitle")?.textContent || "Gráfica analítica"}</h1>
                <img src="${canvas.toDataURL("image/png")}" alt="Gráfica analítica">
            </body>
        </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
}

function downloadProductivityChartPng() {

    const canvas = document.getElementById("productivityChartCanvas");

    if (!canvas) {
        return;
    }

    const link = document.createElement("a");
    const title = document.getElementById("productivityChartTitle")?.textContent
        || "wheeltrack-analytics";

    link.download = `${title.toLowerCase().replace(/\s+/g, "-")}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
}

export function initializeProductivityCharts(getWheelsFn) {

    if (typeof getWheelsFn !== "function") {
        return;
    }

    getWheels = getWheelsFn;

    const modalElement = document.getElementById("productivityChartModal");
    const monthSelect = document.getElementById("productivityMonthSelect");

    if (modalElement) {

        productivityChartModal = new bootstrap.Modal(modalElement);

        modalElement.addEventListener("hidden.bs.modal", () => {

            destroyProductivityChart();
        });
    }

    if (monthSelect) {

        monthSelect.addEventListener("change", (event) => {

            currentAnalysis.monthKey = event.target.value;
            renderCurrentAnalysis();
        });
    }

    bindProductivityKpiCard("averageWheelTimeCard", "wheel-time");
    bindProductivityKpiCard("slowestStageCard", "slowest-stage");
    bindProductivityKpiCard("stageAveragesCard", "stage-average");

    bindStageQuickViewGrid("stageAveragesGrid", ".operational-stage-card");

    document.getElementById("btnPrintProductivityChart")
        ?.addEventListener("click", printProductivityChart);

    document.getElementById("btnDownloadProductivityChartPng")
        ?.addEventListener("click", downloadProductivityChartPng);

    window.openProductivityChart = openProductivityChart;
    window.openStageComparativeAnalysis = openStageComparativeAnalysis;
}
