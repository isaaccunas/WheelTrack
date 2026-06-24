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
