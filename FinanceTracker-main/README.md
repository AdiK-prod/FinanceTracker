# Finance Tracker - Household Spending Manager

A Level 1 UI Demo for a household financial manager app focused on spending visibility. This is a visual prototype with hardcoded data — no backend, no real CSV parsing, just a beautiful, interactive interface to validate the concept.

## Features

- **Upload Screen**: Drag-and-drop zone for CSV/XLSX files (visual only)
- **Tagging Interface**: Review and categorize expenses with auto-tagged indicators
- **Dashboard Overview**: Monthly spending visualization with pie charts and transaction lists
- **Detailed View**: Drill-down into categories with bar charts and advanced filtering

## Tech Stack

- React 18+ with Vite
- React Router v6
- Tailwind CSS
- Recharts (for charts)
- lucide-react (for icons)

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Open your browser and navigate to `http://localhost:5173`

### Build for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

## Project Structure

```
src/
├── components/
│   ├── Layout.jsx          # Sidebar + main content wrapper
│   ├── UploadZone.jsx      # Drag-drop component
│   ├── ExpenseTable.jsx    # Tagging interface table
│   ├── PieChart.jsx        # Dashboard pie chart
│   ├── BarChart.jsx        # Detailed view bar chart
│   └── TransactionList.jsx # Reusable transaction list
├── pages/
│   ├── Upload.jsx          # Upload screen
│   ├── Tagging.jsx         # Tagging interface
│   ├── Dashboard.jsx       # Dashboard overview
│   └── Detailed.jsx        # Detailed category view
├── data/
│   └── sampleExpenses.js   # Hardcoded sample data
├── App.jsx                 # Router setup
└── main.jsx                # Entry point
```

## Navigation Flow

- **Upload** → Tagging (on upload button click)
- **Tagging** → Dashboard (on "Save & Continue")
- **Dashboard** → Detailed (on category/transaction click)
- All screens accessible via sidebar at any time

## Design

Clean SaaS minimalist design with:
- White background with subtle gray sections
- Teal accent color (#14B8A6) for primary actions
- Fixed sidebar navigation (240px width)
- Max content width of 1200px, centered
- Generous whitespace and smooth transitions

## Notes

- This is a **Level 1 demo** with hardcoded data
- No backend, no real file parsing, no authentication
- All interactions are visual only for demonstration purposes
- Sample data includes 35+ transactions across 8 main categories
