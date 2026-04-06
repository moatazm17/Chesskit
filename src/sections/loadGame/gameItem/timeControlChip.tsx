import { Icon } from "@iconify/react";
import { Chip, Tooltip } from "@mui/material";

interface Props {
  timeControl?: string;
}

export default function TimeControlChip({ timeControl }: Props) {
  if (!timeControl) return null;

  return (
    <Tooltip title="Time Control">
      <Chip
        icon={<Icon icon="material-symbols:timer-outline" />}
        label={timeControl}
        size="small"
        sx={{
          fontSize: "0.72rem",
          height: "24px",
          "& .MuiChip-icon": { fontSize: "14px", marginInlineEnd: "-3px" },
        }}
      />
    </Tooltip>
  );
}
