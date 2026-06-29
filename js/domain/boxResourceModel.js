import {
    getActiveStageState,
    getCurrentStage,
    normalizeProcessState,
    PROCESS_STAGES
} from "./processModel.js";
import {
    getWheelSerialSummary,
    hasBoxData,
    isWheelActive,
    isWheelClosed,
    normalizeBoxAssignments,
    normalizeBoxData,
    TOTAL_BOXES
} from "./wheelModel.js";

const PRIMARY_STAGE_PROGRESS = {
    "Recepción": 10,
    "Desarme": 20,
    "Lavado": 40,
    "Inspección": 60,
    "Espera de Material": 80,
    "Ensamblaje": 95
};

const SECONDARY_STAGE_PROGRESS = {
    "Recepción": 10,
    "Desarme": 20,
    "Lavado": 30,
    "Inspección": 40,
    "Espera de Material": 50,
    "Ensamblaje": 70,
    "Inflado": 95
};

export const BOX_USAGE = {
    PERNOS: "PERNOS",
    RODAMIENTOS: "RODAMIENTOS"
};

export const PRIMARY_RELEASE = {
    stage: "Ensamblaje",
    substage: "Premontaje"
};

export const SECONDARY_RELEASE = {
    stage: "Inflado",
    substage: "Instalación de rodamientos"
};

const USAGE_LABELS = {
    PERNOS: "Pernos",
    RODAMIENTOS: "Rodamientos"
};

export function createBoxAssignmentEntry(id, usage, released = false) {

    const normalizedId = Number(id);

    if (
        Number.isNaN(normalizedId) ||
        normalizedId < 1 ||
        normalizedId > TOTAL_BOXES
    ) {
        return null;
    }

    return {
        id: normalizedId,
        usage,
        released: released === true
    };
}

function isSubstageCompleted(process, stageName, substageName) {

    const normalizedProcess = normalizeProcessState(process);
    const stageState = normalizedProcess.stages.find(
        (entry) => entry.stage === stageName
    );

    if (!stageState) {
        return false;
    }

    const substage = stageState.substages?.find(
        (entry) => entry.name === substageName
    );

    return substage?.completed === true;
}

function isStageCompleted(process, stageName) {

    const normalizedProcess = normalizeProcessState(process);
    const stageState = normalizedProcess.stages.find(
        (entry) => entry.stage === stageName
    );

    return stageState?.status === "Completada";
}

function getStageIndex(stageName) {

    return PROCESS_STAGES.indexOf(stageName);
}

function getFurthestStageName(process) {

    const normalizedProcess = normalizeProcessState(process);
    const activeStage = getCurrentStage(process);

    if (activeStage) {
        return activeStage;
    }

    const lastCompleted = [...normalizedProcess.stages]
        .reverse()
        .find((stageState) => stageState.status === "Completada");

    return lastCompleted?.stage ?? "Recepción";
}

function isPrimaryReleasedByProcess(wheel) {

    return isSubstageCompleted(
        wheel.process,
        PRIMARY_RELEASE.stage,
        PRIMARY_RELEASE.substage
    );
}

function isSecondaryReleasedByProcess(wheel) {

    return isSubstageCompleted(
        wheel.process,
        SECONDARY_RELEASE.stage,
        SECONDARY_RELEASE.substage
    );
}

export function resolveWheelBoxAssignments(wheel) {

    const normalizedAssignments = normalizeBoxAssignments(wheel.boxAssignments);

    if (normalizedAssignments.primaryBox || normalizedAssignments.secondaryBox) {

        return {
            primaryBox: normalizedAssignments.primaryBox
                ? {
                    ...normalizedAssignments.primaryBox,
                    released: normalizedAssignments.primaryBox.released ||
                        isPrimaryReleasedByProcess(wheel)
                }
                : null,
            secondaryBox: normalizedAssignments.secondaryBox
                ? {
                    ...normalizedAssignments.secondaryBox,
                    released: normalizedAssignments.secondaryBox.released ||
                        isSecondaryReleasedByProcess(wheel)
                }
                : null,
            isLegacy: false
        };
    }

    const legacyBox = normalizeBoxData(wheel.boxData);

    if (!hasBoxData(legacyBox)) {
        return null;
    }

    return {
        primaryBox: createBoxAssignmentEntry(
            legacyBox.boxNumber,
            BOX_USAGE.PERNOS,
            isPrimaryReleasedByProcess(wheel) ||
                isStageCompleted(wheel.process, "Almacén")
        ),
        secondaryBox: null,
        isLegacy: true
    };
}

export function hasAssignedBoxes(wheel) {

    const assignments = resolveWheelBoxAssignments(wheel);

    return assignments !== null &&
        (assignments.primaryBox !== null || assignments.secondaryBox !== null);
}

