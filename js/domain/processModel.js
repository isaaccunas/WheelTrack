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
        "Recepción física",
        "Inspección preliminar",
        "Asignación clasificación de cajas"
    ],

    "Desarme": [
        "Separación caucho-aros",
        "Desarme de pernos"
    ],

    "Lavado": [
        "Lavado pernos",
        "Lavado accesorios",
        "Lavado aros"
    ],

    "Inspección": [
        "Inspección visual",
        "Inspección NDT",
        "Breakaway Torque",
        "Inspección accesorios",
        "Lubricación de rodamientos"
    ],

    "Espera de Material": [
        "Repuesto solicitado",
        "Repuesto recibido",
        "Caucho solicitado"
    ],

    "Ensamblaje": [
        "Caucho asignado",
        "Premontaje",
        "Instalación accesorios",
        "Solicitud de un Inspector",
        "Torqueado"
    ],

    "Inflado": [
        "Inflado inicial",
        "Liquid Test inicial",
        "Instalación de rodamientos",
        "Rack de espera"
    ],

    "Liberación": [
        "Inspector presente solicitado",
        "Presión final",
        "Liquid Test final",
        "Documentación enviada"
    ],

    "Almacén": [
        "Entregada a almacén",
        "Serviciable recibido"
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
const COMPLETED_STATUS = "Completada";

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

// ==========================================
// AVANCE DE ETAPAS
// ==========================================

export function getCurrentStage(process) {

    const normalizedProcess = normalizeProcessState(process);
    const currentStage = normalizedProcess.stages.find(
        (stageState) => stageState.status === INITIAL_STATUS
    );

    return currentStage ? currentStage.stage : null;
}

export function canAdvanceProcess(process) {

    const normalizedProcess = normalizeProcessState(process);
    const currentIndex = normalizedProcess.stages.findIndex(
        (stageState) => stageState.status === INITIAL_STATUS
    );

    if (currentIndex === -1) {
        return false;
    }

    return currentIndex < PROCESS_STAGES.length - 1;
}

export function advanceProcess(process) {

    const normalizedProcess = normalizeProcessState(process);
    const currentIndex = normalizedProcess.stages.findIndex(
        (stageState) => stageState.status === INITIAL_STATUS
    );

    if (currentIndex === -1) {
        return null;
    }

    const fromStage = normalizedProcess.stages[currentIndex].stage;

    if (currentIndex >= PROCESS_STAGES.length - 1) {
        return null;
    }

    const toStage = PROCESS_STAGES[currentIndex + 1];

    const updatedStages = normalizedProcess.stages.map((stageState, index) => {

        if (index === currentIndex) {

            return {
                ...stageState,
                status: COMPLETED_STATUS,
                substage: null
            };
        }

        if (index === currentIndex + 1) {

            return {
                ...stageState,
                status: INITIAL_STATUS,
                substage: null
            };
        }

        return { ...stageState };
    });

    return {
        process: { stages: updatedStages },
        fromStage,
        toStage
    };
}
