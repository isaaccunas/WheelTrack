import {
    getCurrentStage,
    normalizeProcessState,
    normalizeStageTiming,
    PROCESS_STAGES
} from "./processModel.js";
import { normalizeWheelType, normalizeBoxData, normalizeOperationalStatus, isWheelClosed } from "./wheelModel.js";

// ==========================================
// CONSTANTES DE NEGOCIO
// ==========================================

const DELIVERED_STATE = "Entregada a almacén";

const PENDING_STATES = [
    "Esperando material",
    "Esperando NDT",
    "Bloqueada"
];

const OPERATIONAL_STAGE_NAMES = [
    "Recepción",
    "Desarme",
    "Lavado",
    "Inspección",
    "Espera de Material",
    "Ensamblaje",
    "Inflado",
    "Liberación"
];

// ==========================================
// UTILIDADES INTERNAS
// ==========================================

function getWeekBounds(referenceDate = new Date()) {

    const date = new Date(referenceDate);
    const day = date.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;

    const monday = new Date(date);

    monday.setHours(0, 0, 0, 0);
    monday.setDate(date.getDate() + diffToMonday);

    const sunday = new Date(monday);

    sunday.setHours(23, 59, 59, 999);
    sunday.setDate(monday.getDate() + 6);

    return { monday, sunday };
}

function isDateInRange(dateString, start, end) {

    if (!dateString) {
        return false;
    }

    const date = new Date(`${dateString}T00:00:00`);

    return date >= start && date <= end;
}

