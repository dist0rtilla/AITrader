/**
 * Modal — reusable modal component with glass morphism styling
 * 
 * Copilot: This is the unified modal component that ensures consistent behavior across the app.
 * Key features:
 * - Maximum z-index (2147483647) with inline styles for guaranteed top-layer rendering
 * - Theme-aware backdrop colors (dark: black semi-transparent, light: slate semi-transparent)
 * - Global modal management to prevent overlapping modals
 * - Glass morphism styling with backdrop blur effects
 * - Accessibility: ESC key support, click-outside-to-close, ARIA attributes
 * - Body scroll prevention when open
 * 
 * Usage: Always use this component for any overlay/modal content instead of custom implementations
 * Props: isOpen, onClose, title, children, maxWidth, id (for modal management)
 */

import { X } from 'lucide-react';
import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTheme } from '../../contexts/ThemeContext';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    children: React.ReactNode;
    showCloseButton?: boolean;
    maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
    id?: string; // Unique identifier for modal management
}

// Copilot: Global modal registry to prevent overlapping modals
// This ensures only one modal can be visible at a time across the entire app
const globalModalRegistry = new Set<string>();
const modalCloseCallbacks = new Map<string, () => void>();

export default function Modal({
    isOpen,
    onClose,
    title,
    children,
    showCloseButton = true,
    maxWidth = 'lg',
    id = 'default-modal'
}: ModalProps) {
    const { theme } = useTheme();

    // Copilot: Register this modal and close others when opening
    const shouldShow = isOpen;

    // Close all other modals when this one opens
    if (isOpen && !globalModalRegistry.has(id)) {
        // Close all currently open modals
        globalModalRegistry.forEach(existingId => {
            if (existingId !== id) {
                const closeCallback = modalCloseCallbacks.get(existingId);
                if (closeCallback) {
                    closeCallback();
                }
            }
        });

        // Register this modal
        globalModalRegistry.add(id);
        modalCloseCallbacks.set(id, onClose);
    }

    // Unregister when closing
    if (!isOpen && globalModalRegistry.has(id)) {
        globalModalRegistry.delete(id);
        modalCloseCallbacks.delete(id);
    }
    // Copilot: Direct modal management - no complex context needed
    // This approach is more reliable and prevents race conditions

    // Handle escape key and body scroll prevention
    useEffect(() => {
        if (!shouldShow) return;

        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        document.addEventListener('keydown', handleEscape);
        document.body.style.overflow = 'hidden';

        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = 'unset';
        };
    }, [shouldShow, onClose]);

    if (!shouldShow) return null;

    const maxWidthClasses = {
        sm: 'max-w-sm',
        md: 'max-w-md',
        lg: 'max-w-lg',
        xl: 'max-w-xl',
        '2xl': 'max-w-2xl',
    };

    // Copilot: Theme-aware backdrop colors for optimal visibility
    // Light mode: slate semi-transparent, Dark mode: black semi-transparent
    const backdropColor = theme === 'light'
        ? 'rgba(15, 23, 42, 0.4)'
        : 'rgba(0, 0, 0, 0.7)';

    // Copilot: Modal content with maximum z-index and proper backdrop
    // Using inline styles for guaranteed reliability over CSS classes
    const modalContent = (
        <div
            role="dialog"
            aria-modal="true"
            style={{
                position: 'fixed',
                inset: '0',
                zIndex: 2147483647, // Copilot: Maximum z-index for guaranteed top-layer rendering
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '1rem',
                backdropFilter: 'blur(8px)',
                backgroundColor: backdropColor, // Copilot: Theme-aware backdrop
                isolation: 'isolate' // Copilot: Create new stacking context
            }}
            onClick={onClose}
            aria-hidden="true"
        >
            {/* Modal container */}
            <div
                className={`relative w-full ${maxWidthClasses[maxWidth]} glass-container rounded-glass-card shadow-glass-modal border border-glass-bright/30 backdrop-blur-card animate-modal-in`}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                {(title || showCloseButton) && (
                    <div className="flex items-center justify-between p-6 border-b border-glass">
                        {title && (
                            <h2 className="text-xl font-bold text-glass-bright">
                                {title}
                            </h2>
                        )}
                        {showCloseButton && (
                            <button
                                onClick={onClose}
                                className="glass-button border-glass p-2 rounded-glass-button hover:border-glass-bright hover:shadow-glow-sm transition-all duration-300 group"
                                aria-label="Close modal"
                            >
                                <X className="w-4 h-4 text-glass-muted group-hover:text-glass-bright transition-colors duration-300" />
                            </button>
                        )}
                    </div>
                )}

                {/* Content */}
                <div className="p-6">
                    {children}
                </div>
            </div>
        </div>
    );

    // Render in portal for top-layer positioning
    return createPortal(modalContent, document.body);
}