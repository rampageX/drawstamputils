import { execFileSync } from 'node:child_process'
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { packager } from '@electron/packager'

const projectDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const version = JSON.parse(readFileSync(path.join(projectDir, 'package.json'), 'utf8')).version
const outputDir = path.join(projectDir, 'release')
const archiveName = `DrawStampUtils-${version}-win-x64-portable.zip`
const workDir = mkdtempSync(path.join(tmpdir(), 'drawstamp-win-'))

try {
  const staging = path.join(workDir, 'app')
  const webDir = path.join(staging, 'web')
  mkdirSync(webDir, { recursive: true })
  cpSync(path.join(projectDir, 'dist'), webDir, { recursive: true })
  cpSync(path.join(projectDir, 'desktop', 'main.cjs'), path.join(staging, 'main.cjs'))
  cpSync(path.join(projectDir, 'LICENSE'), path.join(staging, 'LICENSE'))
  writeFileSync(path.join(staging, 'package.json'), JSON.stringify({
    name: 'drawstamputils-desktop',
    productName: 'DrawStampUtils',
    version,
    main: 'main.cjs',
    private: true,
    description: 'Offline electronic stamp editor for Windows',
  }, null, 2))

  // The website embeds an analytics script. The offline app does not.
  const index = path.join(webDir, 'index.html')
  const originalHtml = readFileSync(index, 'utf8')
  const offlineHtml = originalHtml.replace(/\s*<script\s+defer\s+src="https:\/\/cloud\.umami\.is\/script\.js"[^>]*><\/script>/, '')
    .replace(/<link rel="icon"[^>]*>/g, '')
    .replace(/\s*<meta property="og:image"[^>]*>/, '')
    .replace('</head>', '    <meta http-equiv="Content-Security-Policy" content="default-src \'self\'; script-src \'self\'; style-src \'self\' \'unsafe-inline\'; img-src \'self\' data: blob:; font-src \'self\' data:; connect-src \'none\'; object-src \'none\'; frame-src \'none\'; base-uri \'self\'">\n  </head>')
  if (offlineHtml === originalHtml || offlineHtml.includes('cloud.umami.is')) {
    throw new Error('Could not remove online analytics from desktop HTML')
  }
  writeFileSync(index, offlineHtml)

  const [appDir] = await packager({
    dir: staging,
    name: 'DrawStampUtils',
    platform: 'win32',
    arch: 'x64',
    electronVersion: '45.3.0',
    out: path.join(workDir, 'out'),
    asar: true,
    overwrite: true,
    prune: true,
    win32metadata: { FileDescription: 'DrawStampUtils Offline Editor', ProductName: 'DrawStampUtils' },
  })

  cpSync(path.join(projectDir, 'LICENSE'), path.join(appDir, 'LICENSE-Apache-2.0.txt'))
  cpSync(path.join(projectDir, 'desktop', 'README-Windows.txt'), path.join(appDir, '使用说明.txt'))
  mkdirSync(outputDir, { recursive: true })
  const archive = path.join(outputDir, archiveName)
  if (existsSync(archive)) rmSync(archive)
  if (process.platform === 'win32') {
    execFileSync('tar.exe', ['-a', '-c', '-f', archive, '.'], { cwd: appDir, stdio: 'inherit' })
  } else {
    execFileSync('zip', ['-q', '-r', archive, '.'], { cwd: appDir, stdio: 'inherit' })
  }
  console.log(`Windows x64 portable package: ${archive}`)
} finally {
  rmSync(workDir, { recursive: true, force: true })
}
