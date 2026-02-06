interface EnglishIconProps {
  fill?: string;
  width?: number;
  height?: number;
}

const EnglishIcon = ({
  fill = "#C71585",
  width = 24,
  height = 24,
}: EnglishIconProps) => (
  <svg
    width={width}
    height={height}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M18 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V4C20 2.9 19.1 2 18 2M18 20H6V4H18V20M7 9H17V11H7V9M7 12H17V14H7V12M7 15H14V17H7V15Z"
      fill={fill}
    />
  </svg>
);

export default EnglishIcon;
