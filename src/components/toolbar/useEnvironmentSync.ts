import { useState, useRef } from 'react'
import { useEnvironmentStore } from '../../store/environmentStore'
import { useJMeterStore } from '../../store/jmeterStore'
import { convertEnvToUDVRows } from '../../utils/postman/postmanEnvironmentParser'
import { createNode } from '../../mock/sampleTestPlan'

export function useEnvironmentSync() {
  const [feedback, setFeedback] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { getActiveEnvironment, importFromPostmanJson } = useEnvironmentStore()
  const { testPlan, updateNodeProperties, insertNode } = useJMeterStore()

  const handleSyncToUDV = () => {
    const activeEnv = getActiveEnvironment()
    if (!activeEnv) return

    const udvRows = convertEnvToUDVRows(activeEnv.variables)
    const existingUDV = testPlan.children.find((c) => c.type === 'UserDefinedVariables')

    if (existingUDV) {
      updateNodeProperties(existingUDV.id, { variables: udvRows })
    } else {
      const newNode = createNode('UserDefinedVariables', 'User Defined Variables', { variables: udvRows })
      insertNode(testPlan.id, newNode)
    }

    setFeedback(`Synced ${udvRows.length} vars to Test Plan UDV!`)
    setTimeout(() => setFeedback(''), 2500)
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
        setFeedback(`Imported "${res.name}" (${res.count} vars)`)
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
