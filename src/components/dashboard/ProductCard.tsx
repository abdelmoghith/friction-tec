import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Eye, ArrowRight } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";

interface ProductCardProps {
  product: {
    id: number | string;
    title: string;
    name?: string; // For backward compatibility
    main_image?: string;
    image?: string; // For backward compatibility
    price: number;
    affiliate_earning_price: number;
    commission?: number; // For backward compatibility
    description: string;
    category: string;
    rating?: {
      rate: number;
      count: number;
    };
    tags?: string[];
    stock_count?: number;
    stockCount?: number; // For backward compatibility
    in_stock?: boolean;
    inStock?: boolean; // For backward compatibility
  };
}

const ProductCard = ({ product }: ProductCardProps) => {
  const navigate = useNavigate();
  // Use affiliate_earning_price directly, fallback to commission calculation for backward compatibility
  const commissionAmount = product.affiliate_earning_price || (product.commission ? (product.price * product.commission) / 100 : 0);
  const [imageLoaded, setImageLoaded] = useState(false);

  // Use the main_image from database, fallback to image for backward compatibility
  const imageUrl = product.main_image || product.image;

  // Fallback image in case the main one fails
  const fallbackImage = `https://picsum.photos/seed/${product.id}/600/400`;

  // Get product name (handle API data format)
  const productName = product.title || product.name;

  // Get stock count from database field, fallback to old field for backward compatibility
  const stockCount = product.stock_count ?? product.stockCount ?? 0;
  const inStock = product.in_stock ?? product.inStock ?? stockCount > 0;

  const goToProductDetail = () => {
    navigate(`/products/${product.id}`);
  };

  return (
    <>
      <Card
        className="overflow-hidden transition-all duration-300 h-full flex flex-col hover:shadow-lg group relative cursor-pointer"
        onClick={goToProductDetail}
      >
        <CardHeader className="p-0">
          <div className="relative aspect-square w-full overflow-hidden border border-gray-100">
            {/* Shimmer loading effect */}
            {!imageLoaded && (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"></div>
            )}

            {/* Loading spinner */}
            {!imageLoaded && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin"></div>
              </div>
            )}

            {/* Product image with container */}
            <div className="absolute inset-0 flex items-center justify-center p-2">
              <img
                src={imageUrl}
                alt={productName}
                className={`max-w-full max-h-full object-contain transition-all duration-500 rounded-md ${
                  imageLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
                }`}
                onLoad={() => setImageLoaded(true)}
                onError={(e) => {
                  e.currentTarget.src = fallbackImage;
                  setImageLoaded(true);
                }}
              />
            </div>

            {/* Overlay on hover */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 touch-none"></div>

            {/* Commission badge hidden as requested */}

            {/* View button on hover */}
            <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
              <Button variant="secondary" size="icon" className="bg-white/90 hover:bg-white shadow-sm">
                <Eye size={16} />
              </Button>
            </div>
          </div>
        </CardHeader>
      <CardContent className="pt-4 pb-2 sm:pt-5 sm:pb-3 flex-1 space-y-3">
        <h3 className="font-bold text-base sm:text-lg line-clamp-2 group-hover:text-primary transition-colors mb-2">
          {productName}
        </h3>
        <div className="flex justify-between items-center">
          <div>
            <p className="text-lg sm:text-xl font-bold">{Math.round(product.price)} Da</p>
            <p className="text-xs sm:text-sm text-emerald-600 font-semibold">
              Earn: {Math.round(commissionAmount)} Da
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Badge
            variant="outline"
            className={`text-xs px-2 py-0.5 border-gray-200 ${stockCount > 0 ? 'text-green-600' : 'text-red-500'}`}
          >
            {stockCount > 0 ? `${stockCount} in stock` : "Out of stock"}
          </Badge>
        </div>
        <div className="flex flex-wrap gap-1 sm:gap-1.5 mt-3 sm:mt-4">
          <span
            className="bg-secondary/70 hover:bg-secondary text-secondary-foreground text-[10px] sm:text-xs px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full transition-colors"
          >
            {product.category}
          </span>
        </div>
      </CardContent>
      <CardFooter className="border-t p-2 sm:p-3">
        <Button
          variant="default"
          size="sm"
          className="w-full h-8 text-xs sm:text-sm"
          onClick={goToProductDetail}
        >
          <span className="whitespace-nowrap mr-1 sm:mr-2">View Details</span>
          <ArrowRight size={14} />
        </Button>
      </CardFooter>
      </Card>
    </>
  );
};

export default ProductCard;
