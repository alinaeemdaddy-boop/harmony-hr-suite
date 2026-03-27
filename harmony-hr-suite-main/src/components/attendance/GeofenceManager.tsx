import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  MapPin, 
  Plus, 
  Edit, 
  Trash2, 
  Navigation,
  Check
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface Geofence {
  id: string;
  name: string;
  description: string | null;
  latitude: number;
  longitude: number;
  radius_meters: number;
  address: string | null;
  is_active: boolean;
  is_default: boolean;
  created_at: string;
}

export function GeofenceManager() {
  const [geofences, setGeofences] = useState<Geofence[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGeofence, setEditingGeofence] = useState<Geofence | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    latitude: '',
    longitude: '',
    radius_meters: '100',
    address: '',
    is_active: true,
    is_default: false,
  });

  useEffect(() => {
    fetchGeofences();
  }, []);

  const fetchGeofences = async () => {
    const { data, error } = await supabase
      .from('geofences')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      toast.error('Failed to fetch geofences');
    } else {
      setGeofences(data || []);
    }
    setLoading(false);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      latitude: '',
      longitude: '',
      radius_meters: '100',
      address: '',
      is_active: true,
      is_default: false,
    });
    setEditingGeofence(null);
  };

  const handleEdit = (geofence: Geofence) => {
    setEditingGeofence(geofence);
    setFormData({
      name: geofence.name,
      description: geofence.description || '',
      latitude: String(geofence.latitude),
      longitude: String(geofence.longitude),
      radius_meters: String(geofence.radius_meters),
      address: geofence.address || '',
      is_active: geofence.is_active,
      is_default: geofence.is_default,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const payload = {
      name: formData.name,
      description: formData.description || null,
      latitude: parseFloat(formData.latitude),
      longitude: parseFloat(formData.longitude),
      radius_meters: parseInt(formData.radius_meters),
      address: formData.address || null,
      is_active: formData.is_active,
      is_default: formData.is_default,
    };

    try {
      // If setting as default, unset other defaults first
      if (payload.is_default) {
        await supabase
          .from('geofences')
          .update({ is_default: false })
          .neq('id', editingGeofence?.id || '');
      }

      if (editingGeofence) {
        const { error } = await supabase
          .from('geofences')
          .update(payload)
          .eq('id', editingGeofence.id);
        
        if (error) throw error;
        toast.success('Geofence updated successfully');
      } else {
        const { error } = await supabase
          .from('geofences')
          .insert(payload);
        
        if (error) throw error;
        toast.success('Geofence created successfully');
      }

      setDialogOpen(false);
      resetForm();
      fetchGeofences();
    } catch (error) {
      console.error('Error saving geofence:', error);
      toast.error('Failed to save geofence');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this geofence?')) return;
    
    const { error } = await supabase
      .from('geofences')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Failed to delete geofence');
    } else {
      toast.success('Geofence deleted');
      fetchGeofences();
    }
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    const { error } = await supabase
      .from('geofences')
      .update({ is_active: !isActive })
      .eq('id', id);

    if (error) {
      toast.error('Failed to update geofence');
    } else {
      fetchGeofences();
    }
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFormData(prev => ({
          ...prev,
          latitude: position.coords.latitude.toFixed(6),
          longitude: position.coords.longitude.toFixed(6),
        }));
        toast.success('Location captured');
      },
      (error) => {
        toast.error('Failed to get current location');
      }
    );
  };

  return (
    <div className="space-y-6">
      <Card className="glass-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary" />
            Geofence Locations
          </CardTitle>
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Location
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {editingGeofence ? 'Edit Geofence' : 'Add New Geofence'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Location Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Main Office"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Brief description of this location"
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="latitude">Latitude *</Label>
                    <Input
                      id="latitude"
                      type="number"
                      step="any"
                      value={formData.latitude}
                      onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                      placeholder="24.8607"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="longitude">Longitude *</Label>
                    <Input
                      id="longitude"
                      type="number"
                      step="any"
                      value={formData.longitude}
                      onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                      placeholder="67.0011"
                      required
                    />
                  </div>
                </div>

                <Button type="button" variant="outline" onClick={getCurrentLocation} className="w-full">
                  <Navigation className="w-4 h-4 mr-2" />
                  Use Current Location
                </Button>

                <div className="space-y-2">
                  <Label htmlFor="radius">Radius (meters) *</Label>
                  <Input
                    id="radius"
                    type="number"
                    min="50"
                    max="5000"
                    value={formData.radius_meters}
                    onChange={(e) => setFormData({ ...formData, radius_meters: e.target.value })}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Recommended: 100-500 meters for offices
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Full address"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="is_active">Active</Label>
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="is_default">Set as Default</Label>
                  <Switch
                    id="is_default"
                    checked={formData.is_default}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_default: checked })}
                  />
                </div>

                <div className="flex gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} className="flex-1">
                    Cancel
                  </Button>
                  <Button type="submit" className="flex-1">
                    {editingGeofence ? 'Update' : 'Create'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : geofences.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No geofences configured. Add your first office location.
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Location</TableHead>
                    <TableHead>Coordinates</TableHead>
                    <TableHead>Radius</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {geofences.map((geofence) => (
                    <TableRow key={geofence.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-primary" />
                          <div>
                            <div className="font-medium">{geofence.name}</div>
                            {geofence.address && (
                              <div className="text-xs text-muted-foreground">{geofence.address}</div>
                            )}
                          </div>
                          {geofence.is_default && (
                            <Badge variant="secondary" className="text-xs">
                              <Check className="w-3 h-3 mr-1" />
                              Default
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {Number(geofence.latitude).toFixed(4)}, {Number(geofence.longitude).toFixed(4)}
                        </code>
                      </TableCell>
                      <TableCell>{geofence.radius_meters}m</TableCell>
                      <TableCell>
                        <Switch
                          checked={geofence.is_active}
                          onCheckedChange={() => handleToggleActive(geofence.id, geofence.is_active)}
                        />
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(geofence.created_at), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(geofence)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleDelete(geofence.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Help Card */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-base">Geofencing Guide</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p><strong>Radius:</strong> Set smaller radius (100-200m) for precise office locations, larger (500-1000m) for campuses.</p>
          <p><strong>Default Location:</strong> The default geofence is used when employees don't have a specific assignment.</p>
          <p><strong>Multiple Locations:</strong> Create multiple geofences for different office branches or work sites.</p>
        </CardContent>
      </Card>
    </div>
  );
}
