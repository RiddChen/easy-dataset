# Image Multi-Turn Change Log

本文档整理本轮对 `图片多轮对话数据集` 相关代码的改动。  
约定：

- “版本”是这次连续开发过程中的阶段版本，不是 git tag
- 只记录这轮实际做过的图片多轮相关改动
- 已经撤回的实验性改动会单独标记为“已回退”

## 当前结论

当前项目保留的是：

- 单张图片生成 2 轮多模态对话
- 批量图片 2 轮对话任务
- 任务配置接入
- 图片多轮对话专用列表页
- 审核、确认、删除、导出
- 详情页大图预览 + bbox 可视化
- 图片管理跨页批量选择修复

当前项目已经回退的是：

- 图片多轮对话“一级目录/二级目录分组”方案

## V1 基础图片 2 轮对话能力

目标：

- 支持 `system prompt + 图片 + 首轮文本 + 第二轮追问`
- 生成并保存 2 轮多模态对话数据

主要改动：

- 扩展 `DatasetConversations` 支持图片对话字段
- 图片模式下：
  - 第一轮发送 `文本 + 图片`
  - 第二轮支持手动追问或自动追问
- 导出时把图片消息转换为训练友好的图片路径

涉及文件：

- [prisma/schema.prisma](/d:/easydata/easy-dataset/prisma/schema.prisma)
- [lib/services/multi-turn/index.js](/d:/easydata/easy-dataset/lib/services/multi-turn/index.js)
- [app/api/projects/[projectId]/dataset-conversations/route.js](/d:/easydata/easy-dataset/app/api/projects/[projectId]/dataset-conversations/route.js)
- [app/api/projects/[projectId]/dataset-conversations/export/route.js](/d:/easydata/easy-dataset/app/api/projects/[projectId]/dataset-conversations/export/route.js)

结果：

- 项目具备了基础的图片 2 轮对话生成和导出能力

## V2 独立图片多轮对话页面与接口

目标：

- 不再混用旧的“文本多轮对话”页面
- 给图片多轮对话一套单独入口

主要改动：

- 新增图片多轮对话专用 API
- 新增图片多轮对话专用列表页和详情页
- 图片管理页对接新入口
- 导航增加专用菜单项

涉及文件：

- [app/api/projects/[projectId]/image-conversations/route.js](/d:/easydata/easy-dataset/app/api/projects/[projectId]/image-conversations/route.js)
- [app/api/projects/[projectId]/image-conversations/[conversationId]/route.js](/d:/easydata/easy-dataset/app/api/projects/[projectId]/image-conversations/[conversationId]/route.js)
- [app/api/projects/[projectId]/image-conversations/export/route.js](/d:/easydata/easy-dataset/app/api/projects/[projectId]/image-conversations/export/route.js)
- [app/projects/[projectId]/image-conversations/page.js](/d:/easydata/easy-dataset/app/projects/[projectId]/image-conversations/page.js)
- [app/projects/[projectId]/image-conversations/[conversationId]/page.js](/d:/easydata/easy-dataset/app/projects/[projectId]/image-conversations/[conversationId]/page.js)
- [components/Navbar/DesktopMenus.js](/d:/easydata/easy-dataset/components/Navbar/DesktopMenus.js)
- [components/Navbar/NavigationTabs.js](/d:/easydata/easy-dataset/components/Navbar/NavigationTabs.js)

结果：

- 图片多轮对话不再和旧页面入口混在一起

## V3 图片管理页接入 2 轮对话入口

目标：

- 从 `数据源 -> 图片管理` 直接触发 2 轮对话生成

主要改动：

- 图片管理页新增单张图片的 2 轮对话生成弹窗
- 列表/卡片操作区增加对话入口
- 新增图片文件直出接口，供详情页与对话消息复用

涉及文件：

