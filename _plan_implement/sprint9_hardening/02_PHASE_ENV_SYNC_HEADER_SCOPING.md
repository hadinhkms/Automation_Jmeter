# Phase 2: Environment Auto-Sync & Cascaded Headers Scoping
## Tự động đồng bộ UDV & Kế thừa Headers cấp TestPlan/ThreadGroup

> **Trọng tâm:** P2 (Major)  
> **Tài liệu cha:** [00_MASTER_PLAN.md](00_MASTER_PLAN.md)  
> **Kỷ luật giới hạn file:** Tạo util riêng `headerScoping.ts` để giữ `useSendRequest.ts` không vượt ngưỡng 120 dòng.

---

### 1. Phân Tích Kỹ Thuật

#### 1.1 Vấn đề Auto-Sync UDV
- Hiện tại khi người dùng chọn môi trường trên `EnvironmentSwitcher` hoặc import file `.postman_environment.json`, chỉ có Zustand store cập nhật, cây JMX không đổi dẫn tới sai lệch kịch bản.

#### 1.2 Vấn đề Header Scoping
- Trong cấu trúc cây JMeter:
  ```text
  TestPlan
  ├── HTTPHeaderManager (Headers chung: e.g. User-Agent, X-Api-Key)
  └── ThreadGroup
      ├── HTTPHeaderManager (Headers nhóm: e.g. Authorization: Bearer token)
      └── HTTPRequest (Sampler - có thể có hoặc không có HeaderManager con)
  ```
- Nút `[Send Request]` hiện tại chỉ tìm `node.children.find(c => c.type === 'HTTPHeaderManager')`. Cần duyệt ngược cây hoặc tìm cha để gom toàn bộ headers theo thứ tự kế thừa chuẩn của JMeter.

---

### 2. Kế Hoạch Chỉnh Sửa Mã Nguồn

#### 2.1 Tạo mới: `src/utils/headerScoping.ts` (~50 dòng)
```typescript
import type { TableRow, TestPlanNode } from '../models/jmeter'

export function findParentPath(root: TestPlanNode, targetId: string, currentPath: TestPlanNode[] = []): TestPlanNode[] | null {
  if (root.id === targetId) return currentPath
  for (const child of root.children) {
    const res = findParentPath(child, targetId, [...currentPath, root])
    if (res) return res
  }
  return null
}

export function resolveCascadedHeaders(targetNode: TestPlanNode, rootNode: TestPlanNode): Array<{ name: string; value: string }> {
  const parents = findParentPath(rootNode, targetNode.id) || []
  const allNodes = [...parents, targetNode]
  const headerMap = new Map<string, string>()

  for (const n of allNodes) {
    for (const child of n.children) {
      if (child.type === 'HTTPHeaderManager') {
        const rows = (child.properties.headers as TableRow[]) || []
        for (const row of rows) {
          if (row.name) {
            headerMap.set(String(row.name).toLowerCase(), String(row.value || ''))
          }
        }
      }
    }
  }

  return Array.from(headerMap.entries()).map(([k, v]) => ({ name: k, value: v }))
}
```

#### 2.2 Sửa: `src/components/common/debug/useSendRequest.ts`
- Sử dụng `resolveCascadedHeaders(node, useJMeterStore.getState().testPlan)` để lấy đầy đủ danh sách headers thay vì chỉ đọc `node.children`.

#### 2.3 Sửa: `src/components/toolbar/useEnvironmentSync.ts` & `EnvironmentSwitcher.tsx`
- Tự động gọi `syncEnvironmentToUDV()` ngay sau khi import file thành công.
- Tự động gọi đồng bộ khi click chuyển môi trường trong `onSelect`.

---

### 3. Checklist Nghiệm Thu Phase 2
- [x] Chuyển qua lại giữa Dev/QC/Staging -> Node `UserDefinedVariables` trong cây JMX tự động thay đổi giá trị tương ứng.
- [x] Đặt `HTTPHeaderManager` ở ThreadGroup -> Bấm `[Send Request]` ở HTTPRequest con gửi đúng header.
