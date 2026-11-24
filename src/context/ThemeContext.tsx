import React, { createContext, useContext } from 'react';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../theme';

interface ThemeContextType {
  colors: typeof Colors;
  typography: typeof Typography;
  spacing: typeof Spacing;
  radius: typeof BorderRadius;
  shadows: typeof Shadows;
}

const ThemeContext = createContext<ThemeContextType>({
  colors: Colors,
  typography: Typography,
  spacing: Spacing,
  radius: BorderRadius,
  shadows: Shadows,
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <ThemeContext.Provider
      value={{
        colors: Colors,
        typography: Typography,
        spacing: Spacing,
        radius: BorderRadius,
        shadows: Shadows,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
