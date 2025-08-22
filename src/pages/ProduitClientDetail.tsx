import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, ArrowLeft, Filter, X } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';
import FiniOperationTypeDialog from '@/components/product/FiniOperationTypeDialog';
import FiniOperationDialog from '@/components/product/FiniOperationDialog';
import axios from 'axios';
import FiniOperationTypeClient from '@/components/product/FiniOperationTypeClient';
import FiniOperationClient from '@/components/product/FiniOperationClient';

// Helper to generate random mock data for product and history
function getRandomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const LOCATIONS = ['Entrepôt A', 'Entrepôt B', 'Zone 1', 'Zone 2', 'Zone 3'];
const FLOOR_DATA = {
  'Entrepôt A': [
    { id: 1, name: 'Étage 1', availableCapacity: 50, totalCapacity: 100 },
    { id: 2, name: 'Étage 2', availableCapacity: 30, totalCapacity: 80 },
    { id: 3, name: 'Étage 3', availableCapacity: 75, totalCapacity: 100 }
  ],
  'Entrepôt B': [
    { id: 1, name: 'Étage 1', availableCapacity: 20, totalCapacity: 60 },
    { id: 2, name: 'Étage 2', availableCapacity: 45, totalCapacity: 70 },
    { id: 3, name: 'Étage 3', availableCapacity: 90, totalCapacity: 100 }
  ],
  'Zone 1': [
    { id: 1, name: 'Étage 1', availableCapacity: 15, totalCapacity: 40 },
    { id: 2, name: 'Étage 2', availableCapacity: 25, totalCapacity: 50 }
  ],
  'Zone 2': [
    { id: 1, name: 'Étage 1', availableCapacity: 35, totalCapacity: 60 },
    { id: 2, name: 'Étage 2', availableCapacity: 10, totalCapacity: 45 }
  ],
  'Zone 3': [
    { id: 1, name: 'Étage 1', availableCapacity: 40, totalCapacity: 80 },
    { id: 2, name: 'Étage 2', availableCapacity: 60, totalCapacity: 90 }
  ]
};
const STATUSES = ['Entrée', 'Sortie'];

function generateRandomHistoryEntry(index: number, reference: string) {
  const status = STATUSES[getRandomInt(0, 1)];
  const quantity = getRandomInt(1, 100);
  const location = LOCATIONS[getRandomInt(0, LOCATIONS.length - 1)];
  const date = new Date();
  date.setDate(date.getDate() - getRandomInt(0, 30));
  const hours = getRandomInt(8, 18);
  const minutes = getRandomInt(0, 59);

  return {
    id: `HIST-${reference}-${index}`,
    status,
    quantity,
    location,
    date: date.toISOString().split('T')[0],
    time: `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`,
    fournisseur: status === 'Entrée' ? ['Fournisseur A', 'Fournisseur B', 'Fournisseur C'][getRandomInt(0, 2)] : null,
    atelier: status === 'Sortie' ? ['Atelier 1', 'Atelier 2', 'Atelier 3'][getRandomInt(0, 2)] : null
  };
}

