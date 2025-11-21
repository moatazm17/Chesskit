import { useGameDatabase } from "@/hooks/useGameDatabase";
import PremiumNavBar from "@/components/PremiumNavBar";
import { PageTitle } from "@/components/pageTitle";
import { Box, Grid2 as Grid, Typography, Card, CardContent, Button, useTheme, useMediaQuery } from "@mui/material";
import { useRouter } from "next/router";
import { useEffect } from "react";
import { Icon } from "@iconify/react";

export default function Database() {
  const { games, isReady, deleteGame } = useGameDatabase(true);
  const router = useRouter();
  const theme = useTheme();
  const isLgOrGreater = useMediaQuery(theme.breakpoints.up("lg"));

  const handleGameClick = (gameId: number) => {
    router.push(`/?gameId=${gameId}`);
  };

  const handleDeleteGame = async (e: React.MouseEvent, gameId: number) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this game?")) {
      await deleteGame(gameId);
    }
  };

  return (
    <>
      <PremiumNavBar onHomeClick={() => router.push("/")} />
      <Box
        sx={{
          minHeight: "calc(100vh - 64px)",
          background: `linear-gradient(135deg, rgba(26,26,46,0.8) 0%, rgba(22,33,62,0.8) 50%, rgba(15,52,96,0.8) 100%), url('/chessreviewbg.png')`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          padding: isLgOrGreater ? 0 : "8px",
        }}
      >
        <Grid
          container
          gap={isLgOrGreater ? 4 : 2}
          justifyContent="center"
          alignItems="start"
          sx={{
            padding: isLgOrGreater ? 4 : 2,
            maxWidth: "1200px",
            margin: "0 auto",
          }}
        >
          <PageTitle title="Saved Games Database" />

          {!isReady ? (
            <Grid size={12}>
              <Typography variant="h6" color="text.secondary" align="center">
                Loading games...
              </Typography>
            </Grid>
          ) : games.length === 0 ? (
            <Grid size={12}>
              <Card
                sx={{
                  backgroundColor: "rgba(255,255,255,0.05)",
                  backdropFilter: "blur(10px)",
                  border: "1px solid rgba(255,255,255,0.1)",
                }}
              >
                <CardContent>
                  <Typography variant="h6" color="text.secondary" align="center">
                  No saved games yet. Start analyzing games to save them here.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ) : (
            <Grid size={12}>
              <Grid container spacing={2}>
                {games.map((game) => (
                  <Grid size={{ xs: 12, sm: 6, md: 4 }} key={game.id}>
                    <Card
                      sx={{
                        backgroundColor: "rgba(255,255,255,0.05)",
                        backdropFilter: "blur(10px)",
                        border: "1px solid rgba(255,255,255,0.1)",
                        cursor: "pointer",
                        transition: "all 0.3s ease",
                        "&:hover": {
                          transform: "translateY(-4px)",
                          boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
                          borderColor: "rgba(76,175,80,0.5)",
                        },
                      }}
                      onClick={() => handleGameClick(game.id)}
                    >
                      <CardContent>
                        <Box display="flex" justifyContent="space-between" alignItems="start" mb={1}>
                          <Typography variant="h6" color="text.primary" sx={{ fontWeight: 600 }}>
                            {game.event || "Game"}
                          </Typography>
                          <Button
                            size="small"
                            color="error"
                            onClick={(e) => handleDeleteGame(e, game.id)}
                            sx={{ minWidth: "auto", padding: "4px" }}
                          >
                            <Icon icon="mdi:delete" />
                          </Button>
                        </Box>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          {game.white.name} vs {game.black.name}
                        </Typography>
                        {game.result && (
                          <Typography variant="body2" color="text.secondary">
                            Result: {game.result}
                          </Typography>
                        )}
                        {game.date && (
                          <Typography variant="body2" color="text.secondary">
                            Date: {game.date}
                          </Typography>
                        )}
                        {game.eval && (
                          <Box mt={1}>
                            <Typography variant="caption" color="success.main">
                              Analyzed
                            </Typography>
                          </Box>
                        )}
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Grid>
          )}
        </Grid>
      </Box>
    </>
  );
}

