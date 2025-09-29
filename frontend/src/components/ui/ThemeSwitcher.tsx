/**
 * ThemeSwitcher - Dark/Light mode toggle with glass morphism styling
 * Features smooth animations, system theme detection, and glass effects
 */

import { Monitor, Moon, Sun } from 'lucide-react';
import { useState } from 'react';
import { useSystemTheme, useTheme } from '../../contexts/ThemeContext';

interface ThemeSwitcherProps {
  variant?: 'button' | 'dropdown';
  size?: 'sm' | 'md' | 'lg';
  showLabels?: boolean;
}

export default function ThemeSwitcher({
  variant = 'button',
  size = 'md',
  showLabels = false
}: ThemeSwitcherProps) {
  const { theme, setTheme, toggleTheme, isDark } = useTheme();
  const systemTheme = useSystemTheme();
  const [showDropdown, setShowDropdown] = useState(false);

  const sizeClasses = {
    sm: 'w-8 h-8 p-1',
    md: 'w-10 h-10 p-2',
    lg: 'w-12 h-12 p-3'
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };

  if (variant === 'button') {
    return (
      <button
        onClick={toggleTheme}
        className={`${sizeClasses[size]} glass-button border-glass text-white/70 hover:text-white hover:border-white/30 hover:shadow-glass-card rounded-glass-button transition-all duration-300 relative overflow-hidden group`}
        aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
        title={`Currently ${theme} mode - Click to switch`}
      >
        {/* Background glow effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-accent-primary/20 to-accent-teal/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-glass-button" />

        {/* Icon container with rotation animation */}
        <div className="relative z-10 flex items-center justify-center">
          <div className={`transition-all duration-500 ${isDark ? 'rotate-0 opacity-100' : 'rotate-180 opacity-0 absolute'}`}>
            <Moon className={`${iconSizes[size]} transition-transform duration-300 group-hover:scale-110`} />
          </div>
          <div className={`transition-all duration-500 ${isDark ? 'rotate-180 opacity-0 absolute' : 'rotate-0 opacity-100'}`}>
            <Sun className={`${iconSizes[size]} transition-transform duration-300 group-hover:scale-110`} />
          </div>
        </div>
      </button>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className={`${sizeClasses[size]} glass-button border-glass text-white/70 hover:text-white hover:border-white/30 hover:shadow-glass-card rounded-glass-button transition-all duration-300 relative overflow-hidden group`}
        aria-label="Theme options"
      >
        {/* Background glow effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-accent-primary/20 to-accent-teal/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-glass-button" />

        {/* Current theme icon */}
        <div className="relative z-10 flex items-center justify-center">
          {theme === 'dark' && <Moon className={`${iconSizes[size]} transition-transform duration-300 group-hover:scale-110`} />}
          {theme === 'light' && <Sun className={`${iconSizes[size]} transition-transform duration-300 group-hover:scale-110`} />}
        </div>
      </button>

      {/* Dropdown menu with glass styling */}
      {showDropdown && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowDropdown(false)}
          />

          {/* Dropdown panel */}
          <div className="absolute right-0 top-full mt-2 z-50 glass-container rounded-glass shadow-glass-lift min-w-48">
            <div className="p-3 space-y-1">
              {/* Dark Mode Option */}
              <button
                onClick={() => {
                  setTheme('dark');
                  setShowDropdown(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-glass-button transition-all duration-300 ${theme === 'dark'
                    ? 'bg-white/10 border-white/30 text-white shadow-glow-sm'
                    : 'text-white/70 hover:text-white hover:bg-white/10 hover:border-white/30'
                  } ${theme === 'dark' ? 'border border-white/30' : 'border border-white/20 hover:border-white/30'}`}
              >
                <Moon className="w-4 h-4" />
                <div className="flex-1 text-left">
                  <div className="font-medium">Dark Mode</div>
                  {showLabels && <div className="text-xs text-white/60">Deep space aesthetic</div>}
                </div>
                {theme === 'dark' && <div className="w-2 h-2 rounded-full bg-accent-primary animate-pulse-glow" />}
              </button>

              {/* Light Mode Option */}
              <button
                onClick={() => {
                  setTheme('light');
                  setShowDropdown(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-glass-button transition-all duration-300 ${theme === 'light'
                    ? 'bg-white/10 border-white/30 text-white shadow-glow-sm'
                    : 'text-white/70 hover:text-white hover:bg-white/10 hover:border-white/30'
                  } ${theme === 'light' ? 'border border-white/30' : 'border border-white/20 hover:border-white/30'}`}
              >
                <Sun className="w-4 h-4" />
                <div className="flex-1 text-left">
                  <div className="font-medium">Light Mode</div>
                  {showLabels && <div className="text-xs text-white/60">Bright glass aesthetic</div>}
                </div>
                {theme === 'light' && <div className="w-2 h-2 rounded-full bg-accent-primary animate-pulse-glow" />}
              </button>

              {/* System Theme Info */}
              <div className="pt-2 mt-2 border-t border-glass">
                <div className="flex items-center gap-2 px-3 py-1 text-xs text-white/60">
                  <Monitor className="w-3 h-3" />
                  <span>System: {systemTheme}</span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}