import { Card } from "./ui/card";
import { Sankey, Tooltip, ResponsiveContainer } from "recharts";

interface SankeyNode {
  name: string;
}

interface SankeyLink {
  source: number;
  target: number;
  value: number;
}

interface SankeyData {
  nodes: SankeyNode[];
  links: SankeyLink[];
}

export function ExpenseFlow() {
  // Create nodes for the Sankey diagram
  // Layer 1: Income sources
  // Layer 2: Main categories
  // Layer 3: Specific expenses
  const data: SankeyData = {
    nodes: [
      // Layer 1: Income sources (0-1)
      { name: "Monthly\nexpenses" },
      { name: "Future\nexpenses" },
      
      // Layer 2: Categories (2-8)
      { name: "Mortgage" },
      { name: "Bills" },
      { name: "Lifestyle" },
      { name: "Car" },
      { name: "Childcare" },
      { name: "Funeral\nand burial" },
      { name: "Debt" },
      
      // Layer 3: Specific items (9-20)
      { name: "Water" },
      { name: "Phone" },
      { name: "Electric" },
      { name: "Internet" },
      { name: "Vacations" },
      { name: "Dining out" },
      { name: "College" },
      { name: "Weddings" },
      { name: "Kids' trusts" },
      { name: "Maintenance" },
      { name: "Renovation" },
    ],
    links: [
      // Monthly expenses to categories
      { source: 0, target: 2, value: 2800 }, // Mortgage
      { source: 0, target: 3, value: 450 },  // Bills
      { source: 0, target: 4, value: 800 },  // Lifestyle
      { source: 0, target: 5, value: 400 },  // Car
      { source: 0, target: 6, value: 600 },  // Childcare
      
      // Future expenses to categories
      { source: 1, target: 7, value: 300 },  // Funeral
      { source: 1, target: 8, value: 500 },  // Debt
      
      // Bills to specific items
      { source: 3, target: 9, value: 80 },   // Water
      { source: 3, target: 10, value: 100 }, // Phone
      { source: 3, target: 11, value: 150 }, // Electric
      { source: 3, target: 12, value: 120 }, // Internet
      
      // Lifestyle to specific items
      { source: 4, target: 13, value: 500 }, // Vacations
      { source: 4, target: 14, value: 300 }, // Dining out
      
      // Future expenses to specific items
      { source: 1, target: 15, value: 400 }, // College
      { source: 1, target: 16, value: 250 }, // Weddings
      { source: 1, target: 17, value: 200 }, // Kids' trusts
      
      // Car to specific items
      { source: 5, target: 18, value: 250 }, // Maintenance
      { source: 5, target: 19, value: 150 }, // Renovation
    ],
  };

  const nodeColors: { [key: string]: string } = {
    "Monthly\nexpenses": "#10b981",
    "Future\nexpenses": "#10b981",
    "Mortgage": "#1e5652",
    "Bills": "#5b21b6",
    "Lifestyle": "#3b82f6",
    "Car": "#facc15",
    "Childcare": "#1e5652",
    "Funeral\nand burial": "#10b981",
    "Debt": "#3b82f6",
    "Water": "#5b21b6",
    "Phone": "#5b21b6",
    "Electric": "#facc15",
    "Internet": "#3b82f6",
    "Vacations": "#3b82f6",
    "Dining out": "#facc15",
    "College": "#facc15",
    "Weddings": "#facc15",
    "Kids' trusts": "#facc15",
    "Maintenance": "#1e5652",
    "Renovation": "#1e5652",
  };

  return (
    <Card className="bg-gray-800 border-gray-700 p-6">
      <div className="h-[600px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <Sankey
            data={data}
            node={{
              fill: "#374151",
              fillOpacity: 1,
            }}
            link={{ stroke: "#4b5563", strokeOpacity: 0.3 }}
            nodePadding={20}
            margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
          >
            <Tooltip
              contentStyle={{
                backgroundColor: "#1f2937",
                border: "1px solid #374151",
                borderRadius: "8px",
                color: "#fff",
              }}
            />
          </Sankey>
        </ResponsiveContainer>
      </div>
      
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
        <div className="bg-gray-700/50 p-4 rounded-lg">
          <div className="text-gray-400 mb-1">Total Monthly</div>
          <div className="text-white">$5,050</div>
        </div>
        <div className="bg-gray-700/50 p-4 rounded-lg">
          <div className="text-gray-400 mb-1">Future Expenses</div>
          <div className="text-white">$1,650</div>
        </div>
        <div className="bg-gray-700/50 p-4 rounded-lg">
          <div className="text-gray-400 mb-1">Total Budget</div>
          <div className="text-white">$6,700</div>
        </div>
      </div>
      
      {/* Category Breakdown */}
      <div className="mt-6">
        <h3 className="text-white mb-4">Category Breakdown</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          <CategoryItem label="Mortgage" amount={2800} color="bg-teal-900" />
          <CategoryItem label="Lifestyle" amount={800} color="bg-blue-600" />
          <CategoryItem label="Childcare" amount={600} color="bg-teal-900" />
          <CategoryItem label="Debt" amount={500} color="bg-blue-600" />
          <CategoryItem label="Bills" amount={450} color="bg-purple-700" />
          <CategoryItem label="Car" amount={400} color="bg-yellow-400" />
          <CategoryItem label="College" amount={400} color="bg-yellow-400" />
          <CategoryItem label="Funeral" amount={300} color="bg-emerald-600" />
          <CategoryItem label="Weddings" amount={250} color="bg-yellow-400" />
          <CategoryItem label="Kids' trusts" amount={200} color="bg-yellow-400" />
        </div>
      </div>
    </Card>
  );
}

interface CategoryItemProps {
  label: string;
  amount: number;
  color: string;
}

function CategoryItem({ label, amount, color }: CategoryItemProps) {
  return (
    <div className="flex items-center justify-between bg-gray-700/30 p-3 rounded-lg">
      <div className="flex items-center gap-3">
        <div className={`w-3 h-3 rounded-full ${color}`} />
        <span className="text-gray-300">{label}</span>
      </div>
      <span className="text-white">${amount.toLocaleString()}</span>
    </div>
  );
}
