import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import {
  Building2,
  LayoutDashboard,
  Users,
  Building,
  Calendar,
  DollarSign,
  MapPin,
  LogOut,
  Settings,
  ChevronRight,
  Zap,
  Store,
  CalendarClock,
  UserPlus,
  UserMinus,
  ListPlus,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function AppSidebar() {
  const { signOut, role, checkPermission } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const isActive = (path: string) => location.pathname === path;

  // Define navigation items with permission checks
  const getNavItems = () => {
    const items = [
      { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard, visible: true },
      { title: 'Employees', url: '/employees', icon: Users, visible: checkPermission('view_employees') },
      { title: 'Departments', url: '/departments', icon: Building, visible: checkPermission('view_employees') },
      { title: 'Branches', url: '/branches', icon: Store, visible: checkPermission('view_employees') },
      { title: 'Attendance', url: '/attendance', icon: MapPin, visible: true }, // Everyone needs attendance
      { title: 'Roster', url: '/roster', icon: CalendarClock, visible: true }, // Everyone views roster
      { title: 'Leave', url: '/leave', icon: Calendar, visible: true }, // Everyone requests leave
      { title: 'Tasks', url: '/tasks', icon: ListPlus, visible: true }, // Everyone views/updates tasks
      { title: 'Payroll', url: '/payroll', icon: DollarSign, visible: true }, // Admin manages, Employee views payslip (handled in page)
      { title: 'Workflow', url: '/workflow', icon: Zap, visible: role === 'super_admin' },
      { title: 'Onboarding', url: '/onboarding', icon: UserPlus, visible: checkPermission('manage_onboarding') },
      { title: 'Offboarding', url: '/offboarding', icon: UserMinus, visible: checkPermission('manage_offboarding') },
    ];
    return items.filter(item => item.visible);
  };

  const mainNavItems = getNavItems();

  const settingsNavItems = [
    { title: 'Settings', url: '/settings', icon: Settings },
  ];

  return (
    <Sidebar
      className={cn(
        'border-r border-sidebar-border bg-sidebar transition-all duration-300',
        collapsed ? 'w-16' : 'w-64'
      )}
      collapsible="icon"
    >
      {/* Logo */}
      <div className="h-20 flex items-center gap-3 px-4 border-b border-sidebar-border">
        <div className="flex items-center justify-center w-12 h-12 flex-shrink-0">
          <img
            src="/sl-logo.png"
            alt="SL Aesthetics Clinic"
            className="w-full h-full object-contain"
          />
        </div>
        {!collapsed && (
          <div className="flex flex-col">
            <span className="font-display font-bold text-sm text-sidebar-foreground leading-tight">
              SL Aesthetics
            </span>
            <span className="text-[10px] text-muted-foreground">
              Clinic Management
            </span>
          </div>
        )}
      </div>

      <SidebarContent className="px-2 py-4">
        <SidebarGroup>
          {!collapsed && (
            <SidebarGroupLabel className="text-xs text-muted-foreground px-3 mb-2">
              Main Menu
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    onClick={() => navigate(item.url)}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200',
                      isActive(item.url)
                        ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                        : 'text-sidebar-foreground hover:bg-sidebar-accent'
                    )}
                    tooltip={collapsed ? item.title : undefined}
                  >
                    <item.icon className="w-5 h-5 flex-shrink-0" />
                    {!collapsed && (
                      <>
                        <span className="flex-1">{item.title}</span>
                        {isActive(item.url) && (
                          <ChevronRight className="w-4 h-4 opacity-70" />
                        )}
                      </>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-6">
          {!collapsed && (
            <SidebarGroupLabel className="text-xs text-muted-foreground px-3 mb-2">
              Settings
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu>
              {settingsNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    onClick={() => navigate(item.url)}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200',
                      isActive(item.url)
                        ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                        : 'text-sidebar-foreground hover:bg-sidebar-accent'
                    )}
                    tooltip={collapsed ? item.title : undefined}
                  >
                    <item.icon className="w-5 h-5 flex-shrink-0" />
                    {!collapsed && <span>{item.title}</span>}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-2 border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={handleSignOut}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sidebar-foreground hover:bg-destructive/10 hover:text-destructive transition-all duration-200"
              tooltip={collapsed ? 'Sign Out' : undefined}
            >
              <LogOut className="w-5 h-5 flex-shrink-0" />
              {!collapsed && <span>Sign Out</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}