import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  MapPin, 
  Clock, 
  LogIn, 
  LogOut, 
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Navigation
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface AttendanceCheckInProps {
  employeeId: string | null;
}

interface Geofence {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radius_meters: number;
  address: string | null;
  is_default: boolean;
}

interface TodayAttendance {
  id: string;
  check_in: string | null;
  check_out: string | null;
  status: string | null;
  is_within_geofence: boolean | null;
  geofence_id: string | null;
}

interface LocationState {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: Date;
}

export function AttendanceCheckIn({ employeeId }: AttendanceCheckInProps) {
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [geofences, setGeofences] = useState<Geofence[]>([]);
  const [location, setLocation] = useState<LocationState | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [todayAttendance, setTodayAttendance] = useState<TodayAttendance | null>(null);
  const [nearestGeofence, setNearestGeofence] = useState<Geofence | null>(null);
  const [isWithinGeofence, setIsWithinGeofence] = useState(false);
  const [distanceToGeofence, setDistanceToGeofence] = useState<number | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetchGeofences();
  }, []);

  useEffect(() => {
    if (employeeId) {
      fetchTodayAttendance();
    }
  }, [employeeId]);

  useEffect(() => {
    if (location && geofences.length > 0) {
      checkGeofenceStatus();
    }
  }, [location, geofences]);

  const fetchGeofences = async () => {
    const { data } = await supabase
      .from('geofences')
      .select('*')
      .eq('is_active', true);
    if (data) setGeofences(data);
  };

  const fetchTodayAttendance = async () => {
    if (!employeeId) return;
    
    const today = format(new Date(), 'yyyy-MM-dd');
    const { data } = await supabase
      .from('attendance')
      .select('*')
      .eq('employee_id', employeeId)
      .eq('date', today)
      .maybeSingle();
    
    setTodayAttendance(data);
  };

  // Calculate distance between two points using Haversine formula
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  };

  const checkGeofenceStatus = () => {
    if (!location || geofences.length === 0) return;

    let nearest: Geofence | null = null;
    let minDistance = Infinity;

    for (const geofence of geofences) {
      const distance = calculateDistance(
        location.latitude,
        location.longitude,
        Number(geofence.latitude),
        Number(geofence.longitude)
      );

      if (distance < minDistance) {
        minDistance = distance;
        nearest = geofence;
      }
    }

    setNearestGeofence(nearest);
    setDistanceToGeofence(Math.round(minDistance));
    setIsWithinGeofence(nearest ? minDistance <= nearest.radius_meters : false);
  };

  const [watchId, setWatchId] = useState<number | null>(null);

  const getCurrentLocation = useCallback(() => {
    setLocationLoading(true);
    setLocationError(null);

    if (!navigator.geolocation) {
      setLocationError('Geolocation not supported. Use HTTPS or modern browser.');
      setLocationLoading(false);
      return;
    }

    // Clear existing watch
    if (watchId) {
      navigator.geolocation.clearWatch(watchId);
    }

    const id = navigator.geolocation.watchPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: new Date(position.timestamp),
        });
        setLocationLoading(false);
        setLocationError(null);
      },
      (error) => {
        console.warn('Location error:', error);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setLocationError('Location access denied. Enable in browser settings/site permissions.');
            break;
          case error.POSITION_UNAVAILABLE:
            setLocationError('Location unavailable (poor GPS signal)');
            break;
          case error.TIMEOUT:
            setLocationError('Location timeout - retrying...');
            break;
          default:
            setLocationError('Location error - check browser permissions');
        }
        setLocationLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 30000, // 30s cache ok
      }
    );

    setWatchId(id);
  }, [watchId]);

  useEffect(() => {
    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId);
    };
  }, [watchId]);

