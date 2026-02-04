"use server";

import {
  getVolumeChartDataFromPlatformOverview,
  type VolumeDateRange,
  type VolumeGranularity,
  type VolumeChartResult,
} from "@/lib/data-dashboard";

export async function getDashboardVolumeAction(
  range: VolumeDateRange,
  granularity: VolumeGranularity
): Promise<VolumeChartResult> {
  return getVolumeChartDataFromPlatformOverview(range, granularity);
}
