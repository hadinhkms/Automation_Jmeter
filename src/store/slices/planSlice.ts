import { createNewTestPlan } from '../../mock/sampleTestPlan'
import { normalizeDirectoryVariablesInTree } from '../../utils/jmeterPathVariables'
import { defaultExpandedNodeIds, emptyMetrics, getTotalThreads } from '../jmeterStorePersistence'
import type { SliceCreator } from '../../models/jmeterStore'

type PlanKeys = 'replaceTestPlan' | 'newTestPlan' | 'setFileName' | 'markSaved'

export const createPlanSlice: SliceCreator<PlanKeys> = (set) => ({
  replaceTestPlan: (testPlan, fileName) =>

    set({
      testPlan: normalizeDirectoryVariablesInTree(testPlan),
      selectedNodeId: testPlan.id,
      expandedNodeIds: defaultExpandedNodeIds(testPlan),
      dirty: false,
      fileName: fileName ?? null,
      clipboard: null,
      runState: 'READY',
      metrics: { ...emptyMetrics, totalThreads: getTotalThreads(testPlan) },
      resultsCleared: false,
    }),
  newTestPlan: () => {
    const testPlan = normalizeDirectoryVariablesInTree(createNewTestPlan())
    set({
      testPlan,
      selectedNodeId: testPlan.id,
      expandedNodeIds: defaultExpandedNodeIds(testPlan),
      dirty: false,
      fileName: null,
      clipboard: null,
      runState: 'READY',
      metrics: { ...emptyMetrics, totalThreads: getTotalThreads(testPlan) },
      resultsCleared: false,
    })
  },
  setFileName: (name) => set({ fileName: name ? (name.endsWith('.jmx') ? name : `${name}.jmx`) : null }),
  markSaved: (fileName) =>
    set((state) => ({
      dirty: false,
      fileName: fileName ? (fileName.endsWith('.jmx') ? fileName : `${fileName}.jmx`) : state.fileName,
    })),
})
