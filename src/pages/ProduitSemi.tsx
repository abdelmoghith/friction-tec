
import { useState, useState as useReactState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Search, MoreVertical, Filter, Package, AlertTriangle, Eye } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import TableLoadingRow from '@/components/ui/table-loading-row';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import StatsCard from '@/components/dashboard/StatsCard';

// Helper to generate random mock data
function getRandomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const UNITES = ['kg', 'L', 'pcs', 'm', 'g'];
const STATUS = ['Disponible', 'Rupture', 'Alerte'];

function generateRandomProduct(index: number) {
  const ref = `REF-${1000 + index}`;
  const nom = `Matière ${String.fromCharCode(65 + (index % 26))}`;
  const unite = UNITES[getRandomInt(0, UNITES.length - 1)];
  const alerte = getRandomInt(10, 50); // minimum stock threshold
  const stock = getRandomInt(0, 100);
  let statut = 'Disponible';
  if (stock === 0) {
    statut = 'Rupture';
  } else if (stock <= alerte) {
    statut = 'Alerte';
  }
  const totalSortie = getRandomInt(0, 200);
  const totalEntrer = getRandomInt(0, 200);
  return {
    reference: ref,
    nom,
    unite,
    statut,
    stock,
    totalSortie,
    totalEntrer,
    alerte
  };
}

const MOCK_PRODUCTS = Array.from({ length: 20 }, (_, i) => generateRandomProduct(i));

const ProduitSemi = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch('/api/semi-products')
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch semi-products');
        return res.json();
      })
      .then(data => {
        setProducts(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  // Calculate status based on stock and alerte values
  const productsWithCalculatedStatus = products.map(product => {
    let statut = 'Disponible';
    if (product.stock <= product.alerte) {
      statut = 'Alerte';
    }
    // Map backend fields to frontend camelCase
    return {
      ...product,
      statut,
      totalSortie: product.total_sortie ?? 0,
      totalEntrer: product.total_entrer ?? 0,
    };
  });

  const filteredProducts = productsWithCalculatedStatus.filter(product => {
    const matchesSearch = 
      product.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.statut || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || (product.statut === statusFilter);
    return matchesSearch && matchesStatus;
  });

  // State for open action menu per row
  const [openMenuIndex, setOpenMenuIndex] = useReactState<number | null>(null);

  // Summary stats
  const totalProducts = filteredProducts.length;
  const alertProducts = filteredProducts.filter(p => p.statut === 'Alerte').length;

  return (
    <Layout>
      <div className="mb-4 sm:mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold mb-1">Produits Semi-Finis</h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Suivi et gestion des produits semi-finis
            </p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <StatsCard
          icon={<Package className="h-6 w-6" />}
          title="Total Semi-Finis"
          value={totalProducts}
        />
        <StatsCard
          icon={<AlertTriangle className="h-6 w-6 text-red-600" />}
          title="En Alerte"
          value={alertProducts}
          className="border-red-200"
          iconClassName="bg-red-100 text-red-600"
        />
      </div>

      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search products..."
            className="pl-10 text-sm sm:text-base"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="Disponible">Disponible</SelectItem>
              <SelectItem value="Rupture">Rupture</SelectItem>
              <SelectItem value="Alerte">Alerte</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
                          <TableRow>
              <TableHead>Reference</TableHead>
              <TableHead>Nom</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead>Total Sortie</TableHead>
              <TableHead>Total Entrer</TableHead>
              <TableHead>Alerte</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableLoadingRow colSpan={8} text="Chargement des produits semi-finis..." />
              ) : error ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-red-500">
                    Erreur: {error}
                  </TableCell>
                </TableRow>
              ) : filteredProducts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    Aucun résultat trouvé.
                  </TableCell>
                </TableRow>
              ) : (
                filteredProducts.map((product, idx) => (
                  <TableRow
                    key={product.reference + idx}
                    className={product.statut === 'Alerte' ? 'bg-red-50' : ''}
                  >
                    <TableCell>{product.reference}</TableCell>
                    <TableCell>{product.nom}</TableCell>
                    <TableCell>{product.statut}</TableCell>
                    <TableCell>{product.stock}</TableCell>
                    <TableCell>{product.totalSortie}</TableCell>
                    <TableCell>{product.totalEntrer}</TableCell>
                    <TableCell>{product.alerte}</TableCell>
                    <TableCell>
                      <button
                        className="p-2 rounded-full hover:bg-gray-100"
                        onClick={() => navigate(`/semi-products/details/${product.id}`)}
                        aria-label="View Details"
                      >
                        <Eye size={18} />
                      </button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
      
    </Layout>
  );
};

export default ProduitSemi;
