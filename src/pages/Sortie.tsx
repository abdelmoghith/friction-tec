import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import LoadingSpinner from '@/components/ui/loading-spinner';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Package,
  QrCode,
  Scan,
  ShoppingCart,
  AlertTriangle,
  CheckCircle,
  Clock,
  Camera,
  X,
  ArrowLeft
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { generateQRCodeImage, type QRCodeData } from '@/lib/qrcode';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface Product {
  id: number;
  reference: string;
  nom: string;
  unite: string;
  type: string;
}

interface LotRow {
  batch_number: string;
  fabrication_date: string;
  expiration_date: string;
  location_name: string;
  etage_name?: string;
  part_name?: string;
  quality_status: string;
  entree: number;
  sortie: number;
  disponible: number;
  pris: number;
  location_id: number;
  etage_id?: number;
  part_id?: number;
  qrCode?: string; // Add QR code for each lot
  uniqueKey: string; // Add unique identifier for this specific lot row
}

interface ScannedItem {
  lotRow: LotRow;
  scannedQuantity: number;
  availableQuantity: number; // Total available in this lot
  timestamp: string;
}

interface PartialScanConfirmation {
  qrData: any;
  availableLot: LotRow;
  requestedQuantity: number;
  availableQuantity: number;
}

interface CompletedOperation {
  id: string;
  productName: string;
  productReference: string;
  quantity: number;
  unite: string;
  lotsCount: number;
  timestamp: string;
  scannedItems: ScannedItem[];
}

