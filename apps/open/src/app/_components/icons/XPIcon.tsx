const XPIcon = ({
  width = 28,
  height = 28,
}: {
  width?: number;
  height?: number;
}) => {
  return (
    <svg
      className="mt-0.5"
      width={width}
      height={height}
      viewBox="0 0 28 28"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M7.60156 14.7004C7.60156 15.0607 7.88281 15.3332 8.26953 15.3332H13.3672L10.6865 22.5314C10.3262 23.4894 11.3193 23.9992 11.9521 23.2257L20.1611 13.0656C20.3193 12.8634 20.3984 12.6789 20.3984 12.4767C20.3984 12.1076 20.1172 11.8439 19.7305 11.8439H14.6328L17.3135 4.63688C17.6738 3.67887 16.6807 3.1691 16.0479 3.95133L7.84766 14.1115C7.68945 14.3048 7.60156 14.4894 7.60156 14.7004Z"
        fill="url(#paint0_linear_359_5045)"
      />
      <defs>
        <linearGradient
          id="paint0_linear_359_5045"
          x1="14"
          y1="3.56836"
          x2="14"
          y2="23.6025"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#75D3FF" />
          <stop offset="1" stopColor="#05B0FF" />
        </linearGradient>
      </defs>
    </svg>
  );
};

export default XPIcon;
