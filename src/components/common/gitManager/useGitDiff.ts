import { useEffect, useState } from 'react'
import { gitService } from '../../../services/gitService'

export function useGitDiff(selectedFile: string | null) {
  const [diffText, setDiffText] = useState<string>('')
  const [diffLoading, setDiffLoading] = useState(false)

  useEffect(() => {
    if (selectedFile) {
      setDiffLoading(true)
      gitService
        .getDiff(selectedFile)
        .then((res) => setDiffText(res.diff))
        .catch(() => setDiffText('No diff available or file is untracked.'))
        .finally(() => setDiffLoading(false))
    } else {
      setDiffText('')
    }
  }, [selectedFile])

  return { diffText, diffLoading }
}
