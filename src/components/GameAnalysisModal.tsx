import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  Box,
  Typography,
  LinearProgress,
  Button,
  useTheme,
  useMediaQuery,
  AppBar,
  Toolbar,
  IconButton,
} from '@mui/material';
import { Icon } from '@iconify/react';
import { useAtomValue, useSetAtom } from 'jotai';
import { gameAtom, gameEvalAtom, evaluationProgressAtom } from '@/sections/analysis/states';
import { useEngine } from '@/hooks/useEngine';
import { engineNameAtom, engineDepthAtom, engineMultiPvAtom, engineWorkersNbAtom } from '@/sections/analysis/states';
import { getEvaluateGameParams } from '@/lib/chess';
import { usePlayersData } from '@/hooks/usePlayersData';
import { MoveClassification } from '@/types/enums';

interface GameAnalysisModalProps {
  open: boolean;
  onClose: () => void;
  onAnalyzeComplete: () => void;
}

interface MoveStats {
  type: MoveClassification;
  icon: string;
  color: string;
  label: string;
  whiteCount: number;
  blackCount: number;
}

const getMoveClassificationIcon = (classification: MoveClassification) => {
  switch (classification) {
    case MoveClassification.Splendid:
      return { icon: 'mdi:star', color: '#00bcd4', label: 'Brilliant' };
    case MoveClassification.Perfect:
      return { icon: 'mdi:exclamation', color: '#2196f3', label: 'Great' };
    case MoveClassification.Best:
      return { icon: 'mdi:check', color: '#4caf50', label: 'Best' };
    case MoveClassification.Excellent:
      return { icon: 'mdi:thumb-up', color: '#66bb6a', label: 'Excellent' };
    case MoveClassification.Okay:
      return { icon: 'mdi:circle', color: '#9ccc65', label: 'Good' };
    case MoveClassification.Inaccuracy:
      return { icon: 'mdi:help', color: '#ffb74d', label: 'Inaccuracy' };
    case MoveClassification.Mistake:
      return { icon: 'mdi:close', color: '#f57c00', label: 'Mistake' };
    case MoveClassification.Blunder:
      return { icon: 'mdi:close-circle', color: '#e53935', label: 'Blunder' };
    case MoveClassification.Opening:
      return { icon: 'mdi:book-open', color: '#78909c', label: 'Book' };
    case MoveClassification.Forced:
      return { icon: 'mdi:lock', color: '#90a4ae', label: 'Forced' };
    default:
      return { icon: 'mdi:circle', color: '#9e9e9e', label: 'Other' };
  }
};

