import path from 'path'
import fs from 'fs/promises'
import * as core from '@actions/core'
import * as toolCache from '@actions/tool-cache'
import { SafeParseSuccess, z } from 'zod'

import '../lib/validation/semver-string-transformer'
import {
  TargetFrameworkMoniker,
  targetFrameworkMonikerSchema
} from '../lib/target-framework-moniker'
import semver, { SemVer } from 'semver'
import * as process from 'process'
import typeSafeError from '../lib/type-safe-error'

const nuGetPackageSpecifierSchema = z.object({
  id: z.string(),
  version: z.string().semVer({ allowBuild: false })
})
type NuGetPackageSpecifier = z.infer<typeof nuGetPackageSpecifierSchema>

type ActionInputs = {
  netcodeWeaverVersion: SemVer
  depsPackages: NuGetPackageSpecifier[]
  targetFrameworkMoniker: TargetFrameworkMoniker
}

type OutputInfo = {
  installDirectory: string
}

export default abstract class InstallSteps {
  GetInfo(installDirectory: string): OutputInfo {
    return {
      installDirectory
    }
  }

  SetOutputs(info: OutputInfo): void {
    core.setOutput('netcode-weaver-directory', info.installDirectory)
  }

  async InstallIfNecessary(): Promise<void> {
    const existingInstallDir = toolCache.find('steamcmd', 'latest')

    if (existingInstallDir) {
      core.info(`Found in cache @ ${existingInstallDir}`)
      const existingInstallInfo = this.GetInfo(existingInstallDir)
      this.SetOutputs(existingInstallInfo)
      return
    }

    const installInfo = await this.Install()
    this.SetOutputs(installInfo)
  }

  async Install(): Promise<OutputInfo> {
    const inputs = this.GetInputs()
    const archiveFile = await this.DownloadArchive(inputs.netcodeWeaverVersion)
    const unpackedDir = await this.ExtractArchive(archiveFile)

    await this.PostInstall(unpackedDir)
    await this.CopyReferenceAssemblies(
      inputs.targetFrameworkMoniker,
      unpackedDir,
      inputs.depsPackages
    )

    core.info(`Installed NetWeaver to ${unpackedDir}`)

    const children = await fs.readdir(path.join(unpackedDir, 'deps'))
    core.info(children.join(', '))

    return {
      installDirectory: unpackedDir
    }
  }

  GetInputs(): ActionInputs {
    let netcodeWeaverVersion: SemVer
    try {
      netcodeWeaverVersion = z
        .string()
        .semVer({ allowBuild: false, allowPrerelease: false })
        .parse(
          core.getInput('netcode-weaver-version', {
            required: true
          })
        )
    } catch (error) {
      typeSafeError(error, core.error)
      throw new Error('"netcode-weaver-version" input value is invalid!', {
        cause: error
      })
    }

    let depsPackages: NuGetPackageSpecifier[]
    try {
      depsPackages = z
        .array(nuGetPackageSpecifierSchema)
        .parse(JSON.parse(core.getInput('deps-packages')))
    } catch (error) {
      typeSafeError(error, core.error)
      throw new Error('"deps-packages" input value is invalid!', {
        cause: error
      })
    }

    let targetFrameworkMoniker: TargetFrameworkMoniker
    try {
      targetFrameworkMoniker = targetFrameworkMonikerSchema.parse(
        core.getInput('target-framework', {
          required: true
        })
      )
    } catch (error) {
      typeSafeError(error, core.error)
      throw new Error('"target-framework" input value is invalid!', {
        cause: error
      })
    }

    return {
      netcodeWeaverVersion,
      depsPackages,
      targetFrameworkMoniker
    }
  }

  GetArchiveName(netcodeWeaverVersion: SemVer): string {
    return `NetcodePatcher-${netcodeWeaverVersion.version}.zip`
  }

  GetDownloadUrl(netcodeWeaverVersion: SemVer): string {
    return `https://github.com/EvaisaDev/UnityNetcodeWeaver/releases/download/${
      netcodeWeaverVersion.version
    }/${this.GetArchiveName(netcodeWeaverVersion)}`
  }

  GetTempDirectory(): string {
    if (process.env['RUNNER_TEMP'] === undefined) {
      throw new Error('Expected RUNNER_TEMP to be defined')
    }
    return process.env['RUNNER_TEMP']
  }

