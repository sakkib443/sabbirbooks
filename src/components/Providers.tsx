"use client";

import type { ReactNode } from "react";
import { Provider } from "react-redux";
import { store } from "@/redux/store";
import { LanguageProvider } from "@/context/LanguageContext";
import { SettingsProvider } from "@/context/SettingsContext";

// Client-side app providers. Wraps the tree in the Redux store, the i18n
// LanguageProvider, and the SettingsProvider (site-wide settings fetched from
// the backend) so all three are available to every client component.
export default function Providers({ children }: { children: ReactNode }) {
  return (
    <Provider store={store}>
      <LanguageProvider>
        <SettingsProvider>{children}</SettingsProvider>
      </LanguageProvider>
    </Provider>
  );
}
