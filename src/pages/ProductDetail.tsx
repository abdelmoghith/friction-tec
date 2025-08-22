import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Edit, Trash2, ArrowLeft, Star, Loader2 } from "lucide-react";
import axios from "axios";

const ProductDetail = () => {
  const { productId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [locations, setLocations] = useState<string[]>([]);
  const [floorData, setFloorData] = useState<Record<string, Array<{ id: number, name: string, availableCapacity: number, totalCapacity: number }>>>({});

  useEffect(() => {
    const fetchProduct = async () => {
      setLoading(true);

      try {
        // Fetch product details from API
        const productData = await getEnhancedProductById(productId as string);
        setProduct(productData);
      } catch (error) {
        console.error('Error fetching product:', error);
        toast.error("Product not found");
        navigate('/products');
      } finally {
        setLoading(false);
      }
    };

    if (productId) {
      fetchProduct();
    }
  }, [productId, navigate]);

  useEffect(() => {
    axios.get('/api/locations').then(res => {
      const locs = res.data;
      setLocations(locs.map((l: any) => l.name));
      const data: Record<string, Array<{ id: number, name: string, availableCapacity: number, totalCapacity: number }>> = {};
      locs.forEach((l: any) => {
        // Use etages or parts depending on type
        const items = (l.etages && l.etages.length > 0 ? l.etages : l.parts || []).map((item: any) => ({
          id: item.id,
          name: item.name,
          availableCapacity: item.currentStock !== undefined ? (item.places || item.maxCapacity || 0) - item.currentStock : (item.places || item.maxCapacity || 0),
          totalCapacity: item.places || item.maxCapacity || 0,
        }));
        data[l.name] = items;
      });
      setFloorData(data);
    });
  }, []);

  if (loading || !product) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-[70vh]">
          <div className="w-16 h-16 border-4 border-black border-t-transparent rounded-full animate-spin"></div>
        </div>
      </Layout>
    );
  }

  // Use affiliate_earning_price directly, fallback to commission calculation for backward compatibility
  const commissionAmount = product.affiliate_earning_price || (product.commission ? (product.price * product.commission) / 100 : 0);

  // Get product name (handle API data format)
  const productName = product.title || product.name;

  // Get product images - use main_image and gallery_images from database
  const productImages = [];
  if (product.main_image) {
    productImages.push(product.main_image);
  }
  if (product.gallery_images && product.gallery_images.length > 0) {
    productImages.push(...product.gallery_images);
  }
  // Fallback to old image field if no new images
  if (productImages.length === 0 && product.image) {
    productImages.push(product.image);
  }
  // Final fallback to placeholder
  if (productImages.length === 0) {
    productImages.push(`https://picsum.photos/seed/${product.id}/800/600`);
  }

  // Fallback image in case the main one fails
  const fallbackImage = `https://picsum.photos/seed/${product.id}/800/600`;

  // Get stock information from database
  const stockCount = product.stock_count ?? 0;
  const inStock = product.in_stock ?? stockCount > 0;

  const handleEditProduct = () => {
    // Navigate to edit product page
    navigate(`/products/edit/${productId}`);
  };

  const handleDeleteProduct = async () => {
    setDeleteLoading(true);
    try {
      // Call the delete API
      await deleteProduct(productId as string);

      toast.success("Product deleted successfully");
      navigate('/products');
    } catch (error) {
      console.error('Error deleting product:', error);
      toast.error("Failed to delete product");
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <Layout>
      <div className="mb-4">
        <Button
          variant="ghost"
          size="sm"
          className="mb-4"
          onClick={() => navigate('/products')}
        >
          <ArrowLeft size={16} className="mr-2" />
          Back to Products
        </Button>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Product Image Gallery */}
          <div className="space-y-4">
            <div className="relative rounded-lg overflow-hidden border border-gray-100 aspect-square">
              {/* Shimmer loading effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer bg-[length:200%_100%]"></div>

              {/* Product image container */}
              <div className="absolute inset-0 flex items-center justify-center p-4">
                <img
                  src={productImages[selectedImage]}
                  alt={productName}
                  className="max-w-full max-h-full object-contain transition-all duration-300 rounded-md"
                  onError={(e) => {
                    e.currentTarget.src = fallbackImage;
                  }}
                />
              </div>

              {/* Commission badge */}
              <div className="absolute top-3 right-3 z-10">
                <Badge variant="default" className="bg-black/90 hover:bg-black text-white font-bold shadow-sm">
                  {Math.floor(product.commission)}% Commission
                </Badge>
              </div>
            </div>

            {/* Image thumbnails */}
            {productImages.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {productImages.map((image: string, index: number) => (
                  <button
                    key={index}
                    className={`relative rounded-md overflow-hidden border-2 h-16 w-16 sm:h-20 sm:w-20 flex-shrink-0 ${
                      selectedImage === index ? "border-black" : "border-transparent hover:border-gray-300"
                    }`}
                    onClick={() => setSelectedImage(index)}
                    aria-label={`View image ${index + 1}`}
                  >
                    <div className="absolute inset-0 flex items-center justify-center p-1">
                      <img
                        src={image}
                        alt={`${productName} - Thumbnail ${index + 1}`}
                        className="max-w-full max-h-full object-contain rounded-sm"
                        onError={(e) => {
                          e.currentTarget.src = fallbackImage;
                        }}
                      />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="flex flex-col">
            <div className="flex justify-between items-start">
              <h1 className="text-2xl sm:text-3xl font-bold">{productName}</h1>

              {/* Admin Actions */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleEditProduct}
                  className="hover:bg-blue-50 hover:border-blue-300"
                >
                  <Edit size={18} className="text-blue-600" />
                </Button>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="hover:bg-red-50 hover:border-red-300"
                    >
                      <Trash2 size={18} className="text-red-600" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Product</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete "{productName}"? This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDeleteProduct}
                        className="bg-red-600 hover:bg-red-700"
                        disabled={deleteLoading}
                      >
                        {deleteLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Deleting...
                          </>
                        ) : (
                          'Delete Product'
                        )}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>

            <div className="flex items-center gap-2 mt-2 mb-4">
              <div className="flex items-center">
                <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                <span className="ml-1 text-sm font-medium">{product.rating.rate}</span>
              </div>
              <span className="text-sm text-muted-foreground">({product.rating.count} reviews)</span>

              <Badge
                variant="secondary"
                className="text-xs px-2.5 py-1 ml-2"
              >
                {product.category}
              </Badge>
            </div>

            <div className="flex items-center mb-6">
              <div>
                <p className="text-xl font-bold">{Math.round(product.price)} Da</p>
                <p className="text-sm text-emerald-600 font-semibold">
                  Earn: {Math.round(commissionAmount)} Da
                </p>
              </div>
            </div>

            {/* Product Description */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-2">Description</h3>
              <p className="text-muted-foreground">{product.description}</p>
            </div>

            {/* Product Information */}
            <Card className="mb-6">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Product Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Category</p>
                    <p className="text-sm text-muted-foreground">{product.category}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Rating</p>
                    <div className="flex items-center">
                      <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />
                      <span className="ml-1 text-sm text-muted-foreground">
                        {product.rating.rate} ({product.rating.count} reviews)
                      </span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Stock Status</p>
                    <p className={`text-sm font-medium ${inStock ? 'text-green-600' : 'text-red-500'}`}>
                      {inStock ? `${stockCount} in stock` : 'Out of stock'}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Affiliate Earning</p>
                    <p className="text-sm text-emerald-600 font-semibold">
                      {Math.round(commissionAmount)} Da
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ProductDetail;
