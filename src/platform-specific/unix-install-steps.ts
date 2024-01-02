import InstallSteps from './base-install-steps'
import path from 'path'
import fs from 'fs/promises'

export default class UnixInstallSteps extends InstallSteps {
  GetDotnetHome(): string {
    return path.join('/', 'usr', 'share', 'dotnet')
  }

  override async PostInstall(netcodePatcherDirectory: string): Promise<void> {
    await fs.writeFile(
      path.join(netcodePatcherDirectory, 'NetcodePatcher.runtimeconfig.json'),
      JSON.stringify({
        runtimeOptions: {
          tfm: 'net8.0',
          framework: {
            name: 'Microsoft.NETCore.App',
            version: '8.0.0'
          }
        }
      })
    )
  }
}
