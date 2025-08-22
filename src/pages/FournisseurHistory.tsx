import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Layout from '@/components/layout/Layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { ArrowLeft, Search } from 'lucide-react';

const FournisseurHistory = () => {
  const { fournisseurId } = useParams();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [fournisseur, setFournisseur] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!fournisseurId) return;
    setLoading(true);
    setError(null);
    // Fetch fournisseur info
    fetch(`/fournisseurs/${fournisseurId}`)
      .then(res => {
        if (!res.ok) throw new Error('Erreur lors du chargement du fournisseur');
        return res.json();
      })
      .then(data => setFournisseur(data))
      .catch(() => setError('Erreur lors du chargement du fournisseur'));
    // Fetch history
    fetch(`/api/fournisseurs/${fournisseurId}/history`)
      .then(res => {
        if (!res.ok) throw new Error('Erreur lors du chargement de l\'historique');
        return res.json();
      })
      .then(data => setHistory(data))
      .catch(() => setError('Erreur lors du chargement de l\'historique'))
      .finally(() => setLoading(false));
  }, [fournisseurId]);

  const filteredHistory = history.filter(h =>
    (h.product_name?.toLowerCase() || '').includes(search.toLowerCase()) ||
    (h.date || '').includes(search) ||
    (h.quantity?.toString() || '').includes(search)
  );

  return (
    <Layout>
      <div className="mb-4 sm:mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <Button
              variant="ghost"
              size="sm"
              className="mb-2"
              onClick={() => navigate('/fournisseur')}
            >
              <ArrowLeft size={16} className="mr-2" />
              Retour aux Fournisseurs
            </Button>
            <h1 className="text-2xl sm:text-3xl font-bold mb-1">Historique - {fournisseur?.designation || fournisseur?.name}</h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Email: {fournisseur?.email || '-'} | Téléphone: {Array.isArray(fournisseur?.telephones) ? fournisseur.telephones.join(', ') : fournisseur?.telephones || '-'} | Localisation: {fournisseur?.adresse || fournisseur?.location || '-'} | Type: {fournisseur?.type === 'local' ? 'Local' : 'Étranger'}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <Card>
          <div className="p-3">
            <p className="text-xs font-medium text-muted-foreground">Type</p>
            <p className="text-lg font-bold">{fournisseur?.type === 'local' ? 'Local' : 'Étranger'}</p>
          </div>
        </Card>
        <Card>
          <div className="p-3">
            <p className="text-xs font-medium text-muted-foreground">Téléphone</p>
            <p className="text-lg font-bold">{Array.isArray(fournisseur?.telephones) ? fournisseur.telephones.join(', ') : fournisseur?.telephones || '-'}</p>
          </div>
        </Card>
        <Card>
          <div className="p-3">
            <p className="text-xs font-medium text-muted-foreground">Localisation</p>
            <p className="text-lg font-bold">{fournisseur?.adresse || fournisseur?.location || '-'}</p>
          </div>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Rechercher dans l'historique..."
            className="pl-10 text-sm sm:text-base"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      <Card>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">Chargement...</div>
          ) : error ? (
            <div className="p-8 text-center text-red-600">{error}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Heure</TableHead>
                  <TableHead>Produit</TableHead>
                  <TableHead>Quantité</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Lieu</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredHistory.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <p className="text-muted-foreground">Aucun historique trouvé</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredHistory.map(h => (
                    <TableRow key={h.id}>
                      <TableCell>{h.date ? h.date.slice(0, 10) : ''}</TableCell>
                      <TableCell>{h.time ? h.time.slice(0, 5) : ''}</TableCell>
                      <TableCell>{h.product_name}</TableCell>
                      <TableCell>{h.quantity}</TableCell>
                      <TableCell>{h.product_type}</TableCell>
                      <TableCell>{h.status}</TableCell>
                      <TableCell>{h.location_name}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </div>
      </Card>
    </Layout>
  );
};

export default FournisseurHistory; 