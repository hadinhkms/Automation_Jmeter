import { Layers, TrendingUp } from 'lucide-react'
import { createNode } from '../../../mock/sampleTestPlan'
import type { TemplateItem } from '../../../models/templateGallery'

export const microserviceTemplate: TemplateItem = {
  id: 'microservice_smoke',
  title: 'Microservices REST API Smoke & Load Test',
  category: 'API',
  icon: Layers,
  badge: 'Standard',
  description: 'Fast automated sanity test covering API Health Checks, REST CRUD operations, dynamic UUID generation with Groovy script.',
  tags: ['REST API', 'JSR223 Groovy', 'Assertions', 'CRUD'],
  buildPlan: () => {
    const healthCheck = createNode('HTTPRequest', 'GET /health', {
      protocol: 'https',
      server: 'api.microservice.example.com',
      path: '/health',
      method: 'GET',
    }, [
      createNode('ResponseAssertion', 'Check HTTP 200', { patterns: [{ pattern: '200' }] }),
    ])

    const createItem = createNode('HTTPRequest', 'POST /v1/items', {
      protocol: 'https',
      server: 'api.microservice.example.com',
      path: '/v1/items',
      method: 'POST',
      postBodyRaw: true,
      body: '{\n  "title": "Smoke Test Item ${__UUID()}",\n  "status": "ACTIVE"\n}',
    }, [
      createNode('JSONExtractor', 'Extract Item ID', {
        variableNames: 'ITEM_ID',
        jsonPaths: '$.id',
      }),
    ])

    const getItem = createNode('HTTPRequest', 'GET /v1/items/${ITEM_ID}', {
      protocol: 'https',
      server: 'api.microservice.example.com',
      path: '/v1/items/${ITEM_ID}',
      method: 'GET',
    })

    const deleteItem = createNode('HTTPRequest', 'DELETE /v1/items/${ITEM_ID}', {
      protocol: 'https',
      server: 'api.microservice.example.com',
      path: '/v1/items/${ITEM_ID}',
      method: 'DELETE',
    })

    const tg = createNode('ThreadGroup', 'Smoke Load Thread Group', {
      threads: 25,
      rampUp: 5,
      loops: 10,
    }, [
      createNode('HTTPRequestDefaults', 'Defaults', { protocol: 'https', server: 'api.microservice.example.com' }),
      createNode('HTTPHeaderManager', 'Headers', { headers: [{ name: 'Content-Type', value: 'application/json' }] }),
      healthCheck,
      createItem,
      getItem,
      deleteItem,
      createNode('ViewResultsTree'),
      createNode('SummaryReport'),
    ])

    return createNode('TestPlan', 'Microservice API Smoke Test', {}, [tg])
  },
}

export const oauth2SoakTemplate: TemplateItem = {
  id: 'oauth2_soak_test',
  title: 'OAuth2 Concurrency & Endurance Soak Test',
  category: 'Long-Running',
  icon: TrendingUp,
  badge: 'Enterprise',
  description: 'Concurrency Thread Group designed for prolonged endurance / soak load testing (3600s) to discover memory leaks and degradation.',
  tags: ['ConcurrencyThreadGroup', 'OAuth2', 'Soak Testing', 'Leak Detection'],
  buildPlan: () => {
    const tg = createNode('ConcurrencyThreadGroup', 'Concurrency 1-Hour Soak Group', {
      targetConcurrency: 150,
      rampUpTime: 120,
      rampUpSteps: 6,
      holdRateTime: 3600,
      timeUnit: 'S',
    }, [
      createNode('HTTPRequest', 'POST /oauth/token', {
        protocol: 'https',
        server: 'auth.example.com',
        path: '/oauth/v2/token',
        method: 'POST',
        parameters: [
          { name: 'grant_type', value: 'client_credentials' },
          { name: 'client_id', value: 'perf_client_001' },
          { name: 'client_secret', value: '${CLIENT_SECRET}' },
        ],
      }, [
        createNode('JSONExtractor', 'Extract Bearer', { variableNames: 'ACCESS_TOKEN', jsonPaths: '$.access_token' }),
      ]),
      createNode('HTTPRequest', 'GET /api/v2/protected/feed', {
        protocol: 'https',
        server: 'auth.example.com',
        path: '/api/v2/protected/feed',
        method: 'GET',
      }),
      createNode('ConstantTimer', 'Think Time', { delay: 1000 }),
      createNode('ViewResultsTree'),
      createNode('AggregateReport'),
    ])

    return createNode('TestPlan', 'OAuth2 Endurance Soak Test', {}, [tg])
  },
}