// Auto get location on mount
  useEffect(() => {
    getCurrentLocation();
  }, []);

  const handleCheckIn = async () => {
    if (!employeeId || !location) {
      toast.error('Unable to check in. Please ensure location is enabled.');
      return;
    }

    if (!isWithinGeofence && geofences.length > 0) {
      toast.error('You are outside the designated work area. Please move closer to check in.');
      return;
    }

    setLoading(true);
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      const now = new Date().toISOString();
      
      // Determine status based on time
      const checkInHour = new Date().getHours();
      const checkInMinutes = new Date().getMinutes();
      const status = checkInHour > 9 || (checkInHour === 9 && checkInMinutes > 15) ? 'late' : 'present';

      const { error } = await supabase
        .from('attendance')
        .insert({
          employee_id: employeeId,
          date: today,
          check_in: now,
          check_in_location: `${location.latitude},${location.longitude}`,
          check_in_latitude: location.latitude,
          check_in_longitude: location.longitude,
          check_in_accuracy: location.accuracy,
          geofence_id: nearestGeofence?.id,
          is_within_geofence: isWithinGeofence,
          status,
          device_info: navigator.userAgent,
        });

      if (error) throw error;
      
      toast.success(`Checked in successfully at ${format(new Date(), 'hh:mm a')}`);
      fetchTodayAttendance();
    } catch (error: any) {
      // Silent log for prod
      if (process.env.NODE_ENV === 'development') console.error('Check-in error:', error);
      toast.error(error.message || 'Check-in failed - check network/permissions');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckOut = async () => {
    if (!employeeId || !location || !todayAttendance) {
      toast.error('Unable to check out');
      return;
    }

    setLoading(true);
    try {
      const now = new Date().toISOString();
      
      // Calculate work hours
      const checkInTime = new Date(todayAttendance.check_in!);
      const checkOutTime = new Date();
      const workHours = (checkOutTime.getTime() - checkInTime.getTime()) / (1000 * 60 * 60);

      const { error } = await supabase
        .from('attendance')
        .update({
          check_out: now,
          check_out_location: `${location.latitude},${location.longitude}`,
          check_out_latitude: location.latitude,
          check_out_longitude: location.longitude,
          check_out_accuracy: location.accuracy,
          work_hours: Math.round(workHours * 100) / 100,
        })
        .eq('id', todayAttendance.id);

      if (error) throw error;
      
      toast.success(`Checked out successfully at ${format(new Date(), 'hh:mm a')}`);
      fetchTodayAttendance();
    } catch (error) {
      console.error('Check-out error:', error);
      toast.error('Failed to check out');
    } finally {
      setLoading(false);
    }
  };

  const hasCheckedIn = todayAttendance?.check_in;
  const hasCheckedOut = todayAttendance?.check_out;

  return (
    <div className="space-y-6">
      {/* Current Time Display */}
      <Card className="glass-card">
        <CardContent className="pt-6">
          <div className="text-center">
            <div className="text-5xl font-bold font-display gradient-text">
              {format(currentTime, 'hh:mm:ss a')}
            </div>
            <div className="text-muted-foreground mt-2">
              {format(currentTime, 'EEEE, MMMM d, yyyy')}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 xs:gap-4 sm:gap-6 md:grid-cols-2 w-full">
        {/* Location Status Card */}
        <Card className="glass-card w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg xs:text-base">
              <Navigation className="w-5 h-5 text-primary" />
              Location Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {locationLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <RefreshCw className="w-4 h-4 animate-spin" />
                Getting your location...
              </div>
            ) : locationError ? (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{locationError}</AlertDescription>
              </Alert>
            ) : location ? (
              <>
                <div className="space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-0">
                    <span className="text-sm text-muted-foreground">Coordinates</span>
                    <span className="text-sm font-mono">
                      {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                    </span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-0">
                    <span className="text-sm text-muted-foreground">Accuracy</span>
                    <span className="text-sm">{Math.round(location.accuracy)}m</span>
                  </div>
                  {nearestGeofence && (
                    <>
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-0">
                        <span className="text-sm text-muted-foreground">Nearest Office</span>
                        <span className="text-sm">{nearestGeofence.name}</span>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-0">
                        <span className="text-sm text-muted-foreground">Distance</span>
                        <span className="text-sm">
                          {distanceToGeofence !== null ? `${distanceToGeofence}m` : 'N/A'}
                        </span>
                      </div>
                    </>
                  )}
                </div>
                
                <div className="pt-2">
                  {isWithinGeofence ? (
                    <Badge variant="default" className="w-full justify-center py-2 bg-emerald-600 block sm:inline-block">
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Within Work Area
                    </Badge>
                  ) : geofences.length > 0 ? (
                    <Badge variant="destructive" className="w-full justify-center py-2 block sm:inline-block">
                      <XCircle className="w-4 h-4 mr-2" />
                      Outside Work Area ({distanceToGeofence}m away)
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="w-full justify-center py-2 block sm:inline-block">
                      No geofences configured
                    </Badge>
                  )}
                </div>
              </>
            ) : null}

            <Button 
              variant="outline" 
              className="w-full" 
              onClick={getCurrentLocation}
              disabled={locationLoading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${locationLoading ? 'animate-spin' : ''}`} />
              Refresh Location
            </Button>
          </CardContent>
        </Card>

        {/* Check In/Out Card */}
        <Card className="glass-card w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg xs:text-base">
              <Clock className="w-5 h-5 text-primary" />
              Today's Attendance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!employeeId ? (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  No employee profile linked to your account
                </AlertDescription>
              </Alert>
            ) : (
              <>
                <div className="space-y-3">
                  <div className="flex flex-col xs:flex-row xs:items-center xs:justify-between p-3 bg-muted/30 rounded-lg gap-2 xs:gap-0">
                    <div className="flex items-center gap-2">
                      <LogIn className="w-4 h-4 text-emerald-500" />
                      <span>Check In</span>
                    </div>
                    <span className="font-medium text-base xs:text-sm">
                      {hasCheckedIn 
                        ? format(new Date(todayAttendance!.check_in!), 'hh:mm a')
                        : '--:--'}
                    </span>
                  </div>
                  
                  <div className="flex flex-col xs:flex-row xs:items-center xs:justify-between p-3 bg-muted/30 rounded-lg gap-2 xs:gap-0">
                    <div className="flex items-center gap-2">
                      <LogOut className="w-4 h-4 text-red-500" />
                      <span>Check Out</span>
                    </div>
                    <span className="font-medium text-base xs:text-sm">
                      {hasCheckedOut 
                        ? format(new Date(todayAttendance!.check_out!), 'hh:mm a')
                        : '--:--'}
                    </span>
                  </div>

                  {todayAttendance?.status && (
                    <div className="flex flex-col xs:flex-row xs:items-center xs:justify-between p-3 bg-muted/30 rounded-lg gap-2 xs:gap-0">
                      <span className="text-sm">Status</span>
                      <Badge variant={todayAttendance.status === 'late' ? 'destructive' : 'default'} className="self-end xs:self-auto">
                        {todayAttendance.status}
                      </Badge>
                    </div>
                  )}
                </div>

                <div className="pt-2 space-y-2">
                  {!hasCheckedIn ? (
                    <Button 
                      className="w-full" 
                      size="lg"
                      onClick={handleCheckIn}
                      disabled={loading || !location || (!isWithinGeofence && geofences.length > 0)}
                    >
                      {loading ? (
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <LogIn className="w-4 h-4 mr-2" />
                      )}
                      Check In
                    </Button>
                  ) : !hasCheckedOut ? (
                    <Button 
                      className="w-full" 
                      size="lg"
                      variant="destructive"
                      onClick={handleCheckOut}
                      disabled={loading || !location}
                    >
                      {loading ? (
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <LogOut className="w-4 h-4 mr-2" />
                      )}
                      Check Out
                    </Button>
                  ) : (
                    <Alert>
                      <CheckCircle className="h-4 w-4" />
                      <AlertDescription>
                        You have completed your attendance for today
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Geofences List */}
      {geofences.length > 0 && (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary" />
              Office Locations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {geofences.map((geofence) => (
                <div 
                  key={geofence.id} 
                  className={`p-4 rounded-lg border ${
                    nearestGeofence?.id === geofence.id && isWithinGeofence
                      ? 'border-emerald-500 bg-emerald-500/10'
                      : 'border-border bg-muted/30'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-medium">{geofence.name}</h4>
                      {geofence.address && (
                        <p className="text-sm text-muted-foreground mt-1">{geofence.address}</p>
                      )}
                    </div>
                    {geofence.is_default && (
                      <Badge variant="secondary" className="text-xs">Default</Badge>
                    )}
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    Radius: {geofence.radius_meters}m
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
