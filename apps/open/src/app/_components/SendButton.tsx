"use client";

import React, { useState } from "react";
import Spinner from "./Spinner";

interface SendButtonProps {
  onClick: () => void;
  isLoading?: boolean;
  disabled?: boolean;
  className?: string;
}

export default function SendButton({ 
  onClick, 
  isLoading = false, 
  disabled = false,
  className = "" 
}: SendButtonProps) {
  const [isHovered, setIsHovered] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isLoading && !disabled) {
      onClick();
    }
  };

  const backgroundColor = isLoading || disabled ? 'white' : (isHovered ? '#f9fafb' : 'white');
  const cursor = isLoading || disabled ? 'default' : 'pointer';

  return (
    <div
      className={`medly-send-button-container ${className}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        flexShrink: 0,
        marginLeft: 'auto',
        paddingRight: '8px',
        position: 'relative',
        zIndex: 20,
        pointerEvents: 'auto',
      }}
    >
      <div
        className="font-rounded-semibold medly-send-button"
        onClick={handleClick}
        onMouseEnter={() => !isLoading && !disabled && setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          background: backgroundColor,
          border: 'none',
          borderRadius: '9999px',
          color: 'black',
          fontSize: '12px',
          fontWeight: 'bold',
          cursor: cursor,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
          width: '68px',
          height: '28px',
          padding: '0 2px 0 2px',
          marginRight: '8px',
          boxShadow: '0px 0px 15px 0px rgba(0, 0, 0, 0.15)',
          transition: 'background-color 0.2s',
          whiteSpace: 'nowrap',
        }}
      >
        {isLoading ? (
          <Spinner size="small" />
        ) : (
          <>
            Send
            <div
              style={{
                width: '18px',
                height: '18px',
                backgroundColor: '#00AEFF',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
              }}
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path 
                  d="M5 1L5 8M5 1L2 4M5 1L8 4" 
                  stroke="white" 
                  strokeWidth="1.5" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
