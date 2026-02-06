"use client";

import { useState, useEffect, useRef } from "react";
import { useUniversitySearch } from "../_hooks/useUniversitySearch";
import type { University } from "../_types/universityApi";

interface SearchableSelectProps {
  value: string;
  onChange: (value: string, university?: University) => void;
  placeholder?: string;
  logo?: string | null;
}

export default function SearchableSelect({
  value,
  onChange,
  placeholder = "Search for your university...",
  logo = null,
}: SearchableSelectProps) {
  const [inputValue, setInputValue] = useState(value);
  const [selectedLogo, setSelectedLogo] = useState<string | null>(logo);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { universities } = useUniversitySearch(inputValue);

  // Reset highlighted index when results change or dropdown closes
  useEffect(() => {
    setHighlightedIndex(-1);
  }, [universities, isOpen]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightedIndex >= -1 && dropdownRef.current) {
      const items = dropdownRef.current.querySelectorAll("button");
      // Check if free text option is shown to determine DOM index offset
      const hasFreeTextOption = !universities.some(
        (u) => u.name.toLowerCase() === inputValue.trim().toLowerCase()
      );
      const domIndex = hasFreeTextOption ? highlightedIndex + 1 : highlightedIndex;
      items[domIndex]?.scrollIntoView({ block: "nearest", behavior: "instant" });
    }
  }, [highlightedIndex, universities, inputValue]);

  // Update dropdown position when input is focused or window resizes
  useEffect(() => {
    const updatePosition = () => {
      if (inputRef.current) {
        const rect = inputRef.current.getBoundingClientRect();
        setDropdownPosition({
          top: rect.bottom + window.scrollY + 8,
          left: rect.left + window.scrollX,
          width: rect.width,
        });
      }
    };

    if (isOpen) {
      updatePosition();
      window.addEventListener("resize", updatePosition);
      window.addEventListener("scroll", updatePosition, true);
    }

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isOpen]);

  // Sync input value with prop value
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Sync logo with prop value
  useEffect(() => {
    setSelectedLogo(logo);
  }, [logo]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    setSelectedLogo(null); // Clear logo when typing
    // Clear selection when typing (allows re-selection)
    onChange(newValue, undefined);
    setIsOpen(true);
  };

  const handleOptionSelect = (university: University) => {
    setInputValue(university.name);
    setSelectedLogo(university.logo_link || null);
    onChange(university.name, university);
    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  const handleContinueWithText = () => {
    onChange(inputValue.trim(), undefined);
    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const hasInput = inputValue.trim().length > 0;
    if (!isOpen || !hasInput) return;

    // Check if free text option would be shown
    const hasFreeTextOption = !universities.some(
      (u) => u.name.toLowerCase() === inputValue.trim().toLowerCase()
    );
    const minIndex = hasFreeTextOption ? -1 : 0;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < universities.length - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > minIndex ? prev - 1 : prev));
        break;
      case "Enter":
        e.preventDefault();
        if (highlightedIndex === -1 && hasFreeTextOption) {
          handleContinueWithText();
        } else if (highlightedIndex >= 0 && highlightedIndex < universities.length) {
          handleOptionSelect(universities[highlightedIndex]);
        }
        break;
      case "Escape":
        setIsOpen(false);
        setHighlightedIndex(-1);
        break;
    }
  };

  // Show dropdown with placeholder when open but no input, or with results when typing
  const hasInput = inputValue.trim().length > 0;
  const shouldShowPlaceholder = isOpen && !hasInput;
  const shouldShowResults = isOpen && hasInput;

  // Show "Use X" option when typed text doesn't exactly match any university
  const showFreeTextOption =
    hasInput &&
    !universities.some(
      (u) => u.name.toLowerCase() === inputValue.trim().toLowerCase()
    );

  return (
    <div className="relative w-full">
      <div className="relative w-full">
        <input
          ref={inputRef}
          type="text"
          className={`w-full py-5 px-4 border rounded-2xl bg-[#F9F9FB] focus:outline-[#05B0FF] font-medium border-[#E6E6E6] text-center ${
            selectedLogo ? "text-transparent caret-transparent" : ""
          }`}
          value={inputValue}
          placeholder={placeholder}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
        />
        {selectedLogo && (
          <div
            className="absolute inset-0 flex items-center justify-center gap-2 pointer-events-none"
            aria-hidden="true"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={selectedLogo}
              alt=""
              className="w-6 h-6 object-contain"
            />
            <span className="font-medium">{inputValue}</span>
          </div>
        )}
      </div>

      {shouldShowPlaceholder && (
        <div
          ref={dropdownRef}
          className="fixed z-[9999] bg-white border border-[#E6E6E6] rounded-2xl shadow-lg"
          style={{
            top: dropdownPosition.top,
            left: dropdownPosition.left,
            width: dropdownPosition.width,
          }}
        >
          <div className="px-4 py-4 text-center text-gray-500">
            Start typing to search...
          </div>
        </div>
      )}

      {shouldShowResults && (
        <div
          ref={dropdownRef}
          className="fixed z-[9999] bg-white border border-[#E6E6E6] rounded-2xl shadow-lg max-h-60 overflow-y-auto"
          style={{
            top: dropdownPosition.top,
            left: dropdownPosition.left,
            width: dropdownPosition.width,
          }}
        >
          {showFreeTextOption && (
            <button
              type="button"
              className={`w-full px-4 py-3 text-left rounded-t-2xl border-b border-[#E6E6E6] text-[#05B0FF] font-medium ${
                highlightedIndex === -1 ? "bg-[#F2F2F7]" : "hover:bg-[#F9F9FB]"
              } ${universities.length === 0 ? "rounded-b-2xl border-b-0" : ""}`}
              onClick={handleContinueWithText}
              onMouseEnter={() => setHighlightedIndex(-1)}
            >
              Add &quot;{inputValue.trim()}&quot;
            </button>
          )}
          {universities.map((university, index) => (
            <button
              key={university.id}
              type="button"
              className={`w-full px-4 py-3 text-left last:rounded-b-2xl flex items-center gap-3 ${
                !showFreeTextOption && index === 0 ? "first:rounded-t-2xl" : ""
              } ${
                index === highlightedIndex ? "bg-[#F0F0F5]" : "hover:bg-[#F9F9FB]"
              }`}
              onClick={() => handleOptionSelect(university)}
              onMouseEnter={() => setHighlightedIndex(index)}
            >
              {university.logo_link && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={university.logo_link}
                  alt=""
                  className="w-6 h-6 object-contain flex-shrink-0"
                />
              )}
              <span>{university.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
