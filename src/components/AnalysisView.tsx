import Board from "@/sections/analysis/board";
import PanelHeader from "@/sections/analysis/panelHeader";
import BoardNavigation from "@/sections/analysis/boardNavigation";
import AnalysisTab from "@/sections/analysis/panelBody/analysisTab";
import ClassificationTab from "@/sections/analysis/panelBody/classificationTab";
import { gameEvalAtom } from "@/sections/analysis/states";
import {
  Box,
  Divider,
  Grid2 as Grid,
  Tab,
  Tabs,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { useAtomValue } from "jotai";
import { useState, useEffect } from "react";
import { Icon } from "@iconify/react";
import EngineSettingsButton from "@/sections/engineSettings/engineSettingsButton";
import dynamic from "next/dynamic";
import { PageTitle } from "@/components/pageTitle";
import { useTranslation } from "@/lib/i18n";

const GraphTab = dynamic(
  () => import("@/sections/analysis/panelBody/graphTab"),
  { ssr: false }
);

interface AnalysisViewProps {
  showMovesTab: boolean;
}

export default function AnalysisView({ showMovesTab }: AnalysisViewProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const isLgOrGreater = useMediaQuery(theme.breakpoints.up("lg"));
  const gameEval = useAtomValue(gameEvalAtom);
  const [tab, setTab] = useState(0);

  useEffect(() => {
    if (tab === 1 && !showMovesTab) setTab(0);
    if (tab === 2 && !gameEval) setTab(0);
  }, [showMovesTab, gameEval, tab]);

  return (
    <Box
      sx={{
        minHeight: 'calc(100vh - 64px)',
        background: `linear-gradient(135deg, rgba(26,26,46,0.8) 0%, rgba(22,33,62,0.8) 50%, rgba(15,52,96,0.8) 100%), url('/chessreviewbg.webp')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        padding: isLgOrGreater ? 0 : '8px'
      }}
    >
      <Grid
        container
        gap={isLgOrGreater ? 4 : 2}
        justifyContent="space-evenly"
        alignItems="start"
        sx={{
          padding: isLgOrGreater ? 0 : '8px',
          maxWidth: '100vw',
          overflow: 'hidden'
        }}
      >
        <PageTitle title={t("gameAnalysis")} />

        <Board />

        <BoardNavigation />

        <Grid
          container
          justifyContent="start"
          alignItems="center"
          borderRadius={3}
          border={1}
          borderColor={"secondary.main"}
          sx={{
            backgroundColor: "rgba(255,255,255,0.05)",
            borderColor: "rgba(255,255,255,0.1)",
            borderWidth: 1,
            boxShadow: "0 4px 20px rgba(0, 0, 0, 0.3)",
            margin: isLgOrGreater ? 0 : '0 8px',
            width: isLgOrGreater ? 'auto' : 'calc(100% - 16px)',
            backdropFilter: 'blur(10px)'
          }}
          padding={2}
          style={{
            maxWidth: "1200px",
          }}
          rowGap={2}
          height={{ xs: tab === 1 ? "40rem" : "auto", lg: "calc(95vh - 60px)" }}
          display="flex"
          flexDirection="column"
          flexWrap="nowrap"
          size={{
            xs: 12,
            lg: "grow",
          }}
        >
          {isLgOrGreater && (
            <Box width="100%">
              <PanelHeader key="analysis-panel-header" />
              <Divider sx={{ marginX: "5%", marginTop: 2.5 }} />
            </Box>
          )}

          {!isLgOrGreater && !gameEval && <Divider sx={{ marginX: "5%" }} />}
          {!isLgOrGreater && !gameEval && (
            <PanelHeader key="analysis-panel-header" />
          )}

          {!isLgOrGreater && (
            <Box
              width="100%"
              sx={{
                display: 'flex',
                justifyContent: 'center',
                padding: '0 16px',
                marginBottom: 2
              }}
            >
              <Box
                sx={{
                  backgroundColor: 'rgba(0,0,0,0.6)',
                  borderRadius: '20px',
                  padding: '6px',
                  backdropFilter: 'blur(15px)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  boxShadow: '0 12px 40px rgba(0,0,0,0.4)',
                  width: '100%',
                  maxWidth: '480px'
                }}
              >
                <Tabs
                  value={tab}
                  onChange={(_, newValue) => setTab(newValue)}
                  aria-label="Analysis tabs"
                  variant="fullWidth"
                  sx={{
                    minHeight: 0,
                    '& .MuiTabs-indicator': {
                      display: 'none'
                    },
                    '& .MuiTab-root': {
                      minHeight: 52,
                      fontSize: '0.95rem',
                      fontWeight: 600,
                      textTransform: 'none',
                      padding: '10px 16px',
                      margin: '0 3px',
                      borderRadius: '14px',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      color: 'rgba(255,255,255,0.6)',
                      position: 'relative',
                      overflow: 'hidden',
                      '&:before': {
                        content: '""',
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'linear-gradient(135deg, rgba(76,175,80,0.1) 0%, rgba(76,175,80,0.05) 100%)',
                        opacity: 0,
                        transition: 'opacity 0.3s ease',
                        borderRadius: '14px'
                      },
                      '&:hover': {
                        backgroundColor: 'rgba(255,255,255,0.08)',
                        color: 'rgba(255,255,255,0.9)',
                        transform: 'translateY(-2px)',
                        boxShadow: '0 8px 25px rgba(0,0,0,0.3)',
                        '&:before': {
                          opacity: 1
                        }
                      },
                      '&.Mui-selected': {
                        backgroundColor: 'rgba(76,175,80,0.2)',
                        color: '#4CAF50',
                        fontWeight: 700,
                        boxShadow: '0 6px 20px rgba(76,175,80,0.3)',
                        transform: 'translateY(-1px)',
                        '&:before': {
                          opacity: 1
                        },
                        '& .tab-icon': {
                          color: '#4CAF50',
                          filter: 'drop-shadow(0 2px 4px rgba(76,175,80,0.4))'
                        }
                      },
                      '& .tab-icon': {
                        fontSize: '22px',
                        marginRight: '8px',
                        transition: 'all 0.3s ease',
                        filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))'
                      }
                    }
                  }}
                >
                  <Tab
                    label={t("analysis")}
                    id="tab0"
                    icon={<Icon icon="mdi:chart-box" className="tab-icon" />}
                    iconPosition="start"
                    disableFocusRipple
                  />
                  <Tab
                    label={t("moves")}
                    id="tab1"
                    icon={<Icon icon="mdi:chess-pawn" className="tab-icon" />}
                    iconPosition="start"
                    sx={{
                      display: showMovesTab ? undefined : "none",
                    }}
                    disableFocusRipple
                  />
                  <Tab
                    label={t("graph")}
                    id="tab2"
                    icon={<Icon icon="mdi:chart-line-variant" className="tab-icon" />}
                    iconPosition="start"
                    sx={{
                      display: gameEval ? undefined : "none",
                    }}
                    disableFocusRipple
                  />
                </Tabs>
              </Box>
            </Box>
          )}

          <GraphTab
            role="tabpanel"
            hidden={tab !== 2 && !isLgOrGreater}
            id="tabContent2"
          />

          <AnalysisTab
            role="tabpanel"
            hidden={tab !== 0 && !isLgOrGreater}
            id="tabContent0"
          />

          <ClassificationTab
            role="tabpanel"
            hidden={tab !== 1 && !isLgOrGreater}
            id="tabContent1"
          />

          {!isLgOrGreater && gameEval && (
            <Box width="100%">
              <Divider sx={{ marginX: "5%", marginBottom: 2.5 }} />
              <PanelHeader key="analysis-panel-header" />
            </Box>
          )}
        </Grid>

        <EngineSettingsButton />
      </Grid>
    </Box>
  );
}
