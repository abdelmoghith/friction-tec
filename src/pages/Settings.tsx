import { useState } from 'react';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Save, Warehouse, AlertCircle, Settings as SettingsIcon, List } from 'lucide-react';

const UNITES = ['kg', 'L', 'pcs', 'm', 'g'];
const LOCATIONS = [
  'Entrepôt A',
  'Entrepôt B',
  'Zone 1',
  'Zone 2',
  'Zone 3',
];

const DEFAULT_REASONS = [
  'Ajustement d\'inventaire',
  'Perte',
  'Casse',
  'Audit',
  'Autre',
];

const Settings = () => {
  // Stock thresholds
  const [minStock, setMinStock] = useState(10);
  const [maxStock, setMaxStock] = useState(1000);

  // Default unit
  const [defaultUnit, setDefaultUnit] = useState(UNITES[0]);

  // Default location
  const [defaultLocation, setDefaultLocation] = useState(LOCATIONS[0]);

  // Low stock notification
  const [lowStockNotif, setLowStockNotif] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const saveSettings = async () => {
    setIsSaving(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success('Stock settings saved successfully!');
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-1 flex items-center gap-2">
          <SettingsIcon className="h-7 w-7 text-primary" />
          Stock Settings
        </h1>
        <p className="text-muted-foreground">
          Configure your stock management preferences
        </p>
      </div>

      {/* Stock Thresholds */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Stock Thresholds
          </CardTitle>
          <CardDescription>
            Set global minimum and maximum stock alert levels
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <Label htmlFor="minStock">Minimum Stock Alert</Label>
            <Input
              id="minStock"
              type="number"
              min={0}
              value={minStock}
              onChange={e => setMinStock(Number(e.target.value))}
              className="h-11"
            />
          </div>
          <div className="flex-1">
            <Label htmlFor="maxStock">Maximum Stock Alert</Label>
            <Input
              id="maxStock"
              type="number"
              min={0}
              value={maxStock}
              onChange={e => setMaxStock(Number(e.target.value))}
              className="h-11"
            />
          </div>
        </CardContent>
      </Card>

      {/* Default Unit & Location */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <List className="h-5 w-5" />
              Default Stock Unit
            </CardTitle>
            <CardDescription>
              Choose the default unit for new products
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Select value={defaultUnit} onValueChange={setDefaultUnit}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select unit" />
              </SelectTrigger>
              <SelectContent>
                {UNITES.map(unit => (
                  <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Warehouse className="h-5 w-5" />
              Default Warehouse/Location
            </CardTitle>
            <CardDescription>
              Select a default location for new stock entries
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Select value={defaultLocation} onValueChange={setDefaultLocation}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select location" />
              </SelectTrigger>
              <SelectContent>
                {LOCATIONS.map(loc => (
                  <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      </div>

      {/* Low Stock Notification Toggle */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Low Stock Notifications
          </CardTitle>
          <CardDescription>
            Enable or disable low stock notifications
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Switch checked={lowStockNotif} onCheckedChange={setLowStockNotif} />
            <span>{lowStockNotif ? 'Enabled' : 'Disabled'}</span>
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={saveSettings} disabled={isSaving} className="flex items-center gap-2">
            <Save className="h-4 w-4" />
            {isSaving ? 'Saving...' : 'Save Stock Settings'}
          </Button>
        </CardFooter>
      </Card>
    </Layout>
  );
};

export default Settings;
