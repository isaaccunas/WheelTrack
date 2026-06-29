import { DEFAULT_WHEELS } from "./defaultWheels.js";
import { normalizeWheel } from "../domain/historyModel.js";
import { normalizeWheelProcess, normalizeWheelStageTiming } from "../domain/processModel.js";
import {
    normalizeWheelBoxData,
    normalizeWheelBoxAssignments,
    normalizeWheelInspectorData,
    normalizeWheelOperationalStatus,
    normalizeWheelPressureData,
    normalizeWheelServiceableData,
    normalizeWheelTireAssignment,
    normalizeWheelTireOffData,
    normalizeWheelWheelSerialData,
    normalizeWheelWheelType,
    isWheelActive,
    isWheelClosed
} from "../domain/wheelModel.js";
import { loadWheels, saveWheels } from "./storage.js";

// ==========================================
// ESTADO EN MEMORIA
// ==========================================

let wheels = [];

function logWheelOperationalSnapshot(contextLabel) {

    const activeWheels = wheels.filter((wheel) => isWheelActive(wheel));
    const closedWheels = wheels.filter((wheel) => isWheelClosed(wheel));

    console.log(`[WheelTrack][${contextLabel}] ruedas activas:`, activeWheels.length);
    console.log(`[WheelTrack][${contextLabel}] ruedas cerradas:`, closedWheels.length);
    console.log(
        `[WheelTrack][${contextLabel}] operationalStatus:`,
        wheels.map((wheel, index) => ({
            index,
            numeroRueda: wheel.numeroRueda,
            operationalStatus: wheel.operationalStatus
        }))
    );
}

function persistWheels(contextLabel) {

    logWheelOperationalSnapshot(`antes de persistir (${contextLabel})`);

    saveWheels(wheels);

    logWheelOperationalSnapshot(`después de persistir (${contextLabel})`);
}

// ==========================================
// CARGA INICIAL
// ==========================================

export function load() {

    wheels = (loadWheels() || DEFAULT_WHEELS)
        .map(normalizeWheel)
        .map(normalizeWheelProcess)
        .map(normalizeWheelStageTiming)
        .map(normalizeWheelTireAssignment)
        .map(normalizeWheelPressureData)
        .map(normalizeWheelInspectorData)
        .map(normalizeWheelServiceableData)
        .map(normalizeWheelWheelType)
        .map(normalizeWheelBoxData)
        .map(normalizeWheelBoxAssignments)
        .map(normalizeWheelOperationalStatus)
        .map(normalizeWheelWheelSerialData)
        .map(normalizeWheelTireOffData);

    logWheelOperationalSnapshot("después de cargar localStorage (F5)");
}

// ==========================================
// CONSULTAS
// ==========================================

export function getAll() {

    return wheels;
}

export function getById(id) {

    return wheels[id];
}

// ==========================================
// MUTACIONES
// ==========================================

export function add(wheel) {

    wheels.push(wheel);

    persistWheels("add");
}

export function update(id, wheel) {

    wheels[id] = wheel;

    persistWheels("update");
}

export function remove(id) {

    wheels.splice(id, 1);

    persistWheels("remove");
}
