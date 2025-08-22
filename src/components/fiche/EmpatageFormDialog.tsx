import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Printer } from 'lucide-react';

interface EmpatageFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const EmpatageFormDialog = ({ open, onOpenChange }: EmpatageFormDialogProps) => {
  const [formData, setFormData] = useState({
    typePlaque: '',
    typeRecette: '',
    dateFabrication: '',
    numeroChariot: '',
    quantite: '',
    visaOperateur: '',
    groupe: '',
    curingHeure: '',
    dateNumeroChambre: '',
    visaOperateurCuring: '',
    groupeCuring: '',
    produitAvantCuringConforme: false,
    produitAvantCuringNonConforme: false,
    produitApresCuringConforme: false,
    produitApresCuringNonConforme: false,
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
          <DialogTitle>FICHE D'ACCOMPAGNEMENT - EMPATAGE</DialogTitle>
        </DialogHeader>
        
        <div className="print-content print:absolute print:top-0 print:left-0 print:w-full print:h-full print:flex print:flex-col">
          {/* Header Section */}
          <div className="border-2 border-black print:flex-shrink-0">
            <div className="flex">
              {/* Logo Section */}
              <div className="border-r-2 border-black p-2 w-40">
                <div className="flex flex-col items-center space-y-1">
                  <img
                    src="friction.png"
                    alt="Friction-tec Logo"
                    className="w-10 h-10 object-contain"
                  />
                  <div className="text-xs font-bold text-center">Friction-tec</div>
                </div>
              </div>
              
              {/* Title Section */}
              <div className="flex-1 p-2 text-center">
                <h1 className="text-sm font-bold mb-0.5">FICHE D'ACCOMPAGNEMENT SEMI FINI</h1>
                <h2 className="text-sm font-bold mb-0.5">EMPATAGE</h2>
                <div className="text-xs">بطاقة مرافقة للمنتج</div>
              </div>
              
              {/* Info Section */}
              <div className="border-l-2 border-black w-52">
                <div className="border-b border-black p-1 flex">
                  <span className="font-bold w-16 text-xs">CODE</span>
                  <span className="border-l border-black pl-1 flex-1 text-xs">FO 05-P01-PR4</span>
                </div>
                <div className="border-b border-black p-1 flex">
                  <span className="font-bold w-16 text-xs">Version</span>
                  <span className="border-l border-black pl-1 flex-1 text-xs">02</span>
                </div>
                <div className="border-b border-black p-1 flex">
                  <span className="font-bold w-16 text-xs">Date</span>
                  <span className="border-l border-black pl-1 flex-1 text-xs">06/10/2024</span>
                </div>
                <div className="p-1 flex">
                  <span className="font-bold w-16 text-xs">Page</span>
                  <span className="border-l border-black pl-1 flex-1 text-xs">1 sur 1</span>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="border-2 border-black print:flex-1 print:flex print:flex-col">
            {/* Top Section - Service production and Service Contrôle de qualité */}
            <div className="flex print:flex-1">
              {/* Left Section - Service production */}
              <div className="w-1/2 border-r-2 border-black p-2">
                <h3 className="font-bold text-center mb-2 underline text-sm">Service production « ligne d'empatage »</h3>
                
                <div className="space-y-2">
                  <div>
                    <Label className="font-bold">Type de plaque نوع اللوحة :</Label>
                    <Input 
                      value={formData.typePlaque}
                      onChange={(e) => handleInputChange('typePlaque', e.target.value)}
                      className="mt-1 print:border-none print:bg-transparent print:outline-none print:shadow-none print:p-1"
                    />
                  </div>
                  
                  <div>
                    <Label className="font-bold">Type de recette نوع الوصفة :</Label>
                    <Input 
                      value={formData.typeRecette}
                      onChange={(e) => handleInputChange('typeRecette', e.target.value)}
                      className="mt-1 print:border-none print:bg-transparent print:outline-none print:shadow-none print:p-1"
                    />
                  </div>
                  
                  <div>
                    <Label className="font-bold">Date et heure de fabrication تاريخ الإنتاج :</Label>
                    <Input 
                      type="datetime-local"
                      value={formData.dateFabrication}
                      onChange={(e) => handleInputChange('dateFabrication', e.target.value)}
                      className="mt-1 print:border-none print:bg-transparent print:outline-none print:shadow-none print:p-1"
                    />
                  </div>
                  
                  <div>
                    <Label className="font-bold">N° de chariot رقم العربة :</Label>
                    <Input 
                      value={formData.numeroChariot}
                      onChange={(e) => handleInputChange('numeroChariot', e.target.value)}
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
                    <Label className="font-bold">Visa de l'opérateur بالمشغل اسم :</Label>
                    <Input 
                      value={formData.visaOperateur}
                      onChange={(e) => handleInputChange('visaOperateur', e.target.value)}
                      className="mt-1 print:border-none print:bg-transparent print:outline-none print:shadow-none print:p-1"
                    />
                  </div>
                  
                  <div>
                    <Label className="font-bold">Groupe الفريق :</Label>
                    <Textarea 
                      value={formData.groupe}
                      onChange={(e) => handleInputChange('groupe', e.target.value)}
                      className="mt-1 h-16 print:border-none print:bg-transparent print:outline-none print:shadow-none print:p-1"
                    />
                  </div>
                </div>
              </div>

              {/* Right Section - Service Contrôle de qualité */}
              <div className="w-1/2 p-2">
                <h3 className="font-bold text-center mb-2 underline text-sm">Service Contrôle de qualité</h3>
                
                <div className="space-y-3">
                  {/* Avant curing section */}
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        checked={formData.produitAvantCuringConforme}
                        onCheckedChange={(checked) => handleInputChange('produitAvantCuringConforme', checked as boolean)}
                      />
                      <Label className="font-bold text-xs">Produit avant curing conforme</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        checked={formData.produitAvantCuringNonConforme}
                        onCheckedChange={(checked) => handleInputChange('produitAvantCuringNonConforme', checked as boolean)}
                      />
                      <Label className="font-bold text-xs">Produit avant curing non conforme</Label>
                    </div>
                  </div>
                  
                  {/* Après curing section */}
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2" key="apres-conforme">
                      <Checkbox 
                        id="produit-apres-curing-conforme"
                        checked={formData.produitApresCuringConforme}
                        onCheckedChange={(checked) => handleInputChange('produitApresCuringConforme', checked as boolean)}
                      />
                      <Label htmlFor="produit-apres-curing-conforme" className="font-bold text-xs">Produit après curing conforme</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2" key="apres-non-conforme">
                      <Checkbox 
                        id="produit-apres-curing-non-conforme"
                        checked={formData.produitApresCuringNonConforme}
                        onCheckedChange={(checked) => handleInputChange('produitApresCuringNonConforme', checked as boolean)}
                      />
                      <Label htmlFor="produit-apres-curing-non-conforme" className="font-bold text-xs">Produit après curing non conforme</Label>
                    </div>
                  </div>
                  
                  {/* Qualificien section */}
                  <div className="border-t border-black pt-2 space-y-2">
                    <div>
                      <Label className="font-bold text-xs">Nom du qualificien :</Label>
                      <Input 
                        value={formData.nomQualificien}
                        onChange={(e) => handleInputChange('nomQualificien', e.target.value)}
                        className="mt-0.5 print:border-none print:bg-transparent print:outline-none print:shadow-none print:p-1 h-8"
                      />
                    </div>
                    
                    <div>
                      <Label className="font-bold text-xs">Date :</Label>
                      <Input 
                        type="date"
                        value={formData.dateQualite}
                        onChange={(e) => handleInputChange('dateQualite', e.target.value)}
                        className="mt-0.5 print:border-none print:bg-transparent print:outline-none print:shadow-none print:p-1 h-8"
                      />
                    </div>
                    
                    <div>
                      <Label className="font-bold text-xs">Signature :</Label>
                      <Textarea 
                        value={formData.signature}
                        onChange={(e) => handleInputChange('signature', e.target.value)}
                        className="mt-0.5 h-12 print:border-none print:bg-transparent print:outline-none print:shadow-none print:p-1"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Section - Chambre de curing */}
            <div className="border-t-2 border-black p-2">
              <h3 className="font-bold text-center mb-2 underline text-sm">Chambre de curing</h3>
              
              <div className="mb-2">
                <p className="text-xs mb-1">
                  <span className="underline">curing sortie de heure1</span> تاريخ وقت الخروج من غرفة المعالجة:
                </p>
                <Input 
                  type="datetime-local"
                  value={formData.curingHeure}
                  onChange={(e) => handleInputChange('curingHeure', e.target.value)}
                  className="mt-0.5 print:border-none print:bg-transparent print:outline-none print:shadow-none print:p-1 h-8"
                />
              </div>
              
              <div className="flex space-x-4">
                <div className="flex-1">
                  <div className="mb-2">
                    <Label className="font-bold text-xs">et Date N° de chambre de curing رقم المعالجة غرفة رقم :</Label>
                    <Input 
                      value={formData.dateNumeroChambre}
                      onChange={(e) => handleInputChange('dateNumeroChambre', e.target.value)}
                      className="mt-0.5 print:border-none print:bg-transparent print:outline-none print:shadow-none print:p-1 h-8"
                    />
                  </div>
                  
                  <div className="mb-2">
                    <Label className="font-bold text-xs">Visa de l'opérateur بالمشغل اسم :</Label>
                    <Input 
                      value={formData.visaOperateurCuring}
                      onChange={(e) => handleInputChange('visaOperateurCuring', e.target.value)}
                      className="mt-0.5 print:border-none print:bg-transparent print:outline-none print:shadow-none print:p-1 h-8"
                    />
                  </div>
                  
                  <div>
                    <Label className="font-bold text-xs">Groupe الفريق :</Label>
                    <Textarea 
                      value={formData.groupeCuring}
                      onChange={(e) => handleInputChange('groupeCuring', e.target.value)}
                      className="mt-0.5 h-12 print:border-none print:bg-transparent print:outline-none print:shadow-none print:p-1"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Note */}
          <div className="border-2 border-t-0 border-black p-3 text-sm print:flex-shrink-0">
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

export default EmpatageFormDialog;