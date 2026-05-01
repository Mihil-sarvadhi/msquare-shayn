import baseService from '@services/configs/baseService';
import { API_ENDPOINTS } from '@utils/constants/api.constant';
import { buildRangeParams } from '@utils/common-functions/buildRangeParams';
import type { RangeState } from '@store/slices/rangeSlice';
import type { MarqueePayload } from '@app/types/marquee';

export async function fetchMarquee(range: RangeState): Promise<MarqueePayload> {
  const params = buildRangeParams(range);
  const res = await baseService.get<{ data: MarqueePayload }>(API_ENDPOINTS.dashboard.marquee, {
    params,
  });
  return res.data.data;
}
