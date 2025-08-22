
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
import { formatDate, formatCurrency } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

interface Buyer {
  id: string;
  name: string;
  email: string;
  product: string;
  date: string;
  amount: number;
  commission: number;
  status: 'pending' | 'confirmed' | 'paid';
}

interface BuyersListProps {
  buyers: Buyer[];
}

const getBadgeVariant = (status: string) => {
  switch (status) {
    case 'pending':
      return 'outline';
    case 'confirmed':
      return 'secondary';
    case 'paid':
      return 'success';
    default:
      return 'outline';
  }
};

const BuyersList = ({ buyers }: BuyersListProps) => {
  const isMobile = useIsMobile();

  if (buyers.length === 0) {
    return (
      <div className="text-center py-8 sm:py-10">
        <p className="text-muted-foreground text-sm sm:text-base">No buyers found</p>
        <Button className="mt-4 text-xs sm:text-sm">Add Your First Buyer</Button>
      </div>
    );
  }

  return (
    <div className="rounded-md border overflow-hidden">
      <Table className="w-full text-xs sm:text-sm">
        <TableHeader>
          <TableRow>
            <TableHead className="whitespace-nowrap">Buyer</TableHead>
            <TableHead className="whitespace-nowrap">Product</TableHead>
            {!isMobile && <TableHead className="whitespace-nowrap">Date</TableHead>}
            <TableHead className="whitespace-nowrap">Amount</TableHead>
            <TableHead className="whitespace-nowrap">Commission</TableHead>
            <TableHead className="whitespace-nowrap">Status</TableHead>
            {/* Removing the Action column header */}
          </TableRow>
        </TableHeader>
        <TableBody>
          {buyers.map((buyer) => (
            <TableRow key={buyer.id} className="opacity-0 animate-fade-in">
              <TableCell className="whitespace-nowrap">
                <div>
                  <p className="font-medium">{buyer.name}</p>
                  {!isMobile && <p className="text-xs text-muted-foreground">{buyer.email}</p>}
                </div>
              </TableCell>
              <TableCell className="whitespace-nowrap">{buyer.product}</TableCell>
              {!isMobile && <TableCell className="whitespace-nowrap">{formatDate(buyer.date)}</TableCell>}
              <TableCell className="whitespace-nowrap">{formatCurrency(buyer.amount)}</TableCell>
              <TableCell className="text-success whitespace-nowrap">
                {formatCurrency(buyer.commission)}
              </TableCell>
              <TableCell className="whitespace-nowrap">
                <Badge variant={getBadgeVariant(buyer.status) as any} className="capitalize text-[10px] sm:text-xs">
                  {buyer.status}
                </Badge>
              </TableCell>
              {/* Removing the Action column cell */}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default BuyersList;

