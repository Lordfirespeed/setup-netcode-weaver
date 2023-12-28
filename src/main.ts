import { platform } from 'os'

import {
  InstallSteps,
  UnixInstallSteps,
  WindowsInstallSteps
} from './platform-specific'

function chooseAppropriateInstallSteps(
  platformIdentifier: NodeJS.Platform
): InstallSteps {
  if (platformIdentifier === 'darwin') return new UnixInstallSteps()

  if (platformIdentifier === 'linux') return new UnixInstallSteps()

  if (platformIdentifier === 'win32') return new WindowsInstallSteps()

  throw new Error('Unsupported platform.')
}

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
export default async function attemptInstall(): Promise<void> {
  const installSteps = chooseAppropriateInstallSteps(platform())
  await installSteps.InstallIfNecessary()
}
