# MediLink — React Admin Web Dashboard

MediLink Admin is a dedicated, separate web administration portal for the **MediLink Smart Digital Healthcare Platform**. It operates independently of the Flutter mobile application (which is reserved for patients and doctors), allowing platform administrators and hospital administrators to manage and monitor healthcare operations.

---

## 🏥 Architecture Overview

```
                        ┌──────────────────────────────────────────────┐
                        │        PostgreSQL Database (Prisma ORM)      │
                        └──────────────────────┬───────────────────────┘
                                               │
                                               ▼
                        ┌──────────────────────────────────────────────┐
                        │      Express / Node.js Backend API (:5000)   │
                        └───────┬──────────────────────────────┬───────┘
                                │                              │
                (REST API / JWT Auth)          (REST API / Session Token)
                                │                              │
                                ▼                              ▼
    ┌──────────────────────────────────────────┐    ┌──────────────────────────────────────────┐
    │     React Admin Web Portal (:5173)       │    │      Flutter Mobile App (iOS / Android)  │
    │  - SuperAdmin Platform Monitoring        │    │  - Patient Consultations & Discovery     │
    │  - Hospital Operations & Billing         │    │  - Doctor Clinical Dashboard             │
    └──────────────────────────────────────────┘    └──────────────────────────────────────────┘
```

---

## 🛠️ Technology Stack

- **Framework:** React 19 + TypeScript
- **Bundler & Dev Server:** Vite
- **Styling:** Tailwind CSS (Customized with MediLink healthcare palette)
- **Routing:** React Router v7 (`react-router-dom`)
- **Data Visualization:** Recharts (Appointment trends, status distribution, revenue charts)
- **Icons:** Lucide React
- **HTTP Client:** Axios (Configured with request/response interceptors & token authentication)

---

## 🎨 MediLink Visual Identity

- **Deep Teal:** `#2C6975` (Primary accents, headers, branding)
- **Soft Teal:** `#68B2A0` (Secondary icons and badges)
- **Sage:** `#CDE0C9` (Subtle highlights, borders)
- **Pale Green:** `#E0ECDE` (Light surface backgrounds, badges)
- **Dark Slate:** `#263238` (High-contrast typography)
- **Muted Slate:** `#607D80` (Secondary labels and descriptions)

---

## 📂 Project Structure

```
admin-web/
├── public/
├── src/
│   ├── assets/
│   ├── components/
│   │   ├── layout/
│   │   │   ├── AdminLayout.tsx        # Responsive layout shell (Sidebar + Header + Outlet)
│   │   │   ├── Header.tsx             # Top navigation bar, admin profile status & actions
│   │   │   ├── Sidebar.tsx            # Branded left sidebar with active route tracking
│   │   │   └── ProtectedRoute.tsx     # Route guard enforcing authentication & admin role
│   │   └── ui/
│   │       ├── Badge.tsx              # Status indicator badges
│   │       ├── Button.tsx             # Standard buttons with loading states and variants
│   │       ├── Card.tsx               # Container cards with header actions
│   │       ├── EmptyState.tsx         # User-friendly empty states
│   │       ├── Modal.tsx              # Reusable responsive dialogs
│   │       ├── Pagination.tsx         # Data table pagination controls
│   │       ├── Spinner.tsx            # Loading spinners
│   │       └── StatCard.tsx           # Dashboard metric cards
│   ├── pages/
│   │   ├── AdminLoginPage.tsx         # Secure email/password login with role verification
│   │   ├── AdminOverviewPage.tsx      # Platform metrics, Recharts charts, and recent activity
│   │   ├── HospitalsPage.tsx          # Hospital directory, search, filter, and edit modal
│   │   ├── DoctorsPage.tsx            # Physician directory, specialization filter, detail modal
│   │   ├── PatientsPage.tsx           # Privacy-conscious patient directory & demographics
│   │   ├── AppointmentsPage.tsx       # Encounter lifecycle tracking & status updates
│   │   ├── PaymentsPage.tsx           # Invoices breakdown & gateway transaction logs
│   │   └── AdminSettingsPage.tsx      # Admin profile, system specs, security policies, logout
│   ├── services/
│   │   ├── api.ts                     # Axios client with bearer token interceptor
│   │   ├── authService.ts             # Session store & role verification service
│   │   └── adminService.ts            # Typed API methods for platform operations
│   ├── types/
│   │   └── index.ts                   # Core TypeScript types for all healthcare models
│   ├── App.tsx                        # Application router configuration
│   ├── main.tsx                       # React application entry point
│   └── index.css                      # Tailwind styling and typography
├── .env.example                       # Environment configuration template
├── package.json
├── tsconfig.json
└── vite.config.ts
```

---

## 🚀 Setup & Local Execution

### 1. Prerequisites

- Node.js (v18 or higher)
- Backend server running on `http://localhost:5000`

### 2. Environment Configuration

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Ensure `.env` contains:
```env
VITE_API_BASE_URL=http://localhost:5000/api
```

### 3. Install Dependencies

```bash

npm install
```

### 4. Run Development Server

```bash
npm run dev
```

The application will start at `http://localhost:5173`. Navigate to `http://localhost:5173` to access the portal.

### 5. Production Build

```bash
npm run build
```

This compiles TypeScript and generates production assets under `admin-web/dist/`.

---

## 🔐 Administrator Provisioning & Credentials

For security, admin accounts cannot be registered through public forms. Provisioning is performed securely via the backend seed script:

```bash
node backend/scripts/seedAdmin.js
```

### Default Seeded Administrators

| Role | Email | Password | Scope |
| :--- | :--- | :--- | :--- |
| **SuperAdmin** | `admin@medilink.com` | `Admin@12345` | Platform-wide administration |
| **HospitalAdmin** | `hospitaladmin@medilink.com` | `Admin@12345` | Facility-scoped administration |

---

## 🛡️ Role-Based Access Control (RBAC)

1. **Server-Side Enforcement:** Every administrative endpoint (`/api/analytics/dashboard`, `/api/hospitals/:id`, etc.) is protected by Express middleware verifying the user's role against the database (`SUPER_ADMIN` or `HOSPITAL_ADMIN`).
2. **Client-Side Guarding:** `ProtectedRoute.tsx` verifies that the stored JWT session belongs to an authorized admin account. Non-admin users attempting to navigate to `/admin/*` are blocked with an Access Denied view.
3. **Least-Privilege Privacy:** Sensitive clinical files, prescriptions, and private vault records are strictly restricted from general administrator views.
