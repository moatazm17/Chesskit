import { Grid2 as Grid, Grid2Props as GridProps, useMediaQuery, useTheme } from "@mui/material";
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

      <MovesPanel />
    </Grid>
  );
}
