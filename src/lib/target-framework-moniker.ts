import { z, ZodEffects, ZodString } from 'zod'
import semver, { SemVer } from 'semver'

export enum TargetFramework {
  'NetStandard' = 'NetStandard',
  'NetCore' = 'NetCore',
  'NetFramework' = 'NetFramework'
}

export abstract class TargetFrameworkMoniker {
  abstract type: TargetFramework
  raw: string
  version: SemVer

  static New(
    type: TargetFramework.NetStandard,
    raw: string,
    version: string
  ): NetStandardTargetFrameworkMoniker
  static New(
    type: TargetFramework.NetCore,
    raw: string,
    version: string
  ): NetCoreTargetFrameworkMoniker
  static New(
    type: TargetFramework.NetFramework,
    raw: string,
    version: string
  ): NetFrameworkTargetFrameworkMoniker
  static New(
    type: TargetFramework,
    raw: string,
    version: string
  ): TargetFrameworkMoniker
  static New(
    type: TargetFramework,
    raw: string,
    version: string
  ): TargetFrameworkMoniker {
    switch (type) {
      case TargetFramework.NetStandard:
        return new NetStandardTargetFrameworkMoniker(raw, version)
      case TargetFramework.NetCore:
        return new NetCoreTargetFrameworkMoniker(raw, version)
      case TargetFramework.NetFramework:
        return new NetFrameworkTargetFrameworkMoniker(
          raw,
          version.split('').join('.')
        )
    }
  }

  constructor(raw: string, version: string) {
    this.raw = raw
    const coercedVersion = semver.coerce(version)
    if (coercedVersion === null)
      throw new Error(
        `Couldn't coerce target framework moniker version '${version}' to SemVer.`
      )
    this.version = coercedVersion
  }

  CanConsume(other: TargetFrameworkMoniker): boolean {
    if (other.type === this.type) return this.version >= other.version

    if (other.type === TargetFramework.NetStandard)
      return this.SupportedNetStandardTarget()?.CanConsume(other) ?? false

    return false
  }

  /**
   * The sign of the return value indicates the relative preferability of the
   * two targets:
   * - negative if this is less preferable than other,
   * - positive if this is more preferable than other,
   * - and zero if they are equally preferable.
   */
  isPreferableTo(other: TargetFrameworkMoniker | null): number {
    if (!other) return 1

    if (other.type === this.type) {
      if (this.version === other.version) return 0
      if (this.version > other.version) return 1
      return -1
    }

    if (other.type === TargetFramework.NetStandard)
      return -other.isPreferableTo(this.SupportedNetStandardTarget())

    throw new Error(
      `Cannot compare preferability of ${this.type} and ${other.type} targets as they are incompatible.`
    )
  }

  MostPreferableForConsumption(
    targets: TargetFrameworkMoniker[]
  ): TargetFrameworkMoniker | null {
    return (
      targets
        .filter(target => this.CanConsume(target))
        .sort((a, b) => a.isPreferableTo(b))
        .pop() ?? null
    )
  }

  abstract SupportedNetStandardTarget(): NetStandardTargetFrameworkMoniker | null
}

export class NetStandardTargetFrameworkMoniker extends TargetFrameworkMoniker {
  type = TargetFramework.NetStandard

  override CanConsume(other: TargetFrameworkMoniker): boolean {
    if (other.type !== TargetFramework.NetStandard) return false

    return this.version >= other.version
  }

  override isPreferableTo(other: TargetFrameworkMoniker | null): number {
    if (!other) return 1

    if (other.type === this.type) {
      if (this.version === other.version) return 0
      if (this.version > other.version) return 1
      return -1
    }

    return this.isPreferableTo(other.SupportedNetStandardTarget())
  }

  override SupportedNetStandardTarget(): NetStandardTargetFrameworkMoniker | null {
    return this
  }
}

export class NetCoreTargetFrameworkMoniker extends TargetFrameworkMoniker {
  type = TargetFramework.NetCore