const Sortie = () => {
  const navigate = useNavigate();
  // State management
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState<string>('');
  const [lotData, setLotData] = useState<LotRow[]>([]);
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);
  const [showQrCode, setShowQrCode] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [loading, setLoading] = useState(false);
  const [movementHistory, setMovementHistory] = useState<any[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [scannedItems, setScannedItems] = useState<ScannedItem[]>([]);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [partialScanConfirmation, setPartialScanConfirmation] = useState<PartialScanConfirmation | null>(null);
  const [showPartialConfirmDialog, setShowPartialConfirmDialog] = useState(false);
  const [manualJsonInput, setManualJsonInput] = useState('');
  const [showLotTable, setShowLotTable] = useState(false);
  const [scannerLoading, setScannerLoading] = useState(false);
  const [availableStock, setAvailableStock] = useState<number>(0);
  const [productSearch, setProductSearch] = useState<string>('');
  const [completedOperations, setCompletedOperations] = useState<CompletedOperation[]>([]);



  // Fetch products on component mount
  useEffect(() => {
    fetchProducts();
  }, []);

  // Fetch movement history when product is selected
  useEffect(() => {
    if (selectedProduct) {
      fetchMovementHistory(selectedProduct.id);
    }
  }, [selectedProduct]);

  // Calculate available stock when movement history changes
  useEffect(() => {
    if (selectedProduct && movementHistory.length > 0) {
      calculateAvailableStock();
    }
  }, [selectedProduct, movementHistory]);

  // Calculate lot table when product or quantity changes
  useEffect(() => {
    if (selectedProduct && quantity && movementHistory.length > 0) {
      calculateLotTable();
    }
  }, [selectedProduct, quantity, movementHistory]);

  // Reset scanned items when product or quantity changes
  useEffect(() => {
    setScannedItems([]);
    setShowConfirmation(false);
    setPartialScanConfirmation(null);
    setShowPartialConfirmDialog(false);
    // Only reset showLotTable if we don't have completed operations
    if (completedOperations.length === 0) {
      setShowLotTable(false);
    }
  }, [selectedProduct, quantity, completedOperations.length]);

  // Auto-close scanner when all items are scanned
  useEffect(() => {
    if (showScanner && selectedProduct && quantity) {
      const totalNeeded = parseInt(quantity) || 0;
      const totalScanned = scannedItems.reduce((sum, item) => sum + item.scannedQuantity, 0);

      if (totalScanned >= totalNeeded && totalScanned > 0) {
        // All items scanned, close scanner
        setShowScanner(false);
        setScannerLoading(false);
        toast.success('Tous les lots ont été scannés avec succès!');
      }
    }
  }, [scannedItems, showScanner, selectedProduct, quantity]);

  const fetchProducts = async () => {
    setIsDataLoading(true);
    try {
     const response = await fetch('/api/products');
      const data = await response.json();
      setProducts(data);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error('Erreur lors du chargement des produits');
    } finally {
      setIsDataLoading(false);
    }
  };

  const fetchMovementHistory = async (productId: number) => {
    try {
     const response = await fetch(`/api/movements?product_id=${productId}`);
      const data = await response.json();
      setMovementHistory(data);
    } catch (error) {
      console.error('Error fetching movement history:', error);
      toast.error('Erreur lors du chargement de l\'historique');
    }
  };

  const calculateAvailableStock = () => {
    if (!selectedProduct || !movementHistory.length) {
      setAvailableStock(0);
      return;
    }

    console.log('🔍 calculateAvailableStock - Selected Product:', selectedProduct.id, selectedProduct.nom);
    console.log('📊 Movement History Length:', movementHistory.length);

    // Group movements by lot and location
    const groupMap: Record<string, any> = {};

    // Filter movements for the selected product, excluding transfers
    const filteredMovements = movementHistory.filter(row => {
      const isCorrectProduct = row.product_id === selectedProduct.id;
      const isNotTransfer = row.is_transfer !== 1 && row.is_transfer !== '1' && row.is_transfer !== true;
      const isNotInternalTransfer = row.internal_transfer !== 1 && row.internal_transfer !== '1' && row.internal_transfer !== true;

      console.log('🔎 Row filter check:', {
        product_id: row.product_id,
        isCorrectProduct,
        is_transfer: row.is_transfer,
        isNotTransfer,
        internal_transfer: row.internal_transfer,
        isNotInternalTransfer,
        quality_status: row.quality_status,
        status: row.status,
        quantity: row.quantity,
        batch_number: row.batch_number,
        location_name: row.location_name
      });

      return isCorrectProduct && isNotTransfer && isNotInternalTransfer;
    });

    console.log('✅ Filtered Movements Count:', filteredMovements.length);

    for (const row of filteredMovements) {
      // Create unique key for each lot-location-floor/part combination
      const key = [
        row.batch_number || row.lot || '',
        row.location_name || '',
        row.etage_name || '',
        row.part_id || ''
      ].join('||');

      if (!groupMap[key]) {
        groupMap[key] = {
          entree: 0,
          sortie: 0,
          batch_number: row.batch_number || row.lot || '',
          location_name: row.location_name || '',
          quality_status: row.quality_status || 'N/A'
        };
      }

      // Parse quantity as number and handle different status values
      const quantity = parseInt(row.quantity) || 0;

      console.log('📈 Processing row:', {
        key,
        status: row.status,
        quantity,
        quality_status: row.quality_status,
        batch_number: row.batch_number,
        location_name: row.location_name
      });

      if (row.status === 'Entrée' || row.status === 'Entree') {
        groupMap[key].entree += quantity;
        console.log('➕ Added to entree:', quantity, 'Total entree now:', groupMap[key].entree);
      } else if (row.status === 'Sortie') {
        groupMap[key].sortie += quantity;
        console.log('➖ Added to sortie:', quantity, 'Total sortie now:', groupMap[key].sortie);
      } else {
        console.log('❓ Unknown status:', row.status);
      }
    }

    console.log('📋 Final Group Map:', groupMap);

    // Calculate total available stock - only calculate (entree - sortie) when quality_status == 'conforme'
    const totalStock = Object.values(groupMap).reduce((total: number, lot: any) => {
      const isConformeQuality = lot.quality_status === 'conforme' || lot.quality_status === 'Conforme';
      
      if (isConformeQuality) {
        const disponible = lot.entree - lot.sortie;
        console.log('🧮 Lot calculation (conforme):', {
          batch: lot.batch_number,
          location: lot.location_name,
          quality_status: lot.quality_status,
          entree: lot.entree,
          sortie: lot.sortie,
          disponible
        });
        return total + Math.max(0, disponible); // Only add positive stock
      } else {
        console.log('❌ Lot skipped (not conforme):', {
          batch: lot.batch_number,
          location: lot.location_name,
          quality_status: lot.quality_status
        });
        return total; // Don't add anything for non-conforme lots
      }
    }, 0);

    console.log('🎯 Final Total Stock:', totalStock);
    setAvailableStock(totalStock);
  };

  const calculateLotTable = async () => {
    if (!selectedProduct || !quantity || !movementHistory.length) return;

    // Group movements by lot and location (similar to ProductOperationDialog logic)
    const groupMap: Record<string, any> = {};

    // Filter movements for the selected product, excluding transfers
    const filteredMovements = movementHistory.filter(row =>
      row.product_id === selectedProduct.id &&
      row.is_transfer !== 1 &&
      row.is_transfer !== '1' &&
      row.is_transfer !== true &&
      row.internal_transfer !== 1 &&
      row.internal_transfer !== '1' &&
      row.internal_transfer !== true
    );

    for (const row of filteredMovements) {
      const key = [
        row.batch_number || row.lot || '',
        row.location_name || '',
        row.etage_name || '',
        row.part_id || ''
      ].join('||');

      if (!groupMap[key]) {
        groupMap[key] = {
          batch_number: row.batch_number || row.lot || '',
          fabrication_date: row.fabrication_date || row.date,
          expiration_date: row.expiration_date,
          location_name: row.location_name,
          etage_name: row.etage_name,
          part_name: row.part_name,
          quality_status: row.quality_status || 'N/A',
          location_id: row.location_id,
          etage_id: row.etage_id,
          part_id: row.part_id,
          entree: 0,
          sortie: 0
        };
      }

      // Parse quantity as number and handle different status values
      const quantity = parseInt(row.quantity) || 0;

      if (row.status === 'Entrée' || row.status === 'Entree') {
        groupMap[key].entree += quantity;
      } else if (row.status === 'Sortie') {
        groupMap[key].sortie += quantity;
      }
    }

    // Convert to array and calculate disponible - only for conforme quality
    let visibleRows = Object.values(groupMap).map((row: any) => {
      // Create a unique identifier for this specific lot row
      const uniqueKey = [
        row.batch_number || '',
        row.location_name || '',
        row.etage_name || '',
        row.part_id || ''
      ].join('||');

      // Only calculate disponible (entree - sortie) when quality_status == 'conforme'
      const isConformeQuality = row.quality_status === 'conforme' || row.quality_status === 'Conforme';
      const disponible = isConformeQuality ? (row.entree - row.sortie) : 0;

      return {
        ...row,
        uniqueKey,
        disponible
      };
    }).filter((row: any) => row.disponible > 0); // Only show rows with positive disponible

    // Sort by expiration date (asc), then fabrication date (asc), then lot (asc) - FIFO
    visibleRows.sort((a: any, b: any) => {
      // Sort by expiration date first (earliest expiration first)
      const expA = a.expiration_date ? new Date(a.expiration_date) : new Date(8640000000000000); // far future if missing
      const expB = b.expiration_date ? new Date(b.expiration_date) : new Date(8640000000000000);
      const expDiff = expA.getTime() - expB.getTime();
      if (expDiff !== 0) return expDiff;
      
      // Then by fabrication date (earliest first)
      const dateA = new Date(a.fabrication_date || '1970-01-01');
      const dateB = new Date(b.fabrication_date || '1970-01-01');
      const dateDiff = dateA.getTime() - dateB.getTime();
      if (dateDiff !== 0) return dateDiff;
      
      // Finally by lot/batch number (alphabetical)
      return String(a.batch_number || '').localeCompare(String(b.batch_number || ''));
    });

    // Calculate FIFO allocation (Pris)
    let remainingToTake = parseInt(quantity) || 0;
    const lotRows = await Promise.all(visibleRows.map(async (row: any) => {
      if (remainingToTake <= 0) return { ...row, pris: 0, qrCode: null };
      const pris = Math.min(row.disponible, remainingToTake);
      remainingToTake -= pris;

      // Generate QR code for this specific lot if it will be taken
      let qrCode = null;
      if (pris > 0) {
        try {
          console.log('🔍 Generating QR code for lot:', {
            batch_number: row.batch_number,
            productId: selectedProduct.id,
            quantity: pris,
            part_id: row.part_id,
            etage_id: row.etage_id
          });
          
          const qrData: QRCodeData = {
            productId: selectedProduct.id,
            productName: selectedProduct.nom,
            productReference: selectedProduct.reference,
            batchNumber: row.batch_number,
            quantity: pris,
            fabricationDate: row.fabrication_date || '',
            expirationDate: row.expiration_date || '',
            supplier: 'Sortie Employeur',
            location: row.location_name || '',
            floorId: row.part_id || row.etage_id, // Use part_id as floor_id
            floors: [{
              name: row.etage_name || row.part_name || 'N/A',
              quantity: pris
            }],
            operationType: 'Sortie',
            timestamp: new Date().toISOString()
          };
          qrCode = await generateQRCodeImage(qrData, true); // Use simple format for lot QR codes
        } catch (error) {
          console.error('Error generating QR code for lot:', error);
        }
      }

      return { ...row, pris, qrCode };
    }));

    setLotData(lotRows);
  };

  // Helper function to format dates for sortie operations (avoid timezone issues)
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

  // Confirm and create sortie movements from scanned items
  const confirmSortieMovements = async () => {
    if (scannedItems.length === 0) return;

    setLoading(true);
    try {
      // Create movement entries for each scanned lot
      const movementPromises = scannedItems.map(async (scannedItem) => {
        const { lotRow, scannedQuantity } = scannedItem;

        // Format dates properly to avoid timezone issues
        const formattedFabricationDate = formatDateForSortie(lotRow.fabrication_date || '');
        const formattedExpirationDate = formatDateForSortie(lotRow.expiration_date || '');

        const movementData = {
          product_type: selectedProduct?.type || 'matiere',
          product_id: selectedProduct?.id,
          status: 'Sortie',
          quantity: scannedQuantity,
          location_id: lotRow.location_id,
          fabricationDate: formattedFabricationDate,
          expirationDate: formattedExpirationDate,
          date: new Date().toISOString().slice(0, 10), // Use current date to avoid timezone issues
          etage_id: lotRow.etage_id,
          part_id: lotRow.part_id,
          batch_number: lotRow.batch_number,
          time: new Date().toLocaleTimeString('fr-FR'),
          quality_status: lotRow.quality_status // Preserve the same quality status from the original lot
        };

       const response = await fetch('/api/movements', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(movementData),
        });

        if (!response.ok) {
          throw new Error(`Failed to create movement: ${response.statusText}`);
        }

        return response.json();
      });

      await Promise.all(movementPromises);

      const totalQuantity = scannedItems.reduce((sum, item) => sum + item.scannedQuantity, 0);
      
      // Add to completed operations history
      const completedOperation: CompletedOperation = {
        id: Date.now().toString(),
        productName: selectedProduct?.nom || '',
        productReference: selectedProduct?.reference || '',
        quantity: totalQuantity,
        unite: selectedProduct?.unite || '',
        lotsCount: scannedItems.length,
        timestamp: new Date().toISOString(),
        scannedItems: [...scannedItems]
      };
      
      setCompletedOperations(prev => [completedOperation, ...prev.slice(0, 4)]); // Keep only last 5 operations
      
      toast.success(`Sortie créée avec succès: ${totalQuantity} ${selectedProduct?.unite} de ${selectedProduct?.nom}`);

      // Reset state to allow new operation but keep the table visible
      setScannedItems([]);
      setShowConfirmation(false);
      setQuantity('');
      setLotData([]); // Clear lot data so user needs to enter new quantity

      // Refresh data
      if (selectedProduct) {
        await fetchMovementHistory(selectedProduct.id);
      }

    } catch (error) {
      console.error('Error creating sortie movements:', error);
      toast.error('Erreur lors de la création de la sortie');
    } finally {
      setLoading(false);
    }
  };

  // Helper function to validate JSON
  const isValidJson = (str: string): boolean => {
    if (!str.trim()) return false;
    try {
      JSON.parse(str);
      return true;
    } catch {
      return false;
    }
  };

  // Handle QR Code scanning - Simple format: {lot_number}|{quantity}|{floor_id}
  const handleQRCodeScan = async (qrData: string) => {
    console.log('🔍 handleQRCodeScan called with:', qrData);
    
    if (!qrData.trim()) {
      console.log('❌ Empty QR data');
      return;
    }

    try {
      // Try to parse as simple format first: {lot_number}|{quantity}|{floor_id}
      console.log('🔎 Checking if QR data contains |:', qrData.includes('|'));
      
      if (qrData.includes('|')) {
        const parts = qrData.split('|');
        console.log('📊 Split parts:', parts, 'Length:', parts.length);
        
        if (parts.length === 3) {
          const [lotNumber, quantityStr, floorIdStr] = parts;
          const quantity = parseInt(quantityStr);
          const floorId = parseInt(floorIdStr);
          
          console.log('📋 Parsed simple format:', {
            lotNumber,
            quantityStr,
            quantity,
            floorIdStr,
            floorId
          });

          console.log('✅ Using lot number from QR code, searching for lot in FIFO table...');
          console.log('📦 Available lots:', lotData.length);
          console.log('🔍 Searching criteria:', {
            lotNumber,
            quantity,
            floorId,
            lotsWithPris: lotData.filter(lot => lot.pris > 0).length
          });

          // Find matching lot in FIFO table based on lot number and floor_id
          const matchingLot = lotData.find(lot => {
            const matches = lot.pris > 0 && // Only lots that are allocated in FIFO
              lot.batch_number === lotNumber &&
              (lot.part_id === floorId || lot.etage_id === floorId);
            
            console.log('🔎 Checking lot:', {
              batch: lot.batch_number,
              pris: lot.pris,
              disponible: lot.disponible,
              part_id: lot.part_id,
              etage_id: lot.etage_id,
              lotNumber,
              floorId,
              qrQuantity: quantity,
              matches
            });
            
            return matches;
          });

            console.log('🎯 Matching lot found:', matchingLot);

            if (!matchingLot) {
              console.log('❌ No matching lot found in FIFO table');
              toast.error('Ce QR code ne correspond à aucun lot dans le tableau FIFO');
              return;
            }

            // Check if this specific lot row has already been scanned
            const alreadyScanned = scannedItems.find(item =>
              item.lotRow.uniqueKey === matchingLot.uniqueKey
            );

            console.log('🔄 Already scanned check:', {
              alreadyScanned: !!alreadyScanned,
              scannedItemsCount: scannedItems.length,
              matchingLotKey: matchingLot.uniqueKey
            });

            if (alreadyScanned) {
              console.log('❌ Lot already scanned');
              toast.error('Ce lot a déjà été scanné');
              return;
            }

            // Check if we need partial quantity confirmation
            const quantityToTake = matchingLot.pris; // Use FIFO allocated quantity
            
            console.log('🔢 Quantity analysis:', {
              qrQuantity: quantity,
              fifoAllocated: matchingLot.pris,
              available: matchingLot.disponible,
              willTake: quantityToTake
            });

            // If taking less than what's available, show confirmation
            if (quantityToTake < matchingLot.disponible) {
              console.log('⚠️ PARTIAL QUANTITY DETECTED - Showing confirmation');
              
              // Show confirmation dialog for partial quantity
              setPartialScanConfirmation({
                qrData: { 
                  batchNumber: lotNumber,
                  quantity: quantityToTake,
                  operationType: 'Sortie'
                },
                availableLot: matchingLot,
                requestedQuantity: quantityToTake,
                availableQuantity: matchingLot.disponible
              });

              // Close scanner first, then show partial confirmation
              setShowScanner(false);
              setScannerLoading(false);

              // Use setTimeout to ensure scanner closes before showing partial dialog
              setTimeout(() => {
                setShowPartialConfirmDialog(true);
              }, 100);

              toast.info(`Confirmation requise: prendre ${quantityToTake} sur ${matchingLot.disponible} disponibles`);
              return;
            }

            // Full quantity - process directly
            const scannedItem: ScannedItem = {
              lotRow: matchingLot,
              scannedQuantity: quantityToTake,
              availableQuantity: matchingLot.disponible,
              timestamp: new Date().toISOString()
            };

            console.log('✅ Adding scanned item (full quantity):', scannedItem);
            setScannedItems(prev => {
              const newItems = [...prev, scannedItem];
              console.log('📝 Updated scanned items:', newItems.length);
              return newItems;
            });
            setShowScanner(false);
            toast.success(`QR code validé pour le lot ${matchingLot.batch_number} - Quantité: ${quantityToTake}`);
            console.log('🎉 Simple QR code processing completed successfully');
            return;
        } else {
          console.log('❌ Invalid simple format - not 3 parts');
        }
      } else {
        console.log('🔄 No pipe found, trying JSON format...');
      }

      // Fallback to old JSON format for backward compatibility
      console.log('🔄 Attempting JSON parse...');
      const parsedData = JSON.parse(qrData);
      console.log('📋 Parsed JSON data:', parsedData);

      // Validate QR code data structure
      if (!parsedData.productId || !parsedData.quantity || !parsedData.operationType) {
        toast.error('QR code invalide: données manquantes');
        return;
      }

      // Check if this is for the currently selected product
      if (!selectedProduct || parsedData.productId !== selectedProduct.id) {
        toast.error('Ce QR code ne correspond pas au produit sélectionné');
        return;
      }

      // Extract location and floor/part information from QR code
      const qrLocation = parsedData.location || '';
      const qrFloorName = parsedData.floors && parsedData.floors.length > 0 ? parsedData.floors[0].name : '';
      const qrBatchNumber = parsedData.batchNumber || '';

      // Check if this QR code matches any lot in the FIFO table
      const matchingLot = lotData.find(lot =>
        lot.batch_number === qrBatchNumber &&
        lot.location_name === qrLocation &&
        (lot.etage_name === qrFloorName || lot.part_name === qrFloorName) &&
        lot.pris > 0 // Only lots that are allocated in FIFO
      );

      if (!matchingLot) {
        toast.error(`Ce lot n'est pas dans la liste FIFO pour cette sortie. Veuillez scanner uniquement les lots affichés dans le tableau ci-dessous.`);
        return;
      }

      // Check if this specific lot row has already been scanned
      const alreadyScanned = scannedItems.find(item =>
        item.lotRow.uniqueKey === matchingLot.uniqueKey
      );

      if (alreadyScanned) {
        toast.error('Ce lot a déjà été scanné');
        return;
      }

      // Handle different operation types
      if (parsedData.operationType === 'Sortie') {
        // This is a QR code from the lot table - handle as before
        handleSortieQRScan(parsedData);
      } else if (parsedData.operationType === 'Entrée' || parsedData.operationType.includes('Entrée')) {
        // This is a QR code from an existing lot in stock - handle partial scanning
        handleStockQRScan(parsedData);
      } else {
        toast.error('Ce QR code n\'est pas compatible avec les opérations de sortie');
        return;
      }

    } catch (error) {
      console.error('❌ Error parsing QR code:', error);
      console.log('🔍 QR data that failed:', qrData);
      toast.error('QR code invalide: format incorrect');
    }
  };

  // Handle scanning of QR codes generated from the sortie lot table
  const handleSortieQRScan = (parsedData: any) => {
    let matchingLot = null;

    // First try to match using the unique key if available (for QR codes generated by this system)
    if (parsedData.uniqueKey) {
      matchingLot = lotData.find(lot =>
        lot.uniqueKey === parsedData.uniqueKey &&
        lot.pris > 0
      );
    }

    // Fallback to manual matching if unique key is not available
    if (!matchingLot) {
      const floorName = parsedData.floors && parsedData.floors.length > 0 ? parsedData.floors[0].name : '';

      matchingLot = lotData.find(lot =>
        lot.batch_number === parsedData.batchNumber &&
        lot.location_name === parsedData.location &&
        (lot.etage_name === floorName || lot.part_name === floorName) &&
        lot.pris > 0
      );
    }

    if (!matchingLot) {
      toast.error('Lot non trouvé dans la liste des lots à sortir pour cet emplacement spécifique');
      return;
    }

    // Check if this specific lot row has already been scanned using unique key
    const alreadyScanned = scannedItems.find(item =>
      item.lotRow.uniqueKey === matchingLot.uniqueKey
    );

    if (alreadyScanned) {
      toast.error('Ce lot à cet emplacement a déjà été scanné');
      return;
    }

    // Validate that the scanned quantity matches what was allocated for this lot
    if (parsedData.quantity !== matchingLot.pris) {
      toast.warning(`Attention: Quantité scannée (${parsedData.quantity}) différente de l'allocation FIFO (${matchingLot.pris}). Utilisation de l'allocation FIFO.`);
    }

    // Add to scanned items using the FIFO allocated quantity
    const scannedItem: ScannedItem = {
      lotRow: matchingLot,
      scannedQuantity: matchingLot.pris, // Use the FIFO allocated quantity
      availableQuantity: matchingLot.disponible,
      timestamp: new Date().toISOString()
    };

    setScannedItems(prev => [...prev, scannedItem]);
    setShowScanner(false);
    toast.success(`Lot ${parsedData.batchNumber} (${matchingLot.location_name}) scanné avec succès: ${matchingLot.pris} ${selectedProduct?.unite}`);
  };

  // Handle scanning of QR codes from existing stock (Entrée QR codes)
  const handleStockQRScan = async (parsedData: any) => {
    console.log('🔍 handleStockQRScan called with:', parsedData);

    // Extract floor/part information from the QR code
    const qrFloorName = parsedData.floors && parsedData.floors.length > 0 ? parsedData.floors[0].name : '';

    // Find the specific lot row that matches the QR code exactly (including location and floor/part)
    const availableLot = lotData.find(lot =>
      lot.batch_number === parsedData.batchNumber &&
      lot.location_name === parsedData.location &&
      (lot.etage_name === qrFloorName || lot.part_name === qrFloorName)
    );

    console.log('🎯 Found matching lot:', availableLot);

    if (!availableLot) {
      toast.error('Ce lot n\'est pas disponible pour ce produit à cet emplacement spécifique');
      return;
    }

    // Check if this specific lot row has already been scanned using the unique key
    const alreadyScanned = scannedItems.find(item =>
      item.lotRow.uniqueKey === availableLot.uniqueKey
    );

    if (alreadyScanned) {
      toast.error('Ce lot à cet emplacement a déjà été scanné');
      return;
    }

    // Calculate how much we still need
    const totalScanned = scannedItems.reduce((sum, item) => sum + item.scannedQuantity, 0);
    const totalNeeded = parseInt(quantity) || 0;
    const stillNeeded = totalNeeded - totalScanned;

    console.log('📊 Quantities - Total needed:', totalNeeded, 'Total scanned:', totalScanned, 'Still needed:', stillNeeded);

    if (stillNeeded <= 0) {
      toast.error('Quantité requise déjà atteinte');
      return;
    }

    // Determine how much to take from this specific lot row
    // Priority: 1) What we still need, 2) What's allocated to this row (pris), 3) What's available in this row
    let maxToTakeFromThisRow;

    if (availableLot.pris > 0) {
      // This row is part of the FIFO allocation - take up to the allocated amount or what we need
      maxToTakeFromThisRow = Math.min(availableLot.pris, stillNeeded);
    } else {
      // This row is not in the current FIFO allocation, but user is scanning it
      // Allow taking from it if we still need quantity (flexible FIFO)
      maxToTakeFromThisRow = Math.min(availableLot.disponible, stillNeeded);
    }

    console.log('🔢 Calculated quantities - Available:', availableLot.disponible, 'Pris:', availableLot.pris, 'Max to take:', maxToTakeFromThisRow);

    if (maxToTakeFromThisRow <= 0) {
      toast.error('Aucune quantité à prendre de ce lot');
      return;
    }

    // If we're taking less than what's available in this row, ask for confirmation
    if (maxToTakeFromThisRow < availableLot.disponible) {
      console.log('⚠️ PARTIAL SCAN DETECTED - Should show confirmation dialog');
      console.log('Max to take:', maxToTakeFromThisRow, 'Available:', availableLot.disponible);

      // Show confirmation dialog for partial quantity
      setPartialScanConfirmation({
        qrData: parsedData,
        availableLot: availableLot,
        requestedQuantity: maxToTakeFromThisRow,
        availableQuantity: availableLot.disponible
      });

      // Close scanner first, then show partial confirmation
      setShowScanner(false);
      setScannerLoading(false);

      console.log('🔄 Setting partial confirmation dialog to show...');

      // Use setTimeout to ensure scanner closes before showing partial dialog
      setTimeout(() => {
        console.log('⏰ Timeout executed - showing partial dialog');
        setShowPartialConfirmDialog(true);
      }, 100);

      toast.info(`Confirmation requise: prendre ${maxToTakeFromThisRow} sur ${availableLot.disponible} disponibles`);
    } else {
      console.log('✅ FULL SCAN - Taking all available quantity');

      // Take the full calculated quantity
      const scannedItem: ScannedItem = {
        lotRow: availableLot,
        scannedQuantity: maxToTakeFromThisRow,
        availableQuantity: availableLot.disponible,
        timestamp: new Date().toISOString()
      };

      setScannedItems(prev => [...prev, scannedItem]);
      setShowScanner(false);
      setScannerLoading(false);
      toast.success(`Lot ${parsedData.batchNumber} scanné: ${maxToTakeFromThisRow} ${selectedProduct?.unite}`);
    }
  };

  // Confirm partial quantity scan
  const confirmPartialScan = (confirmedQuantity: number) => {
    if (!partialScanConfirmation) return;

    const scannedItem: ScannedItem = {
      lotRow: partialScanConfirmation.availableLot,
      scannedQuantity: confirmedQuantity,
      availableQuantity: partialScanConfirmation.availableQuantity,
      timestamp: new Date().toISOString()
    };

    setScannedItems(prev => [...prev, scannedItem]);
    setShowPartialConfirmDialog(false);
    setPartialScanConfirmation(null);
    toast.success(`Lot ${partialScanConfirmation.availableLot.batch_number} scanné: ${confirmedQuantity} ${selectedProduct?.unite}`);
  };

  // Generate QR Code function (now generates a summary QR code)
  const generateQRCode = async () => {
    if (!selectedProduct || !quantity || lotData.length === 0) return;

    setLoading(true);
    try {
      const lotsToTake = lotData.filter(row => row.pris > 0);

      const qrData: QRCodeData = {
        productId: selectedProduct.id,
        productName: selectedProduct.nom,
        productReference: selectedProduct.reference,
        batchNumber: lotsToTake.length > 1 ? 'MIXED' : lotsToTake[0]?.batch_number || 'N/A',
        quantity: parseInt(quantity),
        fabricationDate: lotsToTake[0]?.fabrication_date || '',
        expirationDate: lotsToTake[0]?.expiration_date || '',
        supplier: 'Sortie Employeur',
        location: lotsToTake[0]?.location_name || '',
        floors: lotsToTake.map(row => ({
          name: row.etage_name || row.part_name || 'N/A',
          quantity: row.pris
        })),
        operationType: 'Sortie',
        timestamp: new Date().toISOString()
      };

      const qrCodeImage = await generateQRCodeImage(qrData, false); // Use complex format for summary QR codes
      setQrCodeData(qrCodeImage);
      toast.success('Code QR de résumé généré avec succès!');
    } catch (error) {
      console.error('Error generating QR code:', error);
      toast.error('Erreur lors de la génération du code QR');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-8 space-y-6 max-w-7xl">
        {/* Back to Dashboard */}
        <div>
          <Button
            variant="outline"
            onClick={() => navigate('/')}
            className="flex items-center gap-2"
          >
            <ArrowLeft size={16} />
            Go back to Dashboard
          </Button>
        </div>
        {/* Centered Product Selection Form - Show only when not ready to show lot table */}
        {!showLotTable && (
          <div className="flex justify-center">
            <Card className="w-full max-w-md">
              <CardHeader className="text-center">
                <CardTitle className="flex items-center justify-center gap-2">
                  <Package size={20} />
                  Sortie Mouvement
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Choisissez le produit et la quantité pour commencer
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Product Selection with built-in search */}
                <div>
                  <label className="block text-sm font-medium mb-2">Produit</label>
                  <Select
                    value={selectedProduct?.id.toString() || ''}
                    onValueChange={(value) => {
                      const product = products.find(p => p.id.toString() === value);
                      setSelectedProduct(product || null);
                      setQuantity('');
                      setLotData([]);
                      setQrCodeData(null);
                      setCompletedOperations([]); // Reset completed operations when changing product
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Rechercher et sélectionner un produit..." />
                    </SelectTrigger>
                    <SelectContent>
                      <div className="p-2">
                        <Input
                          type="text"
                          placeholder="Tapez pour rechercher..."
                          value={productSearch}
                          onChange={(e) => {
                            e.stopPropagation();
                            setProductSearch(e.target.value);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="mb-2"
                        />
                      </div>
                      {isDataLoading ? (
                        <div className="flex items-center justify-center py-4">
                          <LoadingSpinner size="sm" text="Chargement..." />
                        </div>
                      ) : (
                        products
                          .filter(product =>
                            productSearch === '' ||
                            product.nom.toLowerCase().includes(productSearch.toLowerCase()) ||
                            product.reference.toLowerCase().includes(productSearch.toLowerCase())
                          )
                          .map(product => (
                            <SelectItem key={product.id} value={product.id.toString()}>
                              {product.nom} ({product.reference})
                            </SelectItem>
                          ))
                      )}
                      {products.filter(product =>
                        productSearch === '' ||
                        product.nom.toLowerCase().includes(productSearch.toLowerCase()) ||
                        product.reference.toLowerCase().includes(productSearch.toLowerCase())
                      ).length === 0 && productSearch !== '' && (
                          <div className="px-2 py-1 text-sm text-muted-foreground">
                            Aucun produit trouvé
                          </div>
                        )}
                    </SelectContent>
                  </Select>
                </div>



                {/* Quantity Input - Only show when stock is available */}
                {selectedProduct && availableStock > 0 && (
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Quantité ({selectedProduct.unite})
                    </label>
                    <Input
                      type="number"
                      placeholder="Entrez la quantité"
                      value={quantity}
                      onChange={(e) => {
                        const value = e.target.value;
                        setQuantity(value);
                      }}
                      min="1"
                      max={availableStock}
                      className={parseInt(quantity) > availableStock ? "border-destructive" : ""}
                    />
                    {parseInt(quantity) > availableStock && (
                      <p className="text-sm text-destructive mt-1">
                        Quantité demandée ({parseInt(quantity)}) dépasse le stock disponible ({availableStock})
                      </p>
                    )}
                  </div>
                )}

                {/* No Stock Message */}
                {selectedProduct && availableStock === 0 && (
                  <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                    <div className="flex items-center gap-2 text-destructive">
                      <AlertTriangle size={16} />
                      <p className="text-sm font-medium">
                        Aucun stock conforme disponible pour ce produit
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Veuillez sélectionner un autre produit ou vérifier les entrées de stock.
                    </p>
                  </div>
                )}

                {/* Next Button */}
                {selectedProduct && quantity && parseInt(quantity) > 0 && (
                  <div className="pt-4">
                    <Button
                      onClick={async () => {
                        if (selectedProduct && quantity && movementHistory.length > 0) {
                          // Calculate lot table and show it
                          await calculateLotTable();
                          setShowLotTable(true);
                        }
                      }}
                      className="w-full"
                      size="lg"
                      disabled={
                        !movementHistory.length ||
                        availableStock === 0 ||
                        parseInt(quantity) > availableStock ||
                        parseInt(quantity) <= 0
                      }
                    >
                      {!movementHistory.length
                        ? 'Chargement des données...'
                        : availableStock === 0
                          ? 'Aucun stock conforme disponible'
                          : parseInt(quantity) > availableStock
                            ? 'Quantité trop élevée'
                            : 'Suivant - Voir les Lots FIFO'
                      }
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}





        {/* Main Sortie Interface - Merged title with lot table */}
        {showLotTable && selectedProduct && (
          <Card>
            <CardHeader className="pb-6 space-y-4">
              {/* Main title and product info combined */}
              <div className="text-center space-y-2">
                <h1 className="text-3xl font-bold tracking-tight">Sortie Employeurs</h1>
                <p className="text-muted-foreground">
                  Scannez les lots dans l'ordre FIFO pour effectuer la sortie
                </p>
              </div>

              {/* Product summary card */}
              <Card className="border-2">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-6">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                          <Package size={24} className="text-muted-foreground" />
                        </div>
                        <div>
                          <h2 className="text-xl font-bold">{selectedProduct.nom}</h2>
                          <p className="text-sm text-muted-foreground">Référence: {selectedProduct.reference}</p>
                        </div>
                      </div>
                      <Separator orientation="vertical" className="h-12" />
                      <div className="text-center">
                        <p className="text-2xl font-bold">{quantity || '0'}</p>
                        <p className="text-sm text-muted-foreground">{selectedProduct.unite}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedProduct(null);
                          setQuantity('');
                          setLotData([]);
                          setScannedItems([]);
                          setQrCodeData(null);
                          setShowLotTable(false);
                          setCompletedOperations([]); // Reset completed operations when changing product
                        }}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <X size={16} className="mr-2" />
                        Modifier
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          // Reset everything and go back to product selection
                          setSelectedProduct(null);
                          setQuantity('');
                          setLotData([]);
                          setScannedItems([]);
                          setQrCodeData(null);
                          setShowLotTable(false);
                          setCompletedOperations([]);
                          setShowConfirmation(false);
                          setPartialScanConfirmation(null);
                          setShowPartialConfirmDialog(false);
                        }}
                        className="text-blue-600 hover:text-blue-700 border-blue-200 hover:border-blue-300"
                      >
                        <Package size={16} className="mr-2" />
                        New Operation
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>



              {/* Completed Operations History */}
              {completedOperations.length > 0 && (
                <Card className="border-gray-200 bg-gray-50/30">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <CheckCircle size={16} className="text-gray-500" />
                      <h4 className="font-medium text-gray-700">Sorties Récentes</h4>
                    </div>
                    <div className="space-y-2">
                      {completedOperations.slice(0, 3).map((operation) => {
                        // Extract unique floor names from scanned items
                        const floorNames = [...new Set(
                          operation.scannedItems.map(item => 
                            item.lotRow.etage_name || item.lotRow.part_name || 'N/A'
                          )
                        )].join(', ');
                        
                        return (
                          <div key={operation.id} className="flex items-center justify-between p-2 bg-white rounded border border-gray-200">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                                <CheckCircle size={14} className="text-gray-500" />
                              </div>
                              <div className="flex-1">
                                <p className="text-sm font-medium text-gray-700">
                                  {operation.productName} | {floorNames} | {operation.quantity} {operation.unite}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {operation.lotsCount} lot(s)
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-gray-500">
                                {new Date(operation.timestamp).toLocaleTimeString('fr-FR', { 
                                  hour: '2-digit', 
                                  minute: '2-digit' 
                                })}
                              </p>
                              <Badge variant="outline" className="text-xs border-gray-300 text-gray-600">
                                Terminé
                              </Badge>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Action header */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">Lots à Scanner</h3>
                  <p className="text-sm text-muted-foreground">
                    {lotData.filter(row => row.pris > 0).length} lot(s) disponible(s)
                  </p>
                </div>
                {lotData.filter(row => row.pris > 0).length > 0 && (
                  <Button
                    onClick={() => {
                      setShowScanner(true);
                      setScannerLoading(true);
                      // Simulate scanner initialization
                      setTimeout(() => {
                        setScannerLoading(false);
                      }, 1500);
                    }}
                    size="lg"
                    className="flex items-center gap-2"
                  >
                    <Scan size={18} />
                    Commencer le Scan
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm border">
                  <thead>
                    <tr className="bg-muted">
                      <th className="border px-3 py-2 text-left">Date Fabrication</th>
                      <th className="border px-3 py-2 text-left">Date Expiration</th>
                      <th className="border px-3 py-2 text-left">Emplacement</th>
                      <th className="border px-3 py-2 text-left">Étage/Partie</th>
                      <th className="border px-3 py-2 text-left">Qualité</th>
                      <th className="border px-3 py-2 text-right">Entrée</th>
                      <th className="border px-3 py-2 text-right">Sortie</th>
                      <th className="border px-3 py-2 text-right">Disponible</th>
                      <th className="border px-3 py-2 text-right">Pris</th>
                      <th className="border px-3 py-2 text-center">Statut Scan</th>
                      <th className="border px-3 py-2 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lotData.length > 0 ? (
                      lotData.filter(row => row.pris > 0).length > 0 ? (
                        lotData.filter(row => row.pris > 0).map((row, index) => {
                          // Check if this lot row has been scanned in current operation
                          const scannedItem = scannedItems.find(item =>
                            item.lotRow.uniqueKey === row.uniqueKey
                          );
                          const isScanned = !!scannedItem;
                          
                          // Check if this lot was completed in any previous operation
                          const isCompleted = completedOperations.some(operation =>
                            operation.scannedItems.some(item =>
                              item.lotRow.uniqueKey === row.uniqueKey
                            )
                          );

                          return (
                            <tr key={index} className={`hover:bg-muted/50 ${isScanned ? 'bg-muted' : ''} ${isCompleted ? 'opacity-60' : ''}`}>
                              <td className={`border px-3 py-2 ${isCompleted ? 'line-through text-muted-foreground' : ''}`}>
                                {row.fabrication_date ? new Date(row.fabrication_date).toLocaleDateString('fr-FR') : 'N/A'}
                              </td>
                              <td className={`border px-3 py-2 ${isCompleted ? 'line-through text-muted-foreground' : ''}`}>
                                {row.expiration_date ? new Date(row.expiration_date).toLocaleDateString('fr-FR') : 'N/A'}
                              </td>
                              <td className={`border px-3 py-2 ${isCompleted ? 'line-through text-muted-foreground' : ''}`}>{row.location_name}</td>
                              <td className={`border px-3 py-2 ${isCompleted ? 'line-through text-muted-foreground' : ''}`}>
                                {row.etage_name || row.part_name || 'N/A'}
                              </td>
                              <td className="border px-3 py-2">
                                <Badge variant={row.quality_status === 'Conforme' ? 'default' : 'secondary'} className={isCompleted ? 'opacity-50' : ''}>
                                  {row.quality_status}
                                </Badge>
                              </td>
                              <td className={`border px-3 py-2 text-right ${isCompleted ? 'line-through text-muted-foreground' : ''}`}>{row.entree}</td>
                              <td className={`border px-3 py-2 text-right ${isCompleted ? 'line-through text-muted-foreground' : ''}`}>{row.sortie}</td>
                              <td className={`border px-3 py-2 text-right ${isCompleted ? 'line-through text-muted-foreground' : ''}`}>{row.disponible}</td>
                              <td className={`border px-3 py-2 text-right font-bold ${isCompleted ? 'line-through text-muted-foreground' : ''}`}>
                                {row.pris}
                              </td>
                              <td className="border px-3 py-2 text-center">
                                {isCompleted ? (
                                  <span className="px-2 py-1 rounded-full bg-gray-400 text-white text-xs font-semibold" title="Terminé">Terminé</span>
                                ) : isScanned ? (
                                  <span className="px-2 py-1 rounded-full bg-green-500 text-white text-xs font-semibold" title="Scanné">Scanné</span>
                                ) : (
                                  <span className="px-2 py-1 rounded-full bg-yellow-300 text-yellow-900 text-xs font-semibold" title="En attente">En attente</span>
                                )}
                              </td>
                              <td className="border px-3 py-2 text-center">
                                {isCompleted ? (
                                  <span className="text-xs text-muted-foreground">Terminé</span>
                                ) : isScanned ? (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      // Find the scanned item index and remove it
                                      const scannedItemIndex = scannedItems.findIndex(item =>
                                        item.lotRow.uniqueKey === row.uniqueKey
                                      );
                                      if (scannedItemIndex !== -1) {
                                        setScannedItems(prev => prev.filter((_, i) => i !== scannedItemIndex));
                                        toast.success(`Scan annulé pour le lot ${row.batch_number}`);
                                      }
                                    }}
                                    className="text-muted-foreground hover:text-destructive"
                                  >
                                    <X size={14} className="mr-1" />
                                    Annuler
                                  </Button>
                                ) : (
                                  <span className="text-muted-foreground text-xs">-</span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={11} className="border px-3 py-8 text-center text-muted-foreground">
                            Stock insuffisant. Aucun lot disponible pour la quantité demandée.
                          </td>
                        </tr>
                      )
                    ) : (
                      <tr>
                        <td colSpan={11} className="border px-3 py-8 text-center text-muted-foreground">
                          Aucun historique de mouvement trouvé pour ce produit.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 p-3 bg-muted rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Total à sortir:</span>
                  <span className="font-bold">
                    {lotData.length > 0 ? lotData.reduce((sum, row) => sum + row.pris, 0) : 0} {selectedProduct?.unite}
                  </span>
                </div>
              </div>

              {/* Action Buttons - Show when there are scanned items */}
              {scannedItems.length > 0 && (
                <div className="mt-4 space-y-3">
                  {/* Action buttons */}
                  <div className="flex justify-center">
                    <Button
                      onClick={() => setShowConfirmation(true)}
                      className="w-auto px-8"
                      size="lg"
                      disabled={scannedItems.reduce((sum, item) => sum + item.scannedQuantity, 0) !== (parseInt(quantity) || 0)}
                    >
                      <CheckCircle size={16} className="mr-2" />
                      Confirmer la Sortie
                    </Button>
                  </div>
                </div>
              )}


            </CardContent>
          </Card>
        )}



        {/* QR Scanner Dialog */}
        <Dialog open={showScanner} onOpenChange={(open) => {
          if (!open) {
            setShowScanner(false);
            setScannerLoading(false);
            setManualJsonInput('');
          }
        }}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Scan size={20} />
                Scanner QR Code - FIFO
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6">
              {/* Current lot to scan - FIFO guidance */}
              {(() => {
                // Find the next lot to scan (first unscanned lot in FIFO order)
                const lotsToScan = lotData.filter(row => row.pris > 0);
                const nextLotToScan = lotsToScan.find(lot => 
                  !scannedItems.some(item => item.lotRow.uniqueKey === lot.uniqueKey)
                );
                
                const scannedCount = scannedItems.length;
                const totalLots = lotsToScan.length;

                return (
                  <Card className="border-2 border-primary/20">
                    <CardContent className="p-4">
                      {nextLotToScan ? (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                                {scannedCount + 1}
                              </div>
                              <div>
                                <p className="font-medium text-primary">Lot à scanner maintenant</p>
                                <p className="text-xs text-muted-foreground">
                                  Étape {scannedCount + 1} sur {totalLots}
                                </p>
                              </div>
                            </div>
                            <Badge variant="outline" className="text-xs">
                              FIFO
                            </Badge>
                          </div>
                          
                          <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div>
                                <p className="text-muted-foreground">Lot:</p>
                                <p className="font-medium">{nextLotToScan.batch_number}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Quantité:</p>
                                <p className="font-medium">{nextLotToScan.pris} {selectedProduct?.unite}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Emplacement:</p>
                                <p className="font-medium">{nextLotToScan.location_name}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Étage/Partie:</p>
                                <p className="font-medium">
                                  {nextLotToScan.etage_name || nextLotToScan.part_name || 'N/A'}
                                </p>
                              </div>
                            </div>
                            
                            {nextLotToScan.expiration_date && (
                              <div className="pt-2 border-t border-muted">
                                <p className="text-xs text-muted-foreground">
                                  Exp: {new Date(nextLotToScan.expiration_date).toLocaleDateString('fr-FR')}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="text-center space-y-2">
                          <div className="w-12 h-12 mx-auto rounded-full bg-green-500 flex items-center justify-center">
                            <CheckCircle size={24} className="text-white" />
                          </div>
                          <p className="font-medium text-green-600">Tous les lots scannés!</p>
                          <p className="text-sm text-muted-foreground">
                            {scannedCount} lot(s) traité(s)
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })()}

              {/* Hidden input for QR scanner device */}
              <Input
                type="text"
                value={manualJsonInput}
                onChange={(e) => {
                  const value = e.target.value;
                  setManualJsonInput(value);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && manualJsonInput.trim()) {
                    e.preventDefault();
                    console.log('🔍 QR Scanner device input:', manualJsonInput);
                    handleQRCodeScan(manualJsonInput.trim());
                    setManualJsonInput('');
                  }
                }}
                autoFocus
                style={{
                  position: 'absolute',
                  left: '-9999px',
                  opacity: 0,
                  pointerEvents: 'none'
                }}
                tabIndex={-1}
              />

              {/* Scanner interface */}
              <div className="text-center space-y-4 py-6">
                <div className="w-16 h-16 mx-auto rounded-full bg-muted flex items-center justify-center">
                  {scannerLoading ? (
                    <Clock size={24} className="text-muted-foreground animate-spin" />
                  ) : (
                    <QrCode size={24} className="text-muted-foreground" />
                  )}
                </div>
                <div>
                  <h3 className="font-medium mb-2">
                    {scannerLoading ? 'Initialisation du scanner...' : 'Scannez le QR code du lot ci-dessus'}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {scannerLoading ? 'Veuillez patienter' : 'Respectez l\'ordre FIFO pour une gestion optimale'}
                  </p>
                </div>
              </div>

              {/* Progress indicator */}
              {lotData.filter(row => row.pris > 0).length > 0 && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Progression</span>
                    <span className="font-medium">
                      {scannedItems.length} / {lotData.filter(row => row.pris > 0).length} lots
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div 
                      className="bg-primary h-2 rounded-full transition-all duration-300" 
                      style={{ 
                        width: `${(scannedItems.length / lotData.filter(row => row.pris > 0).length) * 100}%` 
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowScanner(false);
                    setScannerLoading(false);
                    setManualJsonInput('');
                  }}
                  className="flex-1"
                >
                  Fermer
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Confirmation Dialog */}
        <Dialog open={showConfirmation} onOpenChange={setShowConfirmation}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle size={20} />
                Confirmer la Sortie
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6">
              {/* Summary card */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                      <Package size={24} className="text-muted-foreground" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{selectedProduct?.nom}</p>
                      <p className="text-sm text-muted-foreground">
                        {scannedItems.length} lot(s) • {scannedItems.reduce((sum, item) => sum + item.scannedQuantity, 0)} {selectedProduct?.unite}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Confirmation message */}
              <div className="text-center space-y-2">
                <p className="text-sm text-muted-foreground">
                  Vous êtes sur le point de créer une sortie définitive.
                </p>
                <p className="text-sm text-muted-foreground">
                  Cette action ne peut pas être annulée.
                </p>
              </div>

              {/* Action buttons */}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowConfirmation(false)}
                  className="flex-1"
                  size="lg"
                >
                  Annuler
                </Button>
                <Button
                  onClick={confirmSortieMovements}
                  disabled={loading}
                  className="flex-1"
                  size="lg"
                >
                  {loading ? (
                    <>
                      <Clock size={18} className="mr-2 animate-spin" />
                      Création...
                    </>
                  ) : (
                    <>
                      <CheckCircle size={18} className="mr-2" />
                      Confirmer
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Partial Scan Confirmation Dialog */}
        <Dialog open={showPartialConfirmDialog} onOpenChange={setShowPartialConfirmDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Package size={20} />
                Quantité Partielle
              </DialogTitle>
            </DialogHeader>

            {partialScanConfirmation && (
              <div className="space-y-6">
                {/* Lot information */}
                <Card>
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <div>
                        <p className="font-medium">Lot scanné</p>
                        <p className="text-sm text-muted-foreground">
                          {partialScanConfirmation.availableLot.batch_number}
                        </p>
                      </div>
                      <Separator />
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Emplacement</p>
                          <p className="font-medium">
                            {partialScanConfirmation.availableLot.location_name}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Étage/Partie</p>
                          <p className="font-medium">
                            {partialScanConfirmation.availableLot.etage_name || partialScanConfirmation.availableLot.part_name || 'N/A'}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Disponible</p>
                          <p className="font-medium">
                            {partialScanConfirmation.availableQuantity} {selectedProduct?.unite}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Nécessaire</p>
                          <p className="font-medium">
                            {partialScanConfirmation.requestedQuantity} {selectedProduct?.unite}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Information message */}
                <div className="p-4 bg-muted/50 rounded-lg text-center">
                  <p className="text-sm mb-3">
                    Quantité à prendre de ce lot:
                  </p>
                  <p className="text-2xl font-bold">
                    {partialScanConfirmation.requestedQuantity} {selectedProduct?.unite}
                  </p>
                </div>

                {/* Action buttons */}
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowPartialConfirmDialog(false);
                      setPartialScanConfirmation(null);
                      // Reopen scanner if user cancels
                      setShowScanner(true);
                      setScannerLoading(true);
                      setTimeout(() => setScannerLoading(false), 1000);
                    }}
                    className="flex-1"
                    size="lg"
                  >
                    Annuler
                  </Button>
                  <Button
                    onClick={() => {
                      confirmPartialScan(partialScanConfirmation.requestedQuantity);
                    }}
                    className="flex-1"
                    size="lg"
                  >
                    <CheckCircle size={18} className="mr-2" />
                    Confirmer
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default Sortie;


