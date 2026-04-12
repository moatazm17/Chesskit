import Board from "@/sections/analysis/board";
import PanelHeader from "@/sections/analysis/panelHeader";
import BoardNavigation from "@/sections/analysis/boardNavigation";
import AnalysisTab from "@/sections/analysis/panelBody/analysisTab";
import ClassificationTab from "@/sections/analysis/panelBody/classificationTab";
import { engineNameAtom, gameEvalAtom } from "@/sections/analysis/states";
import {
  Box,
  Divider,
  Tab,
  Tabs,
  Typography,
  useMediaQuery,
} from "@mui/material";
import { useAtomValue } from "jotai";
import { useState, useEffect, useCallback } from "react";
import { Icon } from "@iconify/react";
import EngineSettingsButton from "@/sections/engineSettings/engineSettingsButton";
import dynamic from "next/dynamic";
import { PageTitle } from "@/components/pageTitle";
import { useTranslation } from "@/lib/i18n";
import ClassificationBanner from "@/components/ClassificationBanner";
import { useCurrentPosition } from "@/sections/analysis/hooks/useCurrentPosition";
import { useEngine } from "@/hooks/useEngine";

const GraphTab = dynamic(
  () => import("@/sections/analysis/panelBody/graphTab"),
  { ssr: false }
);

interface AnalysisViewProps {
  showMovesTab: boolean;
}

