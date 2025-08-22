import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import StatsCard from '@/components/dashboard/StatsCard';
import { Warehouse, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

// Helper to generate random stats
function getRandomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const generateMockStats = () => ({
  totalRevenue: getRandomInt(10000, 100000),
  totalOrders: getRandomInt(100, 1000),
  totalCustomers: getRandomInt(50, 500),
});

const generateMockEarnings = (period: 'monthly' | 'weekly') => {
  const count = period === 'monthly' ? 12 : 7;
  return Array.from({ length: count }, (_, i) => ({
    name: period === 'monthly' ? `Month ${i + 1}` : `Day ${i + 1}`,
    earnings: getRandomInt(1000, 10000),
  }));
};

// Mock stock data generator
const generateMockStock = (period: 'monthly' | 'weekly') => {
  const count = period === 'monthly' ? 12 : 7;
  return Array.from({ length: count }, (_, i) => ({
    name: period === 'monthly' ? `Month ${i + 1}` : `Day ${i + 1}`,
    stock: getRandomInt(50, 500),
  }));
};

const StockChart = ({ data, loading, period, onPeriodChange }: { data: { name: string; stock: number }[]; loading?: boolean; period: 'monthly' | 'weekly'; onPeriodChange?: (period: 'monthly' | 'weekly') => void; }) => {
  const isMobile = useIsMobile();
  const mobileData = data.map(item => ({
    ...item,
    name: period === 'monthly' ? item.name.substring(0, 3) : item.name.replace('Day ', 'D'),
  }));
  const chartMargins = isMobile ? { top: 20, right: 10, left: 0, bottom: 5 } : { top: 20, right: 30, left: 20, bottom: 5 };
  return (
    <div className="opacity-0 animate-fade-in bg-white rounded-lg shadow p-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2">
        <div>
          <div className="text-lg sm:text-xl font-bold">Stock Overview</div>
          <div className="text-xs sm:text-sm text-muted-foreground">Stock levels over time</div>
        </div>
        <select
          className="w-full sm:w-[150px] border rounded px-2 py-1 text-sm"
          value={period}
          onChange={e => onPeriodChange?.(e.target.value as 'monthly' | 'weekly')}
        >
          <option value="weekly">Last 7 Days</option>
          <option value="monthly">Last 12 Months</option>
        </select>
      </div>
      <div className="h-[250px] sm:h-[300px]">
        {loading ? (
          <div className="w-full h-full flex items-center justify-center">
            <div className="animate-pulse w-full h-32 bg-gray-200 rounded" />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={isMobile ? mobileData : data} margin={chartMargins}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: isMobile ? 10 : 12 }} interval={isMobile ? 0 : 'preserveStartEnd'} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: isMobile ? 10 : 12 }} width={isMobile ? 30 : 40} />
              <Tooltip wrapperStyle={{ fontSize: isMobile ? '10px' : '12px' }} />
              <Line type="monotone" dataKey="stock" name="Stock" stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

const Index = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [dashboardStats, setDashboardStats] = useState<any>(generateMockStats());
  const [stockPeriod, setStockPeriod] = useState<'monthly' | 'weekly'>('monthly');
  const [stockData, setStockData] = useState<{ name: string; stock: number }[]>([]); // Ensure always array
  useEffect(() => {
    async function fetchFinisProducts() {
      const res = await fetch('/api/products');
      const allProducts = await res.json();
      const products = allProducts.filter((p: any) => p.type === 'finis');
      // Aggregate directly from product fields
      let totalStock = 0, totalEntrer = 0, totalSortie = 0;
      products.forEach((product: any) => {
        totalStock += product.stock ?? 0;
        totalEntrer += product.total_entrer ?? 0;
        totalSortie += product.total_sortie ?? 0;
      });
      setDashboardStats({
        totalStock,
        totalEntrer,
        totalSortie,
      });
      // For chart: just show stock per product
      setStockData(products.map((p: any) => ({ name: p.nom || p.title || p.reference || p.id, stock: p.stock ?? 0 })));
    }
    fetchFinisProducts();
  }, []);
  return (
    <Layout>
      {/* Welcome section */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold mb-1">
          Stock Dashboard 
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Manage your stock, track inventory, and monitor materials from here.
        </p>
      </div>
      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8">
        <StatsCard
          icon={<Warehouse size={20} />}
          title="Total Stock"
          value={dashboardStats.totalStock}
          change={null}
          className="animate-delay-1"
        />
        <StatsCard
          icon={<ArrowDownCircle size={20} />}
          title="Total Entrer"
          value={dashboardStats.totalEntrer}
          change={null}
          className="animate-delay-2"
          iconClassName="bg-success/10 text-success"
        />
        <StatsCard
          icon={<ArrowUpCircle size={20} />}
          title="Total Sortie"
          value={dashboardStats.totalSortie}
          change={null}
          className="animate-delay-3"
          iconClassName="bg-accent/10 text-accent"
        />
      </div>
      {/* Stock Chart (replaces EarningsChart) */}
      <div className="mb-8">
        <StockChart
          data={stockData}
          loading={false}
          period={stockPeriod}
          onPeriodChange={setStockPeriod}
        />
      </div>
    </Layout>
  );
};

export default Index;