  async DownloadArchive(netcodeWeaverVersion: SemVer): Promise<string> {
    return await toolCache.downloadTool(
      this.GetDownloadUrl(netcodeWeaverVersion),
      path.join(
        this.GetTempDirectory(),
        this.GetArchiveName(netcodeWeaverVersion)
      )
    )
  }

  ExtractToPath(): string {
    const homeDir = process.env['HOME']
    if (!homeDir)
      throw new Error(
        "$HOME environment variable not set - can't resolve destination directory."
      )

    return path.join(homeDir, 'NetcodeWeaver')
  }

  async ExtractArchive(archivePath: string): Promise<string> {
    return await toolCache.extractZip(archivePath, this.ExtractToPath())
  }

  async PostInstall(_: string): Promise<void> {}

  GetNuGetPackageCacheDirectory(): string {
    const homeDir = process.env['HOME']
    if (!homeDir)
      throw new Error(
        "$HOME environment variable not set - can't find NuGet package cache directory."
      )

    return path.join(homeDir, '.nuget', 'packages')
  }

  abstract GetDotnetHome(): string

  async GetRuntimeAssembliesDirectory(): Promise<string> {
    const netCoreRuntime = path.join(
      this.GetDotnetHome(),
      'shared',
      'Microsoft.NETCore.App'
    )

    const subItems = await fs.readdir(netCoreRuntime, { withFileTypes: true })
    const latestVersion = subItems
      .filter(subItem => subItem.isDirectory())
      .map(subItem => semver.coerce(subItem.name))
      .filter((subItem): subItem is SemVer => subItem !== null)
      .sort((a, b) => a.compare(b))
      .pop()

    if (!latestVersion)
      throw new Error('No Microsoft.NETCore.App runtime found.')

    return path.join(netCoreRuntime, latestVersion.raw)
  }

  async CopyPackageAssembliesTo(
    targetFramework: TargetFrameworkMoniker,
    fromPackageDir: string,
    toDir: string
  ): Promise<void> {
    const subItems = await fs.readdir(fromPackageDir, { withFileTypes: true })
    const libOrRefDir = subItems
      .filter(subItem => subItem.isDirectory())
      .sort((a, b) => {
        if (a.name === 'ref') return 1
        if (b.name === 'ref') return -1
        return 0
      })
      .pop()

    if (!libOrRefDir) {
      core.warning(
        `Couldn't find lib/ref folder in ${fromPackageDir}, skipping`
      )
      return
    }

    const tfmDirs = await fs.readdir(libOrRefDir.path, { withFileTypes: true })
    const tfms = tfmDirs
      .filter(subItem => subItem.isDirectory())
      .map(subItem => targetFrameworkMonikerSchema.safeParse(subItem.name))
      .filter(
        (
          parseResult
        ): parseResult is SafeParseSuccess<TargetFrameworkMoniker> =>
          parseResult.success
      )
      .map(parseResult => parseResult.data)

    const chosenTfm = targetFramework.MostPreferableForConsumption(tfms)

    if (!chosenTfm)
      throw new Error(`No consumable sources were found in ${fromPackageDir}`)

    await fs.cp(path.join(libOrRefDir.path, chosenTfm.raw), toDir)
  }

  async CopyReferenceAssemblies(
    targetFramework: TargetFrameworkMoniker,
    netcodeWeaverDirectory: string,
    packages: NuGetPackageSpecifier[]
  ): Promise<void> {
    const netcodeWeaverDepsDir = path.join(netcodeWeaverDirectory, 'deps')

    const nuGetPackageCacheDir = this.GetNuGetPackageCacheDirectory()
    const runtimeAssembliesDir = await this.GetRuntimeAssembliesDirectory()

    await Promise.allSettled([
      fs.copyFile(
        path.join(runtimeAssembliesDir, 'mscorlib.dll'),
        path.join(netcodeWeaverDepsDir, 'mscorlib.dll')
      ),
      fs.copyFile(
        path.join(runtimeAssembliesDir, 'netstandard.dll'),
        path.join(netcodeWeaverDepsDir, 'netstandard.dll')
      ),
      ...packages
        .map(nuGetPackage =>
          path.join(
            nuGetPackageCacheDir,
            nuGetPackage.id.toLowerCase(),
            nuGetPackage.version.raw
          )
        )
        .map(
          async packageDir =>
            await this.CopyPackageAssembliesTo(
              targetFramework,
              packageDir,
              netcodeWeaverDepsDir
            )
        )
    ])
  }
}
