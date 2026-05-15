# Hospital AI Documentation Agent MVP

This is a small starter service for drafting doctor-reviewed discharge summaries and insurance summaries.

It is intentionally conservative:

- It drafts from supplied encounter data only.
- It returns missing information instead of inventing clinical facts.
- It keeps discharge and insurance summary workflows separate.
- It requires explicit clinician approval before a draft is treated as final.
- It stores drafts in memory for MVP testing only.

## Run

```bash
cd hospital-ai-agent-mvp
npm run check
npm start
```

The server starts at `http://localhost:8787`.

Without `OPENAI_API_KEY`, the service runs in mock mode so you can test the API shape.

To use OpenAI:

```bash
export OPENAI_API_KEY="your_api_key"
export OPENAI_MODEL="gpt-5.2"
npm start
```

## Draft a discharge summary

```bash
curl -s http://localhost:8787/api/drafts/discharge \
  -H 'content-type: application/json' \
  -d @samples/discharge-request.json
```

## Draft an insurance summary

```bash
curl -s http://localhost:8787/api/drafts/insurance \
  -H 'content-type: application/json' \
  -d @samples/insurance-request.json
```

## Approve a draft

Use the `draftId` returned by a draft endpoint.

```bash
curl -s http://localhost:8787/api/drafts/draft_123/approve \
  -H 'content-type: application/json' \
  -d '{"approvedBy":"doctor@example-hospital.test"}'
```

## Production Checklist

Before using this with real patient data:

- Add authentication and role-based access.
- Encrypt data in transit and at rest.
- Replace in-memory storage with an audited clinical document store.
- Add immutable audit logs for prompt input, model output, edits, and approval.
- Add PHI retention, deletion, and access policies.
- Sign the appropriate vendor/data-processing agreements for your jurisdiction.
- Validate every output format with doctors, billing staff, and compliance.
- Add insurer-specific templates and required-field checks.

