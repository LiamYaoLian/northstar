# Northstar 迭代计划

> 循环：critique `design.md` → 本计划 → critique 修订 → TDD → 实现 → 回写 `design.md` → 下一轮。

---

## 当前状态 — MVP 已齐（2026-06-18）

| 能力 | 状态 |
|------|------|
| 战略 / 任务 / 优先级 / recurring | ✅ |
| 完成可见性 + defer + 策略编辑 | ✅ |
| Alignment（本周）+ Review 快照 | ✅ |
| CSV 导出（completions + time entries） | ✅ |
| 空状态引导（Today 筛选 / Tasks 进行中） | ✅ Loop 7 |
| `design.md` 与代码同步 | ✅ Loop 7 |
| optimistic UI | 已知限制，非 MVP |

---

## Loop 7 ✅ 体验收尾 + 文档终检

- Today：分类筛选无结果时单独文案
- Tasks：进行中 tab 空状态引导
- `design.md`：架构图、测试索引、API tz 列表、文件索引

---

## 后续可选（非 MVP）

| 项 | 说明 |
|----|------|
| optimistic UI | 完成/记时局部更新，减少 reload |
| Alignment 拖延雷达周期化 | 与 defer 统计对齐 |
| 多用户 / auth | 产品定位外 |

---

## Post-MVP UX 收敛 ✅（2026-06-17）

- **三页合并**：`/completed`、`/review` 并入 `/alignment` 长滚动单页
- 统一 `?period=today|week|month|all` 驱动 KPI、pillar、完成记录与导出
- 旧路由 thin redirect；导航减为 Today / 对齐 / Tasks / Strategy
- 子组件提取至 `src/components/alignment/`

---

## 设计评审记录

**Loop 7**：MVP 功能闭环完成；文档与实现一致。optimistic UI 留作体验债，不阻塞发布。
