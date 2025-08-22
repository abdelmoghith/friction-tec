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
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import OperationTypeDialog from '@/components/product/OperationTypeDialog';
import ProductOperationDialog from '@/components/product/ProductOperationDialog';
import MovementDetailsDialog from '@/components/product/MovementDetailsDialog';
import RecipeDetailsDialog from '@/components/product/RecipeDetailsDialog';
import RecipesManagerDialog from '@/components/product/RecipesManagerDialog';
import EditMovementDialog from '@/components/product/EditMovementDialog';



const ProductHistory = () => {
  const { productId } = useParams();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: '',
    location: '',
    dateFrom: '',
    dateTo: '',
    fournisseur: '',
    atelier: '',
    batchNumber: '',
    qualityStatus: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportDateFrom, setExportDateFrom] = useState('');
  const [exportDateTo, setExportDateTo] = useState('');
  // Add state for operation dialog and form
  const [openOperation, setOpenOperation] = useState(false);
  const [operationType, setOperationType] = useState('');
  const [openForm, setOpenForm] = useState(false);

  const [locations, setLocations] = useState<string[]>([]);
  const [floorData, setFloorData] = useState<{ [key: string]: Array<{ id: number, name: string, availableCapacity: number, totalCapacity: number, type: 'etage' | 'part' }> }>({});
  const [movementHistory, setMovementHistory] = useState<any[]>([]);
  const [recipesManagerOpen, setRecipesManagerOpen] = useState(false);
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

  // Fetch product data from backend
  const fetchProduct = () => {
    if (!productId) return;
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
    if (!productId) return;
    setTableLoading(true);
    fetch(`/api/movements?product_id=${productId}`)
      .then(res => res.json())
      .then(data => {
        console.log('Raw movement data:', data);
        setMovementHistory(data);
      })
      .catch(() => setMovementHistory([]))
      .finally(() => setTableLoading(false));
  };
  useEffect(() => {
    fetchMovementHistory();
    // eslint-disable-next-line
  }, [productId]);

  // Fetch real locations and floor data
  useEffect(() => {
    fetch('/api/locations')
      .then(res => res.json())
      .then(locs => {
        setLocations(locs.map((l: any) => l.name));
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
    // Search term filter
    const searchMatch =
      (entry.status || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (entry.location_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (entry.fournisseur_name && entry.fournisseur_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (entry.atelier && entry.atelier.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (entry.batch_number && entry.batch_number.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (entry.lot && entry.lot.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (entry.quality_status && entry.quality_status.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (entry.date || '').includes(searchTerm);

    // Status filter
    const statusMatch = !filters.status || entry.status === filters.status;

    // Location filter
    const locationMatch = !filters.location || entry.location_name === filters.location;

    // Date range filter
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

    // Batch number filter
    const batchMatch = !filters.batchNumber ||
      (entry.batch_number && entry.batch_number.toLowerCase().includes(filters.batchNumber.toLowerCase())) ||
      (entry.lot && entry.lot.toLowerCase().includes(filters.batchNumber.toLowerCase()));

    // Quality status filter
    const qualityMatch = !filters.qualityStatus || entry.quality_status === filters.qualityStatus;

    return searchMatch && statusMatch && locationMatch && dateMatch && fournisseurMatch && atelierMatch && batchMatch && qualityMatch;
  });

  // Helper to export to Excel (with summary rows)
  function exportToExcelWithSummary(data: any[], filename: string) {
    if (!data.length) {
      toast.error('Aucune donnée à exporter');
      return;
    }

    // Prepare export data with proper formatting
    const exportData = data.map(entry => ({
      'Date': formatDate(entry.created_at || entry.date),
      'Heure': formatTime(entry.time),
      'Statut': entry.status,
      'Quantité': entry.quantity,
      'Unité': product?.unite || '',
      'Emplacement': entry.location_name || '',
      'Étage/Place': entry.etage_name || entry.part_name || '',
      'Numéro de Lot': entry.batch_number || entry.lot || '',
      'Fournisseur': entry.fournisseur_name || '',
      'Atelier': entry.atelier || '',
      'Statut Qualité': entry.quality_status || '',
      'Date de Fabrication': entry.fabrication_date ? formatDate(entry.fabrication_date) : '',
      'Date d\'Expiration': entry.expiration_date ? formatDate(entry.expiration_date) : ''
    }));

    // Prepare summary rows
    const summaryRows = [
      ["RAPPORT D'HISTORIQUE DES MOUVEMENTS"],
      [],
      ["Informations Produit"],
      ["Nom", product?.nom ?? ""],
      ["Référence", product?.reference ?? ""],
      ["Unité", product?.unite ?? ""],
      ["Stock Actuel", product?.stock ?? ""],
      ["Total Entrées", product?.total_entrer ?? ""],
      ["Total Sorties", product?.total_sortie ?? ""],
      ["Seuil d'Alerte", product?.alerte ?? ""],
      [],
      ["Informations Export"],
      ["Date d'export", new Date().toLocaleDateString('fr-FR')],
      ["Période", exportDateFrom && exportDateTo ? `${exportDateFrom} à ${exportDateTo}` : 'Toute la période'],
      ["Nombre de mouvements", data.length],
      [],
      ["DÉTAIL DES MOUVEMENTS"],
      []
    ];

    // Convert exportData to worksheet
    const wsTable = XLSX.utils.json_to_sheet(exportData);
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

  // Get available date range from movement history
  const getAvailableDateRange = () => {
    if (movementHistory.length === 0) return { minDate: '', maxDate: '' };

    console.log('=== DEBUG: getAvailableDateRange ===');
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

  const { minDate, maxDate } = getAvailableDateRange();

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
        fetchMovementHistory();
        fetchProduct();
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
              onClick={() => navigate('/products')}
            >
              <ArrowLeft size={16} className="mr-2" />
              Retour aux Matières
            </Button>
            <h1 className="text-2xl sm:text-3xl font-bold mb-1">Historique - {product?.nom}</h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Référence: {product?.reference} | Stock actuel: {product?.stock} {product?.unite}
            </p>
          </div>
          <div className="flex gap-2">
            <OperationTypeDialog
              open={openOperation}
              onOpenChange={setOpenOperation}
              onSelect={(type) => {
                setOperationType(type);
                setOpenOperation(false);
                setOpenForm(true);
              }}
              trigger={
                <Button variant="default" size="sm">
                  Nouvel opération
                </Button>
              }
            />
            <ProductOperationDialog
              open={openForm}
              onOpenChange={(open) => {
                setOpenForm(open);
                if (!open) setOperationType('');
              }}
              operationType={operationType as 'Entrée' | 'Sortie' | 'Nouveau Produit' | 'Complément Stock' | ''}
              onSuccess={() => {
                setOperationType('');
                setOpenForm(false);
                fetchMovementHistory(); // Refresh data after operation
                fetchProduct(); // Refresh product summary cards after operation
              }}
              product={product}
              locations={locations}
              floorData={floorData}
              movementHistory={movementHistory} // <-- pass movementHistory here
              onDataChanged={() => {
                fetchMovementHistory();
                fetchProduct();
              }} // <-- pass fetch functions
            />
            {/* Exporter le rapport button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                // Initialize with current filter dates or available range
                setExportDateFrom(filters.dateFrom || minDate);
                setExportDateTo(filters.dateTo || maxDate);
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
          <div className="space-y-4 py-4">
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

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Date de début</label>
                <Input
                  type="date"
                  value={exportDateFrom}
                  min={minDate}
                  max={maxDate}
                  onChange={e => setExportDateFrom(e.target.value)}
                  placeholder="Sélectionner la date de début"
                />
                {exportDateFrom && (exportDateFrom < minDate || exportDateFrom > maxDate) && (
                  <p className="text-xs text-destructive mt-1">
                    Date hors de la plage disponible
                  </p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium">Date de fin</label>
                <Input
                  type="date"
                  value={exportDateTo}
                  min={minDate}
                  max={maxDate}
                  onChange={e => setExportDateTo(e.target.value)}
                  placeholder="Sélectionner la date de fin"
                />
                {exportDateTo && (exportDateTo < minDate || exportDateTo > maxDate) && (
                  <p className="text-xs text-destructive mt-1">
                    Date hors de la plage disponible
                  </p>
                )}
              </div>
            </div>



            {/* Validation Messages */}
            {exportDateFrom && exportDateTo && exportDateFrom > exportDateTo && (
              <div className="bg-destructive/10 border border-destructive/20 p-3 rounded-lg">
                <p className="text-sm text-destructive">
                  La date de début doit être antérieure à la date de fin
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setExportDialogOpen(false)}
            >
              Annuler
            </Button>
            <Button
              onClick={() => {
                if (exportDateFrom && exportDateTo && exportDateFrom > exportDateTo) {
                  toast.error('La date de début doit être antérieure à la date de fin');
                  return;
                }
                if (exportFilteredHistory.length === 0) {
                  toast.error('Aucun mouvement trouvé pour la période sélectionnée');
                  return;
                }
                exportToExcelWithSummary(exportFilteredHistory, `rapport-matiere-${product?.reference || ''}.xlsx`);
                setExportDialogOpen(false);
                toast.success(`Rapport exporté avec ${exportFilteredHistory.length} mouvements`);
              }}
              disabled={exportDateFrom && exportDateTo && exportDateFrom > exportDateTo}
            >
              Exporter ({exportFilteredHistory.length} mouvements)
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

      {/* Product Summary Cards */}
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
                      atelier: '',
                      batchNumber: '',
                      qualityStatus: ''
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

                  <div>
                    <label className="text-sm font-medium">Numéro de lot</label>
                    <Input
                      type="text"
                      placeholder="Rechercher par lot..."
                      value={filters.batchNumber}
                      onChange={(e) => setFilters(prev => ({ ...prev, batchNumber: e.target.value }))}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium">Statut qualité</label>
                    <Select value={filters.qualityStatus || "all"} onValueChange={(value) => setFilters(prev => ({ ...prev, qualityStatus: value === "all" ? "" : value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Tous les statuts" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tous les statuts</SelectItem>
                        <SelectItem value="conforme">Conforme</SelectItem>
                        <SelectItem value="non-conforme">Non-conforme</SelectItem>
                        <SelectItem value="en-attente">En attente</SelectItem>
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
                    <TableCell className="whitespace-nowrap">{entry.fabrication_date ? formatDate(new Date(new Date(entry.fabrication_date).getTime() + 24 * 60 * 60 * 1000).toISOString()) : '-'}</TableCell>
                    <TableCell className="whitespace-nowrap">{entry.expiration_date ? formatDate(new Date(new Date(entry.expiration_date).getTime() + 24 * 60 * 60 * 1000).toISOString()) : '-'}</TableCell>
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
                          {entry.quality_status !== 'conforme' && (
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

      {/* Recipes Manager Dialog */}
      <RecipesManagerDialog
        open={recipesManagerOpen}
        onOpenChange={setRecipesManagerOpen}
        productId={productId || ''}
        onDataChanged={() => {
          fetchMovementHistory();
          fetchProduct();
        }}
      />

      {/* Movement Details Dialog */}
      <MovementDetailsDialog
        open={movementDetailsOpen}
        onOpenChange={setMovementDetailsOpen}
        movement={selectedMovement}
        product={product ? {
          id: product.id?.toString(),
          name: product.nom || product.designation,
          unite: product.unite,
          reference: product.reference
        } : null}
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
        onOpenChange={(open) => {
          setEditMovementOpen(open);
          if (!open) setMovementToEdit(null);
        }}
        movement={movementToEdit}
        product={product}
        locations={locations}
        floorData={floorData}
        onSuccess={() => {
          fetchMovementHistory();
          fetchProduct();
          // Refresh floor data to reflect stock changes
          fetch('/api/locations')
            .then(res => res.json())
            .then(locs => {
              setLocations(locs.map((l: any) => l.name));
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
              console.log('[DEBUG] Floor data refreshed after movement edit');
            })
            .catch(err => console.error('[DEBUG] Error refreshing floor data:', err));
          setEditMovementOpen(false);
          setMovementToEdit(null);
        }}
      />
    </Layout>
  );
};

export default ProductHistory; 