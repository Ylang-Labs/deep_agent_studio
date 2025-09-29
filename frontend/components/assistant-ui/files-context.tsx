"use client";

import { createContext, PropsWithChildren, useContext } from "react";

type FilesContextValue = {
  files: Record<string, string>;
  lastUpdatedAt: number;
};

const defaultValue: FilesContextValue = {
  files: {},
  lastUpdatedAt: 0,
};

const FilesContext = createContext<FilesContextValue>(defaultValue);

type FilesProviderProps = PropsWithChildren<{
  value: FilesContextValue;
}>;

export const FilesProvider = ({ value, children }: FilesProviderProps) => {
  return <FilesContext.Provider value={value}>{children}</FilesContext.Provider>;
};

export const useFiles = () => useContext(FilesContext);
