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

const ControlQuality = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch('/api/products')
      .then(res => res.json())
      .then(data => {
        setProducts(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Fetch all movements and filter for 'Entrée'
  const [movements, setMovements] = useState<any[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<any>(null);
  const [qualityDialogOpen, setQualityDialogOpen] = useState(false);
  const [confirmationDialogOpen, setConfirmationDialogOpen] = useState(false);
  const [pendingQualityStatus, setPendingQualityStatus] = useState<'conforme' | 'non-conforme' | null>(null);
  const [qualityFilter, setQualityFilter] = useState<'all' | 'pending' | 'conforme' | 'non-conforme'>('all');
  const [productFilter, setProductFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Zone selection for non-conforme items
  const [showZoneSelection, setShowZoneSelection] = useState(false);
  const [prisonLocations, setPrisonLocations] = useState<string[]>([]);
  const [prisonFloorData, setPrisonFloorData] = useState<Record<string, Array<{ id: number; name: string; availableCapacity: number; totalCapacity: number; type: 'etage' | 'part' }>>>({});
  const [selectedPrisonLocation, setSelectedPrisonLocation] = useState<string>('');
  const [selectedPrisonFloors, setSelectedPrisonFloors] = useState<Array<{ floorId: number, floorName: string, quantity: number, availableCapacity: number, type: 'etage' | 'part' }>>([]);
  const [locationIdMap, setLocationIdMap] = useState<Record<string, number>>({});
  const [isolationReason, setIsolationReason] = useState<string>('');

  // Missing state variables
  const [locations, setLocations] = useState<string[]>([]);
  const [floorData, setFloorData] = useState<Record<string, Array<{ id: number, name: string, availableCapacity: number, totalCapacity: number; type: 'etage' | 'part' }>>>({});

  const [qualityFile, setQualityFile] = useState<File | null>(null);
  const [filePreviewOpen, setFilePreviewOpen] = useState(false);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [filePreviewName, setFilePreviewName] = useState<string | null>(null);
  const [filePreviewType, setFilePreviewType] = useState<string | null>(null);
  const [filePreviewLoading, setFilePreviewLoading] = useState(false);

  useEffect(() => {
    fetch('/api/quality')
      .then(res => res.json())
      .then(data => {
        console.log('Fetched quality movements:', data);
        if (Array.isArray(data)) {
          setMovements(data);
        } else {
          setMovements([]);
        }
      })
      .catch(() => setMovements([]));
  }, []);

  // Fetch prison locations (where is_prison = 1) and location ID mapping
  useEffect(() => {
    fetch('/api/locations')
      .then(res => res.json())
      .then(locs => {
        // Set all locations for PrisonOperationZone
        setLocations(locs.map((l: any) => l.name));

        // Filter for prison locations (is_prison = 1)
        const prisonLocs = locs.filter((l: any) => l.is_prison === 1 || l.is_prison === '1' || l.is_prison === true);
        setPrisonLocations(prisonLocs.map((l: any) => l.name));

        // Build location ID mapping
        const idMap: Record<string, number> = {};
        locs.forEach((loc: any) => {
          idMap[loc.name] = loc.id;
        });
        setLocationIdMap(idMap);

        // Build prison floor data and general floor data
        const prisonData: { [key: string]: Array<{ id: number, name: string, availableCapacity: number, totalCapacity: number, type: 'etage' | 'part' }> } = {};
        const generalData: { [key: string]: Array<{ id: number, name: string, availableCapacity: number, totalCapacity: number, type: 'etage' | 'part' }> } = {};

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

          generalData[l.name] = items;
          if (l.is_prison === 1 || l.is_prison === '1' || l.is_prison === true) {
            prisonData[l.name] = items;
          }
        });

        setPrisonFloorData(prisonData);
        setFloorData(generalData);
      })
      .catch(() => {
        setPrisonLocations([]);
        setPrisonFloorData({});
        setLocationIdMap({});
        setLocations([]);
        setFloorData({});
      });
  }, []);

  // Filter products with at least one 'Entrée' movement
  const productsWithEntree = products.filter(product =>
    movements.some(mov => mov.product_id === product.id && mov.status === 'Entrée')
  );

  // Only show 'Entrée' movements, exclude items with quality_status but no updated_at, and exclude 'ready' type products
  const allMovementHistory = movements.filter(mov =>
    mov.status === 'Entrée' &&
    (!mov.quality_status || mov.updated_at) &&
    mov.product_type !== 'ready'
  );

  // Get unique products for filter dropdown using reference as unique key
  const uniqueProducts = Array.from(
    allMovementHistory.reduce((map, entry) => {
      const reference = entry.product_reference || entry.reference;
      if (reference && entry.product_name && !map.has(reference)) {
        map.set(reference, {
          reference,
          name: entry.product_name,
          id: entry.product_id
        });
      }
      return map;
    }, new Map())
  ).map(([_, product]) => product).sort((a, b) => (a.name || '').localeCompare(b.name || ''));

  // Apply all filters (quality, product, search)
  const movementHistory = allMovementHistory.filter(entry => {
    // Quality filter
    const qualityMatch = (() => {
      switch (qualityFilter) {
        case 'pending':
          return !entry.quality_status;
        case 'conforme':
          return entry.quality_status === 'conforme';
        case 'non-conforme':
          return entry.quality_status === 'non-conforme';
        case 'all':
        default:
          return true;
      }
    })();

    // Product filter - match by reference
    const productMatch = productFilter === 'all' || (entry.product_reference || entry.reference) === productFilter;

    // Search filter (searches in product name, reference, location)
    const searchMatch = !searchTerm ||
      (entry.product_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (entry.product_reference || entry.reference || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (entry.location_name || '').toLowerCase().includes(searchTerm.toLowerCase());

    return qualityMatch && productMatch && searchMatch;
  });

  console.log('Filtered Entrée movements:', movementHistory);

  // Card counts based on all movements (not filtered)
  const pendingCount = allMovementHistory.filter(entry => !entry.quality_status).length;
  const conformeCount = allMovementHistory.filter(entry => entry.quality_status === 'conforme').length;
  const nonConformCount = allMovementHistory.filter(entry => entry.quality_status === 'non-conforme').length;

  // Helper to export to Excel (with summary rows)
  function exportToExcelWithSummary(data: any[], filename: string) {
    if (!data.length) return;
    // Get product info from the first entry if available
    const firstEntry = data[0];
    const productInfo = {
      nom: firstEntry?.product_name || "",
      reference: firstEntry?.product_reference || firstEntry?.reference || "",
      unite: firstEntry?.product_unit || "",
      stock: firstEntry?.current_stock || "",
      total_entrer: "",
      total_sortie: "",
      alerte: ""
    };

    // Prepare summary rows
    const summaryRows = [
      ["Nom", productInfo.nom],
      ["Référence", productInfo.reference],
      ["Unité", productInfo.unite],
      ["Stock Actuel", productInfo.stock],
      ["Total Entrées", productInfo.total_entrer],
      ["Total Sorties", productInfo.total_sortie],
      ["Seuil d'Alerte", productInfo.alerte],
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

  const handleQualitySelection = (status: 'conforme' | 'non-conforme') => {
    console.log('Quality selection:', status);
    console.log('Prison locations:', prisonLocations);
    console.log('Prison floor data:', prisonFloorData);

    setPendingQualityStatus(status);
    setQualityDialogOpen(false);

    if (status === 'non-conforme') {
      // Show zone selection for non-conforme items
      console.log('Setting showZoneSelection to true');
      setShowZoneSelection(true);
      // Reset zone selection state
      setSelectedPrisonLocation('');
      setSelectedPrisonFloors([]);
      setIsolationReason('');
    } else {
      // For conforme items, go directly to confirmation
      setConfirmationDialogOpen(true);
    }
  };

  // Helper functions for prison zone selection
  const getAvailablePrisonFloors = (location: string) => {
    return prisonFloorData[location] || [];
  };

  const getTotalAvailablePrisonCapacity = (location: string) => {
    const floors = getAvailablePrisonFloors(location);
    return floors.reduce((sum, floor) => sum + floor.availableCapacity, 0);
  };

  const handlePrisonLocationChange = (location: string) => {
    setSelectedPrisonLocation(location);
    const availableFloors = getAvailablePrisonFloors(location);
    setSelectedPrisonFloors(availableFloors.map(floor => ({
      floorId: floor.id,
      floorName: floor.name,
      quantity: 0,
      availableCapacity: floor.availableCapacity,
      type: floor.type,
    })));
  };

  const handlePrisonFloorSelection = (floorId: number, floorName: string, availableCapacity: number, type: 'etage' | 'part') => {
    const existingFloor = selectedPrisonFloors.find(f => f.floorId === floorId);
    if (existingFloor) {
      setSelectedPrisonFloors(prev => prev.filter(f => f.floorId !== floorId));
    } else {
      setSelectedPrisonFloors(prev => [...prev, { floorId, floorName, quantity: 0, availableCapacity, type }]);
    }
  };

  const handlePrisonFloorQuantityChange = (floorId: number, quantity: number) => {
    setSelectedPrisonFloors(prev =>
      prev.map(floor =>
        floor.floorId === floorId
          ? { ...floor, quantity: Math.min(quantity, floor.availableCapacity) }
          : floor
      )
    );
  };

  const totalSelectedPrisonQuantity = selectedPrisonFloors.reduce((sum, floor) => sum + floor.quantity, 0);

  // Auto-distribute function for prison zones
  const handlePrisonAutoDistribute = () => {
    if (!selectedEntry?.quantity || !selectedPrisonLocation) return;

    const totalQuantity = selectedEntry.quantity;
    const availableFloors = getAvailablePrisonFloors(selectedPrisonLocation);

    // Sort floors by available capacity (descending) to fill larger floors first
    const sortedFloors = [...availableFloors].sort((a, b) => b.availableCapacity - a.availableCapacity);

    let remainingQuantity = totalQuantity;
    const distributedFloors = sortedFloors.map(floor => {
      if (remainingQuantity <= 0) {
        return {
          floorId: floor.id,
          floorName: floor.name,
          quantity: 0,
          availableCapacity: floor.availableCapacity,
          type: floor.type,
        };
      }

      const allocatedQuantity = Math.min(remainingQuantity, floor.availableCapacity);
      remainingQuantity -= allocatedQuantity;

      return {
        floorId: floor.id,
        floorName: floor.name,
        quantity: allocatedQuantity,
        availableCapacity: floor.availableCapacity,
        type: floor.type,
      };
    });

    // Only keep floors with quantity > 0
    const floorsWithQuantity = distributedFloors.filter(floor => floor.quantity > 0);
    setSelectedPrisonFloors(floorsWithQuantity);

    // Show warning if not all quantity could be distributed
    if (remainingQuantity > 0) {
      toast.warning(`Capacité insuffisante: ${remainingQuantity} unités n'ont pas pu être distribuées`);
    } else {
      toast.success('Quantité distribuée automatiquement');
    }
  };

  const handleZoneSelectionConfirm = () => {
    setShowZoneSelection(false);
    setConfirmationDialogOpen(true);
  };

  // Remove this line from anywhere else in the component:
  // const [qualityFile, setQualityFile] = useState<File | null>(null);

  const handleQualityUpdate = async () => {
    if (!selectedEntry || !pendingQualityStatus) return;

    try {
      let updatePayload: any = { quality_status: pendingQualityStatus };

      // If non-conforme and prison location/floors selected, create transfer movements
      if (pendingQualityStatus === 'non-conforme' && selectedPrisonLocation && selectedPrisonFloors.length > 0) {
        const allMovements = [];

        // 1. Create SORTIE movements from the ORIGINAL location (where product currently is)
        const sortiePayloads = selectedPrisonFloors
          .filter(floor => floor.quantity > 0)
          .map(floor => ({
            product_type: selectedEntry.product_type || 'matiere',
            product_id: selectedEntry.product_id,
            status: 'Sortie',
            quantity: floor.quantity,
            location_id: selectedEntry.location_id, // Original location ID
            fabricationDate: selectedEntry.fabrication_date || selectedEntry.date,
            expirationDate: selectedEntry.expiration_date || selectedEntry.fabrication_date || selectedEntry.date,
            date: new Date().toISOString().slice(0, 10), // Current date for transfer
            etage_id: selectedEntry.etage_id || null, // Original etage
            part_id: selectedEntry.part_id || null, // Original part
            batch_number: selectedEntry.batch_number || selectedEntry.lot,
            is_transfer: 1, // Mark as transfer
            internal_transfer: 1, // Mark as internal transfer
            quality_transfer: 1, // Mark as quality-related transfer
            quality_status: 'non-conforme', // Add quality status to movement
            isolation_reason: isolationReason.trim(), // Add isolation reason
          }));

        // 2. Create ENTRÉE movements to the NEW prison location
        const entreePayloads = selectedPrisonFloors
          .filter(floor => floor.quantity > 0)
          .map(floor => ({
            product_type: selectedEntry.product_type || 'matiere',
            product_id: selectedEntry.product_id,
            status: 'Entrée',
            quantity: floor.quantity,
            location_id: locationIdMap[selectedPrisonLocation], // New prison location ID
            fabricationDate: selectedEntry.fabrication_date || selectedEntry.date,
            expirationDate: selectedEntry.expiration_date || selectedEntry.fabrication_date || selectedEntry.date,
            date: new Date().toISOString().slice(0, 10), // Current date for transfer
            etage_id: floor.type === 'etage' ? floor.floorId : null, // New etage
            part_id: floor.type === 'part' ? floor.floorId : null, // New part
            batch_number: selectedEntry.batch_number || selectedEntry.lot,
            is_transfer: 1, // Mark as transfer
            internal_transfer: 1, // Mark as internal transfer
            quality_transfer: 1, // Mark as quality-related transfer
            quality_status: 'non-conforme', // Add quality status to movement
            isolation_reason: isolationReason.trim(), // Add isolation reason
          }));

        // Combine all movements
        allMovements.push(...sortiePayloads, ...entreePayloads);

        // Create all transfer movements
        for (const payload of allMovements) {
          await fetch('/api/movements', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
          });
        }
      }

      // If file is present, use FormData for PATCH
      let response;
      if (qualityFile) {
        const formData = new FormData();
        formData.append('quality_status', pendingQualityStatus);
        formData.append('file', qualityFile);
        response = await fetch(`/api/quality/${selectedEntry.id}`, {
          method: 'PATCH', // <-- use PATCH here
          body: formData,
        });
      } else {
        response = await fetch(`/api/quality/${selectedEntry.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updatePayload),
        });
      }

      if (!response.ok) throw new Error('Failed to update quality status');
      const responseData = await response.json();

      setMovements(movements.map(mov =>
        mov.id === selectedEntry.id ? {
          ...mov,
          quality_status: pendingQualityStatus,
          updated_at: responseData.updated_at
        } : mov
      ));

      // Show success message
      const message = pendingQualityStatus === 'non-conforme' && selectedPrisonLocation
        ? `Produit marqué comme non conforme et transféré vers ${selectedPrisonLocation}`
        : 'Statut de qualité mis à jour avec succès';
      toast.success(message);

      // Reset all states
      setConfirmationDialogOpen(false);
      setShowZoneSelection(false);
      setPendingQualityStatus(null);
      setSelectedEntry(null);
      setSelectedPrisonLocation('');
      setSelectedPrisonFloors([]);
      setIsolationReason('');
      setQualityFile(null);
    } catch (error) {
      toast.error('Erreur lors de la mise à jour du statut');
    }
  };

  // Helper to fetch and preview file from backend
  const handlePreviewFile = async (movementId: number, fileName?: string, fileType?: string) => {
    setFilePreviewOpen(true); // Open popup immediately
    setFilePreviewLoading(true); // Show loading spinner
    setFilePreviewUrl(null);
    setFilePreviewType(fileType || null);
    setFilePreviewName(fileName || 'certification_file');
    try {
      // Only fetch if fileType is present (means file exists)
      if (fileType) {
        const res = await fetch(`/api/quality/${movementId}/file`);
        if (!res.ok) throw new Error('Fichier non trouvé');
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        setFilePreviewUrl(url);
        setFilePreviewType(blob.type);
      } else {
        setFilePreviewUrl(null);
        setFilePreviewType(null);
      }
    } catch (err) {
      toast.error('Impossible de récupérer le fichier');
      setFilePreviewUrl(null);
      setFilePreviewType(null);
    } finally {
      setFilePreviewLoading(false);
    }
  };

  return (
    <Layout>
      <Dialog open={qualityDialogOpen} onOpenChange={setQualityDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Contrôle de qualité</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="mb-4">Veuillez indiquer le statut de qualité pour ce produit :</p>
            <p className="text-sm text-muted-foreground mb-2">
              Produit : {selectedEntry?.product_name}
              <br />
              Référence : {selectedEntry?.product_reference}
              <br />
              Quantité : {selectedEntry?.quantity}
              <br />
              Lot : {selectedEntry?.batch_number || selectedEntry?.lot || '-'}
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setQualityDialogOpen(false)}
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={() => handleQualitySelection('non-conforme')}
            >
              Non conforme
            </Button>
            <Button
              onClick={() => handleQualitySelection('conforme')}
            >
              Conforme
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showZoneSelection} onOpenChange={setShowZoneSelection}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Sélection de la zone de quarantaine</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="mb-4">
              Ce produit non conforme doit être transféré vers une zone de quarantaine.
              Veuillez sélectionner la destination :
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              Produit : {selectedEntry?.product_name}
              <br />
              Référence : {selectedEntry?.product_reference}
              <br />
              Quantité disponible : {selectedEntry?.quantity}
            </p>

            <div className="space-y-4">
              {/* Motif d'isolement input */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Motif d'isolement *
                </label>
                <Input
                  type="text"
                  placeholder="Saisissez le motif d'isolement..."
                  value={isolationReason}
                  onChange={(e) => setIsolationReason(e.target.value)}
                  className="w-full"
                />
                
              </div>

              <Select value={selectedPrisonLocation} onValueChange={handlePrisonLocationChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner une zone de quarantaine" />
                </SelectTrigger>
                <SelectContent>
                  {prisonLocations.length === 0 ? (
                    <SelectItem value="no-zones" disabled>
                      Aucune zone de quarantaine disponible
                    </SelectItem>
                  ) : (
                    prisonLocations.map(loc => (
                      <SelectItem key={loc} value={loc}>
                        {loc} ({getTotalAvailablePrisonCapacity(loc)} places disponibles)
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>

              {prisonLocations.length === 0 && (
                <div className="text-sm text-red-600 mt-2">
                  ⚠ Aucune zone de quarantaine configurée. Veuillez configurer des emplacements avec is_prison = 1.
                </div>
              )}

              {selectedPrisonLocation && (
                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium">Étages/Parties disponibles - {selectedPrisonLocation}</h4>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handlePrisonAutoDistribute}
                      disabled={!selectedEntry?.quantity || selectedEntry.quantity <= 0}
                    >
                      Distribuer automatiquement
                    </Button>
                  </div>
                  <div className="space-y-3">
                    {getAvailablePrisonFloors(selectedPrisonLocation).map((floor) => (
                      <div key={floor.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          <input
                            type="checkbox"
                            checked={selectedPrisonFloors.some(f => f.floorId === floor.id)}
                            onChange={() => handlePrisonFloorSelection(floor.id, floor.name, floor.availableCapacity, floor.type)}
                            className="rounded"
                          />
                          <div>
                            <p className="font-medium">{floor.name}</p>
                            <p className="text-sm text-muted-foreground">
                              Capacité disponible: {floor.availableCapacity} / {floor.totalCapacity}
                            </p>
                          </div>
                        </div>
                        {selectedPrisonFloors.some(f => f.floorId === floor.id) && (
                          <div className="flex items-center space-x-2">
                            <Input
                              type="number"
                              placeholder="Quantité"
                              min="0"
                              max={Math.min(floor.availableCapacity, selectedEntry?.quantity || 0)}
                              value={selectedPrisonFloors.find(f => f.floorId === floor.id)?.quantity || 0}
                              onChange={(e) => handlePrisonFloorQuantityChange(floor.id, parseInt(e.target.value) || 0)}
                              className="w-24"
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {selectedPrisonFloors.length > 0 && (
                    <div className={`mt-4 p-3 rounded-lg ${totalSelectedPrisonQuantity === (selectedEntry?.quantity || 0)
                        ? 'bg-green-50 border border-green-200'
                        : totalSelectedPrisonQuantity > (selectedEntry?.quantity || 0)
                          ? 'bg-red-50 border border-red-200'
                          : 'bg-yellow-50 border border-yellow-200'
                      }`}>
                      <p className={`text-sm font-medium ${totalSelectedPrisonQuantity === (selectedEntry?.quantity || 0)
                          ? 'text-green-800'
                          : totalSelectedPrisonQuantity > (selectedEntry?.quantity || 0)
                            ? 'text-red-800'
                            : 'text-yellow-800'
                        }`}>
                        {totalSelectedPrisonQuantity === (selectedEntry?.quantity || 0)
                          ? '✓ Quantité correcte'
                          : totalSelectedPrisonQuantity > (selectedEntry?.quantity || 0)
                            ? `⚠ Quantité excessive: ${totalSelectedPrisonQuantity - (selectedEntry?.quantity || 0)} de trop`
                            : `⚠ Quantité insuffisante: ${(selectedEntry?.quantity || 0) - totalSelectedPrisonQuantity} manquant`}
                      </p>
                      <p className="text-xs mt-1">
                        Sélectionné: {totalSelectedPrisonQuantity} / Disponible: {selectedEntry?.quantity || 0}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowZoneSelection(false);
                setPendingQualityStatus(null);
                setSelectedEntry(null);
                setSelectedPrisonLocation('');
                setSelectedPrisonFloors([]);
                setIsolationReason('');
              }}
            >
              Annuler
            </Button>
            <Button
              onClick={handleZoneSelectionConfirm}
              disabled={!isolationReason.trim() || !selectedPrisonLocation || selectedPrisonFloors.length === 0 || totalSelectedPrisonQuantity !== (selectedEntry?.quantity || 0)}
            >
              Continuer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmationDialogOpen} onOpenChange={setConfirmationDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmation</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="mb-4">
              Êtes-vous sûr de vouloir marquer ce produit comme{' '}
              <span className="font-semibold">
                {pendingQualityStatus === 'conforme' ? 'conforme' : 'non conforme'}
              </span> ?
            </p>
            <p className="text-sm text-muted-foreground mb-2">
              Produit : {selectedEntry?.product_name}
              <br />
              Référence : {selectedEntry?.product_reference}
              <br />
              Quantité : {selectedEntry?.quantity}
            </p>
            {pendingQualityStatus === 'non-conforme' && selectedPrisonLocation && (
              <p className="text-sm text-orange-600 mb-2">
                <br />
                Motif d'isolement : {isolationReason}
                <br />
                Destination : {selectedPrisonLocation}
                <br />
                Étages sélectionnés : {selectedPrisonFloors.filter(f => f.quantity > 0).map(f => `${f.floorName} (${f.quantity})`).join(', ')}
              </p>
            )}
            <p className="text-sm text-yellow-600 mt-4">
              Cette action ne peut pas être annulée une fois confirmée.
            </p>
            {/* Add input file here */}
            <div className="mt-4">
              <label className="block text-sm font-medium mb-2">
                Fichier justificatif (optionnel)
              </label>
              <Input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={e => setQualityFile(e.target.files?.[0] || null)}
              />
              {qualityFile && (
                <p className="text-xs mt-1 text-muted-foreground">
                  Fichier sélectionné: {qualityFile.name}
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setConfirmationDialogOpen(false);
                setPendingQualityStatus(null);
                setSelectedEntry(null);
                setSelectedPrisonLocation('');
                setSelectedPrisonFloors([]);
                setIsolationReason('');
              }}
            >
              Annuler
            </Button>
            <Button
              onClick={handleQualityUpdate}
              variant={pendingQualityStatus === 'non-conforme' ? 'destructive' : 'default'}
            >
              Confirmer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={filePreviewOpen} onOpenChange={setFilePreviewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Fichier de certification</DialogTitle>
          </DialogHeader>
          <div className="py-4 min-h-[120px] flex flex-col items-center justify-center">
            {filePreviewLoading ? (
              <div className="flex flex-col items-center justify-center">
                <div className="w-8 h-8 border-4 border-gray-400 border-t-transparent rounded-full animate-spin mb-2"></div>
                <span className="text-sm text-muted-foreground">Chargement du fichier...</span>
              </div>
            ) : filePreviewUrl ? (
              <>
                {filePreviewType?.startsWith('image/') ? (
                  <img src={filePreviewUrl} alt="Fichier de certification" style={{ maxWidth: '100%', maxHeight: '60vh' }} />
                ) : filePreviewType === 'application/pdf' ? (
                  <iframe src={filePreviewUrl} title="Fichier PDF" style={{ width: '100%', height: '60vh', border: 'none' }} />
                ) : (
                  <p className="text-muted-foreground">Type de fichier non supporté pour l'aperçu.<br />
                    <a href={filePreviewUrl} download={filePreviewName || 'certification_file'} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
                      Télécharger le fichier
                    </a>
                  </p>
                )}
                <div className="mt-4 flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => window.open(filePreviewUrl || '', '_blank')}
                  >
                    Voir en plein écran
                  </Button>
                </div>
              </>
            ) : (
              <p className="text-muted-foreground">Aucun fichier à afficher.</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFilePreviewOpen(false)}>Fermer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold mb-2">Contrôle de qualité</h1>
            <p className="text-muted-foreground">Liste des stocks à examiner (Entrées uniquement)</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => navigate('/prison-zone-history')}
            >
              Prison Zone History
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <Card>
            <div className="p-4">
              <p className="text-sm font-medium text-muted-foreground">En attente</p>
              <p className="text-2xl font-bold">{pendingCount}</p>
            </div>
          </Card>
          <Card>
            <div className="p-4">
              <p className="text-sm font-medium text-muted-foreground">Conforme</p>
              <p className="text-2xl font-bold">{conformeCount}</p>
            </div>
          </Card>
          <Card>
            <div className="p-4">
              <p className="text-sm font-medium text-muted-foreground">Non conforme</p>
              <p className="text-2xl font-bold">{nonConformCount}</p>
            </div>
          </Card>
        </div>

        <div className="mb-4 space-y-3">
          {/* Single Row with Search and Filters - Full Width */}
          <div className="flex items-center gap-4 w-full">
            {/* Search - Flexible width */}
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <Search className="h-4 w-4 flex-shrink-0" />
              <span className="text-sm font-medium whitespace-nowrap">Rechercher :</span>
              <div className="relative flex-1">
                <Input
                  type="text"
                  placeholder="Nom, référence, emplacement..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full"
                />
                {searchTerm && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSearchTerm('')}
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>

            {/* Separator */}
            <div className="h-6 w-px bg-border flex-shrink-0"></div>

            {/* Quality Status Filter - Fixed width */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <Filter className="h-4 w-4" />
              <span className="text-sm font-medium whitespace-nowrap">Statut :</span>
              <Select value={qualityFilter} onValueChange={(value: 'all' | 'pending' | 'conforme' | 'non-conforme') => setQualityFilter(value)}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous ({allMovementHistory.length})</SelectItem>
                  <SelectItem value="pending">En attente ({pendingCount})</SelectItem>
                  <SelectItem value="conforme">Conforme ({conformeCount})</SelectItem>
                  <SelectItem value="non-conforme">Non conforme ({nonConformCount})</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Product Filter - Flexible width */}
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className="text-sm font-medium whitespace-nowrap">Produit :</span>
              <Select value={productFilter} onValueChange={setProductFilter}>
                <SelectTrigger className="w-full min-w-[200px]">
                  <SelectValue placeholder="Sélectionner un produit" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les produits ({uniqueProducts.length})</SelectItem>
                  {uniqueProducts.map((product) => (
                    <SelectItem key={product.reference} value={product.reference}>
                      {product.name} ({product.reference})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Clear Filters - Fixed width */}
            {(qualityFilter !== 'all' || productFilter !== 'all' || searchTerm) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setQualityFilter('all');
                  setProductFilter('all');
                  setSearchTerm('');
                }}
                className="flex items-center gap-1 flex-shrink-0"
              >
                <X className="h-3 w-3" />
                Effacer
              </Button>
            )}
          </div>

          {/* Results Summary */}
          <div className="text-sm text-muted-foreground">
            Affichage de {movementHistory.length} résultat{movementHistory.length !== 1 ? 's' : ''} sur {allMovementHistory.length} total
          </div>
        </div>

        <Card>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Référence</TableHead>
                  <TableHead>Fab</TableHead>
                  <TableHead>Exp</TableHead>
                  <TableHead>Quantité</TableHead>
                  <TableHead>Emplacement</TableHead>
                  <TableHead>Etage/Part</TableHead>
                  <TableHead>Qualité</TableHead>
                  <TableHead>Date de vérification</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movementHistory.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8">
                      Aucun mouvement à examiner.
                    </TableCell>
                  </TableRow>
                ) : (
                  movementHistory.map((entry, idx) => (
                    <TableRow key={entry.id || idx}>
                      <TableCell className="whitespace-nowrap">{entry.product_name || '-'}</TableCell>
                      <TableCell className="whitespace-nowrap">{entry.product_reference || entry.reference || '-'}</TableCell>
                      <TableCell className="whitespace-nowrap">{(entry.fabrication_date || entry.date_de_fab || '-').slice(0, 10)}</TableCell>
                      <TableCell className="whitespace-nowrap">{(entry.expiration_date || entry.date_de_exp || '-').slice(0, 10)}</TableCell>
                      <TableCell className="whitespace-nowrap">{entry.quantity ?? entry.quantite ?? '-'}</TableCell>
                      <TableCell className="whitespace-nowrap">{entry.location_name || '-'}</TableCell>
                      <TableCell className="whitespace-nowrap">{entry.etage_name || entry.part_name || '-'}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        {entry.quality_status && entry.updated_at ? (
                          <div className="flex items-center gap-2">
                            <Badge variant={entry.quality_status === 'conforme' ? 'success' : 'destructive'}>
                              {entry.quality_status === 'conforme' ? 'Conforme' : 'Non conforme'}
                            </Badge>
                            {/* Only use certification_file_type, never certification_file */}
                            {entry.certification_file_type && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handlePreviewFile(entry.id, entry.product_reference || entry.reference, entry.certification_file_type)}
                              >
                                Voir fichier
                              </Button>
                            )}
                          </div>
                        ) : (
                          <Badge className="bg-yellow-400 text-black">En attente</Badge>
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {entry.updated_at ? (
                          <span className="text-sm text-muted-foreground">
                            {new Date(entry.updated_at).toISOString().split('T')[0]}
                          </span>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={!!entry.quality_status}
                          onClick={() => {
                            setSelectedEntry(entry);
                            setQualityDialogOpen(true);
                          }}
                        >
                          {entry.quality_status ? 'Vérifié' : 'Vérifier'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>


    </Layout>
  );
};

export default ControlQuality;