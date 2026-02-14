import React, { Component, ErrorInfo, ReactNode } from "react";
import { Box, Typography, Button } from "@mui/material";
import { Icon } from "@iconify/react";
import { logErrorToSentry } from "@/lib/sentry";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logErrorToSentry(error, {
      componentStack: errorInfo.componentStack || "",
    });
  }

  handleReload = () => {
    this.setState({ hasError: false });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "100vh",
            bgcolor: "#1a1a2e",
            color: "white",
            textAlign: "center",
            p: 3,
          }}
        >
          <Icon
            icon="mdi:alert-circle-outline"
            height={64}
            color="#ff6b6b"
          />
          <Typography variant="h5" fontWeight={700} mt={2}>
            Something went wrong
          </Typography>
          <Typography variant="body1" color="grey.400" mt={1} mb={3}>
            An unexpected error occurred. Please try again.
          </Typography>
          <Button
            variant="contained"
            onClick={this.handleReload}
            sx={{
              background: "linear-gradient(135deg, #4ecdc4, #45b7d1)",
              borderRadius: 2,
              px: 4,
              py: 1,
            }}
          >
            Reload App
          </Button>
        </Box>
      );
    }

    return this.props.children;
  }
}
