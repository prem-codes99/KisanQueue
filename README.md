# KisanQueue – Smart Procurement Management System

KisanQueue is a real-time smart farmer procurement scheduling and queue management system designed for the **Smart India Hackathon (SIH) 2026** under **Problem Statement ID 26032**. 

The application resolves the problem of long wait times, queue delays, and lack of billing and payout transparency at crop procurement centres (grain mandis) through:
- **Intelligent time-slot recommendations** that guide farmers to select low-congestion scheduling windows.
- **Dynamic waiting time prediction** utilizing active counters and queue positions.
- **Congestion solutions** that redirect bookings or suggest switching to nearby centres when capacity is exceeded.
- **Real-time token status timelines** synced dynamically using Socket.IO.
- **Role-based dashboard desks** for Farmers, Mandi Operators, and System Admins.

---

## 🏗️ Project Folder Structure

```text
kisanqueue/
├── client/                     # React + Vite Frontend
│   ├── src/
│   │   ├── components/         # Common Layout Components (Navbar, guards)
│   │   ├── context/            # Auth, Language, Notification Providers
│   │   ├── pages/              # User views (Farmer, Operator, Admin desks)
│   │   ├── utils/              # Translations dictionary (EN, HI, MR)
│   │   ├── App.jsx             # React Routes config
│   │   ├── index.css           # Tailwind style definitions
│   │   └── main.jsx            # React root renderer
│   ├── tailwind.config.js      # Styling themes
│   └── package.json            # Client packages
│
├── server/                     # Express API Backend
│   ├── controllers/            # Request handlers (auth, queue, bookings, etc.)
│   ├── middleware/             # Route protection and JWT parsing
│   ├── models/                 # Mongoose / MongoDB schemas
│   ├── routes/                 # Express route mappings
│   ├── utils/                  # DB seed data helper
│   ├── .env                    # Environment configurations
│   ├── package.json            # Server packages
│   └── server.js               # Express & Socket.io server entry point
│
├── package.json                # Root startup orchestration package
└── README.md                   # Installation & documentation
```

---

## 🛠️ Technology Stack

- **Frontend**: React.js, Vite, Tailwind CSS, React Router, Recharts, Lucide Icons, Socket.io-client.
- **Backend**: Node.js, Express.js, Socket.io.
- **Database**: MongoDB (Mongoose Object Modeling).
- **Authentication**: JWT (JSON Web Tokens), Bcrypt.js (secure password hashing).

---

## 🚀 Installation & Setup

### Prerequisites
- [Node.js](https://nodejs.org/) (v16+ recommended, tested on v24.18.0)
- [MongoDB](https://www.mongodb.com/) (running locally or MongoDB Atlas connection URI)

### Step 1: Install Dependencies
From the root directory, run the install command to install packages for the root, server, and client directories:
```bash
npm run install-all
```

### Step 2: Seed the Database
Ensure your MongoDB service is running (locally on `mongodb://127.0.0.1:27017/kisanqueue`).
To clear old databases and populate the database with realistic sample procurement centres, slots, bookings, completed weights, and test profiles, execute:
```bash
node server/utils/seed.js
```

### Step 3: Run the Application
Start both the Express API backend and the React Vite client concurrently with:
```bash
npm run dev
```
- The backend server starts on: **`http://localhost:5000`**
- The frontend client starts on: **`http://localhost:5173`**

---

## 🔑 Demo Account Credentials

Use these credentials to log in and test different user roles instantly:

| Role | Username / Mobile | Password | Notes / Profile Name |
| :--- | :--- | :--- | :--- |
| 👨🌾 **Farmer** | `9876543210` | `password123` | Ramesh Baliram Patil (village: Manjari Budruk) |
| 🏢 **Operator** | `operator1` | `password123` | Suhas Deshmukh (Kharadi Mandi Centre) |
| 👨💼 **Admin** | `admin1` | `password123` | System Control Tower Monitor |

---

## 🎯 Verification Demo Story Flow

To verify the entire problem statement flow:
1. **Log in as the Farmer** (`9876543210`). The dashboard shows a pre-seeded future booking for crop **Wheat** with Token **KQ-124** scheduled at Kharadi Mandi.
2. **Open another browser window / log in as the Operator** (`operator1`). Look at the live queue page. You will see active tokens: `KQ-119` (Serving), `KQ-120` (Waiting), `KQ-121` (Waiting).
3. **Check-in the Farmer Patil**: On the operator dashboard (under the check-in section on the left), click the **Simulate Check-in: Ramesh Patil** button. This mimics the farmer arriving at the mandi gate.
4. **Inspect the live queue update**: Patil's booking is instantly added to the live queue list. On Patil's farmer dashboard, the screen updates in real-time, displaying:
   - Position: `#4`
   - Wait Time: `30 Minutes`
   - Estimated Arrival time recommended.
5. **Call the Next Farmers**: The operator clicks **Call Next Farmer** to cycle through the queue. Watch Patil's token position decrease on their farmer screen!
6. **Finalize weighing**: When Patil's token is called, the operator clicks **Start Weigh & Quality check**, records crop weight (e.g. `48.2 q`), and selects **Grade A**. Clicking save completes the procurement.
7. **Verify payout update**: Patil's dashboard immediately updates to show procurement completed. The payment tab shows a pending bill of ₹109,655. The operator/admin goes to payments, logs processing, and completes payment to post the final transaction reference ID!
