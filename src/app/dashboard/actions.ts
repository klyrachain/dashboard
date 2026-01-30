"use server";

import {
  getVolumeChartDataFromCore,
  type VolumeDateRange,
  type VolumeGranularity,
  type VolumeChartResult,
} from "@/lib/data-dashboard";

export async function getDashboardVolumeAction(
  range: VolumeDateRange,
  granularity: VolumeGranularity
): Promise<VolumeChartResult> {
  return getVolumeChartDataFromCore(range, granularity);
}
