// Sample expense data for the demo
export const sampleExpenses = [
  { id: 1, date: "2025-01-15", merchant: "Whole Foods", amount: 87.43, mainCategory: "Groceries", subCategory: "Supermarket", autoTagged: true },
  { id: 2, date: "2025-01-14", merchant: "Starbucks", amount: 5.75, mainCategory: "Dining Out", subCategory: "Coffee Shops", autoTagged: true },
  { id: 3, date: "2025-01-14", merchant: "Shell Gas Station", amount: 45.00, mainCategory: "Transportation", subCategory: "Gas", autoTagged: false },
  { id: 4, date: "2025-01-13", merchant: "Netflix", amount: 15.99, mainCategory: "Entertainment", subCategory: "Streaming", autoTagged: true },
  { id: 5, date: "2025-01-12", merchant: "Target", amount: 124.67, mainCategory: "Shopping", subCategory: "Home Goods", autoTagged: false },
  { id: 6, date: "2025-01-12", merchant: "Chipotle", amount: 12.50, mainCategory: "Dining Out", subCategory: "Fast Food", autoTagged: true },
  { id: 7, date: "2025-01-11", merchant: "ConEdison", amount: 125.30, mainCategory: "Utilities", subCategory: "Electric", autoTagged: true },
  { id: 8, date: "2025-01-11", merchant: "Uber", amount: 18.75, mainCategory: "Transportation", subCategory: "Ride Share", autoTagged: true },
  { id: 9, date: "2025-01-10", merchant: "CVS Pharmacy", amount: 45.20, mainCategory: "Healthcare", subCategory: "Pharmacy", autoTagged: false },
  { id: 10, date: "2025-01-10", merchant: "Trader Joe's", amount: 62.15, mainCategory: "Groceries", subCategory: "Supermarket", autoTagged: true },
  { id: 11, date: "2025-01-09", merchant: "Amazon Prime", amount: 14.99, mainCategory: "Entertainment", subCategory: "Streaming", autoTagged: true },
  { id: 12, date: "2025-01-09", merchant: "Best Buy", amount: 299.99, mainCategory: "Shopping", subCategory: "Electronics", autoTagged: false },
  { id: 13, date: "2025-01-08", merchant: "Metro Transit", amount: 5.50, mainCategory: "Transportation", subCategory: "Public Transit", autoTagged: true },
  { id: 14, date: "2025-01-08", merchant: "Olive Garden", amount: 68.40, mainCategory: "Dining Out", subCategory: "Restaurants", autoTagged: false },
  { id: 15, date: "2025-01-07", merchant: "Verizon", amount: 95.00, mainCategory: "Utilities", subCategory: "Phone", autoTagged: true },
  { id: 16, date: "2025-01-07", merchant: "H&M", amount: 89.50, mainCategory: "Shopping", subCategory: "Clothing", autoTagged: false },
  { id: 17, date: "2025-01-06", merchant: "Spotify", amount: 10.99, mainCategory: "Entertainment", subCategory: "Streaming", autoTagged: true },
  { id: 18, date: "2025-01-06", merchant: "Farmers Market", amount: 34.20, mainCategory: "Groceries", subCategory: "Farmers Market", autoTagged: false },
  { id: 19, date: "2025-01-05", merchant: "Comcast", amount: 79.99, mainCategory: "Utilities", subCategory: "Internet", autoTagged: true },
  { id: 20, date: "2025-01-05", merchant: "AMC Theaters", amount: 24.00, mainCategory: "Entertainment", subCategory: "Movies", autoTagged: false },
  { id: 21, date: "2025-01-04", merchant: "7-Eleven", amount: 8.50, mainCategory: "Groceries", subCategory: "Convenience Store", autoTagged: true },
  { id: 22, date: "2025-01-04", merchant: "Lyft", amount: 22.30, mainCategory: "Transportation", subCategory: "Ride Share", autoTagged: true },
  { id: 23, date: "2025-01-03", merchant: "Dentist Office", amount: 150.00, mainCategory: "Healthcare", subCategory: "Medical", autoTagged: false },
  { id: 24, date: "2025-01-03", merchant: "Dunkin Donuts", amount: 4.25, mainCategory: "Dining Out", subCategory: "Coffee Shops", autoTagged: true },
  { id: 25, date: "2025-01-02", merchant: "Water Department", amount: 45.60, mainCategory: "Utilities", subCategory: "Water", autoTagged: true },
  { id: 26, date: "2025-01-02", merchant: "Parking Meter", amount: 3.00, mainCategory: "Transportation", subCategory: "Parking", autoTagged: false },
  { id: 27, date: "2025-01-01", merchant: "Costco", amount: 156.78, mainCategory: "Groceries", subCategory: "Supermarket", autoTagged: true },
  { id: 28, date: "2025-01-01", merchant: "Concert Tickets", amount: 120.00, mainCategory: "Entertainment", subCategory: "Concerts", autoTagged: false },
  { id: 29, date: "2024-12-30", merchant: "McDonald's", amount: 9.45, mainCategory: "Dining Out", subCategory: "Fast Food", autoTagged: true },
  { id: 30, date: "2024-12-30", merchant: "IKEA", amount: 234.50, mainCategory: "Shopping", subCategory: "Home Goods", autoTagged: false },
  { id: 31, date: "2024-12-29", merchant: "Chevron", amount: 52.00, mainCategory: "Transportation", subCategory: "Gas", autoTagged: true },
  { id: 32, date: "2024-12-29", merchant: "Hobby Lobby", amount: 67.30, mainCategory: "Entertainment", subCategory: "Hobbies", autoTagged: false },
  { id: 33, date: "2024-12-28", merchant: "Walgreens", amount: 28.90, mainCategory: "Healthcare", subCategory: "Pharmacy", autoTagged: true },
  { id: 34, date: "2024-12-28", merchant: "Blue Bottle Coffee", amount: 6.50, mainCategory: "Dining Out", subCategory: "Coffee Shops", autoTagged: false },
  { id: 35, date: "2024-12-27", merchant: "Zara", amount: 145.00, mainCategory: "Shopping", subCategory: "Clothing", autoTagged: false },
];

// Main categories
export const mainCategories = [
  "Groceries",
  "Dining Out",
  "Transportation",
  "Utilities",
  "Entertainment",
  "Healthcare",
  "Shopping",
  "Other"
];

// Sub-categories mapping
export const subCategories = {
  "Groceries": ["Supermarket", "Farmers Market", "Convenience Store"],
  "Dining Out": ["Restaurants", "Coffee Shops", "Fast Food"],
  "Transportation": ["Gas", "Public Transit", "Parking", "Ride Share"],
  "Utilities": ["Electric", "Water", "Internet", "Phone"],
  "Entertainment": ["Streaming", "Movies", "Concerts", "Hobbies"],
  "Healthcare": ["Pharmacy", "Medical"],
  "Shopping": ["Clothing", "Electronics", "Home Goods"],
  "Other": ["Miscellaneous"]
};
