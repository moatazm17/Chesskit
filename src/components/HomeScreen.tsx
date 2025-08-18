import React from 'react';
import { 
  Box, 
  Grid, 
  Card, 
  CardContent, 
  Typography, 
  useTheme,
  useMediaQuery
} from '@mui/material';
import { Icon } from '@iconify/react';

interface HomeCardProps {
  title: string;
  description: string;
  icon: string;
  color: string;
  onClick: () => void;
}

const HomeCard: React.FC<HomeCardProps> = ({ title, description, icon, color, onClick }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  return (
    <Card
      onClick={onClick}
      sx={{
        width: isMobile ? '100%' : 280,
        height: isMobile ? 160 : 200,
        background: `linear-gradient(135deg, ${color}15, ${color}05)`,
        backdropFilter: 'blur(20px)',
        border: `1px solid ${color}30`,
        borderRadius: 4,
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        boxShadow: `0 8px 32px ${color}20`,
        '&:hover': {
          transform: 'translateY(-8px)',
          boxShadow: `0 16px 48px ${color}40`,
          border: `1px solid ${color}50`,
        }
      }}
    >
      <CardContent
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          textAlign: 'center',
          padding: 3
        }}
      >
        <Icon 
          icon={icon} 
          style={{ 
            fontSize: isMobile ? '4rem' : '4rem', 
            color: color,
            marginBottom: isMobile ? '0.5rem' : '1rem'
          }} 
        />
        <Typography 
          variant={isMobile ? "h6" : "h5"}
          component="h2" 
          sx={{ 
            fontWeight: 600, 
            color: 'white',
            marginBottom: isMobile ? 0.5 : 1
          }}
        >
          {title}
        </Typography>
        <Typography 
          variant="body2" 
          sx={{ 
            color: 'rgba(255,255,255,0.8)',
            lineHeight: 1.5,
            fontSize: isMobile ? '0.75rem' : '0.875rem',
            marginTop: isMobile ? 0.5 : 1
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
}

const HomeScreen: React.FC<HomeScreenProps> = ({ onPlayGame, onLoadGame, onSavedGames }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  return (
    <Box
      sx={{
        minHeight: 'calc(100vh - 64px)',
        background: `linear-gradient(135deg, rgba(26,26,46,0.8) 0%, rgba(22,33,62,0.8) 50%, rgba(15,52,96,0.8) 100%), url('/chessreviewbg.png')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: isMobile ? 2 : 4,
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Background Pattern */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: `
            radial-gradient(circle at 20% 80%, rgba(120, 119, 198, 0.3) 0%, transparent 50%),
            radial-gradient(circle at 80% 20%, rgba(255, 119, 198, 0.3) 0%, transparent 50%),
            radial-gradient(circle at 40% 40%, rgba(120, 219, 255, 0.2) 0%, transparent 50%)
          `,
          zIndex: 0
        }}
      />

      {/* Content */}
      <Box sx={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
        {/* Logo/Title */}
        <Box sx={{ marginBottom: isMobile ? 3 : 6 }}>
          <Typography
            variant="h2"
            component="h1"
            sx={{
              fontWeight: 700,
              background: 'linear-gradient(45deg, #ff6b6b, #4ecdc4, #45b7d1)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              marginBottom: 2,
              fontSize: isMobile ? '2rem' : '4rem'
            }}
          >
            ♟️ CHESSKIT
          </Typography>
          <Typography
            variant="h6"
            sx={{
              color: 'rgba(255,255,255,0.8)',
              fontWeight: 300,
              fontSize: isMobile ? '0.9rem' : '1.25rem'
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
            maxWidth: 900,
            paddingBottom: isMobile ? 2 : 0
          }}
        >
          <Grid item xs={12} sm={6} md={4}>
            <HomeCard
              title="Play Game"
              description="Start a new game against Stockfish or practice your skills"
              icon="game-icons:chess-king"
              color="#4ecdc4"
              onClick={onPlayGame}
            />
          </Grid>
          
          <Grid item xs={12} sm={6} md={4}>
            <HomeCard
              title="Review Game"
              description="Import games from Chess.com, Lichess, or paste PGN"
              icon="mdi:folder-open"
              color="#45b7d1"
              onClick={onLoadGame}
            />
          </Grid>
          
          <Grid item xs={12} sm={12} md={4}>
            <HomeCard
              title="Saved Games"
              description="Access your previously saved games and analysis"
              icon="mdi:database"
              color="#ff6b6b"
              onClick={onSavedGames}
            />
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
};

export default HomeScreen;
