
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Search, Eye, Edit, MoreHorizontal, Trash2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import TableLoadingRow from '@/components/ui/table-loading-row';
import StatsCard from '@/components/dashboard/StatsCard';
import { AlertTriangle, Package } from 'lucide-react';

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

const Products = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [openMenuIndex, setOpenMenuIndex] = useState<number | null>(null);

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/products');
        const data = await res.json();
        // Only keep products that are type 'matiere'
        const filtered = data.filter((p: any) => p.type === 'matiere');
        setProducts(filtered);
      } catch (error) {
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  // Calculate status based on stock and alerte values
  const productsWithStatus = products.map(product => {
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

  const filteredProducts = productsWithStatus.filter(product => {
    const matchesSearch =
      product.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.unite.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.statut || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === 'all' ? true : (product.statut || '') === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Summary stats
  const totalProducts = filteredProducts.length;
  const alertProducts = filteredProducts.filter(p => p.statut === 'Alerte').length;

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;
    try {
      const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      setProducts(products => products.filter(p => p.id !== id));
    } catch (err) {
      alert('Failed to delete product');
    }
  };

  return (
    <Layout>
      <div className="mb-4 sm:mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold mb-1">Matière Premier</h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Suivi et gestion des matières premières
            </p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <StatsCard
          icon={<Package className="h-6 w-6" />}
          title="Total Matières"
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
        <div className="w-full sm:w-48">
          <select
            className="w-full border rounded-md px-3 py-2 text-sm text-muted-foreground"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
          >
            <option value="all">Tous les statuts</option>
            <option value="Disponible">Disponible</option>
            <option value="Alerte">Alerte</option>
          </select>
        </div>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reference</TableHead>
                <TableHead>Nom</TableHead>
                <TableHead>Unité</TableHead>
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
                <TableLoadingRow colSpan={9} text="Chargement des produits..." />
              ) : filteredProducts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8">
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
                    <TableCell>{product.unite}</TableCell>
                    <TableCell>{product.statut}</TableCell>
                    <TableCell>{product.stock}</TableCell>
                    <TableCell>{product.totalSortie}</TableCell>
                    <TableCell>{product.totalEntrer}</TableCell>
                    <TableCell>{product.alerte}</TableCell>
                    <TableCell>
                      <button
                        className="p-2 rounded-full hover:bg-gray-100"
                        onClick={() => navigate(`/matiere/details/${product.id}`)}
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

export default Products;
