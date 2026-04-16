import { fetchGasPrice } from "./fuelService";
import { fetchElectricityRate } from "./electricityService";
import type { LiveDataResult } from "./types";

export async function fetchLiveData(): Promise<LiveDataResult> {
  const [gasPrice, electricityRate] = await Promise.all([
    fetchGasPrice(),
    fetchElectricityRate(),
  ]);

  return {
    gasPrice,
    electricityRate,
  };
}