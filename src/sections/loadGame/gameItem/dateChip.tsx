import { Icon } from "@iconify/react";
import { Chip, Tooltip } from "@mui/material";

interface Props {
  date?: string;
}

export default function DateChip({ date }: Props) {
  if (!date) return null;

  return (
    <Tooltip title="Date Played">
      <Chip
        icon={<Icon icon="material-symbols:calendar-today" />}
        label={date}
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
