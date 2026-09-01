# 💊 AbyteMedix

### 🏥 Modern Medical Store & Pharmacy Management System

> **A complete, fast, reliable and offline-first solution for managing modern medical stores and pharmacies.**

---

## ✨ Overview

**AbyteMedix** is a modern **Medical Store & Pharmacy Management System** built to simplify and automate everyday pharmacy operations.

From **medicine inventory and batch tracking** to **sales, purchases, billing, expiry management, suppliers, customers and business reports**, AbyteMedix brings everything together in one powerful platform.

Designed with **performance, reliability and ease of use** in mind, AbyteMedix is suitable for both small medical stores and high-volume pharmacy businesses.

---

## 🚀 Key Features

| Module | Features |
|--------|----------|
| 💊 **Medicine Management** | Medicine catalog, categories, manufacturers, pricing & product details |
| 📦 **Inventory** | Real-time stock tracking and inventory management |
| 🏷️ **Batch Management** | Batch numbers, quantities, purchase rates & selling rates |
| ⏰ **Expiry Tracking** | Expired & near-expiry medicine monitoring |
| 🧾 **POS Billing** | Fast and efficient medical store billing |
| 🛒 **Purchases** | Purchase invoices, suppliers, receiving & purchase history |
| 💰 **Pricing** | Purchase price, retail price & custom pricing |
| 👥 **Customers** | Customer profiles, balances & transaction history |
| 🏢 **Suppliers** | Supplier management, purchases & outstanding balances |
| 📊 **Reports** | Sales, purchases, inventory, profit & business reports |
| 💳 **Payments** | Customer & supplier payment tracking |
| 🔎 **Barcode** | Barcode-based medicine search & billing |
| 🖥️ **Offline** | Designed to work without requiring a constant internet connection |

---

## 🎯 Why AbyteMedix?

AbyteMedix is built specifically around the daily challenges faced by medical stores and pharmacies.

### ⚡ Fast
Optimized workflows for quick medicine search, billing and inventory operations.

### 🔒 Reliable
Designed with data integrity and business continuity in mind.

### 📦 Inventory Focused
Complete control over medicine stock, batches, pricing and expiry dates.

### 🧠 Smart Management
Get better visibility into sales, purchases, stock and overall business performance.

### 🖥️ Offline First
Continue managing your medical store even when the internet is unavailable.

---

## 🏗️ Core Modules

```text
AbyteMedix
│
├── 💊 Medicine Management
├── 📦 Inventory Management
├── 🏷️ Batch Management
├── ⏰ Expiry Management
├── 🧾 POS & Billing
├── 🛒 Purchase Management
├── 👥 Customer Management
├── 🏢 Supplier Management
├── 💳 Payment Management
├── 📊 Reports & Analytics
└── ⚙️ System Management
```

---

## 📥 Installation

### System Requirements

- **OS:** Windows 10 / 11 (64-bit)
- **RAM:** 4 GB minimum (8 GB recommended)
- **Storage:** 500 MB free disk space
- **Network:** LAN connection (for multi-PC setup)

---

### 🖥️ Single PC Setup

1. Go to [**Releases**](https://github.com/MuhamadArhum/abyte-medix/releases/latest) and download **`AbyteMedix.Setup.x.x.x.exe`**
2. Run the installer — Windows may show a SmartScreen warning, click **"More info" → "Run anyway"**
3. Choose installation directory and click **Install**
4. Launch **AbyteMedix** from the Desktop shortcut
5. The app will automatically detect and start the database on first launch

---

### 🌐 LAN Multi-PC Setup (Server + Clients)

AbyteMedix supports a **server-client architecture** over a local network — one PC acts as the server, others connect to it.

#### Step 1 — Server PC

1. Install AbyteMedix on the **main/server PC** using the steps above
2. Launch the app — it will start the local database and API server
3. Find the server PC's **local IP address**:
   - Open Command Prompt → type `ipconfig`
   - Note the **IPv4 Address** (e.g., `192.168.1.5`)

#### Step 2 — Client PCs

1. Install AbyteMedix on each **client PC** using the same installer
2. On first launch, a **Setup Wizard** will appear — select **"Connect to Server (LAN)"**
3. Enter the **Server IP Address** (e.g., `192.168.1.5`) and **Port** (default: `3002`)
4. Click **Connect** — the app will restart and connect to the server
5. All client PCs will now share the same data from the server

> **Note:** Make sure all PCs are connected to the **same LAN/WiFi network** and Windows Firewall allows AbyteMedix through.

#### Changing Server IP Later

If you need to change the server IP after setup:

1. Open AbyteMedix → go to **Settings → Server Configuration**
2. Update the **Server IP** and **Port**
3. Click **Save** — the app will restart with the new configuration

> Config is saved at: `C:\Users\<username>\AppData\Roaming\AbyteMedix\config.json`

---

## 🔄 Updates

AbyteMedix supports **automatic updates**. When a new version is released, the app will notify you and download the update in the background.

---

## 📞 Support

For issues or feature requests, open a ticket on [GitHub Issues](https://github.com/MuhamadArhum/abyte-medix/issues).
