import {
    appendCreationHistory,
    appendUpdateHistory,
    createFinalPressureEvent,
    createInitialPressureEvent,
    createInspectorRegisteredEvent,
    createServiceableRegisteredEvent,
    createStageChangeEvent,
    createTireAssignmentEvent,
    normalizeWheel
} from "./historyModel.js";
import {
    advanceProcess,
    completeStageTiming,
    completeSubstage,
    createProcessState,
    createStageTiming,
    getCurrentStage,
    getStageIndicatorColor,
    normalizeProcessState,
    normalizeStageTiming
} from "./processModel.js";

// ==========================================
// TIPO DE RUEDA
// ==========================================

export const WHEEL_TYPES = ["NW", "MW"];

export const DEFAULT_WHEEL_TYPE = "MW";

export function normalizeWheelType(wheelType) {

    if (wheelType === "NW" || wheelType === "MW") {
        return wheelType;
    }

    return DEFAULT_WHEEL_TYPE;
}

export function getWheelTypeLabel(wheelType) {

    const normalizedType = normalizeWheelType(wheelType);

    if (normalizedType === "NW") {
        return "NW (Nariz)";
    }

    return "MW (Principal)";
}

export function normalizeWheelWheelType(wheel) {

    return {
        ...wheel,
        wheelType: normalizeWheelType(wheel.wheelType)
    };
}

// ==========================================
// CAJAS INTELIGENTES
// ==========================================

export const TOTAL_BOXES = 20;

const ALMACEN_STAGE = "Almacén";

const COMPLETED_STAGE_STATUS = "Completada";

export function createBoxData() {

    return {
        boxNumber: null,
        assignedDate: null
    };
}

export function normalizeBoxData(boxData) {

    if (!boxData || typeof boxData !== "object") {
        return createBoxData();
    }

    if (boxData.boxNumber === null || boxData.boxNumber === undefined || boxData.boxNumber === "") {
        return {
            boxNumber: null,
            assignedDate: boxData.assignedDate ?? null
        };
    }

    const boxNumber = Number(boxData.boxNumber);

    if (
        Number.isNaN(boxNumber) ||
        boxNumber < 1 ||
        boxNumber > TOTAL_BOXES
    ) {
        return createBoxData();
    }

    return {
        boxNumber,
        assignedDate: boxData.assignedDate ?? null
    };
}

export function hasBoxData(boxData) {

    return normalizeBoxData(boxData).boxNumber !== null;
}

export function formatBoxLabel(boxData) {

    const normalizedBox = normalizeBoxData(boxData);

    if (!hasBoxData(normalizedBox)) {
        return "Sin caja";
    }

    return `CAJA ${normalizedBox.boxNumber}`;
}

export function normalizeWheelBoxData(wheel) {

    return {
        ...wheel,
        boxData: normalizeBoxData(wheel.boxData)
    };
}

export function isAlmacenStageCompleted(process) {

    const normalizedProcess = normalizeProcessState(process);
    const almacenStage = normalizedProcess.stages.find(
        (stageState) => stageState.stage === ALMACEN_STAGE
    );

    return almacenStage?.status === COMPLETED_STAGE_STATUS;
}

export function isWheelOccupyingBox(wheel) {

    if (!hasBoxData(wheel.boxData)) {
        return false;
    }

    return !isAlmacenStageCompleted(wheel.process);
}

export function getOccupiedBoxNumbers(wheels, excludeWheelIndex = null) {

    return wheels.flatMap((wheel, index) => {

        if (excludeWheelIndex !== null && index === excludeWheelIndex) {
            return [];
        }

        if (!isWheelOccupyingBox(wheel)) {
            return [];
        }

        return [normalizeBoxData(wheel.boxData).boxNumber];
    });
}

export function getAvailableBoxNumbers(wheels, excludeWheelIndex = null) {

    const occupiedBoxes = new Set(getOccupiedBoxNumbers(wheels, excludeWheelIndex));

    return Array.from(
        { length: TOTAL_BOXES },
        (_, index) => index + 1
    ).filter((boxNumber) => !occupiedBoxes.has(boxNumber));
}

export function validateBoxAssignment(wheels, boxNumber, excludeWheelIndex = null) {

    const normalizedBoxNumber = Number(boxNumber);

    if (
        Number.isNaN(normalizedBoxNumber) ||
        normalizedBoxNumber < 1 ||
        normalizedBoxNumber > TOTAL_BOXES
    ) {
        return false;
    }

    return getAvailableBoxNumbers(wheels, excludeWheelIndex).includes(normalizedBoxNumber);
}

