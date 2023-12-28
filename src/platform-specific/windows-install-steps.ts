import InstallSteps from './base-install-steps'
import path from 'path'

export default class WindowsInstallSteps extends InstallSteps {
  GetDotnetHome(): string {
    return path.join('C:', 'Program Files', 'dotnet')
  }
}
