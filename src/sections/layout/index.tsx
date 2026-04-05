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
        direction: "ltr",
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
    document.documentElement.lang = isRTL ? "ar" : "en";
  }, [isRTL]);

  if (isDarkMode === null) return null;

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <main>{children}</main>
      {isRTL && (
        <style>{`
          .MuiTypography-root, .MuiTab-root,
          .MuiMenuItem-root, .MuiInputBase-root, .MuiFormLabel-root,
          .MuiDialogTitle-root,
          .MuiAlert-root, .MuiSnackbarContent-root,
          .MuiCardContent-root, .MuiListItemText-root {
            direction: rtl;
          }
          .MuiDialogContent-root {
            direction: rtl;
          }
          .MuiListItemText-root,
          .MuiMenuItem-root,
          .MuiInputBase-root,
          .MuiAlert-root {
            text-align: right;
          }
        `}</style>
      )}
    </ThemeProvider>
  );
}
