
import { useState, useEffect } from 'react';
import Layout from '@/components/layout/Layout';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import TableLoadingRow from '@/components/ui/table-loading-row';
import { Badge } from '@/components/ui/badge';
import { formatDate, formatCurrency } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Search,
  Filter,
  Plus,
  Mail,
  Phone,
  MoreHorizontal,
  Calendar,
  Users,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Eye,
  EyeOff,
  User,
  MapPin,
  Shield
} from 'lucide-react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useIsMobile } from '@/hooks/use-mobile';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useNavigate } from 'react-router-dom';
import { Buyer } from '@/types';

// Local type for the page
interface Fournisseur {
  id: number;
  code: string;
  designation: string;
  telephones: string[];
  adresse: string;
  type: 'local' | 'etranger';
}

// Helper to generate random phone, location, type, and last
function enrichBuyer(buyer: any, idx: number): Fournisseur {
  const phones = ['+213 555-123-456', '+213 661-987-654', '+213 770-111-222', '+213 699-333-444'];
  const locations = ['Alger', 'Oran', 'Constantine', 'Annaba', 'Blida', 'Tlemcen', 'Sétif', 'Béjaïa'];
  const types: Array<'local' | 'etranger'> = ['local', 'etranger'];
  return {
    id: buyer.id,
    code: buyer.code,
    designation: buyer.designation,
    telephones: buyer.telephones || [''],
    adresse: buyer.adresse,
    type: (buyer.type as 'local' | 'etranger') || 'local',
  };
}

