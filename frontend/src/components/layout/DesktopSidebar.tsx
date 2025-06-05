import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Home,
  User,
  Briefcase,
  BookOpen,
  BarChart3,
  Settings,
  LogOut,
  Target,
  TrendingUp,
  Award,
  Calendar,
  MessageSquare,
  Bell
} from 'lucide-react';

interface NavigationItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | number;
  description?: string;
}

interface DesktopSidebarProps {
  className?: string;
  onLogout?: () => void;
}

const navigationItems: NavigationItem[] = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: Home,
    description: 'Overview and quick actions'
  },
  {
    name: 'Profile',
    href: '/dashboard/profile',
    icon: User,
    description: 'Manage your profile and settings'
  },
  {
    name: 'Skills',
    href: '/dashboard/skills',
    icon: Target,
    description: 'Track and develop your skills'
  },
  {
    name: 'Jobs',
    href: '/dashboard/jobs',
    icon: Briefcase,
    description: 'Find and apply to jobs'
  },
  {
    name: 'Learning',
    href: '/dashboard/learning',
    icon: BookOpen,
    description: 'Courses and learning paths'
  },
  {
    name: 'Analytics',
    href: '/dashboard/analytics',
    icon: BarChart3,
    description: 'Progress and insights'
  },
  {
    name: 'Assessments',
    href: '/dashboard/assessments',
    icon: Award,
    description: 'Skill assessments and tests'
  },
  {
    name: 'Calendar',
    href: '/dashboard/calendar',
    icon: Calendar,
    description: 'Schedule and events'
  },
  {
    name: 'Messages',
    href: '/dashboard/messages',
    icon: MessageSquare,
    badge: 3,
    description: 'Communications and notifications'
  },
  {
    name: 'Settings',
    href: '/dashboard/settings',
    icon: Settings,
    description: 'Account and app settings'
  }
];

export const DesktopSidebar: React.FC<DesktopSidebarProps> = ({
  className,
  onLogout
}) => {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard';
    }
    return pathname.startsWith(href);
  };

  return (
    <div className={cn(
      "flex flex-col h-full bg-white border-r border-gray-200",
      className
    )}>
      {/* Logo/Brand */}
      <div className="flex items-center px-6 py-4 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-gray-900">SkillForge</h1>
            <p className="text-xs text-gray-500">AI Career Platform</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          
          return (
            <Link key={item.name} href={item.href}>
              <Button
                variant={active ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-start h-auto p-3 text-left",
                  active && "bg-blue-50 text-blue-700 border-blue-200"
                )}
              >
                <div className="flex items-center space-x-3 w-full">
                  <Icon className={cn(
                    "w-5 h-5 flex-shrink-0",
                    active ? "text-blue-600" : "text-gray-500"
                  )} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className={cn(
                        "text-sm font-medium truncate",
                        active ? "text-blue-700" : "text-gray-700"
                      )}>
                        {item.name}
                      </span>
                      {item.badge && (
                        <Badge 
                          variant="secondary" 
                          className="ml-2 bg-red-100 text-red-800 text-xs"
                        >
                          {item.badge}
                        </Badge>
                      )}
                    </div>
                    {item.description && (
                      <p className={cn(
                        "text-xs truncate mt-0.5",
                        active ? "text-blue-600" : "text-gray-500"
                      )}>
                        {item.description}
                      </p>
                    )}
                  </div>
                </div>
              </Button>
            </Link>
          );
        })}
      </nav>

      {/* User Actions */}
      <div className="border-t border-gray-200 p-4 space-y-2">
        <Button
          variant="ghost"
          className="w-full justify-start text-gray-600 hover:text-gray-900"
          onClick={() => {/* Handle notifications */}}
        >
          <Bell className="w-4 h-4 mr-3" />
          Notifications
          <Badge variant="secondary" className="ml-auto bg-blue-100 text-blue-800">
            2
          </Badge>
        </Button>
        
        <Button
          variant="ghost"
          className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
          onClick={onLogout}
        >
          <LogOut className="w-4 h-4 mr-3" />
          Sign Out
        </Button>
      </div>
    </div>
  );
};
