"use client";

import React, { createContext, useCallback, useContext, useMemo, useState } from "react";

type WidgetVisibilityContextType = {
  /** Whether the feature-request widget should be visible */
  featureRequestVisible: boolean;
  /** Call to hide the feature-request widget */
  hideFeatureRequest: () => void;
  /** Call to show the feature-request widget again */
  showFeatureRequest: () => void;
};

const WidgetVisibilityContext = createContext<WidgetVisibilityContextType>({
  featureRequestVisible: true,
  hideFeatureRequest: () => {},
  showFeatureRequest: () => {},
});

export function WidgetVisibilityProvider({ children }: { children: React.ReactNode }) {
  const [featureRequestVisible, setFeatureRequestVisible] = useState(true);

  const hideFeatureRequest = useCallback(() => setFeatureRequestVisible(false), []);
  const showFeatureRequest = useCallback(() => setFeatureRequestVisible(true), []);

  const value = useMemo(
    () => ({ featureRequestVisible, hideFeatureRequest, showFeatureRequest }),
    [featureRequestVisible, hideFeatureRequest, showFeatureRequest]
  );

  return (
    <WidgetVisibilityContext.Provider value={value}>
      {children}
    </WidgetVisibilityContext.Provider>
  );
}

export function useWidgetVisibility() {
  return useContext(WidgetVisibilityContext);
}
