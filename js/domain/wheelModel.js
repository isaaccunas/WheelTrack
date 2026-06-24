import { getColorForState } from "../config/wheelStates.js";
import {
    appendCreationHistory,
    appendUpdateHistory,
    createStageChangeEvent,
    normalizeWheel
} from "./historyModel.js";
import {
    advanceProcess,
    completeSubstage,
    createProcessState,
    normalizeProcessState
} from "./processModel.js";

// ==========================================
// NORMALIZACIÓN DE DATOS
// ==========================================

export function normalizeFormData(raw) {

    return {

        numeroRueda: (raw.numeroRueda ?? "").trim(),
        fechaRecepcion: raw.fechaRecepcion ?? "",
        avion: (raw.avion ?? "").trim(),
        serial: (raw.serial ?? "").trim(),
        fechaIngreso: raw.fechaIngreso ?? "",
        detalle: (raw.detalle ?? "").trim(),
        wp: (raw.wp ?? "").trim(),
        tireChange: raw.tireChange ?? "",
        shopVisit: (raw.shopVisit ?? "").trim(),
        razon: (raw.razon ?? "").trim(),
        estacion: (raw.estacion ?? "").trim(),
        ciclos: (raw.ciclos ?? "").trim(),
        estado: raw.estado ?? ""
    };
}

// ==========================================
// VALIDACIONES DE NEGOCIO
// ==========================================

export function validateWheel(data) {

    return !!(
        data.numeroRueda &&
        data.fechaRecepcion &&
        data.avion &&
        data.serial &&
        data.fechaIngreso &&
        data.detalle &&
        data.wp &&
        data.tireChange &&
        data.shopVisit &&
        data.razon &&
        data.estacion &&
        data.ciclos &&
        data.estado
    );
}

// ==========================================
// CAUCHO ASIGNADO
// ==========================================

export function createTireAssignment() {

    return {
        serial: "",
        partNumber: "",
        issueDate: ""
    };
}

export function normalizeTireAssignment(tireAssignment) {

    if (!tireAssignment || typeof tireAssignment !== "object") {
        return createTireAssignment();
    }

    return {
        serial: (tireAssignment.serial ?? "").trim(),
        partNumber: (tireAssignment.partNumber ?? "").trim(),
        issueDate: tireAssignment.issueDate ?? ""
    };
}

export function hasValidTireAssignment(tireAssignment) {

    const normalizedAssignment = normalizeTireAssignment(tireAssignment);

    return !!(
        normalizedAssignment.serial ||
        normalizedAssignment.partNumber ||
        normalizedAssignment.issueDate
    );
}

export function normalizeWheelTireAssignment(wheel) {

    return {
        ...wheel,
        tireAssignment: normalizeTireAssignment(wheel.tireAssignment)
    };
}

// ==========================================
// REGISTRO DE PRESIONES
// ==========================================

function normalizePressureValue(value) {

    if (value === null || value === undefined || value === "") {
        return null;
    }

    const numericValue = Number(value);

    return Number.isNaN(numericValue) ? null : numericValue;
}

function normalizePressureDate(value) {

    if (value === null || value === undefined || value === "") {
        return null;
    }

    return value;
}

export function createPressureData() {

    return {
        initialPressure: null,
        initialPressureDate: null,
        finalPressure: null,
        finalPressureDate: null
    };
}

export function normalizePressureData(pressureData) {

    if (!pressureData || typeof pressureData !== "object") {
        return createPressureData();
    }

    return {
        initialPressure: normalizePressureValue(pressureData.initialPressure),
        initialPressureDate: normalizePressureDate(pressureData.initialPressureDate),
        finalPressure: normalizePressureValue(pressureData.finalPressure),
        finalPressureDate: normalizePressureDate(pressureData.finalPressureDate)
    };
}

export function hasPressureData(pressureData) {

    const normalizedPressure = normalizePressureData(pressureData);

    return (
        normalizedPressure.initialPressure !== null ||
        normalizedPressure.initialPressureDate !== null ||
        normalizedPressure.finalPressure !== null ||
        normalizedPressure.finalPressureDate !== null
    );
}

export function normalizeWheelPressureData(wheel) {

    return {
        ...wheel,
        pressureData: normalizePressureData(wheel.pressureData)
    };
}

// ==========================================
// CONSTRUCCIÓN DE OBJETOS RUEDA
// ==========================================

function buildWheelFromData(data) {

    return {

        numeroRueda: data.numeroRueda,
        fechaRecepcion: data.fechaRecepcion,
        avion: data.avion,
        serial: data.serial,
        fechaIngreso: data.fechaIngreso,
        detalle: data.detalle,
        wp: data.wp,
        tireChange: data.tireChange,
        shopVisit: data.shopVisit,
        razon: data.razon,
        estacion: data.estacion,
        ciclos: data.ciclos,
        estado: data.estado,
        color: getColorForState(data.estado)
    };
}

export function createWheel(data) {

    const wheel = buildWheelFromData(data);

    wheel.process = createProcessState();
    wheel.tireAssignment = createTireAssignment();
    wheel.pressureData = createPressureData();

    return appendCreationHistory(wheel);
}

export function updateWheel(existingWheel, data) {

    const updatedWheel = appendUpdateHistory(
        existingWheel,
        buildWheelFromData(data)
    );

    updatedWheel.process = normalizeProcessState(existingWheel.process);
    updatedWheel.tireAssignment = normalizeTireAssignment(
        existingWheel.tireAssignment
    );
    updatedWheel.pressureData = normalizePressureData(
        existingWheel.pressureData
    );

    return updatedWheel;
}

export function advanceWheelStage(wheel) {

    const advanceResult = advanceProcess(wheel.process);

    if (!advanceResult) {
        return null;
    }

    const normalizedWheel = normalizeWheel(wheel);

    return {
        ...wheel,
        process: advanceResult.process,
        historial: [
            ...normalizedWheel.historial,
            createStageChangeEvent(
                advanceResult.fromStage,
                advanceResult.toStage
            )
        ]
    };
}

export function completeWheelSubstage(wheel, stageName, substageName) {

    const completeResult = completeSubstage(
        wheel.process,
        stageName,
        substageName
    );

    if (!completeResult) {
        return null;
    }

    const normalizedWheel = normalizeWheel(wheel);
    const historial = [...normalizedWheel.historial];

    if (
        completeResult.stageAdvanced &&
        completeResult.fromStage &&
        completeResult.toStage
    ) {

        historial.push(
            createStageChangeEvent(
                completeResult.fromStage,
                completeResult.toStage
            )
        );
    }

    return {
        ...wheel,
        process: completeResult.process,
        historial
    };
}
