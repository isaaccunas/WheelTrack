// ==========================================
// CONSTANTES DE NEGOCIO
// ==========================================

const DELIVERED_STATE = "Entregada a almacén";

const PENDING_STATES = [
    "Esperando material",
    "Esperando NDT",
    "Bloqueada"
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
        mwCount: distribution.mw
    };
}
