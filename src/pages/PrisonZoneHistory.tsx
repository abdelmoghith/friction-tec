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
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import OperationTypeDialog from '@/components/product/OperationTypeDialog';
import ProductOperationDialog from '@/components/product/ProductOperationDialog';
import PrisonOperationZone from '@/components/product/PrisonOperationZone';
import { format } from 'date-fns';

// Helper to generate random mock data for product history
function getRandomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const STATUSES = ['Entrée', 'Sortie'];

function generateRandomHistoryEntry(index: number, productId: string) {
  const status = STATUSES[getRandomInt(0, 1)];
  const quantity = getRandomInt(1, 100);
  const location = ['Entrepôt A', 'Entrepôt B', 'Zone 1', 'Zone 2', 'Zone 3'][getRandomInt(0, 4)];
  const date = new Date();
  date.setDate(date.getDate() - getRandomInt(0, 30)); // Random date within last 30 days
  const hours = getRandomInt(8, 18);
  const minutes = getRandomInt(0, 59);
  
  return {
    id: `HIST-${productId}-${index}`,
    status,
    quantity,
    location,
    date: date.toISOString().split('T')[0],
    time: `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`,
    fournisseur: status === 'Entrée' ? ['Fournisseur A', 'Fournisseur B', 'Fournisseur C'][getRandomInt(0, 2)] : null,
    atelier: status === 'Sortie' ? ['Atelier 1', 'Atelier 2', 'Atelier 3'][getRandomInt(0, 2)] : null
  };
}

