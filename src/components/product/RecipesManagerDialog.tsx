import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Search, Trash2, Eye } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import RecipeDetailsDialog from './RecipeDetailsDialog';

interface RecipesManagerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId: string;
  onDataChanged?: () => void;
}

const RecipesManagerDialog = ({ open, onOpenChange, productId, onDataChanged }: RecipesManagerDialogProps) => {
  const [recipes, setRecipes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [recipeToDelete, setRecipeToDelete] = useState<any>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<any>(null);

  const fetchRecipes = async () => {
    if (!productId) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/recipes?product_id=${productId}`);
      const data = await response.json();
      setRecipes(data);
    } catch (error) {
      console.error('Error fetching recipes:', error);
      setRecipes([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchRecipes();
    }
  }, [open, productId]);

  const handleDeleteRecipe = async (recipe: any) => {
    try {
      const response = await fetch(`/api/recipes/${recipe.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Recette supprimée avec succès');
        fetchRecipes();
        onDataChanged?.();
      } else {
        toast.error('Erreur lors de la suppression de la recette');
      }
    } catch (error) {
      console.error('Error deleting recipe:', error);
      toast.error('Erreur lors de la suppression de la recette');
    }
    setDeleteDialogOpen(false);
    setRecipeToDelete(null);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('fr-FR');
  };

  const filteredRecipes = recipes.filter(recipe => 
    recipe.product_designation?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    recipe.product_reference?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    recipe.supplier_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    recipe.batch_number?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Gestion des Reçus Complément Stock</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Rechercher par désignation, référence, fournisseur ou lot..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Recipes Table */}
            <Card>
              <div className="overflow-x-auto">
                {loading ? (
                  <div className="flex items-center justify-center h-32">
                    <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin"></div>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Désignation</TableHead>
                        <TableHead>Référence</TableHead>
                        <TableHead>Quantité</TableHead>
                        <TableHead>Fournisseur</TableHead>
                        <TableHead>Lot</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredRecipes.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-8">
                            {searchTerm ? 'Aucune recette trouvée pour cette recherche.' : 'Aucune recette de complément stock trouvée.'}
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredRecipes.map((recipe) => (
                          <TableRow key={recipe.id}>
                            <TableCell className="whitespace-nowrap">
                              {formatDate(recipe.created_at)}
                            </TableCell>
                            <TableCell className="font-medium">
                              {recipe.product_designation}
                            </TableCell>
                            <TableCell>{recipe.product_reference || '-'}</TableCell>
                            <TableCell className="whitespace-nowrap">
                              {recipe.quantity} {recipe.product_unite}
                            </TableCell>
                            <TableCell>{recipe.supplier_name || '-'}</TableCell>
                            <TableCell>{recipe.batch_number || '-'}</TableCell>
                            <TableCell>
                              {recipe.quality_status && (
                                <Badge variant="outline">{recipe.quality_status}</Badge>
                              )}
                              {recipe.needs_examination && (
                                <Badge variant="secondary" className="ml-1">Examen requis</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedRecipe(recipe);
                                    setDetailsDialogOpen(true);
                                  }}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setRecipeToDelete(recipe);
                                    setDeleteDialogOpen(true);
                                  }}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                )}
              </div>
            </Card>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer cette recette de complément stock ? 
              Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => recipeToDelete && handleDeleteRecipe(recipeToDelete)}
              className="bg-red-600 hover:bg-red-700"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Recipe Details Dialog */}
      <RecipeDetailsDialog
        open={detailsDialogOpen}
        onOpenChange={setDetailsDialogOpen}
        recipe={selectedRecipe}
      />
    </>
  );
};

export default RecipesManagerDialog;