import React from "react";

interface NotebookBackgroundProps {
  children: React.ReactNode;
  className?: string;
}

const NotebookBackground = ({ children, className = "" }: NotebookBackgroundProps) => {
  return (
    <div
      className={`relative ${className}`}
      style={{
        backgroundImage: `
          linear-gradient(to right, #E53E3E 0px, #E53E3E 1px, transparent 1px, transparent 100%),
          repeating-linear-gradient(
            transparent,
            transparent 46px,
            #D1D5DB 46px,
            #D1D5DB 47px
          )
        `,
        backgroundPosition: "40px 0, 0 0",
        backgroundSize: "100% 100%, 100% 48px",
        backgroundColor: "#FCFCFC",
      }}
    >
      {children}
    </div>
  );
};

export default NotebookBackground;