const Buyers = () => {
  const [allBuyers, setAllBuyers] = useState<Fournisseur[]>([]);
  const [filteredBuyers, setFilteredBuyers] = useState<Fournisseur[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [showAddBuyerForm, setShowAddBuyerForm] = useState(false);
  // Add form state for new fournisseur
  const [newFournisseur, setNewFournisseur] = useState<Omit<Fournisseur, 'id'>>({
    code: '',
    designation: '',
    telephones: [''],
    adresse: '',
    type: 'local',
  });
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [editFournisseur, setEditFournisseur] = useState<Fournisseur | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [detailsFournisseur, setDetailsFournisseur] = useState<Fournisseur | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [fournisseurToDelete, setFournisseurToDelete] = useState<Fournisseur | null>(null);
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch fournisseurs from backend
  useEffect(() => {
    setIsLoading(true);
    fetch('/fournisseurs')
      .then(res => res.json())
      .then(data => {
        // If contact_info is JSON, parse it
        const fournisseurs = data.map((f: any) => {
          let contact = {};
          try {
            contact = f.contact_info ? JSON.parse(f.contact_info) : {};
          } catch {
            contact = {};
          }
          return {
            ...f,
            ...contact,
          };
        });
        setAllBuyers(fournisseurs);
        setFilteredBuyers(fournisseurs);
      })
      .catch(err => console.error('Failed to fetch buyers:', err))
      .finally(() => setIsLoading(false));
  }, []);

  // Filter buyers based on search term and type
  useEffect(() => {
    let result = allBuyers;
    if (searchTerm) {
      result = result.filter(buyer =>
        buyer.designation.toLowerCase().includes(searchTerm.toLowerCase()) ||
        buyer.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        buyer.adresse.toLowerCase().includes(searchTerm.toLowerCase()) ||
        buyer.telephones.some(tel => tel.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    if (typeFilter !== 'all') {
      result = result.filter(buyer => buyer.type === typeFilter);
    }
    setFilteredBuyers(result);
  }, [searchTerm, typeFilter, allBuyers]);

  // Reset to first page when filters or page size change
  useEffect(() => {
    setPage(1);
  }, [searchTerm, typeFilter, allBuyers, pageSize]);

  // Pagination logic
  const sortedBuyers = [...filteredBuyers].sort((a, b) => {
    const numA = parseInt(a.code, 10);
    const numB = parseInt(b.code, 10);
    // If both codes are numbers, sort numerically
    if (!isNaN(numA) && !isNaN(numB)) {
      return numA - numB;
    }
    // Otherwise, sort as strings (case-insensitive)
    return a.code.localeCompare(b.code, undefined, { sensitivity: 'base' });
  });
  const totalPages = Math.ceil(sortedBuyers.length / pageSize);
  const paginatedBuyers = sortedBuyers.slice((page - 1) * pageSize, page * pageSize);

  // Add handler to add new fournisseur (POST to backend)
  const handleAddFournisseur = async () => {
    if (!newFournisseur.code || !newFournisseur.designation) return;
    setAddLoading(true);
    setAddError(null);
    try {
      const res = await fetch('/fournisseurs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newFournisseur),
      });
      if (!res.ok) throw new Error('Erreur lors de l\'ajout');
      const added = await res.json();
      setAllBuyers([added, ...allBuyers]);
      setFilteredBuyers([added, ...filteredBuyers]);
      setShowAddBuyerForm(false);
      setNewFournisseur({ code: '', designation: '', telephones: [''], adresse: '', type: 'local' });
    } catch (err: any) {
      setAddError(err.message || 'Erreur inconnue');
    } finally {
      setAddLoading(false);
    }
  };

  // Edit handler: open dialog
  const handleEditClick = (fournisseur: Fournisseur) => {
    setEditFournisseur(fournisseur);
    setShowEditDialog(true);
    setEditError(null);
  };

  // Update fournisseur (PUT)
  const handleEditFournisseur = async () => {
    if (!editFournisseur) return;
    setEditLoading(true);
    setEditError(null);
    try {
      const res = await fetch(`/fournisseurs/${editFournisseur.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editFournisseur),
      });
      if (!res.ok) throw new Error('Erreur lors de la modification');
      const updated = await res.json();
      setAllBuyers(allBuyers.map(f => f.id === updated.id ? updated : f));
      setFilteredBuyers(filteredBuyers.map(f => f.id === updated.id ? updated : f));
      setShowEditDialog(false);
      setEditFournisseur(null);
    } catch (err: any) {
      setEditError(err.message || 'Erreur inconnue');
    } finally {
      setEditLoading(false);
    }
  };

  // Delete fournisseur
  const handleDeleteFournisseur = async () => {
    if (!fournisseurToDelete) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/fournisseurs/${fournisseurToDelete.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Erreur lors de la suppression');
      setAllBuyers(allBuyers.filter(f => f.id !== fournisseurToDelete.id));
      setFilteredBuyers(filteredBuyers.filter(f => f.id !== fournisseurToDelete.id));
      setShowDeleteDialog(false);
      setFournisseurToDelete(null);
    } catch (err) {
      alert('Erreur lors de la suppression');
    } finally {
      setDeleteLoading(false);
    }
  };

  // Add telephone field in add/edit
  const handleAddTelephone = (edit = false) => {
    if (edit && editFournisseur) {
      setEditFournisseur({ ...editFournisseur, telephones: [...editFournisseur.telephones, ''] });
    } else {
      setNewFournisseur(f => ({ ...f, telephones: [...f.telephones, ''], type: f.type as 'local' | 'etranger' }) as Omit<Fournisseur, 'id'>);
    }
  };
  const handleRemoveTelephone = (idx: number, edit = false) => {
    if (edit && editFournisseur) {
      setEditFournisseur({ ...editFournisseur, telephones: editFournisseur.telephones.filter((_, i) => i !== idx) });
    } else {
      setNewFournisseur(f => ({ ...f, telephones: f.telephones.filter((_, i) => i !== idx), type: f.type as 'local' | 'etranger' }) as Omit<Fournisseur, 'id'>);
    }
  };
  const handleTelephoneChange = (idx: number, value: string, edit = false) => {
    if (edit && editFournisseur) {
      const tels = [...editFournisseur.telephones];
      tels[idx] = value;
      setEditFournisseur({ ...editFournisseur, telephones: tels });
    } else {
      setNewFournisseur(f => {
        const tels = [...f.telephones];
        tels[idx] = value;
        return { ...f, telephones: tels, type: f.type as 'local' | 'etranger' } as Omit<Fournisseur, 'id'>;
      });
    }
  };

  const getBadgeVariant = (status: 'pending' | 'confirmed' | 'paid') => {
    switch (status) {
      case 'pending': return 'outline';
      case 'confirmed': return 'secondary';
      case 'paid': return 'success';
      default: return 'outline';
    }
  };

  const getBadgeIcon = (status: 'pending' | 'confirmed' | 'paid') => {
    switch (status) {
      case 'pending': return null;
      case 'confirmed': return <TrendingUp className="h-3 w-3 ml-1" />;
      case 'paid': return <DollarSign className="h-3 w-3 ml-1" />;
      default: return null;
    }
  };

  return (
    <Layout>
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-2">
          <div>
            <h1 className="text-3xl font-bold mb-1">Fournisseurs</h1>
            <p className="text-muted-foreground">
              Gérer et suivre vos fournisseurs
            </p>
          </div>
          <Button onClick={() => setShowAddBuyerForm(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Ajouter un fournisseur
          </Button>
        </div>
      </div>

      {/* Add Fournisseur Dialog */}
      <Dialog open={showAddBuyerForm} onOpenChange={setShowAddBuyerForm}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Ajouter un fournisseur
            </DialogTitle>
            <DialogDescription>
              Créez un nouveau fournisseur avec ses informations de contact et de type.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={e => {
              e.preventDefault();
              setAddError(null);
              if (!newFournisseur.code || !newFournisseur.designation) {
                setAddError('Veuillez remplir tous les champs obligatoires.');
                return;
              }
              handleAddFournisseur();
            }}
            className="space-y-6"
          >
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="code">Code</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    id="code"
                    type="text"
                    placeholder="Code du fournisseur"
                    className="pl-10"
                    value={newFournisseur.code}
                    onChange={e => setNewFournisseur(f => ({ ...f, code: e.target.value }))}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Type</Label>
                <Select value={newFournisseur.type} onValueChange={value => setNewFournisseur(f => ({ ...f, type: value as 'local' | 'etranger' }))}>
                  <SelectTrigger id="type">
                    <SelectValue placeholder="Type de fournisseur" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="local">Local</SelectItem>
                    <SelectItem value="etranger">Étranger</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="designation">Désignation</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  id="designation"
                  type="text"
                  placeholder="Désignation du fournisseur"
                  className="pl-10"
                  value={newFournisseur.designation}
                  onChange={e => setNewFournisseur(f => ({ ...f, designation: e.target.value }))}
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2">
                <Label htmlFor="adresse">Adresse</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    id="adresse"
                    type="text"
                    placeholder="Adresse complète"
                    className="pl-10"
                    value={newFournisseur.adresse}
                    onChange={e => setNewFournisseur(f => ({ ...f, adresse: e.target.value }))}
                    required
                  />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="telephone">Téléphone 1</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    id="telephone"
                    type="text"
                    placeholder="+213..."
                    className="pl-10"
                    value={newFournisseur.telephones[0]}
                    onChange={e => handleTelephoneChange(0, e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="telephone2">Téléphone 2 (optionnel)</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    id="telephone2"
                    type="text"
                    placeholder="+213..."
                    className="pl-10"
                    value={newFournisseur.telephones[1]}
                    onChange={e => handleTelephoneChange(1, e.target.value)}
                  />
                </div>
              </div>
            </div>
            {addError && <div className="text-red-600 text-sm">{addError}</div>}
            <DialogFooter>
              <Button type="submit" disabled={addLoading}>
                {addLoading ? 'Ajout...' : 'Ajouter'}
              </Button>
              <DialogClose asChild>
                <Button variant="outline" type="button" disabled={addLoading}>Annuler</Button>
              </DialogClose>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Stats Cards - Only 3: Total, Local, Etranger */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <Card className="p-4">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Total Fournisseurs</p>
              <p className="text-2xl font-bold">{allBuyers.length}</p>
            </div>
            <div className="bg-primary/10 p-2 rounded-full">
              <Users className="h-5 w-5 text-primary" />
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Fournisseurs Locaux</p>
              <p className="text-2xl font-bold">{allBuyers.filter(b => b.type === 'local').length}</p>
            </div>
            <div className="bg-green-500/10 p-2 rounded-full">
              <Users className="h-5 w-5 text-green-600" />
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Fournisseurs Étrangers</p>
              <p className="text-2xl font-bold">{allBuyers.filter(b => b.type === 'etranger').length}</p>
            </div>
            <div className="bg-blue-500/10 p-2 rounded-full">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Rechercher un fournisseur..."
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div>
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className="border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="all">Tous</option>
            <option value="local">Local</option>
            <option value="etranger">Étranger</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm">Afficher</span>
          <select
            className="border rounded px-2 py-1 text-sm focus:outline-none"
            value={pageSize}
            onChange={e => setPageSize(Number(e.target.value))}
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
          <span className="text-sm">par page</span>
        </div>
      </div>

      {/* Fournisseurs Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Désignation</TableHead>
                <TableHead>Adresse</TableHead>
                <TableHead>Téléphones</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableLoadingRow colSpan={6} text="Chargement des fournisseurs..." />
              ) : paginatedBuyers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <p className="text-muted-foreground">Aucun fournisseur trouvé</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-4"
                      onClick={() => {
                        setSearchTerm('');
                        setStatusFilter('all');
                      }}
                    >
                      Réinitialiser les filtres
                    </Button>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedBuyers.map((fournisseur) => (
                  <TableRow key={fournisseur.id}>
                    <TableCell>{fournisseur.code}</TableCell>
                    <TableCell>
                      <div className="max-w-[120px] truncate" title={fournisseur.designation}>
                        <p className="font-medium">{fournisseur.designation}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-[120px] truncate" title={fournisseur.adresse}>
                        {fournisseur.adresse}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        {fournisseur.telephones.map((tel, index) => (
                          <span key={index}>
                            {tel}
                            {index < fournisseur.telephones.length - 1 && ', '}
                          </span>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>{fournisseur.type === 'local' ? 'Local' : 'Étranger'}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem className="gap-2" onClick={() => navigate(`/fournisseur/history/${fournisseur.id}`)}>
                            Voir l'historique
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="gap-2" 
                            onClick={() => handleEditClick(fournisseur)}
                          >
                            Modifier
                          </DropdownMenuItem>
                          <DropdownMenuItem className="gap-2" onClick={() => { setDetailsFournisseur(fournisseur); setShowDetailsDialog(true); }}>
                            Voir les détails
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            className="gap-2 text-red-600" 
                            onClick={() => { setFournisseurToDelete(fournisseur); setShowDeleteDialog(true); }} 
                            disabled={deleteLoading}
                          >
                            Supprimer
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        <div className="flex justify-center gap-2 px-4 pb-4 pt-2">
          <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>&lt;</Button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
            <Button
              key={p}
              variant={p === page ? "default" : "outline"}
              size="sm"
              onClick={() => setPage(p)}
              className={p === page ? "font-bold" : ""}
            >
              {p}
            </Button>
          ))}
          <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages || totalPages === 0}>&gt;</Button>
        </div>
      </Card>

      {/* Edit Fournisseur Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Modifier le fournisseur</DialogTitle>
            <DialogDescription>Modifiez les informations du fournisseur.</DialogDescription>
          </DialogHeader>
          {editFournisseur && (
            <form
              onSubmit={e => {
                e.preventDefault();
                handleEditFournisseur();
              }}
              className="space-y-6"
            >
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-code">Code</Label>
                  <Input
                    id="edit-code"
                    type="text"
                    value={editFournisseur.code}
                    onChange={e => setEditFournisseur(f => f ? { ...f, code: e.target.value } : f)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-type">Type</Label>
                  <Select value={editFournisseur.type || 'local'} onValueChange={value => setEditFournisseur(f => f ? { ...f, type: value as 'local' | 'etranger' } : f)}>
                    <SelectTrigger id="edit-type">
                      <SelectValue placeholder="Type de fournisseur" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="local">Local</SelectItem>
                      <SelectItem value="etranger">Étranger</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-designation">Désignation</Label>
                <Input
                  id="edit-designation"
                  type="text"
                  value={editFournisseur.designation}
                  onChange={e => setEditFournisseur(f => f ? { ...f, designation: e.target.value } : f)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-adresse">Adresse</Label>
                <Input
                  id="edit-adresse"
                  type="text"
                  value={editFournisseur.adresse}
                  onChange={e => setEditFournisseur(f => f ? { ...f, adresse: e.target.value } : f)}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-telephone">Téléphone 1</Label>
                  <Input
                    id="edit-telephone"
                    type="text"
                    value={editFournisseur.telephones[0]}
                    onChange={e => handleTelephoneChange(0, e.target.value, true)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-telephone2">Téléphone 2 (optionnel)</Label>
                  <Input
                    id="edit-telephone2"
                    type="text"
                    value={editFournisseur.telephones[1]}
                    onChange={e => handleTelephoneChange(1, e.target.value, true)}
                  />
                </div>
              </div>
              {editError && <div className="text-red-600 text-sm">{editError}</div>}
              <DialogFooter>
                <Button type="submit" disabled={editLoading}>{editLoading ? 'Modification...' : 'Enregistrer'}</Button>
                <DialogClose asChild>
                  <Button variant="outline" type="button" disabled={editLoading}>Annuler</Button>
                </DialogClose>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
      {/* Details Fournisseur Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>Détails du fournisseur</DialogTitle>
          </DialogHeader>
          {detailsFournisseur && (
            <div className="space-y-3">
              <div><strong>Code:</strong> {detailsFournisseur.code}</div>
              <div><strong>Désignation:</strong> {detailsFournisseur.designation}</div>
              <div><strong>Adresse:</strong> {detailsFournisseur.adresse}</div>
              <div>
                <div className="flex flex-col gap-1 mt-1">
                  {detailsFournisseur.telephones.map((tel, idx) => (
                    <div key={idx}><span className="font-bold">{`Telephone ${idx + 1}:`}</span> {tel}</div>
                  ))}
                </div>
              </div>
              <div><strong>Type:</strong> {detailsFournisseur.type === 'local' ? 'Local' : 'Étranger'}</div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Confirmer la suppression</DialogTitle>
          </DialogHeader>
          <div>
            Êtes-vous sûr de vouloir supprimer ce fournisseur&nbsp;?
            <div className="mt-2 font-semibold">
              {fournisseurToDelete?.designation}
            </div>
          </div>
          <DialogFooter>
            <Button variant="destructive" onClick={handleDeleteFournisseur} disabled={deleteLoading}>
              {deleteLoading ? 'Suppression...' : 'Supprimer'}
            </Button>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)} disabled={deleteLoading}>
              Annuler
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default Buyers;
