import { useMemo, useState } from 'react'
import type { JtlSample } from '../../../services/jmeterRunnerService'
import { filterSamples } from './sampleParsers'

/** Search / filter toolbar state and the resulting filtered sample list. */
export function useSampleFilters(samples: JtlSample[]) {
  const [searchQuery, setSearchQuery] = useState('')
  const [caseSensitive, setCaseSensitive] = useState(false)
  const [isRegexp, setIsRegexp] = useState(false)
  const [filterErrorsOnly, setFilterErrorsOnly] = useState(false)
  const [filterSuccessOnly, setFilterSuccessOnly] = useState(false)
  const [autoScroll, setAutoScroll] = useState(true)

  // Filtered samples
  const filteredSamples = useMemo(() => {
    return filterSamples(samples, { searchQuery, caseSensitive, isRegexp, filterErrorsOnly, filterSuccessOnly })
  }, [samples, searchQuery, caseSensitive, isRegexp, filterErrorsOnly, filterSuccessOnly])

  return {
    searchQuery,
    setSearchQuery,
    caseSensitive,
    setCaseSensitive,
    isRegexp,
    setIsRegexp,
    filterErrorsOnly,
    setFilterErrorsOnly,
    filterSuccessOnly,
    setFilterSuccessOnly,
    autoScroll,
    setAutoScroll,
    filteredSamples,
  }
}

export type SampleFiltersState = ReturnType<typeof useSampleFilters>
