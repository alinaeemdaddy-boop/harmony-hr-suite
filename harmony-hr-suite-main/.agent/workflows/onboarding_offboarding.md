# Onboarding & Off‑boarding Module Workflow

---

description: Comprehensive workflow for employee onboarding and off‑boarding in Harmony HR Suite.
---

## 1. Onboarding Workflow (Offer Accepted → Fully Active)

1. **Offer Acceptance** – Hiring Manager creates an offer; candidate clicks acceptance link → `onboarding_cases` created.
2. **Pre‑Onboarding** – HR Officer fills start date, branch, role, shift; uploads documents; background & medical checks.
3. **Welcome & Buddy Assignment** – HR Admin assigns a buddy and sends welcome email.
4. **Asset Request** – IT Support receives asset assignment task (laptop, ID, etc.).
5. **Access Provisioning** – IT creates `access_requests` for email, VPN, ERP.
6. **Day‑1 Setup** – HR creates employee ID, signs contract, policy acknowledgements.
7. **Checklist Generation** – System creates tasks from `task_templates` based on role/branch.
8. **Task Execution** – Owners complete tasks, attach evidence, mark status.
9. **Probation** – Probation period set; manager fills `probation_reviews`.
10. **Confirmation** – HR Admin generates confirmation letter; employee status set to **Active**.
11. **Automation** – Notifications sent at each milestone.

## 2. Off‑boarding Workflow (Resignation/Termination → Inactive)

1. **Exit Initiation** – Employee submits resignation or HR creates termination record.
2. **Notice & Approval** – HR Officer calculates notice period; approvers (Manager, HR Admin) approve.
3. **Handover Checklist** – System creates handover tasks for the employee’s manager.
4. **Clearance Workflow** – Parallel clearance tasks for IT, Finance, Facilities, Security.
5. **Asset Return** – Facilities records asset return; missing assets trigger deduction tasks.
6. **Final Settlement** – Finance calculates salary, leave encashment, deductions → `settlements`.
7. **Access Removal** – IT disables accounts, revokes badges; audit log entry created.
8. **Exit Interview** – HR conducts interview; data stored in `exit_interviews`.
9. **Document Generation** – Experience, relieving, and clearance certificates generated.
10. **Status Update** – Employee marked **Inactive**; case closed.
11. **Retention** – Cases archived per retention policy.

## 3. Roles & Permissions (summary)

| Role | Permissions |
|------|-------------|
| **HR Admin** | CRUD onboarding/off‑boarding cases, manage task templates, approve assets, generate letters, view audit logs |
| **HR Officer** | Create cases, upload documents, assign buddies, manage checklists |
| **Hiring Manager** | Create offers, view candidate status |
| **Department Manager** | Approve shift assignments, review handover tasks |
| **IT Support** | Asset assignment, access provisioning, disable accounts |
| **Finance** | Salary profile, settlement calculation, approve payments |
| **Security / Facilities** | Asset return, badge revocation, clearance approvals |
| **Employee** | View own case, upload docs, complete tasks, acknowledge policies |
| **Approver** | Approve/reject pending approvals for cases and settlements |

## 4. Checklist Templates (examples)

- **IT Checklist** – Laptop, Email, VPN, Shared Drive, Access Card.
- **HR Checklist** – Contract, Policy Acknowledgement, Background Check.
- **Manager Checklist** – Shift Assignment, Handover Plan, Probation Review.
- **Finance Checklist** – Salary Setup, Benefit Enrollment, Final Settlement.
- **Facilities Checklist** – Office Space, Keys, Parking Badge.

## 5. API Endpoints (REST)

- `POST /api/onboarding/cases` – create case
- `GET /api/onboarding/cases/:id` – retrieve case + tasks
- `POST /api/tasks` – create task (from template)
- `PATCH /api/tasks/:id` – update status / attach evidence
- `POST /api/approvals/:caseId` – submit approval decision
- `POST /api/assets/assign` – assign asset
- `POST /api/access-requests` – request system access
- `POST /api/offboarding/cases` – start exit process
- `POST /api/settlements/:caseId` – generate settlement
- `GET /api/audit-logs?entity=...` – audit trail

## 6. UI Screens (high‑level)

- **Onboarding Dashboard** – list of active cases, filter by branch/status.
- **Case Detail Page** – tabs: Overview, Tasks, Documents, Assets, Access, Timeline.
- **Task List** – sortable, filterable, evidence upload.
- **Asset Handover** – barcode scan, condition dropdown, handover PDF.
- **Off‑boarding Dashboard** – similar to onboarding but shows clearance status.
- **Clearance Page** – checklist per department with sign‑off.
- **Settlement Page** – preview, approve, download PDF.
- **Notifications Center** – auto‑generated alerts.

## 7. Security & Compliance

- Row‑Level Security (RLS) on all tables.
- Role‑Based Access Control (RBAC) enforced in Supabase policies.
- Audit logs for every data mutation.
- GDPR‑compliant data export endpoint.
- Retention policy automation (7‑year archive, legal hold flag).

---

*This workflow file can be imported by the automation engine to generate scaffolding, documentation, or CI pipelines.*
