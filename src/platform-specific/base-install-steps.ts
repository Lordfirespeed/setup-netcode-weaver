import path from 'path'
import fs from 'fs/promises'
import * as core from '@actions/core'
import * as toolCache from '@actions/tool-cache'
import { SafeParseSuccess, z } from 'zod'
import { SemVer } from 'semver'
import * as process from 'process'

import '../lib/validation/semver-string-transformer'
import '../lib/validation/target-framework-moniker-transformer'
import { TargetFramework, TargetFrameworkMoniker } from '../lib/target-framework-moniker'
import typeSafeError from '../lib/type-safe-error'

const nuGetPackageSpecifierSchema = z.object({
  id: z.string(),
  version: z.string().semVer({ allowBuild: false })
})
type NuGetPackageSpecifier = z.infer<typeof nuGetPackageSpecifierSchema>

const targetFrameworkMonikerSchema = z.union([
  z.string().targetFramework(TargetFramework.NetStandard, /^netstandard(?<version>[12]\.\d)$/),
  z.string().targetFramework(TargetFramework.NetCore, /^net(?<version>[5-8]\.0)$/),
  z.string().targetFramework(TargetFramework.NetFramework, /^net(?<version>\d{2,3})$/)
])

type ActionInputs = {
  netcodePatcherVersion: SemVer
  depsPackages: NuGetPackageSpecifier[]
  depsPaths: string[]
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
    core.setOutput('netcode-patcher-directory', info.installDirectory)
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
    const archiveFile = await this.DownloadArchive(inputs.netcodePatcherVersion)
    const unpackedDir = await this.ExtractArchive(archiveFile)

    await this.PostInstall(unpackedDir)
    await this.CopyReferenceAssemblies(
      inputs.targetFrameworkMoniker,
      unpackedDir,
      inputs.depsPackages,
      inputs.depsPaths
    )

    core.info(`Installed Netcode Patcher to ${unpackedDir}`)

    const children = await fs.readdir(path.join(unpackedDir, 'deps'))
    core.info(children.join(', '))

    return {
      installDirectory: unpackedDir
    }
  }

  GetInputs(): ActionInputs {
    let netcodePatcherVersion: SemVer
    try {
      netcodePatcherVersion = z
        .string()
        .semVer({ allowBuild: false, allowPrerelease: false })
        .parse(
          core.getInput('netcode-patcher-version', {
            required: true
          })
        )
    } catch (error) {
      typeSafeError(error, core.error)
      throw new Error('"netcode-patcher-version" input value is invalid!', {
        cause: error
      })
    }

    let depsPackages: NuGetPackageSpecifier[]
    try {
      depsPackages = z.array(nuGetPackageSpecifierSchema).parse(JSON.parse(core.getInput('deps-packages')))
    } catch (error) {
      typeSafeError(error, core.error)
      throw new Error('"deps-packages" input value is invalid!', {
        cause: error
      })
    }

    let depsPaths: string[]
    try {
      depsPaths = z.array(z.string()).parse(JSON.parse(core.getInput('deps-paths')))
    } catch (error) {
      typeSafeError(error, core.error)
      throw new Error('"deps-paths" input value is invalid!', {
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
      netcodePatcherVersion,
      depsPackages,
      depsPaths,
      targetFrameworkMoniker
    }
  }

  GetArchiveName(netcodePatcherVersion: SemVer): string {
    return `NetcodePatcher-${netcodePatcherVersion.version}.zip`
  }

  GetDownloadUrl(netcodePatcherVersion: SemVer): string {
    return `https://github.com/EvaisaDev/UnityNetcodePatcher/releases/download/${
      netcodePatcherVersion.version
    }/${this.GetArchiveName(netcodePatcherVersion)}`
  }

  GetTempDirectory(): string {
    if (process.env['RUNNER_TEMP'] === undefined) {
      throw new Error('Expected RUNNER_TEMP to be defined')
    }
    return process.env['RUNNER_TEMP']
  }

  async DownloadArchive(netcodePatcherVersion: SemVer): Promise<string> {
    return await toolCache.downloadTool(
      this.GetDownloadUrl(netcodePatcherVersion),
      path.join(this.GetTempDirectory(), this.GetArchiveName(netcodePatcherVersion))
    )
  }

  ExtractToPath(): string {
    const homeDir = process.env['HOME']
    if (!homeDir) throw new Error("$HOME environment variable not set - can't resolve destination directory.")

    return path.join(homeDir, 'netcodePatcher')
  }

  async ExtractArchive(archivePath: string): Promise<string> {
    return await toolCache.extractZip(archivePath, this.ExtractToPath())
  }

  async PostInstall(_: string): Promise<void> {}

  GetNuGetPackageCacheDirectory(): string {
    const homeDir = process.env['HOME']
    if (!homeDir) throw new Error("$HOME environment variable not set - can't find NuGet package cache directory.")

    return path.join(homeDir, '.nuget', 'packages')
  }

  abstract GetDotnetHome(): string

  async GetRuntimeAssembliesDirectory(): Promise<string> {
    return path.join(this.GetDotnetHome(), 'packs', 'NETStandard.Library.Ref', '2.1.0', 'ref', 'netstandard2.1')
  }

  async CopyPackageAssembliesTo(
    targetFramework: TargetFrameworkMoniker,
    fromPackageDir: string,
    toDir: string
  ): Promise<void> {
    core.info(`Looking in ${fromPackageDir} for assemblies`)
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
      core.warning(`Couldn't find lib/ref folder in ${fromPackageDir}, skipping`)
      return
    }

    const tfmDirs = await fs.readdir(path.join(fromPackageDir, libOrRefDir.name), { withFileTypes: true })
    const tfms = tfmDirs
      .filter(subItem => subItem.isDirectory())
      .map(subItem => targetFrameworkMonikerSchema.safeParse(subItem.name))
      .filter((parseResult): parseResult is SafeParseSuccess<TargetFrameworkMoniker> => parseResult.success)
      .map(parseResult => parseResult.data)

    const chosenTfm = targetFramework.MostPreferableForConsumption(tfms)

    if (!chosenTfm) throw new Error(`No consumable sources were found in ${fromPackageDir}`)

    await fs.cp(path.join(fromPackageDir, libOrRefDir.name, chosenTfm.raw), toDir, {
      recursive: true
    })
  }

  async CopyReferenceAssemblies(
    targetFramework: TargetFrameworkMoniker,
    netcodePatcherDirectory: string,
    packages: NuGetPackageSpecifier[],
    paths: string[]
  ): Promise<void> {
    const netcodePatcherDepsDir = path.join(netcodePatcherDirectory, 'deps')

    const nuGetPackageCacheDir = this.GetNuGetPackageCacheDirectory()
    const runtimeAssembliesDir = await this.GetRuntimeAssembliesDirectory()

    const allPaths = [
      path.join(runtimeAssembliesDir, 'mscorlib.dll'),
      path.join(runtimeAssembliesDir, 'netstandard.dll'),
      ...paths
    ]

    await Promise.all([
      ...allPaths
        .map(depPath => path.parse(depPath))
        .map(async depPath => await fs.copyFile(path.format(depPath), path.join(netcodePatcherDepsDir, depPath.base))),
      ...packages
        .map(nuGetPackage => path.join(nuGetPackageCacheDir, nuGetPackage.id.toLowerCase(), nuGetPackage.version.raw))
        .map(async packageDir => await this.CopyPackageAssembliesTo(targetFramework, packageDir, netcodePatcherDepsDir))
    ])
  }
}
