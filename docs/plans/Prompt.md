Bạn là Senior Frontend Engineer + Software Architect.

Hãy xây dựng một MVP có tên tạm thời là **JMeter Web UI**.

## 1. Mục tiêu

Xây một ứng dụng web chạy trên browser, có giao diện và cách sử dụng **gần giống Apache JMeter Desktop nhất có thể ở giai đoạn đầu**.

Mục tiêu của phiên bản đầu tiên KHÔNG phải redesign JMeter thành sản phẩm mới.

Ưu tiên:

- Người đã quen dùng JMeter Desktop mở web lên có thể sử dụng gần như ngay lập tức.
- Giữ nguyên mental model của JMeter.
- Giữ Test Plan dạng cây bên trái.
- Click node nào thì editor của component đó hiển thị bên phải.
- Có context menu Add giống JMeter.
- Có toolbar Run/Stop giống JMeter.
- Có thể mở file `.jmx`.
- Có thể chỉnh sửa dữ liệu.
- Có thể export ngược lại `.jmx`.
- Kiến trúc phải đủ tốt để sau này tích hợp JMeter backend thật.

---

# 2. Tech stack

Frontend:

- React
- TypeScript
- Vite
- HTML5
- CSS
- Zustand để quản lý state

Không cần Next.js.

Không dùng backend thật ở phase đầu nếu chưa cần.

Nếu cần mock API thì tạo service abstraction để sau này thay bằng API thật.

Project phải chạy bằng:

```bash
npm install
npm run dev
```

Code phải rõ ràng, modular, production-friendly.

---

# 3. Nguyên tắc quan trọng

Không xây giao diện dạng website CRUD thông thường.

Đây phải là một **web application/editor dạng IDE**, tương tự:

- JMeter
- VS Code
- IntelliJ

Không tách mỗi component thành một page riêng.

Không sử dụng routing kiểu:

```text
/thread-group/123
/http-request/456
```

Toàn bộ Test Plan Editor phải nằm trong một màn hình chính.

Layout chính:

```text
┌─────────────────────────────────────────────────────────────────────┐
│ Menu + Toolbar                                                     │
├─────────────────────────┬───────────────────────────────────────────┤
│ Test Plan Tree          │ Component Editor                          │
│                         │                                           │
│                         │                                           │
│                         │                                           │
├─────────────────────────┴───────────────────────────────────────────┤
│ Status Bar / Run Status                                            │
└─────────────────────────────────────────────────────────────────────┘
```

---

# 4. Giao diện tổng thể

Hãy tham khảo cách bố trí của Apache JMeter Desktop.

Không cần copy pixel-perfect.

Nhưng cần giữ:

- Menu trên cùng
- Toolbar
- Test Plan Tree bên trái
- Editor bên phải
- Status bar dưới cùng

Phong cách:

- Desktop application
- Clean
- Functional
- Professional
- Ít decoration
- Không làm kiểu dashboard SaaS nhiều card
- Không gradient
- Không dùng hiệu ứng màu mè
- Ưu tiên density giống developer tool

---

# 5. Menu bar

Tạo menu:

```text
File
Edit
Search
Run
Options
Tools
Help
```

V1 chưa cần tất cả action thật.

Nhưng menu phải tồn tại.

Những chức năng chưa hỗ trợ có thể disabled.

---

# 6. Toolbar

Toolbar cần có:

```text
New
Open JMX
Save
Export JMX

Cut
Copy
Paste

Start
Stop
Shutdown

Clear
Clear All
```

Có tooltip.

Các button phải có state disabled hợp lý.

Ví dụ:

- Stop disabled khi chưa chạy.
- Save disabled nếu chưa có thay đổi.
- Paste disabled nếu clipboard nội bộ rỗng.

Không sử dụng browser clipboard API ở MVP.

Dùng application clipboard nội bộ.

---

# 7. Test Plan Tree

Đây là phần quan trọng nhất.

Tree phải hỗ trợ:

- Expand
- Collapse
- Select
- Add child
- Delete
- Copy
- Paste
- Duplicate
- Enable
- Disable
- Rename
- Drag and drop
- Move up
- Move down

Node đang selected phải highlight rõ.

Node disabled phải hiển thị mờ giống JMeter.

Tree phải có icon khác nhau cho từng loại component.

Ví dụ tree mock:

```text
Test Plan
│
├── User Defined Variables
│
├── Thread Group
│   │
│   ├── HTTP Request Defaults
│   │
│   ├── HTTP Header Manager
│   │
│   ├── CSV Data Set Config
│   │
│   ├── Transaction Controller
│   │   │
│   │   ├── Login API
│   │   ├── JSON Extractor
│   │   └── Response Assertion
│   │
│   └── View Results Tree
```

---

# 8. Context menu giống JMeter

