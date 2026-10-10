/*
 * Turn the API's cumulative counters into live per-second rates.
 *
 * The network endpoint returns totals since boot, so a rate is the difference
 * between two consecutive samples divided by the time between them. The previous
 * sample is held in a ref so the effect can compare it with the fresh one without
 * triggering a render of its own.
 */

import { useEffect, useRef, useState } from 'react'
import { rateBetween } from './format'

export interface CounterSample {
  rxBytes: number
  txBytes: number
  readBytes: number
  writeBytes: number
}

export interface CounterRates {
  rx: number
  tx: number
  read: number
  write: number
}

const ZERO: CounterRates = { rx: 0, tx: 0, read: 0, write: 0 }

export function useCounterRates(sample: CounterSample | undefined): CounterRates {
  const previous = useRef<{ at: number; sample: CounterSample } | null>(null)
  const [rates, setRates] = useState<CounterRates>(ZERO)

  useEffect(() => {
    if (!sample) {
      return
    }
    const now = Date.now()
    const last = previous.current
    if (last) {
      const elapsed = now - last.at
      setRates({
        rx: rateBetween(last.sample.rxBytes, sample.rxBytes, elapsed),
        tx: rateBetween(last.sample.txBytes, sample.txBytes, elapsed),
        read: rateBetween(last.sample.readBytes, sample.readBytes, elapsed),
        write: rateBetween(last.sample.writeBytes, sample.writeBytes, elapsed),
      })
    }
    previous.current = { at: now, sample }
  }, [sample])

  return rates
}
