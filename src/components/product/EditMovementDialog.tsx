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
import { ArrowLeft, X, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';

interface EditMovementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  movement: any;
  product: any;
  locations: string[];
  floorData: Record<string, Array<{ id: number; name: string; availableCapacity: number; totalCapacity: number; type: 'etage' | 'part' }>>;
  onSuccess: () => void;
}

const EditMovementDialog: React.FC<EditMovementDialogProps> = ({
  open,
  onOpenChange,
  movement,
  product,
  locations,
  floorData,
  onSuccess
}) => {
  const [editForm, setEditForm] = useState({
    quantity: '',
    location: '',
    fabricationDate: '',
    expirationDate: '',
    batchNumber: '',
    qualityStatus: '',
    createdAt: '',
    time: '',
    fournisseur: '',
    needsExamination: false
  });
  const [showFloorSelection, setShowFloorSelection] = useState(false);
  const [selectedFloors, setSelectedFloors] = useState<Array<{ floorId: number, floorName: string, quantity: number, availableCapacity: number, type: 'etage' | 'part' }>>([]);
  const [selectedZones, setSelectedZones] = useState<Array<{ zone: string, floors: Array<{ floorId: number, floorName: string, quantity: number, availableCapacity: number, type: 'etage' | 'part' }> }>>([]);
  const [currentZoneIndex, setCurrentZoneIndex] = useState(0);
  const [showZoneSelection, setShowZoneSelection] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [fournisseurs, setFournisseurs] = useState<Array<{ id: number; designation: string }>>([]);
  const [locationIdMap, setLocationIdMap] = useState<Record<string, number>>({});

  // Fetch suppliers and location mapping
  useEffect(() => {
    if (open) {
      // Fetch suppliers
      fetch('/fournisseurs')
        .then(res => res.json())
        .then(data => setFournisseurs(data))
        .catch(() => setFournisseurs([]));

      // Fetch location ID mapping
      fetch('/api/locations')
        .then(res => res.json())
        .then(locs => {
          const map: Record<string, number> = {};
          locs.forEach((loc: any) => {
            map[loc.name] = loc.id;
          });
          setLocationIdMap(map);
        })
        .catch(() => setLocationIdMap({}));
    }
  }, [open]);

  // Initialize form when movement changes
  useEffect(() => {
    if (movement && open) {
      // Format dates for HTML date inputs (robust timezone handling)
      const formatDateForInput = (dateStr: string) => {
        if (!dateStr) return '';
        
        console.log('[DEBUG] formatDateForInput input:', dateStr);
        
        try {
          // If already in YYYY-MM-DD format, return as is
          if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
            console.log('[DEBUG] Already in YYYY-MM-DD format:', dateStr);
            return dateStr;
          }
          
          // Handle ISO datetime format
          if (dateStr.includes('T')) {
            console.log('[DEBUG] ISO format detected');
            
            // Check if this looks like a UTC datetime that was converted from a local date
            if (dateStr.includes('Z') && (dateStr.includes('T23:00:00') || dateStr.includes('T22:00:00') || dateStr.includes('T21:00:00'))) {
              // This is likely a date that was converted to UTC from a local date, correct it
              console.log('[DEBUG] UTC conversion detected, correcting...');
              const date = new Date(dateStr);
              date.setUTCDate(date.getUTCDate() + 1); // Add 1 day to correct UTC conversion
              const year = date.getUTCFullYear();
              const month = String(date.getUTCMonth() + 1).padStart(2, '0');
              const day = String(date.getUTCDate()).padStart(2, '0');
              const result = `${year}-${month}-${day}`;
              console.log('[DEBUG] Corrected result:', result);
              return result;
            } else {
              // Extract date part without timezone conversion
              const result = dateStr.split('T')[0];
              console.log('[DEBUG] Extracted date part:', result);
              return result;
            }
          }
          
          // For other formats, parse carefully to avoid timezone issues
          console.log('[DEBUG] Other format, parsing with noon time');
          const date = new Date(dateStr + 'T12:00:00'); // Use noon to avoid timezone edge cases
          if (isNaN(date.getTime())) {
            console.log('[DEBUG] Invalid date');
            return '';
          }
          
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          const result = `${year}-${month}-${day}`;
          console.log('[DEBUG] Final result:', result);
          return result;
        } catch (error) {
          console.log('[DEBUG] Error formatting date:', error);
          return '';
        }
      };

      // Format time for HTML time input
      const formatTimeForInput = (timeStr: string) => {
        if (!timeStr) return '';
        if (timeStr.includes(':')) {
          return timeStr.slice(0, 5); // HH:mm
        }
        return timeStr;
      };

      // Format movement date
      const movementDate = formatDateForInput(movement.created_at || movement.date || '');

      setEditForm({
        quantity: String(movement.quantity || ''),
        location: movement.location_name || '',
        fabricationDate: formatDateForInput(movement.fabrication_date || ''),
        expirationDate: formatDateForInput(movement.expiration_date || ''),
        batchNumber: movement.batch_number || movement.lot || '',
        qualityStatus: movement.quality_status || '',
        createdAt: movementDate,
        time: formatTimeForInput(movement.time || ''),
        fournisseur: String(movement.fournisseur_id || ''),
        needsExamination: movement.needs_examination || false
      });

      // Initialize floor selection if location is set
      if (movement.location_name) {
        handleLocationChange(movement.location_name, movement);
      }
    }
  }, [movement, open]);

  // Get available floors for a location
  const getAvailableFloors = (locationName: string) => {
    return floorData[locationName] || [];
  };

  // Handle location change (for initial load)
  const handleLocationChange = (locationName: string, currentMovement?: any) => {
    setEditForm(prev => ({ ...prev, location: locationName }));
    
    const availableFloors = getAvailableFloors(locationName);
    
    if (availableFloors.length > 0) {
      // Initialize floors with current movement data
      const initialFloors = availableFloors.map(floor => {
        const isCurrentFloor = currentMovement && 
          (floor.name === currentMovement.etage_name || floor.name === currentMovement.part_name);
        
        return {
          floorId: floor.id,
          floorName: floor.name,
          quantity: isCurrentFloor ? (currentMovement?.quantity || 0) : 0,
          availableCapacity: floor.availableCapacity + (isCurrentFloor ? (currentMovement?.quantity || 0) : 0), // Add back current quantity
          type: floor.type,
        };
      });

      setSelectedFloors(initialFloors);
      setSelectedZones([{
        zone: locationName,
        floors: initialFloors
      }]);
      setCurrentZoneIndex(0);
      setShowFloorSelection(true);
      setShowZoneSelection(false);
    } else {
      setSelectedFloors([]);
      setSelectedZones([]);
      setShowFloorSelection(false);
      setShowZoneSelection(false);
    }
  };

  // Handle location change with auto-distribution (for zone change)
  const handleLocationChangeWithAutoDistribute = (newLocationName: string) => {
    console.log('[DEBUG] Changing location from', editForm.location, 'to', newLocationName);
    
    setEditForm(prev => ({ ...prev, location: newLocationName }));
    
    const availableFloors = getAvailableFloors(newLocationName);
    const totalQuantity = parseInt(editForm.quantity) || 0;
    
    console.log('[DEBUG] Available floors in new location:', availableFloors);
    console.log('[DEBUG] Total quantity to distribute:', totalQuantity);
    
    if (availableFloors.length > 0 && totalQuantity > 0) {
      // Check total available capacity first
      const totalCapacity = availableFloors.reduce((sum, floor) => sum + floor.availableCapacity, 0);
      
      if (totalCapacity < totalQuantity) {
        toast.error(`Capacité insuffisante dans ${newLocationName}. Capacité disponible: ${totalCapacity}/${totalQuantity} ${product?.unite}`);
        setShowZoneSelection(false);
        return;
      }

      // Auto-distribute the quantity across available floors
      let remaining = totalQuantity;
      const distributedFloors = availableFloors.map(floor => {
        const allocate = Math.min(remaining, floor.availableCapacity);
        remaining -= allocate;
        
        console.log('[DEBUG] Floor distribution:', {
          floorName: floor.name,
          floorType: floor.type,
          allocated: allocate,
          capacity: floor.availableCapacity,
          remaining: remaining
        });
        
        return {
          floorId: floor.id,
          floorName: floor.name,
          quantity: allocate,
          availableCapacity: floor.availableCapacity,
          type: floor.type,
        };
      });

      // Validate distribution
      const totalDistributed = distributedFloors.reduce((sum, floor) => sum + floor.quantity, 0);
      const hasValidDistribution = distributedFloors.some(floor => floor.quantity > 0);
      
      if (!hasValidDistribution) {
        toast.error(`Impossible de distribuer la quantité dans ${newLocationName}`);
        setShowZoneSelection(false);
        return;
      }

      setSelectedFloors(distributedFloors);
      setSelectedZones([{
        zone: newLocationName,
        floors: distributedFloors
      }]);
      setCurrentZoneIndex(0);
      setShowFloorSelection(true);
      setShowZoneSelection(false);

      // Success message with distribution details
      const floorTypes = [...new Set(distributedFloors.filter(f => f.quantity > 0).map(f => f.type))];
      const typeText = floorTypes.includes('etage') ? 'étages' : 'places';
      
      if (totalDistributed === totalQuantity) {
        toast.success(`Quantité distribuée automatiquement dans ${newLocationName} (${typeText})`);
      } else {
        toast.warning(`Distribution partielle: ${totalDistributed}/${totalQuantity} ${product?.unite} dans ${newLocationName}`);
      }
      
      console.log('[DEBUG] Distribution completed:', {
        totalQuantity,
        totalDistributed,
        floors: distributedFloors.filter(f => f.quantity > 0)
      });
      
    } else {
      setSelectedFloors([]);
      setSelectedZones([]);
      setShowFloorSelection(false);
      setShowZoneSelection(false);
      
      if (totalQuantity > 0) {
        toast.error(`Aucun ${availableFloors.length > 0 ? 'espace disponible' : 'étage/place'} dans ${newLocationName}`);
      }
    }
  };

  // Handle floor quantity change with validation
  const handleFloorQuantityChange = (floorId: number, quantity: number) => {
    const targetFloor = selectedFloors.find(f => f.floorId === floorId);
    
    if (!targetFloor) {
      console.error('[DEBUG] Floor not found:', floorId);
      return;
    }

    // Validate quantity against available capacity
    const validatedQuantity = Math.min(Math.max(0, quantity), targetFloor.availableCapacity);
    
    if (quantity > targetFloor.availableCapacity) {
      toast.warning(`Quantité limitée à ${targetFloor.availableCapacity} ${product?.unite} pour ${targetFloor.floorName}`);
    }

    const updatedFloors = selectedFloors.map(floor => 
      floor.floorId === floorId 
        ? { ...floor, quantity: validatedQuantity }
        : floor
    );
    
    setSelectedFloors(updatedFloors);

    // Update the current zone in selectedZones
    setSelectedZones(prev => prev.map((zone, index) => 
      index === currentZoneIndex 
        ? { ...zone, floors: updatedFloors }
        : zone
    ));

    // Log the change for debugging
    console.log('[DEBUG] Floor quantity changed:', {
      floorId,
      floorName: targetFloor.floorName,
      floorType: targetFloor.type,
      oldQuantity: targetFloor.quantity,
      newQuantity: validatedQuantity,
      capacity: targetFloor.availableCapacity
    });

    // Update total quantity in form
    const totalQuantity = updatedFloors.reduce((sum, floor) => sum + floor.quantity, 0);
    setEditForm(prev => ({ ...prev, quantity: String(totalQuantity) }));
  };

  // Zone management functions
  const switchToZone = (zoneIndex: number) => {
    setCurrentZoneIndex(zoneIndex);
    if (selectedZones[zoneIndex]) {
      setEditForm(prev => ({ ...prev, location: selectedZones[zoneIndex].zone }));
      setSelectedFloors(selectedZones[zoneIndex].floors);
    }
  };

  const addNewZone = (newZone: string) => {
    const availableFloors = getAvailableFloors(newZone);
    const newZoneFloors = availableFloors.map(floor => ({
      floorId: floor.id,
      floorName: floor.name,
      quantity: 0,
      availableCapacity: floor.availableCapacity,
      type: floor.type,
    }));

    setSelectedZones(prev => {
      const updated = [...prev, { zone: newZone, floors: newZoneFloors }];
      setCurrentZoneIndex(updated.length - 1);
      setSelectedFloors(newZoneFloors);
      setEditForm(prevForm => ({ ...prevForm, location: newZone }));
      return updated;
    });
    setShowZoneSelection(false);
  };

  const removeZone = (zoneIndex: number) => {
    setSelectedZones(prev => {
      const newZones = prev.filter((_, idx) => idx !== zoneIndex);
      if (newZones.length === 0) {
        setSelectedFloors([]);
        setCurrentZoneIndex(0);
        setEditForm(prev => ({ ...prev, location: '' }));
        setShowFloorSelection(false);
        return [];
      } else {
        const newCurrent = zoneIndex === 0 ? 0 : Math.min(zoneIndex - 1, newZones.length - 1);
        setCurrentZoneIndex(newCurrent);
        setSelectedFloors(newZones[newCurrent].floors);
        setEditForm(prev => ({ ...prev, location: newZones[newCurrent].zone }));
        return newZones;
      }
    });
  };

  // Calculate total selected quantity across all zones
  const totalSelectedQuantity = selectedZones.reduce((sum, zone) =>
    sum + zone.floors.reduce((zoneSum, floor) => zoneSum + floor.quantity, 0), 0
  );

  // Auto-distribution function
  const handleTotalQuantityChange = (quantity: string) => {
    setEditForm(prev => ({ ...prev, quantity }));
    if (selectedZones.length > 0 && quantity && parseInt(quantity) > 0) {
      const distributed = distributeQuantityAcrossZones(parseInt(quantity), selectedZones);
      setSelectedZones(distributed);
      setSelectedFloors(distributed[currentZoneIndex]?.floors || []);
    }
  };

  // Distribute quantity across zones/floors
  function distributeQuantityAcrossZones(totalQuantity: number, zones: typeof selectedZones) {
    let remaining = totalQuantity;
    return zones.map(zone => {
      const availableFloors = getAvailableFloors(zone.zone);
      const newFloors = availableFloors.map(floor => {
        if (remaining <= 0) return { 
          floorId: floor.id, 
          floorName: floor.name, 
          quantity: 0, 
          availableCapacity: floor.availableCapacity, 
          type: floor.type 
        };
        const qty = Math.min(remaining, floor.availableCapacity);
        remaining -= qty;
        return { 
          floorId: floor.id, 
          floorName: floor.name, 
          quantity: qty, 
          availableCapacity: floor.availableCapacity, 
          type: floor.type 
        };
      });
      return { zone: zone.zone, floors: newFloors };
    });
  }

  // Manual distribute function
  const handleManualDistribute = () => {
    if (!editForm.quantity || selectedZones.length === 0) return;
    const distributed = distributeQuantityAcrossZones(parseInt(editForm.quantity) || 0, selectedZones);
    setSelectedZones(distributed);
    if (distributed[currentZoneIndex]) {
      setSelectedFloors(distributed[currentZoneIndex].floors);
    } else {
      setSelectedFloors([]);
    }
  };

  // Handle save
  const handleSave = async () => {
    if (!movement) return;

    // Validation
    if (!editForm.quantity || parseFloat(editForm.quantity) <= 0) {
      toast.error('Veuillez saisir une quantité valide');
      return;
    }

    if (!editForm.location) {
      toast.error('Veuillez sélectionner un emplacement');
      return;
    }

    // Only validate supplier if the movement originally had one
    if (movement.status === 'Entrée' && (movement.fournisseur_id || movement.fournisseur_name) && !editForm.fournisseur) {
      toast.error('Veuillez sélectionner un fournisseur pour une entrée');
      return;
    }

    // Validate floor selection for locations with floors
    if (selectedFloors.length > 0) {
      const totalFloorQuantity = selectedFloors.reduce((sum, floor) => sum + floor.quantity, 0);
      const targetQuantity = parseFloat(editForm.quantity);
      
      if (Math.abs(totalFloorQuantity - targetQuantity) > 0.01) { // Allow small floating point differences
        toast.error(`La quantité distribuée (${totalFloorQuantity}) doit correspondre à la quantité totale (${targetQuantity})`);
        return;
      }

      const floorsWithQuantity = selectedFloors.filter(floor => floor.quantity > 0);
      if (floorsWithQuantity.length === 0) {
        toast.error('Veuillez distribuer la quantité sur au moins un étage/place');
        return;
      }

      // Validate floor types consistency
      const floorTypes = [...new Set(floorsWithQuantity.map(f => f.type))];
      if (floorTypes.length > 1) {
        toast.error('Impossible de mélanger les types d\'étages et de places dans un même mouvement');
        return;
      }

      // Additional validation for capacity
      const invalidFloors = floorsWithQuantity.filter(floor => floor.quantity > floor.availableCapacity);
      if (invalidFloors.length > 0) {
        const floorNames = invalidFloors.map(f => f.floorName).join(', ');
        toast.error(`Capacité insuffisante pour: ${floorNames}`);
        return;
      }

      console.log('[DEBUG] Floor validation passed:', {
        totalFloorQuantity,
        targetQuantity,
        floorsWithQuantity: floorsWithQuantity.length,
        floorTypes
      });
    }

    setIsSaving(true);

    try {
      // Prepare update data
      const updateData: any = {
        quantity: parseFloat(editForm.quantity),
        location_name: editForm.location,
        batch_number: editForm.batchNumber,
        fabrication_date: editForm.fabricationDate || null,
        expiration_date: editForm.expirationDate || null
      };

      // Add movement date if changed
      if (editForm.createdAt) {
        updateData.date = editForm.createdAt;
      }

      // Add supplier for entries (only if movement originally had one)
      if (movement.status === 'Entrée' && (movement.fournisseur_id || movement.fournisseur_name) && editForm.fournisseur) {
        updateData.fournisseur_id = parseInt(editForm.fournisseur);
      }

      // Handle floor/part information with proper cleanup
      // First, clear any existing floor/part references to avoid conflicts
      updateData.etage_id = null;
      updateData.etage_name = null;
      updateData.part_id = null;
      updateData.part_name = null;

      // Then set the new floor/part information
      if (selectedFloors.length > 0) {
        const selectedFloor = selectedFloors.find(floor => floor.quantity > 0);
        
        if (selectedFloor) {
          console.log('[DEBUG] Selected floor for update:', selectedFloor);
          
          if (selectedFloor.type === 'etage') {
            updateData.etage_id = selectedFloor.floorId;
            updateData.etage_name = selectedFloor.floorName;
            // Ensure part fields are explicitly null
            updateData.part_id = null;
            updateData.part_name = null;
            console.log('[DEBUG] Setting etage:', selectedFloor.floorId, selectedFloor.floorName);
          } else if (selectedFloor.type === 'part') {
            updateData.part_id = selectedFloor.floorId;
            updateData.part_name = selectedFloor.floorName;
            // Ensure etage fields are explicitly null
            updateData.etage_id = null;
            updateData.etage_name = null;
            console.log('[DEBUG] Setting part:', selectedFloor.floorId, selectedFloor.floorName);
          }
        }
      }

      console.log('Updating movement with data:', updateData);

      const response = await fetch(`/api/movements/${movement.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      if (response.ok) {
        toast.success('Mouvement modifié avec succès');
        
        // Force refresh of floor data by refetching locations
        fetch('/api/locations')
          .then(res => res.json())
          .then(locs => {
            console.log('[DEBUG] Refreshed location data after movement update');
          })
          .catch(err => console.error('[DEBUG] Error refreshing location data:', err));
        
        onSuccess();
        onOpenChange(false);
      } else {
        const errorData = await response.json().catch(() => ({}));
        toast.error(errorData.error || 'Erreur lors de la modification du mouvement');
      }
    } catch (error) {
      console.error('Update error:', error);
      toast.error('Erreur lors de la modification du mouvement');
    } finally {
      setIsSaving(false);
    }
  };

  // Validation function to check if there's a quantity distribution mismatch
  const hasQuantityMismatch = () => {
    if (!editForm.quantity || selectedFloors.length === 0) return false;
    
    const totalFloorQuantity = selectedFloors.reduce((sum, floor) => sum + floor.quantity, 0);
    const targetQuantity = parseInt(editForm.quantity) || 0;
    
    return Math.abs(totalFloorQuantity - targetQuantity) > 0.01; // Allow small floating point differences
  };

  // Check if save button should be disabled
  const isSaveDisabled = isSaving || hasQuantityMismatch();

  if (!movement) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Modifier le mouvement</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Movement Info */}
          <div className="bg-muted/50 p-3 rounded-lg">
            <p className="text-sm font-medium">Mouvement: {movement.status}</p>
            <p className="text-sm text-muted-foreground">
              ID: {movement.id} | Produit: {product?.nom}
            </p>
          </div>

          {/* Three Dates Section */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium">Date du mouvement</label>
              <Input
                type="date"
                value={editForm.createdAt}
                onChange={(e) => setEditForm(prev => ({ ...prev, createdAt: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Date de fabrication</label>
              <Input
                type="date"
                value={editForm.fabricationDate}
                onChange={(e) => setEditForm(prev => ({ ...prev, fabricationDate: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Date d'expiration</label>
              <Input
                type="date"
                value={editForm.expirationDate}
                onChange={(e) => setEditForm(prev => ({ ...prev, expirationDate: e.target.value }))}
              />
            </div>
          </div>

          {/* Quantity */}
          <div>
            <label className="text-sm font-medium">Quantité ({product?.unite})</label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={editForm.quantity}
              onChange={(e) => handleTotalQuantityChange(e.target.value)}
              placeholder="Quantité"
            />
          </div>

          {/* Supplier (only for entries that originally had a supplier) */}
          {movement.status === 'Entrée' && (movement.fournisseur_id || movement.fournisseur_name) && (
            <div>
              <label className="text-sm font-medium">Fournisseur</label>
              <Select value={editForm.fournisseur} onValueChange={(value) => setEditForm(prev => ({ ...prev, fournisseur: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un fournisseur" />
                </SelectTrigger>
                <SelectContent>
                  {fournisseurs.map(f => (
                    <SelectItem key={f.id} value={String(f.id)}>
                      {f.designation}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}



          {/* Location Management Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Emplacement</label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowZoneSelection(true)}
              >
                Changer zone
              </Button>
            </div>

            {/* Current Location Display */}
            <div className="p-3 bg-muted/50 rounded-lg">
              <div className="text-sm font-medium">Emplacement actuel: {editForm.location}</div>
              <div className="text-xs text-muted-foreground mt-1">
                Quantité: {editForm.quantity} {product?.unite}
              </div>
            </div>

            {/* Zone Change Selection */}
            {showZoneSelection && (
              <div className="border rounded-lg p-4 bg-blue-50">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium">Changer vers un nouvel emplacement</h4>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowZoneSelection(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <Select onValueChange={handleLocationChangeWithAutoDistribute}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner le nouvel emplacement" />
                  </SelectTrigger>
                  <SelectContent>
                    {locations
                      .filter(loc => loc !== editForm.location) // Exclude current location
                      .map(location => (
                        <SelectItem key={location} value={location}>
                          {location}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Floor Selection for Current Location */}
            {showFloorSelection && selectedFloors.length > 0 && (
              <div className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium">Répartition par étage/place</h4>
                  <div className="text-sm text-muted-foreground">
                    {editForm.location}
                  </div>
                </div>
                
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {selectedFloors.map(floor => (
                    <div key={floor.floorId} className="flex items-center justify-between gap-3 p-3 border rounded-lg hover:bg-muted/20">
                      <div className="flex-1">
                        <div className="font-medium text-sm">{floor.floorName}</div>
                        <div className="text-xs text-muted-foreground">
                          Capacité disponible: {floor.availableCapacity} {product?.unite}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min="0"
                          max={floor.availableCapacity}
                          value={floor.quantity}
                          onChange={(e) => handleFloorQuantityChange(floor.floorId, parseInt(e.target.value) || 0)}
                          className="w-20"
                          placeholder="0"
                        />
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {product?.unite}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Floor Summary */}
                <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                  <div className="flex justify-between text-sm">
                    <span>Total distribué:</span>
                    <span className="font-medium">
                      {selectedFloors.reduce((sum, floor) => sum + floor.quantity, 0)} {product?.unite}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm mt-1">
                    <span>Quantité requise:</span>
                    <span className="font-medium">
                      {editForm.quantity} {product?.unite}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm mt-1 pt-1 border-t">
                    <span>Capacité disponible totale:</span>
                    <span className="text-muted-foreground">
                      {selectedFloors.reduce((sum, floor) => sum + floor.availableCapacity, 0)} {product?.unite}
                    </span>
                  </div>
                </div>

                {/* Validation Warning */}
                {editForm.quantity && selectedFloors.reduce((sum, floor) => sum + floor.quantity, 0) !== parseInt(editForm.quantity) && (
                  <div className="mt-3 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <p className="text-sm text-yellow-800">
                      ⚠️ La quantité distribuée ne correspond pas à la quantité totale
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
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Annuler
          </Button>
          <Button 
            onClick={handleSave}
            disabled={isSaveDisabled}
          >
            {isSaving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                Enregistrement...
              </>
            ) : (
              'Enregistrer les modifications'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditMovementDialog;