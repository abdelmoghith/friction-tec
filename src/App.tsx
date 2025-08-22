import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "@/hooks/use-theme";
import Index from "./pages/Index";
import Products from "./pages/Products";
import ProductDetail from "./pages/ProductDetail";
import Buyers from "./pages/Buyers";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import ControlQuality from "./pages/ControlQuality";
import NewProduct from "./pages/NewProduct";
import ProduitSemi from "./pages/ProduitSemi";
import ProduitFinis from "./pages/ProduitFinis";
import ProductHistory from "./pages/ProductHistory";
import FournisseurHistory from "./pages/FournisseurHistory";
import ProduitSemiDetail from "./pages/ProduitSemiDetail";
import ProduitFinisDetail from "./pages/ProduitFinisDetail";
import ProductMaterials from "./pages/ProductMaterials";
import Locations from "./pages/Locations";
import EditProduct from "./pages/EditProduct";
import Login from "./pages/Login";
import FicheAccompagnement from "./pages/FicheAccompagnement";
import PrisonZoneHistory from "./pages/PrisonZoneHistory";
import Sortie from "./pages/Sortie";
import PrivateRoute from "./components/layout/PrivateRoute";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="light">
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <HashRouter>
          <Routes>
            <Route path="/login" element={<Login />} />

            {/* Main Routes */}
            <Route element={<PrivateRoute access={["/"]} />}>
              <Route path="/" element={<Index />} />
            </Route>

            {/* Products Routes */}
            <Route element={<PrivateRoute access={["/products"]} />}>
              <Route path="/products" element={<Products />} />
              <Route path="/products/edit/:id" element={<EditProduct />} />
              <Route path="/products/:productId" element={<ProductDetail />} />
              <Route path="/matiere/details/:productId" element={<ProductHistory />} />
            </Route>

            <Route element={<PrivateRoute access={["/products/new"]} />}>
              <Route path="/products/new" element={<NewProduct />} />
            </Route>

            {/* Buyers/Suppliers Routes */}
            <Route element={<PrivateRoute access={["/buyers"]} />}>
              <Route path="/buyers" element={<Buyers />} />
              <Route path="/fournisseur" element={<Buyers />} />
              <Route path="/fournisseur/history/:fournisseurId" element={<FournisseurHistory />} />
            </Route>

            {/* Locations Routes */}
            <Route element={<PrivateRoute access={["/locations"]} />}>
              <Route path="/locations" element={<Locations />} />
            </Route>

            {/* Semi Products Routes */}
            <Route element={<PrivateRoute access={["/semi-products"]} />}>
              <Route path="/semi-products" element={<ProduitSemi />} />
              <Route path="/semi-products/details/:id" element={<ProduitSemiDetail />} />
            </Route>

            {/* Finished Products Routes */}
            <Route element={<PrivateRoute access={["/finished-products"]} />}>
              <Route path="/finished-products" element={<ProduitFinis />} />
              <Route path="/produitfinis/:reference" element={<ProduitFinisDetail />} />
            </Route>

            {/* Materials Routes */}
            <Route element={<PrivateRoute access={["/articles"]} />}>
              <Route path="/articles" element={<ProductMaterials />} />
              <Route path="/product-materials" element={<Navigate to="/articles" replace />} />
            </Route>

            {/* Quality Control Routes */}
            <Route element={<PrivateRoute access={["/control-quality"]} />}>
              <Route path="/control-quality" element={<ControlQuality />} />
            </Route>

            {/* Warehouse Routes */}
            <Route element={<PrivateRoute access={["/prison-zone-history"]} />}>
              <Route path="/prison-zone-history" element={<PrisonZoneHistory />} />
            </Route>
            <Route element={<PrivateRoute access={["/sortie"]} />}>
              <Route path="/sortie" element={<Sortie />} />
            </Route>

            {/* History Routes */}
            <Route element={<PrivateRoute access={["/fiche-accompagnement"]} />}>
              <Route path="/fiche-accompagnement" element={<FicheAccompagnement />} />
            </Route>

            {/* Reports Routes */}
            <Route element={<PrivateRoute access={["/reports"]} />}>
              <Route path="/reports" element={
                <div className="p-8">
                  <h1 className="text-2xl font-bold">Reports</h1>
                  <p className="text-muted-foreground">Reports module coming soon...</p>
                </div>
              } />
            </Route>

            {/* Settings Routes */}
            <Route element={<PrivateRoute access={["/settings"]} />}>
              <Route path="/settings" element={<Settings />} />
            </Route>
            
            {/* Catch-all route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </HashRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
