import { Container, Typography, Link, IconButton, Box } from '@mui/material';
import { useRouter } from 'next/router';
import { Icon } from '@iconify/react';

export default function SupportPage() {
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
          Support
        </Typography>
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-line' }}>
        Need help? Email us at <Link href="mailto:support@livroll.com">support@livroll.com</Link>.
        We aim to respond within 2–3 business days.
      </Typography>
    </Container>
  );
}


