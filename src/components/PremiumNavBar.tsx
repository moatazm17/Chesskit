import React, { useState, useEffect } from "react";
import { useTranslation } from "@/lib/i18n";
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  useTheme,
  useMediaQuery,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
} from "@mui/material";
import { Icon } from "@iconify/react";
import NavLink from "@/components/NavLink";
import { isPremium, shouldGateFeature } from "@/lib/premium";
import PremiumModal from "@/components/PremiumModal";

interface PremiumNavBarProps {
  onHomeClick?: () => void;
  onLoadGameClick?: () => void;
}

const PremiumNavBar: React.FC<PremiumNavBarProps> = ({
  onHomeClick,
  onLoadGameClick,
}) => {
  const { t, locale, setLocale } = useTranslation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [premiumModalOpen, setPremiumModalOpen] = useState(false);
  const [userIsPremium, setUserIsPremium] = useState(false);
  const [showPremiumButton, setShowPremiumButton] = useState(false);

  useEffect(() => {
    setUserIsPremium(isPremium());
    setShowPremiumButton(shouldGateFeature() || isPremium());
  }, []);

  const MenuOptions = [
    { text: t("home"), icon: "mdi:home", href: "/", action: onHomeClick },
    {
      text: t("reviewGame"),
      icon: "streamline:magnifying-glass-solid",
      href: null,
      action: onLoadGameClick,
    },
    { text: t("play"), icon: "streamline:chess-pawn", href: "/play" },
    { text: t("savedGames"), icon: "streamline:database", href: "/database" },
    { text: t("playerInsights"), icon: "mdi:chart-areaspline", href: "/stats" },
  ];

  return (
    <AppBar
      position="static"
      sx={{
        background:
          "linear-gradient(135deg, rgba(26,26,46,0.95) 0%, rgba(22,33,62,0.95) 50%, rgba(15,52,96,0.95) 100%)",
        backdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(255,255,255,0.1)",
        boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
        zIndex: 1000,
      }}
    >
      <Toolbar
        sx={{
          minHeight: isMobile ? "56px" : "64px",
          padding: isMobile ? "0 16px" : "0 24px",
        }}
      >
        {/* Menu Button */}
        <IconButton
          sx={{
            color: "rgba(255,255,255,0.8)",
            backgroundColor: "rgba(255,255,255,0.1)",
            borderRadius: "8px",
            padding: "8px",
            marginRight: 2,
            "&:hover": {
              backgroundColor: "rgba(255,255,255,0.2)",
              color: "white",
            },
          }}
          onClick={() => setDrawerOpen(true)}
        >
          <Icon icon="mdi:menu" style={{ fontSize: "1.2rem" }} />
        </IconButton>

        {/* Logo/Title */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            cursor: "pointer",
            "&:hover": {
              opacity: 0.8,
            },
          }}
          onClick={onHomeClick}
        >
          <Typography
            variant={isMobile ? "h6" : "h5"}
            component="div"
            sx={{
              fontWeight: 700,
              background: "linear-gradient(45deg, #ff6b6b, #4ecdc4, #45b7d1)",
              backgroundClip: "text",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              fontSize: isMobile ? "1.25rem" : "1.5rem",
            }}
          >
            {t("chessAnalysisTitle")}
          </Typography>
        </Box>

        {/* Spacer */}
        <Box sx={{ flexGrow: 1 }} />

        {showPremiumButton && (
          <Box
            onClick={() => {
              if (!userIsPremium) setPremiumModalOpen(true);
            }}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 0.5,
              cursor: userIsPremium ? "default" : "pointer",
              background: userIsPremium
                ? "linear-gradient(135deg, #FFD700, #FFA500)"
                : "rgba(255,215,0,0.12)",
              border: userIsPremium
                ? "none"
                : "1px solid rgba(255,215,0,0.3)",
              borderRadius: "20px",
              padding: "5px 12px",
              transition: "all 0.2s",
              ...(!userIsPremium && {
                "&:hover": {
                  background: "rgba(255,215,0,0.2)",
                  border: "1px solid rgba(255,215,0,0.5)",
                },
              }),
            }}
          >
            <Icon
              icon="mdi:crown"
              style={{
                fontSize: "16px",
                color: userIsPremium ? "#1a1a2e" : "#FFD700",
              }}
            />
            <Typography
              sx={{
                fontSize: "0.75rem",
                fontWeight: 700,
                color: userIsPremium ? "#1a1a2e" : "#FFD700",
              }}
            >
              {userIsPremium ? t("pro") : t("upgrade")}
            </Typography>
          </Box>
        )}
      </Toolbar>

      {/* Navigation Drawer */}
      <Drawer
        anchor="left"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        sx={{
          "& .MuiDrawer-paper": {
            background:
              "linear-gradient(135deg, rgba(26,26,46,0.98) 0%, rgba(22,33,62,0.98) 50%, rgba(15,52,96,0.98) 100%)",
            backdropFilter: "blur(20px)",
            borderRight: "1px solid rgba(255,255,255,0.1)",
            width: 280,
            color: "white",
          },
        }}
      >
        <Box
          sx={{
            padding: 2,
            display: "flex",
            flexDirection: "column",
            height: "100%",
          }}
        >
          <Typography
            variant="h6"
            sx={{
              fontWeight: 700,
              background: "linear-gradient(45deg, #ff6b6b, #4ecdc4, #45b7d1)",
              backgroundClip: "text",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              marginBottom: 3,
            }}
          >
            {t("chessAnalysisTitle")}
          </Typography>

          <List sx={{ flexGrow: 1 }}>
            {MenuOptions.map(({ text, icon, href, action }) => (
              <ListItem key={text} disablePadding sx={{ marginBottom: 1 }}>
                {href ? (
                  <NavLink href={href}>
                    <ListItemButton
                      onClick={() => {
                        setDrawerOpen(false);
                        action?.();
                      }}
                      sx={{
                        borderRadius: "8px",
                        backgroundColor: "rgba(255,255,255,0.05)",
                        "&:hover": {
                          backgroundColor: "rgba(255,255,255,0.1)",
                        },
                      }}
                    >
                      <ListItemIcon sx={{ color: "rgba(255,255,255,0.8)" }}>
                        <Icon icon={icon} style={{ fontSize: "1.5rem" }} />
                      </ListItemIcon>
                      <ListItemText
                        primary={text}
                        sx={{
                          "& .MuiListItemText-primary": {
                            fontWeight: 500,
                            color: "rgba(255,255,255,0.9)",
                          },
                        }}
                      />
                    </ListItemButton>
                  </NavLink>
                ) : (
                  <ListItemButton
                    onClick={() => {
                      setDrawerOpen(false);
                      action?.();
                    }}
                    sx={{
                      borderRadius: "8px",
                      backgroundColor: "rgba(255,255,255,0.05)",
                      "&:hover": {
                        backgroundColor: "rgba(255,255,255,0.1)",
                      },
                      width: "100%",
                    }}
                  >
                    <ListItemIcon sx={{ color: "rgba(255,255,255,0.8)" }}>
                      <Icon icon={icon} style={{ fontSize: "1.5rem" }} />
                    </ListItemIcon>
                    <ListItemText
                      primary={text}
                      sx={{
                        "& .MuiListItemText-primary": {
                          fontWeight: 500,
                          color: "rgba(255,255,255,0.9)",
                        },
                      }}
                    />
                  </ListItemButton>
                )}
              </ListItem>
            ))}
          </List>

          {/* Footer links */}
          <List sx={{ mt: 1 }}>
            {typeof window !== "undefined" && window.location.hostname === "localhost" && (
              <ListItem disablePadding sx={{ mb: 0.5 }}>
                <ListItemButton
                  onClick={() => {
                    setLocale(locale === "ar" ? "en" : "ar");
                    setDrawerOpen(false);
                  }}
                  sx={{ borderRadius: "8px" }}
                >
                  <ListItemIcon sx={{ color: "rgba(255,255,255,0.7)" }}>
                    <Icon icon="mdi:translate" />
                  </ListItemIcon>
                  <ListItemText primary={locale === "ar" ? "English" : "العربية"} />
                </ListItemButton>
              </ListItem>
            )}
            <ListItem disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                onClick={() => {
                  setDrawerOpen(false);
                  window.open(
                    "https://doc-hosting.flycricket.io/chess-review-privacy-policy/4f2c4e45-455f-488a-8e23-e3728b7bb98f/privacy",
                    "_blank"
                  );
                }}
                sx={{ borderRadius: "8px" }}
              >
                <ListItemIcon sx={{ color: "rgba(255,255,255,0.7)" }}>
                  <Icon icon="mdi:shield-account" />
                </ListItemIcon>
                <ListItemText primary={t("privacy")} />
              </ListItemButton>
            </ListItem>
            <ListItem disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                onClick={() => {
                  setDrawerOpen(false);
                  window.open(
                    "https://doc-hosting.flycricket.io/terms/38e8128e-1d6d-447e-8fce-6cf3e31f4617/terms",
                    "_blank"
                  );
                }}
                sx={{ borderRadius: "8px" }}
              >
                <ListItemIcon sx={{ color: "rgba(255,255,255,0.7)" }}>
                  <Icon icon="mdi:file-document" />
                </ListItemIcon>
                <ListItemText primary={t("terms")} />
              </ListItemButton>
            </ListItem>
            <ListItem disablePadding sx={{ mb: 0.5 }}>
              <NavLink href="/support">
                <ListItemButton
                  onClick={() => setDrawerOpen(false)}
                  sx={{ borderRadius: "8px" }}
                >
                  <ListItemIcon sx={{ color: "rgba(255,255,255,0.7)" }}>
                    <Icon icon="mdi:lifebuoy" />
                  </ListItemIcon>
                  <ListItemText primary={t("support")} />
                </ListItemButton>
              </NavLink>
            </ListItem>
            <ListItem disablePadding>
              <NavLink href="/about">
                <ListItemButton
                  onClick={() => setDrawerOpen(false)}
                  sx={{ borderRadius: "8px" }}
                >
                  <ListItemIcon sx={{ color: "rgba(255,255,255,0.7)" }}>
                    <Icon icon="mdi:information" />
                  </ListItemIcon>
                  <ListItemText primary={t("about")} />
                </ListItemButton>
              </NavLink>
            </ListItem>
          </List>
        </Box>
      </Drawer>
      <PremiumModal
        open={premiumModalOpen}
        onClose={() => setPremiumModalOpen(false)}
        trigger="navbar"
      />
    </AppBar>
  );
};

export default PremiumNavBar;
