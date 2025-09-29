# Frontend Design System - Authoritative Guide

## Overview

This document defines the complete design system for the AITrader frontend, including UI patterns, container management, theming, and development guardrails.

## 🛡️ Critical Container Design Guardrails

### Layout Container Rules (ALWAYS ENFORCE)

1. **Parent containers MUST use flex layout**: `flex flex-col` or `flex flex-row`
2. **Child components MUST respect boundaries**: `flex-1 min-h-0` for flexible children
3. **NO fixed heights without overflow**: Use `max-h-*` with `overflow-hidden` or `overflow-y-auto`
4. **Container hierarchy**: Parent sets height constraint, child uses `flex-1 min-h-0`

### Component Container Patterns

#### ✅ CORRECT: Parent sets flex, child respects boundaries
```tsx
<div className="glass-container rounded-glass p-8 flex flex-col">
  <ScrollableComponent className="flex-1 min-h-0 max-h-96" />
</div>
```

#### ❌ WRONG: Fixed heights without proper overflow handling
```tsx
<div className="glass-container rounded-glass p-8">
  <ScrollableComponent className="h-96" />  // Will clip content!
</div>
```

### Scrollable Component Rules

1. **Root element**: `flex flex-col overflow-hidden` to establish container
2. **Scrollable area**: `flex-1 overflow-y-auto min-h-0` for content area
3. **NO max-height on scrollable**: Let parent container control height
4. **Header/Footer**: Fixed position outside scrollable area

#### Example Implementation
```tsx
export function ScrollableComponent({ className }) {
  return (
    <div className={`flex flex-col overflow-hidden ${className}`}>
      {/* Fixed header */}
      <div className="flex-shrink-0 p-4 border-b">Header</div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="space-y-2 p-4">Content...</div>
      </div>

      {/* Fixed footer */}
      <div className="flex-shrink-0 p-4 border-t">Footer</div>
    </div>
  );
}
```

### Glass Container Standards

- **Layout containers**: `glass-container rounded-glass p-8 flex flex-col`
- **Card components**: `glass-card rounded-glass-card border border-glass-bright/20 flex flex-col overflow-hidden`
- **Always specify flex direction**: `flex-col` or `flex-row`
- **Child spacing**: Use `space-y-*` for vertical, `gap-*` for flex layouts

### Error Prevention Checklist

- [ ] Parent container uses `flex flex-col`
- [ ] Child uses `flex-1 min-h-0` for height flexibility
- [ ] Scrollable areas have `overflow-y-auto`
- [ ] No content clips outside container boundaries
- [ ] Headers and footers are positioned outside scroll areas
- [ ] Component respects max-height constraints

### Common Anti-Patterns to AVOID

- ❌ `<div className="h-96"><ScrollableContent /></div>` (clipping)
- ❌ Fixed heights without overflow handling
- ❌ Missing `min-h-0` on flex children
- ❌ Scrollable content outside proper container
- ❌ Multiple components with same ID or duplicate sections

## 🎨 Glass Morphism Design System

### Theme Variables

The design system uses CSS custom properties for dynamic theming:

```css
:root {
  --glass-bg: rgba(255, 255, 255, 0.1);
  --glass-border: rgba(255, 255, 255, 0.2);
  --glass-bright: rgba(255, 255, 255, 0.3);
  --glass-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

.dark {
  --glass-bg: rgba(0, 0, 0, 0.2);
  --glass-border: rgba(255, 255, 255, 0.1);
  --glass-bright: rgba(255, 255, 255, 0.15);
  --glass-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}
```

### Glass Container Classes

```css
.glass-container {
  background: var(--glass-bg);
  backdrop-filter: blur(16px);
  border: 1px solid var(--glass-border);
  border-radius: 16px;
  box-shadow: var(--glass-shadow);
}

.glass-card {
  background: var(--glass-bg);
  backdrop-filter: blur(12px);
  border: 1px solid var(--glass-border);
  border-radius: 12px;
  box-shadow: var(--glass-shadow);
}
```

### Theme Switching

Theme switching is handled via React Context with persistent storage:

```tsx
// src/contexts/ThemeContext.tsx
interface ThemeContextType {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

// Automatic system preference detection
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
```

## 📱 Responsive Design

### Breakpoint System

```css
/* Mobile First */
.container { max-width: 100%; }

/* Tablet */
@media (min-width: 768px) {
  .container { max-width: 768px; }
}

/* Desktop */
@media (min-width: 1024px) {
  .container { max-width: 1024px; }
}
```

### Grid System

```tsx
// Responsive grid layout
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* Grid items */}
</div>
```

## 🎯 Component Patterns

### Button Variants

```tsx
// Primary action
<button className="glass-button bg-blue-500 hover:bg-blue-600">

// Secondary action
<button className="glass-button border border-glass-bright">

// Danger action
<button className="glass-button bg-red-500 hover:bg-red-600">
```

### Form Elements

```tsx
// Input with glass styling
<input className="glass-input bg-transparent border border-glass-bright rounded-glass px-4 py-2">

// Select with custom styling
<select className="glass-select bg-transparent border border-glass-bright rounded-glass px-4 py-2">
```

### Data Display

```tsx
// Card with glass effect
<div className="glass-card p-6 rounded-glass-card">
  <h3 className="text-lg font-semibold mb-4">Card Title</h3>
  <div className="space-y-2">
    {/* Content */}
  </div>
</div>
```

## 🔄 Animation Guidelines

### Transition Classes

```css
.glass-transition {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.hover-lift:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 40px var(--glass-shadow);
}
```

### Loading States

```tsx
// Skeleton loading
<div className="animate-pulse glass-card p-6">
  <div className="h-4 bg-glass-bright rounded mb-2"></div>
  <div className="h-4 bg-glass-bright rounded w-3/4"></div>
</div>
```

## ♿ Accessibility

### Focus Management

```css
.glass-focus:focus {
  outline: 2px solid var(--glass-bright);
  outline-offset: 2px;
}

.glass-focus-visible:focus-visible {
  outline: 2px solid blue;
  outline-offset: 2px;
}
```

### Color Contrast

- Ensure text meets WCAG AA standards
- Use semantic color variables
- Test with color blindness simulators

### Keyboard Navigation

- All interactive elements must be keyboard accessible
- Logical tab order
- Visible focus indicators

## 🧪 Testing Guidelines

### Component Testing

```tsx
// Test container patterns
describe('ScrollableComponent', () => {
  it('respects container boundaries', () => {
    render(<ScrollableComponent className="h-64" />);
    // Assert proper flex layout and overflow handling
  });
});
```

### Visual Regression

- Use Chromatic or similar for visual testing
- Test glass effects across themes
- Validate responsive breakpoints

## 📚 Implementation Checklist

### New Component Development
- [ ] Uses proper container patterns
- [ ] Implements glass morphism styling
- [ ] Responsive across all breakpoints
- [ ] Accessible with keyboard navigation
- [ ] Tested with container guardrails
- [ ] Follows animation guidelines

### Theme Implementation
- [ ] Uses CSS custom properties
- [ ] Supports light and dark modes
- [ ] Respects system preferences
- [ ] Persistent theme storage

### Layout Implementation
- [ ] Flex-based container hierarchy
- [ ] Proper overflow handling
- [ ] Responsive grid system
- [ ] No content clipping

---

**📋 Last Updated**: September 29, 2025
**🎯 Purpose**: Single source of truth for all frontend design decisions