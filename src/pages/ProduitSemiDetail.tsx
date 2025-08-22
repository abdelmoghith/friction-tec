import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, ArrowLeft, Filter, X, Eye, FileText, MoreHorizontal, Edit, Trash2 } from 'lucide-react';
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
import SemiOperationTypeDialog from '@/components/product/SemiOperationTypeDialog';
import SemiOperationDialog from '@/components/product/SemiOperationDialog';
import MovementDetailsDialog from '@/components/product/MovementDetailsDialog';
import RecipeDetailsDialog from '@/components/product/RecipeDetailsDialog';
import EditMovementDialog from '@/components/product/EditMovementDialog';
import axios from 'axios';

// Helper to generate random mock data for product and history
function getRandomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const LOCATIONS = ['Entrepôt A', 'Entrepôt B', 'Zone 1', 'Zone 2', 'Zone 3'];
const STATUSES = ['Entrée', 'Sortie'];

// Mock floor data with capacity information
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

const ProduitSemiDetail = () => {
  const { id } = useParams();
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
    atelier: '',
    batchNumber: '',
    qualityStatus: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  const [openEntry, setOpenEntry] = useState(false);
  const [openExit, setOpenExit] = useState(false);
  const [entryForm, setEntryForm] = useState({ quantity: '', location: '' });
  const [exitForm, setExitForm] = useState({ quantity: '', location: '' });
  const [openOperation, setOpenOperation] = useState(false);
  const [operationType, setOperationType] = useState<'' | 'Entrée' | 'Sortie' | 'Complément Stock'>('');
  const [openForm, setOpenForm] = useState(false);
  const [operationForm, setOperationForm] = useState({ 
    fournisseur: '', 
    quantity: '', 
    location: '',
    floor: '',
    floorQuantity: ''
  });
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportDateFrom, setExportDateFrom] = useState('');
  const [exportDateTo, setExportDateTo] = useState('');
  const [showFloorSelection, setShowFloorSelection] = useState(false);
  const [selectedFloors, setSelectedFloors] = useState<Array<{floorId: number, floorName: string, quantity: number, availableCapacity: number}>>([]);
  const [selectedZones, setSelectedZones] = useState<Array<{zone: string, floors: Array<{floorId: number, floorName: string, quantity: number, availableCapacity: number}>}>>([]);
  const [currentZoneIndex, setCurrentZoneIndex] = useState(0);
  const [showZoneSelection, setShowZoneSelection] = useState(false);

  // Add state for sortie (exit) operation, mirroring the entry (entrée) state
  const [selectedExitFloors, setSelectedExitFloors] = useState<Array<{floorId: number, floorName: string, quantity: number, availableCapacity: number}>>([]);
  const [selectedExitZones, setSelectedExitZones] = useState<Array<{zone: string, floors: Array<{floorId: number, floorName: string, quantity: number, availableCapacity: number}>}>>([]);
  const [currentExitZoneIndex, setCurrentExitZoneIndex] = useState(0);
  const [showExitZoneSelection, setShowExitZoneSelection] = useState(false);

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

  // Add state for sortie source selection
  const [sourceZones, setSourceZones] = useState<Array<{zone: string, available: number}>>([
    { zone: 'Zone A', available: 20 },
    { zone: 'Zone B', available: 10 },
  ]); // This should be dynamic in real app
  const [selectedSourceZones, setSelectedSourceZones] = useState<string[]>([]);

  // For demo: mock detailed stock by zone and floor/part, now with 'lot' instead of 'date'
  const [detailedSourceStock, setDetailedSourceStock] = useState([
    {
      zone: 'Zone A',
      parts: [
        { name: 'Étage 1', available: 8, lot: 'LOT-001' },
        { name: 'Étage 2', available: 12, lot: 'LOT-002' },
      ],
    },
    {
      zone: 'Zone B',
      parts: [
        { name: 'Étage 1', available: 10, lot: 'LOT-003' },
      ],
    },
  ]);

  // FIFO allocation logic
  function fifoAllocate(quantity: number, stock: typeof detailedSourceStock) {
    let remaining = quantity;
    const allocation: Array<{ zone: string; part: string; taken: number; available: number }> = [];
    // Flatten all parts with zone info, use order of appearance (FIFO)
    const allParts = stock.flatMap(z => z.parts.map(p => ({
      zone: z.zone,
      part: p.name,
      available: p.available,
    })));
    // No date property, so just use order of appearance
    for (const part of allParts) {
      if (remaining <= 0) break;
      const take = Math.min(part.available, remaining);
      allocation.push({ zone: part.zone, part: part.part, taken: take, available: part.available });
      remaining -= take;
    }
    return allocation;
  }

  // Enhanced FIFO allocation for grouped display (using lot instead of date)
  function fifoAllocateGrouped(quantity: number, stock: typeof detailedSourceStock) {
    let remaining = quantity;
    // Flatten all parts with zone info, sort by lot (FIFO order for demo)
    const allParts = stock.flatMap(z => z.parts.map((p, idx) => ({
      zone: z.zone,
      part: p.name,
      available: p.available,
      lot: p.lot,
      order: idx, // fallback FIFO order if needed
    })));
    // For demo, sort by lot string (in real app, use real FIFO logic)
    allParts.sort((a, b) => a.lot.localeCompare(b.lot));
    // Group allocations by zone
    const allocationByZone: Record<string, Array<{ part: string; taken: number; available: number; lot: string }>> = {};
    let totalTaken = 0;
    for (const part of allParts) {
      if (remaining <= 0) break;
      const take = Math.min(part.available, remaining);
      if (take > 0) {
        if (!allocationByZone[part.zone]) allocationByZone[part.zone] = [];
        allocationByZone[part.zone].push({ part: part.part, taken: take, available: part.available, lot: part.lot });
        remaining -= take;
        totalTaken += take;
      }
    }
    return { allocationByZone, totalTaken };
  }

  // Enhanced FIFO allocation for grouped display (group by lot/reference first)
  function fifoAllocateGroupedByLot(quantity: number, stock: typeof detailedSourceStock) {
    let remaining = quantity;
    // Flatten all parts with zone info, sort by lot (FIFO order for demo)
    const allParts = stock.flatMap(z => z.parts.map((p, idx) => ({
      zone: z.zone,
      part: p.name,
      available: p.available,
      lot: p.lot,
      order: idx, // fallback FIFO order if needed
    })));
    // For demo, sort by lot string (in real app, use real FIFO logic)
    allParts.sort((a, b) => a.lot.localeCompare(b.lot));
    // Group allocations by lot
    const allocationByLot: Record<string, Array<{ zone: string; part: string; taken: number; available: number }>> = {};
    let totalTaken = 0;
    for (const part of allParts) {
      if (remaining <= 0) break;
      const take = Math.min(part.available, remaining);
      if (take > 0) {
        if (!allocationByLot[part.lot]) allocationByLot[part.lot] = [];
        allocationByLot[part.lot].push({ zone: part.zone, part: part.part, taken: take, available: part.available });
        remaining -= take;
        totalTaken += take;
      }
    }
    return { allocationByLot, totalTaken };
  }

  // Refactored fetch logic
  const fetchProductAndHistory = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const productRes = await axios.get(`/api/products/${id}`);
      setProduct(productRes.data);
      const historyRes = await axios.get(`/api/movements?product_id=${id}`);
      setMovementHistory(historyRes.data);
      setLoading(false);
    } catch (err) {
      setLoading(false);
      setProduct(null);
      setMovementHistory([]);
      toast.error('Erreur lors du chargement des données du produit ou de son historique.');
    }
  };

  useEffect(() => {
    fetchProductAndHistory();
    // eslint-disable-next-line
  }, [id]);

  // Get available date range from movement history
  const getAvailableDateRange = () => {
    if (movementHistory.length === 0) return { minDate: '', maxDate: '' };

    console.log('=== DEBUG: getAvailableDateRange (ProduitSemiDetail) ===');
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
      (entry.batch_number && entry.batch_number.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (entry.lot && entry.lot.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (entry.quality_status && entry.quality_status.toLowerCase().includes(searchTerm.toLowerCase())) ||
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

    // Batch number filter
    const batchMatch = !filters.batchNumber ||
      (entry.batch_number && entry.batch_number.toLowerCase().includes(filters.batchNumber.toLowerCase())) ||
      (entry.lot && entry.lot.toLowerCase().includes(filters.batchNumber.toLowerCase()));

    // Quality status filter
    const qualityMatch = !filters.qualityStatus || entry.quality_status === filters.qualityStatus;

    return searchMatch && statusMatch && locationMatch && dateMatch && fournisseurMatch && atelierMatch && batchMatch && qualityMatch;
  });

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

  // Handle location selection for entry operations
  const handleLocationChange = (location: string) => {
    setOperationForm(prev => ({ ...prev, location }));
    if (operationType === 'Entrée' && location) {
      setShowFloorSelection(true);
      setShowZoneSelection(false);
      // Auto-select all available floors for the first zone
      const availableFloors = getAvailableFloors(location);
      setSelectedFloors(availableFloors.map(floor => ({
        floorId: floor.id,
        floorName: floor.name,
        quantity: 0,
        availableCapacity: floor.availableCapacity
      })));
      
      // Initialize selected zones with the first zone
      setSelectedZones([{
        zone: location,
        floors: availableFloors.map(floor => ({
          floorId: floor.id,
          floorName: floor.name,
          quantity: 0,
          availableCapacity: floor.availableCapacity
        }))
      }]);
      setCurrentZoneIndex(0);
    } else {
      setShowFloorSelection(false);
      setShowZoneSelection(false);
    }
  };

  // Handle floor selection
  const handleFloorSelection = (floorId: number, floorName: string, availableCapacity: number) => {
    const existingFloor = selectedFloors.find(f => f.floorId === floorId);
    if (existingFloor) {
      setSelectedFloors(prev => prev.filter(f => f.floorId !== floorId));
    } else {
      setSelectedFloors(prev => [...prev, { floorId, floorName, quantity: 0, availableCapacity }]);
    }
  };

  // Handle floor quantity change
  const handleFloorQuantityChange = (floorId: number, quantity: number) => {
    setSelectedFloors(prev => 
      prev.map(floor => 
        floor.floorId === floorId 
          ? { ...floor, quantity: Math.min(quantity, floor.availableCapacity) }
          : floor
      )
    );
  };

  // Update distribution whenever quantity, zones, or floors change
  useEffect(() => {
    if (!operationForm.quantity || selectedZones.length === 0) return;
    const distributed = distributeQuantityAcrossZones(parseInt(operationForm.quantity) || 0, selectedZones);
    setSelectedZones(distributed);
    // Keep selectedFloors in sync with the current zone
    if (distributed[currentZoneIndex]) {
      setSelectedFloors(distributed[currentZoneIndex].floors);
    } else {
      setSelectedFloors([]);
    }
    // eslint-disable-next-line
  }, [operationForm.quantity, selectedZones.length, currentZoneIndex]);

  // When switching zones, update selectedFloors
  const switchToZone = (zoneIndex: number) => {
    setCurrentZoneIndex(zoneIndex);
    if (selectedZones[zoneIndex]) {
      setOperationForm(prev => ({ ...prev, location: selectedZones[zoneIndex].zone }));
      setSelectedFloors(selectedZones[zoneIndex].floors);
    }
  };

  // When adding a new zone, recalculate distribution
  const addNewZone = (newZone: string) => {
    setSelectedZones(prev => {
      const updated = [...prev, { zone: newZone, floors: getAvailableFloors(newZone).map(floor => ({ floorId: floor.id, floorName: floor.name, quantity: 0, availableCapacity: floor.availableCapacity })) }];
      const distributed = distributeQuantityAcrossZones(parseInt(operationForm.quantity) || 0, updated);
      setCurrentZoneIndex(distributed.length - 1);
      setSelectedFloors(distributed[distributed.length - 1].floors);
      setOperationForm(prevForm => ({ ...prevForm, location: newZone }));
      return distributed;
    });
    setShowZoneSelection(false);
  };

  // When removing a zone, recalculate distribution
  const removeZone = (zoneIndex: number) => {
    setSelectedZones(prev => {
      const newZones = prev.filter((_, idx) => idx !== zoneIndex);
      if (newZones.length === 0) {
        setSelectedFloors([]);
        setCurrentZoneIndex(0);
        setOperationForm(prev => ({ ...prev, location: '' }));
        return [];
      } else {
        const distributed = distributeQuantityAcrossZones(parseInt(operationForm.quantity) || 0, newZones);
        const newCurrent = zoneIndex === 0 ? 0 : zoneIndex - 1;
        setCurrentZoneIndex(newCurrent);
        setSelectedFloors(distributed[newCurrent].floors);
        setOperationForm(prev => ({ ...prev, location: distributed[newCurrent].zone }));
        return distributed;
      }
    });
  };

  // When changing total quantity, recalculate distribution
  const handleTotalQuantityChange = (quantity: string) => {
    setOperationForm(prev => ({ ...prev, quantity }));
    if (selectedZones.length > 0 && quantity && parseInt(quantity) > 0) {
      const distributed = distributeQuantityAcrossZones(parseInt(quantity), selectedZones);
      setSelectedZones(distributed);
      setSelectedFloors(distributed[currentZoneIndex]?.floors || []);
    }
  };

  // Calculate total selected quantity across all zones
  const totalSelectedQuantity = selectedZones.reduce((sum, zone) => 
    sum + zone.floors.reduce((zoneSum, floor) => zoneSum + floor.quantity, 0), 0
  );

  // Get available floors for selected location
  const getAvailableFloors = (location: string) => {
    return FLOOR_DATA[location as keyof typeof FLOOR_DATA] || [];
  };

  // Calculate total available capacity across all floors
  const getTotalAvailableCapacity = (location: string) => {
    const floors = getAvailableFloors(location);
    return floors.reduce((sum, floor) => sum + floor.availableCapacity, 0);
  };

  // Calculate total available capacity across all selected zones
  const getTotalAvailableCapacityAllZones = () => {
    return selectedZones.reduce((sum, zone) => 
      sum + getTotalAvailableCapacity(zone.zone), 0
    );
  };

  // Helper: Distribute total quantity across all selected zones and their floors
  function distributeQuantityAcrossZones(totalQuantity: number, zones: typeof selectedZones) {
    let remaining = totalQuantity;
    return zones.map(zone => {
      const newFloors = getAvailableFloors(zone.zone).map(floor => {
        if (remaining <= 0) return { floorId: floor.id, floorName: floor.name, quantity: 0, availableCapacity: floor.availableCapacity };
        const qty = Math.min(remaining, floor.availableCapacity);
        remaining -= qty;
        return { floorId: floor.id, floorName: floor.name, quantity: qty, availableCapacity: floor.availableCapacity };
      });
      return { zone: zone.zone, floors: newFloors };
    });
  }

  // Manual distribution handler
  const handleManualDistribute = () => {
    if (!operationForm.quantity || selectedZones.length === 0) return;
    const distributed = distributeQuantityAcrossZones(parseInt(operationForm.quantity) || 0, selectedZones);
    setSelectedZones(distributed);
    if (distributed[currentZoneIndex]) {
      setSelectedFloors(distributed[currentZoneIndex].floors);
    } else {
      setSelectedFloors([]);
    }
  };

  // Helper for sortie: Distribute quantity across exit zones
  function distributeQuantityAcrossExitZones(totalQuantity: number, zones: typeof selectedExitZones) {
    let remaining = totalQuantity;
    return zones.map(zone => {
      const newFloors = getAvailableFloors(zone.zone).map(floor => {
        if (remaining <= 0) return { floorId: floor.id, floorName: floor.name, quantity: 0, availableCapacity: floor.availableCapacity };
        const qty = Math.min(remaining, floor.availableCapacity);
        remaining -= qty;
        return { floorId: floor.id, floorName: floor.name, quantity: qty, availableCapacity: floor.availableCapacity };
      });
      return { zone: zone.zone, floors: newFloors };
    });
  }

  // Handlers for sortie (exit)
  const handleExitLocationChange = (location: string) => {
    setOperationForm(prev => ({ ...prev, location }));
    if (operationType === 'Sortie' && location) {
      // Auto-select all available floors for the first zone
      const availableFloors = getAvailableFloors(location);
      setSelectedExitFloors(availableFloors.map(floor => ({
        floorId: floor.id,
        floorName: floor.name,
        quantity: 0,
        availableCapacity: floor.availableCapacity
      })));
      setSelectedExitZones([{
        zone: location,
        floors: availableFloors.map(floor => ({
          floorId: floor.id,
          floorName: floor.name,
          quantity: 0,
          availableCapacity: floor.availableCapacity
        }))
      }]);
      setCurrentExitZoneIndex(0);
      setShowExitZoneSelection(false);
    } else {
      setSelectedExitFloors([]);
      setShowExitZoneSelection(false);
    }
  };
  const handleExitFloorSelection = (floorId: number, floorName: string, availableCapacity: number) => {
    const existingFloor = selectedExitFloors.find(f => f.floorId === floorId);
    if (existingFloor) {
      setSelectedExitFloors(prev => prev.filter(f => f.floorId !== floorId));
    } else {
      setSelectedExitFloors(prev => [...prev, { floorId, floorName, quantity: 0, availableCapacity }]);
    }
  };
  const handleExitFloorQuantityChange = (floorId: number, quantity: number) => {
    setSelectedExitFloors(prev =>
      prev.map(floor =>
        floor.floorId === floorId
          ? { ...floor, quantity: Math.min(quantity, floor.availableCapacity) }
          : floor
      )
    );
  };
  const addNewExitZone = (newZone: string) => {
    setSelectedExitZones(prev => {
      const updated = [...prev, { zone: newZone, floors: getAvailableFloors(newZone).map(floor => ({ floorId: floor.id, floorName: floor.name, quantity: 0, availableCapacity: floor.availableCapacity })) }];
      const distributed = distributeQuantityAcrossExitZones(parseInt(operationForm.quantity) || 0, updated);
      setCurrentExitZoneIndex(distributed.length - 1);
      setSelectedExitFloors(distributed[distributed.length - 1].floors);
      setOperationForm(prevForm => ({ ...prevForm, location: newZone }));
      return distributed;
    });
    setShowExitZoneSelection(false);
  };
  const removeExitZone = (zoneIndex: number) => {
    setSelectedExitZones(prev => {
      const newZones = prev.filter((_, idx) => idx !== zoneIndex);
      if (newZones.length === 0) {
        setSelectedExitFloors([]);
        setCurrentExitZoneIndex(0);
        setOperationForm(prev => ({ ...prev, location: '' }));
        return [];
      } else {
        const distributed = distributeQuantityAcrossExitZones(parseInt(operationForm.quantity) || 0, newZones);
        const newCurrent = zoneIndex === 0 ? 0 : zoneIndex - 1;
        setCurrentExitZoneIndex(newCurrent);
        setSelectedExitFloors(distributed[newCurrent].floors);
        setOperationForm(prev => ({ ...prev, location: distributed[newCurrent].zone }));
        return distributed;
      }
    });
  };
  const handleExitManualDistribute = () => {
    if (!operationForm.quantity || selectedExitZones.length === 0) return;
    const distributed = distributeQuantityAcrossExitZones(parseInt(operationForm.quantity) || 0, selectedExitZones);
    setSelectedExitZones(distributed);
    if (distributed[currentExitZoneIndex]) {
      setSelectedExitFloors(distributed[currentExitZoneIndex].floors);
    } else {
      setSelectedExitFloors([]);
    }
  };
  const handleExitTotalQuantityChange = (quantity: string) => {
    setOperationForm(prev => ({ ...prev, quantity }));
  };
  const totalSelectedExitQuantity = selectedExitZones.reduce((sum, zone) =>
    sum + zone.floors.reduce((zoneSum, floor) => zoneSum + floor.quantity, 0), 0
  );

  // Handler for selecting source zones
  const handleSourceZoneToggle = (zone: string) => {
    setSelectedSourceZones(prev =>
      prev.includes(zone) ? prev.filter(z => z !== zone) : [...prev, zone]
    );
  };

  const [locations, setLocations] = useState<string[]>([]);
  const [floorData, setFloorData] = useState<Record<string, Array<{ id: number, name: string, availableCapacity: number, totalCapacity: number, type: 'etage' | 'part' }>>>({});

  // Extracted fetchLocationsAndFloors function
  const fetchLocationsAndFloors = async () => {
    const res = await axios.get('/api/locations');
    const locs = res.data;
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
  };

  useEffect(() => {
    fetchLocationsAndFloors();
  }, []);

  const [entryMode, setEntryMode] = useState<'local' | 'ready'>('local');

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-[70vh]">
          <div className="w-16 h-16 border-4 border-black border-t-transparent rounded-full animate-spin"></div>
        </div>
      </Layout>
    );
  }

  // Helper to export to Excel (with summary rows)
  function exportToExcelWithSummary(data: any[], filename: string) {
    if (!data.length) return;
    // Prepare summary rows
    const summaryRows = [
      ["Nom", product?.nom ?? ""],
      ["Référence", product?.reference ?? ""],
      ["Unité", product?.unite ?? ""],
      ["Stock Actuel", product?.stock ?? ""],
      ["Total Entrées", product?.totalEntrer ?? ""],
      ["Total Sorties", product?.totalSortie ?? ""],
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
              <h1 className="text-2xl sm:text-3xl font-bold mb-1 truncate">Produit Semi-Fini - {product?.nom}</h1>
              <div className="flex gap-2">
                <SemiOperationTypeDialog
                  open={openOperation}
                  onOpenChange={setOpenOperation}
                  onSelect={(type, mode) => {
                    setOperationType(type);
                    setEntryMode(mode || 'local');
                    setOpenOperation(false);
                    setOpenForm(true);
                  }}
                  trigger={
                    <Button variant="default">Nouvelle opération</Button>
                  }
                />
                <SemiOperationDialog
                  open={openForm}
                  onOpenChange={(open) => {
                    setOpenForm(open);
                    if (!open) setOperationType('');
                  }}
                  operationType={operationType}
                  operationMode={entryMode}
                  onSuccess={() => {
                    setOperationType('');
                    setOpenForm(false);
                    fetchProductAndHistory(); // Refresh data after operation
                    fetchLocationsAndFloors(); // Refresh locations/floors after operation
                  }}
                  product={product}
                  locations={locations}
                  floorData={floorData}
                  movementHistory={movementHistory}
                  onRefresh={() => {
                    fetchProductAndHistory();
                    fetchLocationsAndFloors();
                  }} // Pass refresh function
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
                          exportToExcelWithSummary(exportFilteredHistory, `rapport-semi-produit-${product?.reference || ''}.xlsx`);
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
              Référence: {product?.reference} | Stock actuel: {product?.stock}
            </p>
          </div>
        </div>
      </div>

      {/* Product Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <div className="p-4">
            <p className="text-sm font-medium text-muted-foreground">Stock Actuel</p>
            <p className="text-2xl font-bold">{product?.stock ?? 0}</p>
          </div>
        </Card>
        <Card>
          <div className="p-4">
            <p className="text-sm font-medium text-muted-foreground">Total Entrées</p>
            <p className="text-2xl font-bold">{product?.total_entrer ?? product?.totalEntrer ?? 0}</p>
          </div>
        </Card>
        <Card>
          <div className="p-4">
            <p className="text-sm font-medium text-muted-foreground">Total Sorties</p>
            <p className="text-2xl font-bold">{product?.total_sortie ?? product?.totalSortie ?? 0}</p>
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

export default ProduitSemiDetail;
