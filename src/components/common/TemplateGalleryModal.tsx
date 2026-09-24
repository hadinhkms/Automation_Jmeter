// master-process-disable-size-check: Monolith queued for modular decomposition via Master Plan
import {
  Boxes,
  Layers,
  Radio,
  Rocket,
  ShoppingBag,
  Sparkles,
  TrendingUp,
  X,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import type { TestPlanNode } from '../../models/jmeter'
import { createNode } from '../../mock/sampleTestPlan'

interface TemplateGalleryModalProps {
  isOpen: boolean
  onClose: () => void
  onSelectTemplate: (testPlan: TestPlanNode, templateName: string) => void
}

interface TemplateItem {
  id: string
  title: string
  category: 'E-Commerce' | 'API' | 'Long-Running' | 'Stress' | 'GraphQL' | 'WebSocket'
  description: string
  icon: LucideIcon
  badge: string
  tags: string[]
  buildPlan: () => TestPlanNode
}

const templates: TemplateItem[] = [
  {
    id: 'ecommerce_checkout',
    title: 'E-Commerce End-to-End Checkout Flow',
    category: 'E-Commerce',
    icon: ShoppingBag,
    badge: 'Popular',
    description: 'Realistic user journey: Browse Catalog -> Product Search -> Add to Cart -> Token Authentication -> Order Checkout with CSV dataset.',
    tags: ['CSV Data', 'Auto-Correlation', 'Transaction Controller', 'Assertions'],
    buildPlan: () => {
      const loginReq = createNode('HTTPRequest', 'HTTP POST - /api/v1/auth/login', {
        protocol: 'https',
        server: 'api.ecommerce.example.com',
        path: '/api/v1/auth/login',
        method: 'POST',
        postBodyRaw: true,
        body: '{\n  "email": "${username}",\n  "password": "${password}"\n}',
      }, [
        createNode('JSONExtractor', 'JSON Extractor - Auth Token', {
          variableNames: 'AUTH_TOKEN',
          jsonPaths: '$.data.accessToken',
          matchNumbers: '1',
        }),
        createNode('ResponseAssertion', 'Assert 200 OK', {
          patterns: [{ pattern: '200' }],
        }),
      ])

      const searchReq = createNode('HTTPRequest', 'HTTP GET - /api/v1/products/search', {
        protocol: 'https',
        server: 'api.ecommerce.example.com',
        path: '/api/v1/products/search?q=${searchKeyword}&limit=20',
        method: 'GET',
      }, [
        createNode('JSONExtractor', 'JSON Extractor - First Product ID', {
          variableNames: 'PRODUCT_ID',
          jsonPaths: '$.items[0].id',
          matchNumbers: '1',
        }),
      ])

      const addToCartReq = createNode('HTTPRequest', 'HTTP POST - /api/v1/cart/items', {
        protocol: 'https',
        server: 'api.ecommerce.example.com',
        path: '/api/v1/cart/items',
        method: 'POST',
        postBodyRaw: true,
        body: '{\n  "productId": "${PRODUCT_ID}",\n  "quantity": 1\n}',
      })

      const checkoutReq = createNode('HTTPRequest', 'HTTP POST - /api/v1/checkout/process', {
        protocol: 'https',
        server: 'api.ecommerce.example.com',
        path: '/api/v1/checkout/process',
        method: 'POST',
        postBodyRaw: true,
        body: '{\n  "paymentMethod": "CREDIT_CARD",\n  "voucher": "SUMMER2026"\n}',
      })

      const threadGroup = createNode('ThreadGroup', 'Thread Group - 100 Shoppers', {
        threads: 100,
        rampUp: 20,
        loops: 5,
      }, [
        createNode('HTTPRequestDefaults', 'HTTP Defaults', {
          protocol: 'https',
          server: 'api.ecommerce.example.com',
        }),
        createNode('CSVDataSet', 'CSV Data - Shopper Credentials', {
          filename: '${__P(data.dir, .)}/shoppers.csv',
          variableNames: 'username,password,searchKeyword',
        }),
        createNode('HTTPHeaderManager', 'Global Headers', {
          headers: [
            { name: 'Content-Type', value: 'application/json' },
            { name: 'Authorization', value: 'Bearer ${AUTH_TOKEN}' },
          ],
        }),
        createNode('TransactionController', '01_User_Login', {}, [loginReq]),
        createNode('TransactionController', '02_Search_Product', {}, [searchReq]),
        createNode('TransactionController', '03_Add_To_Cart', {}, [addToCartReq]),
        createNode('TransactionController', '04_Complete_Checkout', {}, [checkoutReq]),
        createNode('ConstantTimer', 'Think Time', { delay: 500 }),
        createNode('ViewResultsTree'),
        createNode('SummaryReport'),
        createNode('AggregateReport'),
      ])

      return createNode('TestPlan', 'E-Commerce Performance Test Plan', {}, [threadGroup])
    },
  },
  {
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
  },
  {
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
  },
  {
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
  },
  {
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
  },
  {
    id: 'websocket_chat_stream',
    title: 'WebSocket Realtime Messaging & Stream Load Test',
    category: 'WebSocket',
    icon: Radio,
    badge: 'Real-time',
    description: 'Open persistent WebSocket TLS connection, stream heartbeat pings and payload frames, read responses, and gracefully close.',
    tags: ['WebSocket WSS', 'Persistent Conn', 'Low Latency', 'Real-time'],
    buildPlan: () => {
      const tg = createNode('ThreadGroup', 'WebSocket Clients Group', {
        threads: 60,
        rampUp: 10,
        loops: 10,
      }, [
        createNode('WebSocketOpenSampler', 'WebSocket 01 - Connect WSS', {
          server: 'realtime.example.com',
          port: '443',
          path: '/socket/v1',
          protocol: 'wss',
          connectTimeout: 15000,
        }),
        createNode('WebSocketSingleWriteSampler', 'WebSocket 02 - Send Message', {
          requestData: '{"action":"joinRoom","roomId":"room_live_99"}',
          dataType: 'Text',
        }),
        createNode('WebSocketSingleReadSampler', 'WebSocket 03 - Wait Response', {
          readTimeout: 5000,
          dataType: 'Text',
        }),
        createNode('WebSocketCloseSampler', 'WebSocket 04 - Close Connection', {
          statusCode: 1000,
          closeReason: 'Test Finished',
        }),
        createNode('ViewResultsTree'),
        createNode('SummaryReport'),
      ])

      return createNode('TestPlan', 'WebSocket Realtime Messaging Test', {}, [tg])
    },
  },
]

export function TemplateGalleryModal({ isOpen, onClose, onSelectTemplate }: TemplateGalleryModalProps) {
  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 9999 }}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 980, width: '94vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
      >
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Sparkles size={20} color="#f59e0b" />
            <h3>Enterprise JMeter Test Plan Template Gallery</h3>
          </div>
          <button className="btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body" style={{ overflowY: 'auto', padding: '20px 24px' }}>
          <div style={{ fontSize: 13, color: '#475569', marginBottom: 18, lineHeight: 1.5 }}>
            Select a battle-tested industrial template to instantly scaffold complete Test Plans with optimal thread modeling, correlation, assertions, and reporting.
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: 16 }}>
            {templates.map((tpl) => {
              const Icon = tpl.icon
              return (
                <div
                  key={tpl.id}
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: 10,
                    padding: 16,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    transition: 'all 0.2s',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                  }}
                  className="template-card"
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 8,
                          background: '#dbeafe',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Icon size={20} color="#2563eb" />
                      </div>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: 4,
                          background: '#fef3c7',
                          color: '#b45309',
                          textTransform: 'uppercase',
                        }}
                      >
                        {tpl.badge}
                      </span>
                    </div>

                    <h4 style={{ margin: '0 0 6px 0', fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{tpl.title}</h4>
                    <p style={{ fontSize: 12, color: '#475569', lineHeight: 1.45, margin: '0 0 12px 0' }}>
                      {tpl.description}
                    </p>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
                      {tpl.tags.map((tag, idx) => (
                        <span
                          key={idx}
                          style={{
                            fontSize: 11,
                            padding: '2px 8px',
                            borderRadius: 4,
                            background: '#e2e8f0',
                            color: '#334155',
                            fontWeight: 500,
                          }}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  <button
                    className="btn btn-primary"
                    onClick={() => {
                      const plan = tpl.buildPlan()
                      onSelectTemplate(plan, tpl.title)
                      onClose()
                    }}
                    style={{ width: '100%', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                  >
                    <Rocket size={14} /> Use This Template
                  </button>
                </div>
              )
            })}
          </div>
        </div>

        <div className="modal-footer" style={{ padding: '14px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', background: '#f8fafc' }}>
          <button className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
