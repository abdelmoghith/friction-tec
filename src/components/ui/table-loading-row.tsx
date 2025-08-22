import React from 'react';
import { TableRow, TableCell } from '@/components/ui/table';
import LoadingSpinner from './loading-spinner';

interface TableLoadingRowProps {
  colSpan: number;
  text?: string;
}

const TableLoadingRow: React.FC<TableLoadingRowProps> = ({ 
  colSpan, 
  text = 'Chargement des données...' 
}) => {
  return (
    <TableRow>
      <TableCell colSpan={colSpan} className="text-center py-8">
        <LoadingSpinner text={text} />
      </TableCell>
    </TableRow>
  );
};

export default TableLoadingRow;