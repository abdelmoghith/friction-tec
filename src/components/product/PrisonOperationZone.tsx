import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { X, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import { useRef } from 'react';

interface ProductOperationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  operationType: 'Entrée' | 'Sortie' | '';
  onSuccess: (info: any) => void;
  product: any;
  locations: string[];
  floorData: Record<string, Array<{ id: number; name: string; availableCapacity: number; totalCapacity: number; type: 'etage' | 'part' }>>;
  movementHistory?: any[]; // <-- Add this prop
  initialQuantity?: string; // <-- Add this prop for pre-populating quantity
  // finisProducts?: Array<any>; // <-- Remove this prop
}

const PrisonOperationZone: React.FC<ProductOperationDialogProps> = ({
  open,
  onOpenChange,
  operationType,
  onSuccess,
  product,
  locations,
  floorData,
  movementHistory = [], // <-- Add default
  initialQuantity = '', // <-- Add default for initialQuantity
  // finisProducts = [], // <-- Remove this default
}) => {
  console.log('🎯 [DEBUG] PrisonOperationZone component rendered!', { open, operationType, product: product?.id });
  // --- State ---
  const [operationForm, setOperationForm] = useState({
    fournisseur: '',
    quantity: '',
    location: '', // keep for Entrée, ignore for Sortie
    floor: '',
    floorQuantity: '',
    fabricationDate: '', // new
    expirationDate: '',   // new
    batchNumber: '' // new
  });
  // Entrée
  const [showFloorSelection, setShowFloorSelection] = useState(false);
  const [selectedFloors, setSelectedFloors] = useState<Array<{ floorId: number, floorName: string, quantity: number, availableCapacity: number, type: 'etage' | 'part' }>>([]);
  const [selectedZones, setSelectedZones] = useState<Array<{ zone: string, floors: Array<{ floorId: number, floorName: string, quantity: number, availableCapacity: number, type: 'etage' | 'part' }> }>>([]);
  const [currentZoneIndex, setCurrentZoneIndex] = useState(0);
  const [showZoneSelection, setShowZoneSelection] = useState(false);
  // Sortie
  const [selectedExitFloors, setSelectedExitFloors] = useState<Array<{ floorId: number, floorName: string, quantity: number, availableCapacity: number, type: 'etage' | 'part' }>>([]);
  const [selectedExitZones, setSelectedExitZones] = useState<Array<{ zone: string, floors: Array<{ floorId: number, floorName: string, quantity: number, availableCapacity: number, type: 'etage' | 'part' }> }>>([]);
  const [currentExitZoneIndex, setCurrentExitZoneIndex] = useState(0);
  const [showExitZoneSelection, setShowExitZoneSelection] = useState(false);
  // FIFO
  const [fournisseurs, setFournisseurs] = useState<Array<{ id: number; designation: string }>>([]);
  // Fournisseur search
  const [fournisseurSearch, setFournisseurSearch] = useState('');

  // Add state for selected product (for Sortie)
  const [selectedProduct, setSelectedProduct] = useState<any>(product);
  // Add state for fetched finis products
  const [finisProducts, setFinisProducts] = useState<Array<any>>([]);
  // Loading state for save operation
  const [isSaving, setIsSaving] = useState(false);

  // Fetch finis products when dialog opens in Sortie mode
  useEffect(() => {
    if (open && operationType === 'Sortie') {
      axios.get('/api/products?type=finis')
        .then(res => setFinisProducts(res.data))
        .catch(() => setFinisProducts([]));
    }
  }, [open, operationType]);

  // Update selectedProduct when product prop changes (for Entrée or dialog open)
  useEffect(() => {
    if (operationType === 'Entrée') {
      setSelectedProduct(product);
    } else if (operationType === 'Sortie' && product) {
      // For Sortie, if a product is passed (pre-selected), use it
      setSelectedProduct(product);
    }
  }, [product, operationType]);

  // --- Location ID Map ---
  const [locationIdMap, setLocationIdMap] = useState<Record<string, number>>({});
  useEffect(() => {
    // Fetch locations with ids for mapping name to id
    axios.get('/api/locations').then(res => {
      const map: Record<string, number> = {};
      res.data.forEach((loc: any) => {
        map[loc.name] = loc.id;
      });
      setLocationIdMap(map);
    });
  }, []);

  // Fetch fournisseurs when dialog opens and operationType is 'Entrée'
  useEffect(() => {
    if (open && operationType === 'Entrée') {
      axios.get('/fournisseurs')
        .then(res => setFournisseurs(res.data))
        .catch(() => setFournisseurs([]));
    }
  }, [open, operationType]);

  useEffect(() => {
    if (open) {
      console.log('[DEBUG] floorData:', floorData);
    }
  }, [open, floorData]);

  // --- Helpers ---
  const getAvailableFloors = (location: string) => {
    return floorData[location as keyof typeof floorData] || [];
  };
  const getTotalAvailableCapacity = (location: string) => {
    const floors = getAvailableFloors(location);
    return floors.reduce((sum, floor) => sum + floor.availableCapacity, 0);
  };
  const getTotalAvailableCapacityAllZones = (zones: typeof selectedZones | typeof selectedExitZones) => {
    return zones.reduce((sum, zone) =>
      sum + getTotalAvailableCapacity(zone.zone), 0
    );
  };
  // Distribute quantity across zones/floors
  function distributeQuantityAcrossZones(totalQuantity: number, zones: typeof selectedZones) {
    let remaining = totalQuantity;
    return zones.map(zone => {
      const newFloors = getAvailableFloors(zone.zone).map(floor => {
        if (remaining <= 0) return { floorId: floor.id, floorName: floor.name, quantity: 0, availableCapacity: floor.availableCapacity, type: floor.type };
        const qty = Math.min(remaining, floor.availableCapacity);
        remaining -= qty;
        return { floorId: floor.id, floorName: floor.name, quantity: qty, availableCapacity: floor.availableCapacity, type: floor.type };
      });
      return { zone: zone.zone, floors: newFloors };
    });
  }
  function distributeQuantityAcrossExitZones(totalQuantity: number, zones: typeof selectedExitZones) {
    let remaining = totalQuantity;
    return zones.map(zone => {
      const newFloors = getAvailableFloors(zone.zone).map(floor => {
        if (remaining <= 0) return { floorId: floor.id, floorName: floor.name, quantity: 0, availableCapacity: floor.availableCapacity, type: floor.type };
        const qty = Math.min(remaining, floor.availableCapacity);
        remaining -= qty;
        return { floorId: floor.id, floorName: floor.name, quantity: qty, availableCapacity: floor.availableCapacity, type: floor.type };
      });
      return { zone: zone.zone, floors: newFloors };
    });
  }
  // FIFO allocation for sortie (grouped by lot)
  function fifoAllocateGroupedByLot(quantity: number, stock: any) { // Changed to 'any' as detailedSourceStock is removed
    let remaining = quantity;
    const allParts = stock.flatMap(z => z.parts.map((p, idx) => ({
      zone: z.zone,
      part: p.name,
      available: p.available,
      lot: p.lot,
      order: idx,
    })));
    allParts.sort((a, b) => a.lot.localeCompare(b.lot));
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

  // Helper to generate a batch number
  function generateBatchNumber() {
    const now = new Date();
    const pad = (n) => n.toString().padStart(2, '0');
    const datePart = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
    const timePart = `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    const rand = Math.floor(1000 + Math.random() * 9000);
    return `LOT-${datePart}-${timePart}-${rand}`;
  }

  // --- Entrée Handlers ---
  const handleLocationChange = (location: string) => {
    setOperationForm(prev => ({ ...prev, location }));
    if (operationType === 'Entrée' && location) {
      setShowFloorSelection(true);
      setShowZoneSelection(false);
      const availableFloors = getAvailableFloors(location);
      setSelectedFloors(availableFloors.map(floor => ({
        floorId: floor.id,
        floorName: floor.name,
        quantity: 0,
        availableCapacity: floor.availableCapacity,
        type: floor.type,
      })));
      setSelectedZones([{
        zone: location,
        floors: availableFloors.map(floor => ({
          floorId: floor.id,
          floorName: floor.name,
          quantity: 0,
          availableCapacity: floor.availableCapacity,
          type: floor.type,
        }))
      }]);
      setCurrentZoneIndex(0);
    } else {
      setShowFloorSelection(false);
      setShowZoneSelection(false);
    }
  };
  const handleFloorSelection = (floorId: number, floorName: string, availableCapacity: number, type: 'etage' | 'part') => {
    const existingFloor = selectedFloors.find(f => f.floorId === floorId);
    if (existingFloor) {
      setSelectedFloors(prev => {
        const updated = prev.filter(f => f.floorId !== floorId);
        console.log('[DEBUG] selectedFloors after removal:', updated);
        return updated;
      });
    } else {
      setSelectedFloors(prev => {
        const updated = [...prev, { floorId, floorName, quantity: 0, availableCapacity, type }];
        console.log('[DEBUG] selectedFloors after add:', updated);
        return updated;
      });
    }
  };
  const handleFloorQuantityChange = (floorId: number, quantity: number) => {
    setSelectedFloors(prev =>
      prev.map(floor =>
        floor.floorId === floorId
          ? { ...floor, quantity: Math.min(quantity, floor.availableCapacity) }
          : floor
      )
    );
  };
  const handleTotalQuantityChange = (quantity: string) => {
    setOperationForm(prev => ({ ...prev, quantity }));
    if (selectedZones.length > 0 && quantity && parseInt(quantity) > 0) {
      const distributed = distributeQuantityAcrossZones(parseInt(quantity), selectedZones);
      setSelectedZones(distributed);
      setSelectedFloors(distributed[currentZoneIndex]?.floors || []);
    }
  };
  const switchToZone = (zoneIndex: number) => {
    setCurrentZoneIndex(zoneIndex);
    if (selectedZones[zoneIndex]) {
      setOperationForm(prev => ({ ...prev, location: selectedZones[zoneIndex].zone }));
      setSelectedFloors(selectedZones[zoneIndex].floors);
    }
  };
  const addNewZone = (newZone: string) => {
    setSelectedZones(prev => {
      const updated = [...prev, { zone: newZone, floors: getAvailableFloors(newZone).map(floor => ({ floorId: floor.id, floorName: floor.name, quantity: 0, availableCapacity: floor.availableCapacity, type: floor.type })) }];
      console.log('[DEBUG] selectedZones after addNewZone:', updated);
      const distributed = distributeQuantityAcrossZones(parseInt(operationForm.quantity) || 0, updated);
      setCurrentZoneIndex(distributed.length - 1);
      setSelectedFloors(distributed[distributed.length - 1].floors);
      setOperationForm(prevForm => ({ ...prevForm, location: newZone }));
      return distributed;
    });
    setShowZoneSelection(false);
  };
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
  const totalSelectedQuantity = selectedZones.reduce((sum, zone) =>
    sum + zone.floors.reduce((zoneSum, floor) => zoneSum + floor.quantity, 0), 0
  );

  // --- Sortie Handlers ---
  const handleExitLocationChange = (location: string) => {
    setOperationForm(prev => ({ ...prev, location }));
    if (operationType === 'Sortie' && location) {
      const availableFloors = getAvailableFloors(location);
      setSelectedExitFloors(availableFloors.map(floor => ({
        floorId: floor.id,
        floorName: floor.name,
        quantity: 0,
        availableCapacity: floor.availableCapacity,
        type: floor.type,
      })));
      setSelectedExitZones([{
        zone: location,
        floors: availableFloors.map(floor => ({
          floorId: floor.id,
          floorName: floor.name,
          quantity: 0,
          availableCapacity: floor.availableCapacity,
          type: floor.type,
        }))
      }]);
      setCurrentExitZoneIndex(0);
      setShowExitZoneSelection(false);
    } else {
      setSelectedExitFloors([]);
      setShowExitZoneSelection(false);
    }
  };
  const handleExitFloorSelection = (floorId: number, floorName: string, availableCapacity: number, type: 'etage' | 'part') => {
    const existingFloor = selectedExitFloors.find(f => f.floorId === floorId);
    if (existingFloor) {
      setSelectedExitFloors(prev => prev.filter(f => f.floorId !== floorId));
    } else {
      setSelectedExitFloors(prev => [...prev, { floorId, floorName, quantity: 0, availableCapacity, type }]);
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
      const updated = [...prev, { zone: newZone, floors: getAvailableFloors(newZone).map(floor => ({ floorId: floor.id, floorName: floor.name, quantity: 0, availableCapacity: floor.availableCapacity, type: floor.type })) }];
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

  // --- FIFO Stock Calculation for Sortie ---
  // Build current stock by lot/location/etage/part using movementHistory
  function computeFifoStock() {
    // Only consider 'Entrée' and 'Sortie' for this product
    const entries = movementHistory.filter(m => m.status === 'Entrée');
    const sorties = movementHistory.filter(m => m.status === 'Sortie');
    // Group entries by lot/location/etage/part
    type StockKey = string;
    function makeKey(m: any) {
      return [m.batch_number || m.lot || '', m.location_name || '', m.etage_name || '', m.part_id || ''].join('||');
    }
    // Sum entries
    const stockMap: Record<StockKey, { lot: string, location: string, etage: string, etage_id: number | null, part: string, part_name: string, part_id: number | null, available: number, fabrication_date: string, expiration_date: string }> = {};
    for (const m of entries) {
      const key = makeKey(m);
      if (!stockMap[key]) {
        stockMap[key] = {
          lot: m.batch_number || m.lot || '',
          location: m.location_name || '',
          etage: m.etage_name || '',
          etage_id: m.etage_id || null,
          part: m.part_id || null,
          part_name: m.part_name || '',
          part_id: m.part_id || null,
          available: 0,
          fabrication_date: m.fabrication_date || m.date || '',
          expiration_date: m.expiration_date || '',
        };
      }
      stockMap[key].available += m.quantity;
    }
    // Convert to array and sort FIFO (by fabrication date, then lot)
    const entryList = Object.entries(stockMap).map(([key, val]) => ({ key, ...val }));
    entryList.sort((a, b) => {
      const dateA = a.fabrication_date ? new Date(a.fabrication_date) : new Date(0);
      const dateB = b.fabrication_date ? new Date(b.fabrication_date) : new Date(0);
      const dateComparison = dateA.getTime() - dateB.getTime();
      if (dateComparison !== 0) return dateComparison;
      return a.lot.localeCompare(b.lot);
    });
    // Debug: Log initial entryList
    console.log('[DEBUG][FIFO] Initial entryList:', JSON.parse(JSON.stringify(entryList)));
    // For each sortie, subtract from earliest lots (FIFO) for the same location/etage/part
    for (const sortie of sorties) {
      let qty = sortie.quantity;
      console.log('[DEBUG][FIFO] Processing sortie:', sortie);
      // Find all matching entries for this sortie's location (and optionally etage/part), in FIFO order
      const matchingEntries = entryList.filter(entry => {
        const sameLocation = sortie.location_name === entry.location;
        // If sortie.etage_name is set, match it, otherwise match any etage
        const etageMatch = !sortie.etage_name || sortie.etage_name === entry.etage;
        // If sortie.part_id is set, match it, otherwise match any part
        const partMatch = !sortie.part_id || String(sortie.part_id) === String(entry.part_id || '');
        return sameLocation && etageMatch && partMatch;
      });
      for (const entry of matchingEntries) {
        if (qty <= 0) break;
        const take = Math.min(entry.available, qty);
        console.log(`[DEBUG][FIFO] Subtracting ${take} from lot ${entry.lot} (before: ${entry.available}) for sortie qty ${qty}`);
        entry.available -= take;
        qty -= take;
        console.log(`[DEBUG][FIFO] Lot ${entry.lot} now has available: ${entry.available}, remaining sortie qty: ${qty}`);
      }
      if (qty > 0) {
        console.warn('[DEBUG][FIFO] Sortie quantity not fully matched, remaining:', qty, 'Sortie:', sortie);
      }
    }
    // Debug: Log final entryList
    console.log('[DEBUG][FIFO] Final entryList:', JSON.parse(JSON.stringify(entryList)));
    // Debug: Entrée, Sortie, Disponible for each lot/location/etage/part
    const allKeys = new Set([
      ...entries.map(makeKey),
      ...sorties.map(makeKey)
    ]);
    for (const key of allKeys) {
      const entrySum = entries.filter(m => makeKey(m) === key).reduce((sum, m) => sum + m.quantity, 0);
      const sortieSum = sorties.filter(m => makeKey(m) === key).reduce((sum, m) => sum + m.quantity, 0);
      const available = entryList.find(e => e.key === key)?.available || 0;
      if (entrySum > 0 || sortieSum > 0) {
        console.log(`[DEBUG][FIFO][SUMMARY] Key: ${key}\n  Entrée: ${entrySum}\n  Sortie: ${sortieSum}\n  Disponible: ${available}`);
      }
    }
    // Only keep lots with available > 0
    const filtered = entryList.filter(e => e.available > 0);
    console.log('[DEBUG][FIFO] Filtered entryList (available > 0):', filtered);
    return filtered;
  }
  // FIFO allocation for requested sortie
  function fifoAllocateSortie(requestedQty: number, fifoStock: ReturnType<typeof computeFifoStock>) {
    let remaining = requestedQty;
    const allocation: Array<{ lot: string, location: string, etage: string, part: string, part_name: string, taken: number, available: number, fabrication_date: string, expiration_date: string }> = [];
    for (const stock of fifoStock) {
      if (remaining <= 0) break;
      const take = Math.min(stock.available, remaining);
      allocation.push({ ...stock, taken: take, available: stock.available });
      remaining -= take;
    }
    return { allocation, remaining };
  }

  // --- Calculate totalDisponible for sortie mode ---
  let totalDisponible = 0;
  if (operationType === 'Sortie' && Array.isArray(movementHistory)) {
    // Group by lot, location, etage, part
    const groupMap: Record<string, any> = {};
    for (const row of movementHistory.filter(row => row.product_id === product?.id && row.is_transfer !== 1 && row.is_transfer !== '1' && row.is_transfer !== true && row.internal_transfer !== 1 && row.internal_transfer !== '1' && row.internal_transfer !== true)) {
      const key = [
        row.batch_number || row.lot || '',
        row.location_name || '',
        row.etage_name || row.part_name || '',
        row.etage_id || row.part_id || ''
      ].join('||');
      if (!groupMap[key]) {
        groupMap[key] = { entree: 0, sortie: 0 };
      }
      if (row.status === 'Entrée') groupMap[key].entree += row.quantity;
      if (row.status === 'Sortie') groupMap[key].sortie += row.quantity;
    }
    totalDisponible = Object.values(groupMap).reduce((sum, row: any) => sum + (row.entree - row.sortie), 0);
  }

  // --- Reset on close ---
  useEffect(() => {
    if (!open) {
      console.log('🔴 [DEBUG] PrisonOperationZone dialog CLOSED');
      setOperationForm({ fournisseur: '', quantity: '', location: '', floor: '', floorQuantity: '', fabricationDate: '', expirationDate: '', batchNumber: '' });
      setShowFloorSelection(false);
      setSelectedFloors([]);
      setSelectedZones([]);
      setCurrentZoneIndex(0);
      setShowZoneSelection(false);
      setSelectedExitFloors([]);
      setSelectedExitZones([]);
      setCurrentExitZoneIndex(0);
      setShowExitZoneSelection(false);
    } else {
      console.log('🟢 [DEBUG] PrisonOperationZone dialog OPENED');
      console.log('🟢 [DEBUG] operationType:', operationType);
      console.log('🟢 [DEBUG] product prop:', product);
      console.log('🟢 [DEBUG] movementHistory length:', movementHistory?.length || 0);
      console.log('🟢 [DEBUG] floorData:', floorData);

      // Set fabricationDate to today and generate batch number when dialog opens
      // Also set initial quantity if provided
      setOperationForm(prev => ({
        ...prev,
        fabricationDate: new Date().toISOString().slice(0, 10),
        expirationDate: '',
        batchNumber: generateBatchNumber(),
        quantity: initialQuantity || prev.quantity // Use initialQuantity if provided
      }));
    }
  }, [open, operationType, product, movementHistory, floorData]);

  // --- Save Handler ---
  const handleSave = async () => {
    setIsSaving(true);
    console.log('🚀 [DEBUG] handleSave called!');
    console.log('🚀 [DEBUG] operationType:', operationType);
    console.log('🚀 [DEBUG] operationForm:', operationForm);
    console.log('🚀 [DEBUG] selectedProduct:', selectedProduct);
    console.log('🚀 [DEBUG] product prop:', product);

    const isEntry = operationType === 'Entrée';
    const isExit = operationType === 'Sortie';

    console.log('🚀 [DEBUG] isEntry:', isEntry, 'isExit:', isExit);

    // Use selectedProduct for Sortie, product prop for Entrée
    const product_id = isEntry ? product?.id : selectedProduct?.id;
    // For sortie, force product_type to 'ready'
    const product_type = isEntry ? product?.type || 'matiere' : 'ready';
    const fournisseur_id = isEntry ? parseInt(operationForm.fournisseur) : undefined;
    const fabricationDate = operationForm.fabricationDate || new Date().toISOString().slice(0, 10);
    const expirationDate = operationForm.expirationDate || fabricationDate;
    const status = isEntry ? 'Entrée' : 'Sortie';
    const quantity = parseInt(operationForm.quantity);

    console.log('🚀 [DEBUG] Calculated values:');
    console.log('  - product_id:', product_id);
    console.log('  - product_type:', product_type);
    console.log('  - status:', status);
    console.log('  - quantity:', quantity);

    // Validation for Sortie
    if (isExit) {
      if (!product_id) {
        toast.error('Veuillez sélectionner un produit fini.');
        return;
      }
      if (!quantity || quantity <= 0) {
        toast.error('Veuillez entrer une quantité.');
        return;
      }
    }

    // Aggregate all selected floors from all selected zones (for Entrée)
    const allSelectedFloors = isEntry
      ? selectedZones.flatMap(zone => zone.floors.filter(floor => floor.quantity > 0).map(floor => ({
        ...floor,
        zone: zone.zone
      })))
      : selectedExitZones.flatMap(zone => zone.floors.filter(floor => floor.quantity > 0).map(floor => ({
        ...floor,
        zone: zone.zone
      })));

    // Debug log for all relevant values
    console.log('[ProductOperationDialog] handleSave debug:', {
      operationType,
      product,
      product_id,
      product_type,
      location: operationForm.location,
      fournisseur: operationForm.fournisseur,
      fournisseur_id,
      fabricationDate,
      expirationDate,
      status,
      quantity,
      allSelectedFloors,
      selectedZones,
      selectedExitZones,
      operationForm
    });

    if (isEntry) {
      if (!product_id || !quantity || !fournisseur_id) {
        toast.error('Veuillez remplir tous les champs obligatoires.');
        return;
      }
    } else if (operationType === 'Sortie') {
      if (!quantity || quantity <= 0) {
        toast.error('Veuillez remplir la quantité.');
        return;
      }
    }
    try {
      if (operationType === 'Entrée') {
        const payloads = allSelectedFloors.map(floor => ({
          product_type,
          product_id,
          status,
          quantity: floor.quantity,
          location_id: locationIdMap[floor.zone],
          fournisseur_id: isEntry ? fournisseur_id : undefined,
          fabricationDate,
          expirationDate,
          date: fabricationDate,
          etage_id: floor.type === 'etage' ? floor.floorId : null,
          part_id: floor.type === 'part' ? floor.floorId : null,
          batch_number: operationForm.batchNumber || generateBatchNumber(),
        }));
        console.log('[DEBUG] Movement payloads to POST:', payloads);
        const promises = payloads.map(payload => axios.post('/api/movements', payload));
        await Promise.all(promises);
      } else if (operationType === 'Sortie') {
        // Build visibleRows for the selected product (same as lot table)
        console.log('[DEBUG][Sortie] Raw movement history for product:', selectedProduct.id);
        const filteredHistory = movementHistory.filter(row => row.product_id === selectedProduct.id);
        console.log('[DEBUG][Sortie] Filtered movement history sample:', filteredHistory.slice(0, 3).map(row => ({
          id: row.id,
          status: row.status,
          quantity: row.quantity,
          location_name: row.location_name,
          etage_name: row.etage_name,
          part_name: row.part_name,
          etage_id: row.etage_id,
          part_id: row.part_id,
          batch_number: row.batch_number,
          lot: row.lot,
          allKeys: Object.keys(row)
        })));
        console.log('[DEBUG][Sortie] Total filtered history count:', filteredHistory.length);

        const groupMap: Record<string, any> = {};
        for (const row of filteredHistory) {
          const key = [
            row.batch_number || row.lot || '',
            row.location_name || '',
            row.etage_name || row.part_name || '',
            row.etage_id || row.part_id || ''
          ].join('||');
          if (!groupMap[key]) {
            // Determine etage_id and part_id with fallback logic
            let etage_id = row.etage_id || null;
            let part_id = row.part_id || null;

            // If IDs are null but names exist, we need to look them up
            // This might happen with older data that doesn't have IDs properly set
            if (!etage_id && !part_id && (row.etage_name || row.part_name)) {
              // Look up the ID from floorData based on location and name
              const locationFloors = floorData[row.location_name] || [];
              if (row.etage_name) {
                const etageFloor = locationFloors.find(f => f.name === row.etage_name && f.type === 'etage');
                if (etageFloor) {
                  etage_id = etageFloor.id;
                  console.log('[DEBUG][Sortie] Found etage_id', etage_id, 'for etage_name:', row.etage_name);
                } else {
                  console.warn('[DEBUG][Sortie] Could not find etage_id for etage_name:', row.etage_name, 'in location:', row.location_name);
                }
              } else if (row.part_name) {
                const partFloor = locationFloors.find(f => f.name === row.part_name && f.type === 'part');
                if (partFloor) {
                  part_id = partFloor.id;
                  console.log('[DEBUG][Sortie] Found part_id', part_id, 'for part_name:', row.part_name);
                } else {
                  console.warn('[DEBUG][Sortie] Could not find part_id for part_name:', row.part_name, 'in location:', row.location_name);
                }
              }
            }

            groupMap[key] = {
              lot: row.batch_number || row.lot || '-',
              fabrication_date: row.fabrication_date || row.date || '',
              expiration_date: row.expiration_date || '',
              location: row.location_name || '-',
              location_id: row.location_id || null,
              etage: row.etage_name || row.part_name || '-',
              quality_status: row.quality_status || '-',
              entree: 0,
              sortie: 0,
              etage_id: etage_id,
              part_id: part_id,
              batch_number: row.batch_number || row.lot || null
            };
          }
          if (row.status === 'Entrée') groupMap[key].entree += row.quantity;
          if (row.status === 'Sortie') groupMap[key].sortie += row.quantity;
        }
        let visibleRowsForSave: any[] = Object.values(groupMap)
          .filter((row: any) => (row.entree - row.sortie) !== 0)
          .sort((a: any, b: any) => {
            const dateA = a.fabrication_date ? new Date(a.fabrication_date) : new Date(0);
            const dateB = b.fabrication_date ? new Date(b.fabrication_date) : new Date(0);
            const dateDiff = dateA.getTime() - dateB.getTime();
            if (dateDiff !== 0) return dateDiff;
            return String(a.lot).localeCompare(String(b.lot));
          });
        // Calculate Pris allocation (same as lot table)
        let remainingToTake = quantity;
        const usedRows = visibleRowsForSave.map((row: any) => {
          const disponible = row.entree - row.sortie;
          if (remainingToTake <= 0) return { ...row, pris: 0 };
          const pris = Math.min(disponible, remainingToTake);
          remainingToTake -= pris;
          return { ...row, pris };
        }).filter((row: any) => row.pris > 0);
        // 2. Build sortie movements from FIFO allocation
        // Helper to add 1 day to a date string (YYYY-MM-DD)
        function addOneDay(dateStr) {
          if (!dateStr) return dateStr;
          const d = new Date(dateStr);
          d.setDate(d.getDate() + 1);
          return d.toISOString().slice(0, 10);
        }
        const sortieMovements = usedRows.map(row => {
          console.log('[DEBUG][Sortie] Row data for movement:', {
            lot: row.lot,
            location_id: row.location_id,
            etage_id: row.etage_id,
            part_id: row.part_id,
            etage: row.etage,
            pris: row.pris
          });

          // Ensure etage_id and part_id are explicitly set
          let etage_id = row.etage_id;
          let part_id = row.part_id;

          // If IDs are null/undefined, try to look them up from floorData
          if ((!etage_id && !part_id) && (row.etage || row.location)) {
            const locationFloors = floorData[row.location] || [];
            console.log('[DEBUG][Sortie] Looking up floor IDs for location:', row.location, 'etage:', row.etage);
            console.log('[DEBUG][Sortie] Available floors:', locationFloors);

            if (row.etage && row.etage !== '-') {
              const etageFloor = locationFloors.find(f => f.name === row.etage && f.type === 'etage');
              if (etageFloor) {
                etage_id = etageFloor.id;
                console.log('[DEBUG][Sortie] Found etage_id:', etage_id, 'for etage:', row.etage);
              } else {
                const partFloor = locationFloors.find(f => f.name === row.etage && f.type === 'part');
                if (partFloor) {
                  part_id = partFloor.id;
                  console.log('[DEBUG][Sortie] Found part_id:', part_id, 'for part:', row.etage);
                }
              }
            }
          }

          // Ensure we have valid numeric IDs or null
          const finalEtageId = etage_id && !isNaN(Number(etage_id)) ? Number(etage_id) : null;
          const finalPartId = part_id && !isNaN(Number(part_id)) ? Number(part_id) : null;

          const payload = {
            product_type: 'ready',
            product_id,
            status: 'Sortie',
            quantity: row.pris,
            location_id: row.location_id, // use the source stock's location_id
            fabricationDate: row.fabrication_date ? addOneDay(String(row.fabrication_date).slice(0, 10)) : '',
            expirationDate: row.expiration_date ? addOneDay(String(row.expiration_date).slice(0, 10)) : '',
            date: row.fabrication_date ? addOneDay(String(row.fabrication_date).slice(0, 10)) : '',
            batch_number: row.batch_number,
            etage_id: finalEtageId,
            part_id: finalPartId,
            quality_status: row.quality_status, // Preserve the same quality status from the original lot
            affect_stock: false // Add this flag to prevent stock change
          };

          console.log('[DEBUG][Sortie] Final payload for movement with floor IDs:', {
            ...payload,
            etage_id_type: typeof payload.etage_id,
            part_id_type: typeof payload.part_id
          });

          return payload;
        });
        if (sortieMovements.length === 0) {
          console.error('[ERROR] No sortie movements created!');
          toast.error('Aucun mouvement de sortie n\'a été créé. Vérifiez le stock disponible.');
          return;
        }
        console.log('='.repeat(80));
        console.log('[DEBUG][Sortie] CONFIRMER LA SORTIE CLICKED - Starting sortie creation');
        console.log('[DEBUG][Sortie] Selected Product:', selectedProduct);
        console.log('[DEBUG][Sortie] Quantity:', quantity);
        console.log('[DEBUG][Sortie] Total movements to create:', sortieMovements.length);
        console.log('[DEBUG][Sortie] All payloads to POST:', sortieMovements);
        console.log('='.repeat(80));

        // Detailed analysis of each payload
        sortieMovements.forEach((payload, index) => {
          console.log(`[DEBUG][Sortie] PAYLOAD ${index + 1}/${sortieMovements.length}:`);
          console.log(`  - Product ID: ${payload.product_id}`);
          console.log(`  - Quantity: ${payload.quantity}`);
          console.log(`  - Location ID: ${payload.location_id}`);
          console.log(`  - Etage ID: ${payload.etage_id} (type: ${typeof payload.etage_id})`);
          console.log(`  - Part ID: ${payload.part_id} (type: ${typeof payload.part_id})`);
          console.log(`  - Batch Number: ${payload.batch_number}`);
          console.log(`  - Full payload:`, JSON.stringify(payload, null, 2));
          console.log('-'.repeat(40));
        });

        const sortiePromises = sortieMovements.map((payload, index) => {
          // Ensure etage_id and part_id are always present in the request
          const finalPayload = {
            ...payload
          };

          // Force include etage_id and part_id even if null
          finalPayload.etage_id = payload.etage_id || null;
          finalPayload.part_id = payload.part_id || null;

          console.log(`[DEBUG][Sortie] SENDING TO API - Request ${index + 1}:`);
          console.log(`  - URL: /api/movements`);
          console.log(`  - Method: POST`);
          console.log(`  - Final payload:`, JSON.stringify(finalPayload, null, 2));
          console.log(`  - Etage ID in final payload: ${finalPayload.etage_id} (${typeof finalPayload.etage_id})`);
          console.log(`  - Part ID in final payload: ${finalPayload.part_id} (${typeof finalPayload.part_id})`);

          return axios.post('/api/movements', finalPayload)
            .then(response => {
              console.log(`[DEBUG][Sortie] API RESPONSE ${index + 1} - SUCCESS:`, response.data);
              return response;
            })
            .catch(error => {
              console.error(`[DEBUG][Sortie] API RESPONSE ${index + 1} - ERROR:`, error.response?.data || error.message);
              throw error;
            });
        });
        await Promise.all(sortiePromises);
      }
      toast.success('Mouvement enregistré avec succès.');
      onOpenChange(false);
      onSuccess({
        type: operationType,
        ...operationForm,
        // zones: isEntry ? selectedZones : selectedExitZones // not needed for sortie
      });
    } catch (err: any) {
      toast.error('Erreur lors de l\'enregistrement du mouvement.');
    } finally {
      setIsSaving(false);
    }
  };

  // --- Render ---
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-4xl"
      >
        <div className="flex items-center mb-2">
          <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
            <ArrowLeft size={18} />
          </Button>
          <DialogHeader className="flex-1">
            <DialogTitle>Nouvelle Sortie</DialogTitle>
          </DialogHeader>
        </div>

        <div className="space-y-4">
          {/* Products List Section */}
          <div className="border rounded-md p-4">
            <h3 className="text-lg font-semibold mb-3">Produit Sélectionné</h3>

            {/* Show selected product info if pre-selected from PrisonZoneHistory */}
            {selectedProduct && product ? (
              <div className="mb-2">
                <div className="p-3 bg-gray-50 rounded-lg border">
                  <p className="font-medium">{selectedProduct.nom || selectedProduct.name}</p>
                  <p className="text-sm text-muted-foreground">
                    Référence: {selectedProduct.reference} | Unité: {selectedProduct.unite}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={() => {
                      setSelectedProduct(null);
                    }}
                  >
                    Changer de produit
                  </Button>
                </div>
              </div>
            ) : (
              /* Product select for type finis when no product is pre-selected */
              finisProducts.length > 0 ? (
                <div className="mb-2">
                  <label className="block text-sm font-medium mb-1">Produit</label>
                  <Select
                    value={selectedProduct?.id ? String(selectedProduct.id) : ''}
                    onValueChange={val => {
                      const prod = finisProducts.find(p => String(p.id) === val);
                      setSelectedProduct(prod);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un produit" />
                    </SelectTrigger>
                    <SelectContent>
                      {finisProducts.map(prod => {
                        const label = prod.name || prod.nom || prod.designation || `Produit #${prod.id}`;
                        return (
                          <SelectItem key={prod.id} value={String(prod.id)}>
                            {label}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Aucun produit fini disponible.</p>
              )
            )}



            {/* Quantity input for Sortie */}
            <div className="mb-2">
              <label className="block text-sm font-medium mb-1">Quantité totale</label>
              <Input
                type="number"
                placeholder="Quantité totale"
                value={operationForm.quantity}
                onChange={e => setOperationForm(f => ({ ...f, quantity: e.target.value }))}
              />
            </div>
          </div>

          {/* Entry Movement List Section */}
          {operationForm.quantity && parseInt(operationForm.quantity) > 0 && selectedProduct && (
            <div className="border rounded-md p-4">
              <h3 className="text-lg font-semibold mb-3">Mouvements d'Entrée Disponibles</h3>
              <div className="space-y-3">
                {(() => {
                  if (!Array.isArray(movementHistory) || movementHistory.length === 0) {
                    return <p className="text-sm text-muted-foreground">Aucun mouvement trouvé pour ce produit.</p>;
                  }
                  // Group by lot, location, etage, part for the selected product
                  const groupMap: Record<string, any> = {};
                  for (const row of movementHistory.filter(row => row.product_id === selectedProduct.id)) {
                    const key = [
                      row.batch_number || row.lot || '',
                      row.location_name || '',
                      row.etage_name || row.part_name || '',
                      row.etage_id || row.part_id || ''
                    ].join('||');
                    if (!groupMap[key]) {
                      // Determine etage_id and part_id with fallback logic
                      let etage_id = row.etage_id || null;
                      let part_id = row.part_id || null;

                      // If IDs are null but names exist, look them up from floorData
                      if (!etage_id && !part_id && (row.etage_name || row.part_name)) {
                        const locationFloors = floorData[row.location_name] || [];
                        if (row.etage_name) {
                          const etageFloor = locationFloors.find(f => f.name === row.etage_name && f.type === 'etage');
                          if (etageFloor) {
                            etage_id = etageFloor.id;
                          }
                        } else if (row.part_name) {
                          const partFloor = locationFloors.find(f => f.name === row.part_name && f.type === 'part');
                          if (partFloor) {
                            part_id = partFloor.id;
                          }
                        }
                      }

                      groupMap[key] = {
                        lot: row.batch_number || row.lot || '-',
                        fabrication_date: row.fabrication_date || row.date || '',
                        expiration_date: row.expiration_date || '',
                        location: row.location_name || '-',
                        location_id: row.location_id || null,
                        etage: row.etage_name || row.part_name || '-',
                        quality_status: row.quality_status || '-',
                        entree: 0,
                        sortie: 0,
                        etage_id: etage_id,
                        part_id: part_id,
                        batch_number: row.batch_number || row.lot || null
                      };
                    }
                    if (row.status === 'Entrée') groupMap[key].entree += row.quantity;
                    if (row.status === 'Sortie') groupMap[key].sortie += row.quantity;
                  }
                  const groupedRows = Object.values(groupMap);
                  // Only show rows where disponible != 0
                  let visibleRows = groupedRows.filter(row => (row.entree - row.sortie) !== 0);
                  // Sort by Date Fabrication (asc), then Lot (asc)
                  visibleRows = visibleRows.sort((a, b) => {
                    const dateA = a.fabrication_date ? new Date(a.fabrication_date) : new Date(0);
                    const dateB = b.fabrication_date ? new Date(b.fabrication_date) : new Date(0);
                    const dateDiff = dateA.getTime() - dateB.getTime();
                    if (dateDiff !== 0) return dateDiff;
                    return String(a.lot).localeCompare(String(b.lot));
                  });
                  // Calculate total disponible
                  const totalDisponible = visibleRows.reduce((sum, row) => sum + (row.entree - row.sortie), 0);
                  // Calculate FIFO allocation for Pris column
                  let remainingToTake = parseInt(operationForm.quantity) || 0;
                  const prisArray = visibleRows.map(row => {
                    const disponible = row.entree - row.sortie;
                    if (remainingToTake <= 0) return 0;
                    const pris = Math.min(disponible, remainingToTake);
                    remainingToTake -= pris;
                    return pris;
                  });
                  // Only show rows where Pris > 0
                  const usedRows = visibleRows.map((row, i) => ({ ...row, pris: prisArray[i] })).filter(row => row.pris > 0);
                  return (
                    <div>
                      <div className="text-sm font-medium mb-2">
                        Stock disponible par lot / emplacement :
                      </div>
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-xs border mb-2">
                          <thead>
                            <tr>
                              <th className="border px-2 py-1">Lot</th>
                              <th className="border px-2 py-1">Date Fabrication</th>
                              <th className="border px-2 py-1">Date Expiration</th>
                              <th className="border px-2 py-1">Emplacement</th>
                              <th className="border px-2 py-1">Étage/Partie</th>
                              <th className="border px-2 py-1">Entrée</th>
                              <th className="border px-2 py-1">Sortie</th>
                              <th className="border px-2 py-1">Disponible</th>
                              <th className="border px-2 py-1">Pris</th>
                            </tr>
                          </thead>
                          <tbody>
                            {usedRows.map((row, i) => (
                              <tr key={i}>
                                <td className="border px-2 py-1">{row.lot}</td>
                                <td className="border px-2 py-1">{row.fabrication_date ? new Date(row.fabrication_date).toLocaleDateString() : '-'}</td>
                                <td className="border px-2 py-1">{row.expiration_date ? new Date(row.expiration_date).toLocaleDateString() : '-'}</td>
                                <td className="border px-2 py-1">{row.location}</td>
                                <td className="border px-2 py-1">{row.etage}</td>
                                <td className="border px-2 py-1">{row.entree}</td>
                                <td className="border px-2 py-1">{row.sortie}</td>
                                <td className="border px-2 py-1">{row.entree - row.sortie}</td>
                                <td className="border px-2 py-1">{row.pris}</td>
                              </tr>
                            ))}
                            {/* Total row */}
                            <tr className="font-bold bg-gray-100">
                              <td className="border px-2 py-1" colSpan={8} style={{ textAlign: 'right' }}>Total disponible</td>
                              <td className="border px-2 py-1">{totalDisponible}</td>
                              <td className="border px-2 py-1"></td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                      {/* Show warning if user input is greater than totalDisponible */}
                      {parseInt(operationForm.quantity) > totalDisponible && (
                        <div className="text-xs text-red-600 mt-2">Stock insuffisant : la quantité demandée ({operationForm.quantity}) dépasse le stock disponible ({totalDisponible}).</div>
                      )}
                    </div>
                  );
                })()}
              </div>
              <div className="mt-2 text-sm">
                <span className="font-medium">Total demandé:</span> {operationForm.quantity}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button
            disabled={
              isSaving ||
              !operationForm.quantity ||
              parseInt(operationForm.quantity) <= 0 ||
              !selectedProduct
            }
            onClick={handleSave}
          >
            {isSaving ? 'Enregistrement...' : 'Enregistrer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PrisonOperationZone;