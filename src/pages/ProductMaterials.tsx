import { useState, useEffect } from 'react';
import Layout from '@/components/layout/Layout';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Search, Plus, MoreVertical, Loader2, Save, X, Edit, Trash2, Eye, Package, AlertTriangle, Calendar, User, FileText, BarChart3, TrendingUp, TrendingDown } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import TableLoadingRow from '@/components/ui/table-loading-row';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from 'sonner';
import { useRef } from 'react';

const UNITES = ['kg', 'L', 'pcs', 'm', 'g'];

// Mock categories (fournisseurs)
const MOCK_CATEGORIES = [
  { id: '1', name: 'Fournisseur A' },
  { id: '2', name: 'Fournisseur B' },
  { id: '3', name: 'Fournisseur C' },
];

function getRandomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Add this helper for mock materials
function generateMockMaterials() {
  return [
    { name: 'Matière A', quantity: 10, unit: 'kg' },
    { name: 'Matière B', quantity: 5, unit: 'L' },
    { name: 'Matière C', quantity: 2, unit: 'pcs' },
  ];
}

// Add type to product (semi or finis)
function generateRandomProduct(index: number) {
  const ref = `REF-${1000 + index}`;
  const nom = `Produit ${String.fromCharCode(65 + (index % 26))}`;
  const type = index % 2 === 0 ? 'semi' : 'finis';
  return {
    reference: ref,
    nom,
    type,
    alerte: '', // <-- add alerte field
    materials: generateMockMaterials(),
  };
}

const INITIAL_PRODUCTS = Array.from({ length: 10 }, (_, i) => generateRandomProduct(i));

