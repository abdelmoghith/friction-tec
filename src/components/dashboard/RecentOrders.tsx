import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { Clock, Package, Truck, CheckCircle, Eye } from "lucide-react";

interface OrderItem {
  id: string;
  productName: string;
  productImage: string;
  quantity: number;
  price: number;
  total: number;
}

interface AffiliateWorker {
  id: string;
  name: string;
  email: string;
  phone: string;
  commissionRate: number;
  totalEarnings: number;
  joinDate: string;
}

interface Order {
  id: string;
  customer_name: string;
  customer_email: string;
  order_date: string;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  total: number;
  items_count: number;
  payment_method: string;
  order_items: OrderItem[];
  affiliate_worker: AffiliateWorker;
  shipping_cost: number;
}

interface RecentOrdersProps {
  orders: Order[];
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'pending':
      return <Clock size={16} className="text-yellow-500" />;
    case 'processing':
      return <Package size={16} className="text-blue-500" />;
    case 'shipped':
      return <Truck size={16} className="text-purple-500" />;
    case 'delivered':
      return <CheckCircle size={16} className="text-green-500" />;
    default:
      return <Clock size={16} className="text-gray-500" />;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'pending':
      return 'bg-yellow-100 text-yellow-800';
    case 'processing':
      return 'bg-blue-100 text-blue-800';
    case 'shipped':
      return 'bg-purple-100 text-purple-800';
    case 'delivered':
      return 'bg-green-100 text-green-800';
    case 'cancelled':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const RecentOrders = ({ orders }: RecentOrdersProps) => {
  const isMobile = useIsMobile();

  if (orders.length === 0) {
    return (
      <div className="text-center py-8 sm:py-10">
        <p className="text-muted-foreground text-sm sm:text-base">No orders found</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Order ID</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Items</TableHead>
            <TableHead>Total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order) => (
            <TableRow key={order.id}>
              <TableCell className="font-medium">
                <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                  {order.id.slice(0, 8)}...
                </span>
              </TableCell>
              <TableCell>
                <div>
                  <p className="font-medium">{order.customer_name}</p>
                  <p className="text-sm text-muted-foreground">{order.customer_name}</p>
                </div>
              </TableCell>
              <TableCell>{new Date(order.order_date).toLocaleDateString()}</TableCell>
              <TableCell>
                <Badge className={`${getStatusColor(order.status)} flex items-center gap-1 w-fit`}>
                  {getStatusIcon(order.status)}
                  {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                </Badge>
              </TableCell>
              <TableCell>{order.items_count}</TableCell>
              <TableCell className="font-medium">{formatCurrency(order.total)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default RecentOrders;