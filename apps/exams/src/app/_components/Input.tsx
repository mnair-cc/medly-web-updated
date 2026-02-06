import { useState } from "react";

interface InputProps {
  id: string;
  name: string;
  type: string;
  placeholder: string;
  label?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  required?: boolean;
  error?: string | null;
  touched?: boolean;
}

const ErrorIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 20 20"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="text-[#ff4b4c]"
  >
    <path
      d="M10 18C14.4183 18 18 14.4183 18 10C18 5.58172 14.4183 2 10 2C5.58172 2 2 5.58172 2 10C2 14.4183 5.58172 18 10 18Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M10 6V10"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle cx="10" cy="13.5" r="0.75" fill="currentColor" />
  </svg>
);

const EyeIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 20 20"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="text-gray-500"
  >
    <path
      d="M10 4C4.5 4 1.5 10 1.5 10C1.5 10 4.5 16 10 16C15.5 16 18.5 10 18.5 10C18.5 10 15.5 4 10 4Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle
      cx="10"
      cy="10"
      r="3"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const EyeOffIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 20 20"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="text-gray-500"
  >
    <path
      d="M2 2L18 18"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M8.5 4.5C9 4.3 9.5 4.2 10 4.2C15.5 4.2 18.5 10 18.5 10C18.5 10 17.5 11.8 15.5 13.5"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M4.5 6.5C2.5 8.2 1.5 10 1.5 10C1.5 10 4.5 15.8 10 15.8C10.5 15.8 11 15.7 11.5 15.5"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M10 7C10.8 7 11.5 7.3 12 7.9"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M8 12.1C8.5 12.7 9.2 13 10 13C11.7 13 13 11.7 13 10C13 9.2 12.7 8.5 12.1 8"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const Input = ({
  id,
  name,
  type,
  placeholder,
  label,
  value,
  defaultValue,
  onChange,
  onBlur,
  required,
  error,
  touched,
}: InputProps) => {
  const [showPassword, setShowPassword] = useState(false);
  const showError = error && touched;
  const isPasswordField = type === "password";

  // Determine the actual input type
  const inputType = isPasswordField && showPassword ? "text" : type;

  return (
    <div className="w-full space-y-2">
      {label && (
        <div className="flex items-center gap-1.5">
          <label htmlFor={id} className="text-sm font-medium">
            {label}
          </label>
          {showError && <ErrorIcon />}
        </div>
      )}
      <div className="relative">
        <input
          type={inputType}
          id={id}
          name={name}
          className={`w-full py-4 border rounded-2xl text-center bg-[#F9F9FB] font-medium ${
            showError
              ? "border-[#ff4b4c] focus:outline-[#ff4b4c]"
              : "border-gray-200 focus:outline-[#05B0FF]"
          } ${isPasswordField ? "pr-12" : ""}`}
          value={value}
          defaultValue={defaultValue}
          required={required}
          placeholder={placeholder}
          onChange={onChange}
          onBlur={onBlur}
        />
        {isPasswordField && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded-full"
            tabIndex={-1}
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        )}
      </div>
      {showError && (
        <p className="text-sm text-[#ff4b4c] text-left pl-1">{error}</p>
      )}
    </div>
  );
};

export default Input;
