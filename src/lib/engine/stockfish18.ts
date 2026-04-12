import { EngineName } from "@/types/enums";
import { UciEngine } from "./uciEngine";
import { isMultiThreadSupported, isWasmSupported } from "./shared";

export class Stockfish18 {
  public static async create(lite?: boolean): Promise<UciEngine> {
    if (!Stockfish18.isSupported()) {
      throw new Error("Stockfish 18 is not supported");
    }

    const multiThreadIsSupported = isMultiThreadSupported();

    const enginePath = `engines/stockfish-18/stockfish-18${
      lite ? "-lite" : ""
    }${multiThreadIsSupported ? "" : "-single"}.js`;

    const engineName = lite
      ? EngineName.Stockfish18Lite
      : EngineName.Stockfish18;

    return UciEngine.create(engineName, enginePath);
  }

  public static isSupported() {
    return isWasmSupported();
  }
}