export default function GameAnalysisModal({ open, onClose, onAnalyzeComplete }: GameAnalysisModalProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const game = useAtomValue(gameAtom);
  const gameEval = useAtomValue(gameEvalAtom);
  const evaluationProgress = useAtomValue(evaluationProgressAtom);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const { white, black } = usePlayersData(gameAtom);

  // Engine setup for analysis
  const engineName = useAtomValue(engineNameAtom);
  const engine = useEngine(engineName);
  const engineDepth = useAtomValue(engineDepthAtom);
  const engineMultiPv = useAtomValue(engineMultiPvAtom);
  const engineWorkersNb = useAtomValue(engineWorkersNbAtom);
  const setGameEval = useSetAtom(gameEvalAtom);
  const setEvaluationProgress = useSetAtom(evaluationProgressAtom);

  // Calculate real move statistics from gameEval
  const moveStats = useMemo(() => {
    if (!gameEval?.positions?.length) return [];

    const stats = new Map<MoveClassification, MoveStats>();
    
    Object.values(MoveClassification).forEach(classification => {
      const iconData = getMoveClassificationIcon(classification);
      stats.set(classification, {
        type: classification,
        ...iconData,
        whiteCount: 0,
        blackCount: 0,
      });
    });

    gameEval.positions.forEach((position, index) => {
      if (position.moveClassification && index > 0) {
        const isWhiteMove = index % 2 === 1;
        const stat = stats.get(position.moveClassification);
        if (stat) {
          if (isWhiteMove) {
            stat.whiteCount++;
          } else {
            stat.blackCount++;
          }
        }
      }
    });

    return Array.from(stats.values()).filter(stat => 
      stat.whiteCount > 0 || stat.blackCount > 0
    );
  }, [gameEval]);

  useEffect(() => {
    if (open) {
      setIsAnalyzing(false);
      setAnalysisComplete(false);
      setShowMore(false);
    }
  }, [open]);

  useEffect(() => {
    if (open && game.history().length > 0 && !isAnalyzing && !analysisComplete) {
      setIsAnalyzing(true);
      
      const startAnalysis = async () => {
        if (!engine?.getIsReady()) {
          setTimeout(startAnalysis, 100);
          return;
        }

        try {
          const params = getEvaluateGameParams(game);
          if (params.fens.length === 0) {
            setIsAnalyzing(false);
            setAnalysisComplete(true);
            return;
          }

          const newGameEval = await engine.evaluateGame({
            ...params,
            depth: engineDepth,
            multiPv: engineMultiPv,
            setEvaluationProgress,
            playersRatings: {
              white: white?.rating,
              black: black?.rating,
            },
            workersNb: engineWorkersNb,
          });

          setGameEval(newGameEval);
          setEvaluationProgress(0);
          setIsAnalyzing(false);
          setAnalysisComplete(true);
        } catch (error) {
          console.error('Analysis error:', error);
          setIsAnalyzing(false);
          setAnalysisComplete(true);
        }
      };

      startAnalysis();
    }
  }, [open, game.pgn(), isAnalyzing, analysisComplete]);

  const getPlayerName = (color: 'white' | 'black') => {
    const headers = game.getHeaders();
    return headers[color === 'white' ? 'White' : 'Black'] || (color === 'white' ? 'White' : 'Black');
  };

  const getDisplayStats = () => {
    const priorityOrder = [
      MoveClassification.Splendid,    // Brilliant
      MoveClassification.Perfect,     // Great
      MoveClassification.Best,        // Best
      MoveClassification.Mistake,     // Mistake
      MoveClassification.Inaccuracy,  // Miss (Inaccuracy)
      MoveClassification.Blunder,     // Blunder
    ];
    
    const byType = new Map(moveStats.map(s => [s.type, s]));
    
    // Always show the 6 fixed moves, even if count is 0
    const fixedStats = priorityOrder.map(type => {
      const existing = byType.get(type);
      if (existing) return existing;
      
      // Create stat with 0 counts if not found
      const iconData = getMoveClassificationIcon(type);
      return {
        type,
        ...iconData,
        whiteCount: 0,
        blackCount: 0,
      };
    });
    
    const otherStats = moveStats.filter(s => !priorityOrder.includes(s.type));
    
    return showMore ? [...fixedStats, ...otherStats] : fixedStats;
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullScreen
      PaperProps={{
        sx: {
          background: `linear-gradient(135deg, rgba(26,26,46,0.95) 0%, rgba(22,33,62,0.95) 50%, rgba(15,52,96,0.95) 100%)`,
          color: 'white',
        },
      }}
    >
      {/* Top Bar */}
      <AppBar 
        position="static" 
        elevation={0}
        sx={{ 
          background: 'rgba(0,0,0,0.3)',
          backdropFilter: 'blur(10px)'
        }}
      >
        <Toolbar>
          <IconButton
            edge="start"
            color="inherit"
            onClick={onClose}
          >
            <Icon icon="mdi:close" />
          </IconButton>
          <Typography variant="h6" sx={{ flexGrow: 1, textAlign: 'center', fontWeight: 700 }}>
            Game Review
          </Typography>
          <IconButton color="inherit">
            <Icon icon="mdi:cog" />
          </IconButton>
          <IconButton color="inherit">
            <Icon icon="mdi:help-circle" />
          </IconButton>
        </Toolbar>
      </AppBar>

      <DialogContent sx={{ 
        padding: 0,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: `linear-gradient(135deg, rgba(26,26,46,0.95) 0%, rgba(22,33,62,0.95) 50%, rgba(15,52,96,0.95) 100%)`
      }}>
        {isAnalyzing ? (
          <Box sx={{ 
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            px: 4
          }}>
            <Typography variant="h4" sx={{ mb: 4, fontWeight: 700, textAlign: 'center' }}>
              Analyzing Game
            </Typography>
            <LinearProgress 
              variant="determinate" 
              value={evaluationProgress} 
              sx={{ 
                width: '100%',
                height: 12, 
                borderRadius: 6,
                backgroundColor: 'rgba(255,255,255,0.1)',
                '& .MuiLinearProgress-bar': {
                  background: 'linear-gradient(45deg, #4ecdc4, #45b7d1)',
                  borderRadius: 6,
                }
              }} 
            />
            <Typography variant="h6" sx={{ mt: 3, color: 'rgba(255,255,255,0.8)', textAlign: 'center' }}>
              {evaluationProgress.toFixed(0)}% Complete
            </Typography>
          </Box>
        ) : analysisComplete && gameEval ? (
          <Box sx={{ 
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            p: 2
          }}>
            {/* Compact Chess.com layout - 4 columns with icon centered */}
            <Box sx={{
              display: 'grid',
              gridTemplateColumns: '100px 60px 60px 60px',
              gap: 1,
              alignItems: 'center'
            }}>
              {/* Header row with player names */}
              <Box></Box>
              <Typography variant="body1" sx={{ color: 'white', fontWeight: 600, textAlign: 'center' }}>
                {getPlayerName('white')}
              </Typography>
              <Box></Box>
              <Typography variant="body1" sx={{ color: 'white', fontWeight: 600, textAlign: 'center' }}>
                {getPlayerName('black')}
              </Typography>

              {/* Players row */}
              <Typography variant="body1" sx={{ color: 'white', fontWeight: 600 }}>
                Players
              </Typography>
              <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                <Box sx={{ 
                  width: 60, 
                  height: 60, 
                  borderRadius: 2,
                  background: 'rgba(255,255,255,0.9)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '3px solid #4ecdc4'
                }}>
                  <Icon icon="mdi:chess-pawn" style={{ fontSize: 32, color: '#666' }} />
                </Box>
              </Box>
              <Box></Box>
              <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                <Box sx={{ 
                  width: 60, 
                  height: 60, 
                  borderRadius: 2,
                  background: 'rgba(255,255,255,0.9)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '3px solid #4ecdc4'
                }}>
                  <Icon icon="mdi:chess-pawn" style={{ fontSize: 32, color: '#666' }} />
                </Box>
              </Box>

              {/* Accuracy row */}
              <Typography variant="body1" sx={{ color: 'white', fontWeight: 600 }}>
                Accuracy
              </Typography>
              <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                <Box sx={{ 
                  background: 'rgba(255,255,255,0.9)',
                  borderRadius: 2,
                  px: 2,
                  py: 1,
                  textAlign: 'center'
                }}>
                  <Typography variant="h6" sx={{ color: '#000', fontWeight: 700 }}>
                    {gameEval.accuracy.white.toFixed(1)}
                  </Typography>
                </Box>
              </Box>
              <Box></Box>
              <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                <Box sx={{ 
                  background: 'rgba(255,255,255,0.2)',
                  borderRadius: 2,
                  px: 2,
                  py: 1,
                  textAlign: 'center',
                  border: '1px solid rgba(255,255,255,0.3)'
                }}>
                  <Typography variant="h6" sx={{ color: 'white', fontWeight: 700 }}>
                    {gameEval.accuracy.black.toFixed(1)}
                  </Typography>
                </Box>
              </Box>

              {/* Move statistics rows */}
              {getDisplayStats().map((stat) => (
                <React.Fragment key={stat.type}>
                  <Typography variant="body1" sx={{ color: 'white', fontWeight: 600 }}>
                    {stat.label}
                  </Typography>
                  <Typography variant="h6" sx={{ 
                    color: stat.whiteCount > 0 ? stat.color : '#666', 
                    fontWeight: 700,
                    textAlign: 'center'
                  }}>
                    {stat.whiteCount}
                  </Typography>
                  <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                    <Box sx={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      background: stat.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      {stat.type === MoveClassification.Splendid ? (
                        <Typography sx={{ color: 'white', fontWeight: 900, fontSize: '16px' }}>
                          !!
                        </Typography>
                      ) : (
                        <Icon icon={stat.icon} style={{ fontSize: 16, color: 'white' }} />
                      )}
                    </Box>
                  </Box>
                  <Typography variant="h6" sx={{ 
                    color: stat.blackCount > 0 ? stat.color : '#666', 
                    fontWeight: 700,
                    textAlign: 'center'
                  }}>
                    {stat.blackCount}
                  </Typography>
                </React.Fragment>
              ))}
            </Box>

            {/* Show more button */}
            {moveStats.length > 6 && (
              <Box sx={{ textAlign: 'center', mt: 2 }}>
                <Button
                  onClick={() => setShowMore(!showMore)}
                  sx={{
                    color: '#4ecdc4',
                    textTransform: 'none',
                    fontWeight: 600,
                    '&:hover': {
                      background: 'rgba(78, 205, 196, 0.1)'
                    }
                  }}
                >
                  {showMore ? '▲' : '▼'}
                </Button>
              </Box>
            )}

            {/* Bottom spacer for button */}
            <Box sx={{ height: 80 }} />
          </Box>
        ) : null}

        {/* Fixed bottom button */}
        {analysisComplete && (
          <Box sx={{ 
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            p: 2,
            background: 'linear-gradient(180deg, transparent 0%, rgba(26,26,46,0.95) 50%)',
            backdropFilter: 'blur(10px)'
          }}>
            <Button
              onClick={() => {
                onAnalyzeComplete();
                onClose();
              }}
              variant="contained"
              fullWidth
              size="large"
              sx={{
                background: 'linear-gradient(45deg, #4ecdc4, #45b7d1)',
                color: 'white',
                fontWeight: 700,
                py: 2,
                borderRadius: 3,
                textTransform: 'none',
                fontSize: '1.1rem',
                boxShadow: '0 8px 32px rgba(78, 205, 196, 0.4)',
                '&:hover': {
                  background: 'linear-gradient(45deg, #26a69a, #1976d2)',
                  transform: 'translateY(-2px)',
                  boxShadow: '0 12px 40px rgba(78, 205, 196, 0.5)',
                },
                transition: 'all 0.3s ease'
              }}
            >
              Start Review
            </Button>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
}