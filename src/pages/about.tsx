import { Container, Typography, Box, Link } from '@mui/material';

export default function AboutPage() {
  return (
    <Container maxWidth="sm" sx={{ py: 4 }}>
      <Typography variant="h5" fontWeight={700} gutterBottom>
        About Chess Review
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3, whiteSpace: 'pre-line' }}>
        Chess Review helps you load games from popular platforms and analyze them with a Stockfish‑based
        engine in a clean, mobile‑first UI. The app focuses on quick review, move classifications, and
        clear insights for improvement.
      </Typography>
      <Box sx={{ mt: 2 }}>
        <Typography variant="subtitle1" fontWeight={700} gutterBottom>
          Credits & License (AGPL‑3.0)
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-line' }}>
          This app is based on the open‑source project Chesskit by GuillaumeSD and contributors.
          We comply with the AGPL‑3.0 license.
          {'\n'}Original repo: <Link href="https://github.com/GuillaumeSD/Chesskit/" target="_blank" rel="noopener">github.com/GuillaumeSD/Chesskit</Link>
          {'\n'}Our fork: <Link href="https://github.com/moatazm17/Chesskit" target="_blank" rel="noopener">github.com/moatazm17/Chesskit</Link>
        </Typography>
      </Box>
    </Container>
  );
}


