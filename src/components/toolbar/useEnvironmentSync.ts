import { useState, useRef } from 'react'
import { useEnvironmentStore } from '../../store/environmentStore'
import { useJMeterStore } from '../../store/jmeterStore'
import { convertEnvToUDVRows } from '../../utils/postman/postmanEnvironmentParser'
import { createNode } from '../../mock/sampleTestPlan'

export function useEnvironmentSync() {
  const [feedback, setFeedback] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { getActiveEnvironment, importFromPostmanJson } = useEnvironmentStore()
  const { updateNodeProperties, insertNode } = useJMeterStore()

  const handleSyncToUDV = (targetEnv = getActiveEnvironment(), showFeedback = true) => {
    if (!targetEnv) return

    const udvRows = convertEnvToUDVRows(targetEnv.variables)
    const currentTestPlan = useJMeterStore.getState().testPlan
    const existingUDV = currentTestPlan.children.find((c) => c.type === 'UserDefinedVariables')

    if (existingUDV) {
      updateNodeProperties(existingUDV.id, { variables: udvRows })
    } else {
      const newNode = createNode('UserDefinedVariables', 'User Defined Variables', { variables: udvRows })
      insertNode(currentTestPlan.id, newNode)
    }

    if (showFeedback) {
      setFeedback(`Synced ${udvRows.length} vars to Test Plan UDV!`)
      setTimeout(() => setFeedback(''), 2500)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    const reader = new FileReader()
    reader.onload = (evt) => {
      const content = evt.target?.result as string
      const res = importFromPostmanJson(content)
      if (res.success) {
        // Auto-sync imported variables to UDV immediately
        const updatedEnv = useEnvironmentStore.getState().getActiveEnvironment()
        if (updatedEnv) {
          handleSyncToUDV(updatedEnv, false)
        }
        setFeedback(`Imported "${res.name}" & synced ${res.count} vars to UDV`)
      } else {
        setFeedback(`Error: ${res.error}`)
      }
      setTimeout(() => setFeedback(''), 3000)
    }
    reader.readAsText(file)
  }

  return {
    feedback,
    fileInputRef,
    handleSyncToUDV,
    handleFileChange,
  }
}