  private static _supportedNetStandardTargets = new Map<
    string,
    NetStandardTargetFrameworkMoniker
  >([
    ['net8.0', new NetStandardTargetFrameworkMoniker('netstandard2.1', '2.1')],
    ['net7.0', new NetStandardTargetFrameworkMoniker('netstandard2.1', '2.1')],
    ['net6.0', new NetStandardTargetFrameworkMoniker('netstandard2.1', '2.1')],
    ['net5.0', new NetStandardTargetFrameworkMoniker('netstandard2.1', '2.1')],
    ['net3.1', new NetStandardTargetFrameworkMoniker('netstandard2.1', '2.1')],
    ['net3.0', new NetStandardTargetFrameworkMoniker('netstandard2.1', '2.1')],

    ['net2.2', new NetStandardTargetFrameworkMoniker('netstandard2.0', '2.0')],
    ['net2.1', new NetStandardTargetFrameworkMoniker('netstandard2.0', '2.0')],
    ['net2.0', new NetStandardTargetFrameworkMoniker('netstandard2.0', '2.0')],

    ['net1.1', new NetStandardTargetFrameworkMoniker('netstandard1.6', '1.6')],
    ['net1.0', new NetStandardTargetFrameworkMoniker('netstandard1.6', '1.6')]
  ])

  override SupportedNetStandardTarget(): NetStandardTargetFrameworkMoniker | null {
    return (
      NetCoreTargetFrameworkMoniker._supportedNetStandardTargets.get(
        this.raw
      ) ?? null
    )
  }
}

export class NetFrameworkTargetFrameworkMoniker extends TargetFrameworkMoniker {
  type = TargetFramework.NetFramework

  private static _supportedNetStandardTargets = new Map<
    string,
    NetStandardTargetFrameworkMoniker
  >([
    ['net481', new NetStandardTargetFrameworkMoniker('netstandard2.1', '2.0')],
    ['net48', new NetStandardTargetFrameworkMoniker('netstandard2.1', '2.0')],
    ['net472', new NetStandardTargetFrameworkMoniker('netstandard2.1', '2.0')],
    ['net471', new NetStandardTargetFrameworkMoniker('netstandard2.1', '2.0')],
    ['net47', new NetStandardTargetFrameworkMoniker('netstandard2.1', '2.0')],
    ['net462', new NetStandardTargetFrameworkMoniker('netstandard2.1', '2.0')],
    ['net461', new NetStandardTargetFrameworkMoniker('netstandard2.1', '2.0')],
    ['net46', new NetStandardTargetFrameworkMoniker('netstandard2.1', '2.0')],

    ['net452', new NetStandardTargetFrameworkMoniker('netstandard1.2', '1.2')],
    ['net451', new NetStandardTargetFrameworkMoniker('netstandard1.2', '1.2')],

    ['net45', new NetStandardTargetFrameworkMoniker('netstandard1.1', '1.1')]
  ])

  override SupportedNetStandardTarget(): NetStandardTargetFrameworkMoniker | null {
    return (
      NetFrameworkTargetFrameworkMoniker._supportedNetStandardTargets.get(
        this.raw
      ) ?? null
    )
  }
}

function tfmRegexTransformer(framework: TargetFramework, regex: RegExp) {
  return function (
    targetFrameworkMoniker: string,
    context: z.RefinementCtx
  ): TargetFrameworkMoniker {
    const match = regex.exec(targetFrameworkMoniker)
    if (match === null) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Not a valid ${framework} target framework moniker.`
      })
      return z.NEVER
    }

    if (match.groups === undefined) {
      throw new Error(
        'Invalid target framework moniker regex - missing capture groups.'
      )
    }

    const { version } = match.groups
    if (!version) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Not a valid ${framework} target framework moniker.`
      })
      return z.NEVER
    }

    return TargetFrameworkMoniker.New(
      framework,
      targetFrameworkMoniker,
      version
    )
  }
}

declare module 'zod' {
  interface ZodString {
    targetFramework(
      framework: TargetFramework,
      regex: RegExp
    ): ZodEffects<z.ZodString, TargetFrameworkMoniker, string>
  }
}

ZodString.prototype.targetFramework = function (
  framework: TargetFramework,
  regex: RegExp
): ZodEffects<z.ZodString, TargetFrameworkMoniker, string> {
  return this.transform(tfmRegexTransformer(framework, regex))
}

// This should be amended to use `z.switch` when that API becomes available. https://github.com/colinhacks/zod/issues/2106
export const targetFrameworkMonikerSchema = z.union([
  z
    .string()
    .targetFramework(
      TargetFramework.NetStandard,
      /^netstandard(?<version>[12]\.\d)$/
    ),
  z
    .string()
    .targetFramework(TargetFramework.NetCore, /^net(?<version>[5-8]\.0)$/),
  z
    .string()
    .targetFramework(TargetFramework.NetFramework, /^net(?<version>\d{2,3})$/)
])
