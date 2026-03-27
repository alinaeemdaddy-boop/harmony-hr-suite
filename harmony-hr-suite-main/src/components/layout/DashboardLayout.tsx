import { ReactNode, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AppSidebar } from './AppSidebar';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { NotificationCenter } from '@/components/workflow/NotificationCenter';
import { AIAssistant } from '@/components/workflow/AIAssistant';

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, loading, role } = useAuth();
  const navigate = useNavigate();

  // No auth redirect - app works without login

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Skeleton className="w-12 h-12 rounded-full" />
          <Skeleton className="w-32 h-4" />
        </div>
      </div>
    );
  }

  const displayUser = user || { id: '', username: 'Admin', full_name: 'Admin', role: 'super_admin' as const };

  const getInitials = (email: string) => {
    return email.substring(0, 2).toUpperCase();
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />

        <div className="flex-1 flex flex-col">
          {/* Top Header */}
          <header className="h-16 border-b border-border/50 bg-card/50 backdrop-blur-sm flex items-center justify-between px-4 lg:px-6">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="text-muted-foreground hover:text-foreground" />

              <div className="hidden md:flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2">
                <Search className="w-4 h-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search employees, reports..."
                  className="border-0 bg-transparent h-auto p-0 focus-visible:ring-0 w-64"
                />
              </div>
            </div>

            <div className="flex items-center gap-4">
              <NotificationCenter />

              <div className="flex items-center gap-3">
                <div className="hidden sm:block text-right">
                  <p className="text-sm font-medium text-foreground">
                    {displayUser.full_name || displayUser.username}
                  </p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {role?.replace('_', ' ') || 'Employee'}
                  </p>
                </div>
                <Avatar className="w-9 h-9 border-2 border-primary/20">
                  <AvatarImage src="" /> {/* Avatar URL not yet supported in simple auth */}
                  <AvatarFallback className="bg-primary/10 text-primary text-sm">
                    {getInitials(displayUser.full_name || displayUser.username || 'U')}
                  </AvatarFallback>
                </Avatar>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 p-4 lg:p-6 overflow-auto">
            {children}
          </main>
          <AIAssistant />
        </div>
      </div>
    </SidebarProvider>
  );
}