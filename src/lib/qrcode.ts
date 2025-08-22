import QRCode from 'qrcode';

export interface QRCodeData {
  productId: number;
  productName?: string;
  productReference?: string;
  batchNumber?: string;
  quantity: number;
  fabricationDate?: string;
  expirationDate?: string;
  supplier?: string;
  location: string;
  floorId?: number; // Add floor_id for the new format
  floors?: Array<{
    name: string;
    quantity: number;
  }>;
  operationType?: string;
  timestamp?: string;
}

export const generateQRCodeData = (data: QRCodeData, useSimpleFormat: boolean = true): string => {
  if (useSimpleFormat) {
    // Create a simple format: {actual_lot_number}|{quantity}|{floor_id}
    // Only use actual batch number from database - if not available, log error
    if (!data.batchNumber || data.batchNumber === 'N/A' || data.batchNumber === '') {
      console.error('⚠️ QR Code generation: No valid batch number provided!', {
        batchNumber: data.batchNumber,
        productId: data.productId,
        quantity: data.quantity
      });
      // Generate a proper lot number as fallback
      const timestamp = new Date().toISOString().slice(0, 19).replace(/[-T:]/g, '').slice(0, 14);
      const lotNumber = `LOT-${timestamp.slice(0, 8)}-${timestamp.slice(8, 14)}-${data.productId}`;
      console.log('🔧 Generated fallback lot number:', lotNumber);
      const floorId = data.floorId || data.location || data.productReference || 'BP09';
      return `${lotNumber}|${data.quantity}|${floorId}`;
    }
    
    const lotNumber = data.batchNumber;
    const floorId = data.floorId || data.location || data.productReference || 'BP09';
    
    console.log('✅ QR Code generation using actual batch number:', {
      lotNumber,
      quantity: data.quantity,
      floorId
    });
    
    return `${lotNumber}|${data.quantity}|${floorId}`;
  } else {
    // Create a structured JSON string with all the data (backward compatibility)
    return JSON.stringify({
      productId: data.productId,
      productName: data.productName,
      productReference: data.productReference,
      batchNumber: data.batchNumber,
      quantity: data.quantity,
      fabricationDate: data.fabricationDate,
      expirationDate: data.expirationDate,
      supplier: data.supplier,
      location: data.location,
      floors: data.floors,
      operationType: data.operationType,
      timestamp: data.timestamp,
      // Add a verification hash or ID for security
      hash: btoa(`${data.productId}-${data.batchNumber}-${data.timestamp}`)
    });
  }
};

export const generateQRCodeImage = async (data: QRCodeData, useSimpleFormat: boolean = true): Promise<string> => {
  try {
    const qrData = generateQRCodeData(data, useSimpleFormat);
    
    // Generate QR code as data URL
    const qrCodeDataURL = await QRCode.toDataURL(qrData, {
      width: 200,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
    
    return qrCodeDataURL;
  } catch (error) {
    console.error('Error generating QR code:', error);
    throw new Error('Failed to generate QR code');
  }
};

export const generateQRCodeSVG = async (data: QRCodeData, useSimpleFormat: boolean = true): Promise<string> => {
  try {
    const qrData = generateQRCodeData(data, useSimpleFormat);
    
    // Generate QR code as SVG string
    const qrCodeSVG = await QRCode.toString(qrData, {
      type: 'svg',
      width: 200,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
    
    return qrCodeSVG;
  } catch (error) {
    console.error('Error generating QR code SVG:', error);
    throw new Error('Failed to generate QR code SVG');
  }
};