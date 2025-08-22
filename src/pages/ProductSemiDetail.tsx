import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import TableLoadingRow from '@/components/ui/table-loading-row';

// Helper to generate random mock data for product and history
function getRandomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateMockProduct(reference: string) {
  const nom = `Matière ${String.fromCharCode(65 + (parseInt(reference) % 26))}`;
  const unite = ['kg', 'L', 'pcs', 'm', 'g'][getRandomInt(0, 4)];
  const alerte = getRandomInt(10, 50);
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
    reference: `REF-${reference}`,
    nom,
    unite,
    statut,
    stock,
    totalSortie,
    totalEntrer,
    alerte
  };
}



function generateMockHistory(reference: string) {
  return Array.from({ length: 20 }, (_, i) => {
    const type = Math.random() > 0.5 ? 'Entrée' : 'Sortie';
    const quantity = getRandomInt(1, 20);
    const date = new Date(Date.now() - i * 86400000).toLocaleDateString();
    return {
      id: i + 1,
      type,
      quantity,
      date,
      note: type === 'Entrée' ? 'Réception fournisseur' : 'Consommation atelier',
      location: ['Entrepôt A', 'Entrepôt B', 'Zone 1'][getRandomInt(0, 2)]
    };
  });
}

const ProduitSemiDetail = () => {
  const { reference } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setTableLoading(true);
    // Simulate API call
    setTimeout(() => {
      setProduct(generateMockProduct(reference || '0'));
      setHistory(generateMockHistory(reference || '0'));
      setLoading(false);
      setTableLoading(false);
    }, 500);
  }, [reference]);

  if (loading || !product) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-[70vh]">
          <div className="w-16 h-16 border-4 border-black border-t-transparent rounded-full animate-spin"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="mb-4">
        <Button
          variant="ghost"
          size="sm"
          className="mb-4"
          onClick={() => navigate('/semi-products')}
        >
          <ArrowLeft size={16} className="mr-2" />
          Retour aux Produits Semi-Finis
        </Button>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Product Info */}
          <div className="flex flex-col">
            <h1 className="text-2xl sm:text-3xl font-bold">{product.nom}</h1>
            <div className="flex items-center gap-2 mt-2 mb-4">
              <Badge variant="secondary" className="text-xs px-2.5 py-1">
                {product.statut}
              </Badge>
              <span className="text-sm text-muted-foreground">Référence: {product.reference}</span>
            </div>
            <div className="flex items-center mb-6">
              <div>
                <p className="text-xl font-bold">Stock: {product.stock} {product.unite}</p>
                <p className="text-sm text-emerald-600 font-semibold">
                  Seuil d'Alerte: {product.alerte} {product.unite}
                </p>
              </div>
            </div>
            <Card className="mb-6">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Informations sur le produit</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Unité</p>
                    <p className="text-sm text-muted-foreground">{product.unite}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Total Entrées</p>
                    <p className="text-sm text-muted-foreground">{product.totalEntrer} {product.unite}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Total Sorties</p>
                    <p className="text-sm text-muted-foreground">{product.totalSortie} {product.unite}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Statut</p>
                    <p className={`text-sm font-medium ${product.statut === 'Disponible' ? 'text-green-600' : product.statut === 'Alerte' ? 'text-yellow-600' : 'text-red-500'}`}>{product.statut}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          {/* Stock History */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Historique de Stock</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Quantité</TableHead>
                        <TableHead>Emplacement</TableHead>
                        <TableHead>Note</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tableLoading ? (
                        <TableLoadingRow colSpan={5} text="Chargement de l'historique..." />
                      ) : history.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8">
                            Aucun historique trouvé.
                          </TableCell>
                        </TableRow>
                      ) : (
                        history.map((entry) => (
                          <TableRow key={entry.id}>
                            <TableCell>{entry.date}</TableCell>
                            <TableCell>{entry.type}</TableCell>
                            <TableCell>{entry.quantity}</TableCell>
                            <TableCell>{entry.location}</TableCell>
                            <TableCell>{entry.note}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ProduitSemiDetail;
