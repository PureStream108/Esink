# How to Use?

当前支持 7 种 fuzz：

- `Directory`
- `SSTI`
- `SSRF`
- `XSS`
- `RCE`
- `Username`
- `Password`

## 窗口

插件窗口分为三块：

- 顶部：结果流
- 中部：`Parameters / Dictionaries` 页签切换
- 底部：当前页签的操作区

当前界面行为：

- 右上角可切换 `Light / System / Dark`
- `Esc` 可关闭插件窗口
- 窗口过窄时会出现“请调整到更宽以便使用”
- `Reset` 只清空当前显示结果，不删除字典和设置
- `Stop` 用于取消当前运行中的任务

## 字典

在 `Dictionaries` 页签中，每种任务类型都可以单独上传字典。

要求：

- 只允许上传 `.txt`
- 每行一条 payload
- 空行会被忽略
- 重复行会自动去重

## 输入框

使用：

1. 打开目标网页
2. 在目标输入框或文本域上点击右键
3. 从右键菜单打开 E Sink

实现上，扩展也会在以下时机自动同步目标：

- `focusin`
- `pointerdown`
- `input`

但仍建议以“右键目标输入框”

### 可捕获

当前主要支持：

- `input`
- `textarea`

不会作为主目标输入框处理的类型包括：

- `button`
- `checkbox`
- `color`
- `file`
- `hidden`
- `image`
- `radio`
- `range`
- `reset`
- `submit`

### 启动条件

要成功启动 `XSS / SSTI / SSRF / RCE / Username / Password`，目标字段必须满足：

- 存在 `name`
- 位于可提交的原生 `form` 中

否则扩展会拒绝启动任务

## Directory

1. 在普通 `http/https` 页面打开目标站点
2. 打开插件
3. 在 `Parameters` 页签中找到 `Directory`
4. 点击 `Settings`
5. 点击 `loadURL`
6. 按需调整路径部分
7. 点击 `Save`
8. 点击 `Start`

### 设置

`Directory` 的设置页支持：

- `loadURL`：读取当前活动页面 URL
- `lockedOrigin`：锁定当前站点 origin，不允许切换到其他域
- `pathPrefix`：允许编辑路径前缀
- `visibleStatusBuckets`：控制结果区显示哪些状态码分组

默认只显示：

- `200`

可额外开启：

- `3xx`
- `4xx`
- `5xx`

- 目标路径

## XSS / SSTI / SSRF / RCE

1. 打开目标页面
2. 在目标输入框或文本域上右键
3. 打开插件
4. 确认顶部已经显示捕获到的目标字段
5. 在 `Parameters` 页签选择对应任务
6. 如有需要，先点击 `Settings`
7. 点击 `Start`

### 设置

这四类任务都带有 `Settings` 按钮。

设置页当前只控制“结果显示过滤”，不影响实际请求发送。

可选项：

- `Filtered`
- `Unfiltered`

默认只显示：

- `Filtered`

### 当前判断方式

这四类任务当前使用“响应回显启发式判断”，不是严格的逐字符 diff。

大致规则：

- 原始 payload 原样出现在响应体中 -> `Unfiltered`
- HTML 转义后出现 -> `Filtered`
- URL 编码后出现 -> `Filtered`
- 去掉危险字符后仍出现 -> `Filtered`
- 未发现原样回显 -> `Filtered`

## Username / Password

1. 打开登录页
2. 在用户名框或密码框上右键
3. 打开插件
4. 上传或确认存在 `Username` / `Password` 字典
5. 选择对应任务并点击 `Start`

扩展会在当前字段和同表单其他字段中，尝试自动寻找更合适的目标字段，例如：

- `username`
- `user`
- `login`
- `email`
- `password`
- `passwd`
- `pwd`

所以：

- 你即使先右键密码框，也可以跑 `Username`
- 你即使先右键用户名框，也可以跑 `Password`

### 11.3 命中判断

`Username / Password` 不走上面的 payload 回显逻辑，而是使用基线响应对比。

扩展会先发一条明显无效的基线请求，再把后续结果与之比较，重点看：

- 状态码变化
- `Location` 变化
- 最终 URL 变化
- 重定向变化
- 客户端跳转痕迹
- 页面结构变化
- 登录成功/失败关键词变化

结果流会保留完整的终端风格展示。

## 任务状态

当前任务模型如下：

- 同一时间只允许一个活动任务
- 启动新任务时，旧任务会被取消
- 点击 `Stop` 会取消当前任务
- 顶部状态行会显示：
  - 当前任务类型
  - 完成数量 / 总数量
  - 当前提示信息

## 限制

当前实现更适合标准表单类页面，不适合所有现代前端应用。

主要限制：

- 输入类任务依赖原生 `form`
- 目标字段必须有 `name`
- 对完全由前端脚本拼装请求的页面兼容性有限
- payload 任务的过滤判断是启发式，不是严格语义分析
