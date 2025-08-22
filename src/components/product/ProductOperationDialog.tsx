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
import { X, ArrowLeft, QrCode, Camera } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import { useRef } from 'react';
// QR code generation imports removed - dialog functionality no longer needed

interface ProductOperationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  operationType: 'Entrée' | 'Sortie' | 'Nouveau Produit' | 'Complément Stock' | 'Transfer' | '';
  onSuccess: (info: any) => void;
  product: any;
  locations: string[];
  floorData: Record<string, Array<{ id: number; name: string; availableCapacity: number; totalCapacity: number; type: 'etage' | 'part' }>>;
  movementHistory?: any[]; // <-- Add this prop
  onDataChanged?: () => void; // <-- Add this prop
}

const ProductOperationDialog: React.FC<ProductOperationDialogProps> = ({
  open,
  onOpenChange,
  operationType,
  onSuccess,
  product,
  locations: propLocations,
  floorData: propFloorData,
  movementHistory: propMovementHistory = [],
  onDataChanged,
}) => {
  // --- State ---
  const [operationForm, setOperationForm] = useState({
    fournisseur: '',
    quantity: '',
    location: '',
    floor: '',
    floorQuantity: '',
    fabricationDate: '', // new
    expirationDate: '',   // new
    batchNumber: '', // new
    needsExamination: true, // new - default to true (needs examination)
    qualityStatus: null as string | null, // new - will be set based on examination choice
    createdAt: '' // new - for entry date
  });
  // Add sortieType state
  const [sortieType, setSortieType] = useState<'local' | 'out'>('local');
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
  // Print recipe state for Complément Stock
  const [showPrintOption, setShowPrintOption] = useState(false);
  const [shouldPrintRecipe, setShouldPrintRecipe] = useState(false);
  // Auto-complete state for Complément Stock
  const [isLotLookupLoading, setIsLotLookupLoading] = useState(false);
  const [lotLookupError, setLotLookupError] = useState('');
  const [lotFound, setLotFound] = useState(false);
  // QR Code state (keeping only what's needed for scanning)
  // Removed qrCodeData, qrDataObject, and showQrCode states as they were only used for the dialog
  // QR Scanner state for Complément Stock and Transfer
  const [showQrScanner, setShowQrScanner] = useState(false);
  const [scannerLoading, setScannerLoading] = useState(false);
  const [manualJsonInput, setManualJsonInput] = useState('');
  // Transfer state
  const [transferSourceLocation, setTransferSourceLocation] = useState('');
  const [transferDestinationLocation, setTransferDestinationLocation] = useState('');
  const [transferSourceFloors, setTransferSourceFloors] = useState<Array<{ floorId: number, floorName: string, quantity: number, availableCapacity: number, type: 'etage' | 'part' }>>([]);
  const [transferDestinationFloors, setTransferDestinationFloors] = useState<Array<{ floorId: number, floorName: string, quantity: number, availableCapacity: number, type: 'etage' | 'part' }>>([]);
  const [transferStep, setTransferStep] = useState<'scan' | 'source' | 'destination'>('scan');
  const [transferQuantityMode, setTransferQuantityMode] = useState<'all' | 'partial'>('all');
  // Loading state for save operation
  const [isSaving, setIsSaving] = useState(false);

  // Helper function to validate JSON
  const isValidJson = (str: string) => {
    try {
      JSON.parse(str);
      return true;
    } catch (e) {
      return false;
    }
  };

  // Helper function to validate pipe-separated format for Complément Stock
  const isValidPipeSeparatedFormat = (str: string) => {
    if (!str.includes('|')) return false;
    const parts = str.split('|');
    if (parts.length !== 3) return false;
    const [lotNumber, quantity, floorId] = parts.map(part => part.trim());
    return lotNumber && !isNaN(parseInt(quantity)) && !isNaN(parseInt(floorId));
  };

  // Helper function to validate QR code format
  const isValidQRFormat = (str: string) => {
    if (operationType === 'Complément Stock' || operationType === 'Transfer') {
      return isValidPipeSeparatedFormat(str) || isValidJson(str);
    }
    return isValidJson(str);
  };

  // Handle QR Code scanning for Complément Stock
  const handleQRCodeScan = async (qrData: string) => {
    console.log('[DEBUG] handleQRCodeScan called with:', qrData);

    if (!qrData.trim()) {
      console.log('[DEBUG] Empty QR data, returning');
      return;
    }

    // Check if this is the new pipe-separated format for Complément Stock or Transfer
    if ((operationType === 'Complément Stock' || operationType === 'Transfer') && qrData.includes('|')) {
      console.log('[DEBUG] Detected pipe-separated format for', operationType);
      if (operationType === 'Complément Stock') {
        await handlePipeSeparatedQRCode(qrData);
      } else if (operationType === 'Transfer') {
        await handleTransferPipeSeparatedQRCode(qrData);
      }
      return;
    }

    // Handle legacy JSON format (for Transfer and other operations)
    try {
      const parsedData = JSON.parse(qrData);
      console.log('[DEBUG] Parsed QR data:', parsedData);

      // Validate QR code data structure
      if (!parsedData.productId || !parsedData.batchNumber) {
        console.log('[DEBUG] Missing productId or batchNumber');
        toast.error('QR code invalide: données manquantes');
        return;
      }

      // Check if this is for the currently selected product
      if (!product || parsedData.productId !== product.id) {
        console.log('[DEBUG] Product mismatch. QR productId:', parsedData.productId, 'Current product id:', product?.id);
        toast.error('Ce QR code ne correspond pas au produit sélectionné');
        return;
      }

      // Handle Transfer operation type
      if (operationType === 'Transfer') {
        await handleTransferQRCodeScan(parsedData);
        return;
      }

      // Use the batch number from QR code to lookup lot information
      const batchNumber = parsedData.batchNumber;
      console.log('[DEBUG] Extracted batch number:', batchNumber);

      // Close scanner
      setShowQrScanner(false);
      setScannerLoading(false);

      // Clear any previous errors
      setLotLookupError('');

      console.log('[DEBUG] Available locations:', locations);
      console.log('[DEBUG] Available fournisseurs:', fournisseurs);

      // Helper function to format dates from QR code
      const formatDateFromQR = (dateStr: string) => {
        console.log('[DEBUG] formatDateFromQR input:', dateStr);
        if (!dateStr) return '';
        try {
          // Handle ISO date format (YYYY-MM-DDTHH:mm:ss.sssZ)
          const date = new Date(dateStr);
          if (isNaN(date.getTime())) return '';

          // Use local date methods to avoid timezone conversion
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');

          const result = `${year}-${month}-${day}`;
          console.log('[DEBUG] formatDateFromQR result:', result);
          return result;
        } catch (error) {
          console.log('[DEBUG] formatDateFromQR error:', error);
          return '';
        }
      };

      // First, try to use data directly from QR code
      console.log('[DEBUG] Using QR code data directly');

      // Find supplier by name from QR code
      let supplierId = '';
      if (parsedData.supplier) {
        const supplier = fournisseurs.find(f =>
          f.designation.toLowerCase() === parsedData.supplier.toLowerCase()
        );
        if (supplier) {
          supplierId = String(supplier.id);
          console.log('[DEBUG] Found supplier:', supplier.designation, 'ID:', supplier.id);
        } else {
          console.log('[DEBUG] Supplier not found in list:', parsedData.supplier);
        }
      }

      // Format dates from QR code
      const fabricationDateFormatted = formatDateFromQR(parsedData.fabricationDate || '');
      const expirationDateFormatted = formatDateFromQR(parsedData.expirationDate || '');

      console.log('[DEBUG] QR code formatted dates:', {
        fabricationDate: fabricationDateFormatted,
        expirationDate: expirationDateFormatted
      });

      // Auto-fill form with QR code data
      console.log('[DEBUG] Auto-filling form with QR data');
      console.log('[DEBUG] Supplier ID found:', supplierId);
      console.log('[DEBUG] Formatted dates:', { fabricationDateFormatted, expirationDateFormatted });

      setOperationForm(prev => ({
        ...prev,
        fournisseur: supplierId,
        fabricationDate: fabricationDateFormatted,
        expirationDate: expirationDateFormatted,
        batchNumber: batchNumber,
        quantity: String(parsedData.quantity || ''),
        needsExamination: false, // Default to no examination for Complément Stock
        qualityStatus: 'conforme' // Default to conforme for Complément Stock
      }));

      console.log('[DEBUG] Form updated with QR data');

      // Auto-select the location from QR code if available
      console.log('[DEBUG] Checking location auto-selection. QR location:', parsedData.location);
      console.log('[DEBUG] Available locations:', locations);

      if (parsedData.location && locations.includes(parsedData.location)) {
        console.log('[DEBUG] Auto-selecting location from QR:', parsedData.location);
        handleLocationChange(parsedData.location);

        // If floors data is available in QR code, try to auto-select floors
        if (parsedData.floors && Array.isArray(parsedData.floors)) {
          console.log('[DEBUG] Auto-selecting floors from QR:', parsedData.floors);
          setTimeout(() => {
            // Use setTimeout to ensure location change has been processed
            const availableFloors = getAvailableFloors(parsedData.location);
            console.log('[DEBUG] Available floors for location:', availableFloors);

            const updatedFloors = availableFloors.map(floor => {
              const qrFloor = parsedData.floors.find(f => f.name === floor.name);
              const quantity = qrFloor ? Math.min(qrFloor.quantity, floor.availableCapacity) : 0;
              console.log('[DEBUG] Floor mapping:', {
                floorName: floor.name,
                qrFloor: qrFloor,
                quantity: quantity,
                availableCapacity: floor.availableCapacity
              });
              return {
                floorId: floor.id,
                floorName: floor.name,
                quantity: quantity,
                availableCapacity: floor.availableCapacity,
                type: floor.type,
              };
            });

            console.log('[DEBUG] Updated floors:', updatedFloors);
            setSelectedFloors(updatedFloors);
            setSelectedZones([{
              zone: parsedData.location,
              floors: updatedFloors
            }]);
            console.log('[DEBUG] Floors and zones updated');
          }, 100);
        } else {
          console.log('[DEBUG] No floors data in QR code or floors is not an array');
        }
      } else {
        console.log('[DEBUG] Location not found in available locations or missing from QR');
      }

      // Set lot found to show the rest of the form
      setLotFound(true);
      console.log('[DEBUG] Lot found set to true');

      toast.success(`QR code scanné: Lot ${batchNumber} - Données auto-remplies`);

      // Also try to lookup in movement history for additional validation
      console.log('[DEBUG] Also performing lookup in movement history for validation');
      await handleLotNumberLookup(batchNumber);

    } catch (error) {
      console.error('[DEBUG] Error parsing QR code:', error);
      console.error('[DEBUG] Error details:', error);
      toast.error('QR code invalide: format incorrect');
    }
  };

  // Handle pipe-separated QR Code format for Complément Stock: (lot number)|(quantity)|(floorID)
  const handlePipeSeparatedQRCode = async (qrData: string) => {
    console.log('[DEBUG] handlePipeSeparatedQRCode called with:', qrData);

    try {
      // Parse the pipe-separated format: (lot number)|(quantity)|(floorID)
      const parts = qrData.split('|');
      
      if (parts.length !== 3) {
        console.log('[DEBUG] Invalid pipe-separated format. Expected 3 parts, got:', parts.length);
        toast.error('Format QR code invalide. Format attendu: (lot)|(quantité)|(étageID)');
        return;
      }

      const [lotNumber, quantity, floorId] = parts.map(part => part.trim());
      
      console.log('[DEBUG] Parsed pipe-separated data:', {
        lotNumber,
        quantity,
        floorId
      });

      // Validate the parsed data
      if (!lotNumber) {
        console.log('[DEBUG] Missing lot number');
        toast.error('Numéro de lot manquant dans le QR code');
        return;
      }

      if (!quantity || isNaN(parseInt(quantity))) {
        console.log('[DEBUG] Invalid quantity:', quantity);
        toast.error('Quantité invalide dans le QR code');
        return;
      }

      if (!floorId || isNaN(parseInt(floorId))) {
        console.log('[DEBUG] Invalid floor ID:', floorId);
        toast.error('ID d\'étage invalide dans le QR code');
        return;
      }

      // Close scanner
      setShowQrScanner(false);
      setScannerLoading(false);

      // Clear any previous errors
      setLotLookupError('');

      // Set the lot number in the form
      setOperationForm(prev => ({
        ...prev,
        batchNumber: lotNumber,
        quantity: quantity,
        needsExamination: false, // Default to no examination for Complément Stock
        qualityStatus: 'conforme' // Default to conforme for Complément Stock
      }));

      console.log('[DEBUG] Form updated with pipe-separated QR data');

      // Try to find the floor by ID and auto-select location
      const floorIdNum = parseInt(floorId);
      let foundLocation = '';
      let foundFloor = null;

      // Search through all locations and floors to find the matching floor ID
      for (const [locationName, floors] of Object.entries(floorData)) {
        const floor = floors.find(f => f.id === floorIdNum);
        if (floor) {
          foundLocation = locationName;
          foundFloor = floor;
          console.log('[DEBUG] Found floor:', floor, 'in location:', locationName);
          break;
        }
      }

      if (foundLocation && foundFloor) {
        console.log('[DEBUG] Auto-selecting location and floor from QR:', foundLocation, foundFloor.name);
        
        // Auto-select the location
        handleLocationChange(foundLocation);

        // Auto-select the specific floor with the quantity from QR code
        setTimeout(() => {
          // Use setTimeout to ensure location change has been processed
          const availableFloors = getAvailableFloors(foundLocation);
          console.log('[DEBUG] Available floors for location:', availableFloors);

          const updatedFloors = availableFloors.map(floor => {
            // Set quantity only for the specific floor from QR code
            const floorQuantity = floor.id === floorIdNum ? Math.min(parseInt(quantity), floor.availableCapacity) : 0;
            console.log('[DEBUG] Floor mapping:', {
              floorName: floor.name,
              floorId: floor.id,
              isTargetFloor: floor.id === floorIdNum,
              quantity: floorQuantity,
              availableCapacity: floor.availableCapacity
            });
            return {
              floorId: floor.id,
              floorName: floor.name,
              quantity: floorQuantity,
              availableCapacity: floor.availableCapacity,
              type: floor.type,
            };
          });

          console.log('[DEBUG] Updated floors:', updatedFloors);
          setSelectedFloors(updatedFloors);
          setSelectedZones([{
            zone: foundLocation,
            floors: updatedFloors
          }]);
          console.log('[DEBUG] Floors and zones updated for pipe-separated QR');
        }, 100);
      } else {
        console.log('[DEBUG] Floor ID not found in available floors:', floorIdNum);
        toast.error(`Étage avec ID ${floorId} non trouvé dans les emplacements disponibles`);
      }

      // Set lot found to show the rest of the form
      setLotFound(true);
      console.log('[DEBUG] Lot found set to true');

      toast.success(`QR code scanné: Lot ${lotNumber} - Quantité ${quantity} - Étage ID ${floorId}`);

      // Also try to lookup in movement history for additional validation and auto-fill
      console.log('[DEBUG] Also performing lookup in movement history for validation');
      await handleLotNumberLookup(lotNumber);

    } catch (error) {
      console.error('[DEBUG] Error parsing pipe-separated QR code:', error);
      toast.error('Erreur lors du traitement du QR code');
    }
  };

  // Handle QR Code scanning for Transfer operations
  const handleTransferQRCodeScan = async (qrData: any) => {
    console.log('[DEBUG] handleTransferQRCodeScan called with:', qrData);

    try {
      // Use the batch number from QR code to lookup lot information
      const batchNumber = qrData.batchNumber;
      console.log('[DEBUG] Transfer - Extracted batch number:', batchNumber);

      // Close scanner
      setShowQrScanner(false);
      setScannerLoading(false);

      // Clear any previous errors
      setLotLookupError('');

      // Helper function to format dates from QR code
      const formatDateFromQR = (dateStr: string) => {
        console.log('[DEBUG] Transfer formatDateFromQR input:', dateStr);
        if (!dateStr) return '';
        try {
          const date = new Date(dateStr);
          if (isNaN(date.getTime())) return '';

          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');

          const result = `${year}-${month}-${day}`;
          console.log('[DEBUG] Transfer formatDateFromQR result:', result);
          return result;
        } catch (error) {
          console.log('[DEBUG] Transfer formatDateFromQR error:', error);
          return '';
        }
      };

      // Find supplier by name from QR code
      let supplierId = '';
      if (qrData.supplier) {
        const supplier = fournisseurs.find(f =>
          f.designation.toLowerCase() === qrData.supplier.toLowerCase()
        );
        if (supplier) {
          supplierId = String(supplier.id);
          console.log('[DEBUG] Transfer - Found supplier:', supplier.designation, 'ID:', supplier.id);
        } else {
          console.log('[DEBUG] Transfer - Supplier not found in list:', qrData.supplier);
        }
      }

      // Format dates from QR code
      const fabricationDateFormatted = formatDateFromQR(qrData.fabricationDate || '');
      const expirationDateFormatted = formatDateFromQR(qrData.expirationDate || '');

      console.log('[DEBUG] Transfer - QR code formatted dates:', {
        fabricationDate: fabricationDateFormatted,
        expirationDate: expirationDateFormatted
      });

      // Auto-fill form with QR code data (preserve quality status from QR)
      setOperationForm(prev => ({
        ...prev,
        fournisseur: supplierId,
        fabricationDate: fabricationDateFormatted,
        expirationDate: expirationDateFormatted,
        batchNumber: batchNumber,
        quantity: String(qrData.quantity || ''),
        needsExamination: qrData.needsExamination || false,
        qualityStatus: qrData.qualityStatus !== undefined ? qrData.qualityStatus : prev.qualityStatus
      }));

      // Set source location from QR code
      if (qrData.location && locations.includes(qrData.location)) {
        console.log('[DEBUG] Transfer - Auto-selecting source location from QR:', qrData.location);
        setTransferSourceLocation(qrData.location);

        // Calculate actual available stock for this lot and location
        const actualAvailableFloors = calculateAvailableStock(qrData.location, batchNumber);
        setTransferSourceFloors(actualAvailableFloors);
      }

      // Move to source selection step
      console.log('[DEBUG] Transfer QR scan - Moving to source step');
      setTransferStep('source');
      setLotFound(true);

      toast.success(`QR code scanné: Lot ${batchNumber} - Données auto-remplies pour le transfert`);

      // Also try to lookup in movement history for additional validation
      await handleLotNumberLookup(batchNumber);

    } catch (error) {
      console.error('[DEBUG] Transfer - Error parsing QR code:', error);
      toast.error('QR code invalide: format incorrect');
    }
  };

  // Handle pipe-separated QR Code format for Transfer: (lot number)|(quantity)|(floorID)
  const handleTransferPipeSeparatedQRCode = async (qrData: string) => {
    console.log('[DEBUG] handleTransferPipeSeparatedQRCode called with:', qrData);

    try {
      // Parse the pipe-separated format: (lot number)|(quantity)|(floorID)
      const parts = qrData.split('|');
      
      if (parts.length !== 3) {
        console.log('[DEBUG] Invalid pipe-separated format. Expected 3 parts, got:', parts.length);
        toast.error('Format QR code invalide. Format attendu: (lot)|(quantité)|(étageID)');
        return;
      }

      const [lotNumber, quantity, floorId] = parts.map(part => part.trim());
      
      console.log('[DEBUG] Transfer - Parsed pipe-separated data:', {
        lotNumber,
        quantity,
        floorId
      });

      // Validate the parsed data
      if (!lotNumber) {
        console.log('[DEBUG] Transfer - Missing lot number');
        toast.error('Numéro de lot manquant dans le QR code');
        return;
      }

      if (!quantity || isNaN(parseInt(quantity))) {
        console.log('[DEBUG] Transfer - Invalid quantity:', quantity);
        toast.error('Quantité invalide dans le QR code');
        return;
      }

      if (!floorId || isNaN(parseInt(floorId))) {
        console.log('[DEBUG] Transfer - Invalid floor ID:', floorId);
        toast.error('ID d\'étage invalide dans le QR code');
        return;
      }

      // Close scanner
      setShowQrScanner(false);
      setScannerLoading(false);

      // Clear any previous errors
      setLotLookupError('');

      // Set the lot number in the form
      setOperationForm(prev => ({
        ...prev,
        batchNumber: lotNumber,
        quantity: quantity,
        needsExamination: false, // Default to no examination for Transfer
        qualityStatus: 'conforme' // Default to conforme for Transfer
      }));

      console.log('[DEBUG] Transfer - Form updated with pipe-separated QR data');

      // Try to find the floor by ID and auto-select source location
      const floorIdNum = parseInt(floorId);
      let foundLocation = '';
      let foundFloor = null;

      // Search through all locations and floors to find the matching floor ID
      for (const [locationName, floors] of Object.entries(floorData)) {
        const floor = floors.find(f => f.id === floorIdNum);
        if (floor) {
          foundLocation = locationName;
          foundFloor = floor;
          console.log('[DEBUG] Transfer - Found floor:', floor, 'in location:', locationName);
          break;
        }
      }

      if (foundLocation && foundFloor) {
        console.log('[DEBUG] Transfer - Auto-selecting source location from QR:', foundLocation);
        setTransferSourceLocation(foundLocation);

        // Calculate actual available stock for this lot and location
        const actualAvailableFloors = calculateAvailableStock(foundLocation, lotNumber);
        
        // Update the specific floor with the quantity from QR code if it has stock
        const updatedFloors = actualAvailableFloors.map(floor => {
          if (floor.floorId === floorIdNum) {
            const qrQuantity = parseInt(quantity);
            const availableQuantity = Math.min(qrQuantity, floor.availableCapacity);
            console.log('[DEBUG] Transfer - Setting floor quantity:', {
              floorName: floor.floorName,
              qrQuantity,
              availableCapacity: floor.availableCapacity,
              finalQuantity: availableQuantity
            });
            return {
              ...floor,
              quantity: availableQuantity
            };
          }
          return floor;
        });

        setTransferSourceFloors(updatedFloors);
        
        // Update the total quantity in form based on what was actually set
        const totalSetQuantity = updatedFloors.reduce((sum, floor) => sum + floor.quantity, 0);
        setOperationForm(prev => ({
          ...prev,
          quantity: String(totalSetQuantity)
        }));

        console.log('[DEBUG] Transfer - Source floors updated with QR data');
      } else {
        console.log('[DEBUG] Transfer - Floor ID not found in available floors:', floorIdNum);
        toast.error(`Étage avec ID ${floorId} non trouvé dans les emplacements disponibles`);
      }

      // Move to source selection step
      console.log('[DEBUG] Transfer pipe-separated QR scan - Moving to source step');
      setTransferStep('source');
      setLotFound(true);

      toast.success(`QR code scanné: Lot ${lotNumber} - Quantité ${quantity} - Étage ID ${floorId} pour transfert`);

      // Also try to lookup in movement history for additional validation and auto-fill
      console.log('[DEBUG] Transfer - Also performing lookup in movement history for validation');
      await handleLotNumberLookup(lotNumber);

    } catch (error) {
      console.error('[DEBUG] Transfer - Error parsing pipe-separated QR code:', error);
      toast.error('Erreur lors du traitement du QR code pour le transfert');
    }
  };

  // Auto-complete function for Complément Stock and Transfer based on lot number
  const handleLotNumberLookup = async (lotNumber: string) => {
    if (!lotNumber.trim() || (operationType !== 'Complément Stock' && operationType !== 'Transfer')) return;

    setIsLotLookupLoading(true);
    setLotLookupError('');

    try {
      // Find the lot in movement history
      const lotEntry = movementHistory.find(m =>
        m.product_id === product?.id &&
        (m.batch_number === lotNumber || m.lot === lotNumber) &&
        m.status === 'Entrée'
      );

      if (lotEntry) {
        // Debug: Log the raw lot entry data
        console.log('[DEBUG] Found lot entry:', lotEntry);
        console.log('[DEBUG] fabrication_date:', lotEntry.fabrication_date);
        console.log('[DEBUG] expiration_date:', lotEntry.expiration_date);
        console.log('[DEBUG] date:', lotEntry.date);

        // Auto-fill form with lot data
        const formatDateForInput = (dateStr: string) => {
          console.log('[DEBUG] formatDateForInput input:', dateStr);
          if (!dateStr) return '';
          try {
            // Handle different date formats and convert to YYYY-MM-DD for HTML date input
            // First check if it's already in YYYY-MM-DD format
            if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
              console.log('[DEBUG] Already in YYYY-MM-DD format:', dateStr);
              return dateStr;
            }

            // Handle ISO date format (YYYY-MM-DDTHH:mm:ss.sssZ)
            if (dateStr.includes('T')) {
              console.log('[DEBUG] ISO format detected');
              const date = new Date(dateStr);
              if (isNaN(date.getTime())) return '';

              // Use local date methods to avoid timezone conversion
              const year = date.getFullYear();
              const month = String(date.getMonth() + 1).padStart(2, '0');
              const day = String(date.getDate()).padStart(2, '0');

              const result = `${year}-${month}-${day}`;
              console.log('[DEBUG] ISO format result:', result);
              return result;
            }

            // For other formats, parse and convert but avoid timezone issues
            console.log('[DEBUG] Other format, adding T00:00:00');
            const date = new Date(dateStr + 'T00:00:00'); // Add time to avoid timezone conversion
            if (isNaN(date.getTime())) return '';

            // Use local date methods to avoid timezone conversion
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');

            const result = `${year}-${month}-${day}`;
            console.log('[DEBUG] Other format result:', result);
            return result;
          } catch (error) {
            console.log('[DEBUG] formatDateForInput error:', error);
            return '';
          }
        };

        const fabricationDateFormatted = formatDateForInput(lotEntry.fabrication_date || lotEntry.date || '');
        const expirationDateFormatted = formatDateForInput(lotEntry.expiration_date || '');

        console.log('[DEBUG] Final formatted dates:', {
          fabricationDate: fabricationDateFormatted,
          expirationDate: expirationDateFormatted
        });

        setOperationForm(prev => ({
          ...prev,
          fournisseur: String(lotEntry.fournisseur_id || ''),
          fabricationDate: fabricationDateFormatted,
          expirationDate: expirationDateFormatted,
          batchNumber: lotNumber,
          needsExamination: lotEntry.needs_examination || false,
          qualityStatus: lotEntry.quality_status !== undefined ? lotEntry.quality_status : prev.qualityStatus // Preserve original quality status
        }));

        // Handle location selection based on operation type
        if (operationType === 'Complément Stock') {
          // Auto-select the original location if available
          if (lotEntry.location_name && locations.includes(lotEntry.location_name)) {
            handleLocationChange(lotEntry.location_name);
          }
        } else if (operationType === 'Transfer') {
          // For Transfer, set the source location and calculate actual stock
          if (lotEntry.location_name && locations.includes(lotEntry.location_name)) {
            setTransferSourceLocation(lotEntry.location_name);
            // Calculate actual available stock for this lot
            const actualAvailableFloors = calculateAvailableStock(lotEntry.location_name, lotNumber);
            setTransferSourceFloors(actualAvailableFloors);
          }
          // Move to source selection step for Transfer
          console.log('[DEBUG] Transfer manual lot - Moving to source step');
          setTransferStep('source');
        }

        // Set lot found to show the rest of the form
        setLotFound(true);

        toast.success('Informations du lot récupérées avec succès');
      } else {
        // For Transfer operations, require lot to exist in history for security
        if (operationType === 'Transfer') {
          setLotLookupError('Lot requis pour transfert - lot non trouvé dans l\'historique');
          setLotFound(false);
          toast.error('Transfert impossible: Le lot doit exister dans l\'historique pour des raisons de sécurité');
        } else {
          setLotLookupError('Lot non trouvé dans l\'historique');
          setLotFound(false); // Hide the form when lot is not found
          toast.error('Numéro de lot non trouvé');
        }
      }
    } catch (error) {
      setLotLookupError('Erreur lors de la recherche du lot');
      setLotFound(false); // Hide the form when there's an error
      toast.error('Erreur lors de la recherche du lot');
    } finally {
      setIsLotLookupLoading(false);
    }
  };

  // --- Local state for always-fresh data ---
  const [locations, setLocations] = useState<string[]>(propLocations || []);
  const [floorData, setFloorData] = useState<typeof propFloorData>(propFloorData || {});
  const [movementHistory, setMovementHistory] = useState<any[]>(propMovementHistory || []);

  // --- Fetch latest data on open ---
  useEffect(() => {
    if (open) {
      // Fetch locations and floorData
      fetch('/api/locations')
        .then(res => res.json())
        .then(locs => {
          // Filter out locations where is_prison is 1, only show where is_prison is 0
          const filteredLocs = locs.filter((l: any) => l.is_prison === 0 || l.is_prison === '0' || l.is_prison === false);
          setLocations(filteredLocs.map((l: any) => l.name));
          const data: { [key: string]: Array<{ id: number, name: string, availableCapacity: number, totalCapacity: number, type: 'etage' | 'part' }> } = {};
          filteredLocs.forEach((l: any) => {
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
      // Fetch movement history
      if (product?.id) {
        fetch(`/api/movements?product_id=${product.id}`)
          .then(res => res.json())
          .then(data => setMovementHistory(data))
          .catch(() => setMovementHistory([]));
      }
    }
    // Optionally, reset to prop values on close
    if (!open) {
      setLocations(propLocations || []);
      setFloorData(propFloorData || {});
      setMovementHistory(propMovementHistory || []);
    }
    // eslint-disable-next-line
  }, [open, product?.id]);

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

  // Fetch fournisseurs when dialog opens and operationType is entry-related
  useEffect(() => {
    if (open && (operationType === 'Entrée' || operationType === 'Nouveau Produit' || operationType === 'Complément Stock' || operationType === 'Transfer')) {
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
    return `LOT-`;
  }

  // QR code generation function removed - dialog functionality no longer needed

  // Print recipe function for Complément Stock (from current form data)
  const printComplementStockRecipe = (recipeData?: any) => {
    const currentDate = new Date().toLocaleDateString('fr-FR');
    const currentTime = new Date().toLocaleTimeString('fr-FR');

    // Use provided recipe data or current form data
    let supplierName, locationsInfo, productInfo, formData;

    if (recipeData) {
      // Using saved recipe data from database
      supplierName = recipeData.supplier_name || 'N/A';
      locationsInfo = recipeData.locations_info || [];
      productInfo = {
        designation: recipeData.product_designation || 'N/A',
        reference: recipeData.product_reference || 'N/A',
        unite: recipeData.product_unite || 'unités'
      };
      formData = {
        quantity: recipeData.quantity,
        batchNumber: recipeData.batch_number,
        fabricationDate: recipeData.fabrication_date,
        expirationDate: recipeData.expiration_date,
        qualityStatus: recipeData.quality_status,
        needsExamination: recipeData.needs_examination
      };
    } else {
      // Using current form data
      supplierName = fournisseurs.find(f => f.id === parseInt(operationForm.fournisseur))?.designation || 'N/A';
      locationsInfo = selectedZones.map(zone => ({
        zone: zone.zone,
        floors: zone.floors.filter(f => f.quantity > 0).map(f => ({
          name: f.floorName,
          quantity: f.quantity
        }))
      })).filter(zone => zone.floors.length > 0);
      productInfo = {
        designation: product?.designation || product?.nom || 'N/A',
        reference: product?.reference || 'N/A',
        unite: product?.unite || 'unités'
      };
      formData = {
        quantity: operationForm.quantity,
        batchNumber: operationForm.batchNumber,
        fabricationDate: operationForm.fabricationDate,
        expirationDate: operationForm.expirationDate,
        qualityStatus: operationForm.qualityStatus,
        needsExamination: operationForm.needsExamination
      };
    }

    // Create a unique window name to persist across refreshes
    const windowName = `complement_stock_${Date.now()}`;
    const printWindow = window.open('', windowName, 'width=800,height=600,scrollbars=yes,resizable=yes');
    if (!printWindow) return;

    // Store data in localStorage to persist across refreshes
    const receiptData = {
      currentDate,
      currentTime,
      supplierName,
      locationsInfo,
      product: productInfo,
      operationForm: formData
    };

    // Store in localStorage with the window name as key
    localStorage.setItem(windowName, JSON.stringify(receiptData));

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Reçu - Complément Stock</title>
          <link rel="icon" href="data:,">
          <style>
            body { 
              font-family: Arial, sans-serif; 
              margin: 20px; 
              line-height: 1.4;
            }
            .print-content {
              width: 100%;
            }
            
            /* Header Section - Same as AssemblageFormDialog */
            .header-section {
              border: 2px solid black;
              margin-bottom: 20px;
            }
            .header-flex {
              display: flex;
            }
            .logo-section {
              border-right: 2px solid black;
              padding: 16px;
              width: 192px;
            }
            .logo-content {
              display: flex;
              flex-direction: column;
              align-items: center;
              margin-bottom: 8px;
            }
            .logo-img {
              width: 64px;
              height: 64px;
              object-fit: contain;
              margin-bottom: 8px;
            }
            .logo-text {
              font-size: 14px;
              font-weight: bold;
              text-align: center;
            }
            .title-section {
              flex: 1;
              padding: 16px;
              text-align: center;
            }
            .main-title {
              font-size: 18px;
              font-weight: bold;
              margin-bottom: 4px;
            }
            .sub-title {
              font-size: 18px;
              font-weight: bold;
              margin-bottom: 4px;
            }
            .arabic-text {
              font-size: 14px;
            }
            .info-section {
              border-left: 2px solid black;
              width: 256px;
            }
            .info-row {
              border-bottom: 1px solid black;
              padding: 8px;
              display: flex;
            }
            .info-row:last-child {
              border-bottom: none;
            }
            .info-label {
              font-weight: bold;
              width: 80px;
            }
            .info-value {
              border-left: 1px solid black;
              padding-left: 8px;
              flex: 1;
            }
            
            /* Content Section */
            .content-section {
              border: 2px solid black;
              display: flex;
            }
            .left-section {
              width: 50%;
              border-right: 2px solid black;
              padding: 16px;
            }
            .right-section {
              width: 50%;
              padding: 16px;
            }
            .section-title {
              font-weight: bold;
              text-align: center;
              margin-bottom: 16px;
              text-decoration: underline;
            }
            .field-group {
              margin-bottom: 16px;
            }
            .field-label {
              font-weight: bold;
              margin-bottom: 4px;
              display: block;
            }
            .field-value {
              border-bottom: 1px solid black;
              padding: 4px 0;
              min-height: 20px;
            }
            .locations-list {
              margin-top: 16px;
            }
            .location-item {
              margin-bottom: 8px;
              padding: 8px;
              border-left: 3px solid #000;
              background-color: #f8f9fa;
            }
            .location-name {
              font-weight: bold;
              margin-bottom: 4px;
            }
            .floor-item {
              margin-left: 16px;
              font-size: 14px;
            }
            
            /* Footer Section */
            .footer-section {
              border: 2px solid black;
              border-top: none;
              padding: 12px;
              font-size: 12px;
            }
            .footer-text {
              margin-bottom: 8px;
            }
            .footer-arabic {
              text-align: right;
            }
            
            @media print {
              body { margin: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="print-content">
            <!-- Header Section - Same as AssemblageFormDialog -->
            <div class="header-section">
              <div class="header-flex">
                <!-- Logo Section -->
                <div class="logo-section">
                  <div class="logo-content">
                    <img src="friction.png" alt="Friction-tec Logo" class="logo-img" />
                    <div class="logo-text">Friction-tec</div>
                  </div>
                </div>
                
                <!-- Title Section -->
                <div class="title-section">
                  <h1 class="main-title">REÇU DE COMPLÉMENT STOCK</h1>
                  <h2 class="sub-title">PRODUIT RETOURNÉ EN STOCK</h2>
                  <div class="arabic-text">إيصال إرجاع المنتج إلى المخزون</div>
                </div>
                
                <!-- Info Section -->
                <div class="info-section">
                  <div class="info-row">
                    <span class="info-label">CODE</span>
                    <span class="info-value">CS-${new Date().getFullYear()}</span>
                  </div>
                  <div class="info-row">
                    <span class="info-label">Version</span>
                    <span class="info-value">01</span>
                  </div>
                  <div class="info-row">
                    <span class="info-label">Date</span>
                    <span class="info-value">${currentDate}</span>
                  </div>
                  <div class="info-row">
                    <span class="info-label">Page</span>
                    <span class="info-value">1 sur 1</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Main Content -->
            <div class="content-section">
              <!-- Left Section - Product Information -->
              <div class="left-section">
                <h3 class="section-title">Informations du produit</h3>
                
                <div class="field-group">
                  <label class="field-label">Produit المنتج :</label>
                  <div class="field-value">${productInfo.designation}</div>
                </div>
                
                <div class="field-group">
                  <label class="field-label">Référence المرجع :</label>
                  <div class="field-value">${productInfo.reference}</div>
                </div>
                
                <div class="field-group">
                  <label class="field-label">Fournisseur المورد :</label>
                  <div class="field-value">${supplierName}</div>
                </div>
                
                <div class="field-group">
                  <label class="field-label">Numéro de lot رقم الدفعة :</label>
                  <div class="field-value">${formData.batchNumber}</div>
                </div>
                
                <div class="field-group">
                  <label class="field-label">Quantité totale الكمية الإجمالية :</label>
                  <div class="field-value">${formData.quantity} ${productInfo.unite}</div>
                </div>
                
                <div class="field-group">
                  <label class="field-label">Date de fabrication تاريخ الإنتاج :</label>
                  <div class="field-value">${formData.fabricationDate ? new Date(formData.fabricationDate).toLocaleDateString('fr-FR') : 'N/A'}</div>
                </div>
                
                <div class="field-group">
                  <label class="field-label">Date d'expiration تاريخ الانتهاء :</label>
                  <div class="field-value">${formData.expirationDate ? new Date(formData.expirationDate).toLocaleDateString('fr-FR') : 'N/A'}</div>
                </div>
              </div>

              <!-- Right Section - Storage Information -->
              <div class="right-section">
                <h3 class="section-title">Informations de stockage</h3>
                
                <div class="field-group">
                  <label class="field-label">Statut qualité حالة الجودة :</label>
                  <div class="field-value">${formData.qualityStatus === 'conforme' ? 'Conforme مطابق' : formData.needsExamination ? 'En attente d\'examen في انتظار الفحص' : 'Conforme مطابق'}</div>
                </div>
                
                <div class="field-group">
                  <label class="field-label">Date et heure التاريخ والوقت :</label>
                  <div class="field-value">${currentDate} à ${currentTime}</div>
                </div>
                
                <div class="field-group">
                  <label class="field-label">Type d'opération نوع العملية :</label>
                  <div class="field-value">Complément Stock - Retour partiel</div>
                </div>
                
                <div class="locations-list">
                  <label class="field-label">Emplacements de stockage أماكن التخزين :</label>
                  ${locationsInfo.length > 0 ? locationsInfo.map(location => `
                    <div class="location-item">
                      <div class="location-name">${location.zone}</div>
                      ${location.floors.map(floor => `
                        <div class="floor-item">• ${floor.name}: ${floor.quantity} ${productInfo.unite}</div>
                      `).join('')}
                    </div>
                  `).join('') : '<div class="location-item">Aucun emplacement spécifié</div>'}
                </div>
              </div>
            </div>

            <!-- Footer Note -->
            <div class="footer-section">
              <p class="footer-text">
                <strong>Note importante :</strong> Ce produit est un complément de stock - il s'agit d'un produit qui n'a pas été utilisé entièrement 
                lors d'une opération précédente et qui est remis en stock pour utilisation ultérieure.
              </p>
              <p class="footer-text footer-arabic">
                <strong>ملاحظة مهمة :</strong> هذا المنتج هو مكمل للمخزون - إنه منتج لم يتم استخدامه بالكامل في عملية سابقة وتم إرجاعه إلى المخزون للاستخدام اللاحق.
              </p>
              <p class="footer-text">
                Document généré automatiquement le ${currentDate} à ${currentTime} - نظام إدارة المخزون
              </p>
            </div>
          </div>

          <div class="no-print" style="margin-top: 30px; text-align: center;">
            <button onclick="window.print()" style="
              background-color: #2563eb; 
              color: white; 
              border: none; 
              padding: 10px 20px; 
              border-radius: 5px; 
              cursor: pointer;
              margin-right: 10px;
            ">Imprimer</button>
            <button onclick="window.close(); localStorage.removeItem('${windowName}');" style="
              background-color: #6b7280; 
              color: white; 
              border: none; 
              padding: 10px 20px; 
              border-radius: 5px; 
              cursor: pointer;
            ">Fermer</button>
          </div>

          <script>
            // Check if data exists in localStorage on page load/refresh
            window.addEventListener('load', function() {
              const storedData = localStorage.getItem('${windowName}');
              if (storedData) {
                try {
                  const data = JSON.parse(storedData);
                  // Data is already embedded in the HTML, so no need to rebuild
                  console.log('Receipt data loaded from localStorage');
                } catch (error) {
                  console.error('Error loading receipt data:', error);
                }
              }
            });

            // Clean up localStorage when window is closed
            window.addEventListener('beforeunload', function() {
              // Don't remove data on beforeunload as user might refresh
              // Only remove when explicitly closing via button
            });

            // Handle window focus to ensure data persistence
            window.addEventListener('focus', function() {
              const storedData = localStorage.getItem('${windowName}');
              if (!storedData) {
                // If data is missing, show a message
                document.body.innerHTML = '<div style="padding: 20px; text-align: center; font-family: Arial;"><h2>Session expirée</h2><p>Les données du reçu ont expiré. Veuillez fermer cette fenêtre.</p><button onclick="window.close()" style="background-color: #6b7280; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer;">Fermer</button></div>';
              }
            });
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  // --- Entrée Handlers ---
  const handleLocationChange = (location: string) => {
    setOperationForm(prev => ({ ...prev, location }));
    if ((operationType === 'Entrée' || operationType === 'Nouveau Produit' || operationType === 'Complément Stock') && location) {
      setShowFloorSelection(true); // Show floor selection when zone is selected
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

  // --- Transfer Handlers ---
  // Helper function to calculate available stock for a specific lot and location
  const calculateAvailableStock = (location: string, lotBatchNumber: string) => {
    if (!lotBatchNumber || !Array.isArray(movementHistory) || !product?.id || !location) {
      console.log('[DEBUG] Missing required data for stock calculation:', { lotBatchNumber, movementHistory: !!movementHistory, productId: product?.id, location });
      return [];
    }

    try {
      const availableFloors = getAvailableFloors(location);
      console.log('[DEBUG] Available floors for location', location, ':', availableFloors);

    const actualAvailableFloors = availableFloors.map(floor => {
      let actualAvailable = 0;

      try {
        // Calculate available quantity for this specific lot and floor
        const relevantMovements = movementHistory.filter(m => {
          const matchesProduct = m.product_id === product.id;
          const matchesLot = (m.batch_number === lotBatchNumber || m.lot === lotBatchNumber);
          const matchesLocation = m.location_name === location;
          const matchesFloor = (m.etage_name === floor.name || m.part_name === floor.name);

          return matchesProduct && matchesLot && matchesLocation && matchesFloor;
        });

        console.log('[DEBUG] Relevant movements for', floor.name, ':', relevantMovements);

        const totalEntree = relevantMovements
          .filter(m => m.status === 'Entrée')
          .reduce((sum, m) => sum + (parseInt(m.quantity) || 0), 0);

        const totalSortie = relevantMovements
          .filter(m => m.status === 'Sortie')
          .reduce((sum, m) => sum + (parseInt(m.quantity) || 0), 0);

        actualAvailable = Math.max(0, totalEntree - totalSortie);
        console.log('[DEBUG] Floor', floor.name, '- Entrée:', totalEntree, 'Sortie:', totalSortie, 'Available:', actualAvailable);
      } catch (error) {
        console.error('[DEBUG] Error calculating stock for floor', floor.name, ':', error);
        actualAvailable = 0;
      }

      return {
        floorId: floor.id,
        floorName: floor.name,
        quantity: 0,
        availableCapacity: actualAvailable,
        type: floor.type,
      };
    }).filter(floor => floor.availableCapacity > 0); // Only show floors with available stock

      console.log('[DEBUG] Final available floors:', actualAvailableFloors);
      return actualAvailableFloors;
    } catch (error) {
      console.error('[DEBUG] Error in calculateAvailableStock:', error);
      return [];
    }
  };

  const handleTransferSourceLocationChange = (location: string) => {
    console.log('[DEBUG] Source location changed to:', location);
    setTransferSourceLocation(location);

    if (location && operationForm.batchNumber) {
      const actualAvailableFloors = calculateAvailableStock(location, operationForm.batchNumber);
      setTransferSourceFloors(actualAvailableFloors);
    } else {
      setTransferSourceFloors([]);
    }
  };

  const handleTransferDestinationLocationChange = (location: string) => {
    setTransferDestinationLocation(location);
    if (location) {
      const availableFloors = getAvailableFloors(location);
      const totalToTransfer = totalTransferSourceQuantity;

      // Auto-distribute the quantity across available floors
      let remaining = totalToTransfer;
      const distributedFloors = availableFloors.map(floor => {
        const allocate = Math.min(remaining, floor.availableCapacity);
        remaining -= allocate;
        return {
          floorId: floor.id,
          floorName: floor.name,
          quantity: allocate,
          availableCapacity: floor.availableCapacity,
          type: floor.type,
        };
      });

      setTransferDestinationFloors(distributedFloors);
    } else {
      setTransferDestinationFloors([]);
    }
  };

  const handleTransferSourceFloorQuantityChange = (floorId: number, quantity: number) => {
    setTransferSourceFloors(prev =>
      prev.map(floor =>
        floor.floorId === floorId
          ? { ...floor, quantity: Math.min(quantity, floor.availableCapacity) }
          : floor
      )
    );
  };

  const handleTransferDestinationFloorQuantityChange = (floorId: number, quantity: number) => {
    setTransferDestinationFloors(prev =>
      prev.map(floor =>
        floor.floorId === floorId
          ? { ...floor, quantity: Math.min(quantity, floor.availableCapacity) }
          : floor
      )
    );
  };

  const handleTransferQuantityModeChange = (mode: 'all' | 'partial') => {
    setTransferQuantityMode(mode);

    if (mode === 'all' && transferSourceFloors.length > 0) {
      // Set all available quantity from source
      const totalAvailable = transferSourceFloors.reduce((sum, floor) => sum + floor.availableCapacity, 0);
      setOperationForm(prev => ({ ...prev, quantity: String(totalAvailable) }));

      // Auto-distribute to source floors
      setTransferSourceFloors(prev =>
        prev.map(floor => ({
          ...floor,
          quantity: floor.availableCapacity
        }))
      );
    } else if (mode === 'partial') {
      // Reset quantities for manual selection
      setTransferSourceFloors(prev =>
        prev.map(floor => ({
          ...floor,
          quantity: 0
        }))
      );
      setOperationForm(prev => ({ ...prev, quantity: '0' }));
    }
  };

  // Auto-trigger quantity calculation when transfer source floors are populated and mode is 'all'
  useEffect(() => {
    if (transferSourceFloors.length > 0 && transferQuantityMode === 'all') {
      // Set all available quantity from source
      const totalAvailable = transferSourceFloors.reduce((sum, floor) => sum + floor.availableCapacity, 0);
      setOperationForm(prev => ({ ...prev, quantity: String(totalAvailable) }));

      // Auto-distribute to source floors
      setTransferSourceFloors(prev =>
        prev.map(floor => ({
          ...floor,
          quantity: floor.availableCapacity
        }))
      );
    }
  }, [transferSourceFloors.length, transferQuantityMode]);

  const totalTransferSourceQuantity = transferSourceFloors.reduce((sum, floor) => sum + floor.quantity, 0);
  const totalTransferDestinationQuantity = transferDestinationFloors.reduce((sum, floor) => sum + floor.quantity, 0);

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
        row.etage_name || '',
        row.part_id || ''
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
      setOperationForm({
        fournisseur: '',
        quantity: '',
        location: '',
        floor: '',
        floorQuantity: '',
        fabricationDate: '',
        expirationDate: '',
        batchNumber: '',
        needsExamination: true,
        qualityStatus: null,
        createdAt: ''
      });
      setShowFloorSelection(false);
      setSelectedFloors([]);
      setSelectedZones([]);
      setCurrentZoneIndex(0);
      setShowZoneSelection(false);
      setSelectedExitFloors([]);
      setSelectedExitZones([]);
      setCurrentExitZoneIndex(0);
      setShowExitZoneSelection(false);
      // Reset print-related state
      setShowPrintOption(false);
      setShouldPrintRecipe(false);
      // Reset auto-complete state
      setIsLotLookupLoading(false);
      setLotLookupError('');
      setLotFound(false);
      // Reset transfer state
      setTransferStep('scan');
      setTransferSourceLocation('');
      setTransferDestinationLocation('');
      setTransferSourceFloors([]);
      setTransferDestinationFloors([]);
      setTransferQuantityMode('all');
    } else {
      // Set fabricationDate and createdAt to today and generate batch number when dialog opens
      // For Complément Stock, don't auto-generate batch number - it should be scanned or manually entered
      setOperationForm(prev => ({
        ...prev,
        fabricationDate: new Date().toISOString().slice(0, 10),
        expirationDate: '',
        batchNumber: operationType === 'Complément Stock' ? '' : generateBatchNumber(),
        needsExamination: true,
        qualityStatus: null,
        createdAt: new Date().toISOString().slice(0, 10)
      }));
      
      // For Complément Stock, always enable printing by default
      if (operationType === 'Complément Stock') {
        setShouldPrintRecipe(true);
      }
    }
  }, [open, operationType]);

  // --- Save Handler ---
  const handleSave = async () => {
    setIsSaving(true);
    const isEntry = operationType === 'Entrée' || operationType === 'Nouveau Produit' || operationType === 'Complément Stock';
    const isExit = operationType === 'Sortie';
    const isTransfer = operationType === 'Transfer';
    const isComplementStock = operationType === 'Complément Stock';
    const location_id = locationIdMap[operationForm.location];
    const product_id = product?.id;
    const product_type = product?.type || 'matiere';
    const fournisseur_id = isEntry ? parseInt(operationForm.fournisseur) : undefined;
    const fabricationDate = operationForm.fabricationDate || new Date().toISOString().slice(0, 10);
    const expirationDate = operationForm.expirationDate || null; // Allow null for expiration date
    const createdAt = operationForm.createdAt || new Date().toISOString().slice(0, 10);
    const status = isEntry ? 'Entrée' : 'Sortie';
    const quantity = parseInt(operationForm.quantity);

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
      location_id,
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

    // Validation: Check required fields based on operation type
    if (!product_id) {
      toast.error('Produit requis.');
      setIsSaving(false);
      return;
    }

    // For non-transfer operations, check quantity
    if (!isTransfer && !quantity) {
      toast.error('Veuillez remplir tous les champs obligatoires.');
      setIsSaving(false);
      return;
    }

    // For entry operations, check supplier requirement
    if (isEntry && !fournisseur_id) {
      toast.error('Veuillez sélectionner un fournisseur.');
      setIsSaving(false);
      return;
    }
    try {
      if (operationType === 'Entrée' || operationType === 'Nouveau Produit' || operationType === 'Complément Stock') {
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
          created_at: createdAt, // Add created_at field
          etage_id: floor.type === 'etage' ? floor.floorId : null,
          part_id: floor.type === 'part' ? floor.floorId : null,
          batch_number: operationForm.batchNumber || generateBatchNumber(),
          quality_status: operationForm.qualityStatus, // Add quality status to payload
        }));
        console.log('[DEBUG] Movement payloads to POST:', payloads);
        const promises = payloads.map(payload => axios.post('/api/movements', payload));
        const movementResults = await Promise.all(promises);

        // For Complément Stock, save recipe to database for each movement
        if (isComplementStock && movementResults.length > 0) {
          try {
            // Get supplier name
            const supplierName = fournisseurs.find(f => f.id === parseInt(operationForm.fournisseur))?.designation || 'N/A';

            // Create a recipe for each movement
            const recipePromises = movementResults.map((movementResult, index) => {
              const movement = movementResult.data;
              const correspondingFloor = allSelectedFloors[index];

              // Create location info specific to this movement/floor
              const locationInfo = [{
                zone: correspondingFloor.zone,
                floors: [{
                  name: correspondingFloor.floorName,
                  quantity: correspondingFloor.quantity,
                  type: correspondingFloor.type
                }]
              }];

              const recipePayload = {
                movement_id: movement.id,
                product_id: product_id,
                product_designation: product?.designation || product?.nom || 'N/A',
                product_reference: product?.reference || 'N/A',
                product_unite: product?.unite || 'unités',
                supplier_name: supplierName,
                batch_number: operationForm.batchNumber,
                quantity: correspondingFloor.quantity, // Use the specific floor quantity
                fabrication_date: fabricationDate,
                expiration_date: expirationDate,
                quality_status: operationForm.qualityStatus,
                needs_examination: operationForm.needsExamination,
                operation_type: 'Complément Stock',
                locations_info: locationInfo
              };

              console.log(`[DEBUG] Recipe payload for movement ${movement.id}:`, recipePayload);

              return axios.post('/api/recipes', recipePayload);
            });

            // Save all recipes
            await Promise.all(recipePromises);
            console.log(`[DEBUG] ${recipePromises.length} recipes saved successfully`);

          } catch (recipeError) {
            console.error('[ERROR] Failed to save recipes:', recipeError);
            // Don't fail the entire operation if recipe saving fails
            toast.error('Mouvement enregistré mais erreur lors de la sauvegarde des reçus');
          }
        }
      } else if (operationType === 'Sortie') {
        // 1. Build FIFO allocation for sortie (depletion from source)
        // Use the same logic as the table for visibleRows and Pris
        let visibleRows = [];
        if (Array.isArray(movementHistory)) {
          // Group, filter, and sort as in the table
          const groupMap: Record<string, any> = {};
          for (const row of movementHistory.filter(row => row.product_id === product?.id && row.is_transfer !== 1 && row.is_transfer !== '1' && row.is_transfer !== true && row.internal_transfer !== 1 && row.internal_transfer !== '1' && row.internal_transfer !== true)) {
            const key = [
              row.batch_number || row.lot || '',
              row.location_name || '',
              row.etage_name || '',
              row.part_id || ''
            ].join('||');
            if (!groupMap[key]) {
              groupMap[key] = {
                lot: row.batch_number || row.lot || '-',
                fabrication_date: row.fabrication_date || row.date || '',
                expiration_date: row.expiration_date || '',
                location: row.location_name || '-',
                location_id: row.location_id || null, // <-- store original location_id
                etage: row.etage_name || row.part_name || '-',
                quality_status: row.quality_status || '-',
                entree: 0,
                sortie: 0,
                etage_id: row.etage_id || null,
                part_id: row.part_id || null,
                batch_number: row.batch_number || row.lot || null
              };
            }
            if (row.status === 'Entrée') groupMap[key].entree += row.quantity;
            if (row.status === 'Sortie') groupMap[key].sortie += row.quantity;
          }
          visibleRows = Object.values(groupMap)
            .filter(row => (row.entree - row.sortie) !== 0)
            .sort((a, b) => {
              const dateA = a.fabrication_date ? new Date(a.fabrication_date) : new Date(0);
              const dateB = b.fabrication_date ? new Date(b.fabrication_date) : new Date(0);
              const dateDiff = dateA.getTime() - dateB.getTime();
              if (dateDiff !== 0) return dateDiff;
              return String(a.lot).localeCompare(String(b.lot));
            });
        }
        // Calculate Pris allocation
        let remainingToTake = parseInt(operationForm.quantity) || 0;
        const usedRows = visibleRows.map(row => {
          const disponible = row.entree - row.sortie;
          if (remainingToTake <= 0) return { ...row, pris: 0 };
          const pris = Math.min(disponible, remainingToTake);
          remainingToTake -= pris;
          return { ...row, pris };
        }).filter(row => row.pris > 0);
        // Helper function to format dates for sortie operations (same as entrée)
        const formatDateForSortie = (dateStr: string) => {
          if (!dateStr) return '';
          try {
            // Handle different date formats and convert to YYYY-MM-DD
            if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
              return dateStr;
            }

            // Handle ISO date format (YYYY-MM-DDTHH:mm:ss.sssZ)
            if (dateStr.includes('T')) {
              const date = new Date(dateStr);
              if (isNaN(date.getTime())) return '';

              // Use local date methods to avoid timezone conversion
              const year = date.getFullYear();
              const month = String(date.getMonth() + 1).padStart(2, '0');
              const day = String(date.getDate()).padStart(2, '0');

              return `${year}-${month}-${day}`;
            }

            // For other formats, parse and convert but avoid timezone issues
            const date = new Date(dateStr + 'T00:00:00'); // Add time to avoid timezone conversion
            if (isNaN(date.getTime())) return '';

            // Use local date methods to avoid timezone conversion
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');

            return `${year}-${month}-${day}`;
          } catch (error) {
            console.log('[DEBUG] formatDateForSortie error:', error);
            return '';
          }
        };

        const sortieMovements = usedRows.map(row => {
          // Format dates properly to avoid timezone issues
          const formattedFabricationDate = formatDateForSortie(row.fabrication_date || '');
          const formattedExpirationDate = formatDateForSortie(row.expiration_date || '');

          return {
            product_type,
            product_id,
            status: 'Sortie',
            quantity: row.pris,
            location_id: row.location_id, // use original location_id for sortie
            fabricationDate: formattedFabricationDate,
            expirationDate: formattedExpirationDate,
            date: formattedFabricationDate,
            created_at: createdAt, // Add created_at field
            etage_id: row.etage_id,
            part_id: row.part_id,
            batch_number: row.batch_number,
            quality_status: row.quality_status, // Preserve the same quality status from the original lot
          };
        });
        // 3. Build entrée movements for each destination floor/part with user-entered quantity
        // For both 'local' and 'out', do only the 'externe' (out) logic: do not create entrée movements
        const sortieAndEntreePromises = sortieMovements.map(payload => axios.post('/api/movements', payload));
        await Promise.all(sortieAndEntreePromises);
      } else if (operationType === 'Transfer') {
        // Transfer operation: Create sortie from source and entrée to destination

        // Validation for transfer
        if (!transferSourceLocation || !transferDestinationLocation) {
          toast.error('Veuillez sélectionner les emplacements source et destination.');
          setIsSaving(false);
          return;
        }

        if (transferSourceLocation === transferDestinationLocation) {
          toast.error('L\'emplacement source et destination ne peuvent pas être identiques.');
          setIsSaving(false);
          return;
        }

        if (totalTransferSourceQuantity === 0) {
          toast.error('Veuillez spécifier les quantités à transférer depuis la source.');
          setIsSaving(false);
          return;
        }

        if (totalTransferDestinationQuantity === 0) {
          toast.error('Veuillez spécifier les quantités à transférer vers la destination.');
          setIsSaving(false);
          return;
        }

        if (totalTransferSourceQuantity !== totalTransferDestinationQuantity) {
          toast.error('Les quantités source et destination doivent être égales.');
          setIsSaving(false);
          return;
        }

        // Additional validation: Ensure we have actual stock available
        const totalActualStock = transferSourceFloors.reduce((sum, floor) => sum + floor.availableCapacity, 0);
        if (totalTransferSourceQuantity > totalActualStock) {
          toast.error('Quantité demandée supérieure au stock disponible.');
          setIsSaving(false);
          return;
        }

        // Validate each floor has sufficient stock
        for (const floor of transferSourceFloors) {
          if (floor.quantity > floor.availableCapacity) {
            toast.error(`Stock insuffisant pour ${floor.floorName}: ${floor.quantity} demandé, ${floor.availableCapacity} disponible.`);
            setIsSaving(false);
            return;
          }
        }

        // Create sortie movements from source location
        const sortiePayloads = transferSourceFloors
          .filter(floor => floor.quantity > 0)
          .map(floor => ({
            product_type,
            product_id,
            status: 'Sortie',
            quantity: floor.quantity,
            location_id: locationIdMap[transferSourceLocation],
            fabricationDate,
            expirationDate,
            date: new Date().toISOString().slice(0, 10),
            created_at: createdAt, // Add created_at field
            etage_id: floor.type === 'etage' ? floor.floorId : null,
            part_id: floor.type === 'part' ? floor.floorId : null,
            batch_number: operationForm.batchNumber,
            is_transfer: 1,
            internal_transfer: 1,
            quality_status: operationForm.qualityStatus,
          }));

        // Create entrée movements to destination location
        const entreePayloads = transferDestinationFloors
          .filter(floor => floor.quantity > 0)
          .map(floor => ({
            product_type,
            product_id,
            status: 'Entrée',
            quantity: floor.quantity,
            location_id: locationIdMap[transferDestinationLocation],
            fournisseur_id: fournisseur_id,
            fabricationDate,
            expirationDate,
            date: new Date().toISOString().slice(0, 10),
            created_at: createdAt, // Add created_at field
            etage_id: floor.type === 'etage' ? floor.floorId : null,
            part_id: floor.type === 'part' ? floor.floorId : null,
            batch_number: operationForm.batchNumber,
            is_transfer: 1,
            internal_transfer: 1,
            quality_status: operationForm.qualityStatus,
          }));

        // Execute all transfer movements
        const allTransferMovements = [...sortiePayloads, ...entreePayloads];
        console.log('[DEBUG] Transfer movement payloads:', allTransferMovements);

        const transferPromises = allTransferMovements.map(payload => axios.post('/api/movements', payload));
        await Promise.all(transferPromises);
      }
      toast.success('Mouvement enregistré avec succès.');

      // Capture data for printing before dialog closes
      const printData = isComplementStock && shouldPrintRecipe ? {
        supplier_name: fournisseurs.find(f => f.id === parseInt(operationForm.fournisseur))?.designation || 'N/A',
        locations_info: selectedZones.map(zone => ({
          zone: zone.zone,
          floors: zone.floors.filter(f => f.quantity > 0).map(f => ({
            name: f.floorName,
            quantity: f.quantity
          }))
        })).filter(zone => zone.floors.length > 0),
        product_designation: product?.designation || product?.nom || 'N/A',
        product_reference: product?.reference || 'N/A',
        product_unite: product?.unite || 'unités',
        quantity: operationForm.quantity,
        batch_number: operationForm.batchNumber,
        fabrication_date: operationForm.fabricationDate,
        expiration_date: operationForm.expirationDate,
        quality_status: operationForm.qualityStatus,
        needs_examination: operationForm.needsExamination
      } : null;

      // QR code generation removed - dialog functionality no longer needed

      onOpenChange(false);
      if (printData) {
        setTimeout(() => {
          printComplementStockRecipe(printData);
        }, 500); // Small delay to ensure dialog closes first
      }
      onSuccess({
        type: operationType,
        ...operationForm,
        zones: isEntry ? selectedZones : selectedExitZones
      });
      if (onDataChanged) onDataChanged(); // <-- Call after success
    } catch (err: any) {
      toast.error('Erreur lors de l\'enregistrement du mouvement.');
    } finally {
      setIsSaving(false);
    }
  };

  // --- Render ---
  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-3xl"
      >
        <div className="flex items-center mb-2">
          <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
            <ArrowLeft size={18} />
          </Button>
          <DialogHeader className="flex-1">
            <DialogTitle>
              {operationType === 'Entrée' ? 'Nouvelle Entrée' :
                operationType === 'Nouveau Produit' ? 'Nouveau Produit' :
                  operationType === 'Complément Stock' ? 'Complément Stock' :
                    operationType === 'Transfer' ? 'Transfert de Produit' :
                      'Nouvelle Sortie'}
            </DialogTitle>
          </DialogHeader>
        </div>
        <div className="space-y-4">
          {operationType === 'Sortie' && (
            <div className="flex flex-col gap-4 py-2">
              <div className="flex gap-4">
                <Button
                  size="lg"
                  variant={sortieType === 'local' ? 'default' : 'secondary'}
                  onClick={() => setSortieType('local')}
                  className={sortieType === 'local' ? '' : 'opacity-80'}
                >
                  Transfert interne
                </Button>
                <Button
                  size="lg"
                  variant={sortieType === 'out' ? 'default' : 'secondary'}
                  onClick={() => setSortieType('out')}
                  className={sortieType === 'out' ? '' : 'opacity-80'}
                >
                  Sortie externe
                </Button>
              </div>
            </div>
          )}
          {operationType === 'Transfer' ? (
            <>
              {/* Transfer Operation UI */}
              <div className="space-y-4">
                {/* Debug info */}


                {/* Step 1: QR Scanner */}
                {transferStep === 'scan' && (
                  <div className="space-y-4 p-4 border rounded-lg">
                    <h4 className="font-medium">Recherche par numéro de lot</h4>
                    <div className="flex gap-2">
                      <Input
                        type="text"
                        placeholder="Entrez le numéro de lot ou scannez le QR code"
                        value={operationForm.batchNumber}
                        onChange={(e) => {
                          setOperationForm(prev => ({ ...prev, batchNumber: e.target.value }));
                          setLotLookupError('');
                          setLotFound(false);
                        }}
                        onBlur={(e) => {
                          if (e.target.value.trim()) {
                            handleLotNumberLookup(e.target.value);
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                            handleLotNumberLookup(e.currentTarget.value);
                          }
                        }}
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => handleLotNumberLookup(operationForm.batchNumber)}
                        disabled={isLotLookupLoading || !operationForm.batchNumber.trim()}
                      >
                        {isLotLookupLoading ? 'Recherche...' : 'Rechercher'}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setShowQrScanner(true);
                          setScannerLoading(false);
                          setManualJsonInput('');
                        }}
                        className="flex items-center gap-2"
                      >
                        <QrCode size={16} />
                        Scanner
                      </Button>
                    </div>
                    {lotLookupError && (
                      <div className="text-sm text-red-600">{lotLookupError}</div>
                    )}
                  </div>
                )}

                {/* Step 2: Source Selection */}
                {transferStep === 'source' && (
                  <div className="space-y-4">
                    <h4 className="font-medium">Sélection de la source</h4>

                    {/* Quantity mode selection */}
                    <div className="space-y-2">
                      <label className="block text-sm font-medium">Mode de transfert</label>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant={transferQuantityMode === 'all' ? 'default' : 'outline'}
                          onClick={() => handleTransferQuantityModeChange('all')}
                        >
                          Tout transférer
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant={transferQuantityMode === 'partial' ? 'default' : 'outline'}
                          onClick={() => handleTransferQuantityModeChange('partial')}
                        >
                          Quantité partielle
                        </Button>
                      </div>
                    </div>

                    {/* Source location selection */}
                    <div className="space-y-2">
                      <label className="block text-sm font-medium">Emplacement source</label>
                      <Select
                        value={transferSourceLocation}
                        onValueChange={handleTransferSourceLocationChange}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner l'emplacement source" />
                        </SelectTrigger>
                        <SelectContent>
                          {locations.map(location => {
                            // Calculate total available stock for this location and lot
                            const availableStock = operationForm.batchNumber
                              ? calculateAvailableStock(location, operationForm.batchNumber)
                                  .reduce((sum, floor) => sum + floor.availableCapacity, 0)
                              : 0;

                            return (
                              <SelectItem key={location} value={location}>
                                <div className="flex justify-between items-center w-full">
                                  <span>{location}</span>
                                  <span className="text-xs text-gray-500 ml-2">
                                    {availableStock > 0 ? `${availableStock} ${product?.unite || 'unités'}` : 'Aucun stock'}
                                  </span>
                                </div>
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>

                      {/* Show warning if no stock available */}
                      {transferSourceLocation && transferSourceFloors.length === 0 && (
                        <div className="text-sm text-red-600">
                          ⚠ Aucun stock disponible pour ce lot dans cet emplacement
                        </div>
                      )}
                    </div>

                    {/* Source floors/parts */}
                    {transferSourceLocation && transferSourceFloors.length > 0 && (
                      <div className="space-y-4">
                        {/* Show total available */}
                        <div className="p-3 border rounded-lg">
                          <div className="text-sm font-medium">
                            Stock disponible pour ce lot: {transferSourceFloors.reduce((sum, floor) => sum + floor.availableCapacity, 0)} {product?.unite || 'unités'}
                          </div>
                          <div className="text-xs text-gray-600 mt-1">
                            Réparti sur {transferSourceFloors.length} étage(s)/partie(s) • Lot: {operationForm.batchNumber}
                          </div>
                          <div className="text-xs text-gray-600">
                            Statut qualité: {operationForm.qualityStatus || 'Non défini'} (préservé lors du transfert)
                          </div>
                        </div>

                        {/* Show mode-specific content */}
                        {transferQuantityMode === 'all' ? (
                          <div className="p-3 border rounded-lg">
                            <div className="text-sm font-medium">
                              ✓ Transfert de toute la quantité disponible
                            </div>
                            <div className="text-xs text-gray-600 mt-1">
                              {totalTransferSourceQuantity} {product?.unite || 'unités'} seront transférées
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <label className="block text-sm font-medium">Sélectionnez les quantités par étage/partie</label>
                            <div className="space-y-2 max-h-40 overflow-y-auto">
                              {transferSourceFloors.map(floor => (
                                <div key={floor.floorId} className="flex items-center gap-2 p-2 border rounded">
                                  <span className="flex-1 text-sm font-medium">{floor.floorName}</span>
                                  <span className="text-xs text-gray-500">Stock: {floor.availableCapacity}</span>
                                  <Input
                                    type="number"
                                    min="0"
                                    max={floor.availableCapacity}
                                    value={floor.quantity}
                                    onChange={e => handleTransferSourceFloorQuantityChange(floor.floorId, parseInt(e.target.value) || 0)}
                                    className="w-20"
                                    placeholder="0"
                                  />
                                </div>
                              ))}
                            </div>
                            <div className="text-sm font-medium">
                              Total sélectionné: {totalTransferSourceQuantity} {product?.unite || 'unités'}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setTransferStep('scan')}
                      >
                        <ArrowLeft size={16} className="mr-1" />
                        Retour
                      </Button>
                      <Button
                        type="button"
                        onClick={() => setTransferStep('destination')}
                        disabled={totalTransferSourceQuantity === 0 || transferSourceFloors.length === 0}
                      >
                        Suivant
                      </Button>
                    </div>

                    {/* Show validation message */}
                    {transferSourceLocation && transferSourceFloors.length === 0 && (
                      <div className="text-sm text-gray-600">
                        Aucun stock disponible pour ce lot dans cet emplacement. Veuillez sélectionner un autre emplacement.
                      </div>
                    )}

                    {transferSourceFloors.length > 0 && totalTransferSourceQuantity === 0 && (
                      <div className="text-sm text-gray-600">
                        Veuillez sélectionner une quantité à transférer.
                      </div>
                    )}
                  </div>
                )}

                {/* Step 3: Destination Selection */}
                {transferStep === 'destination' && (
                  <div className="space-y-4">
                    <h4 className="font-medium">Sélection de la destination</h4>

                    {/* Destination location selection */}
                    <div className="space-y-2">
                      <label className="block text-sm font-medium">Emplacement destination</label>
                      <Select
                        value={transferDestinationLocation}
                        onValueChange={handleTransferDestinationLocationChange}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner l'emplacement destination" />
                        </SelectTrigger>
                        <SelectContent>
                          {locations.filter(loc => loc !== transferSourceLocation).map(location => (
                            <SelectItem key={location} value={location}>{location}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Destination floors/parts */}
                    {transferDestinationLocation && transferDestinationFloors.length > 0 && (
                      <div className="space-y-4">
                        {/* Show transfer summary */}
                        <div className="p-3 border rounded-lg">
                          <div className="text-sm font-medium">
                            Transfert: {totalTransferSourceQuantity} {product?.unite || 'unités'}
                          </div>
                          <div className="text-xs text-gray-600 mt-1">
                            De: {transferSourceLocation} → Vers: {transferDestinationLocation}
                          </div>
                        </div>

                        {/* Auto-distributed quantities */}
                        <div className="space-y-2">
                          <label className="block text-sm font-medium">Répartition automatique par étage/partie</label>
                          <div className="space-y-2 max-h-40 overflow-y-auto">
                            {transferDestinationFloors.map(floor => (
                              <div key={floor.floorId} className="flex items-center gap-2 p-2 border rounded bg-gray-50">
                                <span className="flex-1 text-sm font-medium">{floor.floorName}</span>
                                <span className="text-xs text-gray-500">Capacité: {floor.availableCapacity}</span>
                                <div className="w-20 text-center">
                                  <span className="text-sm font-medium">{floor.quantity}</span>
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Show status */}
                          <div className={`text-sm font-medium ${totalTransferDestinationQuantity === totalTransferSourceQuantity ? 'text-gray-700' : 'text-red-600'}`}>
                            {totalTransferDestinationQuantity === totalTransferSourceQuantity
                              ? '✓ Répartition complète'
                              : `⚠ Manque ${totalTransferSourceQuantity - totalTransferDestinationQuantity} ${product?.unite || 'unités'}`
                            }
                          </div>

                          {totalTransferDestinationQuantity < totalTransferSourceQuantity && (
                            <div className="text-xs text-gray-600 p-2 border rounded">
                              La capacité de destination est insuffisante. Veuillez choisir un autre emplacement ou réduire la quantité source.
                            </div>
                          )}

                          {/* Manual adjustment option */}
                          <details className="mt-2">
                            <summary className="text-xs text-gray-600 cursor-pointer hover:text-gray-800">
                              Ajuster manuellement la répartition
                            </summary>
                            <div className="mt-2 space-y-2">
                              {transferDestinationFloors.map(floor => (
                                <div key={floor.floorId} className="flex items-center gap-2 p-2 border rounded">
                                  <span className="flex-1 text-sm">{floor.floorName}</span>
                                  <span className="text-xs text-gray-500">Max: {floor.availableCapacity}</span>
                                  <Input
                                    type="number"
                                    min="0"
                                    max={floor.availableCapacity}
                                    value={floor.quantity}
                                    onChange={e => handleTransferDestinationFloorQuantityChange(floor.floorId, parseInt(e.target.value) || 0)}
                                    className="w-20"
                                  />
                                </div>
                              ))}
                            </div>
                          </details>
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setTransferStep('source')}
                      >
                        <ArrowLeft size={16} className="mr-1" />
                        Retour
                      </Button>
                      <Button
                        type="button"
                        onClick={handleSave}
                        disabled={isSaving || totalTransferDestinationQuantity !== totalTransferSourceQuantity || totalTransferDestinationQuantity === 0}
                      >
                        {isSaving ? 'Transfert en cours...' : 'Effectuer le transfert'}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (operationType === 'Entrée' || operationType === 'Nouveau Produit' || operationType === 'Complément Stock') ? (
            <>
              {/* Complément Stock: Show lot number input first */}
              {operationType === 'Complément Stock' && (
                <div className="space-y-4 p-4 border rounded-lg bg-blue-50">
                  <h4 className="font-medium text-blue-800">Recherche par numéro de lot</h4>
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      placeholder="Entrez le numéro de lot ou scannez le QR code"
                      value={operationForm.batchNumber}
                      onChange={(e) => {
                        setOperationForm(prev => ({ ...prev, batchNumber: e.target.value }));
                        setLotLookupError('');
                        setLotFound(false); // Hide the form when user starts typing a new lot number
                      }}
                      onBlur={(e) => handleLotNumberLookup(e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleLotNumberLookup(operationForm.batchNumber)}
                      disabled={isLotLookupLoading || !operationForm.batchNumber.trim()}
                    >
                      {isLotLookupLoading ? 'Recherche...' : 'Rechercher'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        console.log('[DEBUG] Scanner button clicked');
                        setShowQrScanner(true);
                        setScannerLoading(false);
                        setManualJsonInput('');
                      }}
                      className="flex items-center gap-2"
                    >
                      <QrCode size={16} />
                      Scanner
                    </Button>
                  </div>
                  {lotLookupError && (
                    <div className="text-sm text-red-600">{lotLookupError}</div>
                  )}

                </div>
              )}

              {/* Show form fields only after lot is found for Complément Stock, or always for other operations */}
              {(operationType !== 'Complément Stock' || lotFound) && (
                <>
                  {/* Date de fabrication & expiration */}
                  <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-sm font-medium mb-1">Date d'entrée</label>
                    <Input
                      type="date"
                      value={operationForm.createdAt}
                      onChange={e => setOperationForm(f => ({ ...f, createdAt: e.target.value }))}
                      required
                    />
                  </div>
                    <div className="flex-1">
                      <label className="block text-sm font-medium mb-1">Date de fabrication</label>
                      <Input
                        type="date"
                        value={operationForm.fabricationDate}
                        onChange={e => setOperationForm(f => ({ ...f, fabricationDate: e.target.value }))}
                        readOnly={operationType === 'Complément Stock' && !!operationForm.fabricationDate && !!operationForm.batchNumber}
                        className={operationType === 'Complément Stock' && operationForm.fabricationDate && operationForm.batchNumber ? 'bg-gray-100' : ''}
                        required
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-sm font-medium mb-1">Date d'expiration (optionnelle)</label>
                      <Input
                        type="date"
                        value={operationForm.expirationDate}
                        onChange={e => setOperationForm(f => ({ ...f, expirationDate: e.target.value }))}
                        readOnly={operationType === 'Complément Stock' && !!operationForm.expirationDate && !!operationForm.batchNumber}
                        className={operationType === 'Complément Stock' && operationForm.expirationDate && operationForm.batchNumber ? 'bg-gray-100' : ''}
                      />
                    </div>
                  </div>
                  
                  {/* Date d'entrée */}
 
                  <Select
                    value={operationForm.fournisseur}
                    onValueChange={val => setOperationForm(f => ({ ...f, fournisseur: val }))}
                    disabled={operationType === 'Complément Stock' && !!operationForm.fournisseur && !!operationForm.batchNumber}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={
                        operationType === 'Complément Stock'
                          ? "Auto-complété après recherche de lot"
                          : "Sélectionner un fournisseur"
                      } />
                    </SelectTrigger>
                    <SelectContent>
                      {/* Search input for fournisseur */}
                      {fournisseurs.length > 0 && (
                        <div className="px-2 py-1">
                          <Input
                            type="text"
                            placeholder="Rechercher..."
                            value={fournisseurSearch}
                            onChange={e => setFournisseurSearch(e.target.value)}
                            className="mb-2"
                            autoFocus
                          />
                        </div>
                      )}
                      {fournisseurs.length === 0 ? (
                        null
                      ) : (
                        fournisseurs
                          .filter(f => f.designation.toLowerCase().includes(fournisseurSearch.toLowerCase()))
                          .map(f => (
                            <SelectItem key={f.id} value={String(f.id)}>{f.designation}</SelectItem>
                          ))
                      )}
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    placeholder="Quantité totale"
                    value={operationForm.quantity}
                    onChange={e => handleTotalQuantityChange(e.target.value)}
                  />
                  {/* Batch number is handled in the search section above for Complément Stock */}
                  {operationType !== 'Complément Stock' && (
                    <Input
                      type="text"
                      placeholder="Numéro de lot (Batch Number)"
                      value={operationForm.batchNumber}
                      onChange={e => setOperationForm(f => ({ ...f, batchNumber: e.target.value }))}
                      // readOnly
                    />
                  )}

                  {/* Quality Examination Section - Hidden for Complément Stock */}
                  {operationType !== 'Complément Stock' && (
                    <div className="space-y-3 p-4 border rounded-lg bg-gray-50 hidden" >
                      <h4 className="font-medium text-sm">Contrôle qualité</h4>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Ce produit nécessite-t-il un examen qualité ?</label>
                        <div className="flex gap-4">
                          <label className="flex items-center space-x-2">
                            <input
                              type="radio"
                              name="needsExamination"
                              checked={operationForm.needsExamination === true}
                              onChange={() => setOperationForm(prev => ({
                                ...prev,
                                needsExamination: true,
                                qualityStatus: null
                              }))}
                              className="rounded"
                            />
                            <span className="text-sm">Oui, examen requis</span>
                          </label>
                          <label className="flex items-center space-x-2">
                            <input
                              type="radio"
                              name="needsExamination"
                              checked={operationForm.needsExamination === false}
                              onChange={() => setOperationForm(prev => ({
                                ...prev,
                                needsExamination: false,
                                qualityStatus: 'conforme'
                              }))}
                              className="rounded"
                            />
                            <span className="text-sm">Non, produit conforme</span>
                          </label>
                        </div>
                        {operationForm.needsExamination === false && (
                          <div className="text-xs text-green-600 mt-1">
                            ✓ Le produit sera marqué comme "conforme" automatiquement
                          </div>
                        )}
                        {operationForm.needsExamination === true && (
                          <div className="text-xs text-orange-600 mt-1">
                            ⚠ Le produit sera en attente d'examen qualité
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  <Select value={operationForm.location} onValueChange={handleLocationChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner une zone" />
                    </SelectTrigger>
                    <SelectContent>
                      {locations.map(loc => (
                        <SelectItem key={loc} value={loc}>
                          {loc} ({getTotalAvailableCapacity(loc)} places)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {showFloorSelection && operationForm.location && (
                    <div className="space-y-4">
                      {selectedZones.length > 1 && (
                        <div className="border rounded-lg p-4">
                          <h4 className="font-medium mb-3">Zones sélectionnées</h4>
                          <div className="flex flex-wrap gap-2">
                            {selectedZones.map((zone, index) => (
                              <div key={index} className="flex items-center gap-1">
                                <Button
                                  variant={currentZoneIndex === index ? "default" : "outline"}
                                  size="sm"
                                  onClick={() => switchToZone(index)}
                                >
                                  {zone.zone}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-red-500 hover:text-red-700"
                                  onClick={() => removeZone(index)}
                                  title="Supprimer la zone"
                                  aria-label="Supprimer la zone"
                                >
                                  <X size={16} />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-medium">Étages disponibles - {operationForm.location}</h4>
                          <div className="text-sm text-muted-foreground">
                            Capacité totale: {getTotalAvailableCapacity(operationForm.location)}
                          </div>
                        </div>
                        <div className="space-y-3">
                          {getAvailableFloors(operationForm.location).map((floor) => (
                            <div key={floor.id} className="flex items-center justify-between p-3 border rounded-lg">
                              <div className="flex items-center space-x-3">
                                <input
                                  type="checkbox"
                                  checked={selectedFloors.some(f => f.floorId === floor.id)}
                                  onChange={() => handleFloorSelection(floor.id, floor.name, floor.availableCapacity, floor.type)}
                                  className="rounded"
                                />
                                <div>
                                  <p className="font-medium">{floor.name}</p>
                                  <p className="text-sm text-muted-foreground">
                                    Capacité disponible: {floor.availableCapacity} / {floor.totalCapacity}
                                  </p>
                                </div>
                              </div>
                              {selectedFloors.some(f => f.floorId === floor.id) && (
                                <div className="flex items-center space-x-2">
                                  <Input
                                    type="number"
                                    placeholder="Quantité"
                                    min="0"
                                    max={floor.availableCapacity}
                                    value={selectedFloors.find(f => f.floorId === floor.id)?.quantity || 0}
                                    onChange={(e) => handleFloorQuantityChange(floor.id, parseInt(e.target.value) || 0)}
                                    className="w-24"
                                  />
                                  <span className="text-sm text-muted-foreground"></span>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                        <div className="mt-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={handleManualDistribute}
                                disabled={!operationForm.quantity || parseInt(operationForm.quantity) <= 0 || selectedZones.length === 0}
                              >
                                Distribuer automatiquement
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setShowZoneSelection(true)}
                              >
                                Ajouter une zone
                              </Button>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Capacité totale disponible: {getTotalAvailableCapacityAllZones(selectedZones)}
                            </div>
                          </div>
                          {parseInt(operationForm.quantity) > 0 && (
                            <div className={`p-3 rounded-lg ${totalSelectedQuantity === parseInt(operationForm.quantity)
                              ? 'bg-green-50 border border-green-200'
                              : 'bg-red-50 border border-red-200'
                              }`}>
                              <p className={`text-sm font-medium ${totalSelectedQuantity === parseInt(operationForm.quantity)
                                ? 'text-green-800'
                                : 'text-red-800'
                                }`}>
                                {totalSelectedQuantity === parseInt(operationForm.quantity)
                                  ? '✓ Quantité correspondante'
                                  : `⚠ Quantité manquante: ${parseInt(operationForm.quantity) - totalSelectedQuantity}`}
                              </p>
                              {totalSelectedQuantity < parseInt(operationForm.quantity) && (
                                <div className="text-xs text-red-600 mt-1">
                                  <p>Capacité insuffisante dans cette zone.</p>
                                  <p>Capacité totale disponible: {getTotalAvailableCapacityAllZones(selectedZones)}</p>
                                  <p>Cliquez sur "Ajouter une zone" pour distribuer le reste.</p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      {showZoneSelection && (
                        <div className="border rounded-lg p-4 bg-gray-50">
                          <h4 className="font-medium mb-3">Sélectionner une nouvelle zone</h4>
                          <div className="grid grid-cols-2 gap-2">
                            {locations.filter(loc => !selectedZones.some(zone => zone.zone === loc)).map((location) => (
                              <Button
                                key={location}
                                variant="outline"
                                size="sm"
                                onClick={() => addNewZone(location)}
                                className="justify-start"
                              >
                                {location} ({getTotalAvailableCapacity(location)} places)
                              </Button>
                            ))}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowZoneSelection(false)}
                            className="mt-2"
                          >
                            Annuler
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </>
          ) : (
            <>
              {/* Date fields removed for Sortie - dates will be taken from original entry movements */}
              {/* Restore Quantité totale input for Sortie */}
              <Input
                type="number"
                placeholder="Quantité totale"
                value={operationForm.quantity}
                onChange={e => handleExitTotalQuantityChange(e.target.value)}
              />
              {/* FIFO source breakdown, showing only what user needs */}
              {operationForm.quantity && parseInt(operationForm.quantity) > 0 && operationType === 'Sortie' && (
                <div className="mb-4">
                  <div className="space-y-3">
                    {(() => {
                      if (!Array.isArray(movementHistory) || movementHistory.length === 0) {
                        return <p className="text-sm text-muted-foreground">Aucun mouvement trouvé pour cette matière.</p>;
                      }
                      // Robust filter to exclude internal transfers (is_transfer or internal_transfer as 1, '1', or true)
                      const filteredMovements = movementHistory.filter(row =>
                        row.product_id === product?.id &&
                        row.is_transfer !== 1 &&
                        row.is_transfer !== '1' &&
                        row.is_transfer !== true &&
                        row.internal_transfer !== 1 &&
                        row.internal_transfer !== '1' &&
                        row.internal_transfer !== true
                      );
                      if (filteredMovements.length === 0) {
                        return <p className="text-sm text-muted-foreground">Aucun mouvement trouvé pour ce produit.</p>;
                      }
                      // Group by lot, location, etage, part
                      const groupMap: Record<string, any> = {};
                      for (const row of filteredMovements) {
                        const key = [
                          row.batch_number || row.lot || '',
                          row.location_name || '',
                          row.etage_name || '',
                          row.part_id || ''
                        ].join('||');
                        if (!groupMap[key]) {
                          groupMap[key] = {
                            lot: row.batch_number || row.lot || '-',
                            fabrication_date: row.fabrication_date || row.date || '',
                            expiration_date: row.expiration_date || '',
                            location: row.location_name || '-',
                            etage: row.etage_name || row.part_name || '-',
                            quality_status: row.quality_status || '-',
                            entree: 0,
                            sortie: 0
                          };
                        }
                        if (row.status === 'Entrée') groupMap[key].entree += row.quantity;
                        if (row.status === 'Sortie') groupMap[key].sortie += row.quantity;
                      }
                      const groupedRows = Object.values(groupMap);
                      // Only show rows where disponible != 0 AND quality_status is 'conforme'
                      let visibleRows = groupedRows.filter(row =>
                        (row.entree - row.sortie) !== 0 && row.quality_status === 'conforme'
                      );
                      // Sort by Date Fabrication (asc), then Lot (asc)
                      visibleRows = visibleRows.sort((a, b) => {
                        // New sort: expiration date, then fabrication date, then lot
                        const expA = a.expiration_date ? new Date(a.expiration_date) : new Date(8640000000000000); // far future if missing
                        const expB = b.expiration_date ? new Date(b.expiration_date) : new Date(8640000000000000);
                        const expDiff = expA.getTime() - expB.getTime();
                        if (expDiff !== 0) return expDiff;
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
                          <table className="min-w-full text-xs border mb-2">
                            <thead>
                              <tr>
                                <th className="border px-2 py-1">Lot</th>
                                <th className="border px-2 py-1">Date Fabrication</th>
                                <th className="border px-2 py-1">Date Expiration</th>
                                <th className="border px-2 py-1">Emplacement</th>
                                <th className="border px-2 py-1">Étage/Partie</th>
                                <th className="border px-2 py-1">Qualité</th>
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
                                  <td className="border px-2 py-1">
                                    <span className={`px-2 py-1 rounded text-xs font-medium ${row.quality_status === 'conforme'
                                      ? 'bg-green-100 text-green-800'
                                      : row.quality_status === 'non-conforme'
                                        ? 'bg-red-100 text-red-800'
                                        : 'bg-gray-100 text-gray-800'
                                      }`}>
                                      {row.quality_status === 'conforme' ? 'Conforme' :
                                        row.quality_status === 'non-conforme' ? 'Non-conforme' :
                                          row.quality_status || '-'}
                                    </span>
                                  </td>
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
                          {/* Show warning if user input is greater than totalDisponible */}
                          {parseInt(operationForm.quantity) > totalDisponible && (
                            <div className="text-sm font-bold text-yellow-500 mt-2">Stock insuffisant. Demandé : {operationForm.quantity}, Disponible : {totalDisponible}.</div>
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
              {/* Remove Select for location/zone for Sortie */}
              {/* {operationType === 'Sortie' && (
                <Select value={operationForm.location} onValueChange={handleExitLocationChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner la zone de destination" />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map(loc => (
                      <SelectItem key={loc} value={loc}>
                        {loc} ({getTotalAvailableCapacity(loc)} places)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )} */}
              {/* Remove all zone/floor selection for Sortie */}
            </>
          )}
        </div>
        {operationType === 'Complément Stock' && (
          <div className="flex items-center space-x-2 mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <input
              type="checkbox"
              id="printRecipe"
              checked={shouldPrintRecipe}
              onChange={(e) => setShouldPrintRecipe(e.target.checked)}
              className="rounded"
            />
            <label htmlFor="printRecipe" className="text-sm font-medium text-blue-800">
              Imprimer le reçu de complément stock après enregistrement
            </label>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
         <Button
  disabled={
    isSaving ||
    operationType === 'Nouveau Produit'
      ? !operationForm.fournisseur || !operationForm.quantity || !operationForm.location || selectedFloors.length === 0 || totalSelectedQuantity !== parseInt(operationForm.quantity) || !operationForm.fabricationDate || (operationForm.batchNumber && operationForm.batchNumber.startsWith('LOT-') && operationForm.batchNumber.trim().length === 4)
      : operationType === 'Complément Stock'
        ? !operationForm.batchNumber || !operationForm.quantity || !operationForm.location || selectedFloors.length === 0 || totalSelectedQuantity !== parseInt(operationForm.quantity) || !operationForm.fabricationDate
        : operationType === 'Entrée'
          ? !operationForm.fournisseur || !operationForm.quantity || !operationForm.location || selectedFloors.length === 0 || totalSelectedQuantity !== parseInt(operationForm.quantity) || !operationForm.fabricationDate || (operationForm.batchNumber && operationForm.batchNumber.startsWith('LOT-') && operationForm.batchNumber.trim().length === 4)
          : !operationForm.quantity || (operationType === 'Sortie' && (
              !Array.isArray(movementHistory) || 
              movementHistory.length === 0 || 
              (movementHistory.reduce((available, row) => {
                if (row.product_id === product?.id && row.quality_status === 'conforme') {
                  return row.status === 'Entrée' 
                    ? available + (parseInt(row.quantity) || 0)
                    : available - (parseInt(row.quantity) || 0);
                }
                return available;
              }, 0) < parseInt(operationForm.quantity))
            ))
  }
  onClick={handleSave}
>
  {isSaving ? 'Enregistrement...' : 'Enregistrer'}
</Button>

        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* QR Scanner Dialog for Complément Stock */}
    <Dialog open={showQrScanner} onOpenChange={(open) => {
      if (!open) {
        setShowQrScanner(false);
        setScannerLoading(false);
        setManualJsonInput('');
      }
    }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode size={20} />
            Scanner QR Code - {operationType === 'Transfer' ? 'Transfert' : 'Complément Stock'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            {scannerLoading ? (
              <>
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <p className="text-sm text-muted-foreground">Initialisation du scanner...</p>
              </>
            ) : (
              <>
                <QrCode size={64} className="text-muted-foreground animate-pulse" />
                <div className="text-center space-y-2">
                  <p className="text-sm font-medium">En attente du scan...</p>
                  <p className="text-xs text-muted-foreground">
                    {(operationType === 'Complément Stock' || operationType === 'Transfer')
                      ? 'Format attendu: (lot)|(quantité)|(étageID) ou format JSON'
                      : 'Scannez le QR code avec votre application'
                    }
                  </p>
                </div>
              </>
            )}
          </div>
          <input
            type="text"
            value={manualJsonInput}
            onChange={(e) => {
              const value = e.target.value;
              console.log('[DEBUG] Scanner input received:', value);
              setManualJsonInput(value);
              // Auto-process when barcode scanner inputs data
              if (value.trim() && isValidQRFormat(value)) {
                console.log('[DEBUG] Valid QR format detected, processing...');
                setScannerLoading(true);
                handleQRCodeScan(value);
                setManualJsonInput('');
              }
            }}
            className="sr-only"
            placeholder="Scanner input"
            autoFocus
          />
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              console.log('[DEBUG] Scanner dialog cancelled');
              setShowQrScanner(false);
              setScannerLoading(false);
              setManualJsonInput('');
            }}
          >
            Annuler
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
};

export default ProductOperationDialog; 