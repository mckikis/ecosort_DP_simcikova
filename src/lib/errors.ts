// zrozumitelna hlaska pos lovensky namiesto technickej "Failed to fetch"
export function friendlyError(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e)
  if (/fetch|network|load failed|failed to load/i.test(msg)) {
    return 'Model sa nepodarilo stiahnuť. Pri prvom použití potrebuje appka internet. Skús to znova.'
  }
  return msg
}
