import { Box, Container, Typography, Link, Button } from '@mui/material';

export default function PrivacyPage() {
  return (
    <Container maxWidth="sm" sx={{ py: 4 }}>
      <Typography variant="h5" fontWeight={700} gutterBottom>
        Privacy Policy
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        View our full, hosted Privacy Policy below. This is the policy we link in the app stores
        and inside the app.
      </Typography>
      <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
        <Button component={Link} href="https://doc-hosting.flycricket.io/chess-review-privacy-policy/4f2c4e45-455f-488a-8e23-e3728b7bb98f/privacy" target="_blank" rel="noopener" variant="contained">
          Open Privacy Policy
        </Button>
      </Box>
      <Typography variant="caption" color="text.secondary">
        Effective date shown on the hosted policy.
      </Typography>
    </Container>
  );
}


