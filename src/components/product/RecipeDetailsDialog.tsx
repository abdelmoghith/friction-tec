import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Package, Calendar, MapPin, User, Hash, CheckCircle, Clock, FileText, Printer } from 'lucide-react';

interface RecipeDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipe: any;
}

const RecipeDetailsDialog = ({ open, onOpenChange, recipe }: RecipeDetailsDialogProps) => {
  if (!recipe) return null;

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('fr-FR');
  };

  const parseLocationsInfo = (locationsInfo: string | any[]) => {
    try {
      // If it's already an array, return it
      if (Array.isArray(locationsInfo)) {
        return locationsInfo;
      }
      // If it's a string, try to parse it
      if (typeof locationsInfo === 'string') {
        return JSON.parse(locationsInfo);
      }
      return null;
    } catch {
      return null;
    }
  };

  const locationsData = recipe.locations_info ? parseLocationsInfo(recipe.locations_info) : null;
  const currentDate = new Date().toLocaleDateString('fr-FR');
  const currentTime = new Date().toLocaleTimeString('fr-FR');

  const printRecipe = () => {
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) return;

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Reçu - Complément Stock</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.4; }
            .header-section { border: 2px solid black; margin-bottom: 20px; }
            .header-flex { display: flex; }
            .logo-section { border-right: 2px solid black; padding: 16px; width: 192px; }
            .logo-content { display: flex; flex-direction: column; align-items: center; margin-bottom: 8px; }
            .logo-img { width: 64px; height: 64px; object-fit: contain; margin-bottom: 8px; }
            .logo-text { font-size: 14px; font-weight: bold; text-align: center; }
            .title-section { flex: 1; padding: 16px; text-align: center; }
            .main-title { font-size: 18px; font-weight: bold; margin-bottom: 4px; }
            .sub-title { font-size: 18px; font-weight: bold; margin-bottom: 4px; }
            .arabic-text { font-size: 14px; }
            .info-section { border-left: 2px solid black; width: 256px; }
            .info-row { border-bottom: 1px solid black; padding: 8px; display: flex; }
            .info-row:last-child { border-bottom: none; }
            .info-label { font-weight: bold; width: 80px; }
            .info-value { border-left: 1px solid black; padding-left: 8px; flex: 1; }
            .content-section { border: 2px solid black; display: flex; }
            .left-section { width: 50%; border-right: 2px solid black; padding: 16px; }
            .right-section { width: 50%; padding: 16px; }
            .section-title { font-weight: bold; text-align: center; margin-bottom: 16px; text-decoration: underline; }
            .field-group { margin-bottom: 16px; }
            .field-label { font-weight: bold; margin-bottom: 4px; display: block; }
            .field-value { border-bottom: 1px solid black; padding: 4px 0; min-height: 20px; }
            .locations-list { margin-top: 16px; }
            .location-item { margin-bottom: 8px; padding: 8px; border-left: 3px solid #000; background-color: #f8f9fa; }
            .location-name { font-weight: bold; margin-bottom: 4px; }
            .floor-item { margin-left: 16px; font-size: 14px; }
            .footer-section { border: 2px solid black; border-top: none; padding: 12px; font-size: 12px; }
            .footer-text { margin-bottom: 8px; }
            .footer-arabic { text-align: right; }
            @media print { body { margin: 0; } .no-print { display: none; } }
          </style>
        </head>
        <body>
          <div class="header-section">
            <div class="header-flex">
              <div class="logo-section">
                <div class="logo-content">
                  <img src="friction.png" alt="Friction-tec Logo" class="logo-img" />
                  <div class="logo-text">Friction-tec</div>
                </div>
              </div>
              <div class="title-section">
                <h1 class="main-title">REÇU DE COMPLÉMENT STOCK</h1>
                <h2 class="sub-title">PRODUIT RETOURNÉ EN STOCK</h2>
                <div class="arabic-text">إيصال إرجاع المنتج إلى المخزون</div>
              </div>
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
          <div class="content-section">
            <div class="left-section">
              <h3 class="section-title">Informations du produit</h3>
              <div class="field-group">
                <label class="field-label">Produit المنتج :</label>
                <div class="field-value">${recipe.product_designation || 'N/A'}</div>
              </div>
              <div class="field-group">
                <label class="field-label">Référence المرجع :</label>
                <div class="field-value">${recipe.product_reference || 'N/A'}</div>
              </div>
              <div class="field-group">
                <label class="field-label">Fournisseur المورد :</label>
                <div class="field-value">${recipe.supplier_name || 'N/A'}</div>
              </div>
              <div class="field-group">
                <label class="field-label">Numéro de lot رقم الدفعة :</label>
                <div class="field-value">${recipe.batch_number || 'N/A'}</div>
              </div>
              <div class="field-group">
                <label class="field-label">Quantité totale الكمية الإجمالية :</label>
                <div class="field-value">${recipe.quantity} ${recipe.product_unite || 'unités'}</div>
              </div>
              <div class="field-group">
                <label class="field-label">Date de fabrication تاريخ الإنتاج :</label>
                <div class="field-value">${recipe.fabrication_date ? formatDate(recipe.fabrication_date) : 'N/A'}</div>
              </div>
              <div class="field-group">
                <label class="field-label">Date d'expiration تاريخ الانتهاء :</label>
                <div class="field-value">${recipe.expiration_date ? formatDate(recipe.expiration_date) : 'N/A'}</div>
              </div>
            </div>
            <div class="right-section">
              <h3 class="section-title">Informations de stockage</h3>
              <div class="field-group">
                <label class="field-label">Statut qualité حالة الجودة :</label>
                <div class="field-value">${recipe.quality_status === 'conforme' ? 'Conforme مطابق' : recipe.needs_examination ? 'En attente d\'examen في انتظار الفحص' : 'Conforme مطابق'}</div>
              </div>
              <div class="field-group">
                <label class="field-label">Date et heure التاريخ والوقت :</label>
                <div class="field-value">${formatDate(recipe.created_at)} à ${recipe.movement_time || currentTime}</div>
              </div>
              <div class="field-group">
                <label class="field-label">Type d'opération نوع العملية :</label>
                <div class="field-value">Complément Stock - Retour partiel</div>
              </div>
              <div class="locations-list">
                <label class="field-label">Emplacements de stockage أماكن التخزين :</label>
                ${locationsData && Array.isArray(locationsData) ? locationsData.map(locationItem => `
                  <div class="location-item">
                    <div class="location-name">${locationItem.zone}</div>
                    ${locationItem.floors ? locationItem.floors.map(floor => `
                      <div class="floor-item">• ${floor.name}: ${floor.quantity} ${recipe.product_unite || 'unités'}</div>
                    `).join('') : ''}
                  </div>
                `).join('') : ''}
              </div>
            </div>
          </div>
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
        </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl font-bold text-gray-900">Détails de la Recette</DialogTitle>
            </div>
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
              {recipe.operation_type}
            </Badge>
          </div>
        </DialogHeader>
        
        <div className="print-content">
          {/* Header Section - Same as AssemblageFormDialog */}
          <div className="border-2 border-black mb-5">
            <div className="flex">
              {/* Logo Section */}
              <div className="border-r-2 border-black p-4 w-48">
                <div className="flex flex-col items-center mb-2">
                  <img src="friction.png" alt="Friction-tec Logo" className="w-16 h-16 object-contain mb-2" />
                  <div className="text-sm font-bold text-center">Friction-tec</div>
                </div>
              </div>
              
              {/* Title Section */}
              <div className="flex-1 p-4 text-center">
                <h1 className="text-lg font-bold mb-1">REÇU DE COMPLÉMENT STOCK</h1>
                <h2 className="text-lg font-bold mb-1">PRODUIT RETOURNÉ EN STOCK</h2>
                <div className="text-sm">إيصال إرجاع المنتج إلى المخزون</div>
              </div>
              
              {/* Info Section */}
              <div className="border-l-2 border-black w-64">
                <div className="border-b border-black p-2 flex">
                  <span className="font-bold w-20">CODE</span>
                  <span className="border-l border-black pl-2 flex-1">CS-{new Date().getFullYear()}</span>
                </div>
                <div className="border-b border-black p-2 flex">
                  <span className="font-bold w-20">Version</span>
                  <span className="border-l border-black pl-2 flex-1">01</span>
                </div>
                <div className="border-b border-black p-2 flex">
                  <span className="font-bold w-20">Date</span>
                  <span className="border-l border-black pl-2 flex-1">{currentDate}</span>
                </div>
                <div className="p-2 flex">
                  <span className="font-bold w-20">Page</span>
                  <span className="border-l border-black pl-2 flex-1">1 sur 1</span>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="border-2 border-black flex">
            {/* Left Section - Product Information */}
            <div className="w-1/2 border-r-2 border-black p-4">
              <h3 className="font-bold text-center mb-4 underline">Informations du produit</h3>
              
              <div className="mb-4">
                <label className="font-bold block mb-1">Produit المنتج :</label>
                <div className="border-b border-black pb-1 min-h-[20px]">{recipe.product_designation || 'N/A'}</div>
              </div>
              
              <div className="mb-4">
                <label className="font-bold block mb-1">Référence المرجع :</label>
                <div className="border-b border-black pb-1 min-h-[20px]">{recipe.product_reference || 'N/A'}</div>
              </div>
              
              <div className="mb-4">
                <label className="font-bold block mb-1">Fournisseur المورد :</label>
                <div className="border-b border-black pb-1 min-h-[20px]">{recipe.supplier_name || 'N/A'}</div>
              </div>
              
              <div className="mb-4">
                <label className="font-bold block mb-1">Numéro de lot رقم الدفعة :</label>
                <div className="border-b border-black pb-1 min-h-[20px]">{recipe.batch_number || 'N/A'}</div>
              </div>
              
              <div className="mb-4">
                <label className="font-bold block mb-1">Quantité totale الكمية الإجمالية :</label>
                <div className="border-b border-black pb-1 min-h-[20px]">{recipe.quantity} {recipe.product_unite || 'unités'}</div>
              </div>
              
              <div className="mb-4">
                <label className="font-bold block mb-1">Date de fabrication تاريخ الإنتاج :</label>
                <div className="border-b border-black pb-1 min-h-[20px]">{recipe.fabrication_date ? formatDate(recipe.fabrication_date) : 'N/A'}</div>
              </div>
              
              <div className="mb-4">
                <label className="font-bold block mb-1">Date d'expiration تاريخ الانتهاء :</label>
                <div className="border-b border-black pb-1 min-h-[20px]">{recipe.expiration_date ? formatDate(recipe.expiration_date) : 'N/A'}</div>
              </div>
            </div>

            {/* Right Section - Storage Information */}
            <div className="w-1/2 p-4">
              <h3 className="font-bold text-center mb-4 underline">Informations de stockage</h3>
              
              <div className="mb-4">
                <label className="font-bold block mb-1">Statut qualité حالة الجودة :</label>
                <div className="border-b border-black pb-1 min-h-[20px]">
                  {recipe.quality_status === 'conforme' ? 'Conforme مطابق' :
                   recipe.needs_examination ? 'En attente d\'examen في انتظار الفحص' :
                   'Conforme مطابق'}
                </div>
              </div>
              
              <div className="mb-4">
                <label className="font-bold block mb-1">Date et heure التاريخ والوقت :</label>
                <div className="border-b border-black pb-1 min-h-[20px]">{formatDate(recipe.created_at)} à {recipe.movement_time || currentTime}</div>
              </div>
              
              <div className="mb-4">
                <label className="font-bold block mb-1">Type d'opération نوع العملية :</label>
                <div className="border-b border-black pb-1 min-h-[20px]">Complément Stock - Retour partiel</div>
              </div>
              
              <div className="mt-4">
                <label className="font-bold block mb-1">Emplacements de stockage أماكن التخزين :</label>
                {locationsData && Array.isArray(locationsData) && locationsData.map((locationItem: any, index: number) => (
                  <div key={index} className="mb-2 p-2 border-l-4 border-black bg-gray-50">
                    <div className="font-bold mb-1">{locationItem.zone}</div>
                    {locationItem.floors && locationItem.floors.map((floor: any, floorIndex: number) => (
                      <div key={floorIndex} className="ml-4 text-sm">
                        • {floor.name}: {floor.quantity} {recipe.product_unite || 'unités'}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Footer Note */}
          <div className="border-2 border-t-0 border-black p-3 text-xs">
            <p className="mb-2">
              <strong>Note importante :</strong> Ce produit est un complément de stock - il s'agit d'un produit qui n'a pas été utilisé entièrement
              lors d'une opération précédente et qui est remis en stock pour utilisation ultérieure.
            </p>
            <p className="mb-2 text-right">
              <strong>ملاحظة مهمة :</strong> هذا المنتج هو مكمل للمخزون - إنه منتج لم يتم استخدامه بالكامل في عملية سابقة وتم إرجاعه إلى المخزون للاستخدام اللاحق.
            </p>
            <p className="text-center">
              Document généré automatiquement le {currentDate} à {currentTime} - نظام إدارة المخزون
            </p>
          </div>

          {/* Print Button */}
          <div className="mt-6 text-center">
            <Button
              onClick={() => window.print()}
              className="bg-blue-600 hover:bg-blue-700 text-white mr-2"
            >
              Imprimer
            </Button>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Fermer
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RecipeDetailsDialog;