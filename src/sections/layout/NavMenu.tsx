import NavLink from "@/components/NavLink";
import { Icon } from "@iconify/react";
import {
  Box,
  Divider,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Switch,
  Toolbar,
} from "@mui/material";
import { useAtom } from "jotai";
import { checkReactionAtom } from "@/components/board/states";
import { useTranslation } from "@/lib/i18n";

const MenuOptions = [
  { text: "Play", icon: "streamline:chess-pawn", href: "/play" },
  { text: "Analysis", icon: "streamline:magnifying-glass-solid", href: "/" },
  {
    text: "Database",
    icon: "streamline:database",
    href: "/database",
  },
];

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function NavMenu({ open, onClose }: Props) {
  const [checkReaction, setCheckReaction] = useAtom(checkReactionAtom);
  const { t } = useTranslation();

  return (
    <Drawer anchor="left" open={open} onClose={onClose}>
      <Toolbar />
      <Box sx={{ width: 250, overflow: "hidden" }}>
        <List>
          {MenuOptions.map(({ text, icon, href }) => (
            <ListItem key={text} disablePadding sx={{ margin: 0.7 }}>
              <NavLink href={href}>
                <ListItemButton onClick={onClose}>
                  <ListItemIcon style={{ paddingLeft: "0.5em" }}>
                    <Icon icon={icon} height="1.5em" />
                  </ListItemIcon>
                  <ListItemText primary={text} />
                </ListItemButton>
              </NavLink>
            </ListItem>
          ))}

          <Divider sx={{ my: 1 }} />

          <ListItem disablePadding sx={{ margin: 0.7 }}>
            <ListItemButton onClick={() => setCheckReaction(!checkReaction)}>
              <ListItemIcon style={{ paddingLeft: "0.5em" }}>
                <Icon icon="mdi:bell-ring-outline" height="1.5em" />
              </ListItemIcon>
              <ListItemText primary={t("checkReaction")} />
              <Switch
                edge="end"
                checked={checkReaction}
                onChange={(e) => setCheckReaction(e.target.checked)}
              />
            </ListItemButton>
          </ListItem>
        </List>
      </Box>
    </Drawer>
  );
}