function buildBoxDataFromForm(data, existingBoxData = null) {

    const normalizedExisting = normalizeBoxData(existingBoxData);
    const normalizedBoxNumber = Number(data.boxNumber);
    const boxNumber = (
        Number.isNaN(normalizedBoxNumber) ||
        normalizedBoxNumber < 1 ||
        normalizedBoxNumber > TOTAL_BOXES
    )
        ? null
        : normalizedBoxNumber;

    let assignedDate = normalizedExisting.assignedDate;

    if (boxNumber !== null && boxNumber !== normalizedExisting.boxNumber) {

        assignedDate = data.fechaRecepcion || new Date().toISOString().slice(0, 10);
    }

    if (boxNumber !== null && !assignedDate) {

        assignedDate = data.fechaRecepcion || new Date().toISOString().slice(0, 10);
    }

    return {
        boxNumber,
        assignedDate
    };
}

// ==========================================
// ESTADO OPERACIONAL DE ÓRDENES
// ==========================================

export function createOperationalStatus() {

    return {
        active: true,
        closedAt: null
    };
}

export function normalizeOperationalStatus(operationalStatus) {

    if (!operationalStatus || typeof operationalStatus !== "object") {
        return createOperationalStatus();
    }

    if (operationalStatus.active === false) {

        return {
            active: false,
            closedAt: operationalStatus.closedAt ?? null
        };
    }

    return {
        active: true,
        closedAt: operationalStatus.closedAt ?? null
    };
}

export function normalizeWheelOperationalStatus(wheel) {

    return {
        ...wheel,
        operationalStatus: normalizeOperationalStatus(wheel.operationalStatus)
    };
}

export function isWheelClosed(wheel) {

    return normalizeOperationalStatus(wheel.operationalStatus).active === false;
}

export function isWheelActive(wheel) {

    return !isWheelClosed(wheel);
}

export function closeWheelOrder(wheel) {

    return {
        ...wheel,
        operationalStatus: {
            active: false,
            closedAt: new Date().toISOString()
        }
    };
}

export function validateWheelClosure(wheel) {

    const missingFields = [];
    const tireAssignment = normalizeTireAssignment(wheel.tireAssignment);
    const pressureData = normalizePressureData(wheel.pressureData);
    const inspectorData = normalizeInspectorData(wheel.inspectorData);

    if (!tireAssignment.serial || !tireAssignment.partNumber) {
        missingFields.push("Caucho asignado");
    }

    if (pressureData.initialPressure === null) {
        missingFields.push("Presión inicial");
    }

    if (pressureData.finalPressure === null) {
        missingFields.push("Presión final");
    }

    if (!inspectorData.inspectorName) {
        missingFields.push("Inspector responsable");
    }

    if (!hasServiceableData(wheel.serviceableData)) {
        missingFields.push("Documento de serviciable");
    }

    return {
        valid: missingFields.length === 0,
        missingFields
    };
}

export function getWheelTotalProcessMinutes(wheel) {

    const stageTiming = normalizeStageTiming(wheel.stageTiming);
    const completedDurations = stageTiming
        .map((entry) => entry.durationMinutes)
        .filter((duration) => duration !== null && duration !== undefined);

    if (completedDurations.length === 0) {
        return null;
    }

    return completedDurations.reduce(
        (total, duration) => total + duration,
        0
    );
}

export function formatClosedDate(closedAt) {

    if (!closedAt) {
        return "-";
    }

    const date = new Date(closedAt);

    if (Number.isNaN(date.getTime())) {
        return closedAt;
    }

    return date.toLocaleString("es-EC", {
        dateStyle: "short",
        timeStyle: "short"
    });
}

// ==========================================
// SERIAL INNER / OUTER
// ==========================================

export function createWheelSerialData() {

    return {
        inner: "",
        outer: ""
    };
}

export function normalizeWheelSerialData(wheelSerialData, legacySerial = "") {

    if (wheelSerialData && typeof wheelSerialData === "object") {

        return {
            inner: (wheelSerialData.inner ?? "").trim(),
            outer: (wheelSerialData.outer ?? "").trim()
        };
    }

    const normalizedLegacy = (legacySerial ?? "").trim();

    return {
        inner: normalizedLegacy,
        outer: ""
    };
}

