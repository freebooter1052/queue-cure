# 🏥 CareQueue — Real-Time Clinical Queue Management System

**CareQueue** (also known as `queue-cure`) is a modern, high-fidelity real-time clinical queue management system designed for healthcare environments. Built to reduce cognitive load in high-stress clinical settings, it provides receptionists with an intuitive desk dashboard to register and orchestrate patients, while giving patients a beautiful, distraction-free live waiting room TV layout with real-time wait-time tracking.

---

## 📸 Interface Visual Gallery

### 1. Reception Desk Portal (`/`)
The main administrative interface allows clinic staff to register patients, flag emergency cases, configure the average consultation SLA, and view/manage the active queue.
* **Live Notifications:** Alerts the receptionist if an active session overruns the set average consult time, or if a waiting patient exceeds their SLA threshold.
* **Intake Form:** Fast patient registration with a single-click emergency switch.
* **Orchestration Panel:** Controls to call the next patient, skip current sessions, or dismiss patients.

![Reception Desk Portal](file:///d:/simple%20projects/queue-cure/public/reception_desk.png)

*The screenshot above showcases two registered patients. T-36 (Bob Jones) was flagged as an Emergency Priority Case, which automatically bumped him to the head of the waiting list.*

---

### 2. Patient Waiting Room Display (`/display`)
A sterile, high-contrast dashboard optimized for wall-mounted TV monitors in the waiting lounge.
* **Real-Time Synchronized Clock:** Shows current time, updated locally.
* **Hero Serving Indicator:** Large display of the current active token. Toggles to a flashing red border for emergency sessions or green scale shifts when a new token is called.
* **Estimated Wait Time:** Aggregated remaining time of the current session, updated on a 1-second cadence.

![Waiting Room Display](file:///d:/simple%20projects/queue-cure/public/waiting_room.png)

---

### 3. Personalized Patient View (`/display?token=T-35`)
When patients scan their ticket QR code or visit their personal link, they see a personalized status tracker.
* **Individual Position Indicator:** Shows their exact number in line and how many patients are ahead of them.
* **Tailored Wait Time:** Calculated dynamically for their specific position in the queue.
* **Dynamic Progress Bar:** Visual progress representation of their position relative to the entire active list.

![Personalized Patient View](file:///d:/simple%20projects/queue-cure/public/waiting_room_personalized.png)

---

## 🛠️ Technology Stack

* **Frontend Framework:** Next.js 16.2.9 (App Router)
* **Logic/State:** React 19.2.4 (Hooks, Refs, Contexts, Custom Hooks)
* **Database & Realtime Sync:** Supabase (PostgreSQL, WebSocket Realtime Publications)
* **Styling System:** Tailwind CSS v4 (Vanilla Modern CSS layout with custom theme config)
* **Language:** TypeScript (Fully typed interfaces matching DB tables)

---

## 📂 Core Directory Structure

```bash
queue-cure/
├── app/                      # Next.js App Router (Routes & Layouts)
│   ├── display/              # Patient Waiting Room Page (/display)
│   │   └── page.tsx
│   ├── login/                # Placeholder for auth routing
│   ├── globals.css           # Global style rules & Tailwind imports
│   ├── layout.tsx            # Root viewport metadata, fonts & structure
│   └── page.tsx              # Receptionist Dashboard Page (/)
├── components/               # Reusable UI Modules
│   ├── display/
│   │   └── WaitingRoomDisplay.tsx  # TV layout rendering logic
│   ├── AvgConsultTime.tsx    # SLA controls & Call Next actions
│   ├── NowServing.tsx        # Active session hero widget
│   ├── PatientRegistration.tsx # Receptionist patient intake form
│   ├── QueueList.tsx         # Drag/Manage lists of waiting patients
│   ├── SupabaseAlert.tsx     # System connection status notifications
│   └── TopNavBar.tsx         # Header navigation & receptionist notifications dropdown
├── hooks/                    # Custom State & Calculation Hook Engines
│   └── useDisplayQueue.ts    # Real-time WebSocket hook & wait-time calculator
├── lib/                      # API Layer & Type Specifications
│   ├── displayApi.ts         # Query adapters for Display snapshot & WebSocket subscribers
│   ├── queueApi.ts           # Centralized database client mutation methods
│   ├── supabase.ts           # Supabase client instantiation
│   └── types.ts              # Global TypeScript mappings
├── public/                   # Static Media Assets (Screenshots, SVGs)
└── supabase_schema.sql       # Database table definitions, triggers, and sequences
```

---

## 🧮 Wait-Time Calculation Engine

Estimating patient wait time is done entirely client-side inside the custom React hook [useDisplayQueue.ts](file:///d:/simple%20projects/queue-cure/hooks/useDisplayQueue.ts) on a 1-second ticking interval, preventing unnecessary database reads.

### The SLA Formula:
For any given waiting patient at index $i$ (0-indexed in the waiting array):

$$\text{Estimated Wait} = \text{Remaining Current Session} + (i \times \text{Average Consult Minutes})$$

Where:
* **Session Elapsed Time:** Calculated dynamically by checking the difference between the current client timestamp (`Date.now()`) and the active patient's `called_at` timestamp.
* **Remaining Session Time:** 
  $$\text{Remaining Time} = \text{Average Consult Minutes} - (\text{Session Elapsed Time} \pmod{\text{Average Consult Minutes}})$$
  *If no patient is currently serving, this value defaults to 0.*

---

## 🗄️ Database Architecture

The backend database runs on PostgreSQL (via Supabase). The schema resides in [supabase_schema.sql](file:///d:/simple%20projects/queue-cure/supabase_schema.sql) and consists of:

### 1. `patients` Table
Stores records of patient sessions and emergency status.
```sql
CREATE TABLE patients (
  id            UUID                     PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_name  TEXT                     NOT NULL,
  token_number  BIGINT                   NOT NULL,
  status        TEXT                     NOT NULL CHECK (status IN ('waiting', 'serving', 'completed')) DEFAULT 'waiting',
  is_emergency  BOOLEAN                  NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc', now()),
  called_at     TIMESTAMP WITH TIME ZONE,
  completed_at  TIMESTAMP WITH TIME ZONE
);
```

### 2. Auto-Increment Token Trigger
To guarantee sequential ticket issuing, a dedicated PostgreSQL sequence `patient_token_seq` is maintained. A database trigger automatically queries this sequence on insertion to populate `token_number` safely:
```sql
CREATE SEQUENCE IF NOT EXISTS patient_token_seq START 1;

CREATE OR REPLACE FUNCTION assign_token_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.token_number := nextval('patient_token_seq');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_assign_token
  BEFORE INSERT ON patients
  FOR EACH ROW
  EXECUTE FUNCTION assign_token_number();
```

### 3. `settings` Table
Holds clinic configurations (e.g., `avg_consultation_time` in minutes) to persist settings across sessions.

---

## 🚀 Setup & Installation

### 1. Database Setup
1. Log in to your [Supabase Console](https://database.new).
2. Create a new project.
3. Open the **SQL Editor** in the dashboard and paste the entire script from [supabase_schema.sql](file:///d:/simple%20projects/queue-cure/supabase_schema.sql).
4. Run the query. This sets up the tables, sequence trigger, Row Level Security policies, and Realtime Publications.

### 2. Local Environment Variables
Create a file named `.env` in the root folder of your project and populate it with your Supabase API keys:
```env
NEXT_PUBLIC_SUPABASE_URL="https://YOUR_SUPABASE_PROJECT_REF.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOi..."
```

### 3. Install Dependencies
Run the package installer from your shell:
```bash
npm install
```

### 4. Boot Development Server
Run the local next server:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser to access the Reception Desk. To open the Patient Waiting Room display, click the **Patient Display** button in the top navbar or navigate directly to [http://localhost:3000/display](http://localhost:3000/display).

---

## 🎨 Styling Guidelines & Aesthetic Theme
The project applies a specialized design system dubbed **Clinical Clarity** (configured in [design.md](file:///d:/simple%20projects/queue-cure/design.md)):
* **Palette:**
  * `Primary` (#00685f / Medical Teal): Symbolizes health, safety, and active actions.
  * `Secondary` (#0051d5 / Clinical Blue): Highlights personalized info and secondary details.
  * `Background` (#F8FAFC / Soft Slate): Minimizes eye-strain during long shifts.
  * `Alert/Error` (#ba1a1a / Medical Red): Signals urgent emergency cases or overruns.
* **Layout:** Employs a flat clinical look using thin, low-contrast outlines (`border-slate-100`) rather than drop shadows, creating a pristine and modern digital dashboard.
