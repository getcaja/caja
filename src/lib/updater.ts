import { check } from '@tauri-apps/plugin-updater'
import { relaunch } from '@tauri-apps/plugin-process'
import { ask, message } from '@tauri-apps/plugin-dialog'
import { openUrl } from '@tauri-apps/plugin-opener'

const RELEASES_URL = 'https://github.com/getcaja/caja/releases'

/** Prompt update with 3-button native dialog. Returns true if user chose to update. */
async function promptUpdate(version: string): Promise<boolean> {
  const result = await message(
    `Version ${version} is available. Would you like to download it now?`,
    {
      title: 'Update Available',
      kind: 'info',
      buttons: { yes: 'Update', no: "Don't Update", cancel: 'View Changelog' },
    },
  )

  if (result === 'View Changelog') {
    await openUrl(`${RELEASES_URL}/tag/v${version}`)
    return false
  }

  return result === 'Update'
}

/** Silent check on startup — only prompts if an update is available */
export async function checkForUpdatesOnStartup(): Promise<void> {
  try {
    const update = await check()
    if (!update) return

    if (!await promptUpdate(update.version)) return

    await update.downloadAndInstall()

    const shouldRestart = await ask(
      'Update installed. Restart now to apply?',
      { title: 'Caja', kind: 'info', okLabel: 'Restart', cancelLabel: 'Later' },
    )

    if (shouldRestart) {
      await relaunch()
    }
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

    if (!await promptUpdate(update.version)) return

    await update.downloadAndInstall()

    const shouldRestart = await ask(
      'Update installed. Restart now to apply?',
      { title: 'Caja', kind: 'info', okLabel: 'Restart', cancelLabel: 'Later' },
    )

    if (shouldRestart) {
      await relaunch()
    }
  } catch (err) {
    await message(`Failed to check for updates: ${err}`, {
      title: 'Caja',
      kind: 'info',
    })
  }
}
