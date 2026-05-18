export const summarySchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "summaryType",
    "patientSnapshot",
    "clinicalSummary",
    "diagnoses",
    "procedures",
    "investigations",
    "admissionReason",
    "generalExamination",
    "localExamination",
    "medicationsOnDischarge",
    "followUpAdvice",
    "reviewAfterDays",
    "insuranceJustification",
    "missingInformation",
    "sourceReferences",
    "safetyWarnings"
  ],
  properties: {
    summaryType: {
      type: "string",
      enum: ["discharge", "insurance"]
    },
    patientSnapshot: {
      type: "object",
      additionalProperties: false,
      required: ["name", "age", "sex", "ipNumber", "encounterId", "dateOfAdmission", "dateOfSurgery", "dateOfDischarge"],
      properties: {
        name: { type: "string" },
        age: { type: "string" },
        sex: { type: "string" },
        ipNumber: { type: "string" },
        encounterId: { type: "string" },
        dateOfAdmission: { type: "string" },
        dateOfSurgery: { type: "string" },
        dateOfDischarge: { type: "string" }
      }
    },
    clinicalSummary: { type: "string" },
    diagnoses: {
      type: "array",
      items: { type: "string" }
    },
    procedures: {
      type: "array",
      items: { type: "string" }
    },
    investigations: {
      type: "array",
      items: { type: "string" }
    },
    admissionReason: { type: "string" },
    generalExamination: { type: "string" },
    localExamination: { type: "string" },
    medicationsOnDischarge: {
      type: "array",
      items: { type: "string" }
    },
    followUpAdvice: {
      type: "array",
      items: { type: "string" }
    },
    reviewAfterDays: { type: "string" },
    insuranceJustification: { type: "string" },
    missingInformation: {
      type: "array",
      items: { type: "string" }
    },
    sourceReferences: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["section", "evidence"],
        properties: {
          section: { type: "string" },
          evidence: { type: "string" }
        }
      }
    },
    safetyWarnings: {
      type: "array",
      items: { type: "string" }
    }
  }
};

export function assertEncounterRequest(body, expectedSummaryType) {
  if (!body || typeof body !== "object") {
    throw new Error("Request body must be a JSON object.");
  }

  if (body.summaryType && body.summaryType !== expectedSummaryType) {
    throw new Error(`summaryType must be "${expectedSummaryType}" for this endpoint.`);
  }

  if (!body.patient || typeof body.patient !== "object") {
    throw new Error("patient is required.");
  }

  if (!body.encounter || typeof body.encounter !== "object") {
    throw new Error("encounter is required.");
  }

  if (!body.sources || typeof body.sources !== "object") {
    throw new Error("sources is required.");
  }
}
