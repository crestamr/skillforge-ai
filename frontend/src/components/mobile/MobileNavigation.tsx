'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Home, 
  BarChart3, 
  BookOpen, 
  Briefcase, 
  User, 
  Menu, 
  X,
  Bell,
  Search
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface NavigationItem {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
  path: string;
  badge?: number;
}

const navigationItems: NavigationItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: Home, path: '/dashboard' },
  { id: 'assessments', label: 'Assessments', icon: BarChart3, path: '/assessments' },
  { id: 'learning', label: 'Learning', icon: BookOpen, path: '/learning-path' },
  { id: 'jobs', label: 'Jobs', icon: Briefcase, path: '/jobs', badge: 3 },
  { id: 'profile', label: 'Profile', icon: User, path: '/profile' }
];

interface MobileNavigationProps {
  className?: string;
}

export const MobileNavigation: React.FC<MobileNavigationProps> = ({
  className = ""
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState(2);
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  // Hide/show navigation on scroll
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setIsVisible(false);
      } else {
        setIsVisible(true);
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  // Handle safe area for devices with notches
  useEffect(() => {
    const updateSafeArea = () => {
      const safeAreaTop = getComputedStyle(document.documentElement)
        .getPropertyValue('--safe-area-inset-top') || '0px';
      const safeAreaBottom = getComputedStyle(document.documentElement)
        .getPropertyValue('--safe-area-inset-bottom') || '0px';
      
      document.documentElement.style.setProperty('--nav-safe-area-top', safeAreaTop);
      document.documentElement.style.setProperty('--nav-safe-area-bottom', safeAreaBottom);
    };

    updateSafeArea();
    window.addEventListener('resize', updateSafeArea);
    return () => window.removeEventListener('resize', updateSafeArea);
  }, []);

  const handleNavigation = (path: string) => {
    router.push(path);
    setIsMenuOpen(false);
  };

  const isActive = (path: string) => pathname === path;

  return (
    <>
      {/* Top Header for Mobile */}
      <motion.header
        initial={{ y: 0 }}
        animate={{ y: isVisible ? 0 : -100 }}
        transition={{ duration: 0.3 }}
        className={`
          mobile-nav-top
          md:hidden ${className}
        `}
        style={{
          paddingTop: 'env(safe-area-inset-top)',
        }}
      >
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMenuOpen(true)}
              className="p-2"
            >
              <Menu className="w-5 h-5" />
            </Button>
            <h1 className="text-lg font-bold text-gray-900">SkillForge AI</h1>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="sm" className="p-2">
              <Search className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="sm" className="p-2 relative">
              <Bell className="w-5 h-5" />
              {notifications > 0 && (
                <Badge 
                  variant="destructive" 
                  className="absolute -top-1 -right-1 w-5 h-5 text-xs flex items-center justify-center p-0"
                >
                  {notifications}
                </Badge>
              )}
            </Button>
          </div>
        </div>
      </motion.header>

      {/* Bottom Navigation for Mobile */}
      <motion.nav
        initial={{ y: 0 }}
        animate={{ y: isVisible ? 0 : 100 }}
        transition={{ duration: 0.3 }}
        className={`
          mobile-nav-bottom
          md:hidden ${className}
        `}
        style={{
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        <div className="flex items-center justify-around px-2 py-2">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            
            return (
              <button
                key={item.id}
                onClick={() => handleNavigation(item.path)}
                className={`
                  flex flex-col items-center justify-center p-2 rounded-lg transition-all duration-200
                  ${active 
                    ? 'text-blue-600 bg-blue-50' 
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }
                `}
              >
                <div className="relative">
                  <Icon className={`w-5 h-5 ${active ? 'text-blue-600' : ''}`} />
                  {item.badge && item.badge > 0 && (
                    <Badge 
                      variant="destructive" 
                      className="absolute -top-2 -right-2 w-4 h-4 text-xs flex items-center justify-center p-0"
                    >
                      {item.badge}
                    </Badge>
                  )}
                </div>
                <span className={`text-xs mt-1 ${active ? 'font-medium' : ''}`}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </motion.nav>

      {/* Slide-out Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMenuOpen(false)}
              className="fixed inset-0 z-50 bg-black/50 md:hidden"
            />
            
            {/* Menu Panel */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed left-0 top-0 bottom-0 z-50 w-80 bg-white shadow-xl md:hidden"
              style={{
                paddingTop: 'env(safe-area-inset-top)',
                paddingBottom: 'env(safe-area-inset-bottom)',
              }}
            >
              <div className="flex flex-col h-full">
                {/* Menu Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">Menu</h2>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsMenuOpen(false)}
                    className="p-2"
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>
                
                {/* Menu Items */}
                <div className="flex-1 overflow-y-auto">
                  <div className="p-4 space-y-2">
                    {navigationItems.map((item) => {
                      const Icon = item.icon;
                      const active = isActive(item.path);
                      
                      return (
                        <button
                          key={item.id}
                          onClick={() => handleNavigation(item.path)}
                          className={`
                            w-full flex items-center space-x-3 p-3 rounded-lg transition-all duration-200
                            ${active 
                              ? 'text-blue-600 bg-blue-50 border border-blue-200' 
                              : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
                            }
                          `}
                        >
                          <Icon className={`w-5 h-5 ${active ? 'text-blue-600' : ''}`} />
                          <span className={`font-medium ${active ? 'text-blue-600' : ''}`}>
                            {item.label}
                          </span>
                          {item.badge && item.badge > 0 && (
                            <Badge variant="destructive" className="ml-auto">
                              {item.badge}
                            </Badge>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  
                  {/* Additional Menu Items */}
                  <div className="p-4 border-t border-gray-200">
                    <div className="space-y-2">
                      <button className="w-full flex items-center space-x-3 p-3 rounded-lg text-gray-700 hover:text-gray-900 hover:bg-gray-50">
                        <Bell className="w-5 h-5" />
                        <span className="font-medium">Notifications</span>
                        {notifications > 0 && (
                          <Badge variant="destructive" className="ml-auto">
                            {notifications}
                          </Badge>
                        )}
                      </button>
                      
                      <button className="w-full flex items-center space-x-3 p-3 rounded-lg text-gray-700 hover:text-gray-900 hover:bg-gray-50">
                        <Search className="w-5 h-5" />
                        <span className="font-medium">Search</span>
                      </button>
                    </div>
                  </div>
                </div>
                
                {/* Menu Footer */}
                <div className="p-4 border-t border-gray-200">
                  <div className="text-xs text-gray-500 text-center">
                    SkillForge AI v1.0.0
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default MobileNavigation;
