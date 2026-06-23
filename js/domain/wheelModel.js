import { getColorForState } from "../config/wheelStates.js";

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
// CONSTRUCCIÓN DE OBJETOS RUEDA
// ==========================================

export function createWheel(data) {

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
