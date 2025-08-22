import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import React from 'react';

interface OperationTypeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (type: 'Entrée' | 'Sortie') => void;
  trigger?: React.ReactNode;
}

const FiniOperationTypeClient: React.FC<OperationTypeDialogProps> = ({ open, onOpenChange, onSelect, trigger }) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nouvelle opération</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-4">
          <Button size="lg" variant="secondary" onClick={() => onSelect('Sortie')}>Sortie</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FiniOperationTypeClient; 