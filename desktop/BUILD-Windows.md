# Windows x64 便携版构建

在 Windows 10/11（安装 Node.js 22 或更高版本）下运行：

```powershell
npm ci
npm run build:windows
```

产物：`release/DrawStampUtils-0.2.5-win-x64-portable.zip`。

将 ZIP **完整解压**，双击 `DrawStampUtils.exe`；无需单独安装 Node.js 或运行 Web 服务。
用户数据保存在 EXE 同级的 `Data` 文件夹。

也可以把此源码提交到 GitHub Fork，然后从 **Actions → Windows x64 portable → Run workflow** 手动构建并发布。
为避免日常代码提交重复发布，该工作流仅在自身文件变更推送到 `main` 或手动触发时运行。

构建使用上游 Vue/Vite 静态资源以及 Electron 桌面外壳，桌面版不加载网站统计脚本和外部网络资源。
目前未对程序签名，Windows SmartScreen 可能出现未知发布者提示。
