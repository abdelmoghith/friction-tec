import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import React, { useState, useEffect } from 'react';

interface OperationTypeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (type: 'Entrée' | 'Sortie' | 'Nouveau Produit' | 'Complément Stock' | 'Transfer') => void;
  trigger?: React.ReactNode;
}

const OperationTypeDialog: React.FC<OperationTypeDialogProps> = ({ open, onOpenChange, onSelect, trigger }) => {
  const [step, setStep] = useState<'main' | 'entree'>('main');

  useEffect(() => {
    if (open) {
      setStep('main');
    }
  }, [open]);

  const handleEntreeClick = () => {
    setStep('entree');
  };

  const handleBack = () => {
    setStep('main');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {step === 'main' ? 'Nouvelle opération' : 'Type d\'entrée'}
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-4">
          {step === 'main' ? (
            <>
              <Button size="lg" variant="default" onClick={handleEntreeClick}>
                Entrée
              </Button>
              <Button size="lg" variant="secondary" onClick={() => onSelect('Sortie')}>
                Sortie
              </Button>
            </>
          ) : (
            <>
              <Button size="lg" variant="default" onClick={() => onSelect('Nouveau Produit')}>
                Nouveau Produit
              </Button>
              <Button size="lg" variant="secondary" onClick={() => onSelect('Complément Stock')}>
                Complément Stock
              </Button>
              <Button size="lg" variant="secondary" onClick={() => onSelect('Transfer')}>
                Transfer
              </Button>
              <Button size="sm" variant="outline" onClick={handleBack}>
                Retour
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OperationTypeDialog; 