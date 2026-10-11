import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown } from 'lucide-react';

export type WeatherSelectProps = {
  label: string;
  value: string;
  options: string[];
  onValueChange?: (value: string) => void;
  variant?: 'period' | 'location' | 'field';
  displayOptions?: Record<string, string>;
};

/**
 * Lightweight, accessible dropdown component that avoids Radix UI's RemoveScroll body lock.
 * Prevents scrollbar jumps, viewport expansion/contraction, and background image jitter.
 */
export function WeatherSelect({
  label,
  value,
  options,
  onValueChange = () => {},
  variant = 'period',
  displayOptions = {},
}: WeatherSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});

  // Sync highlighted index when opened
  useEffect(() => {
    if (isOpen) {
      const idx = options.indexOf(value);
      setHighlightedIndex(idx >= 0 ? idx : 0);
    }
  }, [isOpen, value, options]);

  // Position calculation relative to trigger without locking document scroll
  useEffect(() => {
    if (!isOpen || !triggerRef.current) return;

    const updatePosition = () => {
      if (!triggerRef.current) return;
      const rect = triggerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const openUpward = spaceBelow < 180 && rect.top > 180;
      const rightOffset = window.innerWidth - rect.right;

      setMenuStyle({
        position: 'fixed',
        top: openUpward ? 'auto' : `${rect.bottom + 6}px`,
        bottom: openUpward ? `${window.innerHeight - rect.top + 6}px` : 'auto',
        right: `${Math.max(12, rightOffset)}px`,
        minWidth: `${Math.max(130, rect.width)}px`,
        zIndex: 9999,
      });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isOpen]);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (
        triggerRef.current?.contains(target) ||
        menuRef.current?.contains(target)
      ) {
        return;
      }
      setIsOpen(false);
    };

    document.addEventListener('pointerdown', handlePointerDown, true);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, true);
    };
  }, [isOpen]);

  // Keyboard navigation
  const handleTriggerKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setIsOpen(prev => !prev);
    }
  };

  const handleMenuKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev + 1) % options.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev - 1 + options.length) % options.length);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      const selectedOption = options[highlightedIndex];
      if (selectedOption !== undefined) {
        onValueChange(selectedOption);
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    } else if (e.key === 'Escape' || e.key === 'Tab') {
      setIsOpen(false);
      triggerRef.current?.focus();
    }
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        data-state={isOpen ? 'open' : 'closed'}
        className={`weather-select-trigger weather-select-${variant}`}
        onClick={() => setIsOpen(prev => !prev)}
        onKeyDown={handleTriggerKeyDown}
      >
        <span>{displayOptions[value] ?? value}</span>
        <ChevronDown aria-hidden="true" />
      </button>

      {isOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={menuRef}
            role="listbox"
            aria-label={label}
            data-state="open"
            className="weather-select-menu animate-in fade-in-0 zoom-in-95 duration-100"
            style={menuStyle}
            tabIndex={-1}
            onKeyDown={handleMenuKeyDown}
          >
            <div className="weather-select-options">
              {options.map((opt, i) => {
                const isSelected = opt === value;
                const isHighlighted = i === highlightedIndex;
                return (
                  <div
                    key={opt}
                    role="option"
                    aria-selected={isSelected}
                    data-state={isSelected ? 'checked' : 'unchecked'}
                    data-highlighted={isHighlighted ? '' : undefined}
                    className="weather-select-option"
                    onPointerEnter={() => setHighlightedIndex(i)}
                    onClick={() => {
                      onValueChange(opt);
                      setIsOpen(false);
                      triggerRef.current?.focus();
                    }}
                  >
                    <span>{displayOptions[opt] ?? opt}</span>
                    {isSelected && (
                      <span className="weather-select-check">
                        <Check aria-hidden="true" />
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>,
          document.body
        )}
    </>
  );
}