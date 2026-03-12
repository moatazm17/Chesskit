import React, { useState, useEffect, useCallback } from "react";
import { useTranslation } from "@/lib/i18n";
import {
  Dialog,
  DialogContent,
  Box,
  Typography,
  Button,
  Stack,
  useTheme,
  useMediaQuery,
  IconButton,
  Chip,
  Snackbar,
  Alert,
} from "@mui/material";
import { Icon } from "@iconify/react";
import { requestPurchase, requestRestore } from "@/lib/premium";
import { logAnalyticsEvent } from "@/lib/firebase";

interface PremiumModalProps {
  open: boolean;
  onClose: () => void;
  trigger?: string;
}

const FEATURE_KEYS = [
  { icon: "mdi:microscope", labelKey: "deepAnalysis", descKey: "deepAnalysisDesc" },
  { icon: "mdi:puzzle", labelKey: "unlimitedPuzzles", descKey: "unlimitedPuzzlesDesc" },
  { icon: "mdi:crown", labelKey: "unlimitedCheckmate", descKey: "unlimitedCheckmateDesc" },
  { icon: "mdi:chess-knight", labelKey: "playVsLegendsFeature", descKey: "playVsLegendsDesc" },
  { icon: "mdi:lightbulb", labelKey: "unlimitedHints", descKey: "unlimitedHintsDesc" },
  { icon: "mdi:cancel", labelKey: "noAds", descKey: "noAdsDesc" },
];

function getPrices() {
  const w = (typeof window !== "undefined" ? window : {}) as any;
  const p = w._premiumPrices;
  return {
    monthlyPrice: p?.monthlyPrice || "$0.99",
    yearlyPrice: p?.yearlyPrice || "$4.99",
    monthlyPerMonth: p?.monthlyPerMonth || "$0.99",
    yearlyPerMonth: p?.yearlyPerMonth || "$0.42",
  };
}

