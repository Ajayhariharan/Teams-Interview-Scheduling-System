import React, { createContext, useContext, useEffect, useState } from 'react';

export type Theme = 'dark' | 'light';
export type DesignVariant = 'neo' | 'modern';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  designVariant: DesignVariant;
  toggleDesignVariant: () => void;
  setDesignVariant: (variant: DesignVariant) => void;
  isNeo: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    const saved = localStorage.getItem('ips_theme');
    if (saved === 'light' || saved === 'dark') return saved;
    return 'light';
  });

  const [designVariant, setDesignVariantState] = useState<DesignVariant>(() => {
    const saved = localStorage.getItem('ips_design_variant');
    if (saved === 'modern' || saved === 'neo') return saved;
    return 'neo'; // default to current new Neo-Brutalism theme
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.remove('dark');
      root.classList.add('light');
    }
    localStorage.setItem('ips_theme', theme);
  }, [theme]);

  useEffect(() => {
    const root = document.documentElement;
    if (designVariant === 'neo') {
      root.classList.add('theme-neo');
      root.classList.remove('theme-modern');
    } else {
      root.classList.remove('theme-neo');
      root.classList.add('theme-modern');
    }
    localStorage.setItem('ips_design_variant', designVariant);
  }, [designVariant]);

  const toggleTheme = () => {
    setThemeState((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  const toggleDesignVariant = () => {
    setDesignVariantState((prev) => (prev === 'neo' ? 'modern' : 'neo'));
  };

  const setDesignVariant = (variant: DesignVariant) => {
    setDesignVariantState(variant);
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        toggleTheme,
        setTheme,
        designVariant,
        toggleDesignVariant,
        setDesignVariant,
        isNeo: designVariant === 'neo',
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
