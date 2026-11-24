# Techno CRM Mobile App (React Native + Expo)

A cross-platform React Native mobile application for **Techno CRM**, designed for sales executives, recovery officers, and enterprise managers on iOS and Android.

---

## 🎨 Theme & Branding
- **Primary Palette**: Vibrant Violet / Lavender (`#7c3aed`, `#8b5cf6`, `#6d28d9`) matching the Techno CRM brand identity.
- **Accents**: Emerald Green (`#10b981`), Amber (`#f59e0b`), Crimson (`#ef4444`), Sky Blue (`#0ea5e9`), and Slate Gray (`#0f172a`).
- **UI Components**: Elevated cards with soft shadows, status badges, linear gradient stat widgets, floating action buttons, and bottom action sheets.
- **Custom Branding**: App icon, splash screen, and logo integrated directly into the login & header flows.

---

## 🚀 Key Modules & Features

### 1. 🔐 Authentication & Multi-Session Management
- Connects directly to ASP.NET Core `AuthController.cs` (`/api/Auth/login`).
- Session Token & JWT Bearer token automatic attachment.
- Multi-session invalidation handling.
- **Server Configuration screen**: Easily configure backend API URL for local dev (`http://192.168.1.X:7138/api`), Android emulator (`http://10.0.2.2:7138/api`), or live server.

### 2. 📊 Executive Dashboards (Sales & Credit)
- Total Leads, Pipeline Value, Conversion Rates, Won deals value.
- Credit outstanding, overdue balances, monthly collection stats.
- Quick Shortcuts (Add Lead, Quotations, Add Receipt, My Tasks, Credit Master).
- Today's scheduled follow-ups with 1-touch dialer and WhatsApp action.

### 3. 🎯 Sales Pipeline & Leads Management
- Search and filter by lead status (New, In Progress, Contacted, Proposal Sent, Won, Lost) and source.
- Full Lead details (Opportunity value, priority, requirements, assigned person).
- Add & Edit Leads with validation.
- Direct communication actions: Call, WhatsApp with templates, and Email.

### 4. 📇 Contacts Directory
- Full business contacts index with instant search.
- 1-touch phone dialer, WhatsApp direct chat, and email draft.
- Add new contact modal.

### 5. 💰 Credit & Recovery Management
- **Credit Master**: Customer credit limits, utilized credit, available balances, credit terms.
- **Payment Collection / Receipts**: Record receipts with NEFT, RTGS, UPI, Cheque, or Cash.
- **Aging & Outstanding Reports**: Visual progress distribution for 0-30 days, 31-60 days, 61-90 days, and 90+ days.

### 6. 📋 Activities & Field Operations
- **Tasks**: Checkbox completion toggle, priority pills (High, Medium, Low), due dates, and categories (Sales, Credit, FollowUp, General).
- **Notes**: Instant categorized notes with quick add & delete.
- **Reminders**: Scheduled alert tracking with completion status.
- **Field Visits**: Log on-site client visits with location, purpose, and meeting outcomes.

### 7. 💬 CRM Quick Messaging & Templates
- WhatsApp & SMS template composer with automatic variable replacement (`{{LeadName}}`, `{{ProductInterestedIn}}`, `{{Amount}}`, `{{CompanyName}}`).

---

## 📱 How to Run the App

### 1. Prerequisites
- Node.js (v18+)
- Expo CLI (`npx expo`)
- [Expo Go](https://expo.dev/go) app installed on your physical Android or iPhone (or Android Studio / iOS Simulator).

### 2. Start the Development Server
```bash
cd techno_crm_mobile
npm start
```

### 3. Open on Device
- **Physical Phone**: Scan the QR code displayed in the terminal using the **Expo Go** app (Android) or the **Camera** app (iOS).
- **Android Emulator**: Press `a` in the terminal.
- **Web Browser**: Press `w` in the terminal.

### 4. Default Demo Credentials
- **Username**: `admin`
- **Password**: `admin123`
*(Or any user account registered in your Techno CRM backend database).*

---

## 🛠️ Project Structure
```
techno_crm_mobile/
├── assets/                       # Techno CRM Logo, App Icons & Splash
├── src/
│   ├── api/                      # Backend API Client & Services
│   │   ├── client.ts             # Axios instance & token interceptors
│   │   ├── authService.ts        # Auth & session endpoints
│   │   ├── leadService.ts        # Leads CRUD & filters
│   │   ├── contactService.ts     # Contacts CRUD
│   │   ├── salesService.ts       # Dashboards & Quotations
│   │   ├── creditService.ts      # Credit Master, Receipts, Aging
│   │   ├── taskService.ts        # Tasks, Notes, Reminders, Visits
│   │   ├── mastersService.ts     # Roles, Depts, Company Info
│   │   └── messagingService.ts   # WhatsApp & SMS templates
│   ├── components/               # Reusable UI Library
│   │   ├── common/               # Header, StatCard, Badge, Button, Input, SearchBar, FAB
│   │   ├── cards/                # LeadCard, ContactCard, TaskCard, ReceiptCard, QuotationCard
│   │   └── modals/               # QuickMessageModal
│   ├── context/                  # AuthContext & ThemeContext
│   ├── navigation/               # React Navigation (Bottom Tabs + Native Stack)
│   ├── screens/                  # Feature Screens (Auth, Dashboard, Leads, Contacts, Credit, Activities, Profile)
│   ├── theme/                    # Design tokens (Colors, Typography, Spacing, Shadows)
│   └── utils/                    # Formatting & Communication helpers
├── app.json                      # Expo configuration
├── package.json
└── App.tsx                       # Root Entry Point
```
