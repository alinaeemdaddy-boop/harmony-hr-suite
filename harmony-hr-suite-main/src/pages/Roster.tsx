import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { CalendarClock, Settings, Users, ArrowLeftRight } from 'lucide-react';
import { RosterCalendar } from '@/components/roster/RosterCalendar';
import { ShiftManager } from '@/components/roster/ShiftManager';
import { SwapRequests } from '@/components/roster/SwapRequests';
import { AvailabilityForm } from '@/components/roster/AvailabilityForm';
import { useAuth } from '@/contexts/AuthContext';

export default function Roster() {
    const { role } = useAuth();
    const [activeTab, setActiveTab] = useState('calendar');

    const isAdmin = role === 'super_admin' || role === 'hr_admin' || (role as string) === 'manager';

    return (
        <DashboardLayout>
            <div className="space-y-6 animate-fade-in">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl lg:text-3xl font-display font-bold text-foreground">
                            Duty Roster
                        </h1>
                        <p className="text-muted-foreground mt-1">
                            Manage employee shifts and schedules
                        </p>
                    </div>
                </div>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                    <TabsList className="bg-muted/50 p-1 flex-wrap h-auto">
                        <TabsTrigger value="calendar" className="gap-2">
                            <CalendarClock className="w-4 h-4" />
                            Roster
                        </TabsTrigger>
                        <TabsTrigger value="availability" className="gap-2">
                            <Users className="w-4 h-4" />
                            My Availability
                        </TabsTrigger>
                        <TabsTrigger value="swaps" className="gap-2">
                            <ArrowLeftRight className="w-4 h-4" />
                            Swap Requests
                        </TabsTrigger>
                        {isAdmin && (
                            <TabsTrigger value="shifts" className="gap-2">
                                <Settings className="w-4 h-4" />
                                Shift Types
                            </TabsTrigger>
                        )}
                    </TabsList>

                    <TabsContent value="calendar" className="space-y-4">
                        <RosterCalendar isAdmin={isAdmin} />
                    </TabsContent>

                    <TabsContent value="availability" className="space-y-4">
                        <AvailabilityForm />
                    </TabsContent>

                    <TabsContent value="swaps" className="space-y-4">
                        <SwapRequests isAdmin={isAdmin} />
                    </TabsContent>

                    {isAdmin && (
                        <TabsContent value="shifts" className="space-y-4">
                            <ShiftManager />
                        </TabsContent>
                    )}
                </Tabs>
            </div>
        </DashboardLayout>
    );
}
