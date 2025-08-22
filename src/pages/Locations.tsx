import React, { useState, useEffect } from "react";
import Layout from '@/components/layout/Layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import TableLoadingRow from '@/components/ui/table-loading-row';
import { MoreHorizontal, Edit, Trash2, Plus, Eye, ChevronDown, ChevronRight, Shield } from 'lucide-react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Zone, ZoneWithEtages, ZoneWithParts, Part, ZoneType } from "../types";

// Extend Etage locally to allow optional currentStock for display
type EtageWithStock = { name: string; places: number; currentStock?: number; isMainEtage?: boolean; parentEtage?: string };

// Remove MOCK_LOCATIONS and replace with MOCK_ZONES
// const MOCK_ZONES: Zone[] = [
//   {
//     id: "1",
//     type: "with_etages",
//     name: "Zone A",
//     description: "Zone avec étages",
//     etages: [
//       { name: "Étage 1", places: 20 },
//       { name: "Étage 2", places: 30 },
//     ],
//   },
//   {
//     id: "2",
//     type: "with_parts",
//     name: "Zone B",
//     description: "Zone divisée en parties",
//     parts: [
//       { name: "Partie 1", maxCapacity: 40, currentStock: 10 },
//       { name: "Partie 2", maxCapacity: 60, currentStock: 30 },
//     ],
//   },
// ];

// Form state types
const emptyForm = {
  type: "with_etages" as ZoneType,
  name: "",
  description: "",
  is_prison: false,
  etages: [{ name: "etage-1-A", places: 0, currentStock: 0 }],
  parts: [{ name: "Partie 1", maxCapacity: 0, currentStock: 0 }],
};

type FormState = typeof emptyForm;

