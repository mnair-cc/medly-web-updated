import PrimaryButtonClicky from "@/app/_components/PrimaryButtonClicky";

const Scale = ({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string;
  onChange: (value: string) => void;
}) => {
  return (
    <div className="flex flex-wrap justify-center gap-2">
      {options.map((option) => (
        <PrimaryButtonClicky
          key={option}
          buttonText={option}
          buttonState={option === value ? "selected" : undefined}
          showKeyboardShortcut={false}
          disabled={false}
          onPress={() => onChange(option)}
          doesStretch={false}
        />
      ))}
    </div>
  );
};

export default Scale;
