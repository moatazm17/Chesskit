import { Container, Typography, Box, Link, IconButton } from '@mui/material';
import { useRouter } from 'next/router';
import { Icon } from '@iconify/react';

export default function AboutPage() {
  const router = useRouter();

  return (
    <Container maxWidth="sm" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <IconButton 
          onClick={() => router.back()} 
          sx={{ mr: 1, color: 'text.primary' }}
          aria-label="Go back"
        >
          <Icon icon="mdi:arrow-left" />
        </IconButton>
        <Typography variant="h5" fontWeight={700}>
          About Chess Analysis
        </Typography>
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3, whiteSpace: 'pre-line' }}>
        Chess Analysis helps you load games from popular platforms and analyze them with a Stockfish‑based
        engine in a clean, mobile‑first UI. The app focuses on quick analysis, move classifications, and
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


