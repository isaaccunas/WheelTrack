import { formatDurationMinutes } from "../domain/kpiCalculator.js";
import { PROCESS_SUBSTAGES } from "../domain/processModel.js";
import { getSubstageDurationMinutes } from "../domain/tatModel.js";
import {
    isWheelProcessed,
    normalizeOperationalStatus
} from "../domain/wheelModel.js";

const WHEEL_LINE_COLORS = [
    "#1a5276",
    "#27ae60",
    "#ff6a00",
    "#8e44ad",
    "#2874a6",
    "#d95a00",
    "#16a085",
    "#e74c3c"
];

let stageMicroAnalyticsModal = null;
let stageMicroChartInstance = null;
let getWheels = null;
let currentStageName = null;
let currentMonthKey = null;
let currentWheelFilter = "all";

function destroyStageMicroChart() {

    if (stageMicroChartInstance) {

        stageMicroChartInstance.destroy();
        stageMicroChartInstance = null;
    }
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

function sortWheelNumber(a, b) {

    const numberA = Number(a);
    const numberB = Number(b);

    if (!Number.isNaN(numberA) && !Number.isNaN(numberB)) {
        return numberA - numberB;
    }

    return String(a).localeCompare(String(b));
}

function getAvailableMonthKeys(wheels) {

    const monthKeys = new Set();

    wheels.filter(isWheelProcessed).forEach((wheel) => {

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

function getProcessedWheelsForMonth(wheels, monthKey) {

    return wheels.filter((wheel) => {

        if (!isWheelProcessed(wheel)) {
            return false;
        }

        return getClosedMonthKey(wheel) === monthKey;
    });
}

function getPositiveSubstageMinutes(wheel, stageName, substageName) {

    const minutes = getSubstageDurationMinutes(wheel, stageName, substageName);

    if (minutes === null || minutes === undefined || minutes <= 0) {
        return null;
    }

    return minutes;
}

function buildWheelEntries(wheels, monthKey, wheelFilter) {

    let entries = getProcessedWheelsForMonth(wheels, monthKey)
        .map((wheel, index) => ({ wheel, index }))
        .sort((entryA, entryB) =>
            sortWheelNumber(entryA.wheel.numeroRueda, entryB.wheel.numeroRueda)
        );

    if (wheelFilter !== "all") {
        entries = entries.filter(
            ({ wheel }) => String(wheel.numeroRueda) === wheelFilter
        );
    }

    return entries;
}

function resolveActiveSubstages(stageName, wheelEntries, wheelFilter) {

    const catalog = PROCESS_SUBSTAGES[stageName] ?? [];

    if (wheelFilter !== "all" && wheelEntries.length === 1) {

        return catalog.filter((substageName) =>
            getPositiveSubstageMinutes(wheelEntries[0].wheel, stageName, substageName) !== null
        );
    }

    return catalog.filter((substageName) =>
        wheelEntries.some(({ wheel }) =>
            getPositiveSubstageMinutes(wheel, stageName, substageName) !== null
        )
    );
}

function buildColorMap(wheelEntries) {

    const colorMap = new Map();

    wheelEntries.forEach((entry, index) => {

        colorMap.set(
            entry.wheel.numeroRueda,
            WHEEL_LINE_COLORS[index % WHEEL_LINE_COLORS.length]
        );
    });

    return colorMap;
}

function getStageTotalMinutes(wheel, stageName, substageLabels) {

    const values = substageLabels
        .map((substageName) =>
            getPositiveSubstageMinutes(wheel, stageName, substageName)
        )
        .filter((value) => value !== null);

    if (values.length === 0) {
        return null;
    }

    return values.reduce((sum, value) => sum + value, 0);
}

function computeSubstageAverages(wheelEntries, stageName, substageLabels) {

    return substageLabels.map((substageName) => {

        const values = wheelEntries
            .map(({ wheel }) =>
                getPositiveSubstageMinutes(wheel, stageName, substageName)
            )
            .filter((value) => value !== null);

        return {
            substageName,
            averageMinutes: values.length === 0
                ? null
                : Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)
        };
    });
}

function computeVariability(wheelEntries, stageName, substageLabels) {

    if (wheelEntries.length < 2) {
        return "Baja";
    }

    const coefficients = substageLabels
        .map((substageName) => {

            const values = wheelEntries
                .map(({ wheel }) =>
                    getPositiveSubstageMinutes(wheel, stageName, substageName)
                )
                .filter((value) => value !== null);

            if (values.length < 2) {
                return null;
            }

            const mean = values.reduce((sum, value) => sum + value, 0) / values.length;

            if (mean === 0) {
                return 0;
            }

            const variance = values.reduce(
                (sum, value) => sum + (value - mean) ** 2,
                0
            ) / values.length;

            return Math.sqrt(variance) / mean;
        })
        .filter((value) => value !== null);

    if (coefficients.length === 0) {
        return "Baja";
    }

    const averageCoefficient = coefficients.reduce(
        (sum, value) => sum + value,
        0
    ) / coefficients.length;

    if (averageCoefficient < 0.25) {
        return "Baja";
    }

    if (averageCoefficient < 0.6) {
        return "Media";
    }

    return "Alta";
}

function getSuggestedMax(values) {

    const numericValues = values.filter(
        (value) => value !== null && value !== undefined && !Number.isNaN(value)
    );

    if (numericValues.length === 0) {
        return 10;
    }

    return Math.ceil(Math.max(...numericValues) * 1.15);
}

function renderMicroSummaryPanel(
    wheelEntries,
    stageName,
    substageLabels,
    monthKey
) {

    const summaryElement = document.getElementById("stageMicroAnalyticsSummary");

    if (!summaryElement) {
        return;
    }

    if (wheelEntries.length === 0 || substageLabels.length === 0) {

        summaryElement.innerHTML = `
            <h6 class="productivity-summary-title">
                Resumen microanalítico
            </h6>
            <p class="stage-micro-empty-summary mb-0">
                Sin datos de subetapas para ${formatMonthLabel(monthKey)}.
            </p>
        `;

        return;
    }

    const substageAverages = computeSubstageAverages(
        wheelEntries,
        stageName,
        substageLabels
    ).filter((entry) => entry.averageMinutes !== null);

    const slowest = substageAverages.reduce(
        (current, entry) =>
            !current || entry.averageMinutes > current.averageMinutes
                ? entry
                : current,
        null
    );
    const fastest = substageAverages.reduce(
        (current, entry) =>
            !current || entry.averageMinutes < current.averageMinutes
                ? entry
                : current,
        null
    );

    const stageTotals = wheelEntries
        .map(({ wheel }) => getStageTotalMinutes(wheel, stageName, substageLabels))
        .filter((value) => value !== null);

    const averageTotal = stageTotals.length === 0
        ? null
        : Math.round(
            stageTotals.reduce((sum, value) => sum + value, 0) / stageTotals.length
        );

    summaryElement.innerHTML = `
        <h6 class="productivity-summary-title">
            Resumen microanalítico
        </h6>

        <dl class="productivity-summary-list">
            <div class="productivity-summary-item">
                <dt>Subetapa más lenta:</dt>
                <dd>
                    ${slowest?.substageName ?? "Sin datos"}
                    <span class="productivity-summary-detail">
                        ${formatDurationMinutes(slowest?.averageMinutes ?? null)}
                    </span>
                </dd>
            </div>
            <div class="productivity-summary-item">
                <dt>Subetapa más rápida:</dt>
                <dd>
                    ${fastest?.substageName ?? "Sin datos"}
                    <span class="productivity-summary-detail">
                        ${formatDurationMinutes(fastest?.averageMinutes ?? null)}
                    </span>
                </dd>
            </div>
            <div class="productivity-summary-item">
                <dt>Variabilidad:</dt>
                <dd>${computeVariability(wheelEntries, stageName, substageLabels)}</dd>
            </div>
            <div class="productivity-summary-item">
                <dt>Ruedas analizadas:</dt>
                <dd>${wheelEntries.length}</dd>
            </div>
            <div class="productivity-summary-item">
                <dt>Promedio total:</dt>
                <dd>${formatDurationMinutes(averageTotal)}</dd>
            </div>
        </dl>
    `;
}

function populateMonthSelector(monthKeys, selectedMonthKey) {

    const monthSelect = document.getElementById("stageMicroMonthSelect");

    if (!monthSelect) {
        return;
    }

    monthSelect.innerHTML = monthKeys.map((monthKey) => `

        <option value="${monthKey}" ${monthKey === selectedMonthKey ? "selected" : ""}>
            ${formatMonthLabel(monthKey)}
        </option>

    `).join("");
}

function populateWheelSelector(allMonthEntries, selectedWheelFilter) {

    const wheelSelect = document.getElementById("stageMicroWheelSelect");

    if (!wheelSelect) {
        return;
    }

    const wheelOptions = allMonthEntries.map(({ wheel }) => {

        const wheelNumber = wheel.numeroRueda || "-";

        return `
            <option
                value="${wheelNumber}"
                ${String(wheelNumber) === selectedWheelFilter ? "selected" : ""}>
                #${wheelNumber}
            </option>
        `;
    });

    wheelSelect.innerHTML = `
        <option value="all" ${selectedWheelFilter === "all" ? "selected" : ""}>
            Todas
        </option>
        ${wheelOptions.join("")}
    `;
}

function updateModalHeader(stageName) {

    const titleElement = document.getElementById("stageMicroAnalyticsTitle");
    const subtitleElement = document.getElementById("stageMicroAnalyticsSubtitle");

    if (titleElement) {
        titleElement.textContent = `Microanálisis — ${stageName}`;
    }

    if (subtitleElement) {
        subtitleElement.textContent =
            "Evolución del tiempo registrado entre subetapas del proceso.";
    }
}

function renderStageMicroAnalytics() {

    const wheels = typeof getWheels === "function" ? getWheels() : [];
    const canvas = document.getElementById("stageMicroAnalyticsCanvas");
    const monthKey = currentMonthKey || getCurrentMonthKey();
    const stageName = currentStageName;

    if (!canvas || !stageName || typeof Chart === "undefined") {
        return;
    }

    updateModalHeader(stageName);

    const allMonthEntries = buildWheelEntries(wheels, monthKey, "all");
    populateWheelSelector(allMonthEntries, currentWheelFilter);

    const wheelEntries = buildWheelEntries(wheels, monthKey, currentWheelFilter);
    const substageLabels = resolveActiveSubstages(
        stageName,
        wheelEntries,
        currentWheelFilter
    );

    destroyStageMicroChart();
    renderMicroSummaryPanel(wheelEntries, stageName, substageLabels, monthKey);

    if (wheelEntries.length === 0 || substageLabels.length === 0) {
        return;
    }

    const colorMap = buildColorMap(allMonthEntries);

    const datasets = wheelEntries.map(({ wheel }) => {

        const wheelNumber = wheel.numeroRueda || "-";
        const color = colorMap.get(wheel.numeroRueda) || WHEEL_LINE_COLORS[0];

        return {
            label: `#${wheelNumber}`,
            data: substageLabels.map((substageName) =>
                getPositiveSubstageMinutes(wheel, stageName, substageName)
            ),
            borderColor: color,
            backgroundColor: color,
            pointBackgroundColor: color,
            pointBorderColor: color,
            pointRadius: 5,
            pointHoverRadius: 6,
            borderWidth: 2,
            tension: 0.15,
            fill: false
        };
    });

    const flatValues = datasets.flatMap((dataset) =>
        dataset.data.filter((value) => value !== null && value !== undefined)
    );

    stageMicroChartInstance = new Chart(canvas.getContext("2d"), {
        type: "line",
        data: {
            labels: substageLabels,
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
                    display: currentWheelFilter === "all" && datasets.length > 1,
                    position: "bottom",
                    labels: {
                        usePointStyle: true,
                        boxWidth: 8,
                        padding: 16
                    }
                },
                tooltip: {
                    callbacks: {
                        label(context) {

                            const value = context.parsed.y;

                            if (value === null || value === undefined) {
                                return `${context.dataset.label}: Sin dato`;
                            }

                            return `${context.dataset.label}: ${formatDurationMinutes(value)}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: "Subetapas"
                    },
                    ticks: {
                        autoSkip: false,
                        maxRotation: 45,
                        minRotation: 0
                    }
                },
                y: {
                    beginAtZero: true,
                    suggestedMax: getSuggestedMax(flatValues),
                    title: {
                        display: true,
                        text: "Minutos"
                    }
                }
            }
        }
    });
}

function openStageMicroAnalyticsModal(stageName, monthKey = null) {

    const modalElement = document.getElementById("stageMicroAnalyticsModal");
    const wheels = typeof getWheels === "function" ? getWheels() : [];
    const monthKeys = getAvailableMonthKeys(wheels);

    if (!modalElement || !stageName) {
        return;
    }

    currentStageName = stageName;
    currentMonthKey = monthKey || monthKeys[0] || getCurrentMonthKey();
    currentWheelFilter = "all";

    populateMonthSelector(monthKeys, currentMonthKey);
    renderStageMicroAnalytics();

    if (!stageMicroAnalyticsModal) {
        stageMicroAnalyticsModal = new bootstrap.Modal(modalElement);
    }

    stageMicroAnalyticsModal.show();
}

function bindHistoricalStageGrid() {

    const grid = document.getElementById("historicalStageGrid");

    if (!grid) {
        return;
    }

    grid.addEventListener("click", (event) => {

        const card = event.target.closest(".historical-stage-card");

        if (!card) {
            return;
        }

        const stageName = card.querySelector(".historical-stage-name")
            ?.textContent
            ?.trim();

        if (stageName) {
            openStageMicroAnalyticsModal(stageName);
        }
    });
}

function printStageMicroChart() {

    const canvas = document.getElementById("stageMicroAnalyticsCanvas");

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
                <title>WheelTrack — Microanálisis por subetapas</title>
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
                <h1>${document.getElementById("stageMicroAnalyticsTitle")?.textContent || "Microanálisis"}</h1>
                <img src="${canvas.toDataURL("image/png")}" alt="Microanálisis por subetapas">
            </body>
        </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
}

function downloadStageMicroChartPng() {

    const canvas = document.getElementById("stageMicroAnalyticsCanvas");

    if (!canvas) {
        return;
    }

    const link = document.createElement("a");
    const title = document.getElementById("stageMicroAnalyticsTitle")?.textContent
        || "wheeltrack-microanalytics";

    link.download = `${title.toLowerCase().replace(/\s+/g, "-")}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
}

export function initializeStageMicroAnalyticsModal(getWheelsFn) {

    if (typeof getWheelsFn !== "function") {
        return;
    }

    getWheels = getWheelsFn;

    const modalElement = document.getElementById("stageMicroAnalyticsModal");
    const monthSelect = document.getElementById("stageMicroMonthSelect");
    const wheelSelect = document.getElementById("stageMicroWheelSelect");

    if (modalElement) {

        stageMicroAnalyticsModal = new bootstrap.Modal(modalElement);

        modalElement.addEventListener("hidden.bs.modal", () => {
            destroyStageMicroChart();
        });
    }

    if (monthSelect) {

        monthSelect.addEventListener("change", (event) => {

            currentMonthKey = event.target.value;
            currentWheelFilter = "all";
            renderStageMicroAnalytics();
        });
    }

    if (wheelSelect) {

        wheelSelect.addEventListener("change", (event) => {

            currentWheelFilter = event.target.value;
            renderStageMicroAnalytics();
        });
    }

    bindHistoricalStageGrid();

    document.getElementById("btnPrintStageMicroChart")
        ?.addEventListener("click", printStageMicroChart);

    document.getElementById("btnDownloadStageMicroChartPng")
        ?.addEventListener("click", downloadStageMicroChartPng);

    window.openStageMicroAnalyticsModal = openStageMicroAnalyticsModal;
}
