"use client";

import type { ReactNode } from "react";
import { Provider } from "react-redux";
import { store } from "@/redux/store";
import { LanguageProvider } from "@/context/LanguageContext";
import { SettingsProvider } from "@/context/SettingsContext";
import SessionKeeper from "@/components/auth/SessionKeeper";
import ThemeProvider from "@/components/theme/ThemeProvider";

// Client-side app providers. Wraps the tree in the Redux store, the i18n
// LanguageProvider, and the SettingsProvider (site-wide settings fetched from
// the backend) so all three are available to every client component.
//
// SessionKeeper renders nothing — it installs the fetch interceptor that keeps
// the access token renewed. It sits outermost so it is running before any page
// makes its first API call.
//
// ThemeProvider owns the light/dark/system choice. It renders no markup either;
// the actual first paint is handled earlier by ThemeScript in the root layout,
// and this provider takes over from there (persistence, live OS changes,
// cross-tab sync) and feeds the toggle in the dashboard topbar.
export default function Providers({ children }: { children: ReactNode }) {
  return (
    <Provider store={store}>
      <SessionKeeper />
      <ThemeProvider>
        <LanguageProvider>
          <SettingsProvider>{children}</SettingsProvider>
        </LanguageProvider>
      </ThemeProvider>
    </Provider>
  );
}
