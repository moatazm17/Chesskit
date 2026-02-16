import "@fontsource/roboto/400.css";
import "@fontsource/roboto/500.css";
import "@fontsource/roboto/700.css";
import { AppProps } from "next/app";
import Layout from "@/sections/layout";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ErrorBoundary from "@/components/ErrorBoundary";

const queryClient = new QueryClient();

function MaintenancePage() {
  return (
    <div
      dir="rtl"
      style={{
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        background: "#1a1a2e",
        color: "#fff",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
        padding: "20px",
      }}
    >
      <div style={{ textAlign: "center", maxWidth: "400px" }}>
        <div style={{ fontSize: "64px", marginBottom: "20px" }}>♟️</div>
        <h1
          style={{ fontSize: "24px", marginBottom: "16px", color: "#4CAF50" }}
        >
          مطلوب تحديث التطبيق
        </h1>
        <p
          style={{
            fontSize: "16px",
            lineHeight: 1.6,
            color: "#ccc",
            marginBottom: "24px",
          }}
        >
          تم تحديث التطبيق. لاستخدام النسخة الجديدة:
        </p>
        <div
          style={{
            background: "rgba(255,255,255,0.05)",
            borderRadius: "12px",
            padding: "20px",
            textAlign: "right",
          }}
        >
          <div style={{ padding: "8px 0", fontSize: "15px", color: "#ddd" }}>
            ١. امسح تطبيق ChessPlus من موبايلك
          </div>
          <div style={{ padding: "8px 0", fontSize: "15px", color: "#ddd" }}>
            ٢. حمّله تاني من المتجر
          </div>
          <div style={{ padding: "8px 0", fontSize: "15px", color: "#ddd" }}>
            ٣. افتح التطبيق واستمتع!
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MyApp({ Component, pageProps }: AppProps) {
  if (process.env.NEXT_PUBLIC_MAINTENANCE === "true") {
    return <MaintenancePage />;
  }

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <Layout>
          <Component {...pageProps} />
        </Layout>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