- [app/projects/[projectId]/images/page.js](/d:/easydata/easy-dataset/app/projects/[projectId]/images/page.js)
- [app/projects/[projectId]/images/components/ImageGrid.js](/d:/easydata/easy-dataset/app/projects/[projectId]/images/components/ImageGrid.js)
- [app/projects/[projectId]/images/components/ImageList.js](/d:/easydata/easy-dataset/app/projects/[projectId]/images/components/ImageList.js)
- [app/projects/[projectId]/images/components/MultiTurnDialog.js](/d:/easydata/easy-dataset/app/projects/[projectId]/images/components/MultiTurnDialog.js)
- [app/api/projects/[projectId]/images/[imageId]/file/route.js](/d:/easydata/easy-dataset/app/api/projects/[projectId]/images/[imageId]/file/route.js)

结果：

- 图片页可以直接针对单图生成图片多轮对话

## V4 任务配置接入

目标：

- 让图片多轮生成复用 `项目设置 -> 任务配置`

主要改动：

- 任务配置新增图片多轮专用字段：
  - `imageMultiTurnFirstQuestion`
  - `imageMultiTurnFollowUpQuestion`
  - `imageMultiTurnAutoFollowUp`
- 单图生成弹窗会读取任务配置默认值
- 图片多轮生成接口会优先读任务配置

涉及文件：

- [constant/setting.js](/d:/easydata/easy-dataset/constant/setting.js)
- [components/settings/TaskSettings.js](/d:/easydata/easy-dataset/components/settings/TaskSettings.js)
- [app/projects/[projectId]/images/components/MultiTurnDialog.js](/d:/easydata/easy-dataset/app/projects/[projectId]/images/components/MultiTurnDialog.js)
- [app/api/projects/[projectId]/image-conversations/route.js](/d:/easydata/easy-dataset/app/api/projects/[projectId]/image-conversations/route.js)

结果：

- 单图生成和图片多轮接口都可以复用任务配置参数

## V5 批量图片 2 轮任务

目标：

- 对多张图片批量生成图片 2 轮对话

主要改动：

- 新增任务类型 `image-multi-turn-generation`
- 任务处理器按项目任务配置批量执行
- 图片管理页新增 `Batch 2-turn` 按钮
- 任务筛选页识别新任务类型

涉及文件：

- [lib/services/tasks/image-multi-turn-generation.js](/d:/easydata/easy-dataset/lib/services/tasks/image-multi-turn-generation.js)
- [lib/services/tasks/index.js](/d:/easydata/easy-dataset/lib/services/tasks/index.js)
- [app/projects/[projectId]/images/page.js](/d:/easydata/easy-dataset/app/projects/[projectId]/images/page.js)
- [components/tasks/TaskFilters.js](/d:/easydata/easy-dataset/components/tasks/TaskFilters.js)
- [app/api/projects/[projectId]/tasks/route.js](/d:/easydata/easy-dataset/app/api/projects/[projectId]/tasks/route.js)

结果：

- 可以创建图片多轮批量任务

当前行为说明：

- 批量任务会跳过已经存在 `sourceType='image'` 的图片多轮对话
- 所以同一张图：
  - 单个生成允许重复
  - 批量生成默认跳过已有记录

这是当前逻辑不一致点，但目前代码未改。

## V6 图片多轮列表页审核与导出增强

目标：

- 让图片多轮数据具备基本审查和导出能力

主要改动：

- 列表页支持：
  - 搜索
  - 已确认/未确认筛选
  - 批量确认
  - 批量删除
- 导出支持：
  - ShareGPT JSON
  - ShareGPT JSONL
  - 每图一个 JSON 的 ZIP
  - 选择是否包含 `system prompt`

涉及文件：

- [app/projects/[projectId]/image-conversations/page.js](/d:/easydata/easy-dataset/app/projects/[projectId]/image-conversations/page.js)
- [app/api/projects/[projectId]/image-conversations/export/route.js](/d:/easydata/easy-dataset/app/api/projects/[projectId]/image-conversations/export/route.js)

结果：

- 图片多轮数据可以完成基本确认、删除、导出

