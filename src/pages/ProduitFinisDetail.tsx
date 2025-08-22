import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, ArrowLeft, Filter, X, Eye, FileText, MoreHorizontal, Edit, Trash2 } from 'lucide-react';
import TableLoadingRow from '@/components/ui/table-loading-row';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';
import FiniOperationTypeDialog from '@/components/product/FiniOperationTypeDialog';
import FiniOperationDialog from '@/components/product/FiniOperationDialog';
import MovementDetailsDialog from '@/components/product/MovementDetailsDialog';
import RecipeDetailsDialog from '@/components/product/RecipeDetailsDialog';
import EditMovementDialog from '@/components/product/EditMovementDialog';
import axios from 'axios';

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

const ProduitFinisDetail = () => {
  const { reference } = useParams();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(true);
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
  const [exportDateFrom, setExportDateFrom] = useState('');
  const [exportDateTo, setExportDateTo] = useState('');
  const [locations, setLocations] = useState<string[]>([]);
  const [floorData, setFloorData] = useState<Record<string, Array<{ id: number, name: string, availableCapacity: number, totalCapacity: number }>>>({});
  // New state for movement details and recipe dialogs
  const [movementDetailsOpen, setMovementDetailsOpen] = useState(false);
  const [selectedMovement, setSelectedMovement] = useState<any>(null);
  const [recipeDetailsOpen, setRecipeDetailsOpen] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<any>(null);
  
  // State for edit and delete operations
  const [editMovementOpen, setEditMovementOpen] = useState(false);
  const [movementToEdit, setMovementToEdit] = useState<any>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [movementToDelete, setMovementToDelete] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Extracted fetchLocationsAndFloors function
  const fetchLocationsAndFloors = async () => {
    const res = await axios.get('/api/locations');
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
  };

  // Fetch locations and floor data
  useEffect(() => {
    fetchLocationsAndFloors();
  }, []);

  // Refactored: Fetch product and movement history
  const fetchProductAndHistory = async () => {
    if (!reference) return;
    setLoading(true);
    setTableLoading(true);
    try {
      const productsRes = await axios.get('/api/finished-products');
      const products = productsRes.data || [];
      const found = products.find((p: any) => (p.reference || '').replace('REF-', '') === reference);
      if (!found) throw new Error('Produit fini non trouvé');
      setProduct(found);

      const movementsRes = await axios.get(`/api/movements?product_id=${found.id}`);
      const filtered = (movementsRes.data || []).filter((m: any) => m.product_type === 'finis');
      setMovementHistory(filtered);
      setLoading(false);
      setTableLoading(false);
    } catch (err) {
      setLoading(false);
      setTableLoading(false);
      setProduct(null);
      setMovementHistory([]);
      toast.error('Erreur lors du chargement des données du produit ou de son historique.');
    }
  };

  // Fetch finished product by reference, then fetch its details and movement history
  useEffect(() => {
    fetchProductAndHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reference]);

  // Calculate stock, total_entrer, total_sortie from filtered movementHistory (excluding is_transfer = '1')
  const stock = movementHistory
    .filter(m => m.is_transfer !== '1')
    .reduce((acc, m) => acc + (m.status === 'Entrée' ? m.quantity : -m.quantity), 0);
  const totalEntrer = movementHistory
    .filter(m => m.status === 'Entrée' && m.is_transfer !== '1')
    .reduce((acc, m) => acc + m.quantity, 0);
  const totalSortie = movementHistory
    .filter(m => m.status === 'Sortie' && m.is_transfer !== '1')
    .reduce((acc, m) => acc + m.quantity, 0);

  // Get available date range from movement history
  const getAvailableDateRange = () => {
    if (movementHistory.length === 0) return { minDate: '', maxDate: '' };

    console.log('=== DEBUG: getAvailableDateRange (ProduitFinisDetail) ===');
    console.log('Total movements:', movementHistory.length);
    console.log('First 3 movements:', movementHistory.slice(0, 3));

    const dates = movementHistory
      .map((entry, index) => {
        // Use the movement date (not fabrication/expiration dates)
        // Prioritize 'date' field over 'created_at' for movement date
        let dateStr = entry.date || entry.created_at;
        if (!dateStr) {
          console.log(`Entry ${index}: No date found`, entry);
          return null;
        }

        console.log(`Entry ${index}: Raw date = "${dateStr}"`);

        // If it's already in YYYY-MM-DD format, use it directly
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
          console.log(`Entry ${index}: Using date directly: ${dateStr}`);
          return dateStr;
        }

        // Handle datetime format with timezone correction
        if (dateStr.includes('T')) {
          // Check if this looks like a UTC datetime that was converted from a local date
          if (dateStr.includes('Z') && dateStr.includes('T23:00:00')) {
            // This is likely a date that was converted to UTC, add 1 day back
            const date = new Date(dateStr);
            date.setDate(date.getDate() + 1);
            const correctedDate = date.toISOString().split('T')[0];
            console.log(`Entry ${index}: Timezone corrected: ${dateStr} -> ${correctedDate}`);
            return correctedDate;
          } else {
            const extractedDate = dateStr.split('T')[0];
            console.log(`Entry ${index}: Extracted from datetime: ${dateStr} -> ${extractedDate}`);
            return extractedDate;
          }
        }

        // Try to parse other formats
        try {
          // Try parsing as-is first
          let date = new Date(dateStr);

          // If that doesn't work, try with T00:00:00
          if (isNaN(date.getTime())) {
            date = new Date(dateStr + 'T00:00:00');
          }

          if (isNaN(date.getTime())) {
            console.warn(`Entry ${index}: Invalid date: ${dateStr}`);
            return null;
          }

          // Format manually to avoid timezone conversion
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          const formattedDate = `${year}-${month}-${day}`;

          console.log(`Entry ${index}: Converted: ${dateStr} -> ${formattedDate}`);
          return formattedDate;
        } catch (error) {
          console.warn(`Entry ${index}: Error parsing date: ${dateStr}`, error);
          return null;
        }
      })
      .filter(Boolean)
      .sort();

    console.log('All extracted dates:', dates);
    console.log('Date range:', { min: dates[0], max: dates[dates.length - 1] });

    return {
      minDate: dates[0] || '',
      maxDate: dates[dates.length - 1] || ''
    };
  };

  // Get the available date range
  const { minDate, maxDate } = getAvailableDateRange();

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

    // Date range filter with timezone correction
    let entryDate = entry.date || entry.created_at || '';
    if (entryDate.includes('T')) {
      // Check if this looks like a UTC datetime that was converted from a local date
      if (entryDate.includes('Z') && entryDate.includes('T23:00:00')) {
        // This is likely a date that was converted to UTC, add 1 day back
        const date = new Date(entryDate);
        date.setDate(date.getDate() + 1);
        entryDate = date.toISOString().split('T')[0];
      } else {
        entryDate = entryDate.split('T')[0]; // Extract YYYY-MM-DD from datetime
      }
    }

    // If it's not in YYYY-MM-DD format, convert it carefully
    if (!/^\d{4}-\d{2}-\d{2}$/.test(entryDate)) {
      try {
        const date = new Date(entryDate + 'T00:00:00'); // Add time to avoid timezone conversion
        if (!isNaN(date.getTime())) {
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          entryDate = `${year}-${month}-${day}`;
        }
      } catch (error) {
        console.warn('Error parsing date for main filter:', entryDate);
      }
    }

    const dateMatch = (!filters.dateFrom || entryDate >= filters.dateFrom) &&
                     (!filters.dateTo || entryDate <= filters.dateTo);

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
      ["Stock Actuel", product?.stock ?? 0],
      ["Total Entrées", product?.total_entrer ?? product?.totalEntrer ?? 0],
      ["Total Sorties", product?.total_sortie ?? product?.totalSortie ?? 0],
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

  // Handlers for edit and delete operations
  const handleEditMovement = (movement: any) => {
    setMovementToEdit(movement);
    setEditMovementOpen(true);
  };

  const handleDeleteMovement = async (movement: any) => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/movements/${movement.id}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        toast.success('Mouvement supprimé avec succès');
        fetchProductAndHistory();
        fetchLocationsAndFloors();
      } else {
        const errorData = await response.json().catch(() => ({}));
        toast.error(errorData.error || 'Erreur lors de la suppression du mouvement');
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Erreur lors de la suppression du mouvement');
    } finally {
      setIsDeleting(false);
      setDeleteConfirmOpen(false);
      setMovementToDelete(null);
    }
  };

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

  // Filter for export (date range only)
  const exportFilteredHistory = movementHistory.filter(entry => {
    // Get the date in YYYY-MM-DD format without timezone conversion
    let entryDate = entry.date || entry.created_at || '';

    if (entryDate.includes('T')) {
      // Check if this looks like a UTC datetime that was converted from a local date
      if (entryDate.includes('Z') && entryDate.includes('T23:00:00')) {
        // This is likely a date that was converted to UTC, add 1 day back
        const date = new Date(entryDate);
        date.setDate(date.getDate() + 1);
        entryDate = date.toISOString().split('T')[0];
      } else {
        entryDate = entryDate.split('T')[0]; // Extract YYYY-MM-DD from datetime
      }
    }

    // If it's not in YYYY-MM-DD format, convert it carefully
    if (!/^\d{4}-\d{2}-\d{2}$/.test(entryDate)) {
      try {
        const date = new Date(entryDate + 'T00:00:00'); // Add time to avoid timezone conversion
        if (!isNaN(date.getTime())) {
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          entryDate = `${year}-${month}-${day}`;
        }
      } catch (error) {
        console.warn('Error parsing date for export filter:', entryDate);
        return false;
      }
    }

    const dateFromMatch = !exportDateFrom || entryDate >= exportDateFrom;
    const dateToMatch = !exportDateTo || entryDate <= exportDateTo;

    return dateFromMatch && dateToMatch;
  });



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
                    // Initialize with available date range if no filters are set
                    if (!exportDateFrom && !exportDateTo) {
                      setExportDateFrom(minDate);
                      setExportDateTo(maxDate);
                    }
                    setExportDialogOpen(true);
                  }}
                >
                  Exporter le rapport
                </Button>
                <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Exporter le rapport Excel</DialogTitle>
                    </DialogHeader>

                    {/* Date Range Information */}
                    {minDate && maxDate && (
                      <div className="bg-muted/50 p-3 rounded-lg">
                        <p className="text-sm text-muted-foreground">
                          <strong>Plage disponible:</strong> {minDate} à {maxDate}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Total des mouvements: {movementHistory.length} | Mouvements filtrés: {exportFilteredHistory.length}
                        </p>
                        {/* Debug info */}
                        <p className="text-xs text-muted-foreground mt-1 opacity-70">
                          Debug: exportDateFrom={exportDateFrom}, exportDateTo={exportDateTo}
                        </p>
                      </div>
                    )}

                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium">Date de début</label>
                          <Input
                            type="date"
                            value={exportDateFrom}
                            min={minDate}
                            max={maxDate}
                            onChange={e => setExportDateFrom(e.target.value)}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Date de fin</label>
                          <Input
                            type="date"
                            value={exportDateTo}
                            min={minDate}
                            max={maxDate}
                            onChange={e => setExportDateTo(e.target.value)}
                            className="mt-1"
                          />
                        </div>
                      </div>

                      {/* Validation Messages */}
                      {exportDateFrom && exportDateTo && exportDateFrom > exportDateTo && (
                        <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                          La date de début doit être antérieure à la date de fin.
                        </div>
                      )}

                      {exportDateFrom && minDate && exportDateFrom < minDate && (
                        <div className="text-sm text-orange-600 bg-orange-50 p-2 rounded">
                          Aucune donnée disponible avant le {minDate}.
                        </div>
                      )}

                      {exportDateTo && maxDate && exportDateTo > maxDate && (
                        <div className="text-sm text-orange-600 bg-orange-50 p-2 rounded">
                          Aucune donnée disponible après le {maxDate}.
                        </div>
                      )}
                    </div>

                    <DialogFooter className="gap-2">
                      <Button
                        variant="outline"
                        onClick={() => setExportDialogOpen(false)}
                      >
                        Annuler
                      </Button>
                      <Button
                        onClick={() => {
                          if (exportFilteredHistory.length === 0) {
                            toast.error('Aucune donnée à exporter pour la période sélectionnée.');
                            return;
                          }
                          exportToExcelWithSummary(exportFilteredHistory, `rapport-produit-fini-${product?.reference || ''}.xlsx`);
                          setExportDialogOpen(false);
                          toast.success(`Rapport exporté avec ${exportFilteredHistory.length} mouvements.`);
                        }}
                        disabled={exportFilteredHistory.length === 0 || (exportDateFrom && exportDateTo && exportDateFrom > exportDateTo)}
                      >
                        Exporter ({exportFilteredHistory.length} mouvements)
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
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
        <Card>
          <div className="p-4">
            <p className="text-sm font-medium text-muted-foreground">Seuil d'Alerte</p>
            <p className="text-2xl font-bold">{product?.alerte ?? 0}</p>
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
                <TableHead>Étage/Place</TableHead>
                <TableHead>Qualité</TableHead>
                <TableHead>Fab</TableHead>
                <TableHead>Exp</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tableLoading ? (
                <TableLoadingRow colSpan={10} text="Chargement de l'historique..." />
              ) : filteredHistory.length === 0 ? (
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
                    <TableCell className="whitespace-nowrap">
                      {entry.quality_status ? (
                        <Badge
                          variant={entry.quality_status === 'conforme' ? 'default' : entry.quality_status === 'non-conforme' ? 'destructive' : 'secondary'}
                          className={entry.quality_status === 'conforme' ? 'bg-green-600 hover:bg-green-700' : ''}
                        >
                          {entry.quality_status === 'conforme' ? 'Conforme' :
                           entry.quality_status === 'non-conforme' ? 'Non-conforme' :
                           entry.quality_status}
                        </Badge>
                      ) : '-'}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{entry.fabrication_date ? formatDate(entry.fabrication_date) : '-'}</TableCell>
                    <TableCell className="whitespace-nowrap">{entry.expiration_date ? formatDate(entry.expiration_date) : '-'}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem 
                            className="gap-2" 
                            onClick={() => {
                              setSelectedMovement(entry);
                              setMovementDetailsOpen(true);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                            Voir les détails
                          </DropdownMenuItem>
                          {entry.has_recipe && (
                            <DropdownMenuItem 
                              className="gap-2" 
                              onClick={async () => {
                                try {
                                  const response = await fetch(`/api/recipes/by-movement/${entry.id}`);
                                  if (response.ok) {
                                    const recipe = await response.json();
                                    setSelectedRecipe(recipe);
                                    setRecipeDetailsOpen(true);
                                  } else {
                                    toast.error('Aucune recette trouvée pour ce mouvement');
                                  }
                                } catch (error) {
                                  toast.error('Erreur lors du chargement de la recette');
                                }
                              }}
                            >
                              <FileText className="h-4 w-4" />
                              Voir la recette
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          {!entry.quality_status && (
                            <DropdownMenuItem 
                              className="gap-2" 
                              onClick={() => handleEditMovement(entry)}
                            >
                              <Edit className="h-4 w-4" />
                              Modifier
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem 
                            className="gap-2 text-red-600" 
                            onClick={() => {
                              setMovementToDelete(entry);
                              setDeleteConfirmOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                            Supprimer
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
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
          fetchProductAndHistory(); // <-- Refetch data after successful operation
        }}
        product={product}
        locations={locations}
        floorData={floorData}
        movementHistory={movementHistory}
      />

      {/* Movement Details Dialog */}
      <MovementDetailsDialog
        open={movementDetailsOpen}
        onOpenChange={setMovementDetailsOpen}
        movement={selectedMovement}
        product={product}
      />

      {/* Recipe Details Dialog */}
      <RecipeDetailsDialog
        open={recipeDetailsOpen}
        onOpenChange={setRecipeDetailsOpen}
        recipe={selectedRecipe}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmer la suppression</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>Êtes-vous sûr de vouloir supprimer ce mouvement ?</p>
            {movementToDelete && (
              <div className="mt-4 p-4 bg-muted rounded-lg">
                <p><strong>Date:</strong> {formatDate(movementToDelete.created_at || movementToDelete.date)}</p>
                <p><strong>Statut:</strong> {movementToDelete.status}</p>
                <p><strong>Quantité:</strong> {movementToDelete.quantity} {product?.unite}</p>
                <p><strong>Emplacement:</strong> {movementToDelete.location_name}</p>
              </div>
            )}
            <p className="text-sm text-muted-foreground mt-4">
              Cette action est irréversible.
            </p>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setDeleteConfirmOpen(false);
                setMovementToDelete(null);
              }}
              disabled={isDeleting}
            >
              Annuler
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => handleDeleteMovement(movementToDelete)}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Suppression...
                </>
              ) : (
                'Supprimer'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Movement Dialog */}
      <EditMovementDialog
        open={editMovementOpen}
        onOpenChange={setEditMovementOpen}
        movement={movementToEdit}
        product={product}
        locations={locations}
        floorData={floorData}
        onSuccess={() => {
          setEditMovementOpen(false);
          setMovementToEdit(null);
          fetchProductAndHistory();
          fetchLocationsAndFloors();
        }}
      />
    </Layout>
  );
};

export default ProduitFinisDetail; 