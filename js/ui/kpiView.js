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
}
