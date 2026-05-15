const form = document.querySelector("#summary-form");
const accessScreen = document.querySelector("#access-screen");
const accessForm = document.querySelector("#access-form");
const modeLabel = document.querySelector("#mode-label");
const sampleButton = document.querySelector("#sample-button");
const approveButton = document.querySelector("#approve-button");
const draftButton = document.querySelector("#draft-button");
const draftStatus = document.querySelector("#draft-status");
const emptyState = document.querySelector("#empty-state");
const result = document.querySelector("#result");

let currentDraftId = "";
let accessCode = sessionStorage.getItem("hospital-ai-access-code") || "";

loadHealth();

accessForm.addEventListener("submit", (event) => {
  event.preventDefault();
  accessCode = new FormData(accessForm).get("accessCode").trim();
  sessionStorage.setItem("hospital-ai-access-code", accessCode);
  accessScreen.classList.add("hidden");
});

sampleButton.addEventListener("click", () => {
  form.name.value = "Sample Patient";
  form.age.value = "54";
  form.sex.value = "Female";
  form.patientId.value = "P-10001";
  form.admissionDate.value = "2026-05-01";
  form.dischargeDate.value = "2026-05-05";
  form.diagnosis.value = "Community-acquired pneumonia";
  form.doctorName.value = "Dr. Ananya Rao";
  form.hospitalName.value = "City Care Hospital";
  form.sealText.value = "City Care Hospital | Reg. No. CCH-2026";
  form.investigations.value = "Chest X-ray: right lower-zone consolidation\nCBC: leukocytosis improving";
  form.hospitalCourse.value =
    "Patient was treated with IV antibiotics, antipyretics, nebulization, and supportive care. Symptoms improved and oxygen saturation remained stable on room air before discharge.";
  form.medications.value = "Amoxicillin/clavulanate as prescribed for 5 days\nParacetamol as needed for fever";
  form.followUpAdvice.value =
    "Pulmonology/medicine follow-up after 7 days\nReturn immediately for breathlessness, persistent fever, chest pain, or worsening cough";
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const summaryType = new FormData(form).get("summaryType");
  const endpoint = `/api/drafts/${summaryType}`;

  setBusy(true);
  setStatus("Generating draft...");

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: requestHeaders(),
      body: JSON.stringify(buildPayload(summaryType))
    });
    const payload = await readJsonResponse(response);

    if (!response.ok) {
      throw new Error(payload.error || "Draft request failed.");
    }

    currentDraftId = payload.draftId;
    renderDraft(payload);
    setStatus(`${payload.status.replaceAll("_", " ")} | ${payload.provider}/${payload.model}`);
    approveButton.disabled = false;
  } catch (error) {
    currentDraftId = "";
    approveButton.disabled = true;
    setStatus(error.message, true);
  } finally {
    setBusy(false);
  }
});

approveButton.addEventListener("click", async () => {
  if (!currentDraftId) {
    return;
  }

  approveButton.disabled = true;
  setStatus("Approving draft...");

  try {
    const response = await fetch(`/api/drafts/${currentDraftId}/approve`, {
      method: "POST",
      headers: requestHeaders(),
      body: JSON.stringify({ approvedBy: "doctor.local" })
    });
    const payload = await readJsonResponse(response);

    if (!response.ok) {
      throw new Error(payload.error || "Approval failed.");
    }

    setStatus(`approved by ${payload.approvedBy}`);
  } catch (error) {
    approveButton.disabled = false;
    setStatus(error.message, true);
  }
});

async function loadHealth() {
  try {
    const response = await fetch("/health");
    const health = await readJsonResponse(response);
    modeLabel.textContent = `Server ${health.status} | ${health.mode} mode`;
    if (health.accessCodeRequired && !accessCode) {
      accessScreen.classList.remove("hidden");
    }
  } catch {
    modeLabel.textContent = "Server not reachable";
    modeLabel.classList.add("error");
  }
}

