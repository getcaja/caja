import { check, type Update, type DownloadEvent } from '@tauri-apps/plugin-updater'
import { message } from '@tauri-apps/plugin-dialog'

export interface UpdateInfo {
  version: string
  currentVersion: string
  body: string | undefined
  contentLength: number | undefined
  downloadAndInstall: (onEvent?: (event: DownloadEvent) => void) => Promise<void>
}

/** Callback set by App.tsx to show the update modal */
let _onUpdateAvailable: ((info: UpdateInfo) => void) | null = null

export function setUpdateHandler(handler: (info: UpdateInfo) => void) {
  _onUpdateAvailable = handler
}

function createUpdateInfo(update: Update): UpdateInfo {
  const info: UpdateInfo = {
    version: update.version,
    currentVersion: update.currentVersion,
    body: update.body ?? undefined,
    contentLength: undefined,
    downloadAndInstall: async (onEvent) => {
      await update.downloadAndInstall((event) => {
        if (event.event === 'Started' && event.data.contentLength) {
          info.contentLength = event.data.contentLength
        }
        onEvent?.(event)
      })
    },
  }
  return info
}

/** Silent check on startup — only shows modal if an update is available */
export async function checkForUpdatesOnStartup(): Promise<void> {
  try {
    const update = await check()
    if (!update) return
    _onUpdateAvailable?.(createUpdateInfo(update))
  } catch {
    // Silent on startup — don't bother the user
  }
}

/** Manual check from menu — shows "up to date" message if no update */
export async function checkForUpdates(): Promise<void> {
  try {
    const update = await check()

    if (!update) {
      await message("You're on the latest version.", {
        title: 'Caja',
        kind: 'info',
      })
      return
    }

    _onUpdateAvailable?.(createUpdateInfo(update))
  } catch (err) {
    await message(`Failed to check for updates: ${err}`, {
      title: 'Caja',
      kind: 'info',
    })
  }
}
