import { normalizeStageTiming, PROCESS_SUBSTAGES } from "./processModel.js";
import { getWheelTotalProcessMinutes } from "./wheelModel.js";

export const TAT_META = 1.5;
export const MINUTES_PER_TAT = 24 * 60;

export const THIRD_PARTY_SUBSTAGES = [
    {
        stage: "Recepción",
        substage: "Inspección preliminar",
        dependency: "Inspector"
    },
    {
        stage: "Inspección",
        substage: "Inspección NDT",
        dependency: "Proveedor NDT"
    },
    {
        stage: "Espera de Material",
        substage: "Repuesto recibido",
        dependency: "Almacén"
    },
    {
        stage: "Ensamblaje",
        substage: "Caucho asignado",
        dependency: "Issue de caucho"
    },
    {
        stage: "Ensamblaje",
        substage: "Torqueado",
        dependency: "Inspector"
    },
    {
        stage: "Liberación",
        substage: "Inspector presente solicitado",
        dependency: "Inspector"
    },
    {
        stage: "Almacén",
        substage: "Serviciable recibido",
        dependency: "Inspector / documento final"
    }
];

const thirdPartySubstageKeys = new Set(
    THIRD_PARTY_SUBSTAGES.map(
        (definition) => `${definition.stage}::${definition.substage}`
    )
);

function calculateDurationMinutes(startedAt, finishedAt) {

    if (!startedAt || !finishedAt) {
        return null;
    }

    const start = new Date(startedAt);
    const end = new Date(finishedAt);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        return null;
    }

    return Math.max(0, Math.round((end - start) / 60000));
}

export function normalizeSubstageTiming(substageTiming) {

    if (!Array.isArray(substageTiming)) {
        return [];
    }

    return substageTiming
        .map((entry) => {

            if (!entry || typeof entry !== "object") {
                return null;
            }

            const stage = entry.stage ?? entry.stageName ?? null;
            const substage = entry.substage ?? entry.substageName ?? entry.name ?? null;

            if (!stage || !substage) {
                return null;
            }

            const durationMinutes = entry.durationMinutes === null ||
                entry.durationMinutes === undefined
                ? calculateDurationMinutes(entry.requestedAt, entry.completedAt)
                : Number(entry.durationMinutes);

            return {
                stage,
                substage,
                requestedAt: entry.requestedAt ?? null,
                completedAt: entry.completedAt ?? null,
                durationMinutes: Number.isNaN(durationMinutes) ? null : durationMinutes,
                thirdParty: entry.thirdParty === true ||
                    thirdPartySubstageKeys.has(`${stage}::${substage}`)
            };
        })
        .filter((entry) => entry !== null);
}

function findSubstageTimingEntry(substageTiming, stageName, substageName) {

    return substageTiming.find(
        (entry) => entry.stage === stageName && entry.substage === substageName
    );
}

function getProportionalSubstageMinutes(wheel, stageName, substageName) {

    const stageEntry = normalizeStageTiming(wheel.stageTiming).find(
        (entry) => entry.stage === stageName
    );

    const stageMinutes = stageEntry?.durationMinutes;

    if (stageMinutes === null || stageMinutes === undefined) {
        return null;
    }

    const substagesInStage = PROCESS_SUBSTAGES[stageName] ?? [];

    if (substagesInStage.length === 0) {
        return null;
    }

    return Math.round(stageMinutes / substagesInStage.length);
}

export function getSubstageDurationMinutes(wheel, stageName, substageName) {

    const substageTiming = normalizeSubstageTiming(wheel.substageTiming);
    const timingEntry = findSubstageTimingEntry(
        substageTiming,
        stageName,
        substageName
    );

    if (timingEntry?.durationMinutes !== null &&
        timingEntry?.durationMinutes !== undefined) {
        return timingEntry.durationMinutes;
    }

    return getProportionalSubstageMinutes(wheel, stageName, substageName);
}

export function getWheelThirdPartyMinutes(wheel) {

    return THIRD_PARTY_SUBSTAGES.reduce((totalMinutes, definition) => {

        const substageMinutes = getSubstageDurationMinutes(
            wheel,
            definition.stage,
            definition.substage
        );

        if (substageMinutes === null || substageMinutes === undefined) {
            return totalMinutes;
        }

        return totalMinutes + substageMinutes;
    }, 0);
}

export function getWheelOperationalMinutes(wheel) {

    const totalMinutes = getWheelTotalProcessMinutes(wheel);

    if (totalMinutes === null) {
        return null;
    }

    const thirdPartyMinutes = getWheelThirdPartyMinutes(wheel);

    return Math.max(0, totalMinutes - thirdPartyMinutes);
}

export function minutesToTat(minutes) {

    if (minutes === null || minutes === undefined) {
        return null;
    }

    return minutes / MINUTES_PER_TAT;
}

export function computeThirdPartyParticipationPercent(
    thirdPartyMinutes,
    totalMinutes
) {

    if (
        thirdPartyMinutes === null ||
        thirdPartyMinutes === undefined ||
        totalMinutes === null ||
        totalMinutes === undefined ||
        totalMinutes <= 0
    ) {
        return null;
    }

    return (thirdPartyMinutes / totalMinutes) * 100;
}

export function computeOperationalEfficiency(monthlyTat) {

    if (monthlyTat === null || monthlyTat === undefined || monthlyTat <= 0) {
        return null;
    }

    return Math.min((TAT_META / monthlyTat) * 100, 100);
}

export function buildWheelTatMetrics(wheel) {

    const totalMinutes = getWheelTotalProcessMinutes(wheel);

    if (totalMinutes === null) {
        return null;
    }

    const thirdPartyMinutes = getWheelThirdPartyMinutes(wheel);
    const operationalMinutes = Math.max(0, totalMinutes - thirdPartyMinutes);

    return {
        totalMinutes,
        thirdPartyMinutes,
        operationalMinutes,
        totalTat: minutesToTat(totalMinutes),
        thirdPartyTat: minutesToTat(thirdPartyMinutes),
        operationalTat: minutesToTat(operationalMinutes),
        participationPercent: computeThirdPartyParticipationPercent(
            thirdPartyMinutes,
            totalMinutes
        )
    };
}

export function aggregateTatMetrics(wheelMetricsList) {

    if (wheelMetricsList.length === 0) {

        return {
            monthlyTotalTat: null,
            monthlyOperationalTat: null,
            monthlyThirdPartyTat: null,
            participationPercent: null,
            monthlyAvgMinutes: null
        };
    }

    const totalMinutesSum = wheelMetricsList.reduce(
        (sum, metrics) => sum + metrics.totalMinutes,
        0
    );
    const thirdPartyMinutesSum = wheelMetricsList.reduce(
        (sum, metrics) => sum + metrics.thirdPartyMinutes,
        0
    );
    const operationalMinutesSum = totalMinutesSum - thirdPartyMinutesSum;
    const wheelCount = wheelMetricsList.length;

    return {
        monthlyTotalTat: minutesToTat(totalMinutesSum / wheelCount),
        monthlyOperationalTat: minutesToTat(operationalMinutesSum / wheelCount),
        monthlyThirdPartyTat: minutesToTat(thirdPartyMinutesSum / wheelCount),
        participationPercent: computeThirdPartyParticipationPercent(
            thirdPartyMinutesSum,
            totalMinutesSum
        ),
        monthlyAvgMinutes: Math.round(totalMinutesSum / wheelCount)
    };
}
