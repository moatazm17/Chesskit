import { CssBaseline, ThemeProvider, createTheme } from "@mui/material";
import { PropsWithChildren, useMemo, useEffect } from "react";
import { red } from "@mui/material/colors";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { MAIN_THEME_COLOR } from "@/constants";
import { useTranslation } from "@/lib/i18n";

export default function Layout({ children }: PropsWithChildren) {
  const [isDarkMode, setDarkMode] = useLocalStorage("useDarkMode", true);
  const { dir, isRTL } = useTranslation();

  const theme = useMemo(
    () =>
      createTheme({
        direction: isRTL ? "rtl" : "ltr",
        palette: {
          mode: isDarkMode ? "dark" : "light",
          error: {
            main: red[400],
          },
          primary: {
            main: MAIN_THEME_COLOR,
          },
          secondary: {
            main: isDarkMode ? "#424242" : "#ffffff",
          },
        },
      }),
    [isDarkMode, isRTL]
  );

  useEffect(() => {
    document.documentElement.dir = dir;
    document.documentElement.lang = isRTL ? "ar" : "en";
  }, [dir, isRTL]);

  if (isDarkMode === null) return null;

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <main dir={dir}>{children}</main>
    </ThemeProvider>
  );
}
