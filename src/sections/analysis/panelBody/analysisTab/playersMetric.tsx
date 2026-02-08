import { Box, Stack, Typography } from "@mui/material";

interface Props {
  title: string;
  whiteValue: string | number;
  blackValue: string | number;
}

export default function PlayersMetric({
  title,
  whiteValue,
  blackValue,
}: Props) {
  return (
    <Stack
      justifyContent="space-between"
      alignItems="center"
      flexDirection="row"
      sx={{ width: "100%", px: 1 }}
    >
      <ValueBlock value={whiteValue} color="white" />

      <Typography
        align="center"
        noWrap
        sx={{
          fontSize: "0.8rem",
          fontWeight: 600,
          color: "rgba(255,255,255,0.6)",
          letterSpacing: 0.5,
          textTransform: "uppercase",
          px: 1,
        }}
      >
        {title}
      </Typography>

      <ValueBlock value={blackValue} color="black" />
    </Stack>
  );
}

const ValueBlock = ({
  value,
  color,
}: {
  value: string | number;
  color: "white" | "black";
}) => {
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 0.8,
        background:
          color === "white"
            ? "rgba(255,255,255,0.12)"
            : "rgba(0,0,0,0.35)",
        borderRadius: "10px",
        px: 1.5,
        py: 0.8,
        border:
          color === "white"
            ? "1px solid rgba(255,255,255,0.18)"
            : "1px solid rgba(255,255,255,0.08)",
        minWidth: 70,
        justifyContent: "center",
      }}
    >
      <Box
        sx={{
          width: 10,
          height: 10,
          borderRadius: "3px",
          backgroundColor: color === "white" ? "#fff" : "#444",
          border: "1px solid #666",
          flexShrink: 0,
        }}
      />
      <Typography
        noWrap
        sx={{
          fontSize: "0.9rem",
          fontWeight: 700,
          color: "rgba(255,255,255,0.9)",
          lineHeight: 1,
        }}
      >
        {value}
      </Typography>
    </Box>
  );
};
