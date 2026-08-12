"use client";

import type { ReactNode } from "react";
import { Provider } from "react-redux";
import { store } from "@/redux/store";
import { LanguageProvider } from "@/context/LanguageContext";
import { SettingsProvider } from "@/context/SettingsContext";
import SessionKeeper from "@/components/auth/SessionKeeper";

// Client-side app providers. Wraps the tree in the Redux store, the i18n
// LanguageProvider, and the SettingsProvider (site-wide settings fetched from
// the backend) so all three are available to every client component.
//
// SessionKeeper renders nothing — it installs the fetch interceptor that keeps
// the access token renewed. It sits outermost so it is running before any page
// makes its first API call.
export default function Providers({ children }: { children: ReactNode }) {
  return (
    <Provider store={store}>
      <SessionKeeper />
      <LanguageProvider>
        <SettingsProvider>{children}</SettingsProvider>
      </LanguageProvider>
    </Provider>
  );
}