Khi right-click vào node hợp lệ, hiển thị context menu:

```text
Add
Cut
Copy
Paste
Duplicate
Remove
Enable
Disable
Rename
Move Up
Move Down
```

Menu Add cần có nested menu:

```text
Add
├── Threads
│   └── Thread Group
│
├── Sampler
│   ├── HTTP Request
│   └── JSR223 Sampler
│
├── Logic Controller
│   ├── If Controller
│   ├── Loop Controller
│   └── Transaction Controller
│
├── Config Element
│   ├── HTTP Request Defaults
│   ├── HTTP Header Manager
│   ├── HTTP Cookie Manager
│   └── CSV Data Set Config
│
├── Timer
│   └── Constant Timer
│
├── Pre Processor
│   └── JSR223 PreProcessor
│
├── Post Processor
│   ├── JSON Extractor
│   ├── Regular Expression Extractor
│   └── JSR223 PostProcessor
│
├── Assertion
│   ├── Response Assertion
│   └── JSR223 Assertion
│
└── Listener
    ├── View Results Tree
    ├── Summary Report
    └── Aggregate Report
```

Menu chỉ cho phép add component hợp lệ dựa trên parent node.

Không cho add component vào parent không hợp lệ.

---

# 9. Data model

Không lưu UI state trực tiếp theo JMX XML.

Tạo internal model dạng JSON.

Ví dụ:

```ts
interface TestPlanNode {
  id: string;
  type: JMeterComponentType;
  name: string;
  enabled: boolean;
  properties: Record<string, any>;
  children: TestPlanNode[];
}
```

Ví dụ:

```json
{
  "id": "node-1",
  "type": "TestPlan",
  "name": "API Performance Test",
  "enabled": true,
  "properties": {},
  "children": [
    {
      "id": "node-2",
      "type": "ThreadGroup",
      "name": "100 Users",
      "enabled": true,
      "properties": {
        "numThreads": 100,
        "rampUp": 30,
        "loops": 10
      },
      "children": []
    }
  ]
}
```

State chính:

```text
testPlan
selectedNodeId
expandedNodeIds
dirty
clipboard
runState
```

---

# 10. Component Editor

Khi chọn node bên trái, bên phải phải render editor tương ứng.

Tạo architecture dạng:

```text
ComponentEditor
   ↓
switch node.type
   ↓
SpecificEditor
```

Ví dụ:

```text
ThreadGroupEditor
HTTPRequestEditor
HTTPDefaultsEditor
HeaderManagerEditor
CSVDataSetEditor
TransactionControllerEditor
JSONExtractorEditor
RegexExtractorEditor
ResponseAssertionEditor
JSR223Editor
ListenerEditor
```

---

# 11. Common component header

Tất cả component editor phải có phần chung:

```text
Name:
[                         ]

Comments:
[                         ]

Enabled:
[✓]
```

---

# 12. Thread Group Editor

Tạo giao diện gần giống JMeter.

Fields:

```text
Action to be taken after a Sampler error

○ Continue
○ Start Next Thread Loop
○ Stop Thread
○ Stop Test
○ Stop Test Now
```

Thread Properties:

```text
Number of Threads
Ramp-up Period
Loop Count

Same user on each iteration
Delay Thread creation until needed
Scheduler
```

Nếu bật Scheduler:

```text
Duration
Startup Delay
```

Validate number >= 0.

---

# 13. HTTP Request Editor

Phải là component quan trọng nhất của MVP.

Fields:

```text
Protocol
Server Name or IP
Port Number
HTTP Request Method
Path
Content Encoding
```

Checkbox:

```text
Follow Redirects
Auto Redirects
Use KeepAlive
Use multipart/form-data
Browser-compatible headers
```

Tabs:

```text
Parameters
Body Data
Files Upload
```

Parameters tab:

Table:

```text
Name | Value | Encode? | Include Equals?
```

Buttons:

```text
Add
Delete
Move Up
Move Down
```

Body Data:

textarea/code editor.

Files Upload:

```text
File Path | Parameter Name | MIME Type
```

---

# 14. HTTP Header Manager

Hiển thị table:

```text
Name | Value
```

Có:

```text
Add
Delete
Load
Save
```

Load/Save chưa cần hoạt động thật ở MVP nếu chưa làm file integration.

Nếu chưa hoạt động phải disabled hoặc mock rõ ràng.

---

# 15. CSV Data Set Config

Fields:

```text
Filename
File Encoding
Variable Names
Ignore first line
Delimiter
Allow quoted data
Recycle on EOF
Stop thread on EOF
Sharing mode
```

Sharing mode:

```text
All threads
Current thread group
Current thread
Identifier
```

---

# 16. JSON Extractor

Fields:

