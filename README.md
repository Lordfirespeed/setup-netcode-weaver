# Setup Netcode Weaver

[![GitHub Super-Linter](https://github.com/Lordfirespeed/setup-netcode-weaver/actions/workflows/linter.yml/badge.svg)](https://github.com/super-linter/super-linter)
![CI](https://github.com/Lordfirespeed/setup-netcode-weaver/actions/workflows/ci.yml/badge.svg)
[![Check dist/](https://github.com/Lordfirespeed/setup-netcode-weaver/actions/workflows/check-dist.yml/badge.svg)](https://github.com/Lordfirespeed/setup-netcode-weaver/actions/workflows/check-dist.yml)
[![CodeQL](https://github.com/Lordfirespeed/setup-netcode-weaver/actions/workflows/codeql-analysis.yml/badge.svg)](https://github.comLordfirespeed/setup-netcode-weaver/actions/workflows/codeql-analysis.yml)
[![Coverage](./badges/coverage.svg)](./badges/coverage.svg)

This action sets up **Netcode Weaver** for use in actions.

## Usage

The following example will setup Netcode Weaver `v2.4.0` and copy the appropriate assemblies
from provided packages into the `NetcodeWeaver/deps/` folder.

```yaml
steps:
  - name: Setup netcode weaver
    uses: Lordfirespeed/setup-netcode-weaver@v0
    with:
      netcode-weaver-version: 2.4.0
      deps-packages: '[
          {"id": "LethalCompany.GameLibs.Steam", "version": "45.0.2-alpha.1"}, 
          {"id": "UnityEngine.Modules", "version": "2022.3.9"}
        ]'
      target-framework: "netstandard2.1"
```

## Inputs

| name                    | description                                                                         |
|-------------------------|-------------------------------------------------------------------------------------|
| netcode-weaver-version  | Netcode Weaver version to setup                                                     |
| deps-packages           | NuGet packages (must be available in NuGet cache) to copy reference assemblies from |
| target-framework        | Project target framework moniker used to resolve dependency assemblies              |

## Outputs

| name       | description                             |
|------------|-----------------------------------------|
| directory  | Directory where Netweaver was installed |
