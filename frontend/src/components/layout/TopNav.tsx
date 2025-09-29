
/**
 * TopNav — responsive navigation bar with hamburger menu, translucent background.
 * Props: { isConnected?: boolean; systemStatus?: 'ok' | 'warn' | 'error' }
 * Notes: stateless; uses React Router for navigation, displays WebSocket connection state.
 */

import {
  Activity,
  BarChart3,
  Brain,
  Database,
  Heart,
  Menu,
  MessageSquare,
  Settings,
  TrendingUp,
  X,
  Zap
} from 'lucide-react';
import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import ThemeSwitcher from '../ui/ThemeSwitcher';

interface TopNavProps {
  isConnected?: boolean;
  systemStatus?: 'ok' | 'warn' | 'error';
}

const navItems = [
  { path: '/', label: 'Monitor', icon: Activity },
  { path: '/systems', label: 'Systems', icon: Heart },
  { path: '/signals', label: 'Signals', icon: Zap },
  { path: '/predictions', label: 'Predictions', icon: TrendingUp },
  { path: '/sentiment', label: 'Sentiment', icon: MessageSquare },
  { path: '/executions', label: 'Executions', icon: BarChart3 },
  { path: '/training', label: 'Training', icon: Brain },
  { path: '/metrics', label: 'Metrics', icon: BarChart3 },
  { path: '/db', label: 'DB', icon: Database },
];

const getStatusColor = (status?: string, isConnected?: boolean) => {
  if (!isConnected) return 'bg-red-500';
  switch (status) {
    case 'ok': return 'bg-green-500';
    case 'warn': return 'bg-amber-500';
    case 'error': return 'bg-red-500';
    default: return 'bg-neutral-500';
  }
};

const getStatusText = (status?: string, isConnected?: boolean) => {
  if (!isConnected) return 'Disconnected';
  switch (status) {
    case 'ok': return 'Healthy';
    case 'warn': return 'Warning';
    case 'error': return 'Error';
    default: return 'Unknown';
  }
};

export default function TopNav({ isConnected = true, systemStatus = 'ok' }: TopNavProps) {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);
  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  return (
    <>
      {/* Main Navigation Bar - Glass Morphism */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass-nav backdrop-blur-nav shadow-glass-nav">
        <div className="flex items-center justify-between py-4 px-4 lg:px-8">
          {/* Logo and Brand with glass effect */}
          <Link
            to="/"
            className="flex items-center gap-3 font-bold text-lg lg:text-xl text-white hover:text-accent-primary transition-all duration-300 group"
            onClick={closeMobileMenu}
          >
            <div className="p-2 glass-container rounded-glass-button group-hover:shadow-glow-sm transition-all duration-300">
              <TrendingUp className="h-5 w-5 lg:h-6 lg:w-6 text-white" />
            </div>
            <span className="hidden sm:block">AITrader</span>
            <span className="sm:hidden">AT</span>
          </Link>

          {/* Desktop Navigation Links with glass styling */}
          <div className="hidden lg:flex items-center gap-2">
            {navItems.map(({ path, label, icon: Icon }) => {
              const isActive = location.pathname === path;
              return (
                <Button
                  key={path}
                  asChild
                  variant="ghost"
                  size="sm"
                  className={`gap-2 px-4 py-2 rounded-glass-button border-glass transition-all duration-300 ${isActive
                      ? 'bg-white/10 border-white/30 text-white shadow-glow-sm'
                      : 'bg-glass-button text-white/70 hover:text-white hover:bg-white/10 hover:border-white/30 hover:shadow-glass-card'
                    }`}
                >
                  <Link to={path} className="flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    {label}
                  </Link>
                </Button>
              );
            })}
          </div>

          {/* Right Side - Status and Mobile Menu with glass styling */}
          <div className="flex items-center gap-3 lg:gap-4">
            {/* Connection Status with glass effect */}
            <div className="flex items-center gap-3 px-3 py-2 glass-card rounded-glass-button">
              <div className={`w-3 h-3 rounded-full ${getStatusColor(systemStatus, isConnected)} animate-pulse-glow`} />
              <Badge
                variant="outline"
                className={`text-xs hidden sm:block border-white/20 backdrop-blur-card ${systemStatus === 'ok' && isConnected
                    ? 'bg-green-500/20 border-green-500/30 text-green-400'
                    : systemStatus === 'warn'
                      ? 'bg-amber-500/20 border-amber-500/30 text-amber-400'
                      : 'bg-red-500/20 border-red-500/30 text-red-400'
                  }`}
              >
                {getStatusText(systemStatus, isConnected)}
              </Badge>
            </div>

            {/* Theme Switcher - Desktop/Mobile with glass styling */}
            <ThemeSwitcher />

            {/* Settings - Desktop Only with glass styling */}
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="hidden lg:flex glass-button border-glass text-white/70 hover:text-white hover:border-white/30 hover:shadow-glass-card transition-all duration-300"
            >
              <Link to="/settings" className="p-2">
                <Settings className="h-4 w-4" />
              </Link>
            </Button>

            {/* Mobile Menu Button with glass styling */}
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden glass-button border-glass text-white/70 hover:text-white hover:border-white/30 hover:shadow-glass-card transition-all duration-300"
              onClick={toggleMobileMenu}
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu Overlay with enhanced glass effects */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          {/* Enhanced Glass Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-glass"
            onClick={closeMobileMenu}
          />

          {/* Glass Menu Panel */}
          <div className="absolute top-20 left-4 right-4 glass-container rounded-glass shadow-glass-lift">
            <div className="p-6 space-y-3">
              {navItems.map(({ path, label, icon: Icon }) => {
                const isActive = location.pathname === path;
                return (
                  <Button
                    key={path}
                    asChild
                    variant="ghost"
                    className={`w-full justify-start gap-4 py-3 px-4 rounded-glass-button border-glass transition-all duration-300 ${isActive
                        ? 'bg-glass-light border-glass-bright text-glass-bright shadow-glow-sm'
                        : 'bg-glass-button text-glass-muted hover:text-glass-bright hover:bg-glass-light hover:border-glass-bright hover:shadow-glass-card'
                      }`}
                    onClick={closeMobileMenu}
                  >
                    <Link to={path} className="flex items-center gap-4">
                      <div className={`p-1 rounded ${isActive ? 'bg-accent-primary/20' : ''}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <span className="font-medium">{label}</span>
                    </Link>
                  </Button>
                );
              })}

              {/* Settings and Theme Switcher in Mobile Menu with glass styling */}
              <div className="pt-2 mt-4 border-t border-glass space-y-3">
                <div className="flex items-center justify-between px-4 py-2">
                  <span className="text-glass-muted font-medium">Theme</span>
                  <ThemeSwitcher variant="button" />
                </div>

                <Button
                  asChild
                  variant="ghost"
                  className="w-full justify-start gap-4 py-3 px-4 rounded-glass-button border-glass bg-glass-button text-glass-muted hover:text-glass-bright hover:bg-glass-light hover:border-glass-bright hover:shadow-glass-card transition-all duration-300"
                  onClick={closeMobileMenu}
                >
                  <Link to="/settings" className="flex items-center gap-4">
                    <div className="p-1 rounded">
                      <Settings className="h-5 w-5" />
                    </div>
                    <span className="font-medium">Settings</span>
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