function buildPayload(summaryType) {
  const formData = new FormData(form);
  const encounterId = `E-${Date.now()}`;
  const commonSources = {
    diagnoses: lines(formData.get("diagnosis")),
    investigations: lines(formData.get("investigations")),
    hospitalCourse: text(formData.get("hospitalCourse")),
    progressNotes: text(formData.get("hospitalCourse")),
    medicationsOnDischarge: lines(formData.get("medications")),
    followUpAdvice: lines(formData.get("followUpAdvice"))
  };

  return {
    summaryType,
    patient: {
      patientId: text(formData.get("patientId")) || `P-${Date.now()}`,
      name: text(formData.get("name")),
      age: text(formData.get("age")),
      sex: text(formData.get("sex"))
    },
    encounter: {
      encounterId,
      admissionDate: text(formData.get("admissionDate")),
      dischargeDate: text(formData.get("dischargeDate"))
    },
    clinician: {
      doctorName: text(formData.get("doctorName")),
      hospitalName: text(formData.get("hospitalName")),
      signatureName: text(formData.get("doctorName")),
      sealText: text(formData.get("sealText"))
    },
    sources: {
      ...commonSources,
      admissionReason:
        summaryType === "insurance"
          ? `Admitted for ${text(formData.get("diagnosis"))}. ${text(formData.get("hospitalCourse"))}`
          : undefined
    }
  };
}

function renderDraft(payload) {
  const draft = payload.draft;
  const clinician = payload.request?.clinician || buildPayload(draft.summaryType).clinician;
  emptyState.classList.add("hidden");
  result.classList.remove("hidden");

  document.querySelector("#clinical-summary").textContent = draft.clinicalSummary || "Not available in record.";
  document.querySelector("#insurance-justification").textContent =
    draft.insuranceJustification || "Not applicable.";
  renderList("#diagnoses", draft.diagnoses);
  renderList("#medications", draft.medicationsOnDischarge);
  renderList("#investigations", draft.investigations);
  renderList("#follow-up", draft.followUpAdvice);
  renderList("#missing-info", draft.missingInformation, "No missing information flagged.");
  renderReferences(draft.sourceReferences);
  document.querySelector("#doctor-name").textContent = clinician.doctorName || "Not provided.";
  document.querySelector("#hospital-name").textContent = clinician.hospitalName || "Not provided.";
  document.querySelector("#signature-name").textContent = clinician.signatureName || clinician.doctorName || "Not provided.";
  document.querySelector("#seal-text").textContent = clinician.sealText || clinician.hospitalName || "Not provided.";
}

function renderList(selector, items, emptyText = "Not available in record.") {
  const list = document.querySelector(selector);
  list.replaceChildren();
  const values = Array.isArray(items) && items.length ? items : [emptyText];

  for (const value of values) {
    const li = document.createElement("li");
    li.textContent = value;
    list.append(li);
  }
}

function renderReferences(references) {
  const list = document.querySelector("#source-references");
  list.replaceChildren();
  const values = Array.isArray(references) && references.length ? references : [];

  if (!values.length) {
    const li = document.createElement("li");
    li.textContent = "No source references returned.";
    list.append(li);
    return;
  }

  for (const reference of values) {
    const li = document.createElement("li");
    const title = document.createElement("strong");
    const evidence = document.createElement("span");
    title.textContent = reference.section;
    evidence.textContent = reference.evidence;
    li.append(title, evidence);
    list.append(li);
  }
}

function lines(value) {
  return text(value)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function text(value) {
  return String(value || "").trim();
}

function setBusy(isBusy) {
  draftButton.disabled = isBusy;
  draftButton.textContent = isBusy ? "Generating..." : "Generate Draft";
}

function setStatus(message, isError = false) {
  draftStatus.textContent = message;
  draftStatus.classList.toggle("error", isError);
}

function requestHeaders() {
  const headers = { "content-type": "application/json" };

  if (accessCode) {
    headers["x-app-access-code"] = accessCode;
  }

  return headers;
}

async function readJsonResponse(response) {
  const body = await response.text();

  try {
    return body ? JSON.parse(body) : {};
  } catch {
    const preview = body.replace(/\s+/g, " ").slice(0, 180);
    throw new Error(
      `Server returned ${response.status} ${response.statusText || ""} instead of JSON. ` +
        `This usually means Azure returned an HTML error/login/default page. Preview: ${preview}`
    );
  }
}
