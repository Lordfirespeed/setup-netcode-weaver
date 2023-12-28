/**
 * Unit tests for the action's main functionality, src/main.ts
 *
 * These should be run as if the action was called from a workflow.
 * Specifically, the inputs listed in `action.yml` should be set as environment
 * variables following the pattern `INPUT_<INPUT_NAME>`.
 */

import * as core from '@actions/core'
import * as toolCache from '@actions/tool-cache'
import process from 'process'
import fs from 'fs/promises'

import * as main from '../src/main'
import path from 'path'

// Mock the action's main function
const runMock = jest.spyOn(main, 'default')

// Mock the GitHub Actions core library
let _coreDebugMock: jest.SpyInstance
let _coreInfoMock: jest.SpyInstance
let _coreWarningMock: jest.SpyInstance
let _coreErrorMock: jest.SpyInstance
let _getInputMock: jest.SpyInstance
let _setOutputMock: jest.SpyInstance

// Mock the GitHub Actions tool cache library
let _findToolMock: jest.SpyInstance
let _downloadToolMock: jest.SpyInstance
let _extractZipMock: jest.SpyInstance<
  Promise<string>,
  [file: string, dest?: string | undefined]
>

// Mock the filesystem/promises library
let _readdirMock: jest.SpyInstance
let _cpMock: jest.SpyInstance
let _copyFileMock: jest.SpyInstance
let _writeFileMock: jest.SpyInstance

describe('action', () => {
  const originalProcessEnv = process.env

  function mockInputs(inputs: Map<string, string>): void {
    for (const [key, value] of inputs) {
      // https://github.com/actions/toolkit/blob/8f1c589/packages/core/src/core.ts#L128
      process.env[`INPUT_${key.replace(/ /g, '_').toUpperCase()}`] = value
    }
  }

  function mockPosixImplementations(): void {
    const temp_dir = process.env.RUNNER_TEMP
    if (!temp_dir)
      throw new Error('$RUNNER_TEMP must be defined to mock implementations')

    _downloadToolMock.mockImplementation(
      async (url, dest) => dest ?? path.posix.join(temp_dir, '[download-uuid]')
    )
    _extractZipMock.mockImplementation(
      async (archivePath, dest) =>
        dest ?? path.posix.join(temp_dir, '[extract-zip-uuid]')
    )
  }

  beforeEach(() => {
    jest.clearAllMocks()

    process.env.RUNNER_TEMP = '/runner/temp'
    process.env.HOME = '/runner/home'

    mockInputs(
      new Map()
        .set('netcode-weaver-version', '2.4.0')
        .set('target-framework', 'netstandard2.1')
        .set('deps-packages', '[]')
    )

    _coreDebugMock = jest.spyOn(core, 'debug').mockImplementation()
    _coreInfoMock = jest.spyOn(core, 'info').mockImplementation()
    _coreWarningMock = jest.spyOn(core, 'warning').mockImplementation()
    _coreErrorMock = jest.spyOn(core, 'error').mockImplementation()
    _getInputMock = jest.spyOn(core, 'getInput')
    _setOutputMock = jest.spyOn(core, 'setOutput').mockImplementation()

    _findToolMock = jest.spyOn(toolCache, 'find').mockReturnValue('')
    _downloadToolMock = jest
      .spyOn(toolCache, 'downloadTool')
      .mockImplementation()
    _extractZipMock = jest.spyOn(toolCache, 'extractZip').mockImplementation()

    _readdirMock = jest.spyOn(fs, 'readdir').mockResolvedValue([])
    _cpMock = jest.spyOn(fs, 'cp').mockImplementation()
    _copyFileMock = jest.spyOn(fs, 'copyFile').mockImplementation()
    _writeFileMock = jest.spyOn(fs, 'writeFile').mockImplementation()

    mockPosixImplementations()
  })

  afterEach(() => {
    process.env = originalProcessEnv
  })

  it('downloads and extracts a ZIP archive', async () => {
    await main.default()
    expect(runMock).toHaveReturned()

    expect(_downloadToolMock).toHaveBeenCalled()
    expect(_extractZipMock).toHaveBeenCalled()
  })

  it('sets netcode-weaver-directory output', async () => {
    await main.default()
    expect(runMock).toHaveReturned()

    expect(_setOutputMock).toHaveBeenCalledWith(
      'netcode-weaver-directory',
      expect.any(String)
    )
  })
})
