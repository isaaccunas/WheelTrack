import { formatDurationMinutes } from "../domain/kpiCalculator.js";
import {
    aggregateTatMetrics,
    buildWheelTatMetrics,
    computeOperationalEfficiency,
    TAT_META
} from "../domain/tatModel.js";
import {
    isWheelClosed,
    normalizeOperationalStatus,
    normalizeWheelType
} from "../domain/wheelModel.js";

const TAT_COLORS = {
    good: "#27ae60",
    warning: "#f1c40f",
    critical: "#e74c3c"
};

const ANALYSIS_MODES = {
    MW: "mw",
    NW: "nw",
    WORKSHOP: "workshop"
};

let tatAnalyticsModal = null;
let tatAnalyticsChart = null;
let getWheels = null;
let weeklyTooltipStats = [];

const filterState = {
    mode: ANALYSIS_MODES.WORKSHOP,
    monthKey: null,
    includeExternalTimes: true
};

const tatMetaLinePlugin = {
    id: "tatMetaLinePlugin",

    afterDraw(chart) {

        const {
            ctx,
            chartArea,
            scales: { y }
        } = chart;

        if (!y) {
            return;
        }

        const metaY = y.getPixelForValue(TAT_META);

        if (metaY < chartArea.top || metaY > chartArea.bottom) {
            return;
        }

        ctx.save();
        ctx.beginPath();
        ctx.setLineDash([8, 6]);
        ctx.strokeStyle = TAT_COLORS.good;
        ctx.lineWidth = 2;
        ctx.moveTo(chartArea.left, metaY);
        ctx.lineTo(chartArea.right, metaY);
        ctx.stroke();

        ctx.fillStyle = TAT_COLORS.good;
        ctx.font = "600 11px sans-serif";
        ctx.textAlign = "right";
        ctx.fillText(`Meta TAT ${TAT_META.toFixed(2)}`, chartArea.right - 8, metaY - 8);
        ctx.restore();
    }
};

function destroyTatAnalyticsChart() {

    if (tatAnalyticsChart) {

        tatAnalyticsChart.destroy();
        tatAnalyticsChart = null;
    }

    weeklyTooltipStats = [];
}

function getTatColor(tatValue) {

    if (tatValue === null || tatValue === undefined || Number.isNaN(tatValue)) {
        return TAT_COLORS.good;
    }

    if (tatValue <= TAT_META) {
        return TAT_COLORS.good;
    }

    if (tatValue <= 1.8) {
        return TAT_COLORS.warning;
    }

    return TAT_COLORS.critical;
}

function formatParticipationPercent(participation) {

    if (participation === null || participation === undefined) {
        return "Sin datos";
    }

    return `${Math.round(participation)}%`;
}

function formatTatValue(tatValue) {

    if (tatValue === null || tatValue === undefined) {
        return "Sin datos";
    }

    return `TAT ${tatValue.toFixed(2)}`;
}

function formatEfficiencyPercent(efficiency) {

    if (efficiency === null || efficiency === undefined) {
        return "Sin datos";
    }

    return `${efficiency.toFixed(1)}%`;
}

function computeEfficiency(monthlyTat) {

    return computeOperationalEfficiency(monthlyTat);
}

function renderSummaryMetric(label, value, tooltip = null) {

    const tooltipAttribute = tooltip
        ? ` title="${tooltip}"`
        : "";

    return `
        <div class="tat-summary-item">
            <dt${tooltipAttribute}>${label}</dt>
            <dd>${value}</dd>
        </div>
    `;
}

