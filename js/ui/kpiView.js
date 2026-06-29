import { formatDurationMinutes } from "../domain/kpiCalculator.js";

// ==========================================
// RENDERIZADO DE KPIs
// ==========================================

function renderOperationalMetrics(operational) {

    const averageWheelElement = document.getElementById("avgWheelProcessingTime");
    const slowestStageElement = document.getElementById("slowestStageMetric");
    const stageAveragesGrid = document.getElementById("stageAveragesGrid");

    if (averageWheelElement) {

        averageWheelElement.textContent = formatDurationMinutes(
            operational.averageWheelProcessingTime
        );
    }

    if (slowestStageElement) {

        if (!operational.slowestStage) {

            slowestStageElement.textContent = "Sin datos";

        } else {

            slowestStageElement.textContent =
                `${operational.slowestStage.stage} (${formatDurationMinutes(
                    operational.slowestStage.averageMinutes
                )})`;
        }
    }

    if (!stageAveragesGrid) {
        return;
    }

    stageAveragesGrid.innerHTML = Object.entries(operational.stageAverages)
        .map(([stageName, averageMinutes]) => `

            <div class="col-lg-3 col-md-4 col-sm-6">

                <div class="operational-stage-card">

                    <span class="operational-stage-name">
                        ${stageName}
                    </span>

                    <strong class="operational-stage-time">
                        ${formatDurationMinutes(averageMinutes)}
                    </strong>

                </div>

            </div>

        `)
        .join("");
}

function renderFlowMetrics(flow) {

    const activeWheelsElement = document.getElementById("activeFlowWheels");
    const bottleneckElement = document.getElementById("flowBottleneckMetric");
    const averageTotalTimeElement = document.getElementById("avgTotalWheelTime");
    const wheelsByStageGrid = document.getElementById("wheelsByStageGrid");

    if (activeWheelsElement) {
        activeWheelsElement.textContent = String(flow.activeWheels);
    }

    if (bottleneckElement) {

        if (!flow.bottleneck) {

            bottleneckElement.textContent = "Sin datos";

        } else {

            bottleneckElement.textContent =
                `${flow.bottleneck.stage} (${flow.bottleneck.wheelCount} ruedas)`;
        }
    }

    if (averageTotalTimeElement) {

        averageTotalTimeElement.textContent = formatDurationMinutes(
            flow.averageTotalWheelTime
        );
    }

    if (!wheelsByStageGrid) {
        return;
    }

    wheelsByStageGrid.innerHTML = Object.entries(flow.wheelsByStage)
        .map(([stageName, wheelCount]) => `

            <div class="col-lg-3 col-md-4 col-sm-6">

                <div class="flow-stage-card">

                    <span class="flow-stage-name">
                        ${stageName}
                    </span>

                    <strong class="flow-stage-count">
                        ${wheelCount}
                    </strong>

                </div>

            </div>

        `)
        .join("");
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

function renderHistoricalMetrics(historical) {

    const avgMwElement = document.getElementById("historicalAvgMw");
    const avgNwElement = document.getElementById("historicalAvgNw");
    const slowestStageElement = document.getElementById("historicalSlowestStage");
    const efficiencyElement = document.getElementById("historicalGeneralEfficiency");
    const monthlyGrid = document.getElementById("historicalMonthlyGrid");
    const stageGrid = document.getElementById("historicalStageGrid");
    const closedCountElement = document.getElementById("historicalClosedCount");

    if (closedCountElement) {

        closedCountElement.textContent =
            `${historical.closedWheelCount} rueda(s) cerrada(s) analizadas`;
    }

    if (avgMwElement) {

        avgMwElement.textContent = formatDurationMinutes(
            historical.averageTotalTimeMw
        );
    }

    if (avgNwElement) {

        avgNwElement.textContent = formatDurationMinutes(
            historical.averageTotalTimeNw
        );
    }

    if (slowestStageElement) {

        if (!historical.slowestStage) {

            slowestStageElement.textContent = "Sin datos";

        } else {

            slowestStageElement.textContent =
                `${historical.slowestStage.stage} (${formatDurationMinutes(
                    historical.slowestStage.averageMinutes
                )})`;
        }
    }

    if (efficiencyElement) {

        efficiencyElement.textContent = historical.generalEfficiency === null
            ? "Sin datos"
            : `${historical.generalEfficiency}%`;
    }

    if (monthlyGrid) {

        if (historical.processedWheelsByMonth.length === 0) {

            monthlyGrid.innerHTML = `
                <div class="col-12">
                    <p class="historical-empty mb-0">Sin datos</p>
                </div>
            `;

        } else {

            monthlyGrid.innerHTML = historical.processedWheelsByMonth
                .map(({ month, count }) => `

                    <div class="col-lg-3 col-md-4 col-sm-6">

                        <div class="historical-metric-card">

                            <span class="historical-metric-name">
                                ${formatMonthLabel(month)}
                            </span>

                            <strong class="historical-metric-value">
                                ${count}
                            </strong>

                        </div>

                    </div>

                `)
                .join("");
        }
    }

    if (stageGrid) {

        stageGrid.innerHTML = Object.entries(historical.stageAverages)
            .map(([stageName, averageMinutes]) => `

                <div class="col-lg-3 col-md-4 col-sm-6">

                    <div class="historical-stage-card">

                        <span class="historical-stage-name">
                            ${stageName}
                        </span>

                        <strong class="historical-stage-time">
                            ${formatDurationMinutes(averageMinutes)}
                        </strong>

                    </div>

                </div>

            `)
            .join("");
    }
}

export function renderKpis(kpis) {

    document.getElementById("totalProcesadas").textContent = kpis.totalProcessed;

    document.getElementById("ruedasSemana").textContent = kpis.weeklyCount;

    const distributionValues = document.querySelectorAll(".distribution strong");

    if (distributionValues.length >= 2) {

        distributionValues[0].textContent = kpis.nwCount;
        distributionValues[1].textContent = kpis.mwCount;
    }

    if (kpis.operational) {

        renderOperationalMetrics(kpis.operational);
    }

    if (kpis.flow) {

        renderFlowMetrics(kpis.flow);
    }

    if (kpis.historical) {

        renderHistoricalMetrics(kpis.historical);
    }
}