const ProductMaterials = () => {
  const [products, setProducts] = useState<any[]>([]); // Now empty, will be filled from API
  const [searchTerm, setSearchTerm] = useState('');
  const [openMenuIndex, setOpenMenuIndex] = useState<number | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddMatiereModal, setShowAddMatiereModal] = useState(false);
  const [showEditMatiereModal, setShowEditMatiereModal] = useState(false);

  const [selectedProductIdx, setSelectedProductIdx] = useState<number | null>(null);
  const [typeFilter, setTypeFilter] = useState<'all' | 'matiere' | 'semi' | 'finis'>('all');
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);

  // Add Product form state
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState(MOCK_CATEGORIES);
  const [categoriesLoading] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [product, setProduct] = useState({
    reference: '',
    nom: '',
    type: 'semi',
    alerte: '', // <-- add alerte field
    materials: [] as { name: string; quantity: number; unit: string; materialType: string }[],
  });
  // Add state for duplicate reference check
  const [isDuplicateReference, setIsDuplicateReference] = useState(false);
  // Add state for backend duplicate error
  const [backendDuplicateReference, setBackendDuplicateReference] = useState(false);

  // New state for enhanced details
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [showMatiereDetailsModal, setShowMatiereDetailsModal] = useState(false);
  const [selectedMatiere, setSelectedMatiere] = useState<any>(null);
  const [productStats, setProductStats] = useState({
    total: 0,
    matiere: 0,
    semi: 0,
    finis: 0,
    lowStock: 0
  });

  // Check for duplicate reference when product.reference changes
  useEffect(() => {
    setIsDuplicateReference(
      product.reference.trim() !== '' &&
      products.some(p => p.reference.trim().toLowerCase() === product.reference.trim().toLowerCase())
    );
    // Clear backend duplicate error if user changes reference
    setBackendDuplicateReference(false);
  }, [product.reference, products]);
  // For new material modal in add modal
  const [showAddMaterialModal, setShowAddMaterialModal] = useState(false);
  const [newMatName, setNewMatName] = useState('');
  const [newMatQty, setNewMatQty] = useState('');
  const [newMatUnit, setNewMatUnit] = useState(UNITES[0]);
  const [newMatType, setNewMatType] = useState<'matiere' | 'semi'>('matiere');
  // Separate modals for finished products
  const [showAddRawMaterialModal, setShowAddRawMaterialModal] = useState(false);
  const [showAddSemiProductModal, setShowAddSemiProductModal] = useState(false);

  // Raw material form state
  const [rawMatName, setRawMatName] = useState('');
  const [rawMatQty, setRawMatQty] = useState('');
  const [rawMatUnit, setRawMatUnit] = useState(UNITES[0]);
  // Semi product form state
  const [semiProdName, setSemiProdName] = useState('');
  const [semiProdQty, setSemiProdQty] = useState('');
  const [semiProdUnit, setSemiProdUnit] = useState(UNITES[0]);

  // Matière form state
  const [matiereForm, setMatiereForm] = useState({
    reference: '',
    nom: '',
    unite: '',
    alerte: 10,
  });
  const [matiereLoading, setMatiereLoading] = useState(false);

  // Edit matière form state
  const [editMatiereForm, setEditMatiereForm] = useState({
    reference: '',
    nom: '',
    unite: '',
    alerte: 10,
  });
  const [editMatiereLoading, setEditMatiereLoading] = useState(false);
  const [selectedMatiereIdx, setSelectedMatiereIdx] = useState<number | null>(null);

  // Edit form state
  const [editProduct, setEditProduct] = useState({
    reference: '',
    nom: '',
    type: 'semi',
    alerte: '', // <-- add alerte field
    materials: [] as { name: string; quantity: number; unit: string; materialType: string }[],
  });

  // Material management state
  const [materialName, setMaterialName] = useState('');
  const [materialQty, setMaterialQty] = useState('');
  const [materialUnit, setMaterialUnit] = useState(UNITES[0]);

  // Edit modal state for material
  const [showEditMaterialModal, setShowEditMaterialModal] = useState(false);
  const [editMatName, setEditMatName] = useState('');
  const [editMatQty, setEditMatQty] = useState('');
  const [editMatUnit, setEditMatUnit] = useState(UNITES[0]);
  const [editMatType, setEditMatType] = useState<'matiere' | 'semi'>('matiere');
  // Edit modal: add raw material and semi-fini modals
  const [showEditAddRawMaterialModal, setShowEditAddRawMaterialModal] = useState(false);
  const [editRawMatName, setEditRawMatName] = useState('');
  const [editRawMatQty, setEditRawMatQty] = useState('');
  const [editRawMatUnit, setEditRawMatUnit] = useState(UNITES[0]);
  const [showEditAddSemiProductModal, setShowEditAddSemiProductModal] = useState(false);
  const [editSemiProdName, setEditSemiProdName] = useState('');
  const [editSemiProdQty, setEditSemiProdQty] = useState('');
  const [editSemiProdUnit, setEditSemiProdUnit] = useState(UNITES[0]);

  // For edit modal, track which product is being edited
  const editModalRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!showEditModal) return;
    const modal = editModalRef.current;
    if (!modal) return;
    let timeout: any;
    const handleScroll = () => {
      modal.classList.add('scrolling');
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        modal.classList.remove('scrolling');
      }, 700);
    };
    modal.addEventListener('scroll', handleScroll);
    modal.classList.remove('scrolling');
    return () => {
      modal.removeEventListener('scroll', handleScroll);
      clearTimeout(timeout);
    };
  }, [showEditModal]);

  // Reset matière form when modal closes
  useEffect(() => {
    if (!showAddMatiereModal) {
      setMatiereForm({
        reference: '',
        nom: '',
        unite: '',
        alerte: 10,
      });
    }
  }, [showAddMatiereModal]);

  // Reset edit matière form when modal closes
  useEffect(() => {
    if (!showEditMatiereModal) {
      setEditMatiereForm({
        reference: '',
        nom: '',
        unite: '',
        alerte: 10,
      });
      setSelectedMatiereIdx(null);
    }
  }, [showEditMatiereModal]);

  // Add material in edit modal
  const handleAddMaterialEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editMatName || !editMatQty || isNaN(Number(editMatQty))) return;
    setEditProduct({
      ...editProduct,
      materials: [
        ...(editProduct.materials || []),
        { name: editMatName, quantity: Number(editMatQty), unit: editMatUnit, materialType: editMatType }
      ]
    });
    setEditMatName('');
    setEditMatQty('');
    setEditMatUnit(UNITES[0]);
    setEditMatType('matiere');
    setShowEditMaterialModal(false);
  };
  // Remove material in edit modal
  const handleRemoveMaterialEdit = (idx: number) => {
    setEditProduct({
      ...editProduct,
      materials: (editProduct.materials || []).filter((_, i) => i !== idx)
    });
  };

  const filteredProducts = products.filter(product =>
    (typeFilter === 'all' || product.type === typeFilter) &&
    (product.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.nom.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    if (!product.reference || !product.nom || !product.type) {
      toast.error('Please fill in all required fields');
      setLoading(false);
      return;
    }
    if (isDuplicateReference) {
      setLoading(false);
      return;
    }
    try {
      const res = await fetch('/api/products-with-materials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reference: product.reference,
          nom: product.nom,
          type: product.type,
          alerte: product.alerte, // <-- send alerte
          materials: product.materials,
        }),
      });
      if (!res.ok) {
        let isDup = false;
        try {
          const errorData = await res.json();
          if (
            errorData &&
            (errorData.error === 'Database error' || errorData.message === 'Database error') &&
            errorData.details &&
            (errorData.details.code === 'ER_DUP_ENTRY' || errorData.details.errno === 1062)
          ) {
            isDup = true;
          }
        } catch { }
        if (isDup) {
          setBackendDuplicateReference(true);
        } else {
          toast.error('Erreur lors de la création du produit');
        }
        setLoading(false);
        return;
      }
      const newProduct = await res.json();
      setProducts([...products, newProduct]);
      setProduct({ reference: '', nom: '', type: 'semi', alerte: '', materials: [] });
      setShowAddModal(false);
      toast.success('Produit ajouté avec succès!');
    } catch (err) {
      toast.error('Erreur lors de la création du produit');
    }
    setLoading(false);
  };

  // Handle add matière
  const handleAddMatiere = async (e: React.FormEvent) => {
    e.preventDefault();
    setMatiereLoading(true);

    try {
      if (!matiereForm.reference || !matiereForm.nom || !matiereForm.unite) {
        toast.error('Please fill in all required fields');
        setMatiereLoading(false);
        return;
      }
      if (matiereForm.alerte < 0) {
        toast.error('Values cannot be negative');
        setMatiereLoading(false);
        return;
      }

      // Send POST request to backend
      const response = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...matiereForm,
          type: 'matiere'
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        toast.error(errorData.error || 'Failed to create matière');
        setMatiereLoading(false);
        return;
      }

      toast.success('Matière ajoutée avec succès!');
      setMatiereForm({
        reference: '',
        nom: '',
        unite: '',
        alerte: 10,
      });
      setShowAddMatiereModal(false);

      // Refresh the products list
      const res = await fetch('/api/products');
      const data = await res.json();
      setProducts(data);

      // Update stats
      const stats = {
        total: data.length,
        matiere: data.filter((p: any) => p.type === 'matiere').length,
        semi: data.filter((p: any) => p.type === 'semi').length,
        finis: data.filter((p: any) => p.type === 'finis').length,
        lowStock: data.filter((p: any) => p.alerte && parseInt(p.alerte) > 0).length
      };
      setProductStats(stats);
    } catch (error) {
      console.error('Error creating matière:', error);
      toast.error('Failed to create matière. Please try again.');
    } finally {
      setMatiereLoading(false);
    }
  };

  // Add material row in add modal
  const handleAddMaterialRow = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newMatName || !newMatQty || isNaN(Number(newMatQty))) return;
    setProduct({
      ...product,
      materials: [
        ...product.materials,
        { name: newMatName, quantity: Number(newMatQty), unit: newMatUnit, materialType: newMatType }
      ]
    });
    setNewMatName('');
    setNewMatQty('');
    setNewMatUnit(UNITES[0]);
    setNewMatType('matiere');
  };

  // Remove material row in add modal
  const handleRemoveMaterialRow = (idx: number) => {
    setProduct({
      ...product,
      materials: product.materials.filter((_, i) => i !== idx)
    });
  };

  // Add raw material handler
  const handleAddRawMaterial = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rawMatName || !rawMatQty || isNaN(Number(rawMatQty))) return;
    setProduct({
      ...product,
      materials: [
        ...product.materials,
        { name: rawMatName, quantity: Number(rawMatQty), unit: rawMatUnit, materialType: 'matiere' }
      ]
    });
    setRawMatName('');
    setRawMatQty('');
    setRawMatUnit(UNITES[0]);
    setShowAddRawMaterialModal(false);
  };

  // Add semi product handler
  const handleAddSemiProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!semiProdName || !semiProdQty || isNaN(Number(semiProdQty))) return;
    setProduct({
      ...product,
      materials: [
        ...product.materials,
        { name: semiProdName, quantity: Number(semiProdQty), unit: semiProdUnit, materialType: 'semi' }
      ]
    });
    setSemiProdName('');
    setSemiProdQty('');
    setSemiProdUnit(UNITES[0]);
    setShowAddSemiProductModal(false);
  };

  // Open Edit Modal
  const handleEdit = async (idx: number) => {
    const product = products[idx];

    // Check if it's a matière product
    if (product.type === 'matiere') {
      setSelectedMatiereIdx(idx);
      setEditMatiereForm({
        reference: product.reference,
        nom: product.nom,
        unite: product.unite || '',
        alerte: product.alerte || 10,
      });
      setShowEditMatiereModal(true);
      setOpenMenuIndex(null);
      return;
    }

    // Handle regular products (semi, finis)
    setSelectedProductIdx(idx);
    let materials = [];
    try {
      const res = await fetch(`/api/products/${product.id}/materials`);
      if (res.ok) {
        const rawMaterials = await res.json();
        materials = (rawMaterials || []).map((mat: any) => ({
          ...mat,
          materialType: mat.material_type || mat.materialType || 'matiere',
        }));
      }
    } catch (e) {
      materials = [];
    }
    setEditProduct({
      reference: product.reference,
      nom: product.nom,
      type: product.type,
      alerte: product.alerte || '', // <-- set alerte
      materials: materials || [],
    });
    setShowEditModal(true);
    setOpenMenuIndex(null);
  };

  // Save Edit
  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedProductIdx === null) return;
    setLoading(true);
    try {
      const productId = products[selectedProductIdx].id;
      const res = await fetch(`/api/products/${productId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reference: editProduct.reference,
          nom: editProduct.nom,
          type: editProduct.type,
          alerte: editProduct.alerte, // <-- send alerte
          materials: editProduct.materials,
        }),
      });
      if (!res.ok) throw new Error('Erreur lors de la modification');
      const updatedProduct = await res.json();
      const updated = [...products];
      updated[selectedProductIdx] = updatedProduct;
      setProducts(updated);
      setShowEditModal(false);
      toast.success('Produit modifié !');
    } catch (err) {
      toast.error('Erreur lors de la modification du produit');
    }
    setLoading(false);
  };

  // Save Edit Matière
  const handleEditMatiereSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedMatiereIdx === null) return;
    setEditMatiereLoading(true);

    try {
      if (!editMatiereForm.reference || !editMatiereForm.nom || !editMatiereForm.unite) {
        toast.error('Please fill in all required fields');
        setEditMatiereLoading(false);
        return;
      }
      if (editMatiereForm.alerte < 0) {
        toast.error('Values cannot be negative');
        setEditMatiereLoading(false);
        return;
      }

      const productId = products[selectedMatiereIdx].id;
      const response = await fetch(`/api/products/${productId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...editMatiereForm,
          type: 'matiere'
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        toast.error(errorData.error || 'Failed to update matière');
        setEditMatiereLoading(false);
        return;
      }

      const updatedProduct = await response.json();
      const updated = [...products];
      updated[selectedMatiereIdx] = updatedProduct;
      setProducts(updated);
      setShowEditMatiereModal(false);
      toast.success('Matière modifiée avec succès!');
    } catch (error) {
      console.error('Error updating matière:', error);
      toast.error('Failed to update matière. Please try again.');
    } finally {
      setEditMatiereLoading(false);
    }
  };





  // Add Material to Product
  const handleAddMaterialToProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!materialName || !materialQty || isNaN(Number(materialQty))) return;
    if (selectedProductIdx === null) return;
    const updated = [...products];
    updated[selectedProductIdx] = {
      ...updated[selectedProductIdx],
      materials: [
        ...updated[selectedProductIdx].materials,
        { name: materialName, quantity: Number(materialQty), unit: materialUnit }
      ]
    };
    setProducts(updated);
    setMaterialName('');
    setMaterialQty('');
    setMaterialUnit(UNITES[0]);
  };

  // Remove Material from Product
  const handleRemoveMaterial = (matIdx: number) => {
    if (selectedProductIdx === null) return;
    const updated = [...products];
    updated[selectedProductIdx] = {
      ...updated[selectedProductIdx],
      materials: updated[selectedProductIdx].materials.filter((_, i) => i !== matIdx)
    };
    setProducts(updated);
  };

  // Remove MATERIAL_OPTIONS and add state for materials
  // const MATERIAL_OPTIONS = [...];
  // Change materialOptions to store both nom and unite
  const [materialOptions, setMaterialOptions] = useState<{ nom: string; unite: string; type: string }[]>([]);

  // Fetch material options (matière première and semi-finished products) from backend
  useEffect(() => {
    const fetchMaterials = async () => {
      try {
        const res = await fetch('/api/available-materials');
        const data = await res.json();
        setMaterialOptions(data.map((m: any) => ({ nom: m.nom, unite: m.unite, type: m.type })));
      } catch (error) {
        setMaterialOptions([]);
      }
    };
    fetchMaterials();
  }, []);

  // Helper to get unite for selected material
  const getUniteForMaterial = (name: string, type: string) => {
    const found = materialOptions.find(m => m.nom === name && m.type === type);
    return found ? found.unite : UNITES[0];
  };

  const addModalRef = useRef<HTMLDivElement>(null);

  // Scrollbar visibility effect for add modal
  useEffect(() => {
    if (!showAddModal) return;
    const modal = addModalRef.current;
    if (!modal) return;
    let timeout: any;
    const handleScroll = () => {
      modal.classList.add('scrolling');
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        modal.classList.remove('scrolling');
      }, 700);
    };
    modal.addEventListener('scroll', handleScroll);
    // Initially hide
    modal.classList.remove('scrolling');
    return () => {
      modal.removeEventListener('scroll', handleScroll);
      clearTimeout(timeout);
    };
  }, [showAddModal]);

  // Fetch products from backend on mount
  useEffect(() => {
    const fetchProducts = async () => {
      setIsDataLoading(true);
      try {
        const res = await fetch('/api/products');
        const data = await res.json();
        // Include all products (matiere, semi, finis)
        setProducts(data);

        // Calculate stats
        const stats = {
          total: data.length,
          matiere: data.filter((p: any) => p.type === 'matiere').length,
          semi: data.filter((p: any) => p.type === 'semi').length,
          finis: data.filter((p: any) => p.type === 'finis').length,
          lowStock: data.filter((p: any) => p.alerte && parseInt(p.alerte) > 0).length
        };
        setProductStats(stats);
      } catch (error) {
        setProducts([]);
      } finally {
        setIsDataLoading(false);
      }
    };
    fetchProducts();
  }, []);

  // Handle view details
  const handleViewDetails = async (idx: number) => {
    const product = products[idx];

    // Check if it's a matière product
    if (product.type === 'matiere') {
      setSelectedMatiere({
        ...product,
        createdAt: product.created_at || new Date().toISOString(),
        updatedAt: product.updated_at || new Date().toISOString()
      });
      setShowMatiereDetailsModal(true);
      setOpenMenuIndex(null);
      return;
    }

    // Handle regular products (semi, finis) with materials
    let materials = [];
    try {
      const res = await fetch(`/api/products/${product.id}/materials`);
      if (res.ok) {
        const rawMaterials = await res.json();
        materials = (rawMaterials || []).map((mat: any) => ({
          ...mat,
          materialType: mat.material_type || mat.materialType || 'matiere',
        }));
      }
    } catch (e) {
      materials = [];
    }

    setSelectedProduct({
      ...product,
      materials: materials || [],
      createdAt: product.created_at || new Date().toISOString(),
      updatedAt: product.updated_at || new Date().toISOString()
    });
    setShowDetailsModal(true);
    setOpenMenuIndex(null);
  };

  return (
    <Layout>
      <div className="mb-4 sm:mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold mb-1">Liste des Articles</h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Liste des produits et gestion des nomenclatures matières premières
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button onClick={() => setShowAddMatiereModal(true)} variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Ajouter Matière
            </Button>
            <Button onClick={() => setShowAddModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Ajouter Produit
            </Button>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Produits</p>
                <p className="text-2xl font-bold">{productStats.total}</p>
              </div>
              <Package className="h-8 w-8 text-black" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Matières Premières</p>
              <p className="text-2xl font-bold">{productStats.matiere}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Semi-finis</p>
              <p className="text-2xl font-bold">{productStats.semi}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Produits Finis</p>
              <p className="text-2xl font-bold">{productStats.finis}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Alertes Stock</p>
                <p className="text-2xl font-bold text-red-600">{productStats.lowStock}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter and search bar */}
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-6 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Rechercher un produit..."
            className="pl-10 text-sm sm:text-base"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="w-full sm:w-48">
          <Select value={typeFilter} onValueChange={v => setTypeFilter(v as 'all' | 'matiere' | 'semi' | 'finis')}>
            <SelectTrigger>
              <SelectValue placeholder="Filtrer par type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les types</SelectItem>
              <SelectItem value="matiere">Matière Première</SelectItem>
              <SelectItem value="semi">Semi-fini</SelectItem>
              <SelectItem value="finis">Fini</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reference</TableHead>
                <TableHead>Nom</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Stock Actuel</TableHead>
                <TableHead>Seuil d'Alerte</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Date Création</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isDataLoading ? (
                <TableLoadingRow colSpan={8} text="Chargement des produits..." />
              ) : filteredProducts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    Aucun résultat trouvé.
                  </TableCell>
                </TableRow>
              ) : (
                filteredProducts.map((product, idx) => (
                  <TableRow
                    key={product.reference + idx}
                    className={product.alerte && parseInt(product.alerte) > 0 && (product.stock || 0) <= parseInt(product.alerte) ? 'bg-red-50' : ''}
                  >
                    <TableCell className="font-medium whitespace-nowrap">{product.reference}</TableCell>
                    <TableCell className="whitespace-nowrap">{product.nom}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${product.alerte && parseInt(product.alerte) > 0 && (product.stock || 0) <= parseInt(product.alerte)
                        ? product.type === 'matiere'
                          ? 'bg-transparent text-blue-800 border border-blue-300'
                          : product.type === 'semi'
                            ? 'bg-transparent text-orange-800 border border-orange-300'
                            : 'bg-transparent text-green-800 border border-green-300'
                        : product.type === 'matiere'
                          ? 'bg-blue-100 text-blue-800'
                          : product.type === 'semi'
                            ? 'bg-orange-100 text-orange-800'
                            : 'bg-green-100 text-green-800'
                        }`}>
                        {product.type === 'matiere' ? 'Matière Première' : product.type === 'semi' ? 'Semi-fini' : 'Fini'}
                      </span>
                    </TableCell>
                    <TableCell className="font-semibold whitespace-nowrap">
                      {product.stock || product.stock === 0 ? (
                        <span>{product.stock} {product.unite || ''}</span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {product.alerte ? (
                        <span>{product.alerte}</span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${product.alerte && parseInt(product.alerte) > 0 && (product.stock || 0) <= parseInt(product.alerte)
                        ? 'bg-red-100 text-red-800'
                        : 'bg-green-100 text-green-800'
                        }`}>
                        {product.alerte && parseInt(product.alerte) > 0 && (product.stock || 0) <= parseInt(product.alerte) ? 'Alerte' : 'Disponible'}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground whitespace-nowrap">
                      {product.created_at ? new Date(product.created_at).toLocaleDateString('fr-FR') : '-'}
                    </TableCell>
                    <TableCell>
                      <div className="inline-block">
                        <button
                          className="p-2 rounded-full hover:bg-gray-100"
                          onClick={e => {
                            e.stopPropagation();
                            if (openMenuIndex === idx) {
                              setOpenMenuIndex(null);
                              setMenuPosition(null);
                            } else {
                              setOpenMenuIndex(idx);
                              const rect = e.currentTarget.getBoundingClientRect();
                              setMenuPosition({ top: rect.bottom + window.scrollY, left: rect.right + window.scrollX - 180 }); // 180 = menu width
                            }
                          }}
                          aria-label="Actions"
                        >
                          <MoreVertical size={18} />
                        </button>
                      {/* Render menu as fixed-positioned element */}
                      {openMenuIndex === idx && menuPosition && (
                        <div
                          className="z-50 w-44 bg-white border border-gray-200 rounded shadow-lg"
                          style={{
                            position: 'fixed',
                            top: menuPosition.top,
                            left: menuPosition.left,
                          }}
                        >
                          <button
                            className="flex items-center w-full text-left px-4 py-2 hover:bg-gray-100"
                            onClick={() => handleViewDetails(idx)}
                          >
                            <Eye className="mr-2 h-4 w-4" /> Voir détails
                          </button>
                          <button
                            className="flex items-center w-full text-left px-4 py-2 hover:bg-gray-100"
                            onClick={() => handleEdit(idx)}
                          >
                            <Edit className="mr-2 h-4 w-4" /> Modifier
                          </button>
                          <button
                            className="flex items-center w-full text-left px-4 py-2 hover:bg-gray-100 text-red-600"
                            onClick={async () => {
                              if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce produit?')) return;
                              const productId = products[idx].id;
                              try {
                               const res = await fetch(`/api/products/${productId}`, { method: 'DELETE' });
                                if (!res.ok) throw new Error('Failed to delete');
                                setProducts(products => products.filter((_, i) => i !== idx));
                                setOpenMenuIndex(null);
                                setMenuPosition(null);
                                toast.success('Produit supprimé avec succès');
                              } catch (err) {
                                toast.error('Erreur lors de la suppression');
                              }
                            }}
                          >
                            <Trash2 className="mr-2 h-4 w-4" /> Supprimer
                          </button>
                        </div>
                      )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Add Product Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div ref={addModalRef} className="bg-white rounded-lg shadow-lg w-full max-w-lg relative max-h-[90vh] flex flex-col custom-scrollbar">
            {/* Sticky Header */}
            <div className="sticky top-0 z-10 bg-white p-6 pb-2 flex items-center justify-between border-b">
              <h2 className="text-xl font-bold">Ajouter un produit</h2>
              <button
                className="text-gray-500 hover:text-black ml-4"
                onClick={() => setShowAddModal(false)}
              >
                <X size={20} />
              </button>
            </div>
            {/* Scrollable Content */}
            <div className="overflow-y-auto px-6 pt-2 pb-0 flex-1 min-h-0">
              <form id="add-product-form" onSubmit={handleAddProduct} className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Informations Produit</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="reference">Référence *</Label>
                      <Input
                        id="reference"
                        value={product.reference}
                        onChange={(e) => setProduct({ ...product, reference: e.target.value })}
                        placeholder="Entrer la référence"
                        required
                        className={isDuplicateReference || backendDuplicateReference ? 'border-red-500 focus-visible:ring-red-500' : ''}
                      />
                      {(isDuplicateReference || backendDuplicateReference) && (
                        <div className="text-red-500 text-xs mt-1">Cette référence existe déjà.</div>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="nom">Nom *</Label>
                      <Input
                        id="nom"
                        value={product.nom}
                        onChange={(e) => setProduct({ ...product, nom: e.target.value })}
                        placeholder="Entrer le nom du produit"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="type">Type *</Label>
                      <Select
                        value={product.type}
                        onValueChange={(value) => setProduct({ ...product, type: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner le type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="semi">Semi-fini</SelectItem>
                          <SelectItem value="finis">Fini</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="alerte">Alerte</Label>
                      <Input
                        id="alerte"
                        type="number"
                        min="0"
                        value={product.alerte}
                        onChange={e => setProduct({ ...product, alerte: e.target.value })}
                        placeholder="Seuil d'alerte "
                      />
                    </div>
                  </CardContent>
                </Card>
              </form>
            </div>
            {/* Sticky Footer */}
            <div className="sticky bottom-0 z-10 bg-white p-6 pt-2 border-t flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowAddModal(false)}>
                Annuler
              </Button>
              <Button type="submit" form="add-product-form" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Création...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Ajouter
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Add Material Modal (for Add Product) */}
      {showAddMaterialModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6 relative">
            <button
              className="absolute top-3 right-3 text-gray-500 hover:text-black"
              onClick={() => setShowAddMaterialModal(false)}
            >
              <X size={20} />
            </button>
            <h2 className="text-xl font-bold mb-4">Ajouter une matière première</h2>
            <form onSubmit={e => {
              e.preventDefault();
              if (!newMatName || !newMatQty || isNaN(Number(newMatQty))) return;
              setProduct({
                ...product,
                materials: [
                  ...product.materials,
                  { name: newMatName, quantity: Number(newMatQty), unit: newMatUnit, materialType: newMatType }
                ]
              });
              setNewMatName('');
              setNewMatQty('');
              setNewMatUnit(UNITES[0]);
              setShowAddMaterialModal(false);
            }} className="space-y-4">
              <div>
                <Label>Nom *</Label>
                <Select
                  value={materialOptions.some(opt => opt.nom && opt.nom.trim() !== '' && opt.nom === newMatName) ? newMatName : undefined}
                  onValueChange={value => {
                    setNewMatName(value);
                    setNewMatUnit(getUniteForMaterial(value, newMatType));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir la matière" />
                  </SelectTrigger>
                  <SelectContent>
                    {materialOptions.filter(opt => opt.nom && opt.nom.trim() !== '' && opt.type === newMatType).map(opt => (
                      <SelectItem key={opt.nom} value={opt.nom}>{opt.nom}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Quantité *</Label>
                <Input value={newMatQty} onChange={e => setNewMatQty(e.target.value)} placeholder="0" type="number" min="0" required />
              </div>
              <div>
                <Label>Unité *</Label>
                <Select
                  value={UNITES.includes(newMatUnit) && newMatUnit.trim() !== '' ? newMatUnit : undefined}
                  onValueChange={setNewMatUnit}
                  disabled>
                  <SelectTrigger>
                    <SelectValue placeholder="Unité" />
                  </SelectTrigger>
                  <SelectContent>
                    {UNITES.filter(u => u && u.trim() !== '').map(u => (
                      <SelectItem key={u} value={u}>{u}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {/* Hide Type field if product.type is 'finis' or 'semi' (handled by dedicated modals) */}
              {!(product.type === 'finis' || product.type === 'semi') && (
                <div>
                  <Label>Type *</Label>
                  <Select
                    value={newMatType}
                    onValueChange={(value: string) => setNewMatType(value as 'matiere' | 'semi')}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner le type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="matiere">Matière première</SelectItem>
                      <SelectItem value="semi">Semi-fini</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setShowAddMaterialModal(false)}>
                  Annuler
                </Button>
                <Button type="submit">
                  Ajouter
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Raw Material Modal (for Add Product, type 'finis') */}
      {showAddRawMaterialModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6 relative">
            <button
              className="absolute top-3 right-3 text-gray-500 hover:text-black"
              onClick={() => setShowAddRawMaterialModal(false)}
            >
              <X size={20} />
            </button>
            <h2 className="text-xl font-bold mb-4">Ajouter une matière première</h2>
            <form onSubmit={handleAddRawMaterial} className="space-y-4">
              <div>
                <Label>Nom *</Label>
                <Select
                  value={rawMatName}
                  onValueChange={value => {
                    setRawMatName(value);
                    setRawMatUnit(getUniteForMaterial(value, 'matiere'));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir la matière première" />
                  </SelectTrigger>
                  <SelectContent>
                    {materialOptions.filter(opt => opt.type === 'matiere').map(opt => (
                      <SelectItem key={opt.nom} value={opt.nom}>{opt.nom}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Quantité *</Label>
                <Input value={rawMatQty} onChange={e => setRawMatQty(e.target.value)} placeholder="0" type="number" min="0" required />
              </div>
              <div>
                <Label>Unité *</Label>
                <Select
                  value={UNITES.includes(rawMatUnit) && rawMatUnit.trim() !== '' ? rawMatUnit : undefined}
                  onValueChange={setRawMatUnit}
                  disabled
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Unité" />
                  </SelectTrigger>
                  <SelectContent>
                    {UNITES.filter(u => u && u.trim() !== '').map(u => (
                      <SelectItem key={u} value={u}>{u}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setShowAddRawMaterialModal(false)}>
                  Annuler
                </Button>
                <Button type="submit">
                  Ajouter
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Semi Product Modal (for Add Product, type 'finis') */}
      {showAddSemiProductModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6 relative">
            <button
              className="absolute top-3 right-3 text-gray-500 hover:text-black"
              onClick={() => setShowAddSemiProductModal(false)}
            >
              <X size={20} />
            </button>
            <h2 className="text-xl font-bold mb-4">Ajouter un semi-produit</h2>
            <form onSubmit={handleAddSemiProduct} className="space-y-4">
              <div>
                <Label>Nom *</Label>
                <Select
                  value={semiProdName}
                  onValueChange={value => {
                    setSemiProdName(value);
                    setSemiProdUnit(getUniteForMaterial(value, 'semi'));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir le semi-produit" />
                  </SelectTrigger>
                  <SelectContent>
                    {materialOptions.filter(opt => opt.type === 'semi').map(opt => (
                      <SelectItem key={opt.nom} value={opt.nom}>{opt.nom}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Quantité *</Label>
                <Input value={semiProdQty} onChange={e => setSemiProdQty(e.target.value)} placeholder="0" type="number" min="0" required />
              </div>
              <div>
                <Label>Unité *</Label>
                <Select
                  value={UNITES.includes(semiProdUnit) && semiProdUnit.trim() !== '' ? semiProdUnit : undefined}
                  onValueChange={setSemiProdUnit}
                  disabled
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Unité" />
                  </SelectTrigger>
                  <SelectContent>
                    {UNITES.filter(u => u && u.trim() !== '').map(u => (
                      <SelectItem key={u} value={u}>{u}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setShowAddSemiProductModal(false)}>
                  Annuler
                </Button>
                <Button type="submit">
                  Ajouter
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Product Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div ref={editModalRef} className="bg-white rounded-lg shadow-lg w-full max-w-lg relative max-h-[90vh] flex flex-col custom-scrollbar">
            {/* Sticky Header */}
            <div className="sticky top-0 z-10 bg-white p-6 pb-2 flex items-center justify-between border-b">
              <h2 className="text-xl font-bold">Modifier le produit</h2>
              <button
                className="text-gray-500 hover:text-black ml-4"
                onClick={() => setShowEditModal(false)}
              >
                <X size={20} />
              </button>
            </div>
            {/* Scrollable Content */}
            <div className="overflow-y-auto px-6 pt-2 pb-0 flex-1 min-h-0">
              <form id="edit-product-form" onSubmit={handleEditSave} className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Informations Produit</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="reference">Référence *</Label>
                      <Input
                        id="reference"
                        value={editProduct.reference}
                        onChange={(e) => setEditProduct({ ...editProduct, reference: e.target.value })}
                        placeholder="Entrer la référence"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="nom">Nom *</Label>
                      <Input
                        id="nom"
                        value={editProduct.nom}
                        onChange={(e) => setEditProduct({ ...editProduct, nom: e.target.value })}
                        placeholder="Entrer le nom du produit"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="type">Type *</Label>
                      <Select
                        value={editProduct.type}
                        onValueChange={(value) => setEditProduct({ ...editProduct, type: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner le type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="semi">Semi-fini</SelectItem>
                          <SelectItem value="finis">Fini</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="alerte">Alerte</Label>
                      <Input
                        id="alerte"
                        type="number"
                        min="0"
                        value={editProduct.alerte}
                        onChange={e => setEditProduct({ ...editProduct, alerte: e.target.value })}
                        placeholder="Seuil d'alerte "
                      />
                    </div>
                  </CardContent>
                </Card>
              </form>
            </div>
            {/* Sticky Footer */}
            <div className="sticky bottom-0 z-10 bg-white p-6 pt-2 border-t flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowEditModal(false)}>
                Annuler
              </Button>
              <Button type="submit" form="edit-product-form">
                <Save className="h-4 w-4 mr-2" />
                Sauvegarder
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Add Material Modal for Edit Product */}
      {showEditMaterialModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6 relative">
            <button
              className="absolute top-3 right-3 text-gray-500 hover:text-black"
              onClick={() => setShowEditMaterialModal(false)}
            >
              <X size={20} />
            </button>
            <h2 className="text-xl font-bold mb-4">Ajouter une matière première</h2>
            <form onSubmit={handleAddMaterialEdit} className="space-y-4">
              <div>
                <Label>Nom *</Label>
                <Select
                  value={materialOptions.some(opt => opt.nom && opt.nom.trim() !== '' && opt.nom === editMatName) ? editMatName : undefined}
                  onValueChange={value => {
                    setEditMatName(value);
                    setEditMatUnit(getUniteForMaterial(value, editMatType));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir la matière" />
                  </SelectTrigger>
                  <SelectContent>
                    {materialOptions.filter(opt => opt.nom && opt.nom.trim() !== '' && opt.type === editMatType).map(opt => (
                      <SelectItem key={opt.nom} value={opt.nom}>{opt.nom}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Quantité *</Label>
                <Input value={editMatQty} onChange={e => setEditMatQty(e.target.value)} placeholder="0" type="number" min="0" required />
              </div>
              <div>
                <Label>Unité *</Label>
                <Select
                  value={UNITES.includes(editMatUnit) && editMatUnit.trim() !== '' ? editMatUnit : undefined}
                  onValueChange={setEditMatUnit}
                  disabled>
                  <SelectTrigger>
                    <SelectValue placeholder="Unité" />
                  </SelectTrigger>
                  <SelectContent>
                    {UNITES.filter(u => u && u.trim() !== '').map(u => (
                      <SelectItem key={u} value={u}>{u}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Type *</Label>
                <Select
                  value={editMatType}
                  onValueChange={(value: string) => setEditMatType(value as 'matiere' | 'semi')}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner le type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="matiere">Matière première</SelectItem>
                    <SelectItem value="semi">Semi-fini</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setShowEditMaterialModal(false)}>
                  Annuler
                </Button>
                <Button type="submit">
                  Ajouter
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Raw Material Modal (for Edit Product, type 'finis') */}
      {showEditAddRawMaterialModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6 relative">
            <button
              className="absolute top-3 right-3 text-gray-500 hover:text-black"
              onClick={() => setShowEditAddRawMaterialModal(false)}
            >
              <X size={20} />
            </button>
            <h2 className="text-xl font-bold mb-4">Ajouter une matière première</h2>
            <form onSubmit={e => {
              e.preventDefault();
              if (!editRawMatName || !editRawMatQty || isNaN(Number(editRawMatQty))) return;
              setEditProduct({
                ...editProduct,
                materials: [
                  ...(editProduct.materials || []),
                  { name: editRawMatName, quantity: Number(editRawMatQty), unit: editRawMatUnit, materialType: 'matiere' }
                ]
              });
              setEditRawMatName('');
              setEditRawMatQty('');
              setEditRawMatUnit(UNITES[0]);
              setShowEditAddRawMaterialModal(false);
            }} className="space-y-4">
              <div>
                <Label>Nom *</Label>
                <Select
                  value={editRawMatName}
                  onValueChange={value => {
                    setEditRawMatName(value);
                    setEditRawMatUnit(getUniteForMaterial(value, 'matiere'));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir la matière première" />
                  </SelectTrigger>
                  <SelectContent>
                    {materialOptions.filter(opt => opt.type === 'matiere').map(opt => (
                      <SelectItem key={opt.nom} value={opt.nom}>{opt.nom}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Quantité *</Label>
                <Input value={editRawMatQty} onChange={e => setEditRawMatQty(e.target.value)} placeholder="0" type="number" min="0" required />
              </div>
              <div>
                <Label>Unité *</Label>
                <Select
                  value={UNITES.includes(editRawMatUnit) && editRawMatUnit.trim() !== '' ? editRawMatUnit : undefined}
                  onValueChange={setEditRawMatUnit}
                  disabled
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Unité" />
                  </SelectTrigger>
                  <SelectContent>
                    {UNITES.filter(u => u && u.trim() !== '').map(u => (
                      <SelectItem key={u} value={u}>{u}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setShowEditAddRawMaterialModal(false)}>
                  Annuler
                </Button>
                <Button type="submit">
                  Ajouter
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Semi Product Modal (for Edit Product, type 'finis') */}
      {showEditAddSemiProductModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6 relative">
            <button
              className="absolute top-3 right-3 text-gray-500 hover:text-black"
              onClick={() => setShowEditAddSemiProductModal(false)}
            >
              <X size={20} />
            </button>
            <h2 className="text-xl font-bold mb-4">Ajouter un semi-produit</h2>
            <form onSubmit={e => {
              e.preventDefault();
              if (!editSemiProdName || !editSemiProdQty || isNaN(Number(editSemiProdQty))) return;
              setEditProduct({
                ...editProduct,
                materials: [
                  ...(editProduct.materials || []),
                  { name: editSemiProdName, quantity: Number(editSemiProdQty), unit: editSemiProdUnit, materialType: 'semi' }
                ]
              });
              setEditSemiProdName('');
              setEditSemiProdQty('');
              setEditSemiProdUnit(UNITES[0]);
              setShowEditAddSemiProductModal(false);
            }} className="space-y-4">
              <div>
                <Label>Nom *</Label>
                <Select
                  value={editSemiProdName}
                  onValueChange={value => {
                    setEditSemiProdName(value);
                    setEditSemiProdUnit(getUniteForMaterial(value, 'semi'));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir le semi-produit" />
                  </SelectTrigger>
                  <SelectContent>
                    {materialOptions.filter(opt => opt.type === 'semi').map(opt => (
                      <SelectItem key={opt.nom} value={opt.nom}>{opt.nom}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Quantité *</Label>
                <Input value={editSemiProdQty} onChange={e => setEditSemiProdQty(e.target.value)} placeholder="0" type="number" min="0" required />
              </div>
              <div>
                <Label>Unité *</Label>
                <Select
                  value={UNITES.includes(editSemiProdUnit) && editSemiProdUnit.trim() !== '' ? editSemiProdUnit : undefined}
                  onValueChange={setEditSemiProdUnit}
                  disabled
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Unité" />
                  </SelectTrigger>
                  <SelectContent>
                    {UNITES.filter(u => u && u.trim() !== '').map(u => (
                      <SelectItem key={u} value={u}>{u}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setShowEditAddSemiProductModal(false)}>
                  Annuler
                </Button>
                <Button type="submit">
                  Ajouter
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}


      {/* Product Details Modal */}
      {showDetailsModal && selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-4xl relative max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-white p-6 pb-4 flex items-center justify-between border-b">
              <div>
                <h2 className="text-2xl font-bold">{selectedProduct.nom}</h2>
                <p className="text-muted-foreground">Référence: {selectedProduct.reference}</p>
              </div>
              <button
                className="text-gray-500 hover:text-black ml-4"
                onClick={() => setShowDetailsModal(false)}
              >
                <X size={24} />
              </button>
            </div>

            {/* Content */}
            <div className="overflow-y-auto px-6 pt-4 pb-6 flex-1 min-h-0">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Product Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Package className="h-5 w-5 mr-2" />
                      Informations Produit
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Référence</Label>
                        <p className="font-medium">{selectedProduct.reference}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Nom</Label>
                        <p className="font-medium">{selectedProduct.nom}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Type</Label>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${selectedProduct.type === 'semi'
                          ? 'bg-orange-100 text-orange-800'
                          : 'bg-green-100 text-green-800'
                          }`}>
                          {selectedProduct.type === 'semi' ? 'Semi-fini' : 'Fini'}
                        </span>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Seuil d'Alerte</Label>
                        <p className={`font-medium ${selectedProduct.alerte ? 'text-red-600' : 'text-muted-foreground'}`}>
                          {selectedProduct.alerte || 'Non défini'}
                        </p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Statut</Label>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${selectedProduct.alerte && parseInt(selectedProduct.alerte) > 0
                          ? 'bg-red-100 text-red-800'
                          : 'bg-green-100 text-green-800'
                          }`}>
                          {selectedProduct.alerte && parseInt(selectedProduct.alerte) > 0 ? 'Stock faible' : 'Normal'}
                        </span>
                      </div>

                    </div>
                  </CardContent>
                </Card>

                {/* Dates Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Calendar className="h-5 w-5 mr-2" />
                      Informations Temporelles
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Date de Création</Label>
                      <p className="font-medium">
                        {selectedProduct.createdAt
                          ? new Date(selectedProduct.createdAt).toLocaleString('fr-FR')
                          : 'Non disponible'
                        }
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Dernière Modification</Label>
                      <p className="font-medium">
                        {selectedProduct.updatedAt
                          ? new Date(selectedProduct.updatedAt).toLocaleString('fr-FR')
                          : 'Non disponible'
                        }
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>


            </div>

            {/* Footer */}
            <div className="sticky bottom-0 z-10 bg-white p-6 pt-4 border-t flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowDetailsModal(false)}>
                Fermer
              </Button>
              <Button onClick={() => {
                setShowDetailsModal(false);
                const productIndex = products.findIndex(p => p.id === selectedProduct.id);
                if (productIndex !== -1) {
                  handleEdit(productIndex);
                }
              }}>
                <Edit className="h-4 w-4 mr-2" />
                Modifier
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Add Matière Modal */}
      {showAddMatiereModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6 relative">
            <button
              className="absolute top-3 right-3 text-gray-500 hover:text-black"
              onClick={() => setShowAddMatiereModal(false)}
            >
              <X size={20} />
            </button>
            <h2 className="text-xl font-bold mb-4">Ajouter une matière première</h2>
            <form onSubmit={handleAddMatiere} className="space-y-4">
              <div>
                <Label htmlFor="matiere-reference">Référence *</Label>
                <Input
                  id="matiere-reference"
                  value={matiereForm.reference}
                  onChange={(e) => setMatiereForm({...matiereForm, reference: e.target.value})}
                  placeholder="Entrer la référence"
                  required
                />
              </div>
              <div>
                <Label htmlFor="matiere-nom">Nom *</Label>
                <Input
                  id="matiere-nom"
                  value={matiereForm.nom}
                  onChange={(e) => setMatiereForm({...matiereForm, nom: e.target.value})}
                  placeholder="Entrer le nom de la matière"
                  required
                />
              </div>
              <div>
                <Label htmlFor="matiere-unite">Unité *</Label>
                <Select
                  value={matiereForm.unite}
                  onValueChange={(value) => setMatiereForm({...matiereForm, unite: value})}
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
              <div>
                <Label htmlFor="matiere-alerte">{`Alerte${matiereForm.unite ? ' (' + matiereForm.unite + ')' : ''} *`}</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="matiere-alerte"
                    type="number"
                    min="0"
                    value={matiereForm.alerte}
                    onChange={(e) => setMatiereForm({...matiereForm, alerte: parseInt(e.target.value) || 0})}
                    placeholder={matiereForm.unite ? `10 ${matiereForm.unite}` : '10'}
                    required
                  />
                  {matiereForm.unite && <span className="text-muted-foreground">{matiereForm.unite}</span>}
                </div>
              </div>
              <div className="flex gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowAddMatiereModal(false)}
                  disabled={matiereLoading}
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={matiereLoading}
                >
                  {matiereLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Création...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Créer
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Matière Modal */}
      {showEditMatiereModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6 relative">
            <button
              className="absolute top-3 right-3 text-gray-500 hover:text-black"
              onClick={() => setShowEditMatiereModal(false)}
            >
              <X size={20} />
            </button>
            <h2 className="text-xl font-bold mb-4">Modifier la matière première</h2>
            <form onSubmit={handleEditMatiereSave} className="space-y-4">
              <div>
                <Label htmlFor="edit-matiere-reference">Référence *</Label>
                <Input
                  id="edit-matiere-reference"
                  value={editMatiereForm.reference}
                  onChange={(e) => setEditMatiereForm({...editMatiereForm, reference: e.target.value})}
                  placeholder="Entrer la référence"
                  required
                />
              </div>
              <div>
                <Label htmlFor="edit-matiere-nom">Nom *</Label>
                <Input
                  id="edit-matiere-nom"
                  value={editMatiereForm.nom}
                  onChange={(e) => setEditMatiereForm({...editMatiereForm, nom: e.target.value})}
                  placeholder="Entrer le nom de la matière"
                  required
                />
              </div>
              <div>
                <Label htmlFor="edit-matiere-unite">Unité *</Label>
                <Select
                  value={editMatiereForm.unite}
                  onValueChange={(value) => setEditMatiereForm({...editMatiereForm, unite: value})}
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
              <div>
                <Label htmlFor="edit-matiere-alerte">{`Alerte${editMatiereForm.unite ? ' (' + editMatiereForm.unite + ')' : ''} *`}</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="edit-matiere-alerte"
                    type="number"
                    min="0"
                    value={editMatiereForm.alerte}
                    onChange={(e) => setEditMatiereForm({...editMatiereForm, alerte: parseInt(e.target.value) || 0})}
                    placeholder={editMatiereForm.unite ? `10 ${editMatiereForm.unite}` : '10'}
                    required
                  />
                  {editMatiereForm.unite && <span className="text-muted-foreground">{editMatiereForm.unite}</span>}
                </div>
              </div>
              <div className="flex gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowEditMatiereModal(false)}
                  disabled={editMatiereLoading}
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={editMatiereLoading}
                >
                  {editMatiereLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Modification...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Modifier
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Matière Details Modal */}
      {showMatiereDetailsModal && selectedMatiere && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-4xl relative max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-white p-6 pb-4 flex items-center justify-between border-b">
              <div>
                <h2 className="text-2xl font-bold">{selectedMatiere.nom}</h2>
                <p className="text-muted-foreground">Référence: {selectedMatiere.reference}</p>
              </div>
              <button
                className="text-gray-500 hover:text-black ml-4"
                onClick={() => setShowMatiereDetailsModal(false)}
              >
                <X size={24} />
              </button>
            </div>

            {/* Content */}
            <div className="overflow-y-auto px-6 pt-4 pb-6 flex-1 min-h-0">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Matière Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Package className="h-5 w-5 mr-2" />
                      Informations Matière
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Référence</Label>
                        <p className="font-medium">{selectedMatiere.reference}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Nom</Label>
                        <p className="font-medium">{selectedMatiere.nom}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Type</Label>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          Matière Première
                        </span>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Unité</Label>
                        <p className="font-medium">{selectedMatiere.unite}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Stock Actuel</Label>
                        <p className="font-medium">
                          {selectedMatiere.stock || selectedMatiere.stock === 0 ? (
                            <span>{selectedMatiere.stock} {selectedMatiere.unite}</span>
                          ) : (
                            <span className="text-muted-foreground">Non défini</span>
                          )}
                        </p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Seuil d'Alerte</Label>
                        <p className={`font-medium ${selectedMatiere.alerte ? 'text-red-600' : 'text-muted-foreground'}`}>
                          {selectedMatiere.alerte ? `${selectedMatiere.alerte} ${selectedMatiere.unite}` : 'Non défini'}
                        </p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Statut</Label>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${selectedMatiere.alerte && parseInt(selectedMatiere.alerte) > 0 && (selectedMatiere.stock || 0) <= parseInt(selectedMatiere.alerte)
                          ? 'bg-red-100 text-red-800'
                          : 'bg-green-100 text-green-800'
                          }`}>
                          {selectedMatiere.alerte && parseInt(selectedMatiere.alerte) > 0 && (selectedMatiere.stock || 0) <= parseInt(selectedMatiere.alerte) ? 'Stock faible' : 'Normal'}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Dates Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Calendar className="h-5 w-5 mr-2" />
                      Informations Temporelles
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Date de Création</Label>
                      <p className="font-medium">
                        {selectedMatiere.createdAt
                          ? new Date(selectedMatiere.createdAt).toLocaleString('fr-FR')
                          : 'Non disponible'
                        }
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Dernière Modification</Label>
                      <p className="font-medium">
                        {selectedMatiere.updatedAt
                          ? new Date(selectedMatiere.updatedAt).toLocaleString('fr-FR')
                          : 'Non disponible'
                        }
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 z-10 bg-white p-6 pt-4 border-t flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowMatiereDetailsModal(false)}>
                Fermer
              </Button>
              <Button onClick={() => {
                setShowMatiereDetailsModal(false);
                const productIndex = products.findIndex(p => p.id === selectedMatiere.id);
                if (productIndex !== -1) {
                  handleEdit(productIndex);
                }
              }}>
                <Edit className="h-4 w-4 mr-2" />
                Modifier
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Custom scrollbar style for modal: visible only while scrolling */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: transparent;
          border-radius: 4px;
          transition: background 0.3s;
        }
        .custom-scrollbar.scrolling::-webkit-scrollbar-thumb {
          background: rgba(0,0,0,0.12);
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: transparent transparent;
          transition: scrollbar-color 0.3s;
        }
        .custom-scrollbar.scrolling {
          scrollbar-color: rgba(0,0,0,0.12) transparent;
        }
      `}</style>
    </Layout>
  );
};

export default ProductMaterials; 