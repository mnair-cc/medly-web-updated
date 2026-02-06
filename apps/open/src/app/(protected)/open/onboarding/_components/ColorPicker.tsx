"use client";

import { MODULE_COLORS } from "../_types/types";

interface ColorPickerProps {
  value: string;
  onChange: (hex: string) => void;
}

export default function ColorPicker({ value, onChange }: ColorPickerProps) {
  return (
    <div className="flex flex-wrap justify-center gap-3">
      {MODULE_COLORS.map((color) => (
        <button
          key={color.name}
          type="button"
          className={`w-10 h-10 rounded-full ${
            value === color.hex ? "ring-2 ring-offset-2" : ""
          }`}
          style={{
            backgroundColor: color.hex,
            ...(value === color.hex && {
              "--tw-ring-color": color.hex,
            }),
          }}
          onClick={() => onChange(color.hex)}
          aria-label={`Select ${color.name} color`}
        />
      ))}
    </div>
  );
}
