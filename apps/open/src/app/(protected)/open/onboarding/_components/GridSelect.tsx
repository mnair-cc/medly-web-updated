const GridSelect = ({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string;
  onChange: (value: string) => void;
}) => {
  return (
    <div className="relative">
      <div className="grid grid-cols-4 gap-4 m-1">
        {options.map((option) => {
          const isSelected = option === value;

          return (
            <button
              key={option}
              type="button"
              onClick={() => onChange(option)}
              className={`flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-all aspect-square ${
                isSelected ? "ring-4 ring-[#05B0FF] ring-offset-0" : ""
              }`}
              title={option}
            >
              <span className="text-5xl sm:text-6xl">{option}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default GridSelect;
