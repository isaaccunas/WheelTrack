import {
    getClosedWheels,
    getHistoricalAverageStageTimes
} from "../domain/kpiCalculator.js";
import { PROCESS_STAGES } from "../domain/processModel.js";
import { getWheelTotalProcessMinutes } from "../domain/wheelModel.js";

const CHART_TITLES = {
    "wheel-time": "Tiempo total por rueda procesada",
    "slowest-stage": "Tiempo promedio por etapa",
    "stage-average": "Promedios por etapa"
};

let productivityChartModal = null;
let productivityChartInstance = null;
let getWheels = null;

function destroyProductivityChart() {

    if (productivityChartInstance) {

        productivityChartInstance.destroy();
        productivityChartInstance = null;
    }
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

function buildWheelTimeChartConfig(wheels) {

    const closedWheels = getClosedWheels(wheels);
    const entries = closedWheels
        .map((wheel) => ({
            label: wheel.numeroRueda || "-",
            minutes: getWheelTotalProcessMinutes(wheel)
        }))
        .filter((entry) => entry.minutes !== null)
        .sort((entryA, entryB) => {

            const numberA = Number(entryA.label);
            const numberB = Number(entryB.label);

            if (!Number.isNaN(numberA) && !Number.isNaN(numberB)) {
                return numberA - numberB;
            }

            return String(entryA.label).localeCompare(String(entryB.label));
        });

    const labels = entries.map((entry) => `Nº ${entry.label}`);
    const data = entries.map((entry) => entry.minutes);

    return {
        type: "bar",
        data: {
            labels,
            datasets: [
                {
                    label: "Tiempo total (min)",
                    data,
                    backgroundColor: "#ff6a00",
                    borderColor: "#d95a00",
                    borderWidth: 1,
                    borderRadius: 6
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
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
        }
    };
}

function buildStageAverageValues(wheels) {

    const stageAverages = getHistoricalAverageStageTimes(wheels);

    return PROCESS_STAGES.map((stageName) => stageAverages[stageName] ?? null);
}

function buildSlowestStageChartConfig(wheels) {

    const labels = PROCESS_STAGES;
    const data = buildStageAverageValues(wheels);

    return {
        type: "bar",
        data: {
            labels,
            datasets: [
                {
                    label: "Promedio (min)",
                    data,
                    backgroundColor: "#1a5276",
                    borderColor: "#154360",
                    borderWidth: 1,
                    borderRadius: 6
                }
            ]
        },
        options: {
            indexAxis: "y",
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    suggestedMax: getSuggestedMax(data),
                    title: {
                        display: true,
                        text: "Minutos"
                    }
                }
            }
        }
    };
}

function buildStageAverageChartConfig(wheels) {

    const labels = PROCESS_STAGES;
    const data = buildStageAverageValues(wheels);

    return {
        type: "line",
        data: {
            labels,
            datasets: [
                {
                    label: "Tiempo promedio (min)",
                    data,
                    borderColor: "#ff6a00",
                    backgroundColor: "rgba(255, 106, 0, 0.18)",
                    pointBackgroundColor: "#ff6a00",
                    pointBorderColor: "#fff",
                    pointRadius: 4,
                    fill: true,
                    tension: 0.35
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
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
        }
    };
}

function bindProductivityKpiCard(elementId, chartType) {

    const card = document.getElementById(elementId);

    if (!card) {
        return;
    }

    card.addEventListener("click", () => {

        openProductivityChart(chartType);
    });

    card.addEventListener("keydown", (event) => {

        if (event.key === "Enter" || event.key === " ") {

            event.preventDefault();
            openProductivityChart(chartType);
        }
    });
}

export function openProductivityChart(type) {

    const modalElement = document.getElementById("productivityChartModal");
    const canvas = document.getElementById("productivityChartCanvas");
    const titleElement = document.getElementById("productivityChartTitle");

    if (!modalElement || !canvas || typeof Chart === "undefined") {
        return;
    }

    const wheels = typeof getWheels === "function" ? getWheels() : [];

    let chartConfig;

    if (type === "wheel-time") {
        chartConfig = buildWheelTimeChartConfig(wheels);
    } else if (type === "slowest-stage") {
        chartConfig = buildSlowestStageChartConfig(wheels);
    } else if (type === "stage-average") {
        chartConfig = buildStageAverageChartConfig(wheels);
    } else {
        return;
    }

    if (titleElement) {
        titleElement.textContent = CHART_TITLES[type] || "Gráfico de productividad";
    }

    destroyProductivityChart();

    productivityChartInstance = new Chart(canvas.getContext("2d"), chartConfig);

    if (!productivityChartModal) {
        productivityChartModal = new bootstrap.Modal(modalElement);
    }

    productivityChartModal.show();
}

export function initializeProductivityCharts(getWheelsFn) {

    if (typeof getWheelsFn !== "function") {
        return;
    }

    getWheels = getWheelsFn;

    const modalElement = document.getElementById("productivityChartModal");

    if (modalElement) {

        productivityChartModal = new bootstrap.Modal(modalElement);

        modalElement.addEventListener("hidden.bs.modal", () => {

            destroyProductivityChart();
        });
    }

    bindProductivityKpiCard("averageWheelTimeCard", "wheel-time");
    bindProductivityKpiCard("slowestStageCard", "slowest-stage");
    bindProductivityKpiCard("stageAveragesCard", "stage-average");

    window.openProductivityChart = openProductivityChart;
}
