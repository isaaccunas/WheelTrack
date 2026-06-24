import { getColorForState } from "../config/wheelStates.js";
import {
    appendCreationHistory,
    appendUpdateHistory,
    createStageChangeEvent,
    normalizeWheel
} from "./historyModel.js";
import {
    advanceProcess,
    completeStageTiming,
    completeSubstage,
    createProcessState,
    createStageTiming,
    normalizeProcessState,
    normalizeStageTiming
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
// INSPECTOR
// ==========================================

function normalizeInspectorDate(value) {

    if (value === null || value === undefined || value === "") {
        return null;
    }

    return value;
}

export function createInspectorData() {

    return {
        requestedDate: null,
        attendedDate: null,
        inspectorName: "",
        observations: ""
    };
}

export function normalizeInspectorData(inspectorData) {

    if (!inspectorData || typeof inspectorData !== "object") {
        return createInspectorData();
    }

    return {
        requestedDate: normalizeInspectorDate(inspectorData.requestedDate),
        attendedDate: normalizeInspectorDate(inspectorData.attendedDate),
        inspectorName: (inspectorData.inspectorName ?? "").trim(),
        observations: (inspectorData.observations ?? "").trim()
    };
}

export function hasInspectorData(inspectorData) {

    const normalizedInspector = normalizeInspectorData(inspectorData);

    return !!(
        normalizedInspector.requestedDate ||
        normalizedInspector.attendedDate ||
        normalizedInspector.inspectorName ||
        normalizedInspector.observations
    );
}

export function normalizeWheelInspectorData(wheel) {

    return {
        ...wheel,
        inspectorData: normalizeInspectorData(wheel.inspectorData)
    };
}

// ==========================================
// SERVICIABLE
// ==========================================

function normalizeServiceableDate(value) {

    if (value === null || value === undefined || value === "") {
        return null;
    }

    return value;
}

export function createServiceableData() {

    return {
        documentNumber: "",
        receivedDate: null,
        observations: ""
    };
}

export function normalizeServiceableData(serviceableData) {

    if (!serviceableData || typeof serviceableData !== "object") {
        return createServiceableData();
    }

    return {
        documentNumber: (serviceableData.documentNumber ?? "").trim(),
        receivedDate: normalizeServiceableDate(serviceableData.receivedDate),
        observations: (serviceableData.observations ?? "").trim()
    };
}

export function hasServiceableData(serviceableData) {

    const normalizedServiceable = normalizeServiceableData(serviceableData);

    return !!(
        normalizedServiceable.documentNumber ||
        normalizedServiceable.receivedDate ||
        normalizedServiceable.observations
    );
}

export function normalizeWheelServiceableData(wheel) {

    return {
        ...wheel,
        serviceableData: normalizeServiceableData(wheel.serviceableData)
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
    wheel.stageTiming = createStageTiming();
    wheel.tireAssignment = createTireAssignment();
    wheel.pressureData = createPressureData();
    wheel.inspectorData = createInspectorData();
    wheel.serviceableData = createServiceableData();

    return appendCreationHistory(wheel);
}

export function updateWheel(existingWheel, data) {

    const updatedWheel = appendUpdateHistory(
        existingWheel,
        buildWheelFromData(data)
    );

    updatedWheel.process = normalizeProcessState(existingWheel.process);
    updatedWheel.stageTiming = normalizeStageTiming(existingWheel.stageTiming);
    updatedWheel.tireAssignment = normalizeTireAssignment(
        existingWheel.tireAssignment
    );
    updatedWheel.pressureData = normalizePressureData(
        existingWheel.pressureData
    );
    updatedWheel.inspectorData = normalizeInspectorData(
        existingWheel.inspectorData
    );
    updatedWheel.serviceableData = normalizeServiceableData(
        existingWheel.serviceableData
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
        stageTiming: completeStageTiming(
            normalizeStageTiming(wheel.stageTiming),
            advanceResult.fromStage,
            advanceResult.toStage
        ),
        historial: [
            ...normalizedWheel.historial,
            createStageChangeEvent(
                advanceResult.fromStage,
                advanceResult.toStage
            )
        ]
    };
}

function applyStageTimingAfterCompletion(wheel, completeResult) {

    let stageTiming = normalizeStageTiming(wheel.stageTiming);

    if (
        completeResult.stageAdvanced &&
        completeResult.fromStage &&
        completeResult.toStage
    ) {

        return completeStageTiming(
            stageTiming,
            completeResult.fromStage,
            completeResult.toStage
        );
    }

    if (completeResult.stageCompleted) {

        return completeStageTiming(
            stageTiming,
            completeResult.stageCompleted,
            null
        );
    }

    return stageTiming;
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
        stageTiming: applyStageTimingAfterCompletion(wheel, completeResult),
        historial
    };
}