// Helper to convert data to CSV and trigger download
function exportToCSV(data: any[], filename: string) {
  if (!data.length) return;
  const headers = Object.keys(data[0]);
  const csvRows = [headers.join(',')];
  for (const row of data) {
    csvRows.push(headers.map(h => '"' + String(row[h] ?? '').replace(/"/g, '""') + '"').join(','));
  }
  const csvString = csvRows.join('\n');
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  saveAs(blob, filename);
}

const PrisonZoneHistory = () => {
  const { productId } = useParams();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: '',
    location: '',
    dateFrom: '',
    dateTo: '',
    fournisseur: '',
    atelier: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportDateFrom, setExportDateFrom] = useState(filters.dateFrom);
  const [exportDateTo, setExportDateTo] = useState(filters.dateTo);
  // Add state for operation dialog and form
  const [openOperation, setOpenOperation] = useState(false);
  const [operationType, setOperationType] = useState('');
  const [openForm, setOpenForm] = useState(false);
  const [operationForm, setOperationForm] = useState({ fournisseur: '', quantity: '', location: '' });
  const [locations, setLocations] = useState<string[]>([]);
  const [floorData, setFloorData] = useState<{ [key: string]: Array<{ id: number, name: string, availableCapacity: number, totalCapacity: number, type: 'etage' | 'part' }> }>({});
  const [movementHistory, setMovementHistory] = useState<any[]>([]);
  
  // Prison Operation Zone dialog state
  const [prisonOperationOpen, setPrisonOperationOpen] = useState(false);
  const [prisonOperationType, setPrisonOperationType] = useState<'Entrée' | 'Sortie' | ''>('');

  // New state for product selection and storage display
  const [showProductSelection, setShowProductSelection] = useState(false);
  const [availableProducts, setAvailableProducts] = useState<any[]>([]);
  const [selectedProductForSortie, setSelectedProductForSortie] = useState<any>(null);
  const [productStorageData, setProductStorageData] = useState<any[]>([]);
  const [showQuantityDialog, setShowQuantityDialog] = useState(false);
  const [sortieQuantity, setSortieQuantity] = useState('');
  const [sortieDecision, setSortieDecision] = useState('');
  const [locationIdMap, setLocationIdMap] = useState<Record<string, number>>({});

  // Fetch product data from backend
  const fetchProduct = () => {
    if (!productId) {
      setLoading(false);
      return;
    }
    fetch(`/api/products/${productId}`)
      .then(res => res.json())
      .then(data => {
        setProduct({
          ...data,
          alerte: data.alerte ?? data.alert ?? 0,
        });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };
  useEffect(() => {
    fetchProduct();
    // eslint-disable-next-line
  }, [productId]);

  // Fetch movement history from backend
  const fetchMovementHistory = () => {
    // If no productId, fetch all movements for prison locations
    const url = productId 
      ? `/api/movements?product_id=${productId}`
      : '/api/movements'; // Fetch all movements, we'll filter for prison locations client-side
    
    fetch(url)
      .then(res => res.json())
      .then(data => {
        // Ensure data is always an array
        const movements = Array.isArray(data) ? data : [];
        setMovementHistory(movements);
      })
      .catch(() => setMovementHistory([]));
  };
  useEffect(() => {
    fetchMovementHistory();
    // eslint-disable-next-line
  }, [productId]);

  // Store prison locations for filtering
  const [prisonLocationNames, setPrisonLocationNames] = useState<string[]>([]);

  // Fetch available products when prison locations and movement history are loaded
  useEffect(() => {
    if (prisonLocationNames.length > 0 && movementHistory.length > 0) {
      fetchAvailableProducts(prisonLocationNames);
    }
    // eslint-disable-next-line
  }, [prisonLocationNames, movementHistory]);

  // Fetch available products for sortie
  const fetchAvailableProducts = (prisonLocs: string[]) => {
    fetch('/api/products')
      .then(res => res.json())
      .then(data => {
        // Filter products that have stock in prison locations
        const productsWithPrisonStock = data.filter((product: any) => {
          // Check if product has movements in prison locations
          return movementHistory.some(movement =>
            movement.product_id === product.id &&
            prisonLocs.includes(movement.location_name) &&
            movement.status === 'Entrée'
          );
        });
        setAvailableProducts(productsWithPrisonStock);
      })
      .catch(() => setAvailableProducts([]));
  };

  // Fetch storage data for selected product
  const fetchProductStorageData = (productId: number) => {
    // Filter movements for the selected product in prison locations
    const productMovements = movementHistory.filter(movement =>
      movement.product_id === productId &&
      prisonLocationNames.includes(movement.location_name)
    );

    // Group by location, etage/part, and batch to show current stock
    const storageMap: Record<string, any> = {};

    productMovements.forEach(movement => {
      const key = `${movement.location_name}-${movement.etage_name || movement.part_name || 'N/A'}-${movement.batch_number || movement.lot || 'N/A'}`;

      if (!storageMap[key]) {
        storageMap[key] = {
          location: movement.location_name,
          etage_part: movement.etage_name || movement.part_name || 'N/A',
          batch: movement.batch_number || movement.lot || 'N/A',
          fabrication_date: movement.fabrication_date,
          expiration_date: movement.expiration_date,
          quality_status: movement.quality_status || 'En attente',
          etage_id: movement.etage_id || null, // Store etage_id
          part_id: movement.part_id || null,   // Store part_id
          location_id: movement.location_id || null, // Store location_id
          total_entree: 0,
          total_sortie: 0,
          stock_disponible: 0
        };
      }

      if (movement.status === 'Entrée') {
        storageMap[key].total_entree += movement.quantity || 0;
      } else if (movement.status === 'Sortie') {
        storageMap[key].total_sortie += movement.quantity || 0;
      }

      storageMap[key].stock_disponible = storageMap[key].total_entree - storageMap[key].total_sortie;
    });

    // Convert to array and filter out items with no stock
    const storageData = Object.values(storageMap).filter((item: any) => item.stock_disponible > 0);
    setProductStorageData(storageData);
  };

  // Handle direct sortie creation
  const handleDirectSortie = async () => {
    if (!selectedProductForSortie || !sortieQuantity || parseInt(sortieQuantity) <= 0) {
      toast.error('Veuillez entrer une quantité valide.');
      return;
    }

    if (!sortieDecision) {
      toast.error('Veuillez sélectionner une décision (tri, rebut, libération).');
      return;
    }

    const quantity = parseInt(sortieQuantity);
    const totalAvailableStock = productStorageData.reduce((sum, item) => sum + item.stock_disponible, 0);

    if (quantity > totalAvailableStock) {
      toast.error(`Quantité insuffisante. Stock disponible: ${totalAvailableStock}`);
      return;
    }

    try {
      // Create sortie movements using FIFO logic
      let remainingQuantity = quantity;
      const sortieMovements = [];

      // Sort storage data by fabrication date (FIFO - First In, First Out)
      const sortedStorage = [...productStorageData].sort((a, b) => {
        const dateA = new Date(a.fabrication_date || '1900-01-01');
        const dateB = new Date(b.fabrication_date || '1900-01-01');
        return dateA.getTime() - dateB.getTime();
      });

      for (const storageItem of sortedStorage) {
        if (remainingQuantity <= 0) break;

        const quantityToTake = Math.min(remainingQuantity, storageItem.stock_disponible);

        if (quantityToTake > 0) {
          // Find the location ID
          const locationId = locationIdMap[storageItem.location];

          // Create sortie movement
          const sortiePayload = {
            product_type: selectedProductForSortie.type || 'matiere',
            product_id: selectedProductForSortie.id,
            status: 'Sortie',
            quantity: quantityToTake,
            location_id: locationId,
            // Ensure DATE-only strings (YYYY-MM-DD) for MySQL DATE columns
            fabricationDate: storageItem.fabrication_date ? String(storageItem.fabrication_date).slice(0, 10) : new Date().toISOString().slice(0, 10),
            expirationDate: storageItem.expiration_date ? String(storageItem.expiration_date).slice(0, 10) : new Date().toISOString().slice(0, 10),
            date: new Date().toISOString().slice(0, 10),
            batch_number: storageItem.batch,
            etage_id: storageItem.etage_id || null, // Include floor ID
            part_id: storageItem.part_id || null,   // Include part ID
            is_transfer: 0,
            internal_transfer: 0,
            quality_transfer: 0,
            quality_status: storageItem.quality_status,
            decision: sortieDecision // Add the decision field
          };

          sortieMovements.push(sortiePayload);
          remainingQuantity -= quantityToTake;
        }
      }

      // Execute all sortie movements
      const promises = sortieMovements.map(payload =>
        fetch('/api/movements', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        })
      );

      await Promise.all(promises);

      toast.success(`Sortie créée avec succès: ${quantity} ${selectedProductForSortie.unite}`);

      // Reset states and refresh data
      setShowQuantityDialog(false);
      setSelectedProductForSortie(null);
      setProductStorageData([]);
      setSortieQuantity('');
      setSortieDecision('');
      fetchMovementHistory();
      fetchProduct();

    } catch (error) {
      toast.error('Erreur lors de la création de la sortie.');
      console.error('Sortie creation error:', error);
    }
  };

  // Fetch real locations and floor data
  useEffect(() => {
    fetch('/api/locations')
      .then(res => res.json())
      .then(locs => {
        setLocations(locs.map((l: any) => l.name));

        // Get prison location names for filtering
        const prisonLocs = locs.filter((l: any) => l.is_prison === 1 || l.is_prison === '1' || l.is_prison === true);
        setPrisonLocationNames(prisonLocs.map((l: any) => l.name));

        // Build location ID mapping
        const idMap: Record<string, number> = {};
        locs.forEach((loc: any) => {
          idMap[loc.name] = loc.id;
        });
        setLocationIdMap(idMap);
        
        const data: { [key: string]: Array<{ id: number, name: string, availableCapacity: number, totalCapacity: number, type: 'etage' | 'part' }> } = {};
        locs.forEach((l: any) => {
          let items: Array<{ id: number, name: string, availableCapacity: number, totalCapacity: number, type: 'etage' | 'part' }>;
          if (l.etages && Array.isArray(l.etages) && l.etages.length > 0) {
            items = l.etages.map((item: any) => ({
              id: item.id,
              name: item.name,
              availableCapacity: item.currentStock !== undefined ? (item.places || 0) - item.currentStock : (item.places || 0),
              totalCapacity: item.places || 0,
              type: 'etage',
            }));
          } else if (l.parts && Array.isArray(l.parts) && l.parts.length > 0) {
            items = l.parts.map((item: any) => ({
              id: item.id,
              name: item.name,
              availableCapacity: item.currentStock !== undefined ? (item.maxCapacity || 0) - item.currentStock : (item.maxCapacity || 0),
              totalCapacity: item.maxCapacity || 0,
              type: 'part',
            }));
          } else {
            items = [];
          }
          data[l.name] = items;
        });
        setFloorData(data);
      });
  }, []);

  const filteredHistory = movementHistory.filter(entry => {
    // If no productId, only show movements from prison locations or quality transfers
    if (!productId) {
      const isPrisonLocation = entry.is_prison === 1 || entry.is_prison === '1' || entry.is_prison === true;
      const isQualityTransfer = entry.quality_transfer === 1 || entry.quality_transfer === '1' || entry.quality_transfer === true;
      if (!isPrisonLocation && !isQualityTransfer) {
        return false;
      }
    }

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
    // Prepare summary rows
    const summaryRows = [
      ["Nom", product?.nom ?? ""],
      ["Référence", product?.reference ?? ""],
      ["Unité", product?.unite ?? ""],
      ["Stock Actuel", product?.stock ?? ""],
      ["Total Entrées", product?.total_entrer ?? ""],
      ["Total Sorties", product?.total_sortie ?? ""],
      ["Seuil d'Alerte", product?.alerte ?? ""],
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

  // Helper to format date and time
  function formatDate(dateStr: string) {
    if (!dateStr) return '';
    return dateStr.slice(0, 10); // YYYY-MM-DD
  }
  function formatTime(timeStr: string) {
    if (!timeStr) return '';
    return timeStr.slice(0, 5); // HH:mm
  }

  // Extract unique fournisseurs and ateliers from movementHistory for filters
  const uniqueFournisseurs = Array.from(new Set(movementHistory.map(entry => entry.fournisseur_name).filter(Boolean)));
  const uniqueAteliers = Array.from(new Set(movementHistory.map(entry => entry.atelier).filter(Boolean)));

  if (loading) {
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
      <div className="mb-4 sm:mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <Button
              variant="ghost"
              size="sm"
              className="mb-2"
              onClick={() => navigate(productId ? '/products' : '/control-quality')}
            >
              <ArrowLeft size={16} className="mr-2" />
              {productId ? 'Retour aux Matières' : 'Retour au Contrôle Qualité'}
            </Button>
            <h1 className="text-2xl sm:text-3xl font-bold mb-1">
              {productId ? `Historique - ${product?.nom}` : 'Prison Zone History'}
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              {productId 
                ? `Référence: ${product?.reference} | Stock actuel: ${product?.stock} ${product?.unite}`
                : 'Historique des mouvements de quarantaine et transferts qualité'
              }
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                // Refresh available products before showing selection
                if (prisonLocationNames.length > 0 && movementHistory.length > 0) {
                  fetchAvailableProducts(prisonLocationNames);
                }
                setShowProductSelection(true);
              }}
            >
              Nouvelle sortie
            </Button>
            {/* Exporter le rapport button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setExportDateFrom(filters.dateFrom);
                setExportDateTo(filters.dateTo);
                setExportDialogOpen(true);
              }}
            >
              Exporter le rapport
            </Button>
          </div>
        </div>
      </div>
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
                exportToExcelWithSummary(exportFilteredHistory, `rapport-matiere-${product?.reference || ''}.xlsx`);
                setExportDialogOpen(false);
              }}
            >
              Exporter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Product Selection Dialog */}
      <Dialog open={showProductSelection} onOpenChange={setShowProductSelection}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Sélectionner un produit pour la sortie</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="mb-4 text-sm text-muted-foreground">
              Choisissez un produit pour voir où il est stocké dans les zones de quarantaine :
            </p>

            {availableProducts.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Aucun produit disponible dans les zones de quarantaine.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {availableProducts.map((product) => (
                  <div
                    key={product.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                    onClick={() => {
                      setSelectedProductForSortie(product);
                      fetchProductStorageData(product.id);
                      setShowProductSelection(false);
                    }}
                  >
                    <div>
                      <p className="font-medium">{product.nom || product.name}</p>
                      <p className="text-sm text-muted-foreground">
                        Référence: {product.reference} | Unité: {product.unite}
                      </p>
                    </div>
                    <Button variant="outline" size="sm">
                      Sélectionner
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowProductSelection(false)}
            >
              Annuler
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Product Storage Table Dialog */}
      <Dialog open={!!selectedProductForSortie} onOpenChange={(open) => {
        if (!open) {
          setSelectedProductForSortie(null);
          setProductStorageData([]);
        }
      }}>
        <DialogContent className="max-w-6xl">
          <DialogHeader>
            <DialogTitle>
              Stock en quarantaine - {selectedProductForSortie?.nom || selectedProductForSortie?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="mb-4 text-sm text-muted-foreground">
              Référence: {selectedProductForSortie?.reference} |
              Unité: {selectedProductForSortie?.unite}
            </p>

            {productStorageData.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Aucun stock disponible pour ce produit.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Emplacement</TableHead>
                      <TableHead>Étage/Partie</TableHead>
                      <TableHead>Lot/Batch</TableHead>
                      <TableHead>Fab</TableHead>
                      <TableHead>Exp</TableHead>
                      <TableHead>Total Entrée</TableHead>
                      <TableHead>Total Sortie</TableHead>
                      <TableHead>Stock Disponible</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {productStorageData.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{item.location}</TableCell>
                        <TableCell>{item.etage_part}</TableCell>
                        <TableCell>{item.batch}</TableCell>
                        <TableCell>
                          {item.fabrication_date ? new Date(item.fabrication_date).toLocaleDateString('fr-FR') : '-'}
                        </TableCell>
                        <TableCell>
                          {item.expiration_date ? new Date(item.expiration_date).toLocaleDateString('fr-FR') : '-'}
                        </TableCell>
                        <TableCell className="font-semibold text-green-600">
                          {item.total_entree} {selectedProductForSortie?.unite}
                        </TableCell>
                        <TableCell className="font-semibold text-red-600">
                          {item.total_sortie} {selectedProductForSortie?.unite}
                        </TableCell>
                        <TableCell className="font-bold">
                          {item.stock_disponible} {selectedProductForSortie?.unite}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setSelectedProductForSortie(null);
                setProductStorageData([]);
              }}
            >
              Fermer
            </Button>
            {productStorageData.length > 0 && (
              <Button
                onClick={() => {
                  // Show quantity dialog for direct sortie creation
                  setShowQuantityDialog(true);
                }}
              >
                Créer une sortie
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quantity Dialog for Direct Sortie */}
      <Dialog open={showQuantityDialog} onOpenChange={setShowQuantityDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Quantité pour la sortie</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="mb-4 text-sm text-muted-foreground">
              Produit: {selectedProductForSortie?.nom || selectedProductForSortie?.name}
              <br />
              Référence: {selectedProductForSortie?.reference}
              <br />
              Stock total disponible: {productStorageData.reduce((sum, item) => sum + item.stock_disponible, 0)} {selectedProductForSortie?.unite}
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Décision *</label>
                <Select
                  value={sortieDecision}
                  onValueChange={setSortieDecision}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner une décision" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tri">Tri</SelectItem>
                    <SelectItem value="rebut">Rebut</SelectItem>
                    <SelectItem value="libération">Libération</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Quantité à sortir</label>
                <Input
                  type="number"
                  placeholder="Entrez la quantité"
                  value={sortieQuantity}
                  onChange={(e) => setSortieQuantity(e.target.value)}
                  min="1"
                  max={productStorageData.reduce((sum, item) => sum + item.stock_disponible, 0)}
                />
              </div>

              <div className="text-sm text-muted-foreground">
                <p className="font-medium mb-2">Répartition du stock (FIFO):</p>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {productStorageData
                    .sort((a, b) => new Date(a.fabrication_date || '1900-01-01').getTime() - new Date(b.fabrication_date || '1900-01-01').getTime())
                    .map((item, index) => (
                    <div key={index} className="text-xs p-2 bg-gray-50 rounded">
                      {item.location} - {item.etage_part} - Lot: {item.batch} - Stock: {item.stock_disponible} {selectedProductForSortie?.unite}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowQuantityDialog(false);
                setSortieQuantity('');
                setSortieDecision('');
              }}
            >
              Annuler
            </Button>
            <Button
              onClick={handleDirectSortie}
              disabled={!sortieQuantity || parseInt(sortieQuantity) <= 0 || !sortieDecision}
            >
              Confirmer la sortie
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add the operation dialog at the end of the component */}
      {/* <Dialog open={openOperation} onOpenChange={setOpenOperation}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouvelle opération</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-4">
            <Button size="lg" variant="default" onClick={() => { setOperationType('Entrée'); setOpenOperation(false); setOpenForm(true); }}>Entrée</Button>
            <Button size="lg" variant="secondary" onClick={() => { setOperationType('Sortie'); setOpenOperation(false); setOpenForm(true); }}>Sortie</Button>
          </div>
        </DialogContent>
      </Dialog> */}

      {/* Add the operation form dialog at the end of the component */}
      {/* <Dialog open={openForm} onOpenChange={setOpenForm}>
        <DialogContent>
          <div className="flex items-center mb-2">
            <Button variant="ghost" size="icon" onClick={() => { setOpenForm(false); setOpenOperation(true); }}>
              <ArrowLeft size={18} />
            </Button>
            <DialogHeader className="flex-1">
              <DialogTitle>{operationType === 'Entrée' ? 'Nouvelle Entrée' : 'Nouvelle Sortie'}</DialogTitle>
            </DialogHeader>
          </div>
          <div className="space-y-4">
            {operationType === 'Entrée' ? (
              <Select value={operationForm.fournisseur} onValueChange={val => setOperationForm(f => ({ ...f, fournisseur: val }))}>
                <SelectTrigger><SelectValue placeholder="Sélectionner un fournisseur" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Fournisseur A">Fournisseur A</SelectItem>
                  <SelectItem value="Fournisseur B">Fournisseur B</SelectItem>
                  <SelectItem value="Fournisseur C">Fournisseur C</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <Input
                value={currentPlace}
                readOnly
                placeholder="Emplacement actuel"
              />
            )}
            <Input
              type="number"
              placeholder="Quantité"
              value={operationForm.quantity}
              onChange={e => setOperationForm(f => ({ ...f, quantity: e.target.value }))}
            />
            <Select value={operationForm.location} onValueChange={val => setOperationForm(f => ({ ...f, location: val }))}>
              <SelectTrigger>
                <SelectValue placeholder={operationType === 'Entrée' ? 'Emplacement' : 'Prochain emplacement'} />
              </SelectTrigger>
              <SelectContent>
                {LOCATIONS.map(loc => <SelectItem key={loc} value={loc}>{loc}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setOpenForm(false); setOperationType(''); setOperationForm({ fournisseur: '', quantity: '', location: '' }); }}>Annuler</Button>
            <Button
              disabled={
                operationType === 'Entrée'
                  ? !operationForm.fournisseur || !operationForm.quantity || !operationForm.location
                  : !operationForm.quantity || !operationForm.location
              }
              onClick={() => {
                setOpenForm(false);
                toast.success(
                  operationType === 'Entrée'
                    ? `${operationType} enregistrée: ${operationForm.quantity} à ${operationForm.location} (Fournisseur: ${operationForm.fournisseur})`
                    : `${operationType} enregistrée: ${operationForm.quantity} de ${currentPlace} vers ${operationForm.location}`
                );
                setOperationType('');
                setOperationForm({ fournisseur: '', quantity: '', location: '' });
              }}
            >
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog> */}

      {/* Product Summary Cards - Only show when there's a specific product */}
      {productId && product && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <div className="p-4">
              <p className="text-sm font-medium text-muted-foreground">Stock Actuel</p>
              <p className="text-2xl font-bold">{product?.stock ?? 0} {product?.unite ?? ''}</p>
            </div>
          </Card>

          <Card>
            <div className="p-4">
              <p className="text-sm font-medium text-muted-foreground">Total Entrées</p>
              <p className="text-2xl font-bold">{product?.total_entrer ?? 0} {product?.unite ?? ''}</p>
            </div>
          </Card>

          <Card>
            <div className="p-4">
              <p className="text-sm font-medium text-muted-foreground">Total Sorties</p>
              <p className="text-2xl font-bold">{product?.total_sortie ?? 0} {product?.unite ?? ''}</p>
            </div>
          </Card>

          <Card>
            <div className="p-4">
              <p className="text-sm font-medium text-muted-foreground">Seuil d'Alerte</p>
              <p className="text-2xl font-bold">{product?.alerte ?? 0} {product?.unite ?? ''}</p>
            </div>
          </Card>
        </div>
      )}

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
                        {locations.map((location) => (
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

                  <div>
                    <label className="text-sm font-medium">Fournisseur</label>
                    <Select value={filters.fournisseur || "all"} onValueChange={(value) => setFilters(prev => ({ ...prev, fournisseur: value === "all" ? "" : value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Tous les fournisseurs" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tous les fournisseurs</SelectItem>
                        {uniqueFournisseurs.map(f => (
                          <SelectItem key={f} value={f}>{f}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Atelier</label>
                    <Select value={filters.atelier || "all"} onValueChange={(value) => setFilters(prev => ({ ...prev, atelier: value === "all" ? "" : value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Tous les ateliers" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tous les ateliers</SelectItem>
                        {uniqueAteliers.map(a => (
                          <SelectItem key={a} value={a}>{a}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                <TableHead>Étage/Place</TableHead>
                <TableHead>Fab</TableHead>
                <TableHead>Exp</TableHead>
                <TableHead>Motif</TableHead>
                <TableHead>Décision</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredHistory.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8">
                    Aucun historique trouvé.
                  </TableCell>
                </TableRow>
              ) : (
                filteredHistory
                  .slice()
                  .sort((a, b) => {
                    const dateA = new Date(a.created_at || a.date || 0);
                    const dateB = new Date(b.created_at || b.date || 0);
                    return dateB.getTime() - dateA.getTime();
                  })
                  .map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="font-medium whitespace-nowrap">{formatDate(entry.created_at || entry.date)}</TableCell>
                    <TableCell className="whitespace-nowrap">{formatTime(entry.time)}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      <Badge 
                        variant={entry.status === 'Entrée' ? 'default' : 'destructive'}
                        className={entry.status === 'Entrée' ? 'bg-green-600 hover:bg-green-700' : ''}
                      >
                        {entry.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-semibold whitespace-nowrap">
                      {entry.quantity} {product?.unite}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{entry.location_name}</TableCell>
                    <TableCell className="whitespace-nowrap">{entry.etage_name || entry.part_name || '-'}</TableCell>
                    <TableCell className="whitespace-nowrap">{entry.fabrication_date ? formatDate(new Date(new Date(entry.fabrication_date).getTime() + 24 * 60 * 60 * 1000).toISOString()) : '-'}</TableCell>
                    <TableCell className="whitespace-nowrap">{entry.expiration_date ? formatDate(new Date(new Date(entry.expiration_date).getTime() + 24 * 60 * 60 * 1000).toISOString()) : '-'}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      {entry.isolation_reason || '-'}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {entry.decision ? (
                        entry.decision === 'tri' ? 'Tri' :
                        entry.decision === 'rebut' ? 'Rebut' :
                        entry.decision === 'libération' ? 'Libération' :
                        entry.decision
                      ) : '-'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Prison Operation Zone Dialog */}
      <PrisonOperationZone
        open={prisonOperationOpen}
        onOpenChange={setPrisonOperationOpen}
        operationType={prisonOperationType}
        onSuccess={(info) => {
          setPrisonOperationOpen(false);
          setPrisonOperationType('');
          setSelectedProductForSortie(null);
          setProductStorageData([]);
          setSortieQuantity(''); // Reset sortie quantity
          toast.success('Opération enregistrée avec succès');
          // Refresh data after operation
          fetchMovementHistory();
          fetchProduct();
        }}
        product={selectedProductForSortie || product} // Pass the selected product for sortie or current product
        locations={locations}
        floorData={floorData}
        movementHistory={movementHistory}
        initialQuantity={sortieQuantity} // Pass the sortie quantity as initial quantity
      />
    </Layout>
  );
};

export default PrisonZoneHistory;