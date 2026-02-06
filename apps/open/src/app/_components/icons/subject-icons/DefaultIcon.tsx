interface DefaultIconProps {
  fill?: string;
  width?: number;
  height?: number;
}

const DefaultIcon = ({
  fill = "#000000",
  width = 24,
  height = 24,
}: DefaultIconProps) => (
  <svg
    width={width}
    height={height}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <circle cx="12" cy="12" r="5" fill={fill} />
  </svg>
);

export default DefaultIcon;