const Locations: React.FC = () => {
  const [zones, setZones] = useState<Zone[]>([]);
  const [openMenuIndex, setOpenMenuIndex] = useState<number | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [prisonDialogOpen, setPrisonDialogOpen] = useState(false);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsZone, setDetailsZone] = useState<Zone | null>(null);
  const [search, setSearch] = useState("");
  const [detailsSearch, setDetailsSearch] = useState("");
  const [expandedEtages, setExpandedEtages] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    fetch('/api/locations')
      .then(res => res.json())
      .then(data => setZones(data))
      .catch(err => console.error('Failed to fetch locations', err))
      .finally(() => setIsLoading(false));
  }, []);

  // Handle zone type change
  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const type = e.target.value as ZoneType;
    setForm((prev) => ({
      ...prev,
      type,
      etages: type === "with_etages" ? [{ name: "etage-1-A", places: 0, currentStock: 0 }] : [],
      parts: type === "with_parts" ? [{ name: "Partie 1", maxCapacity: 0, currentStock: 0 }] : [],
    }));
    
    // Auto-expand the first etage when switching to etages type
    if (type === "with_etages") {
      setExpandedEtages(new Set(['etage-1']));
    } else {
      setExpandedEtages(new Set());
    }
  };

  // Open dialog for add or edit
  const openAddDialog = () => {
    setForm(emptyForm);
    setEditIndex(null);
    // Auto-expand the first etage when adding new zone
    setExpandedEtages(new Set(['etage-1']));
    setDialogOpen(true);
  };

  // Open prison dialog for add
  const openAddPrisonDialog = () => {
    setForm({ ...emptyForm, is_prison: true });
    setEditIndex(null);
    // Auto-expand the first etage when adding new prison zone
    setExpandedEtages(new Set(['etage-1']));
    setPrisonDialogOpen(true);
  };
  const openEditDialog = (idx: number) => {
    const zone = zones[idx];
    if (zone.type === "with_etages") {
      const etagesWithNames = zone.etages.length
        ? zone.etages.map((et, i) => ({
            ...et,
            name: et.name && et.name.trim() !== "" ? et.name : `etage-${i + 1}-A`,
            currentStock: et.currentStock || 0,
          }))
        : [{ name: "etage-1-A", places: 0, currentStock: 0 }];
      
      // Auto-expand all main etages when editing
      const mainEtages = new Set<string>();
      etagesWithNames.forEach(etage => {
        mainEtages.add(getMainEtageName(etage.name));
      });
      setExpandedEtages(mainEtages);
      
      setForm({
        type: zone.type,
        name: zone.name,
        description: zone.description || "",
        is_prison: zone.is_prison || false,
        etages: etagesWithNames,
        parts: [],
      });
    } else {
      const partsWithNames = zone.parts.length
        ? zone.parts.map((pt, i) => ({
            ...pt,
            name: pt.name && pt.name.trim() !== "" ? pt.name : `Partie ${i + 1}`,
            currentStock: pt.currentStock || 0,
          }))
        : [{ name: "Partie 1", maxCapacity: 0, currentStock: 0 }];
      setForm({
        type: zone.type,
        name: zone.name,
        description: zone.description || "",
        is_prison: zone.is_prison || false,
        etages: [],
        parts: partsWithNames,
      });
    }
    setEditIndex(idx);
    setDialogOpen(true);
    setOpenMenuIndex(null);
  };

  // Handle form changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  // Handle dynamic etages/parts changes
  const handleEtageChange = (i: number, field: keyof EtageWithStock, value: string | number) => {
    setForm((prev) => ({
      ...prev,
      etages: prev.etages.map((et, idx) => {
        if (idx !== i) return et;
        if (field === 'currentStock') {
          const max = et.places || 0;
          const val = Math.max(0, Math.min(Number(value), max));
          return { ...et, currentStock: val };
        }
        if (field === 'places') {
          // If places is reduced below currentStock, also reduce currentStock
          const newPlaces = Number(value);
          const newCurrentStock = Math.min(et.currentStock || 0, newPlaces);
          return { ...et, places: newPlaces, currentStock: newCurrentStock };
        }
        if (field === 'name') {
          return { ...et, name: String(value) };
        }
        return { ...et, [field]: value };
      }),
    }));
  };

  const handlePartChange = (i: number, field: keyof Part, value: string | number) => {
    setForm((prev) => ({
      ...prev,
      parts: prev.parts.map((pt, idx) => {
        if (idx !== i) return pt;
        if (field === 'currentStock') {
          const max = pt.maxCapacity || 0;
          const val = Math.max(0, Math.min(Number(value), max));
          return { ...pt, currentStock: val };
        }
        if (field === 'maxCapacity') {
          // If maxCapacity is reduced below currentStock, also reduce currentStock
          const newMax = Number(value);
          const newCurrentStock = Math.min(pt.currentStock || 0, newMax);
          return { ...pt, maxCapacity: newMax, currentStock: newCurrentStock };
        }
        if (field === 'name') {
          return { ...pt, name: String(value) };
        }
        return { ...pt, [field]: value };
      }),
    }));
  };

  // Toggle expanded state for main etages
  const toggleEtageExpansion = (etageName: string) => {
    setExpandedEtages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(etageName)) {
        newSet.delete(etageName);
      } else {
        newSet.add(etageName);
      }
      return newSet;
    });
  };

  // Get main etage name (e.g., "etage-1" from "etage-1-A")
  const getMainEtageName = (fullName: string): string => {
    const match = fullName.match(/^(etage-\d+)/i);
    return match ? match[1] : fullName;
  };

  // Group etages by main etage
  const groupEtagesByMain = (etages: EtageWithStock[]) => {
    const groups: { [key: string]: EtageWithStock[] } = {};
    etages.forEach(etage => {
      const mainName = getMainEtageName(etage.name);
      if (!groups[mainName]) {
        groups[mainName] = [];
      }
      groups[mainName].push(etage);
    });
    return groups;
  };

  // Add main etage (creates first detailed etage)
  const addMainEtage = () => {
    const existingMainEtages = new Set();
    form.etages.forEach(etage => {
      existingMainEtages.add(getMainEtageName(etage.name));
    });
    
    let newMainNumber = 1;
    while (existingMainEtages.has(`etage-${newMainNumber}`)) {
      newMainNumber++;
    }
    
    const newMainName = `etage-${newMainNumber}`;
    const newDetailedName = `${newMainName}-A`;
    
    setForm((prev) => ({
      ...prev,
      etages: [
        ...prev.etages,
        { name: newDetailedName, places: 0, currentStock: 0 }
      ]
    }));
    
    // Auto-expand the new main etage
    setExpandedEtages(prev => new Set([...prev, newMainName]));
  };

  // Add detailed etage to a main etage
  const addDetailedEtage = (mainEtageName: string) => {
    const existingDetailed = form.etages
      .filter(etage => getMainEtageName(etage.name) === mainEtageName)
      .map(etage => etage.name.split('-').pop() || 'A');
    
    // Find next available letter
    let nextLetter = 'A';
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    for (let i = 0; i < alphabet.length; i++) {
      if (!existingDetailed.includes(alphabet[i])) {
        nextLetter = alphabet[i];
        break;
      }
    }
    
    const newDetailedName = `${mainEtageName}-${nextLetter}`;
    
    setForm((prev) => ({
      ...prev,
      etages: [
        ...prev.etages,
        { name: newDetailedName, places: 0, currentStock: 0 }
      ]
    }));
  };

  // Remove etage (detailed or all from main if it's the last one)
  const removeEtage = (i: number) => {
    const etageToRemove = form.etages[i];
    const mainName = getMainEtageName(etageToRemove.name);
    const remainingInMain = form.etages.filter((etage, idx) => 
      idx !== i && getMainEtageName(etage.name) === mainName
    );
    
    // If this is the last detailed etage in a main etage, collapse it
    if (remainingInMain.length === 0) {
      setExpandedEtages(prev => {
        const newSet = new Set(prev);
        newSet.delete(mainName);
        return newSet;
      });
    }
    
    setForm((prev) => ({ 
      ...prev, 
      etages: prev.etages.filter((_, idx) => idx !== i) 
    }));
  };
  const addPart = () => setForm((prev) => ({
    ...prev,
    parts: [
      ...prev.parts,
      { name: `Partie ${prev.parts.length + 1}`, maxCapacity: 0, currentStock: 0 }
    ]
  }));
  const removePart = (i: number) => setForm((prev) => ({ ...prev, parts: prev.parts.filter((_, idx) => idx !== i) }));

  // Save zone (add or edit)
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) return;
    if (form.type === "with_etages" && form.etages.length === 0) return;
    if (form.type === "with_parts" && form.parts.length === 0) return;

    setIsSaving(true);

    // Prepare payload
    const payload = {
      name: form.name,
      description: form.description,
      type: form.type,
      is_prison: form.is_prison,
      etages: form.type === "with_etages" ? form.etages : undefined,
      parts: form.type === "with_parts" ? form.parts : undefined,
    };

    let res;
    if (editIndex !== null) {
      // EDIT
      const zone = zones[editIndex];
      res = await fetch(`/api/locations/${zone.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } else {
      // ADD
      res = await fetch('/api/locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    }

    try {
      if (res.ok) {
        const newZone = await res.json();
        if (editIndex !== null) {
          setZones(prev => prev.map((z, i) => (i === editIndex ? newZone : z)));
        } else {
          setZones(prev => [...prev, newZone]);
        }
        setDialogOpen(false);
        setPrisonDialogOpen(false);
        setForm(emptyForm);
        setEditIndex(null);
      } else {
        const data = await res.json();
        if (data?.error === "DUPLICATE_NAME" || data?.details?.code === "ER_DUP_ENTRY") {
          alert("Une zone avec ce nom existe déjà. Veuillez choisir un autre nom.");
        } else {
          alert("Erreur lors de l'ajout ou modification de la zone. Veuillez réessayer.");
        }
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Delete zone from backend and update UI
  const handleDelete = async (idx: number) => {
    const zone = zones[idx];
    if (!zone) return;
    if (!window.confirm(`Supprimer la zone: ${zone.name} ? Cette action est irréversible.`)) {
      setOpenMenuIndex(null);
      return;
    }
    try {
      const res = await fetch(`/api/locations/${zone.id}`, { method: 'DELETE' });
      if (res.ok) {
      setZones(zones.filter((_, i) => i !== idx));
      } else {
        const data = await res.json();
        alert(data.error || 'Erreur lors de la suppression de la zone');
      }
    } catch (err) {
      alert('Erreur réseau lors de la suppression de la zone');
    }
    setOpenMenuIndex(null);
  };

  // Show details popup
  const openDetails = (zone: Zone) => {
    setDetailsZone(zone);
    setDetailsOpen(true);
    setOpenMenuIndex(null);
  };

  // Filtered zones based on search
  const filteredZones = zones.filter(
    z =>
      z.name.toLowerCase().includes(search.toLowerCase()) ||
      (z.description || "").toLowerCase().includes(search.toLowerCase())
  );

  // Move the details dialog rendering logic to a function to avoid JSX IIFE
  function renderDetailsZone() {
    if (!detailsZone) return null;
            
            // Compute overall stats
            let totalMax = 0, totalUsed = 0;
            if (detailsZone.type === 'with_etages') {
              totalMax = detailsZone.etages.reduce((sum, et) => sum + (et.places || 0), 0);
              totalUsed = detailsZone.etages.reduce((sum, et) => sum + (et.currentStock || 0), 0);
            } else {
              totalMax = detailsZone.parts.reduce((sum, pt) => sum + (pt.maxCapacity || 0), 0);
              totalUsed = detailsZone.parts.reduce((sum, pt) => sum + (pt.currentStock || 0), 0);
            }
            const totalRest = totalMax - totalUsed;
            const isFull = totalRest <= 0;
            const occupancyRate = totalMax > 0 ? ((totalUsed / totalMax) * 100).toFixed(1) : '0';

            // For etages, group by main etage and calculate stats
            let mainEtageStats: { [key: string]: { count: number; totalMax: number; totalUsed: number; etages: EtageWithStock[] } } = {};
            let filteredRows = [];
            
            if (detailsZone.type === 'with_etages') {
              const etages = detailsZone.etages as EtageWithStock[];
              
              // Group etages by main etage
              etages.forEach(etage => {
                const mainName = getMainEtageName(etage.name);
                if (!mainEtageStats[mainName]) {
                  mainEtageStats[mainName] = { count: 0, totalMax: 0, totalUsed: 0, etages: [] };
                }
                mainEtageStats[mainName].count++;
                mainEtageStats[mainName].totalMax += etage.places || 0;
                mainEtageStats[mainName].totalUsed += etage.currentStock || 0;
                mainEtageStats[mainName].etages.push(etage);
              });
              
              // Filter for search
              filteredRows = etages.filter(et => et.name.toLowerCase().includes(detailsSearch.toLowerCase()));
            } else {
              filteredRows = detailsZone.parts.filter(pt => pt.name.toLowerCase().includes(detailsSearch.toLowerCase()));
            }

            return (
              <div className="space-y-6">
                {/* General Zone Details */}
                <div className="border-b pb-4 mb-2">
                  <div className="text-lg font-semibold mb-2">Informations générales</div>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div><b>Nom:</b> {detailsZone.name}</div>
                    <div><b>Type:</b> {detailsZone.type === 'with_etages' ? 'Étages' : 'Parties'}</div>
                    <div><b>Zone Prison:</b> 
                      <span className={`inline-flex items-center ml-2 px-2 py-1 rounded-full text-xs font-medium ${detailsZone.is_prison ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}`}>
                        {detailsZone.is_prison ? 'Oui' : 'Non'}
                      </span>
                    </div>
                    <div><b>Capacité totale:</b> {totalMax}</div>
                    <div><b>Places occupées:</b> {totalUsed}</div>
                    <div><b>Places restantes:</b> {totalRest}</div>
                    <div><b>Taux d'occupation:</b> {occupancyRate}%</div>
                    <div className="col-span-3"><b>Description:</b> {detailsZone.description || <span className="text-muted-foreground">Aucune description</span>}</div>
                    <div className="col-span-3">
                      <b>Statut global:</b> 
                      <span className={`inline-block ml-2 px-3 py-1 rounded text-xs font-semibold ${isFull ? 'bg-red-100 text-red-700' : totalUsed > totalMax * 0.8 ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                        {isFull ? 'Plein' : totalUsed > totalMax * 0.8 ? 'Presque plein' : 'Disponible'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Etage Statistics (only for etages type) */}
                {detailsZone.type === 'with_etages' && Object.keys(mainEtageStats).length > 0 && (
                  <div className="border-b pb-4 mb-2">
                    <div className="text-lg font-semibold mb-3">Statistiques par étage principal</div>
                    <div className="grid gap-3">
                      {Object.entries(mainEtageStats).map(([mainName, stats]) => {
                        const mainRest = stats.totalMax - stats.totalUsed;
                        const mainIsFull = mainRest <= 0;
                        const mainOccupancyRate = stats.totalMax > 0 ? ((stats.totalUsed / stats.totalMax) * 100).toFixed(1) : '0';
                        
                        return (
                          <div key={mainName} className="bg-gray-50 rounded-lg p-3">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-medium capitalize">{mainName}</h4>
                              <span className={`px-2 py-1 rounded text-xs font-semibold ${mainIsFull ? 'bg-red-100 text-red-700' : stats.totalUsed > stats.totalMax * 0.8 ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                                {mainIsFull ? 'Plein' : stats.totalUsed > stats.totalMax * 0.8 ? 'Presque plein' : 'Disponible'}
                              </span>
                            </div>
                            <div className="grid grid-cols-4 gap-2 text-xs text-muted-foreground">
                              <div><b>Détails:</b> {stats.count}</div>
                              <div><b>Capacité:</b> {stats.totalMax}</div>
                              <div><b>Occupé:</b> {stats.totalUsed}</div>
                              <div><b>Taux:</b> {mainOccupancyRate}%</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Search bar for details */}
                <div className="mb-2">
                  <Input
                    type="text"
                    placeholder={`Rechercher par nom ${detailsZone.type === 'with_etages' ? 'd\'étage détaillé' : 'de partie'}...`}
                    value={detailsSearch}
                    onChange={e => setDetailsSearch(e.target.value)}
                    className="w-full"
                  />
                </div>

                {/* Enhanced Table for Etages */}
                {detailsZone.type === 'with_etages' ? (
                  <div>
                    <div className="text-lg font-semibold mb-3">Détails des étages ({filteredRows.length})</div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nom détaillé</TableHead>
                          <TableHead>Étage principal</TableHead>
                          <TableHead>Capacité max</TableHead>
                          <TableHead>Occupé</TableHead>
                          <TableHead>Restant</TableHead>
                          <TableHead>Taux</TableHead>
                          <TableHead>Statut</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredRows.map((et: EtageWithStock, i) => {
                          const max = et.places || 0;
                          const used = et.currentStock || 0;
                          const rest = max - used;
                          const isFull = rest <= 0;
                          const rate = max > 0 ? ((used / max) * 100).toFixed(1) : '0';
                          const mainName = getMainEtageName(et.name);
                          
                          return (
                            <TableRow key={i}>
                              <TableCell className="font-medium">{et.name}</TableCell>
                              <TableCell className="text-muted-foreground capitalize">{mainName}</TableCell>
                              <TableCell>{max}</TableCell>
                              <TableCell>{used}</TableCell>
                              <TableCell>{rest}</TableCell>
                              <TableCell>{rate}%</TableCell>
                              <TableCell>
                                <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${isFull ? 'bg-red-100 text-red-700' : used > max * 0.8 ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                                  {isFull ? 'Plein' : used > max * 0.8 ? 'Presque plein' : 'Disponible'}
                                </span>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  /* Original Parts Table */
                  <div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nom</TableHead>
                          <TableHead>Capacité max</TableHead>
                          <TableHead>Places restantes</TableHead>
                          <TableHead>Statut</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredRows.map((pt, i) => {
                          const max = pt.maxCapacity || 0;
                          const used = pt.currentStock || 0;
                          const rest = max - used;
                          const isFull = rest <= 0;
                          return (
                            <TableRow key={i}>
                              <TableCell>{pt.name}</TableCell>
                              <TableCell>{max}</TableCell>
                              <TableCell>{rest}</TableCell>
                              <TableCell>
                                <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${isFull ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                  {isFull ? 'Plein' : 'Disponible'}
                                </span>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            );
  }

  return (
    <Layout>
      <div className="mb-4 sm:mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold mb-1">Zones d'entrepôt</h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Liste et gestion des zones de stockage dans votre entrepôt.
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={openAddDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Ajouter une zone
            </Button>
            <Button onClick={openAddPrisonDialog} variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Nouvelle zone prison
            </Button>
          </div>
        </div>
      </div>
      {/* Search bar */}
      <div className="mb-4">
        <Input
          type="text"
          placeholder="Rechercher une zone..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full"
        />
      </div>
      <Card className="overflow-hidden">
        <div className="overflow-x-auto" style={{ maxWidth: '100vw' }}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Zone Prison</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Capacité max</TableHead>
                <TableHead>Places restantes</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableLoadingRow colSpan={8} text="Chargement des zones..." />
              ) : filteredZones.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    Aucune zone trouvée.
                  </TableCell>
                </TableRow>
              ) : (
                filteredZones.map((zone, idx) => {
                  let maxCapacity = 0;
                  let used = 0;
                  if (zone.type === 'with_etages') {
                    maxCapacity = zone.etages.reduce((sum, et) => sum + (et.places || 0), 0);
                    used = zone.etages.reduce((sum, et) => sum + (et.currentStock || 0), 0);
                  } else {
                    maxCapacity = zone.parts.reduce((sum, pt) => sum + (pt.maxCapacity || 0), 0);
                    used = zone.parts.reduce((sum, pt) => sum + (pt.currentStock || 0), 0);
                  }
                  const remaining = maxCapacity - used;
                  const isFull = remaining <= 0;
                  return (
                    <TableRow key={zone.id}>
                      <TableCell>{zone.name}</TableCell>
                      <TableCell>{zone.type === 'with_etages' ? 'Étages' : 'Parties'}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${zone.is_prison ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}`}>
                          {zone.is_prison ? 'Oui' : 'Non'}
                        </span>
                      </TableCell>
                      <TableCell>{zone.description}</TableCell>
                      <TableCell>{maxCapacity}</TableCell>
                      <TableCell>{remaining > 0 ? remaining : 0}</TableCell>
                      <TableCell>
                        <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${isFull ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                          {isFull ? 'Plein' : 'Disponible'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right flex gap-2 justify-end">
                        <Button variant="outline" size="sm" onClick={() => openDetails(zone)}>
                          <Eye className="h-4 w-4 mr-1" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={() => setOpenMenuIndex(openMenuIndex === idx ? null : idx)}>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          {openMenuIndex === idx && (
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem 
                                className="gap-2" 
                                onClick={() => openEditDialog(idx)}
                              >
                                <Edit className="h-4 w-4 text-blue-600" />
                                Modifier
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                className="gap-2 text-red-600" 
                                onClick={() => handleDelete(idx)}
                              >
                                <Trash2 className="h-4 w-4" />
                                Supprimer
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          )}
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
      {/* Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-3xl w-full custom-scrollbar" style={{ maxHeight: '80vh', overflowY: 'auto' }}>
          <DialogHeader>
            <DialogTitle>Détails de la zone</DialogTitle>
          </DialogHeader>
          {detailsZone && renderDetailsZone()}
        </DialogContent>
      </Dialog>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl w-full custom-scrollbar" style={{ maxHeight: '80vh', overflowY: 'auto' }}>
          <DialogHeader>
            <DialogTitle>{editIndex !== null ? "Modifier la zone" : "Ajouter une zone"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <Label htmlFor="type">Type de zone</Label>
              <select id="type" name="type" value={form.type} onChange={handleTypeChange} className="w-full border rounded px-2 py-1">
                <option value="with_etages">Avec étages</option>
                <option value="with_parts">Divisée en parties</option>
              </select>
            </div>
            <div>
              <Label htmlFor="name">Nom</Label>
              <Input id="name" name="name" value={form.name} onChange={handleChange} required />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Input id="description" name="description" value={form.description} onChange={handleChange} />
            </div>
            {/* Prison checkbox hidden - use "Nouvelle zone prison" button for prison zones */}
            {form.type === 'with_etages' && (
              <div>
                <Label>Étages</Label>
                <div className="space-y-3">
                  {Object.entries(groupEtagesByMain(form.etages as EtageWithStock[])).map(([mainName, detailedEtages]) => (
                    <div key={mainName} className="border rounded-lg p-3 bg-gray-50">
                      {/* Main Etage Header */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleEtageExpansion(mainName)}
                            className="p-1 h-6 w-6"
                          >
                            {expandedEtages.has(mainName) ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </Button>
                          <span className="font-medium text-sm capitalize">{mainName}</span>
                          <span className="text-xs text-muted-foreground">
                            ({detailedEtages.length} détail{detailedEtages.length > 1 ? 's' : ''})
                          </span>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => addDetailedEtage(mainName)}
                          className="text-xs px-2 py-1 h-6"
                        >
                          + Détail
                        </Button>
                      </div>

                      {/* Detailed Etages (shown when expanded) */}
                      {expandedEtages.has(mainName) && (
                        <div className="space-y-2 ml-6">
                          <div className="flex gap-2 mb-1 text-xs font-semibold text-muted-foreground">
                            <div style={{ flex: 1, minWidth: 0 }}>Nom détaillé</div>
                            <div style={{ width: 96, minWidth: 96, textAlign: 'center' }}>Places</div>
                            <div style={{ width: 32, minWidth: 32, textAlign: 'center' }}></div>
                          </div>
                          {detailedEtages.map((et, detailIndex) => {
                            const globalIndex = form.etages.findIndex(e => e.name === et.name);
                            return (
                              <div key={et.name} className="flex gap-2 items-center">
                                <Input
                                  value={et.name}
                                  onChange={e => handleEtageChange(globalIndex, 'name', e.target.value)}
                                  style={{ flex: 1, minWidth: 0 }}
                                  placeholder={`${mainName}-A`}
                                />
                                <Input
                                  type="number"
                                  min={1}
                                  placeholder="Places"
                                  value={et.places}
                                  onChange={e => handleEtageChange(globalIndex, 'places', e.target.value)}
                                  style={{ width: 96, minWidth: 96, textAlign: 'center' }}
                                  required
                                />
                                <Button
                                  type="button"
                                  variant="destructive"
                                  size="icon"
                                  onClick={() => removeEtage(globalIndex)}
                                  disabled={form.etages.length === 1}
                                  style={{ width: 32, minWidth: 32 }}
                                >
                                  -
                                </Button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <Button type="button" variant="outline" onClick={addMainEtage} className="mt-3">
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter un étage principal
                </Button>
              </div>
            )}
             {form.type === 'with_parts' && (
              <div>
                <Label>Parties</Label>
                <div className="flex gap-2 mb-1 text-xs font-semibold text-muted-foreground">
                  <div style={{ flex: 1, minWidth: 0 }}>Nom de la partie</div>
                  <div style={{ width: 128, minWidth: 128, textAlign: 'center' }}>Capacité max</div>
                  <div style={{ width: 32, minWidth: 32, textAlign: 'center' }}></div>
                </div>
                {form.parts.map((pt, i) => (
                  <div key={i} className="flex gap-2 items-center mb-2">
                    <Input
                      value={pt.name}
                      readOnly
                      style={{ flex: 1, minWidth: 0, background: '#f3f4f6' }}
                    />
                    <Input
                      type="number"
                      min={1}
                      placeholder="Capacité max"
                      value={pt.maxCapacity}
                      onChange={e => handlePartChange(i, 'maxCapacity', e.target.value)}
                      style={{ width: 128, minWidth: 128, textAlign: 'center' }}
                      required
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      onClick={() => removePart(i)}
                      disabled={form.parts.length === 1}
                      style={{ width: 32, minWidth: 32 }}
                    >
                      -
                    </Button>
                  </div>
                ))}
                <Button type="button" variant="outline" onClick={addPart}>Ajouter une partie</Button>
              </div>
            )}
            <DialogFooter>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? 'Enregistrement...' : (editIndex !== null ? "Enregistrer" : "Ajouter")}
              </Button>
              <DialogClose asChild>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={isSaving}>
                  Annuler
                </Button>
              </DialogClose>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Prison Dialog */}
      <Dialog open={prisonDialogOpen} onOpenChange={setPrisonDialogOpen}>
        <DialogContent className="max-w-2xl w-full custom-scrollbar" style={{ maxHeight: '80vh', overflowY: 'auto' }}>
          <DialogHeader>
            <DialogTitle>{editIndex !== null ? "Modifier la zone prison" : "Ajouter une zone prison"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <Label htmlFor="prison-type">Type de zone</Label>
              <select id="prison-type" name="type" value={form.type} onChange={handleTypeChange} className="w-full border rounded px-2 py-1">
                <option value="with_etages">Avec étages</option>
                <option value="with_parts">Divisée en parties</option>
              </select>
            </div>
            <div>
              <Label htmlFor="prison-name">Nom</Label>
              <Input id="prison-name" name="name" value={form.name} onChange={handleChange} required />
            </div>
            <div>
              <Label htmlFor="prison-description">Description</Label>
              <Input id="prison-description" name="description" value={form.description} onChange={handleChange} />
            </div>
            {/* Prison checkbox is hidden but functionality is maintained through form.is_prison */}
            {form.type === 'with_etages' && (
              <div>
                <Label>Étages</Label>
                <div className="space-y-3">
                  {Object.entries(groupEtagesByMain(form.etages as EtageWithStock[])).map(([mainName, detailedEtages]) => (
                    <div key={mainName} className="border rounded-lg p-3 bg-gray-50">
                      {/* Main Etage Header */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleEtageExpansion(mainName)}
                            className="p-1 h-6 w-6"
                          >
                            {expandedEtages.has(mainName) ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </Button>
                          <span className="font-medium text-sm capitalize">{mainName}</span>
                          <span className="text-xs text-muted-foreground">
                            ({detailedEtages.length} détail{detailedEtages.length > 1 ? 's' : ''})
                          </span>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => addDetailedEtage(mainName)}
                          className="text-xs px-2 py-1 h-6"
                        >
                          + Détail
                        </Button>
                      </div>

                      {/* Detailed Etages (shown when expanded) */}
                      {expandedEtages.has(mainName) && (
                        <div className="space-y-2 ml-6">
                          <div className="flex gap-2 mb-1 text-xs font-semibold text-muted-foreground">
                            <div style={{ flex: 1, minWidth: 0 }}>Nom détaillé</div>
                            <div style={{ width: 96, minWidth: 96, textAlign: 'center' }}>Places</div>
                            <div style={{ width: 32, minWidth: 32, textAlign: 'center' }}></div>
                          </div>
                          {detailedEtages.map((et, detailIndex) => {
                            const globalIndex = form.etages.findIndex(e => e.name === et.name);
                            return (
                              <div key={et.name} className="flex gap-2 items-center">
                                <Input
                                  value={et.name}
                                  onChange={e => handleEtageChange(globalIndex, 'name', e.target.value)}
                                  style={{ flex: 1, minWidth: 0 }}
                                  placeholder={`${mainName}-A`}
                                />
                                <Input
                                  type="number"
                                  min={1}
                                  placeholder="Places"
                                  value={et.places}
                                  onChange={e => handleEtageChange(globalIndex, 'places', e.target.value)}
                                  style={{ width: 96, minWidth: 96, textAlign: 'center' }}
                                  required
                                />
                                <Button
                                  type="button"
                                  variant="destructive"
                                  size="icon"
                                  onClick={() => removeEtage(globalIndex)}
                                  disabled={form.etages.length === 1}
                                  style={{ width: 32, minWidth: 32 }}
                                >
                                  -
                                </Button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <Button type="button" variant="outline" onClick={addMainEtage} className="mt-3">
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter un étage principal
                </Button>
              </div>
            )}
             {form.type === 'with_parts' && (
              <div>
                <Label>Parties</Label>
                <div className="flex gap-2 mb-1 text-xs font-semibold text-muted-foreground">
                  <div style={{ flex: 1, minWidth: 0 }}>Nom de la partie</div>
                  <div style={{ width: 128, minWidth: 128, textAlign: 'center' }}>Capacité max</div>
                  <div style={{ width: 32, minWidth: 32, textAlign: 'center' }}></div>
                </div>
                {form.parts.map((pt, i) => (
                  <div key={i} className="flex gap-2 items-center mb-2">
                    <Input
                      value={pt.name}
                      readOnly
                      style={{ flex: 1, minWidth: 0, background: '#f3f4f6' }}
                    />
                    <Input
                      type="number"
                      min={1}
                      placeholder="Capacité max"
                      value={pt.maxCapacity}
                      onChange={e => handlePartChange(i, 'maxCapacity', e.target.value)}
                      style={{ width: 128, minWidth: 128, textAlign: 'center' }}
                      required
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      onClick={() => removePart(i)}
                      disabled={form.parts.length === 1}
                      style={{ width: 32, minWidth: 32 }}
                    >
                      -
                    </Button>
                  </div>
                ))}
                <Button type="button" variant="outline" onClick={addPart}>Ajouter une partie</Button>
              </div>
            )}
            <DialogFooter>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? 'Enregistrement...' : (editIndex !== null ? "Enregistrer" : "Ajouter")}
              </Button>
              <DialogClose asChild>
                <Button type="button" variant="outline" onClick={() => setPrisonDialogOpen(false)} disabled={isSaving}>
                  Annuler
                </Button>
              </DialogClose>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <style>{`
.custom-scrollbar::-webkit-scrollbar {
  width: 8px;
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(100, 100, 100, 0.25);
  border-radius: 4px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(100, 100, 100, 0.4);
}
.custom-scrollbar {
  scrollbar-width: thin;
  scrollbar-color: rgba(100,100,100,0.25) transparent;
}
`}</style>
    </Layout>
  );
};

export default Locations; 