function getCurrentMonthKey(referenceDate = new Date()) {

    return `${referenceDate.getFullYear()}-${String(referenceDate.getMonth() + 1).padStart(2, "0")}`;
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

function getAvailableMonthKeys(wheels) {

    const monthKeys = new Set();

    wheels.filter(isWheelClosed).forEach((wheel) => {

        const monthKey = getClosedMonthKey(wheel);

        if (monthKey) {
            monthKeys.add(monthKey);
        }
    });

    if (monthKeys.size === 0) {
        monthKeys.add(getCurrentMonthKey());
    }

    return [...monthKeys].sort().reverse();
}

function getWeekIndexInMonth(closedAt, monthKey) {

    const date = new Date(closedAt);

    if (Number.isNaN(date.getTime())) {
        return null;
    }

    const [year, month] = monthKey.split("-");
    const monthDate = new Date(Number(year), Number(month) - 1, 1);

    if (
        date.getFullYear() !== monthDate.getFullYear() ||
        date.getMonth() !== monthDate.getMonth()
    ) {
        return null;
    }

    const day = date.getDate();

    if (day <= 7) {
        return 1;
    }

    if (day <= 14) {
        return 2;
    }

    if (day <= 21) {
        return 3;
    }

    return 4;
}

function filterWheelsForAnalysis(wheels, monthKey, mode) {

    return wheels.filter((wheel) => {

        if (!isWheelClosed(wheel)) {
            return false;
        }

        if (getClosedMonthKey(wheel) !== monthKey) {
            return false;
        }

        if (mode === ANALYSIS_MODES.MW) {
            return normalizeWheelType(wheel.wheelType) === "MW";
        }

        if (mode === ANALYSIS_MODES.NW) {
            return normalizeWheelType(wheel.wheelType) === "NW";
        }

        return true;
    });
}

function buildWeeklyAnalysis(wheels, monthKey, showTotalView) {

    const wheelMetricsList = wheels
        .map((wheel) => buildWheelTatMetrics(wheel))
        .filter((metrics) => metrics !== null);

    const aggregate = aggregateTatMetrics(wheelMetricsList);

    const weeks = [1, 2, 3, 4].map((weekIndex) => {

        const weekWheels = wheels.filter((wheel) => {

            const closedAt = normalizeOperationalStatus(wheel.operationalStatus).closedAt;

            return getWeekIndexInMonth(closedAt, monthKey) === weekIndex;
        });

        const weekMetrics = weekWheels
            .map((wheel) => buildWheelTatMetrics(wheel))
            .filter((metrics) => metrics !== null);

        if (weekMetrics.length === 0) {

            return {
                weekIndex,
                label: `Semana ${weekIndex}`,
                wheelCount: 0,
                tat: null,
                avgMinutes: null
            };
        }

        const chartTatValues = weekMetrics.map((metrics) =>
            showTotalView ? metrics.totalTat : metrics.operationalTat
        );
        const totalMinutes = weekMetrics.reduce(
            (sum, metrics) => sum + metrics.totalMinutes,
            0
        );

        return {
            weekIndex,
            label: `Semana ${weekIndex}`,
            wheelCount: weekMetrics.length,
            tat: chartTatValues.reduce((sum, value) => sum + value, 0)
                / chartTatValues.length,
            avgMinutes: Math.round(totalMinutes / weekMetrics.length)
        };
    });

    const weeksWithWheels = weeks.filter((week) => week.wheelCount > 0);

    const totalWheels = weeksWithWheels.reduce(
        (sum, week) => sum + week.wheelCount,
        0
    );

    const monthlyTat = totalWheels === 0
        ? null
        : weeksWithWheels.reduce(
            (sum, week) => sum + (week.tat * week.wheelCount),
            0
        ) / totalWheels;

    let bestWeek = null;
    let worstWeek = null;

    weeksWithWheels.forEach((week) => {

        if (!bestWeek || week.tat < bestWeek.tat) {
            bestWeek = week;
        }

        if (!worstWeek || week.tat > worstWeek.tat) {
            worstWeek = week;
        }
    });

    return {
        weeks,
        weeksWithWheels,
        totalWheels,
        monthlyTat,
        monthlyAvgMinutes: aggregate.monthlyAvgMinutes,
        aggregate,
        bestWeek,
        worstWeek
    };
}

function populateMonthSelector(monthKeys, selectedMonthKey) {

    const monthSelect = document.getElementById("tatAnalyticsMonthSelect");

    if (!monthSelect) {
        return;
    }

    monthSelect.innerHTML = monthKeys.map((monthKey) => `

        <option value="${monthKey}" ${monthKey === selectedMonthKey ? "selected" : ""}>
            ${formatMonthLabel(monthKey)}
        </option>

    `).join("");
}

function updateModalHeader(mode) {

    const titleElement = document.getElementById("tatAnalyticsTitle");
    const subtitleElement = document.getElementById("tatAnalyticsSubtitle");
    const externalToggleWrap = document.getElementById("tatAnalyticsExternalToggleWrap");

    if (!titleElement || !subtitleElement) {
        return;
    }

    if (mode === ANALYSIS_MODES.MW) {

        titleElement.textContent = "Análisis histórico MW";
        subtitleElement.textContent =
            "Evolución semanal del TAT en ruedas MW cerradas del mes seleccionado.";

    } else if (mode === ANALYSIS_MODES.NW) {

        titleElement.textContent = "Análisis histórico NW";
        subtitleElement.textContent =
            "Evolución semanal del TAT en ruedas NW cerradas del mes seleccionado.";

    } else {

        titleElement.textContent = "Análisis TAT del taller";
        subtitleElement.textContent =
            "Eficiencia operacional del taller basada en TAT real y meta aeronáutica.";
    }

    if (externalToggleWrap) {
        externalToggleWrap.hidden = mode !== ANALYSIS_MODES.WORKSHOP;
    }
}

function renderTypeSummaryPanel(analysis) {

    const summaryElement = document.getElementById("tatAnalyticsSummary");
    const typeLabel = filterState.mode === ANALYSIS_MODES.MW ? "MW" : "NW";

    if (!summaryElement) {
        return;
    }

    const bestWeekText = analysis.bestWeek
        ? `S${analysis.bestWeek.weekIndex}<br><span class="tat-summary-detail">(${formatTatValue(analysis.bestWeek.tat)})</span>`
        : "Sin datos";
    const worstWeekText = analysis.worstWeek
        ? `S${analysis.worstWeek.weekIndex}<br><span class="tat-summary-detail">(${formatTatValue(analysis.worstWeek.tat)})</span>`
        : "Sin datos";
    const avgTimeText = analysis.monthlyAvgMinutes === null
        ? "Sin datos"
        : formatDurationMinutes(Math.round(analysis.monthlyAvgMinutes));

    summaryElement.innerHTML = `
        <h6 class="tat-summary-title">Resumen ${typeLabel}</h6>

        <dl class="tat-summary-list">
            <div class="tat-summary-item">
                <dt>${typeLabel} procesadas:</dt>
                <dd>${analysis.totalWheels}</dd>
            </div>
            <div class="tat-summary-item">
                <dt>Promedio mensual:</dt>
                <dd>${formatTatValue(analysis.monthlyTat)}</dd>
            </div>
            <div class="tat-summary-item">
                <dt>Mejor semana:</dt>
                <dd>${bestWeekText}</dd>
            </div>
            <div class="tat-summary-item">
                <dt>Peor semana:</dt>
                <dd>${worstWeekText}</dd>
            </div>
            <div class="tat-summary-item">
                <dt>Tiempo promedio:</dt>
                <dd>${avgTimeText}</dd>
            </div>
        </dl>
    `;
}

function renderWorkshopSummaryPanel(chartAnalysis, aggregate) {

    const summaryElement = document.getElementById("tatAnalyticsSummary");

    if (!summaryElement) {
        return;
    }

    const efficiency = computeEfficiency(chartAnalysis.monthlyTat);
    const bestWeekText = chartAnalysis.bestWeek
        ? `S${chartAnalysis.bestWeek.weekIndex}<br><span class="tat-summary-detail">(${formatTatValue(chartAnalysis.bestWeek.tat)})</span>`
        : "Sin datos";
    const worstWeekText = chartAnalysis.worstWeek
        ? `S${chartAnalysis.worstWeek.weekIndex}<br><span class="tat-summary-detail">(${formatTatValue(chartAnalysis.worstWeek.tat)})</span>`
        : "Sin datos";

    summaryElement.innerHTML = `
        <h6 class="tat-summary-title">Indicadores operacionales</h6>

        <dl class="tat-summary-list">
            ${renderSummaryMetric(
                "TAT Total:",
                formatTatValue(aggregate.monthlyTotalTat)
            )}
            ${renderSummaryMetric(
                "TAT Operacional:",
                formatTatValue(aggregate.monthlyOperationalTat),
                "Tiempo controlable directamente por el taller."
            )}
            ${renderSummaryMetric(
                "Tiempo Dependiente de Terceros:",
                formatTatValue(aggregate.monthlyThirdPartyTat),
                "Tiempo asociado a inspectores, NDT, almacén y documentación final."
            )}
            ${renderSummaryMetric(
                "Participación de Terceros:",
                formatParticipationPercent(aggregate.participationPercent),
                "Porcentaje del TAT Total que depende de terceros."
            )}
            ${renderSummaryMetric("TAT mensual:", formatTatValue(chartAnalysis.monthlyTat))}
            ${renderSummaryMetric("Meta:", TAT_META.toFixed(2))}
            ${renderSummaryMetric("Eficiencia:", formatEfficiencyPercent(efficiency))}
            ${renderSummaryMetric("Mejor semana:", bestWeekText)}
            ${renderSummaryMetric("Peor semana:", worstWeekText)}
            ${renderSummaryMetric("Ruedas analizadas:", chartAnalysis.totalWheels)}
        </dl>
    `;
}

function buildChartConfig(analysis) {

    const labels = analysis.weeks.map((week) => week.label);
    const data = analysis.weeks.map((week) => week.tat);

    weeklyTooltipStats = analysis.weeks;

    return {
        type: "line",
        data: {
            labels,
            datasets: [
                {
                    label: "TAT semanal",
                    data,
                    tension: 0.3,
                    borderWidth: 3,
                    pointRadius: 6,
                    pointHoverRadius: 8,
                    spanGaps: false,
                    segment: {
                        borderColor(context) {

                            const value = context.p1.parsed.y;

                            return getTatColor(value);
                        }
                    },
                    pointBackgroundColor(context) {

                        return getTatColor(context.parsed.y);
                    },
                    pointBorderColor(context) {

                        return getTatColor(context.parsed.y);
                    }
                }
            ]
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
                    display: false
                },
                tooltip: {
                    callbacks: {
                        title(tooltipItems) {

                            return tooltipItems[0]?.label || "";
                        },
                        label(tooltipItem) {

                            const stats = weeklyTooltipStats[tooltipItem.dataIndex];

                            if (!stats || stats.wheelCount === 0) {
                                return "Sin datos";
                            }

                            return [
                                `Ruedas procesadas: ${stats.wheelCount}`,
                                `TAT semanal: ${stats.tat.toFixed(2)}`,
                                `Tiempo promedio: ${formatDurationMinutes(stats.avgMinutes)}`
                            ];
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    suggestedMin: 0.8,
                    suggestedMax: 2.2,
                    title: {
                        display: true,
                        text: "Valor TAT"
                    },
                    ticks: {
                        maxTicksLimit: 6
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: "Semanas del mes"
                    },
                    ticks: {
                        autoSkip: true,
                        maxTicksLimit: 4
                    }
                }
            }
        },
        plugins: [tatMetaLinePlugin]
    };
}

function renderTatAnalyticsChart() {

    const canvas = document.getElementById("tatAnalyticsCanvas");
    const wheels = typeof getWheels === "function" ? getWheels() : [];
    const monthKey = filterState.monthKey || getCurrentMonthKey();

    if (!canvas || typeof Chart === "undefined") {
        return;
    }

    destroyTatAnalyticsChart();

    const filteredWheels = filterWheelsForAnalysis(
        wheels,
        monthKey,
        filterState.mode
    );

    const totalAnalysis = buildWeeklyAnalysis(filteredWheels, monthKey, true);
    const operationalAnalysis = buildWeeklyAnalysis(filteredWheels, monthKey, false);
    const chartAnalysis = filterState.mode === ANALYSIS_MODES.WORKSHOP &&
        !filterState.includeExternalTimes
        ? operationalAnalysis
        : totalAnalysis;

    if (filterState.mode === ANALYSIS_MODES.WORKSHOP) {

        renderWorkshopSummaryPanel(
            chartAnalysis,
            totalAnalysis.aggregate
        );

    } else {

        renderTypeSummaryPanel(totalAnalysis);
    }

    if (chartAnalysis.totalWheels === 0) {
        return;
    }

    tatAnalyticsChart = new Chart(
        canvas.getContext("2d"),
        buildChartConfig(chartAnalysis)
    );
}

function syncFilterControls() {

    const monthSelect = document.getElementById("tatAnalyticsMonthSelect");
    const externalCheckbox = document.getElementById("tatAnalyticsExternalTimes");

    if (monthSelect && filterState.monthKey) {
        monthSelect.value = filterState.monthKey;
    }

    if (externalCheckbox) {
        externalCheckbox.checked = filterState.includeExternalTimes;
    }
}

function openTatAnalytics(mode, monthKey = null) {

    const modalElement = document.getElementById("tatAnalyticsModal");
    const wheels = typeof getWheels === "function" ? getWheels() : [];
    const monthKeys = getAvailableMonthKeys(wheels);

    if (!modalElement) {
        return;
    }

    filterState.mode = mode;
    filterState.monthKey = monthKey || monthKeys[0] || getCurrentMonthKey();

    if (mode !== ANALYSIS_MODES.WORKSHOP) {
        filterState.includeExternalTimes = true;
    }

    updateModalHeader(mode);
    populateMonthSelector(monthKeys, filterState.monthKey);
    syncFilterControls();
    renderTatAnalyticsChart();

    if (!tatAnalyticsModal) {
        tatAnalyticsModal = new bootstrap.Modal(modalElement);
    }

    tatAnalyticsModal.show();
}

function bindTatCard(elementId, mode) {

    const card = document.getElementById(elementId);

    if (!card) {
        return;
    }

    const openModal = () => {
        openTatAnalytics(mode);
    };

    card.addEventListener("click", openModal);

    card.addEventListener("keydown", (event) => {

        if (event.key === "Enter" || event.key === " ") {

            event.preventDefault();
            openModal();
        }
    });
}

function printTatAnalyticsChart() {

    const canvas = document.getElementById("tatAnalyticsCanvas");

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
                <title>WheelTrack — Análisis TAT</title>
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
                <h1>${document.getElementById("tatAnalyticsTitle")?.textContent || "Análisis TAT"}</h1>
                <img src="${canvas.toDataURL("image/png")}" alt="Gráfica TAT">
            </body>
        </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
}

function downloadTatAnalyticsChartPng() {

    const canvas = document.getElementById("tatAnalyticsCanvas");

    if (!canvas) {
        return;
    }

    const link = document.createElement("a");
    const title = document.getElementById("tatAnalyticsTitle")?.textContent
        || "wheeltrack-tat";

    link.download = `${title.toLowerCase().replace(/\s+/g, "-")}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
}

export function initializeTatAnalyticsModal(getWheelsFn) {

    if (typeof getWheelsFn !== "function") {
        return;
    }

    getWheels = getWheelsFn;

    const modalElement = document.getElementById("tatAnalyticsModal");
    const monthSelect = document.getElementById("tatAnalyticsMonthSelect");
    const externalCheckbox = document.getElementById("tatAnalyticsExternalTimes");

    if (modalElement) {

        tatAnalyticsModal = new bootstrap.Modal(modalElement);

        modalElement.addEventListener("hidden.bs.modal", () => {
            destroyTatAnalyticsChart();
        });
    }

    monthSelect?.addEventListener("change", (event) => {

        filterState.monthKey = event.target.value;
        renderTatAnalyticsChart();
    });

    externalCheckbox?.addEventListener("change", (event) => {

        filterState.includeExternalTimes = event.target.checked;
        renderTatAnalyticsChart();
    });

    bindTatCard("averageMwCard", ANALYSIS_MODES.MW);
    bindTatCard("averageNwCard", ANALYSIS_MODES.NW);
    bindTatCard("workshopEfficiencyCard", ANALYSIS_MODES.WORKSHOP);

    document.getElementById("btnPrintTatAnalyticsChart")
        ?.addEventListener("click", printTatAnalyticsChart);

    document.getElementById("btnDownloadTatAnalyticsChartPng")
        ?.addEventListener("click", downloadTatAnalyticsChartPng);

    window.openTatAnalytics = openTatAnalytics;
}
