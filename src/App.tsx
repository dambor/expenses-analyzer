import { ExpenseFlow } from "./components/ExpenseFlow";

export default function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-white mb-2">Expense Flow Analysis</h1>
          <p className="text-gray-400">Visualize how your money flows from income to expenses</p>
        </div>
        <ExpenseFlow />
      </div>
    </div>
  );
}
