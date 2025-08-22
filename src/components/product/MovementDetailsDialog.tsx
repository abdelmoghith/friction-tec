import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Copy,
  Check,
  QrCode,
  Download,
  Printer
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';
import { generateQRFromMovement, type MovementRecord } from '@/lib/qrcode-service';
import { generateQRCodeImage, type QRCodeData } from '@/lib/qrcode';
import { toast } from 'sonner';

interface Movement {
  id?: string;
  status: string;
  quantity: number;
  created_at?: string;
  date?: string;
  time?: string;
  location_name?: string;
  etage_name?: string;
  part_name?: string;
  part_id?: number;
  etage_id?: number;
  fournisseur_name?: string;
  atelier?: string;
  fabrication_date?: string;
  expiration_date?: string;
  quality_status?: string;
  needs_examination?: boolean;
  batch_number?: string;
}

interface Product {
  id?: string;
  unite?: string;
  name?: string;
  reference?: string;
}

interface MovementDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  movement: Movement | null;
  product: Product | null;
}

const MovementDetailsDialog = ({ open, onOpenChange, movement, product }: MovementDetailsDialogProps) => {
  const [copied, setCopied] = useState(false);
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);
  const [qrCodeLoading, setQrCodeLoading] = useState(false);
  
  // Generate QR code for the movement (simple format)
  const generateQRCode = async (showToast: boolean = true) => {
    if (!movement || !product) return;
    
    setQrCodeLoading(true);
    try {
      // Use simple format for movement details
      console.log('🔍 MovementDetailsDialog QR generation:', {
        batch_number: movement.batch_number,
        productId: product.id,
        quantity: movement.quantity,
        part_id: movement.part_id,
        etage_id: movement.etage_id
      });
      
      const qrData: QRCodeData = {
        productId: parseInt(product.id || '0'),
        quantity: movement.quantity,
        location: movement.location_name || movement.etage_name || movement.part_name || product.reference || 'N/A',
        batchNumber: movement.batch_number, // Add the actual batch number
        floorId: movement.part_id || movement.etage_id
      };

      const qrCodeImage = await generateQRCodeImage(qrData, true); // Use simple format
      setQrCodeData(qrCodeImage);
      
      // Only show success toast if explicitly requested
      if (showToast) {
        toast.success('Code QR généré avec succès!');
      }
    } catch (error) {
      console.error('Error generating QR code:', error);
      toast.error('Erreur lors de la génération du code QR');
    } finally {
      setQrCodeLoading(false);
    }
  };
  
  // Auto-generate QR code when dialog opens or movement changes
  useEffect(() => {
    if (!open) {
      setQrCodeData(null);
      return;
    }
    
    // Auto-generate QR code when dialog opens with movement data (without toast)
    if (open && movement && product && !qrCodeData) {
      generateQRCode(false);
    }
  }, [open, movement?.id, product?.id, qrCodeData]);
  
  if (!movement) return null;

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatTime = (timeStr: string) => {
    if (!timeStr) return '-';
    return timeStr.slice(0, 5);
  };

  const getRelativeTime = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 24) {
      return `Il y a ${diffInHours}h`;
    } else if (diffInHours < 168) {
      return `Il y a ${Math.floor(diffInHours / 24)}j`;
    } else {
      return `Il y a ${Math.floor(diffInHours / 168)}sem`;
    }
  };

  const getMovementIcon = (status: string) => {
    return status === 'Entrée' ? TrendingUp : TrendingDown;
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      // Reset the copied state after 2 seconds
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const MovementIcon = getMovementIcon(movement.status);

  // Download QR code
  const downloadQRCode = () => {
    if (!qrCodeData) return;
    
    const link = document.createElement('a');
    link.download = `qr-code-movement-${movement.id || Date.now()}.png`;
    link.href = qrCodeData;
    link.click();
  };

  // Print QR code with AssemblageFormDialog style
  const printQRCode = () => {
    if (!qrCodeData) return;
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Fiche de Mouvement - ${movement.status}</title>
            <style>
              body {
                font-family: Arial, sans-serif;
                margin: 8px;
                line-height: 1.3;
                font-size: 14px;
              }
              .print-content {
                width: 100%;
                max-width: 210mm;
                margin: 0 auto;
              }

              /* Header Section - Larger and more prominent */
              .header-section {
                border: 3px solid black;
                margin-bottom: 15px;
                flex-shrink: 0;
              }
              .header-flex {
                display: flex;
              }
              .logo-section {
                border-right: 3px solid black;
                padding: 12px;
                width: 160px;
              }
              .logo-content {
                display: flex;
                flex-direction: column;
                align-items: center;
                margin-bottom: 6px;
              }
              .logo-img {
                width: 50px;
                height: 50px;
                object-fit: contain;
                margin-bottom: 6px;
              }
              .logo-text {
                font-size: 13px;
                font-weight: bold;
                text-align: center;
              }
              .title-section {
                flex: 1;
                padding: 12px;
                text-align: center;
                display: flex;
                flex-direction: column;
                justify-content: center;
              }
              .main-title {
                font-size: 18px;
                font-weight: bold;
                margin-bottom: 4px;
              }
              .sub-title {
                font-size: 16px;
                font-weight: bold;
                margin-bottom: 4px;
              }
              .arabic-text {
                font-size: 13px;
              }
              .info-section {
                border-left: 3px solid black;
                width: 200px;
              }
              .info-row {
                border-bottom: 1px solid black;
                padding: 6px;
                display: flex;
              }
              .info-row:last-child {
                border-bottom: none;
              }
              .info-label {
                font-weight: bold;
                width: 70px;
                font-size: 12px;
              }
              .info-value {
                border-left: 1px solid black;
                padding-left: 6px;
                flex: 1;
                font-size: 12px;
              }

              /* Content Section - Larger and fills more space */
              .content-section {
                border: 3px solid black;
                display: flex;
                min-height: 400px;
              }
              .left-section {
                width: 58%;
                border-right: 3px solid black;
                padding: 15px;
              }
              .right-section {
                width: 42%;
                padding: 15px;
                text-align: center;
              }
              .section-title {
                font-weight: bold;
                text-align: center;
                margin-bottom: 15px;
                text-decoration: underline;
                font-size: 16px;
              }
              .field-group {
                margin-bottom: 12px;
                flex-shrink: 0;
              }
              .field-label {
                font-weight: bold;
                margin-bottom: 4px;
                display: block;
                font-size: 13px;
              }
              .field-value {
                border-bottom: 2px solid black;
                padding: 4px 0;
                min-height: 20px;
                font-size: 14px;
                line-height: 1.2;
              }
              .field-value.last-field {
                border-bottom: none;
              }
              .qr-code-container {
                text-align: center;
                margin-bottom: 20px;
              }
              .qr-code-img {
                width: 150px;
                height: 150px;
                border: 2px solid black;
                padding: 6px;
                background: white;
                margin-bottom: 10px;
                display: block;
                margin-left: auto;
                margin-right: auto;
              }
              .qr-info-section {
                text-align: center;
                font-size: 12px;
                color: #333;
                line-height: 1.3;
                margin-top: 10px;
              }

              /* Footer Section - Larger but still compact */
              .footer-section {
                border: 3px solid black;
                border-top: none;
                padding: 10px;
                font-size: 11px;
                flex-shrink: 0;
              }
              .footer-text {
                margin-bottom: 4px;
                line-height: 1.2;
              }
              .footer-arabic {
                text-align: right;
              }

              @media print {
                body {
                  margin: 0;
                  padding: 0;
                  font-size: 14px;
                }
                .print-content {
                  page-break-inside: avoid;
                  height: 100vh;
                  overflow: hidden;
                  display: flex;
                  flex-direction: column;
                  max-width: none;
                  width: 100%;
                }
                .content-section {
                  flex: 1;
                  min-height: 0;
                }
                .left-section {
                  display: flex;
                  flex-direction: column;
                }
                .right-section {
                  display: flex;
                  flex-direction: column;
                  align-items: center;
                }
                * {
                  -webkit-print-color-adjust: exact;
                  color-adjust: exact;
                }
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
                    <h1 class="main-title">FICHE DE MOUVEMENT</h1>
                    <h2 class="sub-title">${movement.status.toUpperCase()}</h2>
                    <div class="arabic-text">بطاقة حركة المنتج</div>
                  </div>
                  
                  <!-- Info Section -->
                  <div class="info-section">
                    <div class="info-row">
                      <span class="info-label">CODE</span>
                      <span class="info-value">FM-${new Date().getFullYear()}</span>
                    </div>
                    <div class="info-row">
                      <span class="info-label">Version</span>
                      <span class="info-value">01</span>
                    </div>
                    <div class="info-row">
                      <span class="info-label">Date</span>
                      <span class="info-value">${formatDate(movement.created_at || movement.date)}</span>
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
                <!-- Left Section - Movement Details -->
                <div class="left-section">
                  <h3 class="section-title">Détails du mouvement</h3>
                  
                  <div class="field-group">
                    <label class="field-label">Produit المنتج :</label>
                    <div class="field-value">${product?.name || 'N/A'}</div>
                  </div>
                  
                  <div class="field-group">
                    <label class="field-label">Référence المرجع :</label>
                    <div class="field-value">${product?.reference || 'N/A'}</div>
                  </div>
                  
                  <div class="field-group">
                    <label class="field-label">Numéro de lot رقم الدفعة :</label>
                    <div class="field-value">${movement.batch_number || 'N/A'}</div>
                  </div>
                  
                  <div class="field-group">
                    <label class="field-label">Quantité الكمية :</label>
                    <div class="field-value">${movement.quantity} ${product?.unite || 'unités'}</div>
                  </div>
                  
                  <div class="field-group">
                    <label class="field-label">Emplacement الموقع :</label>
                    <div class="field-value">${movement.location_name || 'N/A'}</div>
                  </div>
                  
                  <div class="field-group">
                    <label class="field-label">Étage/Place الطابق/المكان :</label>
                    <div class="field-value">${movement.etage_name || movement.part_name || 'N/A'}</div>
                  </div>
                  
                  ${movement.fournisseur_name ? `
                  <div class="field-group">
                    <label class="field-label">Fournisseur المورد :</label>
                    <div class="field-value ${!movement.fabrication_date && !movement.expiration_date && !movement.quality_status ? 'last-field' : ''}">${movement.fournisseur_name}</div>
                  </div>
                  ` : ''}
                  
                  ${movement.fabrication_date ? `
                  <div class="field-group">
                    <label class="field-label">Date de fabrication تاريخ الإنتاج :</label>
                    <div class="field-value ${!movement.expiration_date && !movement.quality_status ? 'last-field' : ''}">${formatDate(movement.fabrication_date)}</div>
                  </div>
                  ` : ''}
                  
                  ${movement.expiration_date ? `
                  <div class="field-group">
                    <label class="field-label">Date d'expiration تاريخ الانتهاء :</label>
                    <div class="field-value ${!movement.quality_status ? 'last-field' : ''}">${formatDate(movement.expiration_date)}</div>
                  </div>
                  ` : ''}
                  
                  ${movement.quality_status ? `
                  <div class="field-group">
                    <label class="field-label">Statut qualité حالة الجودة :</label>
                    <div class="field-value last-field">${movement.quality_status === 'conforme' ? 'Conforme مطابق' : movement.quality_status === 'non-conforme' ? 'Non-conforme غير مطابق' : movement.quality_status}</div>
                  </div>
                  ` : ''}
                </div>

                <!-- Right Section - QR Code -->
                <div class="right-section">
                  <h3 class="section-title">Code QR de traçabilité</h3>

                  <div class="qr-code-container">
                    <img src="${qrCodeData}" alt="QR Code" class="qr-code-img" />

                    <div class="qr-info-section">
                      <p style="margin: 4px 0; font-weight: bold;">Scannez pour infos complètes</p>
                      <p style="margin: 6px 0; font-weight: bold; font-size: 11px;">ID: ${movement.id || 'N/A'}</p>
                      <p style="margin: 3px 0; font-size: 11px;">Date: ${formatDate(movement.created_at || movement.date)}</p>
                      <p style="margin: 3px 0; font-size: 11px;">Heure: ${formatTime(movement.time)}</p>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Footer Note - Compact -->
              <div class="footer-section">
                <p class="footer-text">
                  <strong>Note :</strong> Document certifiant le mouvement ${movement.status.toLowerCase()} - Code QR pour traçabilité complète.
                </p>
                <p class="footer-text footer-arabic">
                  <strong>ملاحظة :</strong> مستند يشهد حركة ${movement.status === 'Entrée' ? 'دخول' : 'خروج'} المنتج - رمز QR للتتبع الكامل.
                </p>
                <p class="footer-text">
                  Généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')} - نظام إدارة المخزون
                </p>
              </div>
            </div>

            <script>
              window.onload = function() {
                window.print();
                window.onafterprint = function() {
                  window.close();
                };
              };
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div>
                <DialogTitle className="text-xl">Détails du mouvement</DialogTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {getRelativeTime(movement.created_at || movement.date)}
                </p>
              </div>
            </div>
            
            {/* Lot Number at top with copy button */}
            {movement.batch_number && (
              <div className="flex items-center space-x-2 bg-gray-50 px-3 py-2 rounded-lg">
                <div className="text-right">
                  <span className="text-xs text-gray-500 block">
                    {copied ? 'Copié!' : 'Numéro de lot'}
                  </span>
                  <span className="text-sm font-mono font-medium">{movement.batch_number}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(movement.batch_number!)}
                  className={`h-8 w-8 p-0 transition-colors ${
                    copied
                      ? 'bg-green-100 hover:bg-green-200 text-green-600'
                      : 'hover:bg-gray-200'
                  }`}
                  title={copied ? 'Copié!' : 'Copier le numéro de lot'}
                >
                  {copied ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            )}
          </div>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Basic Movement Info with Lot Number */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Informations générales</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm font-medium text-gray-600">Date:</span>
                  <p className="text-sm mt-1">{formatDate(movement.created_at || movement.date)}</p>
                  <p className="text-xs text-muted-foreground">{getRelativeTime(movement.created_at || movement.date)}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-600">Heure:</span>
                  <p className="text-sm mt-1">{formatTime(movement.time)}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-600">Statut:</span>
                  <div className="mt-1">
                    <Badge variant={movement.status === 'Entrée' ? 'default' : 'secondary'}>
                      {movement.status}
                    </Badge>
                  </div>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-600">Quantité:</span>
                  <p className="text-sm mt-1">{movement.quantity} {product?.unite || ''}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Location Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Emplacement</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm font-medium text-gray-600">Emplacement:</span>
                  <p className="text-sm mt-1">{movement.location_name || '-'}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-600">Étage/Place:</span>
                  <p className="text-sm mt-1">{movement.etage_name || movement.part_name || '-'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Supplier/Workshop Info */}
          {(movement.fournisseur_name || movement.atelier) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  {movement.status === 'Entrée' ? 'Fournisseur' : 'Atelier'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div>
                  <span className="text-sm font-medium text-gray-600">
                    {movement.status === 'Entrée' ? 'Nom du fournisseur:' : 'Nom de l\'atelier:'}
                  </span>
                  <p className="text-sm mt-1">
                    {movement.status === 'Entrée' ? movement.fournisseur_name : movement.atelier}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Dates Info */}
          {(movement.fabrication_date || movement.expiration_date) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Dates importantes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  {movement.fabrication_date && (
                    <div>
                      <span className="text-sm font-medium text-gray-600">Date de fabrication:</span>
                      <p className="text-sm mt-1">{formatDate(movement.fabrication_date)}</p>
                      <p className="text-xs text-muted-foreground">{getRelativeTime(movement.fabrication_date)}</p>
                    </div>
                  )}
                  {movement.expiration_date && (
                    <div>
                      <span className="text-sm font-medium text-gray-600">Date d'expiration:</span>
                      <div className="mt-1 flex items-center space-x-2">
                        <p className={`text-sm ${
                          new Date(movement.expiration_date) < new Date() 
                            ? 'text-red-600 font-medium' 
                            : ''
                        }`}>
                          {formatDate(movement.expiration_date)}
                        </p>
                        {new Date(movement.expiration_date) < new Date() && (
                          <Badge variant="destructive" className="text-xs">
                            Expiré
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quality Info */}
          {(movement.quality_status || movement.needs_examination) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Contrôle qualité</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {movement.quality_status && (
                    <div>
                      <span className="text-sm font-medium text-gray-600">Statut qualité:</span>
                      <div className="mt-1">
                        <Badge variant="outline">
                          {movement.quality_status}
                        </Badge>
                      </div>
                    </div>
                  )}
          
                </div>
              </CardContent>
            </Card>
          )}

          {/* QR Code Section - Only for Entrée movements */}
          {movement.status === 'Entrée' && (
            <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <QrCode className="h-5 w-5" />
                Code QR du mouvement
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {qrCodeLoading ? (
                  <div className="text-center">
                    <div className="flex items-center justify-center space-x-2">
                      <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                      <p className="text-sm text-gray-600">Génération du code QR...</p>
                    </div>
                  </div>
                ) : qrCodeData ? (
                  <div className="space-y-4">
                    <div className="flex justify-center">
                      <div className="bg-white p-4 rounded-lg border">
                        <img 
                          src={qrCodeData} 
                          alt="QR Code du mouvement" 
                          className="w-48 h-48"
                        />
                      </div>
                    </div>
                    
                    <div className="text-center text-sm text-gray-600">
                      <p>Ce code QR contient toutes les informations</p>
                      <p>de ce mouvement pour traçabilité</p>
                    </div>
                    
                    <div className="flex justify-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={downloadQRCode}
                        className="flex items-center gap-2"
                      >
                        <Download className="h-4 w-4" />
                        Télécharger
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={printQRCode}
                        className="flex items-center gap-2"
                      >
                        <Printer className="h-4 w-4" />
                        Imprimer
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => generateQRCode(true)}
                        className="flex items-center gap-2"
                      >
                        <QrCode className="h-4 w-4" />
                        Régénérer
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center">
                    <p className="text-sm text-gray-600">
                      Code QR non disponible
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MovementDetailsDialog;