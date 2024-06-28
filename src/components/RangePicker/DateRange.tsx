import { RangePickerProps } from 'antd/es/date-picker';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import type { RangeValueType } from 'rc-picker/lib/PickerInput/RangePicker.d.ts';

export const DateRangeDefaultPresets: Record<string, RangeValueType<Dayjs>> = {
  本日: [dayjs().startOf('day'), dayjs().endOf('day')],
  本周: [dayjs().startOf('week'), dayjs().endOf('week')],
  本月: [dayjs().startOf('month'), dayjs().endOf('month')],
  上月: [
    dayjs().startOf('month').subtract(1, 'month'),
    dayjs().startOf('month').subtract(1, 'month').endOf('month'),
  ],
  一年内: [dayjs().subtract(365, 'days').startOf('day'), dayjs().endOf('day')],
  两年内: [
    dayjs()
      .subtract(365 * 2, 'days')
      .startOf('day'),
    dayjs().endOf('day'),
  ],
  三年内: [
    dayjs()
      .subtract(365 * 3, 'days')
      .startOf('day'),
    dayjs().endOf('day'),
  ],
  四年内: [
    dayjs()
      .subtract(365 * 4, 'days')
      .startOf('day'),
    dayjs().endOf('day'),
  ],
};

export const transformPresets = (
  payload: Record<string, RangeValueType<Dayjs> | boolean>,
): RangePickerProps['presets'] => {
  const result: RangePickerProps['presets'] = [];
  Object.keys(payload).forEach((key) => {
    if (typeof payload[key] !== 'boolean') {
      result.push({
        label: key,
        value: payload[key] as RangeValueType<Dayjs>,
      });
    } else if (typeof payload[key] === 'boolean' && payload[key] === true) {
      result.push({
        label: key,
        value: DateRangeDefaultPresets[key],
      });
    }
  });
  return result;
};
