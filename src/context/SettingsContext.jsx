'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import API_BASE_URL from '@/config/api';

const SettingsContext = createContext(null);

export const SettingsProvider = ({ children }) => {
    const [settings, setSettings] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchSettings = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/settings`, { cache: "no-store" });
            // The settings route may not exist yet (backend lands incrementally). A
            // 404 returns an HTML page, so bail out before trying to parse JSON —
            // otherwise response.json() throws "Unexpected token '<'".
            if (!response.ok) return;
            const contentType = response.headers.get("content-type") || "";
            if (!contentType.includes("application/json")) return;
            const data = await response.json();
            if (data.success) {
                setSettings(data.data);
            }
        } catch {
            // Non-fatal: fall back to i18n defaults silently (no console noise, no
            // Next error overlay) whenever settings are unavailable.
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSettings();
    }, []);

    // Helper function to get setting value based on language
    const getSetting = (key, language = 'en') => {
        if (!settings) return '';

        // If language is Bengali, try to get Bengali version first
        if (language === 'bn') {
            const bnKey = key + 'Bn';
            if (settings[bnKey]) {
                return settings[bnKey];
            }
        }

        return settings[key] || '';
    };

    const value = {
        settings,
        loading,
        getSetting,
        refreshSettings: fetchSettings,
    };

    return (
        <SettingsContext.Provider value={value}>
            {children}
        </SettingsContext.Provider>
    );
};

export const useSettings = () => {
    const context = useContext(SettingsContext);
    if (!context) {
        throw new Error('useSettings must be used within a SettingsProvider');
    }
    return context;
};

export default SettingsContext;