```text
Names of created variables
JSON Path expressions
Match Numbers
Compute concatenation variable
Default Values
```

---

# 17. Response Assertion

Tạo UI có:

```text
Apply to:

○ Main sample and sub-samples
○ Main sample only
○ Sub-samples only
○ JMeter Variable
```

Field to test:

```text
Text Response
Response Code
Response Message
Response Headers
Request Headers
URL Sampled
Document
```

Pattern matching rules:

```text
Contains
Matches
Equals
Substring
```

Table:

```text
Patterns to Test
```

---

# 18. JSR223 Editor

Fields:

```text
Language
Parameters
Script File
Cache compiled script
```

Script editor:

- textarea lớn hoặc Monaco Editor
- mặc định language = groovy

Ví dụ placeholder:

```groovy
vars.put("token", "example")
```

---

# 19. View Results Tree

Tạo mock listener.

Layout:

```text
Result list bên trái
Request/Response detail bên phải
```

Sample mock:

```text
Login API        200
Profile API      200
Create Order     500
Logout           200
```

Khi click:

Tabs:

```text
Sampler Result
Request
Response Data
```

Không cần backend thật.

Dùng mock data.

---

# 20. Summary Report

Table:

```text
Label
# Samples
Average
Min
Max
Std. Dev.
Error %
Throughput
Received KB/sec
Sent KB/sec
Avg. Bytes
```

Có mock data.

---

# 21. Run behavior

V1 chưa cần JMeter backend thật.

Khi click Start:

```text
runState = RUNNING
```

Status bar bắt đầu mock:

```text
Threads 0 / 100
```

sau đó tăng dần.

Metrics mock:

```text
Samples
Errors
Throughput
Duration
```

Khi click Stop:

```text
runState = STOPPED
```

Không dùng animation vô hạn.

Phải cleanup timer.

---

# 22. Status bar

Bottom bar hiển thị:

```text
Status: READY / RUNNING / STOPPED

Threads: 100 / 100
Samples: 2,530
Errors: 5
Error %: 0.20%
Throughput: 125 req/s
Duration: 00:00:32
```

---

# 23. Open JMX

Tạo button:

```text
Open JMX
```

V1 cần sử dụng browser File API.

Cho phép chọn file:

```text
.jmx
```

Không cần parse full JMeter JMX ngay nếu scope quá lớn.

Nhưng phải tạo abstraction:

```ts
interface JmxParser {
  parse(xml: string): TestPlanNode;
}
```

Và:

```ts
interface JmxWriter {
  write(testPlan: TestPlanNode): string;
}
```

Tạo MVP parser hỗ trợ tối thiểu:

```text
TestPlan
ThreadGroup
HTTPSamplerProxy
HeaderManager
CSVDataSet
JSONPostProcessor
ResponseAssertion
TransactionController
JSR223
```

Nếu gặp component chưa support:

KHÔNG được xóa.

Phải tạo node:

```text
UnsupportedComponent
```

và giữ raw XML/properties để sau này export lại.

---

# 24. JMX round-trip requirement

Đây là requirement quan trọng.

Flow:

```text
original.jmx
   ↓
Open
   ↓
Parse
   ↓
Internal JSON
   ↓
Edit
   ↓
Export
   ↓
new.jmx
```

Component chưa support không được mất dữ liệu nếu người dùng không chỉnh chúng.

Nếu chưa thể đảm bảo full round-trip trong MVP, phải thiết kế architecture để hỗ trợ điều đó sau này.

Không hard-code theo cách khiến raw XML bị mất.

---

# 25. Export JMX

Button:

```text
Export JMX
```

Generate XML và cho browser download file:

```text
test-plan.jmx
```

Dùng Blob + URL.createObjectURL.

Không cần backend.

---

# 26. Undo / Redo

Nếu scope cho phép, implement:

```text
Ctrl + Z
Ctrl + Y
```

Nếu chưa đủ thời gian thì chuẩn bị state architecture để support sau.

Ưu tiên:

1. Tree
2. Editor
3. Add/Delete/Copy/Paste
4. JMX import/export
5. Run mock
6. Undo/Redo

---

# 27. Keyboard shortcuts

Support tối thiểu:

```text
Ctrl + S = Save
Delete = Delete selected node
F2 = Rename
Ctrl + C = Copy
Ctrl + V = Paste
Ctrl + D = Duplicate
```

Chỉ trigger khi focus không nằm trong input hoặc textarea.

---

# 28. Validation

Các editor cần validate.

Ví dụ:

```text
Threads >= 1
Ramp-up >= 0
Port: empty hoặc 1-65535
```

Không cho UI xuất hiện:

```text
NaN
undefined
Infinity
```

Error message phải rõ.

---

# 29. Responsive

Ứng dụng ưu tiên desktop/laptop.

