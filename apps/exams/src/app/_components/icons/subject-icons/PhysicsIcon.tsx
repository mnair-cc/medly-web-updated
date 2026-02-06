interface PhysicsIconProps {
  fill?: string;
  width?: number;
  height?: number;
}

const PhysicsIcon = ({
  fill = "#FF6B35",
  width = 24,
  height = 24,
}: PhysicsIconProps) => (
  <svg width={width} height={height} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M6.51562 12.6002C6.51562 12.9091 6.7567 13.1426 7.08817 13.1426H11.4576L9.15988 19.3125C8.851 20.1337 9.70229 20.5706 10.2447 19.9077L17.281 11.199C17.4166 11.0257 17.4844 10.8675 17.4844 10.6942C17.4844 10.3778 17.2433 10.1518 16.9118 10.1518H12.5424L14.8401 3.97435C15.149 3.1532 14.2977 2.71625 13.7553 3.38673L6.72656 12.0954C6.59096 12.2612 6.51562 12.4194 6.51562 12.6002Z"
      fill={fill} />
  </svg>

);

export default PhysicsIcon;
