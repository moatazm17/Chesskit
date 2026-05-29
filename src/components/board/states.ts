import { PIECE_SETS } from "@/constants";
import { atomWithStorage } from "jotai/utils";

export const pieceSetAtom = atomWithStorage<(typeof PIECE_SETS)[number]>(
  "pieceSet",
  "cburnett"
);

export const checkReactionAtom = atomWithStorage<boolean>(
  "checkReaction",
  true
);
