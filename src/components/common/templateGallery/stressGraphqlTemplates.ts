import { Boxes, Zap } from 'lucide-react'
import { createNode } from '../../../mock/sampleTestPlan'
import type { TemplateItem } from '../../../models/templateGallery'

export const steppingStressTemplate: TemplateItem = {
  id: 'stepping_stress_influx',
  title: 'Step-Up Concurrency Stress Test + InfluxDB APM',
  category: 'Stress',
  icon: Zap,
  badge: 'High Load',
  description: 'Progressively ramp up traffic in steps (+50 users every 30s) to find system breaking points with InfluxDB metrics streaming.',
  tags: ['SteppingThreadGroup', 'BackendListener', 'InfluxDB', 'Stress Curve'],
  buildPlan: () => {
    const tg = createNode('SteppingThreadGroup', 'Stepping Stress Group (500 Users)', {
      numThreads: 500,
      initialThreads: 50,
      thenAddThreads: 50,
      everySeconds: 30,
      rampUpSeconds: 5,
      holdSeconds: 600,
      thenStopThreads: 50,
      stopEverySeconds: 5,
    }, [
      createNode('HTTPRequestDefaults', 'Defaults', { protocol: 'https', server: 'api.stress.example.com' }),
      createNode('HTTPRequest', 'POST /api/order/stress-benchmark', {
        protocol: 'https',
        server: 'api.stress.example.com',
        path: '/api/order/stress-benchmark',
        method: 'POST',
        postBodyRaw: true,
        body: '{\n  "payloadSize": 1024,\n  "iterations": 100\n}',
      }),
      createNode('BackendListener', 'InfluxDB Live APM Exporter', {
        classname: 'org.apache.jmeter.visualizers.backend.influxdb.HttpMetricsSender',
        influxdbUrl: 'http://localhost:8086/api/v2/write?org=company&bucket=jmeter_perf',
        application: 'stress-benchmark',
        measurement: 'jmeter',
        percentiles: '90;95;99',
      }),
      createNode('ViewResultsTree'),
      createNode('AggregateReport'),
    ])

    return createNode('TestPlan', 'Step-Up Stress Load Test with InfluxDB', {}, [tg])
  },
}

export const graphqlTemplate: TemplateItem = {
  id: 'graphql_workload',
  title: 'GraphQL API Queries & Mutations Load Test',
  category: 'GraphQL',
  icon: Boxes,
  badge: 'Modern',
  description: 'Execute parameterized GraphQL queries and mutation operations with variables interpolation and response assertions.',
  tags: ['GraphQL', 'Mutations', 'Variables', 'Schema Load'],
  buildPlan: () => {
    const querySampler = createNode('GraphQLSampler', 'GraphQL Query - GetCatalog', {
      protocol: 'https',
      server: 'graphql.example.com',
      path: '/graphql',
      operationName: 'GetCatalog',
      query: 'query GetCatalog($limit: Int!) {\n  catalog(limit: $limit) {\n    id\n    title\n    price\n  }\n}',
      variables: '{\n  "limit": 50\n}',
    }, [
      createNode('JSONExtractor', 'Extract Catalog ID', {
        variableNames: 'FIRST_ITEM_ID',
        jsonPaths: '$.data.catalog[0].id',
      }),
    ])

    const mutationSampler = createNode('GraphQLSampler', 'GraphQL Mutation - UpdateStock', {
      protocol: 'https',
      server: 'graphql.example.com',
      path: '/graphql',
      operationName: 'UpdateStock',
      query: 'mutation UpdateStock($id: ID!, $quantity: Int!) {\n  updateInventory(id: $id, qty: $quantity) {\n    success\n    newStock\n  }\n}',
      variables: '{\n  "id": "${FIRST_ITEM_ID}",\n  "quantity": 5\n}',
    })

    const tg = createNode('ThreadGroup', 'GraphQL Traffic Group', {
      threads: 40,
      rampUp: 10,
      loops: 20,
    }, [
      querySampler,
      mutationSampler,
      createNode('ViewResultsTree'),
      createNode('SummaryReport'),
    ])

    return createNode('TestPlan', 'GraphQL Performance Test', {}, [tg])
  },
}
