import { formatDurationMinutes } from "../domain/kpiCalculator.js";
import { PROCESS_STAGES, normalizeStageTiming } from "../domain/processModel.js";
import {
    getWheelTotalProcessMinutes,
    isWheelProcessed,
    normalizeOperationalStatus,
    normalizeWheelType
} from "../domain/wheelModel.js";

const STAGE_COLORS = {
    "Recepción": "#1a5276",
    "Desarme": "#2874a6",
    "Lavado": "#2e86c1",
    "Inspección": "#ff6a00",
    "Espera de Material": "#d95a00",
    "Ensamblaje": "#27ae60",
    "Inflado": "#16a085",
    "Liberación": "#8e44ad",
    "Almacén": "#888888"
};

const GENERAL_TREND_LABEL = "Tendencia general del taller";
const CRITICAL_STAGE_MIN_MINUTES = 15;

let historicalTrendsModal = null;
let historicalTrendsChart = null;
let getWheels = null;
let tooltipStatsByDataset = {};
let hiddenStageLabels = new Set();

const filterState = {
    period: "all",
    wheelType: "all",
    showCriticalOnly: true,
    showGeneralTrend: true,
    showMinMax: true
};

const minMaxRangePlugin = {
    id: "minMaxRangePlugin",

    afterDatasetsDraw(chart) {

        if (!chart.$showMinMax) {
            return;
        }

        const { ctx, chartArea, scales: { x, y } } = chart;

        if (!x || !y) {
            return;
        }

        chart.data.datasets.forEach((dataset, datasetIndex) => {

            if (dataset.label === GENERAL_TREND_LABEL) {
                return;
            }

            const meta = chart.getDatasetMeta(datasetIndex);

            if (meta.hidden) {
                return;
            }

            const stageStats = tooltipStatsByDataset[datasetIndex];

            if (!stageStats) {
                return;
            }

            meta.data.forEach((pointElement, dataIndex) => {

                const stats = stageStats[dataIndex];

                if (!stats) {
                    return;
                }

                const xPos = pointElement.x;
                const yMax = y.getPixelForValue(stats.max / 60);
                const yMin = y.getPixelForValue(stats.min / 60);

                ctx.save();
                ctx.strokeStyle = dataset.borderColor;
                ctx.globalAlpha = 0.55;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(xPos, yMax);
                ctx.lineTo(xPos, yMin);
                ctx.stroke();

                ctx.fillStyle = dataset.borderColor;
                ctx.beginPath();
                ctx.arc(xPos, yMax, 3, 0, Math.PI * 2);
                ctx.fill();
                ctx.beginPath();
                ctx.arc(xPos, yMin, 3, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            });
        });
    }
};

function destroyHistoricalTrendsChart() {

    if (historicalTrendsChart) {

        historicalTrendsChart.destroy();
        historicalTrendsChart = null;
    }

    tooltipStatsByDataset = {};
}

function getClosedMonthKey(wheel) {

    const closedAt = normalizeOperationalStatus(wheel.operationalStatus).closedAt;

    if (!closedAt) {
        return null;
    }

    const date = new Date(closedAt);

    if (Number.isNaN(date.getTime())) {
        return null;
    }

    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function formatShortMonthLabel(monthKey) {

    const [year, month] = monthKey.split("-");
    const date = new Date(Number(year), Number(month) - 1, 1);

    if (Number.isNaN(date.getTime())) {
        return monthKey;
    }

    const monthLabel = date.toLocaleDateString("es-EC", { month: "short" });
    const normalizedMonth = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);

    return `${normalizedMonth} ${year}`;
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

function getPeriodLabel(period) {

    const labels = {
        all: "Todos los meses",
        last6: "Últimos 6 meses",
        "current-year": "Año actual",
        "2025": "2025",
        "2026": "2026"
    };

    return labels[period] || "Todos los meses";
}

function getWheelTypeLabel(wheelType) {

    const labels = {
        all: "Todas",
        MW: "MW",
        NW: "NW"
    };

    return labels[wheelType] || "Todas";
}

function getAllClosedMonthKeys(wheels) {

    const monthKeys = new Set();

    wheels.filter(isWheelProcessed).forEach((wheel) => {

        const monthKey = getClosedMonthKey(wheel);

        if (monthKey) {
            monthKeys.add(monthKey);
        }
    });

    return [...monthKeys].sort();
}

function filterMonthKeysByPeriod(allMonthKeys, period) {

    const currentYear = new Date().getFullYear();

    if (period === "all") {
        return allMonthKeys;
    }

    if (period === "last6") {
        return allMonthKeys.slice(-6);
    }

    if (period === "current-year") {
        return allMonthKeys.filter((monthKey) =>
            monthKey.startsWith(String(currentYear))
        );
    }

    if (period === "2025" || period === "2026") {
        return allMonthKeys.filter((monthKey) => monthKey.startsWith(period));
    }

    return allMonthKeys;
}

function getFilteredClosedWheels(wheels, monthKeys, wheelType) {

    let closedWheels = wheels.filter(isWheelProcessed);

    if (wheelType !== "all") {

        closedWheels = closedWheels.filter(
            (wheel) => normalizeWheelType(wheel.wheelType) === wheelType
        );
    }

    return closedWheels.filter((wheel) => {

        const monthKey = getClosedMonthKey(wheel);

        return monthKey && monthKeys.includes(monthKey);
    });
}

function getWheelsClosedInMonth(wheels, monthKey) {

    return wheels.filter((wheel) => getClosedMonthKey(wheel) === monthKey);
}

function getStageDurationsForWheels(wheels, stageName) {

    return wheels.flatMap((wheel) => {

        const stageEntry = normalizeStageTiming(wheel.stageTiming).find(
            (entry) => entry.stage === stageName
        );

        if (
            !stageEntry ||
            stageEntry.durationMinutes === null ||
            stageEntry.durationMinutes === undefined
        ) {
            return [];
        }

        return [stageEntry.durationMinutes];
    });
}

function computeStageStats(wheels, stageName) {

    const durations = getStageDurationsForWheels(wheels, stageName);

    if (durations.length === 0) {
        return null;
    }

    return {
        average: Math.round(
            durations.reduce((sum, value) => sum + value, 0) / durations.length
        ),
        max: Math.max(...durations),
        min: Math.min(...durations),
        count: durations.length
    };
}

function computeOverallStageAverage(filteredWheels, stageName) {

    const stats = computeStageStats(filteredWheels, stageName);

    return stats?.average ?? null;
}

function computeMonthlyWorkshopAverage(wheels, monthKey) {

    const monthWheels = getWheelsClosedInMonth(wheels, monthKey);
    const totals = monthWheels
        .map((wheel) => getWheelTotalProcessMinutes(wheel))
        .filter((value) => value !== null && value !== undefined);

    if (totals.length === 0) {
        return null;
    }

    return Math.round(
        totals.reduce((sum, value) => sum + value, 0) / totals.length
    );
}

function computeStageVariability(monthKeys, filteredWheels, stageName) {

    const monthlyAverages = monthKeys
        .map((monthKey) => {

            const stats = computeStageStats(
                getWheelsClosedInMonth(filteredWheels, monthKey),
                stageName
            );

            return stats?.average ?? null;
        })
        .filter((value) => value !== null && value !== undefined);

    if (monthlyAverages.length < 2) {
        return null;
    }

    const mean = monthlyAverages.reduce((sum, value) => sum + value, 0)
        / monthlyAverages.length;
    const variance = monthlyAverages.reduce(
        (sum, value) => sum + ((value - mean) ** 2),
        0
    ) / monthlyAverages.length;

    return {
        stageName,
        coefficient: Math.sqrt(variance) / mean
    };
}

function buildHistoricalSummary(monthKeys, filteredWheels, wheelType) {

    const variabilityScores = PROCESS_STAGES
        .map((stageName) => computeStageVariability(monthKeys, filteredWheels, stageName))
        .filter((entry) => entry !== null)
        .sort((entryA, entryB) => entryA.coefficient - entryB.coefficient);

    const monthlyWorkshopScores = monthKeys
        .map((monthKey) => {

            const averageMinutes = computeMonthlyWorkshopAverage(
                filteredWheels,
                monthKey
            );

            return averageMinutes === null
                ? null
                : { monthKey, averageMinutes };
        })
        .filter((entry) => entry !== null);

    let bestMonth = null;
    let worstMonth = null;

    monthlyWorkshopScores.forEach((entry) => {

        if (!bestMonth || entry.averageMinutes < bestMonth.averageMinutes) {
            bestMonth = entry;
        }

        if (!worstMonth || entry.averageMinutes > worstMonth.averageMinutes) {
            worstMonth = entry;
        }
    });

    return {
        monthsAnalyzed: monthKeys.length,
        wheelTypeLabel: getWheelTypeLabel(wheelType),
        mostStableStage: variabilityScores[0]?.stageName ?? "Sin datos",
        mostVariableStage:
            variabilityScores[variabilityScores.length - 1]?.stageName ?? "Sin datos",
        bestMonth: bestMonth ? formatMonthLabel(bestMonth.monthKey) : "Sin datos",
        worstMonth: worstMonth ? formatMonthLabel(worstMonth.monthKey) : "Sin datos"
    };
}

function renderHistoricalSummaryPanel(summary) {

    const summaryElement = document.getElementById("historicalTrendsSummary");

    if (!summaryElement) {
        return;
    }

    summaryElement.innerHTML = `
        <h6 class="historical-trends-summary-title">Resumen histórico</h6>

        <dl class="historical-trends-summary-list">
            <div class="historical-trends-summary-item">
                <dt>Meses analizados:</dt>
                <dd>${summary.monthsAnalyzed}</dd>
            </div>
            <div class="historical-trends-summary-item">
                <dt>Tipo:</dt>
                <dd>${summary.wheelTypeLabel}</dd>
            </div>
            <div class="historical-trends-summary-item">
                <dt>Etapa más estable:</dt>
                <dd>${summary.mostStableStage}</dd>
            </div>
            <div class="historical-trends-summary-item">
                <dt>Etapa más variable:</dt>
                <dd>${summary.mostVariableStage}</dd>
            </div>
            <div class="historical-trends-summary-item">
                <dt>Mejor mes:</dt>
                <dd>${summary.bestMonth}</dd>
            </div>
            <div class="historical-trends-summary-item">
                <dt>Peor mes:</dt>
                <dd>${summary.worstMonth}</dd>
            </div>
        </dl>
    `;
}

function shouldIncludeStage(filteredWheels, stageName) {

    if (!filterState.showCriticalOnly) {
        return true;
    }

    const overallAverage = computeOverallStageAverage(filteredWheels, stageName);

    return overallAverage !== null && overallAverage >= CRITICAL_STAGE_MIN_MINUTES;
}

function buildChartConfig(monthKeys, filteredWheels) {

    const labels = monthKeys.map(formatShortMonthLabel);
    const datasets = [];

    tooltipStatsByDataset = {};

    PROCESS_STAGES.forEach((stageName) => {

        if (!shouldIncludeStage(filteredWheels, stageName)) {
            return;
        }

        const stageStatsByMonth = monthKeys.map((monthKey) =>
            computeStageStats(
                getWheelsClosedInMonth(filteredWheels, monthKey),
                stageName
            )
        );

        const datasetIndex = datasets.length;

        datasets.push({
            label: stageName,
            data: stageStatsByMonth.map((stats) =>
                stats ? stats.average / 60 : null
            ),
            borderColor: STAGE_COLORS[stageName] || "#444444",
            backgroundColor: STAGE_COLORS[stageName] || "#444444",
            tension: 0.25,
            pointRadius: 4,
            pointHoverRadius: 6,
            spanGaps: true
        });

        tooltipStatsByDataset[datasetIndex] = stageStatsByMonth;
    });

    if (filterState.showGeneralTrend) {

        const generalTrendStats = monthKeys.map((monthKey) => {

            const monthWheels = getWheelsClosedInMonth(filteredWheels, monthKey);
            const totals = monthWheels
                .map((wheel) => getWheelTotalProcessMinutes(wheel))
                .filter((value) => value !== null && value !== undefined);

            if (totals.length === 0) {
                return null;
            }

            return {
                average: Math.round(
                    totals.reduce((sum, value) => sum + value, 0) / totals.length
                ),
                max: Math.max(...totals),
                min: Math.min(...totals),
                count: totals.length
            };
        });

        const generalTrendIndex = datasets.length;

        datasets.push({
            label: GENERAL_TREND_LABEL,
            data: generalTrendStats.map((stats) =>
                stats ? stats.average / 60 : null
            ),
            borderColor: "#111111",
            backgroundColor: "#111111",
            borderDash: [8, 6],
            borderWidth: 2,
            pointRadius: 0,
            pointHoverRadius: 4,
            tension: 0.2,
            spanGaps: true
        });

        tooltipStatsByDataset[generalTrendIndex] = generalTrendStats;
    }

    return {
        type: "line",
        data: {
            labels,
            datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: "nearest",
                intersect: false
            },
            plugins: {
                legend: {
                    position: "bottom",
                    labels: {
                        usePointStyle: true,
                        boxWidth: 10,
                        padding: 16
                    },
                    onClick(event, legendItem, legend) {

                        const datasetIndex = legendItem.datasetIndex;
                        const chart = legend.chart;
                        const meta = chart.getDatasetMeta(datasetIndex);
                        const datasetLabel = chart.data.datasets[datasetIndex]?.label;

                        meta.hidden = meta.hidden === null
                            ? !chart.data.datasets[datasetIndex].hidden
                            : !meta.hidden;

                        if (datasetLabel && datasetLabel !== GENERAL_TREND_LABEL) {

                            if (meta.hidden) {
                                hiddenStageLabels.add(datasetLabel);
                            } else {
                                hiddenStageLabels.delete(datasetLabel);
                            }
                        }

                        chart.update();
                    }
                },
                tooltip: {
                    callbacks: {
                        title(tooltipItems) {

                            if (tooltipItems.length === 0) {
                                return "";
                            }

                            const item = tooltipItems[0];
                            const monthLabel = item.label;
                            const stageLabel = item.dataset.label;

                            return `${monthLabel}\n${stageLabel}`;
                        },
                        label() {
                            return "";
                        },
                        afterBody(tooltipItems) {

                            if (tooltipItems.length === 0) {
                                return [];
                            }

                            const item = tooltipItems[0];
                            const stats = tooltipStatsByDataset[item.datasetIndex]
                                ?.[item.dataIndex];

                            if (!stats) {
                                return ["Sin datos"];
                            }

                            return [
                                `Promedio: ${formatDurationMinutes(stats.average)}`,
                                `Máximo: ${formatDurationMinutes(stats.max)}`,
                                `Mínimo: ${formatDurationMinutes(stats.min)}`,
                                `Ruedas analizadas: ${stats.count}`
                            ];
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: "Tiempo promedio (horas)"
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: "Meses"
                    }
                }
            }
        },
        plugins: [minMaxRangePlugin],
        $showMinMax: filterState.showMinMax
    };
}

function updateChartTitle(period) {

    const titleElement = document.getElementById("historicalTrendsChartTitle");

    if (!titleElement) {
        return;
    }

    titleElement.textContent =
        `Tendencia histórica por etapa — ${getPeriodLabel(period).toUpperCase()}`;
}

function renderHistoricalTrendsChart() {

    const canvas = document.getElementById("historicalTrendsCanvas");
    const wheels = typeof getWheels === "function" ? getWheels() : [];

    if (!canvas || typeof Chart === "undefined") {
        return;
    }

    const allMonthKeys = getAllClosedMonthKeys(wheels);
    const monthKeys = filterMonthKeysByPeriod(allMonthKeys, filterState.period);
    const filteredWheels = getFilteredClosedWheels(
        wheels,
        monthKeys,
        filterState.wheelType
    );

    destroyHistoricalTrendsChart();
    updateChartTitle(filterState.period);

    if (monthKeys.length === 0) {

        renderHistoricalSummaryPanel({
            monthsAnalyzed: 0,
            wheelTypeLabel: getWheelTypeLabel(filterState.wheelType),
            mostStableStage: "Sin datos",
            mostVariableStage: "Sin datos",
            bestMonth: "Sin datos",
            worstMonth: "Sin datos"
        });

        return;
    }

    const chartConfig = buildChartConfig(monthKeys, filteredWheels);

    historicalTrendsChart = new Chart(canvas.getContext("2d"), chartConfig);
    historicalTrendsChart.$showMinMax = filterState.showMinMax;

    historicalTrendsChart.data.datasets.forEach((dataset, datasetIndex) => {

        if (
            dataset.label !== GENERAL_TREND_LABEL &&
            hiddenStageLabels.has(dataset.label)
        ) {
            historicalTrendsChart.getDatasetMeta(datasetIndex).hidden = true;
        }
    });

    historicalTrendsChart.update();

    renderHistoricalSummaryPanel(
        buildHistoricalSummary(monthKeys, filteredWheels, filterState.wheelType)
    );
}

function syncFilterControls() {

    const periodSelect = document.getElementById("historicalTrendsPeriodSelect");
    const wheelTypeInputs = document.querySelectorAll(
        'input[name="historicalTrendsWheelType"]'
    );
    const criticalCheckbox = document.getElementById("historicalTrendsCriticalOnly");
    const generalTrendCheckbox = document.getElementById("historicalTrendsGeneralTrend");
    const minMaxCheckbox = document.getElementById("historicalTrendsShowMinMax");

    if (periodSelect) {
        periodSelect.value = filterState.period;
    }

    wheelTypeInputs.forEach((input) => {

        input.checked = input.value === filterState.wheelType;
    });

    if (criticalCheckbox) {
        criticalCheckbox.checked = filterState.showCriticalOnly;
    }

    if (generalTrendCheckbox) {
        generalTrendCheckbox.checked = filterState.showGeneralTrend;
    }

    if (minMaxCheckbox) {
        minMaxCheckbox.checked = filterState.showMinMax;
    }
}

export function openHistoricalTrendsModal() {

    const modalElement = document.getElementById("historicalTrendsModal");

    if (!modalElement) {
        return;
    }

    syncFilterControls();
    renderHistoricalTrendsChart();

    if (!historicalTrendsModal) {
        historicalTrendsModal = new bootstrap.Modal(modalElement);
    }

    historicalTrendsModal.show();
}

function printHistoricalTrendsChart() {

    const canvas = document.getElementById("historicalTrendsCanvas");

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
                <title>WheelTrack — Análisis histórico del taller</title>
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
                <h1>Análisis histórico del taller</h1>
                <p>${document.getElementById("historicalTrendsChartTitle")?.textContent || ""}</p>
                <img src="${canvas.toDataURL("image/png")}" alt="Gráfica histórica del taller">
            </body>
        </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
}

function downloadHistoricalTrendsChartPng() {

    const canvas = document.getElementById("historicalTrendsCanvas");

    if (!canvas) {
        return;
    }

    const link = document.createElement("a");

    link.download = "wheeltrack-analisis-historico.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
}

function bindHistoricalDashboardCard() {

    const card = document.getElementById("historicalDashboardCard");

    if (!card) {
        return;
    }

    const openModal = () => {
        openHistoricalTrendsModal();
    };

    card.addEventListener("click", openModal);

    card.addEventListener("keydown", (event) => {

        if (event.key === "Enter" || event.key === " ") {

            event.preventDefault();
            openModal();
        }
    });
}

export function initializeHistoricalTrendsModal(getWheelsFn) {

    if (typeof getWheelsFn !== "function") {
        return;
    }

    getWheels = getWheelsFn;

    const modalElement = document.getElementById("historicalTrendsModal");
    const periodSelect = document.getElementById("historicalTrendsPeriodSelect");
    const wheelTypeInputs = document.querySelectorAll(
        'input[name="historicalTrendsWheelType"]'
    );
    const criticalCheckbox = document.getElementById("historicalTrendsCriticalOnly");
    const generalTrendCheckbox = document.getElementById("historicalTrendsGeneralTrend");
    const minMaxCheckbox = document.getElementById("historicalTrendsShowMinMax");

    if (modalElement) {

        historicalTrendsModal = new bootstrap.Modal(modalElement);

        modalElement.addEventListener("hidden.bs.modal", () => {
            destroyHistoricalTrendsChart();
        });
    }

    periodSelect?.addEventListener("change", (event) => {

        filterState.period = event.target.value;
        renderHistoricalTrendsChart();
    });

    wheelTypeInputs.forEach((input) => {

        input.addEventListener("change", (event) => {

            if (event.target.checked) {
                filterState.wheelType = event.target.value;
                renderHistoricalTrendsChart();
            }
        });
    });

    criticalCheckbox?.addEventListener("change", (event) => {

        filterState.showCriticalOnly = event.target.checked;
        renderHistoricalTrendsChart();
    });

    generalTrendCheckbox?.addEventListener("change", (event) => {

        filterState.showGeneralTrend = event.target.checked;
        renderHistoricalTrendsChart();
    });

    minMaxCheckbox?.addEventListener("change", (event) => {

        filterState.showMinMax = event.target.checked;
        renderHistoricalTrendsChart();
    });

    bindHistoricalDashboardCard();

    document.getElementById("btnPrintHistoricalTrendsChart")
        ?.addEventListener("click", printHistoricalTrendsChart);

    document.getElementById("btnDownloadHistoricalTrendsChartPng")
        ?.addEventListener("click", downloadHistoricalTrendsChartPng);

    window.openHistoricalTrendsModal = openHistoricalTrendsModal;
}
