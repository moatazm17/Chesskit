import React, { useState } from "react";
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

interface PremiumNavBarProps {
  onHomeClick?: () => void;
  onLoadGameClick?: () => void;
}

const PremiumNavBar: React.FC<PremiumNavBarProps> = ({
  onHomeClick,
  onLoadGameClick,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [drawerOpen, setDrawerOpen] = useState(false);

  const MenuOptions = [
    { text: "Home", icon: "mdi:home", href: "/", action: onHomeClick },
    {
      text: "Review Game",
      icon: "streamline:magnifying-glass-solid",
      href: null,
      action: onLoadGameClick,
    },
    { text: "Play", icon: "streamline:chess-pawn", href: "/play" },
    { text: "Saved Games", icon: "streamline:database", href: "/database" },
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
            ♟️ Chess Analysis
          </Typography>
        </Box>

        {/* Spacer */}
        <Box sx={{ flexGrow: 1 }} />

        {/* Right side buttons (removed settings/help) */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }} />
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
            ♟️ Chess Analysis
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
                <ListItemText primary="Privacy" />
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
                <ListItemText primary="Terms" />
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
                  <ListItemText primary="Support" />
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
                  <ListItemText primary="About" />
                </ListItemButton>
              </NavLink>
            </ListItem>
          </List>
        </Box>
      </Drawer>
    </AppBar>
  );
};

export default PremiumNavBar;
