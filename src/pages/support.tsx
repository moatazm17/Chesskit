import { Container, Typography, Link } from '@mui/material';

export default function SupportPage() {
  return (
    <Container maxWidth="sm" sx={{ py: 4 }}>
      <Typography variant="h5" fontWeight={700} gutterBottom>
        Support
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-line' }}>
        Need help? Email us at <Link href="mailto:support@livroll.com">support@livroll.com</Link>.
        We aim to respond within 2–3 business days.
      </Typography>
    </Container>
  );
}