export default function PremiumModal({ open, onClose, trigger }: PremiumModalProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [selectedPlan, setSelectedPlan] = useState<"monthly" | "yearly">("yearly");
  const [loading, setLoading] = useState(false);
  const [snack, setSnack] = useState<{ open: boolean; message: string; severity: "success" | "error" | "info" }>({
    open: false, message: "", severity: "info",
  });
  const prices = getPrices();

  const handleFeedback = useCallback((type: string, message: string) => {
    setLoading(false);
    if (type === "success") {
      setSnack({ open: true, message, severity: "success" });
      setTimeout(() => onClose(), 1500);
    } else if (type === "error") {
      setSnack({ open: true, message, severity: "error" });
    } else if (type === "info") {
      setSnack({ open: true, message, severity: "info" });
    }
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const w = window as any;
    w._onPurchaseFeedback = handleFeedback;
    return () => { delete w._onPurchaseFeedback; };
  }, [open, handleFeedback]);

  const handlePurchase = () => {
    const productId = selectedPlan === "monthly" ? "premium_monthly" as const : "premium_yearly" as const;
    logAnalyticsEvent("premium_purchase_tap", { plan: selectedPlan, trigger: trigger || "unknown" });
    setLoading(true);
    requestPurchase(productId);
  };

  const handleRestore = () => {
    logAnalyticsEvent("premium_restore_tap", { trigger: trigger || "unknown" });
    setLoading(true);
    requestRestore();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullScreen={isMobile}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          background: "linear-gradient(160deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
          color: "white",
          borderRadius: isMobile ? 0 : "20px",
          overflow: "hidden",
        },
      }}
    >
      <IconButton
        onClick={onClose}
        sx={{
          position: "absolute",
          top: 8,
          right: 8,
          color: "rgba(255,255,255,0.5)",
          zIndex: 1,
          "&:hover": { color: "white" },
        }}
      >
        <Icon icon="mdi:close" style={{ fontSize: 24 }} />
      </IconButton>

      <DialogContent sx={{ p: 0, overflow: "auto" }}>
        <Box sx={{ px: 3, pt: 4, pb: 2, textAlign: "center" }}>
          <Box
            sx={{
              width: 64,
              height: 64,
              borderRadius: "16px",
              background: "linear-gradient(135deg, #FFD700, #FFA500)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px auto",
              boxShadow: "0 8px 24px rgba(255, 165, 0, 0.3)",
            }}
          >
            <Icon icon="mdi:crown" style={{ fontSize: 36, color: "white" }} />
          </Box>
          <Typography sx={{ fontSize: "1.6rem", fontWeight: 800, mb: 0.5 }}>
            {t("chessAnalysisPro")}
          </Typography>
          <Typography sx={{ fontSize: "0.9rem", color: "rgba(255,255,255,0.6)" }}>
            {t("unlockFullPower")}
          </Typography>
        </Box>

        {/* Features */}
        <Box sx={{ px: 3, py: 2 }}>
          {FEATURE_KEYS.map((feat) => (
            <Box
              key={feat.labelKey}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1.5,
                py: 1.2,
                borderBottom: "1px solid rgba(255,255,255,0.06)",
                "&:last-child": { borderBottom: "none" },
              }}
            >
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: "10px",
                  background: "rgba(255,165,0,0.15)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Icon icon={feat.icon} style={{ fontSize: 20, color: "#FFD700" }} />
              </Box>
              <Box>
                <Typography sx={{ fontSize: "0.9rem", fontWeight: 600 }}>
                  {t(feat.labelKey)}
                </Typography>
                <Typography sx={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.5)" }}>
                  {t(feat.descKey)}
                </Typography>
              </Box>
              <Icon
                icon="mdi:check-circle"
                style={{ fontSize: 20, color: "#4CAF50", marginLeft: "auto", flexShrink: 0 }}
              />
            </Box>
          ))}
        </Box>

        {/* Plan Selection */}
        <Box sx={{ px: 3, py: 2 }}>
          <Stack spacing={1.5}>
            {/* Yearly plan */}
            <Box
              onClick={() => setSelectedPlan("yearly")}
              sx={{
                border: selectedPlan === "yearly"
                  ? "2px solid #FFD700"
                  : "2px solid rgba(255,255,255,0.1)",
                borderRadius: "14px",
                p: 2,
                cursor: "pointer",
                position: "relative",
                transition: "all 0.2s",
                background: selectedPlan === "yearly"
                  ? "rgba(255,215,0,0.08)"
                  : "transparent",
                "&:hover": {
                  borderColor: selectedPlan === "yearly" ? "#FFD700" : "rgba(255,255,255,0.25)",
                },
              }}
            >
              <Chip
                label={t("bestValue")}
                size="small"
                sx={{
                  position: "absolute",
                  top: -10,
                  right: 16,
                  background: "linear-gradient(135deg, #FFD700, #FFA500)",
                  color: "#1a1a2e",
                  fontWeight: 700,
                  fontSize: "0.65rem",
                  height: 20,
                }}
              />
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Box>
                  <Typography sx={{ fontWeight: 700, fontSize: "1rem" }}>{t("yearly")}</Typography>
                  <Typography sx={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.5)" }}>
                    {prices.yearlyPerMonth}{t("perMonth")}
                  </Typography>
                </Box>
                <Box sx={{ textAlign: "right" }}>
                  <Typography sx={{ fontWeight: 800, fontSize: "1.2rem" }}>{prices.yearlyPrice}</Typography>
                  <Typography sx={{ fontSize: "0.7rem", color: "#4CAF50" }}>{t("bestValue")}</Typography>
                </Box>
              </Box>
            </Box>

            {/* Monthly plan */}
            <Box
              onClick={() => setSelectedPlan("monthly")}
              sx={{
                border: selectedPlan === "monthly"
                  ? "2px solid #42A5F5"
                  : "2px solid rgba(255,255,255,0.1)",
                borderRadius: "14px",
                p: 2,
                cursor: "pointer",
                transition: "all 0.2s",
                background: selectedPlan === "monthly"
                  ? "rgba(66,165,245,0.08)"
                  : "transparent",
                "&:hover": {
                  borderColor: selectedPlan === "monthly" ? "#42A5F5" : "rgba(255,255,255,0.25)",
                },
              }}
            >
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Typography sx={{ fontWeight: 700, fontSize: "1rem" }}>{t("monthly")}</Typography>
                <Typography sx={{ fontWeight: 800, fontSize: "1.2rem" }}>{prices.monthlyPrice}</Typography>
              </Box>
            </Box>
          </Stack>
        </Box>

        {/* CTA Button */}
        <Box sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={handlePurchase}
            variant="contained"
            fullWidth
            size="large"
            sx={{
              background: "linear-gradient(135deg, #FFD700, #FFA500)",
              color: "#1a1a2e",
              fontWeight: 800,
              py: 1.8,
              borderRadius: "14px",
              textTransform: "none",
              fontSize: "1.05rem",
              boxShadow: "0 8px 24px rgba(255, 165, 0, 0.35)",
              "&:hover": {
                background: "linear-gradient(135deg, #FFA500, #FF8C00)",
                boxShadow: "0 12px 32px rgba(255, 165, 0, 0.5)",
                transform: "translateY(-1px)",
              },
              transition: "all 0.2s",
            }}
          >
            {loading ? t("processing") : t("subscribeNow")}
          </Button>

          <Button
            onClick={handleRestore}
            size="small"
            sx={{
              color: "rgba(255,255,255,0.4)",
              textTransform: "none",
              fontSize: "0.8rem",
              mt: 1.5,
              display: "block",
              mx: "auto",
              "&:hover": { color: "rgba(255,255,255,0.7)" },
            }}
          >
            {t("restorePurchase")}
          </Button>
        </Box>
      </DialogContent>

      <Snackbar
        open={snack.open}
        autoHideDuration={4000}
        onClose={() => setSnack((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          severity={snack.severity}
          onClose={() => setSnack((s) => ({ ...s, open: false }))}
          sx={{ width: "100%", fontWeight: 600 }}
        >
          {snack.message}
        </Alert>
      </Snackbar>
    </Dialog>
  );
}