## V7 详情页图片预览与 bbox 叠框

目标：

- 在详情页直接看大图并核对目标框

主要改动：

- 新增大图预览组件
- 详情页上方显示大图
- 对话内容和元信息保留在下方
- 对话里的图片缩略图缩小，避免重复抢占视觉

涉及文件：

- [components/conversations/ImageAnnotationViewer.js](/d:/easydata/easy-dataset/components/conversations/ImageAnnotationViewer.js)
- [app/projects/[projectId]/image-conversations/[conversationId]/page.js](/d:/easydata/easy-dataset/app/projects/[projectId]/image-conversations/[conversationId]/page.js)
- [components/conversations/ConversationContent.js](/d:/easydata/easy-dataset/components/conversations/ConversationContent.js)

结果：

- 详情页支持人工看图审查

## V8 bbox 解析修正与显示细化

目标：

- 修正 bbox 显示错误
- 提升框和标签的可读性

主要改动：

- 修正 `bbox=[x,y,w,h]` 解析
  - `bbox=[...]`
  - `bbox:[...]`
  都强制按 `xywh` 解释
- 修正叠框定位
  - 框相对真实图片本体定位，不再相对外层黑色容器
- 标签样式优化
  - 框线变细
  - 标签贴近框左上角
  - 标签字体缩小
- 支持从回答中解析：
  - `privacy item1: face | bbox=[...]`
  - 标签显示为 `#1: face`

涉及文件：

- [components/conversations/ImageAnnotationViewer.js](/d:/easydata/easy-dataset/components/conversations/ImageAnnotationViewer.js)

结果：

- bbox 渲染与用户定义的归一化 `xywh` 协议一致
- 标签可显示真实 item 编号与名称

## V9 图片管理跨页勾选修复

目标：

- 修复图片管理页分页后勾选丢失

主要改动：

- 列表页“当前页全选”从覆盖模式改为累积模式
- 取消全选只影响当前页
- 表头复选框改为只根据当前页计算状态

涉及文件：

- [app/projects/[projectId]/images/components/ImageList.js](/d:/easydata/easy-dataset/app/projects/[projectId]/images/components/ImageList.js)

结果：

- 可以跨页累计勾选图片，例如第 1 页 8 张 + 第 2 页 8 张

## V10 图片多轮目录分组实验

目标：

- 给图片多轮数据集增加一级目录分组
- 目录默认名取任务开始时间
- 目录支持重命名
- 历史数据归入 `history`

主要改动：

- 新增目录元数据 JSON 方案
- 单条生成和批量生成尝试接入目录归档
- 列表页改为目录视图

状态：

- 已回退

回退原因：

- 你后续确认认为目录分组方案对当前“允许单图重复、批量默认跳过”的行为帮助不大
- 为避免继续叠加复杂度，已整体撤回

当前结果：

- 项目中不再保留目录分组逻辑
- 页面恢复为原来的单层列表

## 已回退项

下面这些功能目前不在项目中：

- 图片多轮一级目录/二级目录分组
- 目录重命名
- 历史数据自动归档到 `history`
- 生成时自动创建目录

## 当前保留功能清单

截至当前工作区，仍保留的图片多轮能力有：

- 图片页单图生成 2 轮对话
- 图片批量 2 轮任务
- 任务配置接入
- 图片多轮对话列表页
- 确认、删除、导出
- ShareGPT JSON / JSONL / ZIP 导出
- 导出时包含或排除 `system prompt`
- 详情页大图预览
- bbox 可视化
- `privacy itemN: name | bbox=[...]` 标签显示
- 图片管理跨页勾选

## 当前建议

如果你后续还要继续演进，优先级建议是：

1. 统一“单图生成”和“批量生成”的重复策略
2. 给批量任务增加明确的跳过统计
3. 让任务页和图片多轮列表页能明确看到：
   - 新增数量
   - 跳过数量
   - 失败数量
4. 再决定是否值得重新做目录分组

