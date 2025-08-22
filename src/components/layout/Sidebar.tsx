import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import {
  Home,
  Users,
  ChevronLeft,
  ChevronRight,
  ShoppingBag,
  X,
  Settings as SettingsIcon,
  Package2,
  Layers,
  ListChecks,
  MapPin,
  FileText,
  ArrowUpRight,
  BarChart3,
  CreditCard,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent, SheetClose } from "@/components/ui/sheet";
import { logout, getCurrentUserProfile } from '@/lib/session';

interface SidebarProps {
  className?: string;
  isOpen?: boolean;
  onClose?: () => void;
}

const Sidebar = ({ className, isOpen = false, onClose }: SidebarProps) => {
  const isMobile = useIsMobile();
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const [userAccess, setUserAccess] = useState<string[]>([]);

  useEffect(() => {
    const session = getCurrentUserProfile();
    if (session && session.access) {
      setUserAccess(session.access);
    }
  }, []);

  const toggleSidebar = () => {
    setCollapsed(!collapsed);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Render mobile sidebar using Sheet component
  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent side="left" className="p-0 w-[280px] sm:w-[320px]">
          <div className="flex flex-col h-full bg-sidebar text-sidebar-foreground">
            {/* Mobile Sidebar Header */}
            <div className="flex items-center justify-between p-4 ">
              <div className="flex items-center gap-3">
                <img
                  src="friction.png"
                  alt="Logo"
                  className="w-10 h-10 object-cover"
                />
              </div>
              <SheetClose asChild>
                <Button variant="ghost" size="icon" className="text-muted-foreground">
                  <X size={18} />
                </Button>
              </SheetClose>
            </div>

            {/* Mobile Navigation Links */}
            <div className="flex-1 py-4 overflow-y-auto flex flex-col">
              <nav className="px-2 space-y-1 flex-1">
                {userAccess.includes('/') && <MobileNavItem to="/" icon={<Home size={20} />} label="Dashboard" />}
                {userAccess.includes('/products') && <MobileNavItem to="/products" icon={<ShoppingBag size={20} />} label="Matières premières" />}
                {userAccess.includes('/semi-products') && <MobileNavItem to="/semi-products" icon={<Layers size={20} />} label="Produits semi" />}
                {userAccess.includes('/finished-products') && <MobileNavItem to="/finished-products" icon={<Package2 size={20} />} label="Produits finis" />}
                {userAccess.includes('/articles') && <MobileNavItem to="/articles" icon={<ListChecks size={20} />} label="Liste d'articles" />}
                {userAccess.includes('/control-quality') && <MobileNavItem to="/control-quality" icon={<CreditCard size={20} />} label="Contrôle de qualité" />}
                {userAccess.includes('/fiche-accompagnement') && <MobileNavItem to="/fiche-accompagnement" icon={<FileText size={20} />} label="Fiche d'accompagnement" />}
                {userAccess.includes('/buyers') && <MobileNavItem to="/fournisseur" icon={<Users size={20} />} label="Fournisseur" />}
                {userAccess.includes('/locations') && <MobileNavItem to="/locations" icon={<MapPin size={20} />} label="Locations" />}
                {userAccess.includes('/sortie') && <MobileNavItem to="/sortie" icon={<ArrowUpRight size={20} />} label="Sortie" />}
                {userAccess.includes('/reports') && <MobileNavItem to="/reports" icon={<BarChart3 size={20} />} label="Reports" />}
                {userAccess.includes('/settings') && <MobileNavItem to="/settings" icon={<SettingsIcon size={20} />} label="Settings" />}
              </nav>
              
              {/* Logout at bottom */}
              <div className="px-2 mt-4">
                <MobileLogoutItem onLogout={handleLogout} />
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  // Desktop sidebar
  return (
    <div className={cn(
      "relative h-screen flex flex-col bg-sidebar text-sidebar-foreground border-r border-border transition-all duration-300 hidden md:flex",
      collapsed ? "w-20" : "w-64",
      className
    )}>
      {/* Logo */}
      <div className="relative flex flex-col items-center justify-center p-4 border-b border-border">
        <div className="flex items-center justify-center w-full">
          <img
            src="friction.png"
            alt="Logo"
            className="w-10 h-10 object-cover"
            style={{ maxWidth: '40px', maxHeight: '40px' }}
          />
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          className={cn("absolute -right-3 top-1/2 -translate-y-1/2 bg-background border border-border rounded-full shadow-sm text-muted-foreground", collapsed && "rotate-180")}
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />} 
        </Button>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 py-4 overflow-y-auto flex flex-col">
        <nav className="px-2 space-y-1 flex-1">
          {userAccess.includes('/') && <NavItem to="/" icon={<Home size={20} />} label="Dashboard" collapsed={collapsed} />}
          {userAccess.includes('/products') && <NavItem to="/products" icon={<ShoppingBag size={20} />} label="Matières premières" collapsed={collapsed} />}
          {userAccess.includes('/semi-products') && <NavItem to="/semi-products" icon={<Layers size={20} />} label="Produits semi" collapsed={collapsed} />}
          {userAccess.includes('/finished-products') && <NavItem to="/finished-products" icon={<Package2 size={20} />} label="Produits finis" collapsed={collapsed} />}
          {userAccess.includes('/articles') && <NavItem to="/articles" icon={<ListChecks size={20} />} label="Liste d'articles" collapsed={collapsed} />}
          {userAccess.includes('/control-quality') && <NavItem to="/control-quality" icon={<CreditCard size={20} />} label="Contrôle de qualité" collapsed={collapsed} />}
          {userAccess.includes('/fiche-accompagnement') && <NavItem to="/fiche-accompagnement" icon={<FileText size={20} />} label="Fiche d'accompagnement" collapsed={collapsed} />}
          {userAccess.includes('/buyers') && <NavItem to="/fournisseur" icon={<Users size={20} />} label="Fournisseur" collapsed={collapsed} />}
          {userAccess.includes('/locations') && <NavItem to="/locations" icon={<MapPin size={20} />} label="Locations" collapsed={collapsed} />}
          {userAccess.includes('/sortie') && <NavItem to="/sortie" icon={<ArrowUpRight size={20} />} label="Sortie" collapsed={collapsed} />}
          {userAccess.includes('/reports') && <NavItem to="/reports" icon={<BarChart3 size={20} />} label="Reports" collapsed={collapsed} />}
          {userAccess.includes('/settings') && <NavItem to="/settings" icon={<SettingsIcon size={20} />} label="Settings" collapsed={collapsed} />}
        </nav>
        
        {/* Logout at bottom */}
        <div className="px-2 mt-4">
          <LogoutItem onLogout={handleLogout} collapsed={collapsed} />
        </div>
      </div>
    </div>
  );
};

