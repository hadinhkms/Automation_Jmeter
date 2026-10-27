import type { EnvironmentItem } from './environmentTypes'

export const STORAGE_KEY = 'jmeter_environments_v1'

export const DEFAULT_ENVIRONMENTS: EnvironmentItem[] = [
  {
    id: 'dev',
    name: 'Dev Environment',
    variables: [
      { key: 'envi', value: 'dev', enabled: true },
      { key: 'baseUrl', value: 'api.vl24hv2.dev.sieuviet-team.com', enabled: true },
      { key: 'apiDomain', value: 'api.vl24hv2.dev.sieuviet-team.com', enabled: true },
      { key: 'seekerDomain', value: 'seeker.vl24hv2.dev.sieuviet-team.com', enabled: true },
      { key: 'sitemapDomain', value: 'cdn-vl24h.vl24hv2.dev.sieuviet-team.com', enabled: true },
    ],
  },
  {
    id: 'qc',
    name: 'QC Environment',
    variables: [
      { key: 'envi', value: 'qc', enabled: true },
      { key: 'baseUrl', value: 'api.vl24hv2.qc.sieuviet-team.com', enabled: true },
      { key: 'apiDomain', value: 'api.vl24hv2.qc.sieuviet-team.com', enabled: true },
      { key: 'seekerDomain', value: 'seeker.vl24hv2.qc.sieuviet-team.com', enabled: true },
      { key: 'sitemapDomain', value: 'cdn-vl24h.vl24hv2.qc.sieuviet-team.com', enabled: true },
    ],
  },
  {
    id: 'staging',
    name: 'Staging Environment',
    variables: [
      { key: 'envi', value: 'staging', enabled: true },
      { key: 'baseUrl', value: 'api.vl24hv2.staging.sieuviet-team.com', enabled: true },
      { key: 'apiDomain', value: 'api.vl24hv2.staging.sieuviet-team.com', enabled: true },
      { key: 'seekerDomain', value: 'seeker.vl24hv2.staging.sieuviet-team.com', enabled: true },
      { key: 'sitemapDomain', value: 'cdn-vl24h.vl24hv2.staging.sieuviet-team.com', enabled: true },
    ],
  },
  {
    id: 'prod',
    name: 'Production Environment',
    variables: [
      { key: 'envi', value: 'prod', enabled: true },
      { key: 'baseUrl', value: 'api.vieclam24h.vn', enabled: true },
      { key: 'apiDomain', value: 'api.vieclam24h.vn', enabled: true },
      { key: 'seekerDomain', value: 'vieclam24h.vn', enabled: true },
      { key: 'sitemapDomain', value: 'cdn.vieclam24h.vn', enabled: true },
    ],
  },
]
