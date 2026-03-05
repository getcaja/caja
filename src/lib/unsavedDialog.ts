// Native 3-button unsaved changes dialog via Tauri plugin-dialog (v2.4+).
// Returns 'save' | 'discard' | 'cancel'.

export type UnsavedChoice = 'save' | 'discard' | 'cancel'

export async function askUnsavedChanges(fileName: string): Promise<UnsavedChoice> {
  const { message } = await import('@tauri-apps/plugin-dialog')
  const result = await message(
    `Do you want to save the changes you made to ${fileName}?\n\nYour changes will be lost if you don't save them.`,
    {
      title: 'Unsaved Changes',
      kind: 'warning',
      buttons: { yes: 'Save', no: "Don't Save", cancel: 'Cancel' },
    },
  )
  if (result === 'Save') return 'save'
  if (result === "Don't Save") return 'discard'
  return 'cancel'
}
