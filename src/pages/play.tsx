import { PageTitle } from "@/components/pageTitle";
import Board from "@/sections/play/board";
import GameInProgress from "@/sections/play/gameInProgress";
import GameRecap from "@/sections/play/gameRecap";
import GameSettingsButton from "@/sections/play/gameSettings/gameSettingsButton";
import { isGameInProgressAtom } from "@/sections/play/states";
import { Grid2 as Grid, Box, useTheme, useMediaQuery } from "@mui/material";
import { useAtomValue } from "jotai";
import PremiumNavBar from "@/components/PremiumNavBar";

export default function Play() {
  const isGameInProgress = useAtomValue(isGameInProgressAtom);
  const theme = useTheme();
  const isLgOrGreater = useMediaQuery(theme.breakpoints.up("lg"));

  return (
    <>
      <PremiumNavBar onHomeClick={() => window.location.href = '/'} />
      <Box
        sx={{
          minHeight: 'calc(100vh - 64px)',
          background: `linear-gradient(135deg, rgba(26,26,46,0.8) 0%, rgba(22,33,62,0.8) 50%, rgba(15,52,96,0.8) 100%), url('/chessreviewbg.png')`,
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
          <PageTitle title="Chesskit Play vs Stockfish" />

          <Board />

          <Grid
            container
            marginTop={{ xs: 0, md: "2.5em" }}
            justifyContent="center"
            alignItems="center"
            borderRadius={3}
            border={1}
            borderColor={"secondary.main"}
            size={{
              xs: 12,
              md: "grow",
            }}
            sx={{
              backgroundColor: "rgba(255,255,255,0.05)",
              borderColor: "rgba(255,255,255,0.1)",
              borderWidth: 1,
              boxShadow: "0 4px 20px rgba(0, 0, 0, 0.3)",
              margin: isLgOrGreater ? 0 : '0 8px',
              width: isLgOrGreater ? 'auto' : 'calc(100% - 16px)',
              backdropFilter: 'blur(10px)'
            }}
            padding={3}
            rowGap={3}
            style={{
              maxWidth: "400px",
            }}
          >
            <GameInProgress />
            {!isGameInProgress && <GameSettingsButton />}
            <GameRecap />
          </Grid>
        </Grid>
      </Box>
    </>
  );
}
