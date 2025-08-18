import { Grid2 as Grid, Typography, Box, useTheme, useMediaQuery, Button } from "@mui/material";
import { Icon } from "@iconify/react";
import { useCallback } from "react";
import LoadGameButton from "@/sections/loadGame/loadGameButton";
import { useGameDatabase } from "@/hooks/useGameDatabase";
import { useRouter } from "next/router";
import { PageTitle } from "@/components/pageTitle";
import PremiumNavBar from "@/components/PremiumNavBar";

export default function GameDatabase() {
  const { games, deleteGame } = useGameDatabase(true);
  const router = useRouter();
  const theme = useTheme();
  const isLgOrGreater = useMediaQuery(theme.breakpoints.up("lg"));

  const handleDeleteGame = useCallback(
    (id: number) => async () => {
      await deleteGame(id);
    },
    [deleteGame]
  );

  return (
    <>
      <PremiumNavBar onHomeClick={() => router.push('/')} />
      <Box
        sx={{
          minHeight: 'calc(100vh - 64px)',
          background: `linear-gradient(135deg, rgba(26,26,46,0.8) 0%, rgba(22,33,62,0.8) 50%, rgba(15,52,96,0.8) 100%), url('/chessreviewbg.png')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          padding: isLgOrGreater ? '24px' : '16px'
        }}
      >
        <Grid 
          container 
          gap={isLgOrGreater ? 4 : 2} 
          justifyContent="center" 
          alignItems="start"
          sx={{
            maxWidth: '1200px',
            margin: '0 auto',
            padding: isLgOrGreater ? 0 : '8px'
          }}
        >
          <PageTitle title="🗃️ Game Database" />

          {/* Header Section */}
          <Grid container justifyContent="center" alignItems="center" size={12}>
            <Box
              sx={{
                background: 'rgba(0,0,0,0.6)',
                borderRadius: '20px',
                padding: '24px',
                backdropFilter: 'blur(15px)',
                border: '1px solid rgba(255,255,255,0.15)',
                boxShadow: '0 12px 40px rgba(0,0,0,0.4)',
                textAlign: 'center',
                marginBottom: 3,
                width: '100%',
                maxWidth: '500px'
              }}
            >
              <Typography 
                variant="h4" 
                sx={{
                  fontWeight: 700,
                  color: 'white',
                  marginBottom: 2,
                  background: 'linear-gradient(45deg, #45b7d1, #4CAF50)',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                Your Chess Library
              </Typography>
              
              <Typography 
                variant="body1" 
                sx={{ 
                  color: 'rgba(255,255,255,0.8)',
                  marginBottom: 3,
                  lineHeight: 1.6
                }}
              >
                You have <strong style={{color: '#4CAF50'}}>{games.length}</strong> game{games.length !== 1 && "s"} saved in your database
              </Typography>

              <LoadGameButton label="Add New Game" size="large" />
            </Box>
          </Grid>

          {/* Games Cards */}
          <Grid container justifyContent="center" size={12}>
            <Box
              sx={{
                width: '100%',
                maxWidth: '800px',
                display: 'flex',
                flexDirection: 'column',
                gap: 2
              }}
            >
              {games.length === 0 ? (
                <Box
                  sx={{
                    background: 'rgba(0,0,0,0.6)',
                    borderRadius: '20px',
                    padding: '40px',
                    backdropFilter: 'blur(15px)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    boxShadow: '0 12px 40px rgba(0,0,0,0.4)',
                    textAlign: 'center'
                  }}
                >
                  <Typography 
                    variant="h6" 
                    sx={{ 
                      color: 'rgba(255,255,255,0.6)',
                      marginBottom: 2
                    }}
                  >
                    📭 No games saved yet
                  </Typography>
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      color: 'rgba(255,255,255,0.4)'
                    }}
                  >
                    Start playing or load games to build your collection
                  </Typography>
                </Box>
              ) : (
                games.map((game) => (
                  <Box
                    key={game.id}
                    sx={{
                      background: 'rgba(0,0,0,0.6)',
                      borderRadius: '16px',
                      padding: '20px',
                      backdropFilter: 'blur(15px)',
                      border: '1px solid rgba(255,255,255,0.15)',
                      boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        transform: 'translateY(-2px)',
                        boxShadow: '0 12px 40px rgba(0,0,0,0.3)',
                        border: '1px solid rgba(255,255,255,0.25)'
                      }
                    }}
                    onClick={() => router.push({ pathname: "/", query: { gameId: game.id } })}
                  >
                    {/* Header with players */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                      <Box sx={{ flex: 1 }}>
                        <Typography 
                          variant="h6" 
                          sx={{ 
                            color: 'white', 
                            fontWeight: 600,
                            fontSize: isLgOrGreater ? '1.1rem' : '1rem',
                            marginBottom: 0.5
                          }}
                        >
                          {game.white.name || 'Unknown'} vs {game.black.name || 'Unknown'}
                        </Typography>
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            color: 'rgba(255,255,255,0.6)',
                            fontSize: '0.85rem'
                          }}
                        >
                          {game.event || 'Casual Game'} • {game.date}
                        </Typography>
                      </Box>
                      
                      {/* Result */}
                      <Box
                        sx={{
                          backgroundColor: game.result === '1-0' ? 'rgba(76,175,80,0.2)' : 
                                         game.result === '0-1' ? 'rgba(255,107,107,0.2)' : 'rgba(69,183,209,0.2)',
                          border: `1px solid ${game.result === '1-0' ? '#4CAF50' : 
                                              game.result === '0-1' ? '#ff6b6b' : '#45b7d1'}`,
                          borderRadius: '8px',
                          padding: '6px 12px',
                          minWidth: '50px',
                          textAlign: 'center'
                        }}
                      >
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            color: game.result === '1-0' ? '#4CAF50' : 
                                   game.result === '0-1' ? '#ff6b6b' : '#45b7d1',
                            fontWeight: 700,
                            fontSize: '0.9rem'
                          }}
                        >
                          {game.result}
                        </Typography>
                      </Box>
                    </Box>

                    {/* Actions */}
                    <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                      <Button
                        size="small"
                        startIcon={<Icon icon="mdi:chart-line" />}
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push({ pathname: "/", query: { gameId: game.id } });
                        }}
                        sx={{
                          backgroundColor: 'rgba(69,183,209,0.2)',
                          color: '#45b7d1',
                          borderRadius: '8px',
                          padding: '6px 12px',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          border: '1px solid rgba(69,183,209,0.3)',
                          textTransform: 'none',
                          '&:hover': {
                            backgroundColor: 'rgba(69,183,209,0.3)',
                            transform: 'scale(1.05)'
                          }
                        }}
                      >
                        Analyze
                      </Button>
                      
                      <Button
                        size="small"
                        startIcon={<Icon icon="mdi:delete" />}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteGame(game.id)();
                        }}
                        sx={{
                          backgroundColor: 'rgba(255,107,107,0.2)',
                          color: '#ff6b6b',
                          borderRadius: '8px',
                          padding: '6px 12px',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          border: '1px solid rgba(255,107,107,0.3)',
                          textTransform: 'none',
                          '&:hover': {
                            backgroundColor: 'rgba(255,107,107,0.3)',
                            transform: 'scale(1.05)'
                          }
                        }}
                      >
                        Delete
                      </Button>
                    </Box>
                  </Box>
                ))
              )}
            </Box>
          </Grid>
        </Grid>
      </Box>
    </>
  );
}