export default function AnalysisView({ showMovesTab }: AnalysisViewProps) {
  const { t } = useTranslation();
  const isDesktop = useMediaQuery("(min-width: 810px)");
  const gameEval = useAtomValue(gameEvalAtom);
  const [tab, setTab] = useState(0);
  const engineName = useAtomValue(engineNameAtom);
  const engine = useEngine(engineName);
  useCurrentPosition(engine);
  const [showMore, setShowMore] = useState(false);
  const toggleMore = useCallback(() => setShowMore((v) => !v), []);

  useEffect(() => {
    if (tab === 1 && !showMovesTab) setTab(0);
    if (tab === 2 && !gameEval) setTab(0);
  }, [showMovesTab, gameEval, tab]);

  // On mobile with completed analysis, show the clean review layout
  const isReviewMode = !isDesktop && !!gameEval;

  if (!isDesktop) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          background: `linear-gradient(135deg, rgba(26,26,46,0.95) 0%, rgba(22,33,62,0.95) 50%, rgba(15,52,96,0.95) 100%)`,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <PageTitle title={t("gameAnalysis")} />

        {/* Classification Banner - fixed height, no layout shift */}
        {isReviewMode && (
          <Box sx={{ px: 1, pt: 1 }}>
            <ClassificationBanner />
          </Box>
        )}

        {/* Board - maximized */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            px: 0.5,
            py: isReviewMode ? 0.5 : 1,
          }}
        >
          <Board />
        </Box>

        {/* Navigation - compact */}
        {isReviewMode && <BoardNavigation />}

        {/* "More" toggle button */}
        {isReviewMode && (
          <Box
            onClick={toggleMore}
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 0.5,
              py: 0.8,
              cursor: "pointer",
              borderTop: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <Typography
              sx={{
                color: "rgba(255,255,255,0.45)",
                fontSize: "0.8rem",
                fontWeight: 600,
              }}
            >
              {showMore ? t("showLess") : t("showMore")}
            </Typography>
            <Icon
              icon={showMore ? "mdi:chevron-up" : "mdi:chevron-down"}
              width={18}
              height={18}
              style={{ color: "rgba(255,255,255,0.35)" }}
            />
          </Box>
        )}

        {/* Expandable panel with tabs */}
        {isReviewMode && showMore && (
          <Box
            sx={{
              flex: 1,
              mx: 1,
              mb: 1,
              borderRadius: 3,
              border: "1px solid rgba(255,255,255,0.1)",
              backgroundColor: "rgba(255,255,255,0.05)",
              backdropFilter: "blur(10px)",
              boxShadow: "0 4px 20px rgba(0, 0, 0, 0.3)",
              p: 2,
              display: "flex",
              flexDirection: "column",
              gap: 2,
              overflow: "auto",
            }}
          >
            <Box
              sx={{
                display: "flex",
                justifyContent: "center",
              }}
            >
              <Box
                sx={{
                  backgroundColor: "rgba(0,0,0,0.4)",
                  borderRadius: "16px",
                  padding: "4px",
                  display: "flex",
                  gap: "4px",
                }}
              >
                <Tabs
                  value={tab}
                  onChange={(_, newValue) => setTab(newValue)}
                  variant="fullWidth"
                  sx={{
                    minHeight: 0,
                    "& .MuiTabs-indicator": { display: "none" },
                    "& .MuiTab-root": {
                      minHeight: 36,
                      fontSize: "0.8rem",
                      fontWeight: 600,
                      textTransform: "none",
                      borderRadius: "12px",
                      color: "rgba(255,255,255,0.5)",
                      px: 2,
                      "&.Mui-selected": {
                        backgroundColor: "rgba(76,175,80,0.2)",
                        color: "#4CAF50",
                      },
                    },
                  }}
                >
                  <Tab label={t("analysis")} id="tab0" disableFocusRipple />
                  <Tab
                    label={t("moves")}
                    id="tab1"
                    sx={{ display: showMovesTab ? undefined : "none" }}
                    disableFocusRipple
                  />
                  <Tab
                    label={t("graph")}
                    id="tab2"
                    disableFocusRipple
                  />
                </Tabs>
              </Box>
            </Box>

            <GraphTab role="tabpanel" hidden={tab !== 2} id="tabContent2" />
            <AnalysisTab role="tabpanel" hidden={tab !== 0} id="tabContent0" />
            <ClassificationTab role="tabpanel" hidden={tab !== 1} id="tabContent1" />

            <Divider sx={{ marginX: "5%", mb: 1 }} />
            <PanelHeader key="analysis-panel-header" />
          </Box>
        )}

        {/* Panel: show when no analysis yet */}
        {!isReviewMode && (
          <Box
            sx={{
              flex: 1,
              mx: 1,
              mb: 1,
              borderRadius: 3,
              border: "1px solid rgba(255,255,255,0.1)",
              backgroundColor: "rgba(255,255,255,0.05)",
              backdropFilter: "blur(10px)",
              boxShadow: "0 4px 20px rgba(0, 0, 0, 0.3)",
              p: 2,
              display: "flex",
              flexDirection: "column",
              gap: 2,
            }}
          >
            <PanelHeader key="analysis-panel-header" />
          </Box>
        )}

        <EngineSettingsButton />
      </Box>
    );
  }

  // Desktop / iPad layout
  return (
    <Box
      sx={{
        minHeight: "calc(100vh - 64px)",
        background: `linear-gradient(135deg, rgba(26,26,46,0.8) 0%, rgba(22,33,62,0.8) 50%, rgba(15,52,96,0.8) 100%), url('/chessreviewbg.webp')`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      <PageTitle title={t("gameAnalysis")} />

      <Box
        sx={{
          display: "flex",
          gap: 3,
          maxWidth: "1600px",
          mx: "auto",
          px: 2,
          pt: 1,
          alignItems: "flex-start",
          height: "calc(100vh - 80px)",
        }}
      >
        {/* Left column: Board only */}
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            flexShrink: 0,
          }}
        >
          <Board />
        </Box>

        {/* Right column: Panel */}
        <Box
          sx={{
            flex: 1,
            minWidth: 0,
            height: "100%",
            display: "flex",
            flexDirection: "column",
            gap: 1.5,
            borderRadius: 3,
            border: "1px solid rgba(255,255,255,0.1)",
            backgroundColor: "rgba(255,255,255,0.05)",
            backdropFilter: "blur(10px)",
            boxShadow: "0 4px 20px rgba(0, 0, 0, 0.3)",
            p: 2,
            overflow: "hidden",
          }}
        >
          {/* Classification Banner */}
          {gameEval && <ClassificationBanner />}

          {/* Navigation: move wheel + arrows */}
          {gameEval && <BoardNavigation />}

          <PanelHeader key="analysis-panel-header" />
          <Divider sx={{ marginX: "5%" }} />

          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              px: 2,
            }}
          >
            <Tabs
              value={tab}
              onChange={(_, newValue) => setTab(newValue)}
              aria-label="Analysis tabs"
              variant="fullWidth"
              sx={{
                minHeight: 0,
                width: "100%",
                maxWidth: "480px",
                "& .MuiTabs-indicator": { display: "none" },
                "& .MuiTab-root": {
                  minHeight: 44,
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  textTransform: "none",
                  borderRadius: "12px",
                  color: "rgba(255,255,255,0.6)",
                  "&.Mui-selected": {
                    backgroundColor: "rgba(76,175,80,0.2)",
                    color: "#4CAF50",
                    fontWeight: 700,
                  },
                },
              }}
            >
              <Tab
                label={t("analysis")}
                id="tab0"
                icon={<Icon icon="mdi:chart-box" />}
                iconPosition="start"
                disableFocusRipple
              />
              <Tab
                label={t("moves")}
                id="tab1"
                icon={<Icon icon="mdi:chess-pawn" />}
                iconPosition="start"
                sx={{ display: showMovesTab ? undefined : "none" }}
                disableFocusRipple
              />
              <Tab
                label={t("graph")}
                id="tab2"
                icon={<Icon icon="mdi:chart-line-variant" />}
                iconPosition="start"
                sx={{ display: gameEval ? undefined : "none" }}
                disableFocusRipple
              />
            </Tabs>
          </Box>

          <Box sx={{ flex: 1, overflow: "auto", minHeight: 0 }}>
            <GraphTab role="tabpanel" hidden={tab !== 2} id="tabContent2" />
            <AnalysisTab role="tabpanel" hidden={tab !== 0} id="tabContent0" />
            <ClassificationTab role="tabpanel" hidden={tab !== 1} id="tabContent1" />
          </Box>
        </Box>
      </Box>

      <EngineSettingsButton />
    </Box>
  );
}
