import { ShoppingBag } from 'lucide-react'
import { createNode } from '../../../mock/sampleTestPlan'
import type { TemplateItem } from '../../../models/templateGallery'

export const ecommerceTemplate: TemplateItem = {
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
}
