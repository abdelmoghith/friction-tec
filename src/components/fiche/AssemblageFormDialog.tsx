import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Printer } from 'lucide-react';

interface AssemblageFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const AssemblageFormDialog = ({ open, onOpenChange }: AssemblageFormDialogProps) => {
  const [formData, setFormData] = useState({
    type: '',
    dateFabrication: '',
    numeroLot: '',
    quantite: '',
    visaOperateur: '',
    groupe: '',
    produitConforme: false,
    produitNonConforme: false,
    nomQualificien: '',
    dateQualite: '',
    signature: ''
  });

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto print:fixed print:inset-0 print:max-w-none print:max-h-none print:overflow-visible print:m-0 print:p-0 print:transform-none">
        <DialogHeader className="print:hidden">
          <DialogTitle>FICHE D'ACCOMPAGNEMENT - ASSEMBLAGE</DialogTitle>
        </DialogHeader>
        
        <div className="print-content print:absolute print:top-0 print:left-0 print:w-full print:h-full">
          {/* Header Section */}
          <div className="border-2 border-black mb-4">
            <div className="flex">
              {/* Logo Section */}
              <div className="border-r-2 border-black p-4 w-48">
                <div className="flex flex-col items-center space-y-2 mb-2">
                  <img
                    src="friction.png"
                    alt="Friction-tec Logo"
                    className="w-16 h-16 object-contain"
                  />
                  <div className="text-sm font-bold text-center">Friction-tec</div>
                </div>
              </div>
              
              {/* Title Section */}
              <div className="flex-1 p-4 text-center">
                <h1 className="text-lg font-bold mb-1">FICHE D'ACCOMPAGNEMENT SEMI FINI</h1>
                <h2 className="text-lg font-bold mb-1">ASSEMBLAGE</h2>
                <div className="text-sm">بطاقة مرافقة للمنتج</div>
              </div>
              
              {/* Info Section */}
              <div className="border-l-2 border-black w-64">
                <div className="border-b border-black p-2 flex">
                  <span className="font-bold w-20">CODE</span>
                  <span className="border-l border-black pl-2 flex-1">FO 05-P01-PR3</span>
                </div>
                <div className="border-b border-black p-2 flex">
                  <span className="font-bold w-20">Version</span>
                  <span className="border-l border-black pl-2 flex-1">02</span>
                </div>
                <div className="border-b border-black p-2 flex">
                  <span className="font-bold w-20">Date</span>
                  <span className="border-l border-black pl-2 flex-1">06/10/2024</span>
                </div>
                <div className="p-2 flex">
                  <span className="font-bold w-20">Page</span>
                  <span className="border-l border-black pl-2 flex-1">1 sur 1</span>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex border-2 border-black">
            {/* Left Section - Service production */}
            <div className="w-1/2 border-r-2 border-black p-4">
              <h3 className="font-bold text-center mb-4 underline">Service production « ligne d'assemblage»</h3>
              
              <div className="space-y-4">
                <div>
                  <Label className="font-bold">Type النوع :</Label>
                  <Input 
                    value={formData.type}
                    onChange={(e) => handleInputChange('type', e.target.value)}
                    className="mt-1 print:border-none print:bg-transparent print:outline-none print:shadow-none print:p-1"
                  />
                </div>
                
                <div>
                  <Label className="font-bold">Date de fabrication de semi fini تاريخ الإنتاج :</Label>
                  <Input 
                    type="date"
                    value={formData.dateFabrication}
                    onChange={(e) => handleInputChange('dateFabrication', e.target.value)}
                    className="mt-1 print:border-none print:bg-transparent print:outline-none print:shadow-none print:p-1"
                  />
                </div>
                
                <div>
                  <Label className="font-bold">N° Lot رقم الدفعة :</Label>
                  <Input 
                    value={formData.numeroLot}
                    onChange={(e) => handleInputChange('numeroLot', e.target.value)}
                    className="mt-1 print:border-none print:bg-transparent print:outline-none print:shadow-none print:p-1"
                  />
                </div>
                
                <div>
                  <Label className="font-bold">Quantité الكمية :</Label>
                  <Input 
                    value={formData.quantite}
                    onChange={(e) => handleInputChange('quantite', e.target.value)}
                    className="mt-1 print:border-none print:bg-transparent print:outline-none print:shadow-none print:p-1"
                  />
                </div>
                
                <div>
                  <Label className="font-bold">Visa de l'opérateur باسم المشغل :</Label>
                  <Input 
                    value={formData.visaOperateur}
                    onChange={(e) => handleInputChange('visaOperateur', e.target.value)}
                    className="mt-1 print:border-none print:bg-transparent print:outline-none print:shadow-none print:p-1"
                  />
                </div>
                
                <div className="mt-8">
                  <Label className="font-bold">Groupe الفريق:</Label>
                  <Textarea 
                    value={formData.groupe}
                    onChange={(e) => handleInputChange('groupe', e.target.value)}
                    className="mt-1 h-20 print:border-none print:bg-transparent print:outline-none print:shadow-none print:p-1"
                  />
                </div>
              </div>
            </div>

            {/* Right Section - Service Contrôle de qualité */}
            <div className="w-1/2 p-4">
              <h3 className="font-bold text-center mb-4 underline">Service Contrôle de qualité</h3>
              
              <div className="space-y-6">
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      checked={formData.produitConforme}
                      onCheckedChange={(checked) => handleInputChange('produitConforme', checked as boolean)}
                    />
                    <Label className="font-bold">Produit conforme</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      checked={formData.produitNonConforme}
                      onCheckedChange={(checked) => handleInputChange('produitNonConforme', checked as boolean)}
                    />
                    <Label className="font-bold">Produit non conforme</Label>
                  </div>
                </div>
                
                <div className="border-t border-black pt-4 space-y-4">
                  <div>
                    <Label className="font-bold">Nom du qualificien :</Label>
                    <Input 
                      value={formData.nomQualificien}
                      onChange={(e) => handleInputChange('nomQualificien', e.target.value)}
                      className="mt-1 print:border-none print:bg-transparent print:outline-none print:shadow-none print:p-1"
                    />
                  </div>
                  
                  <div>
                    <Label className="font-bold">Date :</Label>
                    <Input 
                      type="date"
                      value={formData.dateQualite}
                      onChange={(e) => handleInputChange('dateQualite', e.target.value)}
                      className="mt-1 print:border-none print:bg-transparent print:outline-none print:shadow-none print:p-1"
                    />
                  </div>
                  
                  <div>
                    <Label className="font-bold">Signature :</Label>
                    <Textarea 
                      value={formData.signature}
                      onChange={(e) => handleInputChange('signature', e.target.value)}
                      className="mt-1 h-16 print:border-none print:bg-transparent print:outline-none print:shadow-none print:p-1"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Note */}
          <div className="border-2 border-t-0 border-black p-3 text-sm">
            <p className="mb-2">
              Si la fiche ne contient pas la validation du CQ, le produit ne doit pas être utilisé. Si le produit est non conforme, il doit être écarté et identifié.
            </p>
            <p className="text-right">
              إذا لم تحتوي هذه الوثيقة على اعتماد (مصلحة) مراقبة الجودة، فلا يجب استخدام المنتج.
            </p>
            <p className="text-right">
              إذا كان المنتج غير مطابق، يجب استبعاده وتحديده.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-2 mt-4 print:hidden">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" />
            Imprimer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AssemblageFormDialog;