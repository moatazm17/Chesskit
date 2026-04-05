import React, { useState, useEffect, useRef } from "react";
import {
  Box,
  Typography,
  Stack,
  LinearProgress,
  Dialog,
  DialogContent,
  Button,
} from "@mui/material";
import { Icon } from "@iconify/react";
import { useTranslation } from "@/lib/i18n";
import { UserLevel, LevelDef, getLevelNameKey, LEVELS } from "@/lib/puzzleLoader";

interface LevelProgressProps {
  userLevel: UserLevel | null;
  unlockedLevels: LevelDef[];
  selectedLevel: LevelDef | null;
  onSelectLevel: (level: LevelDef | null) => void;
}

const LevelProgress = React.memo(function LevelProgress({
  userLevel,
  unlockedLevels,
  selectedLevel,
  onSelectLevel,
}: LevelProgressProps) {
  const { t } = useTranslation();
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [showSelector, setShowSelector] = useState(false);
  const prevLevelRef = useRef<number | null>(null);

  useEffect(() => {
    if (!userLevel) return;
    if (
      prevLevelRef.current !== null &&
      userLevel.currentLevel > prevLevelRef.current
    ) {
      setShowLevelUp(true);
    }
    prevLevelRef.current = userLevel.currentLevel;
  }, [userLevel?.currentLevel]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!userLevel) return null;

  const activeLevel = selectedLevel || userLevel.levelDef;
  const nameKey = getLevelNameKey(activeLevel.level);
  const levelName = t(nameKey);
  const isOverride = selectedLevel !== null;

  const progressPercent = isOverride
    ? 100
    : Math.min(userLevel.progress * 100, 100);

  const progressText = isOverride
    ? t(getLevelNameKey(userLevel.levelDef.level))
    : t("levelProgress", {
        solved: userLevel.solvedInLevel,
        required: userLevel.requiredForNext,
      });

  const unlockedSet = new Set(unlockedLevels.map((l) => l.level));

  return (
    <>
      <Box
        sx={{
          mt: 2,
          mb: 1,
          px: 1,
          py: 1.5,
          borderRadius: "12px",
          background: "rgba(255,255,255,0.05)",
          border: "1px solid rgba(255,255,255,0.1)",
        }}
      >
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{ mb: 0.5 }}
        >
          <Stack
            direction="row"
            alignItems="center"
            spacing={1}
            onClick={() => setShowSelector(true)}
            sx={{ cursor: "pointer" }}
          >
            <Box
              sx={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: isOverride
                  ? "linear-gradient(135deg, #90CAF9, #42A5F5)"
                  : "linear-gradient(135deg, #FFD700, #FFA500)",
                fontWeight: 800,
                fontSize: "0.8rem",
                color: "#1a1a2e",
              }}
            >
              {activeLevel.level}
            </Box>
            <Typography
              variant="body2"
              sx={{ color: "rgba(255,255,255,0.9)", fontWeight: 600 }}
            >
              {levelName}
            </Typography>
            <Icon
              icon="mdi:chevron-down"
              style={{ fontSize: 16, color: "rgba(255,255,255,0.5)" }}
            />
          </Stack>
          <Typography
            variant="caption"
            sx={{ color: "rgba(255,255,255,0.5)", fontWeight: 500 }}
          >
            {progressText}
          </Typography>
        </Stack>

        <LinearProgress
          variant="determinate"
          value={progressPercent}
          sx={{
            height: 6,
            borderRadius: 3,
            backgroundColor: "rgba(255,255,255,0.1)",
            "& .MuiLinearProgress-bar": {
              borderRadius: 3,
              background: isOverride
                ? "linear-gradient(90deg, #90CAF9, #42A5F5)"
                : "linear-gradient(90deg, #FFD700, #FFA500)",
            },
          }}
        />
      </Box>

      {/* Level Selector Dialog */}
      <Dialog
        open={showSelector}
        onClose={() => setShowSelector(false)}
        PaperProps={{
          sx: {
            background:
              "linear-gradient(160deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
            color: "white",
            borderRadius: "20px",
            maxWidth: 340,
            width: "100%",
          },
        }}
      >
        <DialogContent sx={{ py: 3, px: 2 }}>
          <Typography
            variant="h6"
            sx={{ fontWeight: 700, mb: 2, textAlign: "center" }}
          >
            {t("levelLabel", { level: "" }).replace(/\s+$/, "")}
          </Typography>
          <Stack spacing={1}>
            {LEVELS.map((lvl) => {
              const isUnlocked = unlockedSet.has(lvl.level);
              const isCurrent = lvl.level === userLevel.levelDef.level;
              const isSelected =
                selectedLevel?.level === lvl.level ||
                (!selectedLevel && isCurrent);

              return (
                <Button
                  key={lvl.level}
                  disabled={!isUnlocked}
                  onClick={() => {
                    onSelectLevel(isCurrent ? null : lvl);
                    setShowSelector(false);
                  }}
                  sx={{
                    justifyContent: "flex-start",
                    borderRadius: "12px",
                    py: 1.2,
                    px: 2,
                    textTransform: "none",
                    background: isSelected
                      ? "rgba(255,215,0,0.15)"
                      : "rgba(255,255,255,0.03)",
                    border: isSelected
                      ? "1px solid rgba(255,215,0,0.4)"
                      : "1px solid rgba(255,255,255,0.08)",
                    color: isUnlocked
                      ? "rgba(255,255,255,0.9)"
                      : "rgba(255,255,255,0.25)",
                    "&:hover": {
                      background: isUnlocked
                        ? "rgba(255,215,0,0.1)"
                        : undefined,
                    },
                    "&.Mui-disabled": {
                      color: "rgba(255,255,255,0.25)",
                    },
                  }}
                >
                  <Box
                    sx={{
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: isUnlocked
                        ? "linear-gradient(135deg, #FFD700, #FFA500)"
                        : "rgba(255,255,255,0.1)",
                      fontWeight: 800,
                      fontSize: "0.8rem",
                      color: isUnlocked ? "#1a1a2e" : "rgba(255,255,255,0.3)",
                      mr: 1.5,
                      flexShrink: 0,
                    }}
                  >
                    {isUnlocked ? lvl.level : (
                      <Icon icon="mdi:lock" style={{ fontSize: 14 }} />
                    )}
                  </Box>
                  <Stack alignItems="flex-start" sx={{ flex: 1 }}>
                    <Typography
                      variant="body2"
                      sx={{ fontWeight: 600, lineHeight: 1.2 }}
                    >
                      {t(getLevelNameKey(lvl.level))}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{
                        color: isUnlocked
                          ? "rgba(255,255,255,0.4)"
                          : "rgba(255,255,255,0.15)",
                        fontSize: "0.65rem",
                      }}
                    >
                      {lvl.minRating}–{lvl.maxRating === 9999 ? "2800+" : lvl.maxRating}
                    </Typography>
                  </Stack>
                  {isCurrent && !selectedLevel && (
                    <Icon
                      icon="mdi:star"
                      style={{ fontSize: 16, color: "#FFD700" }}
                    />
                  )}
                  {isSelected && selectedLevel && (
                    <Icon
                      icon="mdi:check"
                      style={{ fontSize: 16, color: "#4CAF50" }}
                    />
                  )}
                </Button>
              );
            })}
          </Stack>
        </DialogContent>
      </Dialog>

      {/* Level Up Dialog */}
      <Dialog
        open={showLevelUp}
        onClose={() => setShowLevelUp(false)}
        PaperProps={{
          sx: {
            background:
              "linear-gradient(160deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
            color: "white",
            borderRadius: "20px",
            maxWidth: 340,
            textAlign: "center",
            overflow: "visible",
          },
        }}
      >
        <DialogContent sx={{ py: 4, px: 3 }}>
          <Box
            sx={{
              fontSize: "3rem",
              mb: 1,
              animation: "levelUpBounce 0.6s ease-out",
              "@keyframes levelUpBounce": {
                "0%": { transform: "scale(0)", opacity: 0 },
                "50%": { transform: "scale(1.3)" },
                "100%": { transform: "scale(1)", opacity: 1 },
              },
            }}
          >
            <Icon
              icon="mdi:trophy"
              style={{ fontSize: 64, color: "#FFD700" }}
            />
          </Box>
          <Typography
            variant="h5"
            sx={{ fontWeight: 800, mb: 1, color: "#FFD700" }}
          >
            {t("levelUp")}
          </Typography>
          <Typography
            variant="body1"
            sx={{ color: "rgba(255,255,255,0.8)", mb: 3 }}
          >
            {t("levelUpDesc", {
              level: userLevel.currentLevel,
              name: t(getLevelNameKey(userLevel.currentLevel)),
            })}
          </Typography>
          <Button
            onClick={() => setShowLevelUp(false)}
            variant="contained"
            fullWidth
            sx={{
              background: "linear-gradient(135deg, #FFD700, #FFA500)",
              color: "#1a1a2e",
              fontWeight: 700,
              py: 1.5,
              borderRadius: "12px",
              textTransform: "none",
              fontSize: "1rem",
            }}
          >
            <Icon
              icon="mdi:arrow-right"
              style={{ fontSize: 20, marginRight: 8 }}
            />
            {t("continue")}
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
});

export default LevelProgress;
