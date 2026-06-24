// ==========================================
// EVENTOS DE HISTORIAL
// ==========================================

export function createCreationEvent() {

    return {
        fecha: new Date().toISOString(),
        tipo: "CREACION",
        descripcion: "Rueda creada"
    };
}

export function createStatusChangeEvent(oldState, newState) {

    return {
        fecha: new Date().toISOString(),
        tipo: "CAMBIO_ESTADO",
        descripcion: `Estado cambiado de ${oldState} a ${newState}`
    };
}

export function createStageChangeEvent(fromStage, toStage) {

    return {
        fecha: new Date().toISOString(),
        tipo: "CAMBIO_ETAPA",
        descripcion: `Etapa cambiada de ${fromStage} a ${toStage}`
    };
}

export function createTireAssignmentEvent(tireAssignment) {

    return {
        fecha: new Date().toISOString(),
        tipo: "CAUCHO_ASIGNADO",
        descripcion: `Caucho asignado: S/N ${tireAssignment.serial}, P/N ${tireAssignment.partNumber}, emisión ${tireAssignment.issueDate}`
    };
}

export function createInitialPressureEvent(pressureData) {

    const pressureText = pressureData.initialPressure !== null
        ? `${pressureData.initialPressure} psi`
        : "sin valor";

    const dateText = pressureData.initialPressureDate
        ? ` (${pressureData.initialPressureDate})`
        : "";

    return {
        fecha: new Date().toISOString(),
        tipo: "PRESION_INICIAL_REGISTRADA",
        descripcion: `Presión inicial registrada: ${pressureText}${dateText}`
    };
}

export function createFinalPressureEvent(pressureData) {

    const pressureText = pressureData.finalPressure !== null
        ? `${pressureData.finalPressure} psi`
        : "sin valor";

    const dateText = pressureData.finalPressureDate
        ? ` (${pressureData.finalPressureDate})`
        : "";

    return {
        fecha: new Date().toISOString(),
        tipo: "PRESION_FINAL_REGISTRADA",
        descripcion: `Presión final registrada: ${pressureText}${dateText}`
    };
}

export function createInspectorRegisteredEvent(inspectorData) {

    return {
        fecha: new Date().toISOString(),
        tipo: "INSPECTOR_REGISTRADO",
        descripcion: `Inspector registrado: ${inspectorData.inspectorName}${inspectorData.attendedDate ? `, atención ${inspectorData.attendedDate}` : ""}`
    };
}

export function createServiceableRegisteredEvent(serviceableData) {

    return {
        fecha: new Date().toISOString(),
        tipo: "SERVICIABLE_REGISTRADO",
        descripcion: `Serviciable registrado: documento ${serviceableData.documentNumber}${serviceableData.receivedDate ? `, recibido ${serviceableData.receivedDate}` : ""}`
    };
}

// ==========================================
// COMPATIBILIDAD
// ==========================================

export function normalizeWheel(wheel) {

    return {
        ...wheel,
        historial: Array.isArray(wheel.historial) ? wheel.historial : []
    };
}

export function appendCreationHistory(wheel) {

    const normalizedWheel = normalizeWheel(wheel);

    normalizedWheel.historial.push(createCreationEvent());

    return normalizedWheel;
}

export function appendUpdateHistory(existingWheel, updatedWheel) {

    const normalizedExisting = normalizeWheel(existingWheel);
    const normalizedUpdated = normalizeWheel(updatedWheel);

    normalizedUpdated.historial = [...normalizedExisting.historial];

    if (normalizedExisting.estado !== normalizedUpdated.estado) {

        normalizedUpdated.historial.push(
            createStatusChangeEvent(
                normalizedExisting.estado,
                normalizedUpdated.estado
            )
        );
    }

    return normalizedUpdated;
}
