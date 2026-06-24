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
// UTILIDADES INTERNAS
// ==========================================

function createStageSubstages(stageName, existingSubstages = []) {

    const catalog = PROCESS_SUBSTAGES[stageName] ?? [];
    const completedByName = new Map(
        existingSubstages.map((substage) => [
            substage.name,
            substage.completed === true
        ])
    );

    return catalog.map((name) => ({

        name,
        completed: completedByName.get(name) ?? false
    }));
}

function cloneStage(stageState) {

    return {
        stage: stageState.stage,
        status: stageState.status,
        substages: stageState.substages.map((substage) => ({
            name: substage.name,
            completed: substage.completed
        }))
    };
}

function activateNextStage(stages, stageIndex) {

    if (stageIndex >= PROCESS_STAGES.length - 1) {
        return null;
    }

    return {
        fromStage: stages[stageIndex].stage,
        toStage: PROCESS_STAGES[stageIndex + 1]
    };
}

// ==========================================
// ESTADO DEL PROCESO
// ==========================================

export function createProcessState() {

    return {

        stages: PROCESS_STAGES.map((stage) => ({

            stage,
            status: stage === INITIAL_STAGE ? INITIAL_STATUS : DEFAULT_STATUS,
            substages: createStageSubstages(stage)
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
                return cloneStage(defaultStage);
            }

            const status = STAGE_STATUS.includes(existingStage.status)
                ? existingStage.status
                : defaultStage.status;

            const substages = createStageSubstages(
                stageName,
                Array.isArray(existingStage.substages)
                    ? existingStage.substages
                    : []
            );

            return {
                stage: stageName,
                status,
                substages
            };
        })
    };
}

export function areAllSubstagesCompleted(stage) {

    if (!Array.isArray(stage.substages) || stage.substages.length === 0) {
        return true;
    }

    return stage.substages.every((substage) => substage.completed === true);
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
// SUBETAPAS
// ==========================================

export function completeSubstage(process, stageName, substageName) {

    const normalizedProcess = normalizeProcessState(process);
    const stageIndex = normalizedProcess.stages.findIndex(
        (stageState) => stageState.stage === stageName
    );

    if (stageIndex === -1) {
        return null;
    }

    const targetStage = normalizedProcess.stages[stageIndex];
    const substageIndex = targetStage.substages.findIndex(
        (substage) => substage.name === substageName
    );

    if (substageIndex === -1) {
        return null;
    }

    if (targetStage.substages[substageIndex].completed) {
        return {
            process: normalizedProcess,
            stageAdvanced: false,
            fromStage: null,
            toStage: null
        };
    }

    const updatedStages = normalizedProcess.stages.map(cloneStage);

    updatedStages[stageIndex].substages[substageIndex].completed = true;

    let stageAdvanced = false;
    let fromStage = null;
    let toStage = null;

    if (areAllSubstagesCompleted(updatedStages[stageIndex])) {

        updatedStages[stageIndex].status = COMPLETED_STATUS;

        const nextStageInfo = activateNextStage(updatedStages, stageIndex);

        if (nextStageInfo) {

            updatedStages[stageIndex + 1].status = INITIAL_STATUS;
            stageAdvanced = true;
            fromStage = nextStageInfo.fromStage;
            toStage = nextStageInfo.toStage;
        }
    }

    return {
        process: { stages: updatedStages },
        stageAdvanced,
        fromStage,
        toStage
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

export function getActiveStageState(process) {

    const normalizedProcess = normalizeProcessState(process);

    return normalizedProcess.stages.find(
        (stageState) => stageState.status === INITIAL_STATUS
    ) ?? null;
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
    const updatedStages = normalizedProcess.stages.map(cloneStage);

    updatedStages[currentIndex].status = COMPLETED_STATUS;
    updatedStages[currentIndex].substages = updatedStages[currentIndex].substages.map(
        (substage) => ({ ...substage, completed: true })
    );

    updatedStages[currentIndex + 1].status = INITIAL_STATUS;

    return {
        process: { stages: updatedStages },
        fromStage,
        toStage
    };
}
