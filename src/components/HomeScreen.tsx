import React, { useState, useEffect } from "react";
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import { Icon } from "@iconify/react";

interface PromoCardData {
  title: string;
  description: string;
  icon?: string;
  image?: string;
  link: string;
  color?: string;
}

interface HomeCardProps {
  title: string;
  description: string;
  icon: string;
  color: string;
  onClick: () => void;
  badge?: string;
  badgeVariant?: "default" | "popular";
  customIcon?: React.ReactNode;
}

const HomeCard: React.FC<HomeCardProps> = ({
  title,
  description,
  icon,
  color,
  onClick,
  badge,
  badgeVariant = "default",
  customIcon,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const isPopular = badgeVariant === "popular";

  return (
    <Card
      onClick={onClick}
      sx={{
        width: isMobile ? "100%" : 280,
        height: isMobile ? 160 : 200,
        position: "relative",
        background: isPopular
          ? `linear-gradient(135deg, ${color}30, ${color}12)`
          : `linear-gradient(135deg, ${color}20, ${color}08)`,
        backdropFilter: "blur(20px)",
        border: isPopular
          ? `1.5px solid ${color}60`
          : `1px solid ${color}35`,
        borderRadius: 4,
        cursor: "pointer",
        transition: "all 0.3s ease",
        boxShadow: isPopular
          ? `0 8px 32px ${color}35, 0 0 20px ${color}15`
          : `0 8px 32px ${color}25`,
        "&:hover": {
          transform: "translateY(-8px)",
          boxShadow: isPopular
            ? `0 16px 48px ${color}55, 0 0 30px ${color}25`
            : `0 16px 48px ${color}45`,
          border: `1px solid ${color}55`,
        },
      }}
    >
      {badge && (
        <Box
          sx={{
            position: "absolute",
            top: 8,
            right: 8,
            background: isPopular
              ? "linear-gradient(135deg, #4ecdc4, #45b7d1)"
              : "linear-gradient(135deg, #FF6B6B, #FF3D3D)",
            color: "white",
            fontSize: "0.6rem",
            fontWeight: 700,
            padding: isPopular ? "3px 10px" : "2px 8px",
            borderRadius: "10px",
            letterSpacing: "0.5px",
            boxShadow: isPopular
              ? "0 2px 10px rgba(78, 205, 196, 0.5)"
              : "0 2px 8px rgba(255, 61, 61, 0.4)",
            display: "flex",
            alignItems: "center",
            gap: "3px",
          }}
        >
          {isPopular && "⭐ "}{badge}
        </Box>
      )}
      <CardContent
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          textAlign: "center",
          padding: 3,
        }}
      >
        {customIcon || (
          <Icon
            icon={icon}
            style={{
              fontSize: isMobile ? "4rem" : "4rem",
              color: color,
              marginBottom: isMobile ? "0.5rem" : "1rem",
            }}
          />
        )}
        <Typography
          variant={isMobile ? "h6" : "h5"}
          component="h2"
          sx={{
            fontWeight: 600,
            color: "white",
            marginBottom: isMobile ? 0.5 : 1,
          }}
        >
          {title}
        </Typography>
        <Typography
          variant="body2"
          sx={{
            color: "rgba(255,255,255,0.8)",
            lineHeight: 1.5,
            fontSize: isMobile ? "0.75rem" : "0.875rem",
            marginTop: isMobile ? 0.5 : 1,
          }}
        >
          {description}
        </Typography>
      </CardContent>
    </Card>
  );
};

interface HomeScreenProps {
  onPlayGame: () => void;
  onLoadGame: () => void;
  onSavedGames: () => void;
  onPuzzles?: () => void;
  onCheckmate?: () => void;
  onBots?: () => void;
  onBrilliant?: () => void;
}

