export function buildSystemPrompt(summaryType) {
  const audience =
    summaryType === "insurance"
      ? "hospital insurance/TPA reviewers and treating clinicians"
      : "the treating doctor, receiving clinician, and patient discharge desk";

  return [
    "You are a hospital clinical documentation assistant.",
    `Draft a ${summaryType} summary for ${audience}.`,
    "Use only facts present in the supplied patient encounter JSON.",
    "Do not diagnose, prescribe, infer causality, or add clinical details that are not in the record.",
    "If required information is missing, add it to missingInformation.",
    "Every important clinical fact must have a sourceReferences entry with the source section and short evidence text.",
    "Keep the language professional, concise, and ready for doctor review.",
    "The draft is not final medical advice and must be approved by a licensed clinician."
  ].join(" ");
}

export function buildUserPrompt(summaryType, encounter) {
  return [
    `Create a ${summaryType} summary as structured JSON.`,
    "For insurance summaries, emphasize admission reason, medical necessity, procedures, investigations, treatment given, and discharge status.",
    "For discharge summaries, emphasize hospital course, final diagnosis, discharge medications, follow-up, and red flags.",
    "Patient encounter JSON:",
    JSON.stringify({ ...encounter, summaryType }, null, 2)
  ].join("\n\n");
}

export function buildMockSummary(summaryType, request) {
  const patient = request.patient ?? {};
  const encounter = request.encounter ?? {};
  const sources = request.sources ?? {};

  return {
    summaryType,
    patientSnapshot: {
      name: patient.name ?? "not available in record",
      age: stringify(patient.age),
      sex: patient.sex ?? "not available in record",
      patientId: patient.patientId ?? "not available in record",
      encounterId: encounter.encounterId ?? "not available in record",
      admissionDate: encounter.admissionDate ?? "not available in record",
      dischargeDate: encounter.dischargeDate ?? "not available in record"
    },
    clinicalSummary: mockClinicalSummary(summaryType, sources),
    diagnoses: asArray(sources.diagnoses),
    procedures: asArray(sources.procedures),
    investigations: asArray(sources.investigations),
    medicationsOnDischarge: asArray(sources.medicationsOnDischarge),
    followUpAdvice: asArray(sources.followUpAdvice),
    insuranceJustification:
      summaryType === "insurance"
        ? "Draft justification should be completed from verified admission reason, treatment course, procedure notes, and investigation results."
        : "Not applicable for discharge summary.",
    missingInformation: collectMissingInformation(request),
    sourceReferences: Object.entries(sources)
      .filter(([, value]) => value !== undefined && value !== null && String(value).trim() !== "")
      .map(([section, value]) => ({
        section,
        evidence: truncate(String(Array.isArray(value) ? value.join("; ") : value), 180)
      })),
    safetyWarnings: [
      "Mock mode was used because OPENAI_API_KEY is not configured.",
      "Doctor review and approval are required before release."
    ]
  };
}

function mockClinicalSummary(summaryType, sources) {
  const diagnosis = asArray(sources.diagnoses).join(", ") || "diagnosis not available in record";
  const course = sources.hospitalCourse || sources.progressNotes || "hospital course not available in record";

  if (summaryType === "insurance") {
    return `The patient was admitted for ${diagnosis}. Treatment course: ${course}`;
  }

  return `The patient was managed for ${diagnosis}. Hospital course: ${course}`;
}

function collectMissingInformation(request) {
  const missing = [];
  const requiredPaths = [
    ["patient.name", request.patient?.name],
    ["patient.age", request.patient?.age],
    ["patient.sex", request.patient?.sex],
    ["encounter.admissionDate", request.encounter?.admissionDate],
    ["encounter.dischargeDate", request.encounter?.dischargeDate],
    ["sources.diagnoses", request.sources?.diagnoses],
    ["sources.hospitalCourse or sources.progressNotes", request.sources?.hospitalCourse || request.sources?.progressNotes],
    ["sources.medicationsOnDischarge", request.sources?.medicationsOnDischarge],
    ["sources.followUpAdvice", request.sources?.followUpAdvice]
  ];

  for (const [label, value] of requiredPaths) {
    if (value === undefined || value === null || value === "" || (Array.isArray(value) && value.length === 0)) {
      missing.push(label);
    }
  }

  return missing;
}

function asArray(value) {
  if (Array.isArray(value)) {
    return value.map(String);
  }

  if (value === undefined || value === null || value === "") {
    return [];
  }

  return [String(value)];
}

function stringify(value) {
  if (value === undefined || value === null || value === "") {
    return "not available in record";
  }

  return String(value);
}

function truncate(value, maxLength) {
  return value.length > maxLength ? `${value.slice(0, maxLength - 3)}...` : value;
}
