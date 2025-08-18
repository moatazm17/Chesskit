import { Container, Typography, Link, Button } from '@mui/material';

export default function TermsPage() {
  return (
    <Container maxWidth="sm" sx={{ py: 4 }}>
      <Typography variant="h5" fontWeight={700} gutterBottom>
        Terms of Service
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        View our full, hosted Terms. This is the version we reference in the app stores.
      </Typography>
      <Button component={Link} href="https://doc-hosting.flycricket.io/terms/38e8128e-1d6d-447e-8fce-6cf3e31f4617/terms" target="_blank" rel="noopener" variant="contained">
        Open Terms of Service
      </Button>
    </Container>
  );
}


