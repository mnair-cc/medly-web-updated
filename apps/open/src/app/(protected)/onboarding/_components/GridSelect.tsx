const Select = ({
  options,
  value,
  onChange,
}: {
  options: string[] | { label: string; value: string; icon?: string }[];
  value: string;
  onChange: (value: string) => void;
}) => {
  return (
    <div className="relative">
      {/* Custom emoji grid selector */}
      <div className="grid grid-cols-4 gap-4 m-1">
        {options.map((option) => {
          const optionValue =
            typeof option === "string" ? option : option.value;
          const label = typeof option === "string" ? option : option.label;
          const icon =
            typeof option === "string" ? option : option.icon || option.label;
          const isSelected = optionValue === value;

          return (
            <button
              key={optionValue}
              type="button"
              onClick={() => onChange(optionValue)}
              className={`flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-all aspect-square ${
                isSelected ? "ring-4 ring-[#05B0FF] ring-offset-0" : ""
              }`}
              title={label}
            >
              <span className="text-5xl sm:text-6xl">{icon}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default Select;
