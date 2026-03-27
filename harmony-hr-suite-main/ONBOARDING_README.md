# Onboarding Dashboard Module

## Features
- **Dashboard**: View all onboarding cases with status, dates, and employee details.
- **Search & Filter**: Search by name/email/ID. Filter by active/pending/completed status.
- **Sorting**: Sort by Case ID, Status, or Start Date.
- **Create Case**: Modal form to start onboarding for existing employees.
- **Case Details**:
  - Employee Summary & Activity Log.
  - Interactive Task Checklist (Add, Toggle, Delete).
  - Notes & Comments (Placeholder for future DB update).
- **Export**: Download filtered cases as Excel/CSV.
- **Responsive**: Adaptive layout for mobile and desktop.
- **Auto-Seeding**: The application automatically seeds sample cases if the database is detected as empty on the dashboard load.

## Routes
- `/onboarding`: Main Dashboard.
- `/onboarding/:caseId`: Case Details.

## Setup
1. Ensure `.env` is configured with Supabase credentials.
2. Run `npm run dev`.
3. Navigate to `/onboarding` (or access via the Onboarding link if added to sidebar).
4. On first load, if no cases exist, sample data will be generated.

## Data Model (Supabase)
- `onboarding_cases`: Core case tracking (`case_id`, `status`, `start_date`, `employee_id`).
- `tasks`: Checklist items linked to cases.
- `employees`: Linked for employee info.

## Tech Stack
- React (Vite)
- Tailwind CSS
- Shadcn UI
- Supabase (Postgres)
