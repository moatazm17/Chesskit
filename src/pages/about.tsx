import {
  Container,
  Typography,
  Box,
  IconButton,
  Collapse,
} from "@mui/material";
import { useRouter } from "next/router";
import { Icon } from "@iconify/react";
import { useState } from "react";

export default function AboutPage() {
  const router = useRouter();
  const [showCredits, setShowCredits] = useState(false);


  return (
    <Container maxWidth="sm" sx={{ py: 4 }}>
      <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
        <IconButton
          onClick={() => router.back()}
          sx={{ mr: 1, color: "text.primary" }}
          aria-label="Go back"
        >
          <Icon icon="mdi:arrow-left" />
        </IconButton>
        <Typography variant="h5" fontWeight={700}>
          About Chess Analysis
        </Typography>
      </Box>

      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ mb: 3, whiteSpace: "pre-line" }}
      >
        Chess Analysis helps you load games from popular platforms and analyze
        them with a Stockfish‑based engine in a clean, mobile‑first UI. The app
        focuses on quick analysis, move classifications, and clear insights for
        improvement.
      </Typography>

      {/* Credits toggle */}
      <Box
        onClick={() => setShowCredits(!showCredits)}
        sx={{
          display: "flex",
          alignItems: "center",
          cursor: "pointer",
          mt: 2,
          py: 1,
          px: 1.5,
          borderRadius: "8px",
          "&:hover": { backgroundColor: "rgba(255,255,255,0.05)" },
        }}
      >
        <Icon
          icon={showCredits ? "mdi:chevron-down" : "mdi:chevron-right"}
          style={{ fontSize: "1.2rem", marginRight: 8, opacity: 0.6 }}
        />
        <Typography variant="subtitle2" sx={{ fontWeight: 600, opacity: 0.7 }}>
          Credits
        </Typography>
      </Box>

      <Collapse in={showCredits}>
        <Box sx={{ pl: 4, pr: 1, py: 1 }}>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mb: 1.5 }}
          >
            This app is based on the open‑source project Chesskit by GuillaumeSD
            and contributors. Licensed under AGPL‑3.0.
          </Typography>

        </Box>
      </Collapse>
    </Container>
  );
}
