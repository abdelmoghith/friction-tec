import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useTheme } from "@/hooks/use-theme";
import {
  Bell,
  Menu,
  Moon,
  Sun,
  Trash2,
  Package,
  AlertTriangle,
  RotateCcw,
  LogOut
} from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "sonner";
import { getUserInitials, getCurrentUserProfile, logout } from "@/lib/session";
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { API_BASE_URL } from '@/setupApi';
import { Socket, io } from 'socket.io-client';

interface HeaderProps {
  toggleSidebar: () => void;
}

interface Notification {
  id: number;
  product_id: number;
  message: string;
  is_read: boolean;
  created_at: string;
  product_name: string;
}

const Header = ({ toggleSidebar }: HeaderProps) => {
  const isMobile = useIsMobile();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResetConfirmDialog, setShowResetConfirmDialog] = useState(false);
  const [recycleLoading, setRecycleLoading] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const { theme, setTheme } = useTheme();

  // Get user profile from session
  const [user, setUser] = useState(null);
  
  useEffect(() => {
    const userProfile = getCurrentUserProfile();
    setUser(userProfile);
  }, []);

  // Fetch all notifications (not just unread)
  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/notifications`);
      if (response.ok) {
        const data = await response.json();
        setNotifications(data);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  // Mark notification as read
  const markAsRead = async (notificationId: number) => {
    try {
      const response = await fetch(`${API_BASE_URL}/notifications/${notificationId}/read`, {
        method: 'PUT'
      });
      if (response.ok) {
        setNotifications(prev =>
          prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
        );
      }
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  // Mark all notifications as read
  const markAllAsRead = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/notifications/mark-all-read`, {
        method: 'PUT'
      });
      if (response.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        toast.success('All notifications marked as read');
      }
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
      toast.error('Failed to mark notifications as read');
    }
  };

  // Delete notification
  const deleteNotification = async (notificationId: number) => {
    try {
      const response = await fetch(`${API_BASE_URL}/notifications/${notificationId}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        setNotifications(prev => prev.filter(n => n.id !== notificationId));
        toast.success('Notification deleted');
      }
    } catch (error) {
      console.error('Failed to delete notification:', error);
      toast.error('Failed to delete notification');
    }
  };



  // Handle recycle function as requested
  const handleRecycle = async () => {
    setRecycleLoading(true);
    try {
      const res = await fetch('/api/admin/reset-movements-products', { method: 'POST' });
      if (!res.ok) throw new Error('Failed to reset');

      // Also reset notifications
      await fetch('/api/admin/reset-notifications', { method: 'POST' });

      setShowResetConfirmDialog(false);
      fetchNotifications();
    } catch (e) {
      toast.error('Erreur lors de la réinitialisation.');
    } finally {
      setRecycleLoading(false);
    }
  };

  // Initialize WebSocket connection and fetch notifications
  useEffect(() => {
    fetchNotifications();

    // Initialize WebSocket connection
    socketRef.current = io('http://localhost:3001');

    socketRef.current.on('connect', () => {
      console.log('🔌 Connected to WebSocket server');
    });

    socketRef.current.on('newNotification', (notification: Notification) => {
      console.log('🔔 Received new notification via WebSocket:', notification);
      setNotifications(prev => [notification, ...prev]);

      // Show toast notification
      toast.info(`Stock Alert: ${notification.message}`, {
        duration: 5000,
        action: {
          label: 'View',
          onClick: () => {
            // You could navigate to the product or open a modal here
            console.log('View notification:', notification);
          }
        }
      });
    });

    socketRef.current.on('disconnect', () => {
      console.log('🔌 Disconnected from WebSocket server');
    });

    // Cleanup on unmount
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  const formatNotificationTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  const getNotificationIcon = (message: string) => {
    if (message.includes('stock faible') || message.includes('low stock')) {
      return <AlertTriangle className="h-4 w-4 text-orange-500" />;
    }
    if (message.includes('rupture') || message.includes('out of stock')) {
      return <Package className="h-4 w-4 text-red-500" />;
    }
    return <Bell className="h-4 w-4 text-blue-500" />;
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center px-4 lg:px-6">
        {/* Mobile menu button */}
        {isMobile && (
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="mr-2 md:hidden"
          >
            <Menu className="h-5 w-5" />
          </Button>
        )}

        {/* Logo/Title for mobile */}
        {isMobile && (
          <div className="flex items-center gap-2 mr-4">
            <img
              src="friction.png"
              alt="Logo"
              className="w-8 h-8 object-cover"
            />
          </div>
        )}

        <div className="flex-1" />

        {/* Right side items */}
        <div className="flex items-center gap-2">
          {/* Theme toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "light" ? "dark" : "light")}
          >
            <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowResetConfirmDialog(true)}
            disabled={recycleLoading}
            title="Reset movements and products"
          >
            <RotateCcw className={`h-4 w-4 ${recycleLoading ? 'animate-spin' : ''}`} />
            <span className="sr-only">Reset data</span>
          </Button>

          <Sheet>
            <SheetTrigger asChild>
              
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <Badge
                    variant="destructive"
                    className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                  >
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Badge>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent className="w-[400px] sm:w-[540px]">
              <SheetHeader>
                <div className="flex items-center justify-between">
                  <SheetTitle>Notifications</SheetTitle>
                  <div className="flex items-center gap-2">
                    {unreadCount > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={markAllAsRead}
                        className="text-xs"
                      >
                        Mark all read
                      </Button>
                    )}
                  </div>
                </div>
              </SheetHeader>

              <div className="mt-4 space-y-2 max-h-[calc(100vh-120px)] overflow-y-auto">
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <Bell className="h-12 w-12 text-muted-foreground mb-2" />
                    <p className="text-muted-foreground">No notifications</p>
                  </div>
                ) : (
                  notifications.map((notification) => (
                    <Card
                      key={notification.id}
                      className={`cursor-pointer transition-colors hover:bg-muted/50 ${!notification.is_read ? 'border-primary/50 bg-primary/5' : ''
                        }`}
                      onClick={() => !notification.is_read && markAsRead(notification.id)}
                    >
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            {getNotificationIcon(notification.message)}
                            <CardTitle className="text-sm font-medium">
                              Stock Alert
                            </CardTitle>
                            {!notification.is_read && (
                              <Badge variant="secondary" className="text-xs">
                                New
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-muted-foreground">
                              {formatNotificationTime(notification.created_at)}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteNotification(notification.id);
                              }}
                              className="h-6 w-6 p-0 hover:bg-destructive hover:text-destructive-foreground"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <CardDescription className="text-sm">
                          <strong>{notification.product_name}</strong>: {notification.message}
                        </CardDescription>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </SheetContent>
          </Sheet>

          {/* User menu */}
          {user && (
            <div className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-xs">
                  {getUserInitials(user.name)}
                </AvatarFallback>
              </Avatar>
              {!isMobile && (
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{user.name}</span>
                  <span className="text-xs text-muted-foreground">{user.email}</span>
                </div>
              )}
            
            </div>
          )}
        </div>
      </div>

      {/* Reset Confirmation Dialog */}
      <Dialog open={showResetConfirmDialog} onOpenChange={setShowResetConfirmDialog}>
        <DialogContent>
          <DialogTitle>Reset System Data</DialogTitle>
          <DialogDescription>
            This will reset all movements, products, and notifications. This action cannot be undone. Are you sure you want to continue?
          </DialogDescription>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowResetConfirmDialog(false)}
              disabled={recycleLoading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRecycle}
              disabled={recycleLoading}
            >
              {recycleLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Resetting...
                </>
              ) : (
                <>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </header>
  );
};

export default Header;