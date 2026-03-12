import { Fab } from "@mui/material";
import { useState } from "react";
import EngineSettingsDialog from "./engineSettingsDialog";
import { Icon } from "@iconify/react";
import { useTranslation } from "@/lib/i18n";

export default function EngineSettingsButton() {
  const { t } = useTranslation();
  const [openDialog, setOpenDialog] = useState(false);

  return (
    <>
      <Fab
        title={t("engineSettings")}
        color="secondary"
        size="small"
        sx={{
          top: "auto",
          right: 16,
          bottom: 16,
          left: "auto",
          position: "fixed",
          display: "none", // Hidden from UI temporarily
        }}
        onClick={() => setOpenDialog(true)}
      >
        <Icon icon="mdi:settings" height={20} />
      </Fab>

      <EngineSettingsDialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
      />
    </>
  );
}
