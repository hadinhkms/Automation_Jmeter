import { buildPageStepName } from './urlDetails'
import type { CdpEventContext, CdpParams } from './cdpEventContext'
import {
  onLoadingFailed,
  onLoadingFinished,
  onRequestWillBeSent,
  onResponseReceived,
} from './networkEvents'

function applyAutoPageSplit(ctx: CdpEventContext, url: string): void {
  if (ctx.autoPageSplit) {
    try {
      const stepName = buildPageStepName(url, () => ctx.nextPageStep())
      ctx.setTransaction(stepName)
    } catch {
      // Ignore URL parse error
    }
  }
}

export function handleCdpEvent(ctx: CdpEventContext, method: string, params: CdpParams | undefined): void {
  if (!params) return

  if (method === 'Page.frameNavigated') {
    // SAFETY: Page.frameNavigated params carry a Frame object per the CDP protocol; fields are optional here
    const frame = params.frame as { parentId?: string; url?: string } | undefined
    if (frame && !frame.parentId && frame.url && !frame.url.startsWith('about:') && !frame.url.startsWith('chrome:')) {
      applyAutoPageSplit(ctx, frame.url)
    }
    return
  }

  if (method === 'Page.navigatedWithinDocument') {
    // SAFETY: Page.navigatedWithinDocument params carry a url string per the CDP protocol
    const url = params.url as string | undefined
    if (url && !url.startsWith('about:') && !url.startsWith('chrome:')) {
      applyAutoPageSplit(ctx, url)
    }
    return
  }

  if (method === 'Network.requestWillBeSent') {
    onRequestWillBeSent(ctx, params)
  } else if (method === 'Network.responseReceived') {
    onResponseReceived(ctx, params)
  } else if (method === 'Network.loadingFinished') {
    onLoadingFinished(ctx, params)
  } else if (method === 'Network.loadingFailed') {
    onLoadingFailed(ctx, params)
  }
}