const ProduitClientDetail = () => {
  const { reference } = useParams();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [movementHistory, setMovementHistory] = useState<any[]>([]);
  const [filters, setFilters] = useState({
    status: '',
    location: '',
    dateFrom: '',
    dateTo: '',
    fournisseur: '',
    atelier: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  const [openEntry, setOpenEntry] = useState(false);
  const [openExit, setOpenExit] = useState(false);
  const [entryForm, setEntryForm] = useState({ quantity: '', location: '' });
  const [exitForm, setExitForm] = useState({ quantity: '', location: '' });
  const [openOperation, setOpenOperation] = useState(false);
  const [operationType, setOperationType] = useState('');
  const [openForm, setOpenForm] = useState(false);
  const [operationForm, setOperationForm] = useState({ quantity: '', location: '' });
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportDateFrom, setExportDateFrom] = useState(filters.dateFrom);
  const [exportDateTo, setExportDateTo] = useState(filters.dateTo);
  const [locations, setLocations] = useState<string[]>([]);
  const [floorData, setFloorData] = useState<Record<string, Array<{ id: number, name: string, availableCapacity: number, totalCapacity: number, type: 'etage' | 'part' }>>>({});

  // Detect if this is the /ready route (no reference param)
  const isReadyPage = window.location.pathname === '/ready';

  // --- Refactored fetchMovementHistory function ---
  const fetchMovementHistory = () => {
    if (isReadyPage) {
      setLoading(true);
      axios.get('/api/movements/ready')
        .then(res => {
          setMovementHistory(res.data || []);
          setLoading(false);
        })
        .catch(() => {
          setMovementHistory([]);
          setLoading(false);
        });
    } else if (reference) {
      setLoading(true);
      axios.get('/api/products')
        .then(res => {
          const products = res.data || [];
          const found = products.find((p: any) => 
            p.type === 'ready' && (p.reference || '').replace('REF-', '') === reference
          );
          if (!found) throw new Error('Produit prêt non trouvé');
          setProduct(found);
          return axios.get(`/api/movements?product_id=${found.id}`);
        })
        .then(res => {
          setMovementHistory(res.data || []);
          setLoading(false);
        })
        .catch(err => {
          setLoading(false);
          setProduct(null);
          setMovementHistory([]);
          toast.error('Erreur lors du chargement des données du produit ou de son historique.');
        });
    }
  };

  // useEffect to fetch on mount and when reference or isReadyPage changes
  useEffect(() => {
    fetchMovementHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reference, isReadyPage]);

  // Fetch locations and floor data
  useEffect(() => {
    axios.get('/api/locations').then(res => {
      const locs = res.data;
      setLocations(locs.map((l: any) => l.name));
      const data: Record<string, Array<{ id: number, name: string, availableCapacity: number, totalCapacity: number, type: 'etage' | 'part' }>> = {};
      locs.forEach((l: any) => {
        const items: Array<{ id: number, name: string, availableCapacity: number, totalCapacity: number, type: 'etage' | 'part' }> = [];

        // Add etages with type 'etage'
        if (l.etages && l.etages.length > 0) {
          l.etages.forEach((etage: any) => {
            items.push({
              id: etage.id,
              name: etage.name,
              availableCapacity: etage.currentStock !== undefined ? (etage.places || 0) - etage.currentStock : (etage.places || 0),
              totalCapacity: etage.places || 0,
              type: 'etage'
            });
          });
        }

        // Add parts with type 'part'
        if (l.parts && l.parts.length > 0) {
          l.parts.forEach((part: any) => {
            items.push({
              id: part.id,
              name: part.name,
              availableCapacity: part.currentStock !== undefined ? (part.maxCapacity || 0) - part.currentStock : (part.maxCapacity || 0),
              totalCapacity: part.maxCapacity || 0,
              type: 'part'
            });
          });
        }

        data[l.name] = items;
      });
      setFloorData(data);
    });
  }, []);

  // Calculate stock, total_entrer, total_sortie from filtered movementHistory (excluding is_transfer = '1')
  const stock = movementHistory
    .reduce((acc, m) => acc + (m.status === 'Entrée' ? m.quantity : -m.quantity), 0);
  const totalEntrer = movementHistory
    .filter(m => m.status === 'Entrée')
    .reduce((acc, m) => acc + m.quantity, 0);
  const totalSortie = movementHistory
    .filter(m => m.status === 'Sortie')
    .reduce((acc, m) => acc + m.quantity, 0);

  // Debug calculations
  console.log('[DEBUG] movementHistory length:', movementHistory.length);
  console.log('[DEBUG] movementHistory:', movementHistory);
  
  // Debug is_transfer values
  movementHistory.forEach((m, index) => {
    console.log(`[DEBUG] Movement ${index}:`, {
      id: m.id,
      status: m.status,
      quantity: m.quantity,
      is_transfer: m.is_transfer,
      is_transfer_type: typeof m.is_transfer,
      is_transfer_truthy: !!m.is_transfer
    });
  });
  
  console.log('[DEBUG] Stock calculation:', stock);
  console.log('[DEBUG] Total Entrer calculation:', totalEntrer);
  console.log('[DEBUG] Total Sortie calculation:', totalSortie);

  // Filtering logic (adapted for real data)
  const filteredHistory = movementHistory.filter(entry => {
    // Search term filter
    const searchMatch =
      (entry.status || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (entry.location_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (entry.fournisseur_name && entry.fournisseur_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (entry.atelier && entry.atelier.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (entry.date || '').includes(searchTerm);

    // Status filter
    const statusMatch = !filters.status || entry.status === filters.status;

    // Location filter
    const locationMatch = !filters.location || entry.location_name === filters.location;

    // Date range filter
    const dateMatch = (!filters.dateFrom || entry.date >= filters.dateFrom) &&
      (!filters.dateTo || entry.date <= filters.dateTo);

    // Fournisseur filter
    const fournisseurMatch = !filters.fournisseur ||
      (entry.fournisseur_name && entry.fournisseur_name === filters.fournisseur);

    // Atelier filter
    const atelierMatch = !filters.atelier ||
      (entry.atelier && entry.atelier === filters.atelier);

    return searchMatch && statusMatch && locationMatch && dateMatch && fournisseurMatch && atelierMatch;
  });

  // Helper to export to Excel (with summary rows)
  function exportToExcelWithSummary(data: any[], filename: string) {
    if (!data.length) return;
    // Prepare summary rows using calculated values from movement table
    const summaryRows = [
      ["Nom", product?.nom ?? ""],
      ["Référence", product?.reference ?? ""],
      ["Unité", product?.unite ?? ""],
      ["Stock Actuel", stock],
      ["Total Entrées", totalEntrer],
      ["Total Sorties", totalSortie],
      ["Seuil d'Alerte", product?.alerte ?? 0],
      [], // blank row
    ];
    // Prepare table data
    const wsTable = XLSX.utils.json_to_sheet(data);
    // Convert summaryRows to worksheet
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
    // Merge summary and table: copy table rows after summary
    const tableRange = XLSX.utils.decode_range(wsTable['!ref'] || 'A1');
    for (let R = tableRange.s.r; R <= tableRange.e.r; ++R) {
      for (let C = tableRange.s.c; C <= tableRange.e.c; ++C) {
        const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
        const targetAddress = XLSX.utils.encode_cell({ r: summaryRows.length + R, c: C });
        if (wsTable[cellAddress]) {
          wsSummary[targetAddress] = wsTable[cellAddress];
        }
      }
    }
    // Update the range
    wsSummary['!ref'] = XLSX.utils.encode_range({
      s: { r: 0, c: 0 },
      e: { r: summaryRows.length + (tableRange.e.r - tableRange.s.r), c: tableRange.e.c }
    });
    // Create workbook and export
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Rapport');
    XLSX.writeFile(wb, filename);
  }

  // Filter for export (date range only)
  const exportFilteredHistory = movementHistory.filter(entry => {
    const dateMatch = (!exportDateFrom || entry.date >= exportDateFrom) && (!exportDateTo || entry.date <= exportDateTo);
    return dateMatch;
  });

  // Find the current place for 'Sortie' (last 'Entrée' location in history, or blank)
  const currentPlace = (() => {
    const lastEntry = movementHistory.slice().reverse().find(entry => entry.status === 'Entrée');
    return lastEntry ? lastEntry.location_name : '';
  })();

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-[70vh]">
          <div className="w-16 h-16 border-4 border-black border-t-transparent rounded-full animate-spin"></div>
        </div>
      </Layout>
    );
  }

  // If on /ready and not loading, show all ready movements in a table
  if (isReadyPage) {
    // Calculate stock, total_entrer, total_sortie for all ready movements (excluding is_transfer = '1')
    const stock = movementHistory
      .reduce((acc, m) => acc + (m.status === 'Entrée' ? m.quantity : -m.quantity), 0);
    const totalEntrer = movementHistory
      .filter(m => m.status === 'Entrée')
      .reduce((acc, m) => acc + m.quantity, 0);
    const totalSortie = movementHistory
      .filter(m => m.status === 'Sortie')
      .reduce((acc, m) => acc + m.quantity, 0);
    // For seuil d'alerte, show N/A or 0 (since we have no product context)
    const seuilAlerte = 0;
    // Export logic: filter by date
    const exportFilteredHistory = movementHistory.filter(entry => {
      const dateMatch = (!exportDateFrom || entry.date >= exportDateFrom) && (!exportDateTo || entry.date <= exportDateTo);
      return dateMatch;
    });
    // Export to Excel with summary
    function exportToExcelWithSummary(data: any[], filename: string) {
      if (!data.length) return;
      // Prepare summary rows
      const summaryRows = [
        ["Type", "Produits Prêts (Ready)"],
        ["Stock Actuel", stock],
        ["Total Entrées", totalEntrer],
        ["Total Sorties", totalSortie],
        ["Seuil d'Alerte", seuilAlerte],
        [], // blank row
      ];
      // Prepare table data
      const wsTable = XLSX.utils.json_to_sheet(data);
      // Convert summaryRows to worksheet
      const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
      // Merge summary and table: copy table rows after summary
      const tableRange = XLSX.utils.decode_range(wsTable['!ref'] || 'A1');
      for (let R = tableRange.s.r; R <= tableRange.e.r; ++R) {
        for (let C = tableRange.s.c; C <= tableRange.e.c; ++C) {
          const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
          const targetAddress = XLSX.utils.encode_cell({ r: summaryRows.length + R, c: C });
          if (wsTable[cellAddress]) {
            wsSummary[targetAddress] = wsTable[cellAddress];
          }
        }
      }
      // Update the range
      wsSummary['!ref'] = XLSX.utils.encode_range({
        s: { r: 0, c: 0 },
        e: { r: summaryRows.length + (tableRange.e.r - tableRange.s.r), c: tableRange.e.c }
      });
      // Create workbook and export
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, wsSummary, 'Rapport');
      XLSX.writeFile(wb, filename);
    }
    return (
      <Layout>
        <div className="mb-4 sm:mb-6">
          <div className="flex items-center justify-between mb-10 mt-5 w-full gap-4">
            <h1 className="text-2xl sm:text-3xl font-bold">Mouvements Produits Prêts</h1>
            <div className="flex gap-2">
              <FiniOperationTypeClient
                open={openOperation}
                onOpenChange={setOpenOperation}
                onSelect={(type) => {
                  setOperationType(type);
                  setOpenOperation(false);
                  setOpenForm(true);
                }}
                trigger={<Button variant="default">Nouvelle opération</Button>}
              />
              <Button
                variant="outline"
                size="default"
                onClick={() => {
                  setExportDateFrom(filters.dateFrom);
                  setExportDateTo(filters.dateTo);
                  setExportDialogOpen(true);
                }}
              >
                Exporter le rapport
              </Button>
              <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Exporter le rapport Excel</DialogTitle>
                  </DialogHeader>
                  <div className="grid grid-cols-2 gap-4 py-2">
                    <div>

                      <label className="text-sm font-medium">Date de début</label>
                      <Input
                        type="date"
                        value={exportDateFrom}
                        onChange={e => setExportDateFrom(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Date de fin</label>
                      <Input
                        type="date"
                        value={exportDateTo}
                        onChange={e => setExportDateTo(e.target.value)}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      onClick={() => {
                        exportToExcelWithSummary(exportFilteredHistory, `rapport-produits-prets.xlsx`);
                        setExportDialogOpen(false);
                      }}
                    >
                      Exporter
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            <Card>
              <div className="p-4">
                <p className="text-sm font-medium text-muted-foreground">Stock Actuel</p>
                <p className="text-2xl font-bold">{stock}</p>
              </div>
            </Card>
            <Card>
              <div className="p-4">
                <p className="text-sm font-medium text-muted-foreground">Total Entrées</p>
                <p className="text-2xl font-bold">{totalEntrer}</p>
              </div>
            </Card>
            <Card>
              <div className="p-4">
                <p className="text-sm font-medium text-muted-foreground">Total Sorties</p>
                <p className="text-2xl font-bold">{totalSortie}</p>
              </div>
            </Card>
          </div>
        </div>
        <Card>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Heure</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Quantité</TableHead>
                  <TableHead>Emplacement</TableHead>
                  <TableHead>Étage/Partie</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movementHistory.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      Aucun mouvement trouvé.
                    </TableCell>
                  </TableRow>
                ) : (
                  movementHistory.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="font-medium">{
                        entry.date
                          ? (() => {
                              // Add 1 day to the date
                              try {
                                // Use date-fns if available
                                // import { addDays, format } from 'date-fns';
                                // return format(addDays(new Date(entry.date), 1), 'yyyy-MM-dd');
                                const d = new Date(entry.date);
                                d.setDate(d.getDate() + 1);
                                return d.toISOString().slice(0, 10);
                              } catch {
                                return entry.date.slice(0, 10);
                              }
                            })()
                          : ''
                      }</TableCell>
                      <TableCell>{entry.time ? entry.time.slice(0, 5) : ''}</TableCell>
                      <TableCell>
                        <Badge 
                          variant={entry.status === 'Entrée' ? 'default' : 'destructive'}
                          className={entry.status === 'Entrée' ? 'bg-green-600 hover:bg-green-700' : ''}
                        >
                          {entry.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-semibold">
                        {entry.quantity}
                      </TableCell>
                      <TableCell>{entry.location_name}</TableCell>
                      <TableCell>{entry.etage_name ? entry.etage_name : (entry.part_name ? entry.part_name : '-')}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
        <FiniOperationClient
          open={openForm}
          onOpenChange={(open) => {
            setOpenForm(open);
            if (!open) setOperationType('');
          }}
          operationType={operationType as 'Entrée' | 'Sortie' | ''}
          onSuccess={() => {
            setOperationType('');
            setOpenForm(false);
            fetchMovementHistory(); // <-- Fetch new data after POST
          }}
          product={null} // No single product context for ready
          locations={locations}
          floorData={floorData}
          movementHistory={movementHistory}
        />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="mb-4 sm:mb-6">
        <Button
          variant="outline"
          size="sm"
          className="mb-2"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft size={16} className="mr-2" />
          Retour
        </Button>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-4">
              <h1 className="text-2xl sm:text-3xl font-bold mb-1 truncate">Produit Fini - {product?.nom}</h1>
              <div className="flex gap-2">
                <FiniOperationTypeDialog
                  open={openOperation}
                  onOpenChange={setOpenOperation}
                  onSelect={(type) => {
                    setOperationType(type);
                    setOpenOperation(false);
                    setOpenForm(true);
                  }}
                  trigger={
                    <Button variant="default">Nouvelle opération</Button>
                  }
                />
                <Button
                  variant="outline"
                  size="default"
                  onClick={() => {
                    setExportDateFrom(filters.dateFrom);
                    setExportDateTo(filters.dateTo);
                    setExportDialogOpen(true);
                  }}
                >
                  Exporter le rapport
                </Button>
                <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Exporter le rapport Excel</DialogTitle>
                    </DialogHeader>
                    <div className="grid grid-cols-2 gap-4 py-2">
                      <div>
                        <label className="text-sm font-medium">Date de début</label>
                        <Input
                          type="date"
                          value={exportDateFrom}
                          onChange={e => setExportDateFrom(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Date de fin</label>
                        <Input
                          type="date"
                          value={exportDateTo}
                          onChange={e => setExportDateTo(e.target.value)}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        onClick={() => {
                          exportToExcelWithSummary(exportFilteredHistory, `rapport-produit-fini-${product?.reference || ''}.xlsx`);
                          setExportDialogOpen(false);
                        }}
                      >
                        Exporter
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
            <p className="text-sm sm:text-base text-muted-foreground">
              Référence: {product?.reference || ''} | Stock actuel: {product?.stock ?? 0} {product?.unite || ''}
            </p>
          </div>
        </div>
      </div>

      {/* Product Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <Card>
          <div className="p-4">
            <p className="text-sm font-medium text-muted-foreground">Stock Actuel</p>
            <p className="text-2xl font-bold">{stock}</p>
            {/* Debug info */}
            <p className="text-xs text-gray-500">Debug: {stock} (movements: {movementHistory.length})</p>
          </div>
        </Card>
        <Card>
          <div className="p-4">
            <p className="text-sm font-medium text-muted-foreground">Total Entrées</p>
            <p className="text-2xl font-bold">{totalEntrer}</p>
            {/* Debug info */}
            <p className="text-xs text-gray-500">Debug: {totalEntrer}</p>
          </div>
        </Card>
        <Card>
          <div className="p-4">
            <p className="text-sm font-medium text-muted-foreground">Total Sorties</p>
            <p className="text-2xl font-bold">{totalSortie}</p>
            {/* Debug info */}
            <p className="text-xs text-gray-500">Debug: {totalSortie}</p>
          </div>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Rechercher dans l'historique..."
            className="pl-10 text-sm sm:text-base"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Popover open={showFilters} onOpenChange={setShowFilters}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Filtres
                {Object.values(filters).some(filter => filter !== '') && (
                  <Badge variant="secondary" className="ml-1">
                    {Object.values(filters).filter(filter => filter !== '').length}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="end">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Filtres</h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setFilters({
                      status: '',
                      location: '',
                      dateFrom: '',
                      dateTo: '',
                      fournisseur: '',
                      atelier: ''
                    })}
                    className="h-6 px-2"
                  >
                    <X className="h-3 w-3 mr-1" />
                    Effacer
                  </Button>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium">Statut</label>
                    <Select value={filters.status || "all"} onValueChange={(value) => setFilters(prev => ({ ...prev, status: value === "all" ? "" : value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Tous les statuts" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tous les statuts</SelectItem>
                        <SelectItem value="Entrée">Entrée</SelectItem>
                        <SelectItem value="Sortie">Sortie</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Emplacement</label>
                    <Select value={filters.location || "all"} onValueChange={(value) => setFilters(prev => ({ ...prev, location: value === "all" ? "" : value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Tous les emplacements" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tous les emplacements</SelectItem>
                        {LOCATIONS.map((location) => (
                          <SelectItem key={location} value={location}>
                            {location}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-sm font-medium">Date de début</label>
                      <Input
                        type="date"
                        value={filters.dateFrom}
                        onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Date de fin</label>
                      <Input
                        type="date"
                        value={filters.dateTo}
                        onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Heure</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Quantité</TableHead>
                <TableHead>Emplacement</TableHead>
                <TableHead>Étage/Partie</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredHistory.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    Aucun historique trouvé.
                  </TableCell>
                </TableRow>
              ) : (
                filteredHistory.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="font-medium">{entry.date ? entry.date.slice(0, 10) : ''}</TableCell>
                    <TableCell>{entry.time ? entry.time.slice(0, 5) : ''}</TableCell>
                    <TableCell>
                      <Badge 
                        variant={entry.status === 'Entrée' ? 'default' : 'destructive'}
                        className={entry.status === 'Entrée' ? 'bg-green-600 hover:bg-green-700' : ''}
                      >
                        {entry.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-semibold">
                      {entry.quantity}
                    </TableCell>
                    <TableCell>{entry.location_name}</TableCell>
                    <TableCell>{entry.etage_name ? entry.etage_name : (entry.part_name ? entry.part_name : '-')}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
      <FiniOperationDialog
        open={openForm}
        onOpenChange={(open) => {
          setOpenForm(open);
          if (!open) setOperationType('');
        }}
        operationType={operationType as 'Entrée' | 'Sortie' | 'Complément Stock' | 'Transfer' | ''}
        onSuccess={() => {
          setOperationType('');
          setOpenForm(false);
        }}
        product={product}
        locations={locations}
        floorData={floorData}
        movementHistory={movementHistory}
      />
    </Layout>
  );
};

export default ProduitClientDetail; 