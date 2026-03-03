import { check } from '@tauri-apps/plugin-updater'
import { relaunch } from '@tauri-apps/plugin-process'
import { ask, message } from '@tauri-apps/plugin-dialog'

/** Silent check on startup — only prompts if an update is available */
export async function checkForUpdatesOnStartup(): Promise<void> {
  try {
    const update = await check()
    if (!update) return

    const shouldUpdate = await ask(
      `Version ${update.version} is available. Download and install?`,
      { title: 'Update Available', kind: 'info', okLabel: 'Update', cancelLabel: 'Later' },
    )

    if (!shouldUpdate) return

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

    const shouldUpdate = await ask(
      `Version ${update.version} is available. Download and install?`,
      { title: 'Update Available', kind: 'info', okLabel: 'Update', cancelLabel: 'Later' },
    )

    if (!shouldUpdate) return

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
