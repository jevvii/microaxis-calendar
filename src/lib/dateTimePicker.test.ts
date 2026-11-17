import { describe, expect, it } from 'vitest'
import {
  addMinutesToDateTimeLocal,
  addMonthsToMonthKey,
  adjustEndAfterStart,
  buildMonthGrid,
  formatTimeValue,
  parseTimeValue,
} from './dateTimePicker'

describe('adjustEndAfterStart', () => {
  it('preserves the duration when the start moves', () => {
    expect(
      adjustEndAfterStart(
        '2026-11-03T10:00',
        '2026-11-03T11:00',
        '2026-11-03T11:00',
        false,
      ),
    ).toBe('2026-11-03T12:00')
  })

  it('moves an empty or invalid end to one hour after the start', () => {
    expect(adjustEndAfterStart('2026-11-03T10:00', '2026-11-03T10:00', '', false)).toBe(
      '2026-11-03T11:00',
    )
    expect(
      adjustEndAfterStart('2026-11-03T10:00', '2026-11-03T10:00', '2026-11-03T09:00', false),
    ).toBe('2026-11-03T11:00')
    expect(
      adjustEndAfterStart('2026-11-03T10:00', '2026-11-03T10:00', '2026-11-03T10:00', false),
    ).toBe('2026-11-03T11:00')
  })

  it('preserves the number of all-day days and never ends before the start', () => {
    expect(adjustEndAfterStart('2026-11-03', '2026-11-04', '2026-11-05', true)).toBe(
      '2026-11-06',
    )
    expect(adjustEndAfterStart('2026-11-03', '2026-11-05', '2026-11-03', true)).toBe(
      '2026-11-05',
    )
    expect(adjustEndAfterStart('2026-11-03', '2026-11-05', '', true)).toBe('2026-11-05')
  })
})

describe('addMinutesToDateTimeLocal', () => {
  it('rolls over to the next day', () => {
    expect(addMinutesToDateTimeLocal('2026-11-03T23:30', 60)).toBe('2026-11-04T00:30')
  })
})

describe('time formatting and parsing', () => {
  it('formats 12-hour and 24-hour values', () => {
    expect(formatTimeValue('00:00', false)).toBe('12:00 AM')
    expect(formatTimeValue('09:05', false)).toBe('9:05 AM')
    expect(formatTimeValue('13:05', false)).toBe('1:05 PM')
    expect(formatTimeValue('13:05', true)).toBe('13:05')
  })

  it('parses typed times in both clocks', () => {
    expect(parseTimeValue('21:15')).toBe('21:15')
    expect(parseTimeValue('9:15 pm')).toBe('21:15')
    expect(parseTimeValue('12:00 AM')).toBe('00:00')
    expect(parseTimeValue('not a time')).toBeNull()
  })
})

describe('month grid helpers', () => {
  it('builds six weeks from the viewer week start', () => {
    const mondayGrid = buildMonthGrid('2026-11', 1)
    expect(mondayGrid).toHaveLength(42)
    expect(mondayGrid[0]).toBe('2026-10-26')
    expect(mondayGrid[41]).toBe('2026-12-06')

    const sundayGrid = buildMonthGrid('2026-11', 0)
    expect(sundayGrid[0]).toBe('2026-11-01')
  })

  it('moves across year boundaries', () => {
    expect(addMonthsToMonthKey('2026-12', 1)).toBe('2027-01')
    expect(addMonthsToMonthKey('2026-01', -1)).toBe('2025-12')
  })
})
