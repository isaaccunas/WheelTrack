// ==========================================
// RENDERIZADO DE KPIs
// ==========================================

export function renderKpis(kpis) {

    document.getElementById("totalProcesadas").textContent = kpis.totalProcessed;

    document.getElementById("ruedasSemana").textContent = kpis.weeklyCount;

    const distributionValues = document.querySelectorAll(".distribution strong");

    if (distributionValues.length >= 2) {

        distributionValues[0].textContent = kpis.nwCount;
        distributionValues[1].textContent = kpis.mwCount;
    }
}
