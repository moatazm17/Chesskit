import { useLocalStorage } from "@/hooks/useLocalStorage";
import { getChessComUserRecentGames } from "@/lib/chessCom";
import {
  CircularProgress,
  FormControl,
  Grid2 as Grid,
  TextField,
  List,
  Autocomplete,
} from "@mui/material";
import { Icon } from "@iconify/react";
import { useDebounce } from "@/hooks/useDebounce";
import { useQuery } from "@tanstack/react-query";
import { InputAdornment } from "@mui/material";
import { useMemo, useState } from "react";
import { GameItem } from "./gameItem";
import { useTranslation } from "@/lib/i18n";

interface Props {
  onSelect: (pgn: string, boardOrientation?: boolean) => void;
}

export default function ChessComInput({ onSelect }: Props) {
  const { t } = useTranslation();
  const [rawStoredValue, setStoredValues] = useLocalStorage<string>(
    "chesscom-username",
    ""
  );
  const [chessComUsername, setChessComUsername] = useState("");
  const [hasEdited, setHasEdited] = useState(false);
  const [gameFilter, setGameFilter] = useState("");

  const storedValues = useMemo(() => {
    if (typeof rawStoredValue === "string") {
      return rawStoredValue
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }

    return [];
  }, [rawStoredValue]);

  if (
    !hasEdited &&
    storedValues.length &&
    chessComUsername.trim().toLowerCase() !=
      storedValues[0].trim().toLowerCase()
  ) {
    setChessComUsername(storedValues[0].trim());
  }

  const updateHistory = (username: string) => {
    const trimmed = username.trim();
    if (!trimmed) return;
    const lower = trimmed.toLowerCase();

    const updated = [
      trimmed,
      ...storedValues.filter((u) => u.toLowerCase() !== lower),
    ].slice(0, 8);

    setStoredValues(updated.join(","));
  };

  const deleteUsername = (usernameToDelete: string) => {
    const updated = storedValues.filter((u) => u !== usernameToDelete);
    setStoredValues(updated.join(","));
  };

  const handleChange = (_: React.SyntheticEvent, newValue: string | null) => {
    const newInputValue = newValue ?? "";
    setChessComUsername(newInputValue.trim());
    setHasEdited(true);
  };

  const debouncedUsername = useDebounce(chessComUsername, 300);

  const {
    data: games,
    isFetching,
    isError,
  } = useQuery({
    queryKey: ["CCUserGames", debouncedUsername],
    enabled: !!debouncedUsername,
    queryFn: ({ signal }) =>
      getChessComUserRecentGames(debouncedUsername ?? "", signal),
    retry: 1,
  });

  return (
    <>
      <FormControl sx={{ my: 1, width: 300 }}>
        <Autocomplete
          freeSolo
          options={storedValues}
          inputValue={chessComUsername}
          onInputChange={handleChange}
          onChange={handleChange}
          renderOption={(props, option) => {
            const { key, ...rest } = props;
            return (
              <li
                key={key}
                {...rest}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  paddingRight: 8,
                }}
              >
                <span>{option}</span>
                <Icon
                  icon="mdi:close"
                  style={{ cursor: "pointer" }}
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteUsername(option);
                  }}
                />
              </li>
            );
          }}
          renderInput={(params) => (
            <TextField
              {...params}
              label={t("enterChessComUsername")}
              variant="outlined"
              sx={{
                '& .MuiOutlinedInput-root': {
                  color: 'white',
                  '& fieldset': {
                    borderColor: 'rgba(255,255,255,0.3)',
                  },
                  '&:hover fieldset': {
                    borderColor: 'rgba(255,255,255,0.5)',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#4ecdc4',
                  },
                },
                '& .MuiInputLabel-root': {
                  color: 'rgba(255,255,255,0.8)',
                  '&.Mui-focused': {
                    color: '#4ecdc4',
                  },
                },
                '& .MuiAutocomplete-popupIndicator': {
                  color: 'rgba(255,255,255,0.8)',
                },
              }}
            />
          )}
        />
      </FormControl>

      {debouncedUsername && (
        <Grid
          container
          gap={2}
          justifyContent="center"
          alignContent="center"
          minHeight={100}
          size={12}
        >
          {isFetching ? (
            <CircularProgress />
          ) : isError ? (
            <span style={{ color: "salmon" }}>
              {t("userNotFoundCheck")}
            </span>
          ) : !games?.length ? (
            <span style={{ color: "salmon" }}>
              {t("noGamesFoundCheck")}
            </span>
          ) : (
            <>
              <TextField
                placeholder={t("searchOpponent") || "Search opponent..."}
                value={gameFilter}
                onChange={(e) => setGameFilter(e.target.value)}
                size="small"
                fullWidth
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Icon icon="mdi:magnify" style={{ color: "rgba(255,255,255,0.4)", fontSize: 18 }} />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  mb: 1,
                  "& .MuiOutlinedInput-root": {
                    color: "white",
                    fontSize: "0.85rem",
                    borderRadius: "10px",
                    "& fieldset": { borderColor: "rgba(255,255,255,0.15)" },
                    "&:hover fieldset": { borderColor: "rgba(255,255,255,0.3)" },
                    "&.Mui-focused fieldset": { borderColor: "#4ecdc4" },
                  },
                }}
              />
              <List sx={{ width: "100%", maxHeight: 400, overflowY: "auto", scrollbarWidth: "thin" }}>
                {games
                  .filter((game) => {
                    if (!gameFilter.trim()) return true;
                    const myLower = debouncedUsername.toLowerCase();
                    const isWhite = game.white.name.toLowerCase() === myLower;
                    const opponentName = isWhite ? game.black.name : game.white.name;
                    return opponentName.toLowerCase().includes(gameFilter.trim().toLowerCase());
                  })
                  .map((game) => {
                    const perspectiveUserColor =
                      game.white.name.toLowerCase() ===
                      debouncedUsername.toLowerCase()
                        ? "white"
                        : "black";

                    return (
                      <GameItem
                        key={game.id}
                        game={game}
                        perspectiveUserColor={perspectiveUserColor}
                        searchUsername={debouncedUsername}
                        onClick={() => {
                          const boardOrientation =
                            debouncedUsername.toLowerCase() !==
                            game.black?.name?.toLowerCase();
                          onSelect(game.pgn, boardOrientation);
                          updateHistory(debouncedUsername);
                        }}
                      />
                    );
                  })}
              </List>
            </>
          )}
        </Grid>
      )}
    </>
  );
}