Minimum comfortable width:

```text
1024px
```

Nhưng nếu browser nhỏ hơn:

- Tree có thể collapse
- Editor vẫn usable
- Không được vỡ layout hoàn toàn

Không cần ưu tiên mobile.

---

# 30. Code architecture

Tổ chức project tương tự:

```text
src/
│
├── app/
│
├── components/
│   ├── layout/
│   ├── toolbar/
│   ├── tree/
│   ├── context-menu/
│   └── common/
│
├── editors/
│   ├── TestPlanEditor.tsx
│   ├── ThreadGroupEditor.tsx
│   ├── HTTPRequestEditor.tsx
│   ├── HeaderManagerEditor.tsx
│   ├── CSVDataSetEditor.tsx
│   ├── JSONExtractorEditor.tsx
│   ├── ResponseAssertionEditor.tsx
│   └── JSR223Editor.tsx
│
├── store/
│   └── testPlanStore.ts
│
├── jmx/
│   ├── parser.ts
│   ├── writer.ts
│   └── mappings.ts
│
├── models/
│   ├── TestPlanNode.ts
│   └── JMeterComponentType.ts
│
├── mock/
│   ├── testPlan.ts
│   └── results.ts
│
└── utils/
```

---

# 31. Không làm những thứ sau

Không:

- tạo landing page marketing
- login page
- authentication
- user management
- billing
- SaaS dashboard
- fancy charts
- Docker
- database
- Spring Boot
- distributed load testing
- WebSocket
- CI/CD

trong MVP này.

Chỉ tập trung vào:

> JMeter Web Editor UI.

---

# 32. Sample test plan mặc định

Khi app chạy lần đầu, load sample:

```text
Test Plan
│
└── Thread Group - Login Load Test
    │
    ├── HTTP Request Defaults
    │
    ├── CSV Data Set Config
    │
    ├── HTTP Header Manager
    │
    └── Transaction Controller - Login
        │
        ├── HTTP Request - Login API
        ├── JSON Extractor - Extract Token
        └── Response Assertion - Status 200
```

HTTP Request:

```text
POST
https://api.example.com/login
```

Body:

```json
{
  "username": "${username}",
  "password": "${password}"
}
```

JSON Extractor:

```text
token = $.access_token
```

---

# 33. Acceptance criteria

MVP được xem là hoàn thành khi:

1. App chạy thành công bằng `npm run dev`.

2. UI có cấu trúc giống JMeter:

```text
Toolbar
Tree
Editor
Status bar
```

3. Tree có thể:

```text
select
expand
collapse
add
delete
copy
paste
duplicate
enable
disable
rename
```

4. Right click tree có Add context menu.

5. Có tối thiểu các editor:

```text
Test Plan
Thread Group
HTTP Request
HTTP Header Manager
CSV Data Set Config
Transaction Controller
JSON Extractor
Response Assertion
JSR223
View Results Tree
Summary Report
```

6. Người dùng edit field và state được update.

7. Có dirty state.

8. Có Open JMX.

9. Có Export JMX.

10. Component chưa support không làm app crash.

11. Có mock Run/Stop.

12. Status bar cập nhật khi mock run.

13. Không có nút giả mà click không phản hồi, trừ button đã disabled rõ ràng.

14. TypeScript không có lỗi.

15. Không sử dụng `any` tràn lan.

16. UI nhìn giống developer desktop tool, không giống SaaS dashboard.

---

# 34. Cách triển khai

Không chỉ tạo skeleton.

Hãy thực sự implement MVP chạy được.

Thực hiện theo thứ tự:

```text
1. Create Vite React TypeScript app
2. Define models
3. Create Zustand store
4. Create sample Test Plan
5. Implement application layout
6. Implement tree
7. Implement node selection
8. Implement component editors
9. Implement context menu
10. Implement add/delete/copy/paste
11. Implement enable/disable
12. Implement JMX parser abstraction
13. Implement basic JMX import
14. Implement JMX writer
15. Implement export
16. Implement mock execution
17. Implement result listeners
18. Polish UI
19. Run lint/typecheck
20. Fix all errors
```

Không dừng ở việc giải thích architecture.

Hãy tạo code hoàn chỉnh.

---

# 35. Quan trọng về UX

Nếu phải lựa chọn giữa:

```text
UI đẹp hơn
```

và:

```text
UI quen thuộc với người dùng JMeter
```

hãy chọn:

```text
UI quen thuộc với JMeter
```

trong phiên bản đầu tiên.

Mục tiêu cuối cùng của MVP:

> Một QA đang sử dụng Apache JMeter Desktop có thể mở JMeter Web UI này, nhìn Test Plan Tree và HTTP Request editor, và ngay lập tức hiểu cách sử dụng mà gần như không cần documentation.