import type React from "react";
import {
  ListItem,
  ListItemText,
  Typography,
  Box,
} from "@mui/material";
import { LoadedGame } from "@/types/game";
import TimeControlChip from "./timeControlChip";
import MovesNbChip from "./movesNbChip";
import DateChip from "./dateChip";
import GameResultChip from "./gameResultChip";

interface Props {
  game: LoadedGame;
  onClick: () => void;
  perspectiveUserColor: "white" | "black";
  searchUsername?: string;
}

export const GameItem: React.FC<Props> = ({
  game,
  onClick,
  perspectiveUserColor,
  searchUsername,
}) => {
  const { white, black, result, timeControl, date, movesNb } = game;

  const isUserWhite = perspectiveUserColor === "white";
  const user = isUserWhite ? white : black;
  const opponent = isUserWhite ? black : white;

  return (
    <ListItem
      alignItems="flex-start"
      sx={{
        borderRadius: "10px",
        mb: 1,
        py: 1.2,
        px: 1.5,
        transition: "all 0.15s ease",
        "&:hover": {
          backgroundColor: "rgba(255,255,255,0.06)",
        },
        border: "1px solid rgba(255,255,255,0.08)",
        cursor: "pointer",
      }}
      onClick={onClick}
    >
      <ListItemText
        disableTypography
        primary={
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 0.75,
              mb: 0.5,
              flexWrap: "nowrap",
              overflow: "hidden",
            }}
          >
            <Typography
              component="span"
              noWrap
              sx={{
                fontWeight: 700,
                fontSize: "0.85rem",
                color: "#4ecdc4",
                maxWidth: { xs: "110px", sm: "160px" },
                overflow: "hidden",
                textOverflow: "ellipsis",
                flexShrink: 1,
              }}
            >
              {formatPlayerName(user)}
            </Typography>

            {user.rating && (
              <Typography
                component="span"
                sx={{
                  fontSize: "0.75rem",
                  color: "rgba(255,255,255,0.45)",
                  fontWeight: 500,
                  flexShrink: 0,
                }}
              >
                ({user.rating})
              </Typography>
            )}

            <Typography
              component="span"
              sx={{
                fontSize: "0.75rem",
                color: "rgba(255,255,255,0.3)",
                fontWeight: 500,
                mx: 0.25,
                flexShrink: 0,
              }}
            >
              vs
            </Typography>

            <Typography
              component="span"
              noWrap
              sx={{
                fontWeight: 600,
                fontSize: "0.85rem",
                color: "rgba(255,255,255,0.85)",
                maxWidth: { xs: "110px", sm: "160px" },
                overflow: "hidden",
                textOverflow: "ellipsis",
                flexShrink: 1,
              }}
            >
              {formatPlayerName(opponent)}
            </Typography>

            {opponent.rating && (
              <Typography
                component="span"
                sx={{
                  fontSize: "0.75rem",
                  color: "rgba(255,255,255,0.45)",
                  fontWeight: 500,
                  flexShrink: 0,
                }}
              >
                ({opponent.rating})
              </Typography>
            )}

            <Box sx={{ marginInlineStart: "auto", flexShrink: 0 }}>
              <GameResultChip
                result={result}
                perspectiveUserColor={perspectiveUserColor}
              />
            </Box>
          </Box>
        }
        secondary={
          <Box
            sx={{
              display: "flex",
              gap: 0.75,
              alignItems: "center",
            }}
          >
            <TimeControlChip timeControl={timeControl} />
            <MovesNbChip movesNb={movesNb} />
            <DateChip date={date} />
          </Box>
        }
      />
    </ListItem>
  );
};

const formatPlayerName = (player: LoadedGame["white"]) => {
  return player.title ? `${player.title} ${player.name}` : player.name;
};
