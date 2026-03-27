import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  MapPin, 
  Clock, 
  History, 
  Settings,
  BarChart3,
  FileEdit
} from 'lucide-react';
import { AttendanceCheckIn } from '@/components/attendance/AttendanceCheckIn';
import { AttendanceHistory } from '@/components/attendance/AttendanceHistory';
import { GeofenceManager } from '@/components/attendance/GeofenceManager';
import { AttendanceDashboard } from '@/components/attendance/AttendanceDashboard';
import { AttendanceCorrections } from '@/components/attendance/AttendanceCorrections';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export default function Attendance() {
  const { user, role } = useAuth();
  const [employeeId, setEmployeeId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('checkin');

  const isAdmin = role === 'super_admin' || role === 'hr_admin';

  useEffect(() => {
    if (user) {
      fetchEmployeeId();
    }
  }, [user]);

  const fetchEmployeeId = async () => {
    const { data } = await supabase
      .from('employees')
      .select('id')
      .eq('user_id', user?.id)
      .maybeSingle();
    if (data) setEmployeeId(data.id);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold font-display gradient-text">
            Attendance Management
          </h1>
          <p className="text-muted-foreground mt-1">
            GPS-based attendance tracking with geofencing
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:w-auto lg:inline-grid gap-1 bg-muted/50 p-1">
            <TabsTrigger value="checkin" className="gap-2">
              <MapPin className="w-4 h-4" />
              <span className="hidden xs:inline">Check In/Out</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <History className="w-4 h-4" />
              <span className="hidden xs:inline">History</span>
            </TabsTrigger>
            <TabsTrigger value="corrections" className="gap-2">
              <FileEdit className="w-4 h-4" />
              <span className="hidden xs:inline">Corrections</span>
            </TabsTrigger>
            {isAdmin && (
              <>
                <TabsTrigger value="dashboard" className="gap-2">
                  <BarChart3 className="w-4 h-4" />
                  <span className="hidden xs:inline">Dashboard</span>
                </TabsTrigger>
                <TabsTrigger value="geofences" className="gap-2">
                  <Settings className="w-4 h-4" />
                  <span className="hidden xs:inline">Geofences</span>
                </TabsTrigger>
              </>
            )}
          </TabsList>

          <TabsContent value="checkin">
            <AttendanceCheckIn employeeId={employeeId} />
          </TabsContent>

          <TabsContent value="history">
            <AttendanceHistory employeeId={employeeId} showAllEmployees={isAdmin} />
          </TabsContent>

          <TabsContent value="corrections">
            <AttendanceCorrections employeeId={employeeId} isAdmin={isAdmin} />
          </TabsContent>

          {isAdmin && (
            <>
              <TabsContent value="dashboard">
                <AttendanceDashboard />
              </TabsContent>
              <TabsContent value="geofences">
                <GeofenceManager />
              </TabsContent>
            </>
          )}
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