function getStageDurations(wheels, stageName) {

    return wheels.flatMap((wheel) => {

        const stageTiming = normalizeStageTiming(wheel.stageTiming);
        const stageEntry = stageTiming.find(
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

function averageValues(values) {

    if (values.length === 0) {
        return null;
    }

    const total = values.reduce((sum, value) => sum + value, 0);

    return Math.round(total / values.length);
}

export function formatDurationMinutes(minutes) {

    if (minutes === null || minutes === undefined) {
        return "Sin datos";
    }

    if (minutes < 60) {
        return `${minutes} min`;
    }

    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    if (remainingMinutes === 0) {
        return `${hours} h`;
    }

    return `${hours} h ${remainingMinutes} min`;
}

// ==========================================
// KPIs OPERACIONALES
// ==========================================

export function averageWheelProcessingTime(wheels) {

    const wheelTotals = wheels
        .map((wheel) => {

            const stageTiming = normalizeStageTiming(wheel.stageTiming);
            const completedDurations = stageTiming
                .map((entry) => entry.durationMinutes)
                .filter((duration) => duration !== null && duration !== undefined);

            if (completedDurations.length === 0) {
                return null;
            }

            return completedDurations.reduce(
                (sum, duration) => sum + duration,
                0
            );
        })
        .filter((total) => total !== null);

    return averageValues(wheelTotals);
}

export function averageStageTime(wheels, stageName) {

    return averageValues(getStageDurations(wheels, stageName));
}

export function slowestStage(wheels) {

    let slowestStageName = null;
    let slowestAverage = null;

    OPERATIONAL_STAGE_NAMES.forEach((stageName) => {

        const stageAverage = averageStageTime(wheels, stageName);

        if (
            stageAverage !== null &&
            (slowestAverage === null || stageAverage > slowestAverage)
        ) {

            slowestAverage = stageAverage;
            slowestStageName = stageName;
        }
    });

    if (slowestStageName === null) {
        return null;
    }

    return {
        stage: slowestStageName,
        averageMinutes: slowestAverage
    };
}

export function getOperationalMetrics(wheels) {

    const stageAverages = OPERATIONAL_STAGE_NAMES.reduce((metrics, stageName) => {

        metrics[stageName] = averageStageTime(wheels, stageName);

        return metrics;
    }, {});

    return {
        averageWheelProcessingTime: averageWheelProcessingTime(wheels),
        slowestStage: slowestStage(wheels),
        stageAverages
    };
}

// ==========================================
// KPIs DE FLUJO DEL TALLER
// ==========================================

export function getActiveFlowWheels(wheels) {

    return wheels.filter((wheel) => {

        normalizeProcessState(wheel.process);

        return getCurrentStage(wheel.process) !== null;
    }).length;
}

export function getWheelsCountByStage(wheels) {

    const counts = PROCESS_STAGES.reduce((stageCounts, stageName) => {

        stageCounts[stageName] = 0;

        return stageCounts;
    }, {});

    wheels.forEach((wheel) => {

        normalizeProcessState(wheel.process);

        const currentStage = getCurrentStage(wheel.process);

        if (currentStage && Object.hasOwn(counts, currentStage)) {
            counts[currentStage] += 1;
        }
    });

    return counts;
}

export function getFlowBottleneck(wheels) {

    const wheelsByStage = getWheelsCountByStage(wheels);
    let bottleneckStage = null;
    let maxCount = 0;

    PROCESS_STAGES.forEach((stageName) => {

        const count = wheelsByStage[stageName];

        if (count > maxCount) {

            maxCount = count;
            bottleneckStage = stageName;
        }
    });

    if (maxCount === 0) {
        return null;
    }

    return {
        stage: bottleneckStage,
        wheelCount: maxCount
    };
}

export function getAverageTotalWheelTime(wheels) {

    return averageWheelProcessingTime(wheels);
}

export function getFlowMetrics(wheels) {

    return {
        activeWheels: getActiveFlowWheels(wheels),
        wheelsByStage: getWheelsCountByStage(wheels),
        bottleneck: getFlowBottleneck(wheels),
        averageTotalWheelTime: getAverageTotalWheelTime(wheels)
    };
}

// ==========================================
// KPIs HISTÓRICOS
// ==========================================

export function getClosedWheels(wheels) {

    return wheels.filter((wheel) => isWheelClosed(wheel));
}

function averageTotalTimeByWheelType(wheels, wheelType) {

    const filteredWheels = wheels.filter(
        (wheel) => normalizeWheelType(wheel.wheelType) === wheelType
    );

    return averageWheelProcessingTime(filteredWheels);
}

export function getAverageTotalTimeByMw(wheels) {

    return averageTotalTimeByWheelType(getClosedWheels(wheels), "MW");
}

export function getAverageTotalTimeByNw(wheels) {

    return averageTotalTimeByWheelType(getClosedWheels(wheels), "NW");
}

export function getProcessedWheelsByMonth(wheels) {

    const closedWheels = getClosedWheels(wheels);
    const countsByMonth = {};

    closedWheels.forEach((wheel) => {

        const closedAt = normalizeOperationalStatus(wheel.operationalStatus).closedAt;

        if (!closedAt) {
            return;
        }

        const date = new Date(closedAt);

        if (Number.isNaN(date.getTime())) {
            return;
        }

        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

        countsByMonth[monthKey] = (countsByMonth[monthKey] ?? 0) + 1;
    });

    return Object.entries(countsByMonth)
        .sort(([monthA], [monthB]) => monthB.localeCompare(monthA))
        .map(([month, count]) => ({ month, count }));
}

export function getHistoricalBoxUtilization(wheels) {

    const closedWheels = getClosedWheels(wheels);
    const boxCounts = {};

    closedWheels.forEach((wheel) => {

        const boxNumber = normalizeBoxData(wheel.boxData).boxNumber;

        if (boxNumber === null) {
            return;
        }

        boxCounts[boxNumber] = (boxCounts[boxNumber] ?? 0) + 1;
    });

    return Object.entries(boxCounts)
        .map(([boxNumber, count]) => ({
            boxNumber: Number(boxNumber),
            count
        }))
        .sort((boxA, boxB) => boxB.count - boxA.count);
}

export function getHistoricalAverageStageTime(wheels, stageName) {

    return averageStageTime(getClosedWheels(wheels), stageName);
}

export function getHistoricalAverageStageTimes(wheels) {

    const closedWheels = getClosedWheels(wheels);

    return PROCESS_STAGES.reduce((stageAverages, stageName) => {

        stageAverages[stageName] = averageStageTime(closedWheels, stageName);

        return stageAverages;
    }, {});
}

export function getHistoricallySlowestStage(wheels) {

    const closedWheels = getClosedWheels(wheels);
    let slowestStageName = null;
    let slowestAverage = null;

    PROCESS_STAGES.forEach((stageName) => {

        const stageAverage = averageStageTime(closedWheels, stageName);

        if (
            stageAverage !== null &&
            (slowestAverage === null || stageAverage > slowestAverage)
        ) {

            slowestAverage = stageAverage;
            slowestStageName = stageName;
        }
    });

    if (slowestStageName === null) {
        return null;
    }

    return {
        stage: slowestStageName,
        averageMinutes: slowestAverage
    };
}

function getWheelTimingCompletionRate(wheel) {

    const stageTiming = normalizeStageTiming(wheel.stageTiming);
    const recordedStages = stageTiming.filter(
        (entry) => entry.durationMinutes !== null && entry.durationMinutes !== undefined
    ).length;

    return recordedStages / PROCESS_STAGES.length;
}

export function getGeneralHistoricalEfficiency(wheels) {

    const closedWheels = getClosedWheels(wheels);

    if (closedWheels.length === 0) {
        return null;
    }

    const averageCompletionRate = closedWheels.reduce(
        (total, wheel) => total + getWheelTimingCompletionRate(wheel),
        0
    ) / closedWheels.length;

    return Math.round(averageCompletionRate * 100);
}

export function getHistoricalMetrics(wheels) {

    return {
        averageTotalTimeMw: getAverageTotalTimeByMw(wheels),
        averageTotalTimeNw: getAverageTotalTimeByNw(wheels),
        processedWheelsByMonth: getProcessedWheelsByMonth(wheels),
        boxUtilization: getHistoricalBoxUtilization(wheels),
        stageAverages: getHistoricalAverageStageTimes(wheels),
        slowestStage: getHistoricallySlowestStage(wheels),
        generalEfficiency: getGeneralHistoricalEfficiency(wheels),
        closedWheelCount: getClosedWheels(wheels).length
    };
}

// ==========================================
// KPIs GENERALES
// ==========================================

export function getTotalWheels(wheels) {

    return wheels.length;
}

export function getActiveWheels(wheels) {

    return wheels.filter(
        (wheel) => wheel.estado !== DELIVERED_STATE
    ).length;
}

export function getWheelsInWorkshop(wheels) {

    return getActiveWheels(wheels);
}

export function getPendingWheels(wheels) {

    return wheels.filter(
        (wheel) => PENDING_STATES.includes(wheel.estado)
    ).length;
}

// ==========================================
// KPIs DEL DASHBOARD
// ==========================================

export function getTotalProcessed(wheels) {

    return getClosedWheels(wheels).length;
}

export function getWeeklyCount(wheels, referenceDate = new Date()) {

    const { monday, sunday } = getWeekBounds(referenceDate);

    return wheels.filter(
        (wheel) => isDateInRange(wheel.fechaIngreso, monday, sunday)
    ).length;
}

export function getNwCount(wheels) {

    return wheels.filter(
        (wheel) => normalizeWheelType(wheel.wheelType) === "NW"
    ).length;
}

export function getMwCount(wheels) {

    return wheels.filter(
        (wheel) => normalizeWheelType(wheel.wheelType) === "MW"
    ).length;
}

export function getNwMwDistribution(wheels) {

    return {
        nw: getNwCount(wheels),
        mw: getMwCount(wheels)
    };
}

export function getDashboardKpis(wheels, referenceDate = new Date()) {

    const distribution = getNwMwDistribution(wheels);

    return {

        totalWheels: getTotalWheels(wheels),
        activeWheels: getActiveWheels(wheels),
        wheelsInWorkshop: getWheelsInWorkshop(wheels),
        pendingWheels: getPendingWheels(wheels),
        totalProcessed: getTotalProcessed(wheels),
        weeklyCount: getWeeklyCount(wheels, referenceDate),
        nwCount: distribution.nw,
        mwCount: distribution.mw,
        operational: getOperationalMetrics(wheels),
        flow: getFlowMetrics(wheels),
        historical: getHistoricalMetrics(wheels)
    };
}
