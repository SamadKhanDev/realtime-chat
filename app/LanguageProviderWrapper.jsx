"use client";
import { LanguageProvider } from "../lib/LanguageContext";

export default function LanguageProviderWrapper({ children }) {
  return <LanguageProvider>{children}</LanguageProvider>;
}
