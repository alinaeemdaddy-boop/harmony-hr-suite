import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { User, Lock, Loader2, Shield, Users, Package } from 'lucide-react';
import { UserManagement } from '@/components/settings/UserManagement';
import { RolePermissionsMatrix } from '@/components/settings/RolePermissionsMatrix';
import { ModulesConfig } from '@/components/settings/ModulesConfig'; // Import new component
import { hashPassword } from '@/lib/auth';

export default function Settings() {
  const { user, role } = useAuth();
  const { toast } = useToast();

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);

  const isAdmin = role === 'super_admin';
  const isHR = role === 'hr_admin';

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({
        title: 'Error',
        description: 'New passwords do not match',
        variant: 'destructive',
      });
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast({
        title: 'Error',
        description: 'Password must be at least 6 characters',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      if (!user?.id) throw new Error('User not identified');

      const hashedPassword = await hashPassword(passwordData.newPassword);

      const { error } = await (supabase as any)
        .from('app_users')
        .update({ password_hash: hashedPassword })
        .eq('id', user.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Password updated successfully',
      });

      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update password',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
        {/* Header */}
        <div>
          <h1 className="text-2xl lg:text-3xl font-display font-bold text-foreground">
            Settings
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your account and system access
          </p>
        </div>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="bg-white/50 backdrop-blur-sm">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            {(isAdmin || isHR) && <TabsTrigger value="modules">Modules</TabsTrigger>}
            {isAdmin && <TabsTrigger value="users">User Management</TabsTrigger>}
            {isAdmin && <TabsTrigger value="permissions">Permissions</TabsTrigger>}
          </TabsList>

          <TabsContent value="profile" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Profile Info */}
              <Card className="glass-card border-0">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <User className="w-5 h-5 text-primary" />
                    Profile Information
                  </CardTitle>
                  <CardDescription>Your account details</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Username</Label>
                    <Input
                      value={user?.username || ''}
                      disabled
                      className="input-glass opacity-70"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Full Name</Label>
                    <Input
                      value={user?.full_name || ''}
                      disabled
                      className="input-glass opacity-70"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Role</Label>
                    <div className="px-3 py-2 rounded-md border border-input bg-muted/50 text-sm capitalize">
                      {role?.replace('_', ' ')}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Change Password */}
              <Card className="glass-card border-0">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Lock className="w-5 h-5 text-primary" />
                    Change Password
                  </CardTitle>
                  <CardDescription>Update your secure password</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handlePasswordChange} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="newPassword">New Password</Label>
                      <Input
                        id="newPassword"
                        type="password"
                        value={passwordData.newPassword}
                        onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                        className="input-glass"
                        placeholder="••••••••"
                        required
                        minLength={6}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Confirm</Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        value={passwordData.confirmPassword}
                        onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                        className="input-glass"
                        placeholder="••••••••"
                        required
                        minLength={6}
                      />
                    </div>
                    <Button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Updating...
                        </>
                      ) : (
                        'Update Password'
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>

            {/* My Assigned Modules (View for Employee) */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-primary" />
                  My Assigned Modules
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {/* Ideally fetch real modules from context or API, currently visual placeholder if not in context */}
                  {/* Assuming AuthContext could eventually carry this, or we rely on the user to see them in sidebar */}
                  <p className="text-sm text-muted-foreground">
                    Your module access is managed by the system administrator.
                    Please check the sidebar for your available tools.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {(isAdmin || isHR) && (
            <TabsContent value="modules">
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="w-5 h-5 text-primary" />
                    System Modules
                  </CardTitle>
                  <CardDescription>Available application modules and configurations</CardDescription>
                </CardHeader>
                <CardContent>
                  <ModulesConfig />
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {isAdmin && (
            <TabsContent value="users">
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-primary" />
                    User Management
                  </CardTitle>
                  <CardDescription>Create users and assign module access</CardDescription>
                </CardHeader>
                <CardContent>
                  <UserManagement />
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {isAdmin && (
            <TabsContent value="permissions">
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-primary" />
                    Role Permissions
                  </CardTitle>
                  <CardDescription>Global role configuration matrix</CardDescription>
                </CardHeader>
                <CardContent>
                  <RolePermissionsMatrix />
                </CardContent>
              </Card>
            </TabsContent>
          )}

        </Tabs>
      </div>
    </DashboardLayout>
  );
}