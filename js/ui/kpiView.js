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
}