const HomeScreen: React.FC<HomeScreenProps> = ({
  onPlayGame,
  onLoadGame,
  onSavedGames,
  onPuzzles,
  onCheckmate,
  onBots,
  onBrilliant,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [promoCard, setPromoCard] = useState<PromoCardData | null>(null);

  useEffect(() => {
    const w = window as any;
    if (w._promoCard) {
      setPromoCard(w._promoCard);
    }
  }, []);

  return (
    <Box
      sx={{
        minHeight: "calc(100vh - 64px)",
        background: `linear-gradient(135deg, rgba(26,26,46,0.8) 0%, rgba(22,33,62,0.8) 50%, rgba(15,52,96,0.8) 100%), url('/chessreviewbg.webp')`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: isMobile ? 2 : 4,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Background Pattern */}
      <Box
        sx={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: `
            radial-gradient(circle at 20% 80%, rgba(120, 119, 198, 0.3) 0%, transparent 50%),
            radial-gradient(circle at 80% 20%, rgba(255, 119, 198, 0.3) 0%, transparent 50%),
            radial-gradient(circle at 40% 40%, rgba(120, 219, 255, 0.2) 0%, transparent 50%)
          `,
          zIndex: 0,
        }}
      />

      {/* Content */}
      <Box sx={{ position: "relative", zIndex: 1, textAlign: "center" }}>
        {/* Logo/Title */}
        <Box sx={{ marginBottom: isMobile ? 3 : 6 }}>
          <Typography
            variant="h2"
            component="h1"
            sx={{
              fontWeight: 700,
              background: "linear-gradient(45deg, #ff6b6b, #4ecdc4, #45b7d1)",
              backgroundClip: "text",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              marginBottom: 2,
              fontSize: isMobile ? "2rem" : "4rem",
            }}
          >
            ♟️ CHESS ANALYSIS
          </Typography>
          <Typography
            variant="h6"
            sx={{
              color: "rgba(255,255,255,0.8)",
              fontWeight: 300,
              fontSize: isMobile ? "0.9rem" : "1.25rem",
            }}
          >
            The Ultimate Chess Experience
          </Typography>
        </Box>

        {/* Cards Grid */}
        <Grid
          container
          spacing={isMobile ? 2 : 3}
          justifyContent="center"
          sx={{
            maxWidth: 1200,
            paddingBottom: isMobile ? 2 : 0,
          }}
        >
          <Grid item xs={12} sm={6} md={3}>
            <HomeCard
              title="Review Game"
              description="Analyze from Chess.com or Lichess"
              icon="mdi:folder-open"
              color="#45b7d1"
              onClick={onLoadGame}
              badge="MOST POPULAR"
              badgeVariant="popular"
            />
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <HomeCard
              title="Player Insights"
              description="Analyze your Chess.com stats"
              icon="mdi:chart-areaspline"
              color="#26C6DA"
              onClick={() => (window.location.href = "/stats")}
              badge="HOT"
            />
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <HomeCard
              title="Puzzles"
              description="Solve daily puzzles and improve"
              icon="mdi:puzzle"
              color="#FFA726"
              onClick={onPuzzles || (() => (window.location.href = "/puzzles"))}
              badge="NEW"
            />
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <HomeCard
              title="Checkmate"
              description="Mate in 2 and 3 puzzles"
              icon="mdi:crown"
              color="#EC407A"
              onClick={onCheckmate || (() => (window.location.href = "/checkmate"))}
              badge="NEW"
            />
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <HomeCard
              title="Brilliant Puzzles"
              description="Find the winning sacrifice !!"
              icon="mdi:star-four-points"
              color="#26C6DA"
              onClick={onBrilliant || (() => (window.location.href = "/brilliant"))}
              badge="NEW"
              customIcon={
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "center",
                    marginBottom: isMobile ? "0.5rem" : "1rem",
                  }}
                >
                  <Box
                    sx={{
                      background: "linear-gradient(135deg, #26C6DA 0%, #00ACC1 100%)",
                      borderRadius: "10px",
                      px: 1.5,
                      py: 0.5,
                      boxShadow: "0 4px 15px rgba(38,198,218,0.5), 0 0 25px rgba(38,198,218,0.2)",
                      border: "2px solid rgba(255,255,255,0.25)",
                    }}
                  >
                    <Typography
                      sx={{
                        color: "white",
                        fontWeight: 900,
                        fontSize: isMobile ? "2rem" : "2.5rem",
                        lineHeight: 1,
                        fontFamily: "'Roboto Mono', monospace",
                        textShadow: "0 2px 4px rgba(0,0,0,0.3)",
                      }}
                    >
                      !!
                    </Typography>
                  </Box>
                </Box>
              }
            />
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <HomeCard
              title="Play vs Legends"
              description="Challenge famous chess players"
              icon="mdi:account-star"
              color="#9333EA"
              onClick={onBots || (() => (window.location.href = "/bots"))}
              badge="NEW"
              customIcon={
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "center",
                    marginBottom: isMobile ? "0.5rem" : "1rem",
                  }}
                >
                  {["/bots/carlsen.webp", "/bots/nakamura.webp", "/bots/fischer.webp"].map(
                    (src, i) => (
                      <Box
                        key={src}
                        sx={{
                          width: isMobile ? 44 : 52,
                          height: isMobile ? 44 : 52,
                          borderRadius: "50%",
                          overflow: "hidden",
                          border: "2px solid rgba(147, 51, 234, 0.5)",
                          marginLeft: i > 0 ? "-10px" : 0,
                          zIndex: 3 - i,
                          boxShadow: "0 0 10px rgba(147, 51, 234, 0.3)",
                        }}
                      >
                        <img
                          src={src}
                          alt=""
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                          }}
                        />
                      </Box>
                    )
                  )}
                </Box>
              }
            />
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <HomeCard
              title="Play Game"
              description="Challenge Stockfish engine"
              icon="game-icons:chess-king"
              color="#4ecdc4"
              onClick={onPlayGame}
            />
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <HomeCard
              title="Saved Games"
              description="Your saved games and analysis"
              icon="mdi:database"
              color="#ff6b6b"
              onClick={onSavedGames}
            />
          </Grid>

          {promoCard && (
            <Grid item xs={12} sm={6} md={3}>
              <Card
                onClick={() => {
                  const w = window as any;
                  if (w.App && typeof w.App.postMessage === "function") {
                    w.App.postMessage(`open_url:${promoCard.link}`);
                  } else {
                    window.open(promoCard.link, "_blank");
                  }
                }}
                sx={{
                  width: isMobile ? "100%" : 280,
                  height: isMobile ? 160 : 200,
                  position: "relative",
                  background: `linear-gradient(135deg, ${promoCard.color || "#FF6B35"}20, ${promoCard.color || "#FF6B35"}08)`,
                  backdropFilter: "blur(20px)",
                  border: `1px solid ${promoCard.color || "#FF6B35"}35`,
                  borderRadius: 4,
                  cursor: "pointer",
                  transition: "all 0.3s ease",
                  boxShadow: `0 8px 32px ${promoCard.color || "#FF6B35"}25`,
                  "&:hover": {
                    transform: "translateY(-8px)",
                    boxShadow: `0 16px 48px ${promoCard.color || "#FF6B35"}45`,
                    border: `1px solid ${promoCard.color || "#FF6B35"}55`,
                  },
                }}
              >
                <Box
                  sx={{
                    position: "absolute",
                    top: 8,
                    right: 8,
                    background: "rgba(255,255,255,0.12)",
                    color: "rgba(255,255,255,0.5)",
                    fontSize: "0.5rem",
                    fontWeight: 600,
                    padding: "2px 6px",
                    borderRadius: "6px",
                    letterSpacing: "0.5px",
                  }}
                >
                  AD
                </Box>
                <CardContent
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    height: "100%",
                    textAlign: "center",
                    padding: 3,
                  }}
                >
                  {promoCard.image ? (
                    <Box
                      component="img"
                      src={promoCard.image}
                      alt={promoCard.title}
                      sx={{
                        width: isMobile ? 56 : 64,
                        height: isMobile ? 56 : 64,
                        borderRadius: "14px",
                        objectFit: "cover",
                        marginBottom: isMobile ? "0.5rem" : "1rem",
                      }}
                    />
                  ) : (
                    <Icon
                      icon={promoCard.icon || "mdi:rocket-launch"}
                      style={{
                        fontSize: "4rem",
                        color: promoCard.color || "#FF6B35",
                        marginBottom: isMobile ? "0.5rem" : "1rem",
                      }}
                    />
                  )}
                  <Typography
                    variant={isMobile ? "h6" : "h5"}
                    sx={{ fontWeight: 600, color: "white", marginBottom: isMobile ? 0.5 : 1 }}
                  >
                    {promoCard.title}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      color: "rgba(255,255,255,0.8)",
                      lineHeight: 1.5,
                      fontSize: isMobile ? "0.75rem" : "0.875rem",
                      marginTop: isMobile ? 0.5 : 1,
                    }}
                  >
                    {promoCard.description}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          )}

        </Grid>
      </Box>
    </Box>
  );
};

export default HomeScreen;
