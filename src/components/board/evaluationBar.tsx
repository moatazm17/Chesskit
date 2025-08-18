import { Box, Grid2 as Grid, Typography } from "@mui/material";
import { PrimitiveAtom, atom, useAtomValue } from "jotai";
import { useEffect, useState } from "react";
import { getEvaluationBarValue } from "@/lib/chess";
import { Color } from "@/types/enums";
import { CurrentPosition } from "@/types/eval";

interface Props {
  height: number;
  boardOrientation?: Color;
  currentPositionAtom?: PrimitiveAtom<CurrentPosition>;
}

export default function EvaluationBar({
  height,
  boardOrientation,
  currentPositionAtom = atom({}),
}: Props) {
  const [evalBar, setEvalBar] = useState({
    whiteBarPercentage: 50,
    label: "0.0",
  });
  const position = useAtomValue(currentPositionAtom);

  useEffect(() => {
    const bestLine = position?.eval?.lines[0];
    if (!position.eval || !bestLine || bestLine.depth < 6) return;

    const evalBar = getEvaluationBarValue(position.eval);
    setEvalBar(evalBar);
  }, [position]);

  return (
    <Grid
      container
      justifyContent="center"
      alignItems="center"
      width="60%"
      height="1rem"
      border="1px solid rgba(255,255,255,0.2)"
      borderRadius="4px"
      sx={{ 
        marginBottom: 1,
        backgroundColor: 'rgba(0,0,0,0.1)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
      }}
    >
      <Box
        sx={{
          backgroundColor:
            boardOrientation === Color.White ? "#424242" : "white",
          transition: "width 1s",
        }}
        width={`${
          boardOrientation === Color.White
            ? 100 - evalBar.whiteBarPercentage
            : evalBar.whiteBarPercentage
        }%`}
        height="100%"
        borderRadius={
          evalBar.whiteBarPercentage === 100 ? "5px" : "5px 0 0 5px"
        }
        display="flex"
        alignItems="center"
        justifyContent="center"
      >
        <Typography
          color={boardOrientation === Color.White ? "white" : "black"}
          textAlign="center"
          fontSize="0.75rem"
          fontWeight="bold"
        >
          {(evalBar.whiteBarPercentage < 50 &&
            boardOrientation === Color.White) ||
          (evalBar.whiteBarPercentage >= 50 && boardOrientation === Color.Black)
            ? evalBar.label
            : ""}
        </Typography>
      </Box>

      <Box
        sx={{
          backgroundColor:
            boardOrientation === Color.White ? "white" : "#424242",
          transition: "width 1s",
        }}
        width={`${
          boardOrientation === Color.White
            ? evalBar.whiteBarPercentage
            : 100 - evalBar.whiteBarPercentage
        }%`}
        height="100%"
        display="flex"
        alignItems="center"
        justifyContent="center"
        borderRadius={
          evalBar.whiteBarPercentage === 100 ? "5px" : "0 5px 5px 5px"
        }
      >
        <Typography
          color={boardOrientation === Color.White ? "black" : "white"}
          textAlign="center"
          fontSize="0.75rem"
          fontWeight="bold"
        >
          {(evalBar.whiteBarPercentage >= 50 &&
            boardOrientation === Color.White) ||
          (evalBar.whiteBarPercentage < 50 && boardOrientation === Color.Black)
            ? evalBar.label
            : ""}
        </Typography>
      </Box>
    </Grid>
  );
}
