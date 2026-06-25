/** Global dev-mode flag toggled from the UI. */
let enabled = true

export const DevMode = {
  get enabled(): boolean { return enabled },
  setEnabled(value: boolean): void { enabled = value },
  toggle(): boolean {
    enabled = !enabled
    return enabled
  },
}
