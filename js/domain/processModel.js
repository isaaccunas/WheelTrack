// ==========================================
// ETAPAS DEL PROCESO
// ==========================================

export const PROCESS_STAGES = [

    "Recepción",
    "Desarme",
    "Lavado",
    "Inspección",
    "Espera de Material",
    "Ensamblaje",
    "Inflado",
    "Liberación",
    "Almacén"
];

export const PROCESS_SUBSTAGES = {

    "Recepción": [
        "Registro de ingreso",
        "Verificación documental",
        "Inspección visual inicial"
    ],

    "Desarme": [
        "Remoción de caucho",
        "Desmontaje de componentes",
        "Etiquetado de piezas"
    ],

    "Lavado": [
        "Lavado preliminar",
        "Lavado NDT",
        "Secado"
    ],

    "Inspección": [
        "Inspección visual",
        "NDT",
        "Medición de componentes"
    ],

    "Espera de Material": [
        "Solicitud de partes",
        "Recepción de material",
        "Verificación de partes"
    ],

    "Ensamblaje": [
        "Montaje de componentes",
        "Torque de pernos",
        "Verificación de ensamble"
    ],

    "Inflado": [
        "Montaje de caucho",
        "Inflado y balanceo",
        "Verificación de presión"
    ],

    "Liberación": [
        "Inspección final",
        "Documentación de liberación",
        "Aprobación QA"
    ],

    "Almacén": [
        "Preparación para envío",
        "Entrega a almacén",
        "Cierre de orden"
    ]
};

export const STAGE_STATUS = [

    "Pendiente",
    "En proceso",
    "Completada",
    "Bloqueada"
];

const INITIAL_STAGE = "Recepción";
const INITIAL_STATUS = "En proceso";
const DEFAULT_STATUS = "Pendiente";

// ==========================================
// ESTADO DEL PROCESO
// ==========================================

export function createProcessState() {

    return {

        stages: PROCESS_STAGES.map((stage) => ({

            stage,
            status: stage === INITIAL_STAGE ? INITIAL_STATUS : DEFAULT_STATUS,
            substage: null
        }))
    };
}

export function normalizeProcessState(process) {

    const defaultState = createProcessState();

    if (!process || !Array.isArray(process.stages)) {
        return defaultState;
    }

    const existingStages = new Map(
        process.stages.map((stageState) => [stageState.stage, stageState])
    );

    return {

        stages: PROCESS_STAGES.map((stageName, index) => {

            const existingStage = existingStages.get(stageName);
            const defaultStage = defaultState.stages[index];

            if (!existingStage) {
                return { ...defaultStage };
            }

            const status = STAGE_STATUS.includes(existingStage.status)
                ? existingStage.status
                : defaultStage.status;

            const allowedSubstages = PROCESS_SUBSTAGES[stageName] ?? [];
            const substage = allowedSubstages.includes(existingStage.substage)
                ? existingStage.substage
                : null;

            return {
                stage: stageName,
                status,
                substage
            };
        })
    };
}

// ==========================================
// COMPATIBILIDAD CON RUEDAS
// ==========================================

export function normalizeWheelProcess(wheel) {

    return {
        ...wheel,
        process: normalizeProcessState(wheel.process)
    };
}
