# Coop Tracking System

A comprehensive web application for managing a 20-member cooperative with monthly contributions, loan management, and detailed financial tracking.

## 🌟 Features

### **Member Management**

- 20 pre-configured members (Member 1-20) with customizable names
- Individual payment tracking per collection period
- Member search functionality
- Bulk payment operations (Mark All Paid/Unpaid)
- Individual member payment history and loan status overview

### **Collection Periods**

- Automated schedule following 10th and 25th of each month
- Manual period creation with custom dates
- "Add Next Period" button for easy scheduling
- Period-based payment tracking with totals
- Flexible payment amounts (not limited to ₱1,000)

### **Advanced Loan Management**

- **Loan Creation**: Create loans for any member with custom amounts
- **Repayment Plans**:
  - **Cut-off Plan**: 3% interest, payments due every 10th and 25th
  - **Monthly Plan**: 4% interest, one-time payment
- **Loan Status Tracking**: PENDING → APPROVED/REJECTED → PAID
- **Automatic Calculations**: Principal + interest based on terms
- **Installment Tracking**: Shows periods paid vs. total periods
- **Repayment Management**: Record partial or full repayments per period
- **Smart Status Updates**: Automatically marks loans as PAID when fully repaid

### **Financial Dashboard**

- **Current Balance**: Real-time calculation of cooperative funds
- **Period Ledger**: Detailed breakdown per period
  - Beginning Balance
  - Collections This Period
  - Loan Disbursements
  - Repayments Received
  - Ending Balance
- **Auto-balancing**: System automatically recalculates balances

### **Data Persistence**

- **Supabase Integration**: Cloud database storage with authentication
- **User-Specific Data**: Each user's cooperative data is completely isolated
- **Local State Management**: React Context with automatic sync
- **Real-time Updates**: Changes reflect immediately across all pages
- **Automatic Backup**: Cloud-based data storage with automatic backups

### **Responsive Design**

- **Mobile-First**: Fully responsive design optimized for smartphones and tablets
- **Adaptive Navigation**: Collapsible hamburger menu for mobile devices
- **Touch-Friendly Interface**: Large buttons and touch targets for mobile interaction
- **Responsive Tables**: Mobile-optimized card layouts for complex data
- **Flexible Grid System**: Adaptive layouts that work across all screen sizes
- **Cross-Device Sync**: Seamless data synchronization across all devices

## 🛠️ Technology Stack

- **Frontend**: Next.js 15.4.6 with React 19
- **Styling**: Tailwind CSS 4.0 with responsive utilities and custom components
- **TypeScript**: Full type safety throughout
- **Database**: Supabase (PostgreSQL)
- **State Management**: React Context + useReducer
- **Date Handling**: date-fns library
- **Utilities**: clsx for conditional styling
- **Responsive Design**: Mobile-first approach with Tailwind CSS breakpoints

## 📱 Pages & Navigation

1. **Authentication** - Secure login/signup with email and password
2. **Home Dashboard** (`/`) - Main interface with collection periods, loan creation, and member payments
3. **Members** (`/members`) - Member management with search, bulk operations, and payment history
4. **Loans** (`/loans`) - Detailed loan management with repayments and status updates

### **Mobile Experience**

- **Responsive Navigation**: Hamburger menu for mobile devices with smooth transitions
- **Touch-Optimized Interface**: Large, accessible buttons and form controls
- **Mobile-Friendly Tables**: Card-based layouts for complex data on small screens
- **Adaptive Typography**: Responsive text sizing for optimal readability
- **Swipe-Friendly**: Horizontal scrolling where needed for tables and data

## 🚀 Installation & Setup

### Prerequisites

- Node.js (Latest LTS version)
- npm or yarn package manager
- Supabase account (optional, for cloud storage)

### Installation

```powershell
# Clone or navigate to project directory
cd coop-tracking

# Install dependencies
npm install
# or if PowerShell blocks npm.ps1:
npm.cmd install
```

### Environment Setup (Optional)

Create a `.env.local` file for Supabase integration:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Development Server

```powershell
# Start development server
npm run dev
# or:
npm.cmd run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📊 Financial Calculations

### Balance Computation

- **Current Balance** = Total Collections + Total Repayments - Total Approved Loan Disbursements
- **Period Beginning Balance** = Sum of previous periods (collections - disbursements)
- **Period Ending Balance** = Beginning Balance + This Period Collections - This Period Disbursements

### Loan Interest Calculations

- **Cut-off Plan (3%)**: Total Due = Principal × (1 + 0.03 × months)
- **Monthly Plan (4%)**: Total Due = Principal × (1 + 0.04 × months)
- **Installments**: Total Due ÷ Number of Payment Periods

### Payment Schedules

- **Cut-off Plan**: 2 payments per month (10th and 25th)
- **Monthly Plan**: 1 payment per month on approval date anniversary

## 💡 Usage Tips

### Getting Started

1. **Create Collection Periods**: Use "Add Next Period (10th/25th)" for automatic scheduling
2. **Record Payments**: Select a period, then record individual or bulk payments
3. **Manage Loans**: Create loans, approve/reject them, and track repayments

### Best Practices

- Always select a collection period before recording payments
- Use "Mark All Paid" with custom amounts for bulk operations
- Regularly check the Period Ledger for financial accuracy
- Record loan repayments in the period they were actually received

### Mobile Usage Tips

- **Portrait Mode**: Optimized for vertical phone orientation
- **Tablet Support**: Enhanced layouts for tablet-sized screens
- **Quick Actions**: Swipe and tap gestures for common operations
- **Offline-Ready**: Data persists locally and syncs when connection is restored
- **Multi-Device**: Switch seamlessly between phone, tablet, and desktop

### Data Management

- All data is automatically saved to local storage
- With Supabase setup, data syncs to cloud storage
- Use the Members page for detailed member history and bulk operations

## 🏗️ Project Structure

```
src/
├── app/
│   ├── page.tsx           # Main dashboard (responsive design)
│   ├── members/page.tsx   # Member management (mobile-optimized)
│   ├── loans/page.tsx     # Loan management (tablet-friendly)
│   └── layout.tsx         # App layout with responsive navigation
├── components/
│   ├── AppNavigation.tsx  # Responsive navigation with mobile menu
│   ├── AuthForm.tsx       # Mobile-friendly authentication
│   └── ProtectedRoute.tsx # Authentication wrapper
├── context/
│   ├── CoopContext.tsx    # Global state management
│   └── AuthContext.tsx    # Authentication state
├── lib/
│   ├── supabaseClient.ts  # Database client
│   └── remoteState.ts     # Data persistence with sync
└── types/
    └── index.ts           # TypeScript definitions
```

### **Responsive Design Features**

- **Breakpoint System**: Mobile (sm), Tablet (md), Desktop (lg, xl)
- **Component Adaptability**: Components that transform for different screen sizes
- **Mobile Navigation**: Collapsible menu system with smooth animations
- **Touch Interactions**: Optimized for touchscreen devices
- **Performance**: Optimized bundle size and loading for mobile networks

## 🤝 Contributing

This is a specialized cooperative management system. To contribute:

1. Understand the cooperative's specific requirements
2. Test thoroughly with real financial scenarios
3. Ensure data integrity in all operations
4. Follow TypeScript best practices

## 📝 License

Private project for cooperative use.
