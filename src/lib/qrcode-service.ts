import { generateQRCodeImage, type QRCodeData } from './qrcode';

export interface MovementRecord {
  id: number;
  product_id: number;
  product_designation?: string;
  product_reference?: string;
  product_unite?: string;
  batch_number: string;
  quantity: number;
  fabrication_date: string;
  expiration_date: string;
  supplier_name?: string;
  location_name: string;
  etage_name?: string;
  part_name?: string;
  status: string;
  date: string;
  product_type: string;
}

export const generateQRFromMovement = async (movement: MovementRecord): Promise<string> => {
  const qrData: QRCodeData = {
    productId: movement.product_id,
    productName: movement.product_designation || 'N/A',
    productReference: movement.product_reference || 'N/A',
    batchNumber: movement.batch_number,
    quantity: movement.quantity,
    fabricationDate: movement.fabrication_date,
    expirationDate: movement.expiration_date,
    supplier: movement.supplier_name || 'N/A',
    location: movement.location_name,
    floors: [{
      name: movement.etage_name || movement.part_name || 'N/A',
      quantity: movement.quantity
    }],
    operationType: `${movement.status}${movement.product_type === 'semi' ? ' (Semi-fini)' : ''}`,
    timestamp: movement.date
  };

  return await generateQRCodeImage(qrData, false); // Use complex format for movement records
};

export const generateQRFromMultipleMovements = async (movements: MovementRecord[]): Promise<string> => {
  if (movements.length === 0) {
    throw new Error('No movements provided');
  }

  const firstMovement = movements[0];
  const totalQuantity = movements.reduce((sum, m) => sum + m.quantity, 0);
  
  const floors = movements.map(m => ({
    name: m.etage_name || m.part_name || 'N/A',
    quantity: m.quantity
  }));

  const qrData: QRCodeData = {
    productId: firstMovement.product_id,
    productName: firstMovement.product_designation || 'N/A',
    productReference: firstMovement.product_reference || 'N/A',
    batchNumber: firstMovement.batch_number,
    quantity: totalQuantity,
    fabricationDate: firstMovement.fabrication_date,
    expirationDate: firstMovement.expiration_date,
    supplier: firstMovement.supplier_name || 'N/A',
    location: firstMovement.location_name,
    floors: floors,
    operationType: `${firstMovement.status}${firstMovement.product_type === 'semi' ? ' (Semi-fini)' : ''}`,
    timestamp: firstMovement.date
  };

  return await generateQRCodeImage(qrData, false); // Use complex format for movement records
};