export function getOccupiedBoxIds(wheels, excludeWheelIndex = null) {

    const occupiedIds = new Set();

    wheels.forEach((wheel, index) => {

        if (excludeWheelIndex !== null && index === excludeWheelIndex) {
            return;
        }

        if (!isWheelActive(wheel)) {
            return;
        }

        const assignments = resolveWheelBoxAssignments(wheel);

        if (!assignments) {
            return;
        }

        [assignments.primaryBox, assignments.secondaryBox].forEach((boxEntry) => {

            if (boxEntry && !boxEntry.released) {
                occupiedIds.add(boxEntry.id);
            }
        });
    });

    return [...occupiedIds];
}

export function getAvailableBoxIds(wheels, excludeWheelIndex = null) {

    const occupiedIds = new Set(getOccupiedBoxIds(wheels, excludeWheelIndex));

    return Array.from({ length: TOTAL_BOXES }, (_, index) => index + 1)
        .filter((boxId) => !occupiedIds.has(boxId));
}

export function validateBoxAssignments(
    wheels,
    primaryBoxId,
    secondaryBoxId,
    excludeWheelIndex = null
) {

    const primaryId = Number(primaryBoxId);
    const secondaryId = Number(secondaryBoxId);

    if (
        Number.isNaN(primaryId) ||
        Number.isNaN(secondaryId) ||
        primaryId < 1 ||
        primaryId > TOTAL_BOXES ||
        secondaryId < 1 ||
        secondaryId > TOTAL_BOXES
    ) {
        return false;
    }

    if (primaryId === secondaryId) {
        return false;
    }

    const availableIds = new Set(
        getAvailableBoxIds(wheels, excludeWheelIndex)
    );

    return availableIds.has(primaryId) && availableIds.has(secondaryId);
}

function getProgressFromStageMap(stageName, progressMap) {

    if (progressMap[stageName] !== undefined) {
        return progressMap[stageName];
    }

    const stageIndex = getStageIndex(stageName);

    if (stageIndex === -1) {
        return 0;
    }

    let fallbackProgress = 0;

    PROCESS_STAGES.forEach((stage, index) => {

        if (index <= stageIndex && progressMap[stage] !== undefined) {
            fallbackProgress = progressMap[stage];
        }
    });

    return fallbackProgress;
}

export function calculateBoxProgress(boxEntry, wheel) {

    if (!boxEntry) {
        return {
            progress: 0,
            visualState: "critical",
            visualLabel: "Sin datos",
            visualIcon: "🔴",
            statusLabel: "Sin datos",
            isFree: false
        };
    }

    if (boxEntry.released || isWheelClosed(wheel)) {

        return {
            progress: 100,
            visualState: "free",
            visualLabel: "Libre",
            visualIcon: "⚪",
            statusLabel: "Lista para reutilizar",
            isFree: true
        };
    }

    const progressMap = boxEntry.usage === BOX_USAGE.RODAMIENTOS
        ? SECONDARY_STAGE_PROGRESS
        : PRIMARY_STAGE_PROGRESS;

    const currentStage = getFurthestStageName(wheel.process);
    let progress = getProgressFromStageMap(currentStage, progressMap);

    if (
        boxEntry.usage === BOX_USAGE.PERNOS &&
        currentStage === PRIMARY_RELEASE.stage &&
        isSubstageCompleted(
            wheel.process,
            PRIMARY_RELEASE.stage,
            PRIMARY_RELEASE.substage
        )
    ) {
        progress = 100;
    }

    if (
        boxEntry.usage === BOX_USAGE.RODAMIENTOS &&
        currentStage === SECONDARY_RELEASE.stage &&
        isSubstageCompleted(
            wheel.process,
            SECONDARY_RELEASE.stage,
            SECONDARY_RELEASE.substage
        )
    ) {
        progress = 100;
    }

    const visual = getBoxVisualState(progress);

    return {
        progress,
        visualState: visual.state,
        visualLabel: visual.label,
        visualIcon: visual.icon,
        statusLabel: currentStage,
        isFree: progress >= 100
    };
}

export function getBoxVisualState(progress) {

    if (progress >= 100) {
        return {
            state: "free",
            label: "Libre",
            icon: "⚪"
        };
    }

    if (progress <= 30) {
        return {
            state: "critical",
            label: "Muy ocupada",
            icon: "🔴"
        };
    }

    if (progress <= 70) {
        return {
            state: "progress",
            label: "En proceso",
            icon: "🟡"
        };
    }

    return {
        state: "near-release",
        label: "Próxima a liberarse",
        icon: "🔵"
    };
}

export function formatUsageLabel(usage) {

    if (usage === BOX_USAGE.RODAMIENTOS) {
        return "RODAMIENTOS";
    }

    return "PERNOS";
}

