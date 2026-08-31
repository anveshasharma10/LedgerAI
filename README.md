# 💰 Ledger AI — Intelligent Expense & Financial Management Platform

[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue.svg)](https://www.typescriptlang.org/)
[![Express.js](https://img.shields.io/badge/Express.js-4.21-black.svg)](https://expressjs.com/)
[![Gemini AI](https://img.shields.io/badge/Powered%20By-Google%20Gemini%20AI-orange.svg)](https://ai.google.dev/)

**Ledger AI** is a full-stack, enterprise-grade personal and commercial expense tracker, budget planner, and financial analytics console powered by **Node.js, Express, TypeScript, SQLite/SQL**, and **Google Gemini AI**.

It enables users to track incomes, log expenses across multi-category allocations, monitor monthly budget burn rates with real-time Chart.js visualizers, scan and categorize receipts with AI, and provides administrators with an end-to-end management portal with security audit logs and health telemetry.

---

## 🌟 Key Features

### 👤 **Personal Finance Suite (User Portal)**
* **Real-time Dashboard**: Overview of net balance, cash flow trends, monthly spend limits, and recent transaction feeds.
* **Smart Expense & Income Tracking**: Multi-category tagging (Food, Rent, Shopping, Bills, Transport, Healthcare, Education, Entertainment) with payment method classification (UPI, Credit Card, Debit Card, Net Banking, Cash).
* **Category Budgeting & Burn Rate Alerts**: Set monthly budget caps per category with visual progress indicators and automatic overrun warnings.
* **AI Financial Insights**: Automated pattern analysis powered by Google Gemini to detect spending anomalies, identify savings opportunities, and optimize cash flow.
* **AI Receipt OCR & Smart Scanner**: Extract vendor, amount, date, and category automatically from uploaded receipts and invoices.
* **Custom Reporting & Exporting**: Generate comprehensive PDF and CSV reports filtered by date ranges, categories, and payment types.

### 🛡️ **Enterprise Administration Console (Admin Portal)**
* **User Management**: View, filter, activate/deactivate user accounts, and inspect individual user telemetry.
* **Transaction Monitoring**: Global platform-wide transaction feed with advanced search, status monitoring, and audit trails.
* **Platform Analytics**: Macro-economic charts tracking total platform volume, average user retention, and system-wide category breakdowns.
* **System Health & Diagnostics**: Real-time server latency, memory usage, database query times, and uptime metrics.
* **Security & Audit Logs**: Immutable record of authentication events, status changes, and administrative actions.

---

## 🛠️ Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | HTML5, Modern Vanilla JavaScript (ES6+), CSS3 (Custom Design System & Variables), Chart.js |
| **Backend** | Node.js, Express.js, TypeScript, RESTful API architecture |
| **Database** | SQLite / SQL.js (Relational tables with automatic migrations and seeding) |
| **Authentication & Security** | JWT (JSON Web Tokens), bcryptjs password hashing, Role-Based Access Control (RBAC) |
| **Artificial Intelligence** | Google Gemini API (`@google/genai` SDK) |
| **Build & Tooling** | Vite, esbuild, tsx, TypeScript Compiler (`tsc`) |

---

## 🚀 Getting Started

Follow these steps to run the application locally on your machine.

### **1. Prerequisites**
* [Node.js](https://nodejs.org/) (`v18.0.0` or higher)
* [npm](https://www.npmjs.com/) (bundled with Node.js) or `yarn` / `pnpm`
* *(Optional)* A [Google Gemini API Key](https://aistudio.google.com/app/apikey) for AI features.

---

### **2. Installation**

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/ledger-ai.git
   cd ledger-ai
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

---

### **3. Environment Configuration**

Create a `.env` file in the root directory (or copy from `.env.example`):
```bash
cp .env.example .env
```

Add your environment variables:
```env
PORT=3000
JWT_SECRET=your_jwt_super_secret_key_here
GEMINI_API_KEY=your_gemini_api_key_here
```
> **Note:** The core application and database work out of the box even without a Gemini API key. Providing `GEMINI_API_KEY` activates the live AI chatbot, smart insights, and receipt scanning.

---

### **4. Running the Application**

#### **Development Mode (with live hot reload):**
```bash
npm run dev
```

#### **Production Build & Execution:**
```bash
npm run build
npm start
```

Once running, access the application in your browser:
👉 **`http://localhost:3000`**

---

## 🔑 Pre-Configured Demo Accounts

The database automatically initializes and seeds these accounts on first run:

| Account Name | Role | Email | Password | Dataset Profile |
| :--- | :--- | :--- | :--- | :--- |
| **Reva** | User | `reva@example.com` | `Reva@123` | UI/UX Designer & Creative Studio (High Margin & Royalties) |
| **Alex** | User | `demo@example.com` | `Demo@123` | Software Engineer (Tech Gear, Subscriptions & Index SIPs) |
| **System Admin** | Admin | `admin@ledgerai.com` | `Admin@123` | Full Access to Admin Console (`/admin.html`) |

> You can also register any new account on the **`/register.html`** page.

---

## 📂 Project Structure

```
├── backend/
│   ├── config/
│   │   └── db.ts                # Database connection & SQLite schema initialization
│   ├── middleware/
│   │   ├── authMiddleware.ts    # JWT & RBAC verification
│   │   └── errorMiddleware.ts   # Centralized error handler
│   ├── routes/
│   │   ├── adminRoutes.ts       # Platform stats, user management & audit endpoints
│   │   ├── aiRoutes.ts          # Gemini API integration & receipt OCR
│   │   ├── analyticsRoutes.ts   # Aggregate financial trend computations
│   │   ├── authRoutes.ts        # Register, login, token refresh
│   │   ├── budgetRoutes.ts      # Category limits & monthly burn tracking
│   │   ├── expenseRoutes.ts     # Expense CRUD & category filters
│   │   └── incomeRoutes.ts      # Income CRUD & revenue stream tracking
│   └── services/
│       ├── demoService.ts       # Demo user dynamic dataset engine
│       └── revaDataGenerator.ts # Reva profile creative dataset engine
├── frontend/
│   ├── css/                     # Global themes, responsive layouts & component styles
│   ├── js/
│   │   ├── admin-common.js      # Admin shell, auth guards, navigation & modals
│   │   ├── api.js               # Central HTTP client & token manager
│   │   ├── auth.js              # Client-side authentication logic
│   │   ├── dashboard.js         # User charts, transaction feeds & metrics
│   │   └── ...                  # Feature-specific client scripts
│   ├── admin.html               # Main Admin Console
│   ├── admin-users.html         # User Management
│   ├── admin-audit.html         # Security & Audit Logs
│   ├── dashboard.html           # User Financial Dashboard
│   ├── expenses.html            # Expense Management
│   ├── budgets.html             # Budget Planner
│   ├── analytics.html           # Deep Financial Analytics
│   ├── ai-assistant.html        # AI Advisor & Receipt Scanner
│   └── login.html               # Authentication Portal
├── server.ts                    # Main Express server entry point & static dispatcher
├── package.json                 # Scripts and dependencies
└── tsconfig.json                # TypeScript configuration
```

---

## 🔒 Security Best Practices

* **Zero Plaintext Passwords**: Passwords hashed with `bcryptjs` using a salt work factor of 10.
* **Stateful Token Invalidation**: Clear auth handlers purge tokens and prevent session hijacking.
* **Strict RBAC Enforcement**: Backend routes strictly enforce `admin` roles on all `/api/admin/*` endpoints.
* **SQL Injection Protection**: All database queries use parameterized SQL statements.

---

## 🤝 Contributing

Contributions are welcome! Follow these steps:

1. Fork the repository.
2. Create your feature branch (`git checkout -b feature/AmazingFeature`).
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`).
4. Push to the branch (`git push origin feature/AmazingFeature`).
5. Open a Pull Request.

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.
