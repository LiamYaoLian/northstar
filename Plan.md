# 误点完成撤销计划（已完成）

把误点「完成」设计成 **撤销完成（Undo completion）**，而不是开放任意删除完成记录。

当前 `task_completion_events` 是完成行为快照，直接删除任意历史记录会让 Alignment、CSV、Review 快照语义变复杂。误点场景更适合绑定任务状态：用户把当前 `done` 任务重新打开时，同步移除这一次完成产生的 completion event。

---

## 目标

- 用户误点「完成」后，可以通过现有「重新打开」动作撤销这次完成。
- 撤销后，任务回到未完成状态，Alignment、完成记录 CSV、Review live 摘要与后续保存的快照不再统计这条误完成记录。
- recurring lazy reset 仍保留历史完成记录，不被误判为用户撤销。
- 已经保存过的 `review_snapshots` 是历史快照，不做自动回写；用户需要重新保存才会反映撤销后的统计。

---

## 规则

- `todo/in_progress → done`：照常写入 `task_completion_events`
- `done → todo`：使用清空前的旧 `completedAt` 删除同一任务精确匹配的 completion event
- 如果旧 `completedAt` 为空，或对应 completion event 已不存在，删除逻辑 no-op，不阻塞 reopen
- recurring lazy reset：只打开新周期，不删除历史 completion event
- recurring 任务可能有多条历史 event；reopen 只删除当前任务行这次 `completedAt` 对应的一条，不按 `taskId` 批量删
- 不新增独立 `DELETE /api/completions/[id]`，避免出现“任务仍 done，但完成记录被删”的不一致状态

---

## 实现范围

- `src/lib/services/completions.ts`：新增按 `taskId + completedAt` 精确删除 completion event 的 helper，接受事务对象，返回删除数量或 void
- `src/lib/services/tasks.ts`：在 `updateTask()` 的 `done → non-done` transition 中，先保存 current row 的旧 `completedAt`，再同事务清空任务状态并删除 event
- `src/lib/services/tasks-completion.integration.test.ts`：覆盖完成后 reopen 会移除本次 event；覆盖子任务全勾 auto-complete 后 reopen 也会移除 event
- recurring 相关测试：确认 lazy reset 不删除历史 completion event；确认 recurring reopen 只删当前 `completedAt` 对应 event
- `design.md`：更新完成记录语义，区分用户撤销与 recurring reset

---

## 非目标

- 不新增 Alignment 完成记录行内删除按钮。
- 不新增 `DELETE /api/completions/[id]`。
- 不修改 `review_snapshots` 历史行。
- 不改动 time entries；撤销完成只影响 completion event，不影响用户已记录的时间。

---

## 验证

- [x] 完成任务后能看到 completion event。
- [x] 重新打开同一任务后，该 completion event 被删除。
- [x] 对应 event 缺失时，重新打开仍成功。
- [x] 子任务全勾触发 auto-complete 后，重新打开父任务会删除本次 event。
- [x] recurring 任务跨周期 lazy reset 后，旧 completion event 仍保留。
- [x] recurring 任务有多条历史完成时，只撤销当前这次，不影响更早 occurrence。
- [x] Alignment 完成记录、CSV 导出、Review live 摘要都不再包含已撤销的误完成。

测试结果：`npm test` 通过，40 个 test files / 267 个 tests 全绿。
