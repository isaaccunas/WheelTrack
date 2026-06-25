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

function toIsoTimestamp(timestamp = new Date()) {

    if (timestamp instanceof Date) {
        return timestamp.toISOString();
    }

    return timestamp;
}

function calculateDurationMinutes(startedAt, finishedAt) {

    const startDate = new Date(startedAt);
    const endDate = new Date(finishedAt);

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
        return null;
    }

    return Math.round((endDate.getTime() - startDate.getTime()) / 60000);
}

function cloneStageTimingEntry(entry) {

    return {
        stage: entry.stage,
        startedAt: entry.startedAt,
        finishedAt: entry.finishedAt,
        durationMinutes: entry.durationMinutes
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
// TIEMPOS POR ETAPA
// ==========================================

export function createStageTiming() {

    const startedAt = new Date().toISOString();

    return PROCESS_STAGES.map((stage) => ({

        stage,
        startedAt: stage === INITIAL_STAGE ? startedAt : null,
        finishedAt: null,
        durationMinutes: null
    }));
}

export function normalizeStageTiming(stageTiming) {

    const existingEntries = Array.isArray(stageTiming)
        ? stageTiming
        : [];

    const entriesByStage = new Map(
        existingEntries.map((entry) => [entry.stage, entry])
    );

    return PROCESS_STAGES.map((stage) => {

        const existingEntry = entriesByStage.get(stage);

        if (!existingEntry) {

            return {
                stage,
                startedAt: null,
                finishedAt: null,
                durationMinutes: null
            };
        }

        const durationMinutes = existingEntry.durationMinutes === null ||
            existingEntry.durationMinutes === undefined
            ? null
            : Number(existingEntry.durationMinutes);

        return {
            stage,
            startedAt: existingEntry.startedAt ?? null,
            finishedAt: existingEntry.finishedAt ?? null,
            durationMinutes: Number.isNaN(durationMinutes) ? null : durationMinutes
        };
    });
}

export function completeStageTiming(
    stageTiming,
    completedStage,
    nextStage = null,
    timestamp = new Date()
) {

    const normalizedTiming = normalizeStageTiming(stageTiming)
        .map(cloneStageTimingEntry);

    const finishedAt = toIsoTimestamp(timestamp);
    const completedIndex = normalizedTiming.findIndex(
        (entry) => entry.stage === completedStage
    );

    if (completedIndex === -1) {
        return normalizedTiming;
    }

    const completedEntry = normalizedTiming[completedIndex];

    if (!completedEntry.startedAt) {
        completedEntry.startedAt = finishedAt;
    }

    completedEntry.finishedAt = finishedAt;
    completedEntry.durationMinutes = calculateDurationMinutes(
        completedEntry.startedAt,
        completedEntry.finishedAt
    );

    if (nextStage) {

        const nextIndex = normalizedTiming.findIndex(
            (entry) => entry.stage === nextStage
        );

        if (nextIndex !== -1) {

            normalizedTiming[nextIndex].startedAt =
                normalizedTiming[nextIndex].startedAt ?? finishedAt;
        }
    }

    return normalizedTiming;
}

export function normalizeWheelStageTiming(wheel) {

    let stageTiming = normalizeStageTiming(wheel.stageTiming);
    const activeStage = getCurrentStage(wheel.process);

    if (activeStage) {

        const activeIndex = stageTiming.findIndex(
            (entry) => entry.stage === activeStage
        );

        if (
            activeIndex !== -1 &&
            !stageTiming[activeIndex].startedAt &&
            !stageTiming[activeIndex].finishedAt
        ) {

            stageTiming = stageTiming.map(cloneStageTimingEntry);
            stageTiming[activeIndex].startedAt = new Date().toISOString();
        }
    }

    return {
        ...wheel,
        stageTiming
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
            toStage: null,
            stageCompleted: null
        };
    }

    const updatedStages = normalizedProcess.stages.map(cloneStage);

    updatedStages[stageIndex].substages[substageIndex].completed = true;

    let stageAdvanced = false;
    let fromStage = null;
    let toStage = null;
    let stageCompleted = null;

    if (areAllSubstagesCompleted(updatedStages[stageIndex])) {

        updatedStages[stageIndex].status = COMPLETED_STATUS;
        stageCompleted = updatedStages[stageIndex].stage;

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
        toStage,
        stageCompleted
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

// ==========================================
// MAPEO VISUAL DE ETAPAS (LISTA)
// ==========================================

export const STAGE_INDICATOR_COLORS = {

    "Recepción": "bg-orange",
    "Desarme": "bg-green",
    "Lavado": "bg-yellow",
    "Inspección": "bg-blue",
    "Espera de Material": "bg-red",
    "Ensamblaje": "bg-purple",
    "Inflado": "bg-teal",
    "Liberación": "bg-yellow",
    "Almacén": "bg-gray"
};

export function getStageIndicatorColor(stage) {

    if (!stage) {
        return "bg-gray";
    }

    return STAGE_INDICATOR_COLORS[stage] ?? "bg-gray";
}

export function getWheelListStageLabel(process) {

    const currentStage = getCurrentStage(process);

    if (currentStage) {
        return currentStage;
    }

    const normalizedProcess = normalizeProcessState(process);
    const allCompleted = normalizedProcess.stages.every(
        (stageState) => stageState.status === COMPLETED_STATUS
    );

    if (allCompleted) {
        return "Almacén";
    }

    return "Sin etapa activa";
}

export function getWheelListStageDisplay(wheel) {

    const label = getWheelListStageLabel(wheel.process);

    return {
        label,
        colorClass: getStageIndicatorColor(label === "Sin etapa activa" ? null : label)
    };
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
