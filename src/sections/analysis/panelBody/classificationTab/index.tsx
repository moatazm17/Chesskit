import { Divider, Grid2 as Grid, Grid2Props as GridProps, useMediaQuery, useTheme } from "@mui/material";
import MovesPanel from "./movesPanel";
import MovesClassificationsRecap from "./movesClassificationsRecap";

export default function ClassificationTab(props: GridProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  return (
    <Grid
      container
      justifyContent="center"
      alignItems="start"
      size={12}
      flexGrow={1}
      {...props}
      sx={
        props.hidden
          ? { display: "none" }
          : {
              overflow: "hidden",
              flexDirection: isMobile ? "column" : "row",
              flexWrap: isMobile ? "nowrap" : "wrap",
              ...props.sx,
            }
      }
    >
      <MovesClassificationsRecap />

      {isMobile && (
        <Divider sx={{ width: "90%", my: 1, borderColor: "rgba(255,255,255,0.08)" }} />
      )}

      <Grid
        size={isMobile ? 12 : 6}
        sx={{
          maxHeight: isMobile ? "280px" : "100%",
          overflowY: "auto",
          scrollbarWidth: "thin",
        }}
      >
        <MovesPanel />
      </Grid>
    </Grid>
  );
}