export function formatUsageFriendlyLabel(usage) {

    return USAGE_LABELS[usage] ?? usage;
}

export function formatWheelOperationalReference(wheel) {

    const wheelNumber = wheel?.numeroRueda
        ? `#${wheel.numeroRueda}`
        : "Sin número";
    const serialSummary = getWheelSerialSummary(wheel);
    const serialLabel = serialSummary && serialSummary !== "-"
        ? `S/N ${serialSummary}`
        : "S/N —";

    return {
        wheelNumber,
        serialLabel,
        combinedText: `${wheelNumber} ${serialLabel}`
    };
}

function findWheelByBoxId(wheels, boxId) {

    return wheels.find((wheel) => {

        if (!isWheelActive(wheel)) {
            return false;
        }

        const assignments = resolveWheelBoxAssignments(wheel);

        if (!assignments) {
            return false;
        }

        return [assignments.primaryBox, assignments.secondaryBox].some(
            (boxEntry) => boxEntry && boxEntry.id === boxId && !boxEntry.released
        );
    }) ?? null;
}

function findLastReleasedUsage(wheels, boxId) {

    let lastUsage = null;

    wheels.forEach((wheel) => {

        const assignments = resolveWheelBoxAssignments(wheel);

        if (!assignments) {
            return;
        }

        [assignments.primaryBox, assignments.secondaryBox].forEach((boxEntry) => {

            if (!boxEntry || boxEntry.id !== boxId) {
                return;
            }

            lastUsage = boxEntry.usage;
        });
    });

    return lastUsage;
}

export function buildWorkshopBoxStates(wheels) {

    return Array.from({ length: TOTAL_BOXES }, (_, index) => {

        const boxId = index + 1;
        const assignedWheel = findWheelByBoxId(wheels, boxId);

        if (assignedWheel) {

            const assignments = resolveWheelBoxAssignments(assignedWheel);
            const boxEntry = [assignments.primaryBox, assignments.secondaryBox]
                .find((entry) => entry?.id === boxId && !entry.released);
            const progressData = calculateBoxProgress(boxEntry, assignedWheel);
            const reference = formatWheelOperationalReference(assignedWheel);
            const activeStage = getActiveStageState(assignedWheel.process);
            const currentSubstage = activeStage?.substages?.find(
                (substage) => !substage.completed
            )?.name ?? "—";

            return {
                boxId,
                isAvailable: false,
                wheel: assignedWheel,
                boxEntry,
                progressData,
                reference,
                currentStage: getCurrentStage(assignedWheel.process) ?? "—",
                currentSubstage
            };
        }

        const lastUsage = findLastReleasedUsage(wheels, boxId);

        return {
            boxId,
            isAvailable: true,
            wheel: null,
            boxEntry: null,
            progressData: {
                progress: 100,
                visualState: "free",
                visualLabel: "Libre",
                visualIcon: "⚪",
                statusLabel: "Disponible",
                isFree: true
            },
            reference: null,
            lastUsage
        };
    });
}

export function formatTvBoxesLabel(wheel) {

    const assignments = resolveWheelBoxAssignments(wheel);

    if (!assignments) {
        return "Sin cajas";
    }

    const parts = [];

    if (assignments.primaryBox?.id) {

        parts.push(
            assignments.primaryBox.released
                ? `#${assignments.primaryBox.id} ✓`
                : `#${assignments.primaryBox.id}`
        );
    }

    if (assignments.secondaryBox?.id) {

        const currentStage = getCurrentStage(wheel.process);
        let label = `#${assignments.secondaryBox.id}`;

        if (assignments.secondaryBox.released) {
            label += " ✓";
        } else if (currentStage === "Inflado") {
            label += " (Inflado)";
        }

        parts.push(label);
    }

    return parts.length > 0 ? parts.join(" ") : "Sin cajas";
}

export function getBoxDetailSnapshot(wheels, boxId) {

    const boxState = buildWorkshopBoxStates(wheels).find(
        (entry) => entry.boxId === boxId
    );

    if (!boxState) {
        return null;
    }

    if (boxState.isAvailable) {

        return {
            boxId,
            isAvailable: true,
            lastUsage: boxState.lastUsage
                ? formatUsageFriendlyLabel(boxState.lastUsage)
                : "Sin registro"
        };
    }

    const { wheel, boxEntry, progressData, reference, currentStage, currentSubstage } =
        boxState;

    return {
        boxId,
        isAvailable: false,
        reference,
        usage: formatUsageLabel(boxEntry.usage),
        currentStage,
        currentSubstage,
        progress: progressData.progress,
        statusLabel: progressData.isFree
            ? "Lista para reutilizar"
            : progressData.statusLabel,
        wheel
    };
}
