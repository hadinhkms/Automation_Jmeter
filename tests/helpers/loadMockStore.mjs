// Child-process helper for QA-MOCK-05b: loads the mock route store in a fresh module
// instance (store path comes from JMETER_MOCK_ROUTES_FILE) and prints the routes as JSON.
import { loadMockRoutes } from '../../server/mock/mockRouteStore.ts'

console.log(JSON.stringify(loadMockRoutes()))