export function normalizeWheelWheelSerialData(wheel) {

    const wheelSerialData = normalizeWheelSerialData(
        wheel.wheelSerialData,
        wheel.serial
    );

    return {
        ...wheel,
        wheelSerialData,
        serial: wheelSerialData.inner || wheelSerialData.outer || (wheel.serial ?? "")
    };
}

export function getWheelSerialSummary(wheel) {

    const wheelSerialData = normalizeWheelSerialData(
        wheel.wheelSerialData,
        wheel.serial
    );

    if (wheelSerialData.inner && wheelSerialData.outer) {

        return `${wheelSerialData.inner} / ${wheelSerialData.outer}`;
    }

    return wheelSerialData.inner || wheelSerialData.outer || "-";
}

function buildWheelSerialDataFromForm(data) {

    return {
        inner: (data.serialInner ?? "").trim(),
        outer: (data.serialOuter ?? "").trim()
    };
}

// ==========================================
// TIRE OFF
// ==========================================

export function createTireOffData() {

    return {
        serialNumber: ""
    };
}

export function normalizeTireOffData(tireOffData) {

    if (!tireOffData || typeof tireOffData !== "object") {
        return createTireOffData();
    }

    return {
        serialNumber: (tireOffData.serialNumber ?? "").trim()
    };
}

export function hasTireOffData(tireOffData) {

    return !!normalizeTireOffData(tireOffData).serialNumber;
}

export function normalizeWheelTireOffData(wheel) {

    return {
        ...wheel,
        tireOffData: normalizeTireOffData(wheel.tireOffData)
    };
}

function buildTireOffDataFromForm(data) {

    return {
        serialNumber: (data.tireOffSerial ?? "").trim()
    };
}

// ==========================================
// NORMALIZACIÓN DE DATOS
// ==========================================

