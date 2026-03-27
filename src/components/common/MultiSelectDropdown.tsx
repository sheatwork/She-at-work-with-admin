"use client";

// MultiSelectDropdown.tsx
// This file is "use client" — interactive dropdown with useState/useEffect.
// getCategoryIcon has been moved to categoryIcons.tsx (server-safe).
// Re-exported here for backwards compatibility so existing imports don't break.


import { Check, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface MultiSelectDropdownProps {
  label:           string;
  icon:            React.ReactNode;
  options:         string[];
  selectedValues:  string[];
  onChange:        (values: string[]) => void;
  placeholder?:    string;
  allOptionLabel?: string;
}

export const MultiSelectDropdown = ({
  label,
  icon,
  options,
  selectedValues,
  onChange,
  placeholder    = "Select options",
  allOptionLabel = "All",
}: MultiSelectDropdownProps) => {
  const [isOpen, setIsOpen]     = useState(false);
  const dropdownRef             = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node))
        setIsOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSelect = (value: string) => {
    if (value === allOptionLabel) {
      onChange(selectedValues.length === options.length ? [] : [...options]);
    } else {
      onChange(
        selectedValues.includes(value)
          ? selectedValues.filter((v) => v !== value)
          : [...selectedValues, value]
      );
    }
  };

  const isAllSelected = selectedValues.length === options.length;
  const displayText =
    selectedValues.length === 0
      ? placeholder
      : isAllSelected
        ? `All ${label} (${selectedValues.length})`
        : `${selectedValues.length} selected`;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className={`w-full px-3 py-2 text-left border rounded-lg flex items-center justify-between transition-colors ${
          selectedValues.length > 0 ? "border-primary bg-primary/5" : "border-border bg-white"
        }`}
      >
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-sm truncate">{displayText}</span>
        </div>
        <ChevronRight
          className={`h-4 w-4 transition-transform ${isOpen ? "rotate-90" : ""}`}
        />
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full max-h-60 bg-white border border-border rounded-lg shadow-lg overflow-y-auto">
          <div className="p-2 space-y-1">
            {/* All option */}
            <button
              type="button"
              onClick={() => handleSelect(allOptionLabel)}
              className={`w-full px-3 py-2 text-left rounded flex items-center justify-between hover:bg-secondary transition-colors ${
                isAllSelected ? "bg-primary/10 text-primary" : ""
              }`}
            >
              <span className="text-sm font-medium">{allOptionLabel}</span>
              {isAllSelected && <Check className="h-4 w-4" />}
            </button>

            <div className="border-t border-border my-1" />

            {/* Individual options */}
            {options.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => handleSelect(option)}
                className={`w-full px-3 py-2 text-left rounded flex items-center justify-between hover:bg-secondary transition-colors ${
                  selectedValues.includes(option) ? "bg-primary/10 text-primary" : ""
                }`}
              >
                <span className="text-sm truncate capitalize">{option}</span>
                {selectedValues.includes(option) && <Check className="h-4 w-4" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};