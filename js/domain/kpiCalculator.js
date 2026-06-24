import { normalizeStageTiming } from "./processModel.js";

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

// Valores de la UI actual hasta contar por tipo de rueda (NW/MW)
const DEFAULT_NW_MW_DISTRIBUTION = {
    nw: 2,
    mw: 2
};

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

    return wheels.filter(
        (wheel) => wheel.estado === DELIVERED_STATE
    ).length;
}

export function getWeeklyCount(wheels, referenceDate = new Date()) {

    const { monday, sunday } = getWeekBounds(referenceDate);

    return wheels.filter(
        (wheel) => isDateInRange(wheel.fechaIngreso, monday, sunday)
    ).length;
}

export function getNwMwDistribution(wheels) {

    void wheels;

    return { ...DEFAULT_NW_MW_DISTRIBUTION };
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
        operational: getOperationalMetrics(wheels)
    };
}
