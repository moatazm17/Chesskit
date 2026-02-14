import { EngineName } from "@/types/enums";
import { UciEngine } from "./uciEngine";
import { isMultiThreadSupported, isWasmSupported } from "./shared";

export class Stockfish16_1 {
  public static async create(lite?: boolean): Promise<UciEngine> {
    if (!Stockfish16_1.isSupported()) {
      throw new Error("Stockfish 16.1 is not supported");
    }

    const multiThreadIsSupported = isMultiThreadSupported();
    // Single thread fallback if SharedArrayBuffer is not available

    const enginePath = `engines/stockfish-16.1/stockfish-16.1${
      lite ? "-lite" : ""
    }${multiThreadIsSupported ? "" : "-single"}.js`;

    const engineName = lite
      ? EngineName.Stockfish16_1Lite
      : EngineName.Stockfish16_1;

    return UciEngine.create(engineName, enginePath);
  }

  public static isSupported() {
    return isWasmSupported();
  }
}
