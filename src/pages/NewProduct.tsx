import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Save, Upload, X, Image as ImageIcon, Loader2 } from "lucide-react";
import { toast } from 'sonner';
import type { Category, CreateProductForm } from '@/types';

const UNITES = ['kg', 'L', 'pcs', 'm', 'g'];
interface ProductForm {
  reference: string;
  nom: string;
  unite: string;
  alerte: number;
  type: string; // Add type property
}

const NewProduct = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [product, setProduct] = useState<ProductForm>({
    reference: '',
    nom: '',
    unite: '',
    alerte: 10,
    type: 'matiere', // Set default type
  });
  // Remove all remaining references to mainImage and additionalImages in state and logic

  // Fetch categories when component mounts
  useEffect(() => {
    const loadCategories = async () => {
      try {
        setCategoriesLoading(true);
        // const categoriesData = await fetchCategories(); // Removed
        // setCategories(categoriesData); // Removed
        // For now, we'll just set categories to an empty array or load dummy data
        setCategories([]); // Placeholder
      } catch (error) {
        console.error('Error fetching categories:', error);
        toast.error('Failed to load categories');
      } finally {
        setCategoriesLoading(false);
      }
    };

    loadCategories();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!product.reference || !product.nom || !product.unite) {
        toast.error('Please fill in all required fields');
        setLoading(false);
        return;
      }
      if (product.alerte < 0) {
        toast.error('Values cannot be negative');
        setLoading(false);
        return;
      }

      // Send POST request to backend
     const response = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(product), // Now includes type
      });

      if (!response.ok) {
        const errorData = await response.json();
        toast.error(errorData.error || 'Failed to create product');
        setLoading(false);
        return;
      }

      toast.success('Matière ajoutée avec succès!');
      navigate('/products');
    } catch (error) {
      console.error('Error creating product:', error);
      toast.error('Failed to create product. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-4">
          <Button variant="outline" size="sm" onClick={() => navigate('/products')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold mb-1">Ajouter une matière première</h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Ajouter une nouvelle matière première
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Informations Matière</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="reference">Référence *</Label>
                <Input
                  id="reference"
                  value={product.reference}
                  onChange={(e) => setProduct({...product, reference: e.target.value})}
                  placeholder="Entrer la référence"
                  required
                />
              </div>
              <div>
                <Label htmlFor="nom">Nom *</Label>
                <Input
                  id="nom"
                  value={product.nom}
                  onChange={(e) => setProduct({...product, nom: e.target.value})}
                  placeholder="Entrer le nom de la matière"
                  required
                />
              </div>
              <div>
                <Label htmlFor="unite">Unité *</Label>
                <Select
                  value={product.unite}
                  onValueChange={(value) => setProduct({...product, unite: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner l'unité" />
                  </SelectTrigger>
                  <SelectContent>
                    {UNITES.map(u => (
                      <SelectItem key={u} value={u}>{u}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1 space-y-2">
                <Label htmlFor="alerte">{`Alerte${product.unite ? ' (' + product.unite + ')' : ''} *`}</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="alerte"
                    type="number"
                    min="0"
                    value={product.alerte}
                    onChange={(e) => setProduct({...product, alerte: parseInt(e.target.value) || 0})}
                    placeholder={product.unite ? `10 ${product.unite}` : '10'}
                    className="h-11"
                    required
                  />
                  {product.unite && <span className="text-muted-foreground">{product.unite}</span>}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Action Buttons - Fixed at bottom */}
        <div className="mt-8 pt-6 border-t bg-white/95 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row gap-3 justify-end">
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="sm:w-auto w-full order-2 sm:order-1"
                onClick={() => navigate('/products')}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="lg"
                className="sm:w-auto w-full order-1 sm:order-2"
                disabled={loading || categoriesLoading}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Creating Product...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Create Product
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </Layout>
  );
};

export default NewProduct;