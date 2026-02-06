import ChevronLeftIcon from "@/app/_components/icons/ChevronLeftIcon";
import ChevronRightIcon from "@/app/_components/icons/ChevronRightIcon";

interface CharacterCarouselProps {
  options: string[];
  value: string;
  onChange: (value: string) => void;
}

const CharacterCarousel = ({
  options,
  value,
  onChange,
}: CharacterCarouselProps) => {
  const currentIndex = options.indexOf(value);
  const index = currentIndex === -1 ? 0 : currentIndex;

  const handlePrevious = () => {
    const newIndex = index === 0 ? options.length - 1 : index - 1;
    onChange(options[newIndex]);
  };

  const handleNext = () => {
    const newIndex = index === options.length - 1 ? 0 : index + 1;
    onChange(options[newIndex]);
  };

  return (
    <div className="flex items-center justify-center gap-4">
      <button
        type="button"
        onClick={handlePrevious}
        className="p-2 cursor-pointer"
        aria-label="Previous character"
      >
        <ChevronLeftIcon />
      </button>

      <div className="w-[200px] h-[200px] rounded-full bg-gray-100 flex items-center justify-center">
        <span className="text-8xl">{options[index]}</span>
      </div>

      <button
        type="button"
        onClick={handleNext}
        className="p-2 cursor-pointer"
        aria-label="Next character"
      >
        <ChevronRightIcon />
      </button>
    </div>
  );
};

export default CharacterCarousel;
