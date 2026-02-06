"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { InputMode } from "../types";

interface InputModeContextValue {
  inputMode: InputMode;
  setInputMode: (mode: InputMode) => void;
}

const InputModeContext = createContext<InputModeContextValue | null>(null);

interface InputModeProviderProps {
  initialMode?: InputMode;
  children: React.ReactNode;
}

/**
 * InputModeProvider - Isolates inputMode state from SessionStructure
 *
 * This prevents inputMode changes from causing full SessionStructure re-renders.
 * Only components that subscribe via useInputMode() will re-render when mode changes.
 */
export const InputModeProvider: React.FC<InputModeProviderProps> = ({
  initialMode = "text",
  children,
}) => {
  const [inputMode, setInputModeState] = useState<InputMode>(initialMode);

  const setInputMode = useCallback((mode: InputMode) => {
    setInputModeState(mode);
  }, []);

  return (
    <InputModeContext.Provider value={{ inputMode, setInputMode }}>
      {children}
    </InputModeContext.Provider>
  );
};

/**
 * useInputMode - Hook to access inputMode state
 *
 * Components using this hook will only re-render when inputMode changes,
 * not when SessionStructure's other state changes.
 */
export const useInputMode = (): InputModeContextValue => {
  const context = useContext(InputModeContext);
  if (!context) {
    throw new Error("useInputMode must be used within an InputModeProvider");
  }
  return context;
};

/**
 * useInputModeOptional - Hook that doesn't throw if outside provider
 *
 * Useful for components that may or may not be inside the provider.
 * Returns null if outside provider.
 */
export const useInputModeOptional = (): InputModeContextValue | null => {
  return useContext(InputModeContext);
};
