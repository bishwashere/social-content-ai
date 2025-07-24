"use client";

import { FirstViewTooltipType, TooltipKeysType } from "@/db/first-view-tooltip/schema";
import { getFirstViewTooltip, updateFirstViewTooltip } from "@/server-actions/first-view-tooltip";
import { useSession } from '@/backend-apis/auth/hooks'
import React, { createContext, useContext, useState, useCallback, useEffect } from "react";

interface TooltipFn {
    show: () => void;
    hide: () => void;
    order: number;
}

interface TooltipManagerContextProps {
    registerTooltip: (tooltipKey: string, order: number, showFn: () => void, hideFn: () => void) => void;
    unregisterTooltip: (tooltipKey: string) => void;
    currentTooltip: string | null;
    showNextTooltip: () => void;
    checkTooltipSeen: (tooltipKey: TooltipKeysType) => boolean;
    markTooltipSeen: (tooltipKey: TooltipKeysType) => Promise<void>;
    isTooltipDataLoaded: boolean;
}

const TooltipManagerContext = createContext<TooltipManagerContextProps | null>(null);

export const TooltipManagerProvider = ({ children }: { children: React.ReactNode }) => {
    const { data } = useSession();
    const [tooltips, setTooltips] = useState<Record<string, TooltipFn>>({});
    const [currentTooltip, setCurrentTooltip] = useState<string | null>(null);
    const [firstViewTooltipKeys, setFirstViewTooltipKeys] = useState<FirstViewTooltipType | null>(null);
    const [isTooltipDataLoaded, setIsTooltipDataLoaded] = useState(false);

    // Fetch first-view tooltip data for user
    useEffect(() => {
    if (!data?.user?._id || isTooltipDataLoaded) return;
    (async () => {
        const tooltipData = await getFirstViewTooltip(data.user._id);
        const { addProject, contentPlanner, quickGenerate } = tooltipData;
        setFirstViewTooltipKeys({ addProject, contentPlanner, quickGenerate });
        setIsTooltipDataLoaded(true);
    })();
}, [data?.user?._id]);

    // Check if tooltip was already shown
    const checkTooltipSeen = useCallback(
        (tooltipKey: TooltipKeysType) => {
            if (!tooltipKey) return true;
            if(!firstViewTooltipKeys) return true;
            return !!firstViewTooltipKeys?.[tooltipKey];
        },
        [firstViewTooltipKeys]
    );

    // Mark tooltip as seen
    const markTooltipSeen = useCallback(
        async (tooltipKey: TooltipKeysType) => {
            if (!data?.user?._id) return;
            if (!tooltipKey) return;
            await updateFirstViewTooltip(data.user._id, { [tooltipKey]: true });
            setFirstViewTooltipKeys((prev) => (prev ? { ...prev, [tooltipKey]: true } : prev));
        },
        [data?.user?._id]
    );

    // Sort tooltip keys by order
    const getSortedKeys = useCallback(
        () =>
            Object.entries(tooltips)
                .sort(([, a], [, b]) => a.order - b.order)
                .map(([key]) => key),
        [tooltips]
    );

    const registerTooltip = useCallback(
        (tooltipKey: string, order: number, showFn: () => void, hideFn: () => void) => {
            setTooltips((prev) => {
                const updated = { ...prev, [tooltipKey]: { order, show: showFn, hide: hideFn } };
                const sortedKeys = Object.entries(updated).sort(([, a], [, b]) => a.order - b.order);
                if (!currentTooltip && sortedKeys.length > 0) {
                    const firstKey = sortedKeys[0][0];
                    updated[firstKey].show();
                    setCurrentTooltip(firstKey);
                }
                return updated;
            });
        },
        [currentTooltip]
    );

    const unregisterTooltip = useCallback((tooltipKey: string) => {
        setTooltips((prev) => {
            const newTooltips = { ...prev };
            delete newTooltips[tooltipKey];
            return newTooltips;
        });
    }, []);

    const showNextTooltip = useCallback(() => {
        const keys = getSortedKeys();
        if (!keys.length) {
            setCurrentTooltip(null);
            return;
        }
        const currentIndex = keys.indexOf(currentTooltip || "");
        if (currentIndex >= 0 && currentIndex < keys.length - 1) {
            const nextKey = keys[currentIndex + 1];
            tooltips[currentTooltip!]?.hide();
            tooltips[nextKey]?.show();
            setCurrentTooltip(nextKey);
        } else {
            setCurrentTooltip(null);
        }
    }, [tooltips, currentTooltip, getSortedKeys]);

    return (
        <TooltipManagerContext.Provider
            value={{
                registerTooltip,
                unregisterTooltip,
                currentTooltip,
                showNextTooltip,
                checkTooltipSeen,
                markTooltipSeen,
                isTooltipDataLoaded
            }}
        >
            {children}
        </TooltipManagerContext.Provider>
    );
};

export const useTooltipManager = () => {
    const context = useContext(TooltipManagerContext);
    if (!context) throw new Error("useTooltipManager must be used within TooltipManagerProvider");
    return context;
};
