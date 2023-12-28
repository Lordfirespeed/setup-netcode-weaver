/**
 * The entrypoint for the action.
 */
import * as core from '@actions/core'

import attemptInstall from './main'
import typeSafeError from './lib/type-safe-error'

async function wrap_install(): Promise<void> {
  try {
    await attemptInstall()
  } catch (error) {
    typeSafeError(error, core.setFailed)
  }
}

void wrap_install()
