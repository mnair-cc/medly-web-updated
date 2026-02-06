const PrimaryButton = ({
  type,
  children,
  disabled = false,
  action,
  fullWidth = true,
  color = "primary",
}: {
  type: "button" | "submit";
  children: React.ReactNode;
  disabled?: boolean;
  action?: () => void;
  fullWidth?: boolean;
  color?: "primary" | "special";
}) => {
  return (
    <button
      type={type}
      className={`px-10 py-3 rounded-full font-sm ${
        disabled
          ? "bg-gray-200 text-gray-500 cursor-not-allowed"
          : color === "special"
          ? "bg-special text-white"
          : "bg-primary text-white"
      } ${fullWidth ? "w-full" : ""}`}
      disabled={disabled}
      onClick={action}
    >
      {children}
    </button>
  );
};

export default PrimaryButton;
