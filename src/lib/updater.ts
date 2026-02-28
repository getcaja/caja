import { check } from '@tauri-apps/plugin-updater'
import { relaunch } from '@tauri-apps/plugin-process'

export type UpdateStatus =
  | { state: 'checking' }
  | { state: 'available'; version: string }
  | { state: 'downloading'; progress: number }
  | { state: 'ready' }
  | { state: 'up-to-date' }
  | { state: 'error'; message: string }

export async function checkForUpdates(
  onStatus: (status: UpdateStatus) => void,
): Promise<void> {
  try {
    onStatus({ state: 'checking' })
    const update = await check()

    if (!update) {
      onStatus({ state: 'up-to-date' })
      return
    }

    onStatus({ state: 'available', version: update.version })

    let totalBytes = 0
    let downloadedBytes = 0

    await update.downloadAndInstall((event) => {
      if (event.event === 'Started' && event.data.contentLength) {
        totalBytes = event.data.contentLength
      } else if (event.event === 'Progress') {
        downloadedBytes += event.data.chunkLength
        const progress = totalBytes > 0 ? downloadedBytes / totalBytes : 0
        onStatus({ state: 'downloading', progress })
      } else if (event.event === 'Finished') {
        onStatus({ state: 'ready' })
      }
    })

    onStatus({ state: 'ready' })
  } catch (err) {
    onStatus({ state: 'error', message: String(err) })
  }
}

export async function relaunchApp(): Promise<void> {
  await relaunch()
}
