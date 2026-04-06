import type React from "react";
import { ListItem, Typography, Box } from "@mui/material";
import { LoadedGame } from "@/types/game";
import { Icon } from "@iconify/react";

interface Props {
  game: LoadedGame;
  onClick: () => void;
  perspectiveUserColor: "white" | "black";
  searchUsername?: string;
}

const getResultInfo = (
  result: string | undefined,
  perspectiveUserColor: "white" | "black"
) => {
  const userWon =
    (result === "1-0" && perspectiveUserColor === "white") ||
    (result === "0-1" && perspectiveUserColor === "black");
  const userLost =
    (result === "1-0" && perspectiveUserColor === "black") ||
    (result === "0-1" && perspectiveUserColor === "white");
  const isDraw = result === "1/2-1/2";

  if (userWon) return { label: "Win", color: "#4caf50", border: "#4caf5060" };
  if (userLost) return { label: "Loss", color: "#f44336", border: "#f4433660" };
  if (isDraw) return { label: "Draw", color: "#90caf9", border: "#90caf960" };
  return { label: "?", color: "#888", border: "#88888860" };
};

export const GameItem: React.FC<Props> = ({
  game,
  onClick,
  perspectiveUserColor,
}) => {
  const { white, black, result, timeControl, date, movesNb } = game;

  const isUserWhite = perspectiveUserColor === "white";
  const user = isUserWhite ? white : black;
  const opponent = isUserWhite ? black : white;
  const { label: resultLabel, color: resultColor, border: borderColor } =
    getResultInfo(result, perspectiveUserColor);

  return (
    <ListItem
      disablePadding
      sx={{
        borderRadius: "10px",
        mb: 1,
        borderInlineStart: `3px solid ${borderColor}`,
        transition: "background 0.15s ease",
        "&:hover": { backgroundColor: "rgba(255,255,255,0.05)" },
        cursor: "pointer",
      }}
      onClick={onClick}
    >
      <Box
        sx={{
          direction: "ltr",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          gap: "4px",
          py: 1,
          px: 1.5,
        }}
      >
        {/* Row 1: Players */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            minWidth: 0,
          }}
        >
          <Typography
            component="span"
            noWrap
            sx={{
              fontWeight: 700,
              fontSize: "0.88rem",
              color: "#FFD700",
              minWidth: 0,
              flexShrink: 1,
            }}
          >
            {formatPlayerName(user)}
          </Typography>

          <Typography
            component="span"
            sx={{
              fontSize: "0.72rem",
              color: "rgba(255,255,255,0.4)",
              flexShrink: 0,
            }}
          >
            ({user.rating})
          </Typography>

          <Typography
            component="span"
            sx={{
              fontSize: "0.7rem",
              color: "rgba(255,255,255,0.25)",
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
              fontSize: "0.88rem",
              color: "rgba(255,255,255,0.85)",
              minWidth: 0,
              flexShrink: 1,
            }}
          >
            {formatPlayerName(opponent)}
          </Typography>

          <Typography
            component="span"
            sx={{
              fontSize: "0.72rem",
              color: "rgba(255,255,255,0.4)",
              flexShrink: 0,
            }}
          >
            ({opponent.rating})
          </Typography>

          <Typography
            component="span"
            sx={{
              marginLeft: "auto",
              fontSize: "0.72rem",
              fontWeight: 700,
              color: resultColor,
              flexShrink: 0,
            }}
          >
            {resultLabel}
          </Typography>
        </Box>

        {/* Row 2: Meta info */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            color: "rgba(255,255,255,0.35)",
            fontSize: "0.72rem",
          }}
        >
          {timeControl && (
            <Box sx={{ display: "flex", alignItems: "center", gap: "3px" }}>
              <Icon
                icon="material-symbols:timer-outline"
                style={{ fontSize: 13 }}
              />
              <span>{timeControl}</span>
            </Box>
          )}

          {movesNb != null && (
            <Box sx={{ display: "flex", alignItems: "center", gap: "3px" }}>
              <Icon icon="mdi:pound" style={{ fontSize: 13 }} />
              <span>{Math.ceil(movesNb / 2)} moves</span>
            </Box>
          )}

          {date && (
            <Box sx={{ display: "flex", alignItems: "center", gap: "3px" }}>
              <Icon
                icon="material-symbols:calendar-today"
                style={{ fontSize: 13 }}
              />
              <span>{date}</span>
            </Box>
          )}
        </Box>
      </Box>
    </ListItem>
  );
};

const formatPlayerName = (player: LoadedGame["white"]) => {
  return player.title ? `${player.title} ${player.name}` : player.name;
};