export function normalizeFormData(raw) {

    return {

        numeroRueda: (raw.numeroRueda ?? "").trim(),
        fechaRecepcion: raw.fechaRecepcion ?? "",
        avion: (raw.avion ?? "").trim(),
        serialInner: (raw.serialInner ?? "").trim(),
        serialOuter: (raw.serialOuter ?? "").trim(),
        tireOffSerial: (raw.tireOffSerial ?? "").trim(),
        fechaIngreso: raw.fechaIngreso ?? "",
        detalle: (raw.detalle ?? "").trim(),
        wp: (raw.wp ?? "").trim(),
        tireChange: raw.tireChange ?? "",
        shopVisit: (raw.shopVisit ?? "").trim(),
        razon: (raw.razon ?? "").trim(),
        estacion: (raw.estacion ?? "").trim(),
        ciclos: (raw.ciclos ?? "").trim(),
        wheelType: raw.wheelType ?? "",
        boxNumber: raw.boxNumber ?? ""
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
        data.serialInner &&
        data.serialOuter &&
        data.fechaIngreso &&
        data.detalle &&
        data.wp &&
        data.tireChange &&
        data.shopVisit &&
        data.razon &&
        data.estacion &&
        data.ciclos &&
        (data.wheelType === "NW" || data.wheelType === "MW") &&
        data.boxNumber &&
        Number(data.boxNumber) >= 1 &&
        Number(data.boxNumber) <= TOTAL_BOXES
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

export function isServiceableSubstageBlocked(wheel, substageName) {

    return substageName === "Serviciable recibido" &&
        !hasServiceableData(wheel.serviceableData);
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

function syncWheelStageSnapshot(wheel) {

    const stage = getCurrentStage(wheel.process);

    wheel.estado = stage ?? "Recepción";
    wheel.color = getStageIndicatorColor(stage);
}

function buildWheelFromData(data) {

    const wheelSerialData = buildWheelSerialDataFromForm(data);

    return {

        numeroRueda: data.numeroRueda,
        fechaRecepcion: data.fechaRecepcion,
        avion: data.avion,
        serial: wheelSerialData.inner || wheelSerialData.outer,
        wheelSerialData,
        tireOffData: buildTireOffDataFromForm(data),
        fechaIngreso: data.fechaIngreso,
        detalle: data.detalle,
        wp: data.wp,
        tireChange: data.tireChange,
        shopVisit: data.shopVisit,
        razon: data.razon,
        estacion: data.estacion,
        ciclos: data.ciclos,
        wheelType: normalizeWheelType(data.wheelType)
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
    wheel.boxData = buildBoxDataFromForm(data);
    wheel.operationalStatus = createOperationalStatus();

    syncWheelStageSnapshot(wheel);

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
    updatedWheel.boxData = normalizeBoxData(
        buildBoxDataFromForm(data, existingWheel.boxData)
    );
    updatedWheel.operationalStatus = normalizeOperationalStatus(
        existingWheel.operationalStatus
    );
    updatedWheel.wheelSerialData = normalizeWheelSerialData(
        buildWheelSerialDataFromForm(data)
    );
    updatedWheel.tireOffData = normalizeTireOffData(
        buildTireOffDataFromForm(data)
    );
    updatedWheel.serial = updatedWheel.wheelSerialData.inner ||
        updatedWheel.wheelSerialData.outer;

    syncWheelStageSnapshot(updatedWheel);

    return updatedWheel;
}

export function advanceWheelStage(wheel) {

    const advanceResult = advanceProcess(wheel.process);

    if (!advanceResult) {
        return null;
    }

    const normalizedWheel = normalizeWheel(wheel);

    const updatedWheel = {
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

    syncWheelStageSnapshot(updatedWheel);

    return updatedWheel;
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

// ==========================================
// VALIDACIÓN PANEL OPERACIONAL
// ==========================================

export function validateTireAssignmentForm(data) {

    const normalizedAssignment = normalizeTireAssignment(data);

    return !!(
        normalizedAssignment.serial &&
        normalizedAssignment.partNumber &&
        normalizedAssignment.issueDate
    );
}

export function validatePressureForm(data) {

    return hasPressureData(normalizePressureData(data));
}

export function validateInspectorForm(data) {

    const normalizedInspector = normalizeInspectorData(data);

    return !!normalizedInspector.inspectorName;
}

export function validateServiceableForm(data) {

    const normalizedServiceable = normalizeServiceableData(data);

    return !!normalizedServiceable.documentNumber;
}

// ==========================================
// ACTUALIZACIÓN PANEL OPERACIONAL
// ==========================================

export function updateWheelTireAssignment(wheel, data) {

    if (!validateTireAssignmentForm(data)) {
        return null;
    }

    const normalizedWheel = normalizeWheel(wheel);
    const tireAssignment = normalizeTireAssignment(data);

    return {
        ...wheel,
        tireAssignment,
        historial: [
            ...normalizedWheel.historial,
            createTireAssignmentEvent(tireAssignment)
        ]
    };
}

export function updateWheelPressureData(wheel, data) {

    if (!validatePressureForm(data)) {
        return null;
    }

    const normalizedWheel = normalizeWheel(wheel);
    const pressureData = normalizePressureData(data);
    const historial = [...normalizedWheel.historial];

    if (
        pressureData.initialPressure !== null ||
        pressureData.initialPressureDate !== null
    ) {
        historial.push(createInitialPressureEvent(pressureData));
    }

    if (
        pressureData.finalPressure !== null ||
        pressureData.finalPressureDate !== null
    ) {
        historial.push(createFinalPressureEvent(pressureData));
    }

    return {
        ...wheel,
        pressureData,
        historial
    };
}

export function updateWheelInspectorData(wheel, data) {

    if (!validateInspectorForm(data)) {
        return null;
    }

    const normalizedWheel = normalizeWheel(wheel);
    const inspectorData = normalizeInspectorData(data);

    return {
        ...wheel,
        inspectorData,
        historial: [
            ...normalizedWheel.historial,
            createInspectorRegisteredEvent(inspectorData)
        ]
    };
}

export function updateWheelServiceableData(wheel, data) {

    if (!validateServiceableForm(data)) {
        return null;
    }

    const normalizedWheel = normalizeWheel(wheel);
    const serviceableData = normalizeServiceableData(data);

    return {
        ...wheel,
        serviceableData,
        historial: [
            ...normalizedWheel.historial,
            createServiceableRegisteredEvent(serviceableData)
        ]
    };
}

export function completeWheelSubstage(wheel, stageName, substageName) {

    if (isServiceableSubstageBlocked(wheel, substageName)) {
        return null;
    }

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

    const updatedWheel = {
        ...wheel,
        process: completeResult.process,
        stageTiming: applyStageTimingAfterCompletion(wheel, completeResult),
        historial
    };

    syncWheelStageSnapshot(updatedWheel);

    return updatedWheel;
}
