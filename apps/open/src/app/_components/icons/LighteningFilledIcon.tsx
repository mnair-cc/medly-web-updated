interface LighteningIconProps {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const LighteningIcon = ({
  size = "md",
  className = "",
}: LighteningIconProps) => {
  const sizeClasses = {
    sm: "w-3",
    md: "w-4",
    lg: "w-5",
    xl: "w-8",
  };

  return (
    <svg
      className={`${sizeClasses[size]} ${className}`}
      viewBox="0 0 29 46"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M0 25.56C0 26.3874 0.637363 27.013 1.51374 27.013H13.0659L6.99107 43.5408C6.17445 45.7404 8.42514 46.9109 9.8592 45.135L28.4622 21.8064C28.8207 21.3423 29 20.9185 29 20.4544C29 19.6068 28.3626 19.0014 27.4863 19.0014H15.9341L22.0089 2.45341C22.8256 0.253743 20.5749 -0.916722 19.1408 0.879336L0.557692 24.2079C0.199176 24.6519 0 25.0757 0 25.56Z"
        fill="#05B0FF"
      />
    </svg>
  );
};

export default LighteningIcon;