interface NavItemProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  collapsed: boolean;
  count?: number;
}

const NavItem = ({ to, icon, label, collapsed, count }: NavItemProps) => (
  <Link
    to={to}
    className={cn(
      "flex items-center px-3 py-2 text-sm rounded-md transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground relative",
      to === window.location.pathname && "bg-sidebar-accent text-sidebar-accent-foreground",
      !collapsed && "justify-start gap-3",
      collapsed && "justify-center"
    )}
  >
    {icon}
    {!collapsed && (
      <div className="flex items-center w-full">
        <div className="flex items-center gap-2">
          <span>{label}</span>
          {typeof count === 'number' && count > 0 && (
            <span className="inline-flex items-center justify-center bg-red-500 text-white text-[10px] font-semibold rounded-full w-4 h-4 ml-1">
              {count}
            </span>
          )}
        </div>
      </div>
    )}
    {collapsed && typeof count === 'number' && count > 0 && (
      <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[8px] px-1 py-0.5 rounded-full min-w-[12px] text-center font-medium">
        {count}
      </span>
    )}
  </Link>
);

// Desktop logout item component
interface LogoutItemProps {
  onLogout: () => void;
  collapsed: boolean;
}

const LogoutItem = ({ onLogout, collapsed }: LogoutItemProps) => (
  <button
    onClick={onLogout}
    className={cn(
      "flex items-center px-3 py-2 text-sm rounded-md transition-colors hover:bg-red-50 hover:text-red-600 w-full text-left",
      !collapsed && "justify-start gap-3",
      collapsed && "justify-center"
    )}
  >
    <LogOut size={20} />
    {!collapsed && <span>Logout</span>}
  </button>
);

// Mobile navigation item component
interface MobileNavItemProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  count?: number;
}

const MobileNavItem = ({ to, icon, label, count }: MobileNavItemProps) => (
  <Link
    to={to}
    className={cn(
      "flex items-center px-3 py-2 text-sm rounded-md transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground relative",
      to === window.location.pathname && "bg-sidebar-accent text-sidebar-accent-foreground",
      "justify-start gap-3"
    )}
  >
    {icon}
    <div className="flex items-center w-full">
      <div className="flex items-center gap-2">
        <span>{label}</span>
        {typeof count === 'number' && count > 0 && (
          <span className="inline-flex items-center justify-center bg-red-500 text-white text-[10px] font-semibold rounded-full w-4 h-4 ml-1">
            {count}
          </span>
        )}
      </div>
    </div>
  </Link>
);

// Mobile logout item component
interface MobileLogoutItemProps {
  onLogout: () => void;
}

const MobileLogoutItem = ({ onLogout }: MobileLogoutItemProps) => (
  <button
    onClick={onLogout}
    className="flex items-center px-3 py-2 text-sm rounded-md transition-colors hover:bg-red-50 hover:text-red-600 w-full text-left gap-3"
  >
    <LogOut size={20} />
    <span>Logout</span>
  </button>
);

export default Sidebar;