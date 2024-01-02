# Setup Netcode Patcher

[![GitHub Super-Linter](https://github.com/Lordfirespeed/setup-netcode-weaver/actions/workflows/linter.yml/badge.svg)](https://github.com/super-linter/super-linter)
![CI](https://github.com/Lordfirespeed/setup-netcode-weaver/actions/workflows/ci.yml/badge.svg)
[![Check dist/](https://github.com/Lordfirespeed/setup-netcode-weaver/actions/workflows/check-dist.yml/badge.svg)](https://github.com/Lordfirespeed/setup-netcode-weaver/actions/workflows/check-dist.yml)
[![CodeQL](https://github.com/Lordfirespeed/setup-netcode-weaver/actions/workflows/codeql-analysis.yml/badge.svg)](https://github.comLordfirespeed/setup-netcode-weaver/actions/workflows/codeql-analysis.yml)

This action sets up [UnityNetcodePatcher](https://github.com/EvaisaDev/UnityNetcodePatcher) for use in workflows.

## Usage

The following example will setup Netcode Patcher `v2.4.0` and copy the appropriate assemblies
from provided packages into the `netcodePatcher/deps/` folder.

```yaml
steps:
  - name: Setup NetCode Patcher
    uses: Lordfirespeed/setup-netcode-patcher@v0
    with:
      netcode-patcher-version: 2.4.0
      deps-packages: '[
          {"id": "LethalCompany.GameLibs.Steam", "version": "45.0.2-alpha.1"}, 
          {"id": "UnityEngine.Modules", "version": "2022.3.9"}
        ]'
      target-framework: "netstandard2.1"
```

## Inputs

| name                    | description                                                                         |
|-------------------------|-------------------------------------------------------------------------------------|
| netcode-patcher-version | Netcode Patcher version to setup                                                    |
| deps-packages           | NuGet packages (must be available in NuGet cache) to copy reference assemblies from |
| deps-paths]             | Reference assembly paths to copy                                                    |
| target-framework        | Project target framework moniker used to resolve dependency assemblies              |

## Outputs

| name       | description                             |
|------------|-----------------------------------------|
| directory  | Directory where Netweaver was installed |
