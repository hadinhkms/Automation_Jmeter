import type { AppNotice, AppStore, NotifyFn } from './appTypes'
import { NoticeBanner } from './NoticeBanner'
import { LiveProgressBanner } from './LiveProgressBanner'

/** Notification banner + live run progress banner shown under the toolbar. */
export function AppBanners({
  store,
  notice,
  setNotice,
  stopTest,
  dismissNoticeLater,
}: {
  store: AppStore
  notice: AppNotice | null
  setNotice: (notice: AppNotice | null) => void
  stopTest: () => Promise<void>
  dismissNoticeLater: NotifyFn
}) {
  return (
    <>
      {notice ? (
        <NoticeBanner
          notice={notice}
          runState={store.runState}
          onForceStop={async () => {
            await stopTest()
            dismissNoticeLater('Runner reset and background processes stopped successfully.', 'info')
          }}
          onDismiss={() => setNotice(null)}
        />
      ) : null}

      {store.runState === 'RUNNING' ? <LiveProgressBanner metrics={store.metrics} /> : null}
    </>
  )
}
