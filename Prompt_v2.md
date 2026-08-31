Bạn là một Senior Frontend Engineer + Software Architect đang trực tiếp triển khai một project production-grade.

Nhiệm vụ của bạn là **tự xây dựng hoàn chỉnh MVP "JMeter Web UI" trong repository hiện tại**, không chỉ mô tả kiến trúc, không chỉ tạo mockup, không chỉ viết pseudo-code.

Bạn phải chủ động:

- kiểm tra project hiện tại,
- tạo hoặc chỉnh sửa source code,
- cài dependency cần thiết,
- chạy application,
- chạy typecheck/lint/build,
- sửa lỗi,
- và chỉ kết thúc khi project có thể build thành công.

---

# 1. PRODUCT GOAL

Xây một ứng dụng web chạy trên browser có giao diện và workflow **gần giống Apache JMeter Desktop nhất có thể**.

Mục tiêu giai đoạn đầu:

> Một QA Engineer đang dùng Apache JMeter Desktop mở ứng dụng này và có thể sử dụng gần như ngay lập tức mà không phải học một UI hoàn toàn mới.

Đây là một **web-based JMeter editor**, không phải SaaS dashboard.

Mental model phải giữ giống JMeter:

```text
Test Plan Tree bên trái
        +
Component Editor bên phải
        +
Toolbar/Menu phía trên
        +
Status phía dưới
```

User click một node trong Test Plan Tree thì component tương ứng được edit ở panel bên phải.

---

# 2. MVP SCOPE

MVP tập trung vào:

```text
JMeter Web Editor
```

Chưa cần backend JMeter thật.

Phải support:

```text
Open .jmx
Edit Test Plan
Add component
Delete component
Copy/Paste
Duplicate
Enable/Disable
Rename
Reorder
Export .jmx
Mock Run
Mock Results
```

---

# 3. TECH STACK

Sử dụng:

```text
React
TypeScript
Vite
HTML5
CSS
Zustand
```

Có thể sử dụng thư viện UI nhỏ nếu thực sự cần thiết.

Không sử dụng Next.js.

Không sử dụng backend ở phase này.

Không thêm database.

Không thêm authentication.

Không thêm Docker trừ khi repository hiện tại đã bắt buộc sử dụng.

Application phải chạy được bằng:

```bash
npm install
npm run dev
```

và production build phải chạy:

```bash
npm run build
```

---

# 4. WORKING MODE

Không dừng lại sau khi viết code.

Bạn phải tự thực hiện full implementation workflow:

```text
Inspect repository
↓
Plan structure
↓
Implement
↓
Run
↓
Typecheck
↓
Build
↓
Find errors
↓
Fix
↓
Run again
↓
Repeat until passing
```

Không được kết thúc với câu:

```text
"Bạn có thể chạy npm install..."
```

Bạn phải tự chạy các command có thể chạy trong môi trường hiện tại.

Nếu dependency thiếu, hãy cài.

Nếu TypeScript lỗi, hãy fix.

Nếu build lỗi, hãy fix.

Nếu lint lỗi nghiêm trọng, hãy fix.

Không bỏ lại TODO cho functionality nằm trong MVP nếu có thể implement được ngay.

---

# 5. FIRST STEP

Trước khi code:

1. Inspect toàn bộ repository hiện tại.

2. Xác định:

```text
package.json
src/
existing framework
existing dependencies
build scripts
tsconfig
vite config
```

3. Nếu repository đã là React/Vite project:

Không tạo project mới đè lên source hiện có.

Adapt architecture vào project hiện tại.

4. Nếu repository trống:

Tạo React + TypeScript + Vite application.

---

# 6. UI PRINCIPLE

UI phải ưu tiên:

```text
familiarity > visual novelty
```

Không redesign JMeter thành SaaS hiện đại quá mức.

Không dùng:

```text
large marketing cards
huge whitespace
gradients
glassmorphism
dashboard widgets everywhere
oversized typography
mobile-first app design
```

Ưu tiên:

```text
dense
professional
desktop-tool
developer-tool
IDE-like
```

Visual reference concept:

```text
JMeter
VS Code
IntelliJ
Postman desktop
```

Nhưng workflow phải gần JMeter nhất.

---

# 7. MAIN SCREEN

Main application là một màn hình editor duy nhất.

Không tách thành nhiều page.

Không dùng route kiểu:

```text
/test-plan/:id
/thread-group/:id
/http-request/:id
```

Main layout:

```text
┌────────────────────────────────────────────────────────────────────┐
│ Menu Bar                                                           │
├────────────────────────────────────────────────────────────────────┤
│ Toolbar                                                            │
├──────────────────────────┬─────────────────────────────────────────┤
│                          │                                         │
│ TEST PLAN TREE           │ COMPONENT EDITOR                        │
│                          │                                         │
│                          │                                         │
│                          │                                         │
│                          │                                         │
├──────────────────────────┴─────────────────────────────────────────┤
│ STATUS BAR                                                         │
└────────────────────────────────────────────────────────────────────┘
```

Desktop-first.

Target minimum comfortable width:

```text
1024px
```

---

# 8. MENU BAR

Create:

```text
File
Edit
Search
Run
Options
Tools
Help
```

Minimum interactions:

File:

```text
New
Open JMX
Save
Export JMX
```

Edit:

```text
Undo
Redo
Cut
Copy
Paste
Duplicate
Delete
```

Run:

```text
Start
Stop
Shutdown
Clear Results
```

Các action chưa implement phải:

```text
disabled
```

Không để menu giả click mà không có phản hồi.

---

# 9. TOOLBAR

Toolbar cần có các action:

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

Mỗi button:

- có tooltip,
- có icon,
- disabled state hợp lý.

Example:

```text
Stop disabled when READY.
Start disabled when RUNNING.
Save disabled when dirty = false.
Paste disabled when internal clipboard empty.
```

---

# 10. APPLICATION STATE

Sử dụng Zustand.

Define state rõ ràng.

Ví dụ:

```ts
interface JMeterStore {
  testPlan: TestPlanNode | null;

  selectedNodeId: string | null;

  expandedNodeIds: Set<string>;

  dirty: boolean;

  clipboard: TestPlanNode | null;

  runState: 'READY' | 'RUNNING' | 'STOPPED';

  metrics: RunMetrics;

  selectNode(id: string): void;

  updateNode(
    id: string,
    updates: Partial<TestPlanNode>
  ): void;

  updateNodeProperties(
    id: string,
    properties: Record<string, unknown>
  ): void;

  addNode(
    parentId: string,
    node: TestPlanNode
  ): void;

  deleteNode(id: string): void;

  copyNode(id: string): void;

  pasteNode(parentId: string): void;

  duplicateNode(id: string): void;

  toggleEnabled(id: string): void;

  renameNode(
    id: string,
    name: string
  ): void;

  moveNodeUp(id: string): void;

  moveNodeDown(id: string): void;
}
```

Không mutate state trực tiếp.

---

# 11. TEST PLAN INTERNAL MODEL

Không sử dụng JMX XML trực tiếp làm UI state.

Create internal representation.

```ts
export interface TestPlanNode {
  id: string;

  type: JMeterComponentType;

  name: string;

  enabled: boolean;

  properties: Record<string, unknown>;

  children: TestPlanNode[];

  metadata?: {
    rawXml?: string;
    originalClass?: string;
  };
}
```

Define enum/union:

```ts
export type JMeterComponentType =
  | 'TestPlan'
  | 'UserDefinedVariables'
  | 'ThreadGroup'
  | 'HTTPRequestDefaults'
  | 'HTTPRequest'
  | 'HTTPHeaderManager'
  | 'HTTPCookieManager'
  | 'CSVDataSet'
  | 'TransactionController'
  | 'IfController'
  | 'LoopController'
  | 'ConstantTimer'
  | 'JSONExtractor'
  | 'RegexExtractor'
  | 'ResponseAssertion'
  | 'JSR223Sampler'
  | 'JSR223PreProcessor'
  | 'JSR223PostProcessor'
  | 'JSR223Assertion'
  | 'ViewResultsTree'
  | 'SummaryReport'
  | 'AggregateReport'
  | 'UnsupportedComponent';
```

---

# 12. TEST PLAN TREE

Đây là feature quan trọng nhất.

Phải implement tree thật.

Support:

```text
expand
collapse
select
rename
add
delete
copy
paste
duplicate
enable
disable
move up
move down
drag and drop nếu hợp lý
```

Node selected:

- highlight rõ.

Node disabled:

- opacity thấp hơn,
- text subdued,
- nhưng vẫn selectable.

Node type có icon riêng.

Sample:

```text
Test Plan
│
├── User Defined Variables
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

---

# 13. RIGHT CLICK CONTEXT MENU

Right-click tree node phải mở context menu.

Actions:

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

Add có nested menu:

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

---

# 14. COMPONENT PARENT RULES

Không cho add component bừa vào mọi node.

Implement centralized validation.

Ví dụ:

```ts
canAddChild(
  parentType: JMeterComponentType,
  childType: JMeterComponentType
): boolean
```

Example rules:

```text
TestPlan
→ ThreadGroup
→ UserDefinedVariables

ThreadGroup
→ Sampler
→ Controller
→ Config
→ Timer
→ Processor
→ Assertion
→ Listener

TransactionController
→ Sampler
→ Controller
→ Config
→ Processor
→ Assertion

HTTPRequest
→ PostProcessor
→ Assertion
→ Timer
```

Không cần cover 100% JMeter rule ngay, nhưng architecture phải centralized.

Không hard-code rule trong mỗi UI menu.

---

# 15. COMPONENT EDITOR SYSTEM

Panel bên phải render editor dựa trên:

```ts
selectedNode.type
```

Create component:

```text
ComponentEditorRouter
```

Example:

```tsx
switch (node.type) {
  case 'ThreadGroup':
    return <ThreadGroupEditor node={node} />;

  case 'HTTPRequest':
    return <HTTPRequestEditor node={node} />;

  ...
}
```

Mỗi editor update state vào Zustand.

---

# 16. COMMON EDITOR HEADER

Tất cả editor có:

```text
Name
Comments
Enabled
```

Example layout:

```text
Name:
[ Login API                              ]

Comments:
[                                        ]
[                                        ]

Enabled [✓]
```

Có component reusable:

```text
ComponentHeader
```

---

# 17. TEST PLAN EDITOR

Fields:

```text
Name
Comments

User Defined Variables

Functional Test Mode
Run tearDown Thread Groups after shutdown
Serialize Thread Groups
```

Không cần implement runtime behavior.

Chỉ lưu state.

---

# 18. THREAD GROUP EDITOR

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
```

Checkbox:

```text
Same user on each iteration
Delay Thread creation until needed
Scheduler
```

Nếu Scheduler enabled:

```text
Duration
Startup Delay
```

Validation:

```text
threads >= 1
rampUp >= 0
loops >= 1
duration >= 0
startupDelay >= 0
```

---

# 19. HTTP REQUEST EDITOR

Đây là editor quan trọng nhất.

Phải triển khai cẩn thận.

Fields:

```text
Protocol
Server Name or IP
Port Number
HTTP Request Method
Path
Content Encoding
```

Methods:

```text
GET
POST
PUT
PATCH
DELETE
HEAD
OPTIONS
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

---

# 20. HTTP PARAMETERS TABLE

Columns:

```text
Name
Value
Encode?
Include Equals?
```

Actions:

```text
Add
Delete
Move Up
Move Down
```

Rows editable inline.

---

# 21. BODY DATA

Large textarea/editor.

Support text such as:

```json
{
  "username": "${username}",
  "password": "${password}"
}
```

Use monospace.

Do not automatically format and corrupt user data.

---

# 22. FILES UPLOAD TAB

Columns:

```text
File Path
Parameter Name
MIME Type
```

Support:

```text
Add
Delete
Move Up
Move Down
```

Browser actual file upload chưa cần.

Chỉ edit JMeter config data.

---

# 23. HTTP REQUEST DEFAULTS

Fields gần giống HTTP Request:

```text
Protocol
Server Name or IP
Port
Path
Content Encoding
```

Không cần request body.

---

# 24. HTTP HEADER MANAGER

Editable table:

```text
Name | Value
```

Buttons:

```text
Add
Delete
Move Up
Move Down
```

Sample:

```text
Content-Type | application/json
Accept       | application/json
```

---

# 25. HTTP COOKIE MANAGER

Fields:

```text
Clear cookies each iteration
Controlled by Thread Group
```

Cookie table:

```text
Name
Value
Domain
Path
Secure
Expires
```

---

# 26. CSV DATA SET CONFIG

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

# 27. TRANSACTION CONTROLLER

Fields:

```text
Generate parent sample
Include duration of timer and pre-post processors
```

---

# 28. IF CONTROLLER

Fields:

```text
Condition

Interpret Condition as Variable Expression
Evaluate for all children
```

---

# 29. LOOP CONTROLLER

Fields:

```text
Loop Count

Forever
```

---

# 30. CONSTANT TIMER

Field:

```text
Thread Delay (milliseconds)
```

---

# 31. JSON EXTRACTOR

Fields:

```text
Names of created variables
JSON Path expressions
Match Numbers
Compute concatenation variable
Default Values
```

Support multiple values separated consistently.

---

# 32. REGULAR EXPRESSION EXTRACTOR

Fields:

```text
Apply to
Field to check
Reference Name
Regular Expression
Template
Match Number
Default Value
Use empty default value
```

---

# 33. RESPONSE ASSERTION

Fields:

Apply to:

```text
Main sample and sub-samples
Main sample only
Sub-samples only
JMeter Variable
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

Pattern matching:

```text
Contains
Matches
Equals
Substring
```

Patterns table:

```text
Patterns to Test
```

Actions:

```text
Add
Delete
```

Additional:

```text
Not
Or
Ignore Status
```

---

# 34. JSR223 EDITOR

Reuse một editor cho:

```text
JSR223 Sampler
JSR223 PreProcessor
JSR223 PostProcessor
JSR223 Assertion
```

Fields:

```text
Language
Parameters
Script File
Cache compiled script if available
```

Language default:

```text
groovy
```

Large script editor.

Nếu Monaco Editor thêm dependency quá nặng hoặc làm MVP phức tạp thì dùng textarea monospace.

Ưu tiên ổn định hơn fancy editor.

---

# 35. VIEW RESULTS TREE

Mock listener.

Layout:

```text
┌───────────────────────┬────────────────────────────┐
│ Samples               │ Selected Sample Detail     │
│                       │                            │
│ Login API      200    │ Sampler Result             │
│ Profile API    200    │ Request                    │
│ Create Order   500    │ Response Data              │
│ Logout         200    │                            │
└───────────────────────┴────────────────────────────┘
```

Sample status visually distinguish:

```text
success
failure
```

Do not rely only on color.

Show status code or icon.

Tabs:

```text
Sampler Result
Request
Response Data
```

Mock realistic HTTP data.

---

# 36. SUMMARY REPORT

Table columns:

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

Use realistic mock data.

---

# 37. AGGREGATE REPORT

Columns:

```text
Label
# Samples
Average
Median
90% Line
95% Line
99% Line
Min
Max
Error %
Throughput
Received KB/sec
Sent KB/sec
```

---

# 38. SAMPLE TEST PLAN

App lần đầu load sample:

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

Thread Group:

```text
Threads: 100
Ramp-up: 30
Loop Count: 5
```

HTTP defaults:

```text
Protocol: https
Server: api.example.com
```

HTTP Request:

```text
POST /login
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
Variable:
token

JSON Path:
$.access_token

Match:
1
```

Response Assertion:

```text
Response Code
Equals
200
```

---

# 39. DIRTY STATE

Any edit to Test Plan sets:

```text
dirty = true
```

Show indicator.

Example:

```text
API Performance Test *
```

Save/export behavior can clear dirty state appropriately.

---

# 40. NEW TEST PLAN

New action creates:

```text
Test Plan
└── Thread Group
```

Optionally allow empty Test Plan.

Prompt confirmation if current project dirty before resetting.

Use custom dialog or browser confirm for MVP.

---

# 41. OPEN JMX

Use browser:

```text
<input type="file" accept=".jmx,.xml">
```

Read text using FileReader/File.text().

Create abstraction:

```ts
export interface JmxParser {
  parse(xml: string): TestPlanNode;
}
```

Parser should use:

```text
DOMParser
```

Do not parse XML with regex.

---

# 42. BASIC JMX PARSER

Support mapping tối thiểu:

```text
TestPlan
ThreadGroup
HTTPSamplerProxy
ConfigTestElement
HeaderManager
CookieManager
CSVDataSet
TransactionController
IfController
LoopController
ConstantTimer
JSONPostProcessor
RegexExtractor
ResponseAssertion
JSR223Sampler
JSR223PreProcessor
JSR223PostProcessor
JSR223Assertion
ResultCollector
```

Bạn không cần cover tất cả JMeter property ngay.

Nhưng parse:

```text
testname
enabled
common relevant properties
tree hierarchy
```

---

# 43. IMPORTANT: JMETER XML TREE STRUCTURE

JMeter `.jmx` thường sử dụng pattern:

```xml
<TestPlan />
<hashTree>
    <ThreadGroup />
    <hashTree>
        ...
    </hashTree>
</hashTree>
```

Parser phải hiểu quan hệ:

```text
component element
followed by hashTree
```

Không được coi `hashTree` là JMeter component.

---

# 44. UNSUPPORTED COMPONENT

Nếu parser gặp component chưa support:

KHÔNG:

```text
skip
delete
throw fatal error
```

Phải tạo:

```ts
{
  type: 'UnsupportedComponent',
  name: extractedName,
  metadata: {
    rawXml: serializedElement,
    originalClass: tagName
  }
}
```

UI render:

```text
Unsupported JMeter Component

Class:
kg.apc...

This component is preserved but cannot yet be edited.
```

Không làm app crash.

---

# 45. JMX WRITER

Create abstraction:

```ts
export interface JmxWriter {
  write(testPlan: TestPlanNode): string;
}
```

Generate valid XML.

Use XML APIs or carefully serialized XML builder.

Không build XML bằng nối string thiếu escaping.

---

# 46. ROUND-TRIP SAFETY

Mục tiêu architecture:

```text
JMX
↓
Internal Model
↓
Edit
↓
JMX
```

Unsupported nodes phải được preserve tốt nhất có thể.

Nếu raw child tree chưa thể round-trip hoàn hảo, document limitation trong README.

Nhưng không được âm thầm xóa component.

---

# 47. EXPORT JMX

Export button:

```text
Export JMX
```

Generate Blob:

```ts
new Blob([xml], {
  type: 'application/xml'
});
```

Download:

```text
test-plan.jmx
```

Use:

```text
URL.createObjectURL
```

Revoke URL after download.

---

# 48. MOCK RUN

Không execute JMeter thật.

Start action:

```text
READY → RUNNING
```

Mock:

```text
activeThreads
totalThreads
samples
errors
throughput
duration
```

Update periodically.

Example:

```text
Threads: 75 / 100
Samples: 2340
Errors: 8
Throughput: 124 req/s
```

Stop:

```text
RUNNING → STOPPED
```

Shutdown có thể behave giống graceful stop mock.

Clear reset metrics.

---

# 49. TIMER CLEANUP

Mock execution timer phải cleanup:

- on Stop,
- on component unmount,
- on new run,
- on app cleanup.

Không để multiple interval chạy song song.

---

# 50. STATUS BAR

Bottom:

```text
READY

Threads: 0 / 100
Samples: 0
Errors: 0
Error: 0.00%
Throughput: 0 req/s
Duration: 00:00:00
```

RUNNING update live.

---

# 51. INTERNAL CLIPBOARD

Không sử dụng browser system clipboard.

Implement internal clipboard:

```ts
clipboardNode
```

Copy phải deep clone.

Paste phải generate new ID cho:

```text
node
all descendants
```

Không duplicate IDs.

---

# 52. ID GENERATION

Use:

```text
crypto.randomUUID()
```

nếu available.

Otherwise safe fallback.

Không use array index làm node id.

---

# 53. DUPLICATE

Duplicate selected node:

```text
same parent
insert after selected node
deep clone
new ids
name optionally append "Copy"
```

---

# 54. DELETE

Delete node.

Không cho delete root TestPlan.

Nếu node has children:

delete entire subtree.

Selection sau delete:

```text
parent node
```

---

# 55. ENABLE / DISABLE

Toggle:

```text
enabled
```

Disabled node:

```text
grey
lower opacity
```

Children vẫn tồn tại.

Không delete.

---

# 56. RENAME

Support:

```text
F2
```

và context menu Rename.

Inline rename hoặc modal nhỏ.

Không cho empty name.

Trim whitespace.

---

# 57. KEYBOARD SHORTCUTS

Support:

```text
Ctrl/Cmd + S → Save
Ctrl/Cmd + C → Copy Node
Ctrl/Cmd + V → Paste Node
Ctrl/Cmd + D → Duplicate Node
Delete → Delete Node
F2 → Rename
```

Optional:

```text
Ctrl/Cmd + Z
Ctrl/Cmd + Y
```

Keyboard shortcuts không được trigger nếu focus nằm trong:

```text
input
textarea
select
contenteditable
```

---

# 58. SAVE

Vì chưa có backend:

Save có thể lưu current model in-memory state và clear dirty.

Không dùng localStorage nếu không cần.

Export JMX là persistence thật cho MVP.

---

# 59. VALIDATION

All editors phải validate.

Examples:

```text
Number of Threads >= 1
Ramp-up >= 0
Loop Count >= 1

Port:
empty OR integer 1-65535

Timer:
>= 0
```

Không để UI hiển thị:

```text
NaN
Infinity
undefined
null
```

Validation message đặt gần field.

Không dùng alert cho field validation.

---

# 60. ACCESSIBILITY

Basic accessibility required:

```text
buttons are real <button>
inputs have labels
context menu keyboard focus where practical
tooltips available
focus visible
```

Không dùng clickable div nếu button phù hợp hơn.

---

# 61. RESPONSIVE BEHAVIOR

Desktop-first.

At smaller width:

```text
tree panel can collapse
```

Không cần mobile-first design.

Không để page horizontal overflow nếu tránh được.

Tree/editor container phải use:

```css
min-width: 0;
```

để flex/grid shrink đúng.

---

# 62. PROJECT STRUCTURE

Recommended:

```text
src/
│
├── app/
│   ├── App.tsx
│   └── App.css
│
├── components/
│   ├── menu/
│   ├── toolbar/
│   ├── tree/
│   ├── context-menu/
│   ├── layout/
│   ├── tables/
│   └── common/
│
├── editors/
│   ├── ComponentEditorRouter.tsx
│   ├── TestPlanEditor.tsx
│   ├── ThreadGroupEditor.tsx
│   ├── HTTPRequestEditor.tsx
│   ├── HTTPRequestDefaultsEditor.tsx
│   ├── HTTPHeaderManagerEditor.tsx
│   ├── HTTPCookieManagerEditor.tsx
│   ├── CSVDataSetEditor.tsx
│   ├── TransactionControllerEditor.tsx
│   ├── IfControllerEditor.tsx
│   ├── LoopControllerEditor.tsx
│   ├── ConstantTimerEditor.tsx
│   ├── JSONExtractorEditor.tsx
│   ├── RegexExtractorEditor.tsx
│   ├── ResponseAssertionEditor.tsx
│   ├── JSR223Editor.tsx
│   ├── ViewResultsTreeEditor.tsx
│   ├── SummaryReportEditor.tsx
│   └── AggregateReportEditor.tsx
│
├── store/
│   └── jmeterStore.ts
│
├── models/
│   ├── TestPlanNode.ts
│   ├── JMeterComponentType.ts
│   └── RunMetrics.ts
│
├── jmx/
│   ├── parser.ts
│   ├── writer.ts
│   ├── mappings.ts
│   └── xmlUtils.ts
│
├── rules/
│   └── componentRules.ts
│
├── mock/
│   ├── sampleTestPlan.ts
│   └── sampleResults.ts
│
└── utils/
    ├── cloneNode.ts
    ├── treeUtils.ts
    └── format.ts
```

Bạn có thể điều chỉnh nếu project hiện tại có convention khác.

Không restructure vô lý chỉ để giống structure này.

---

# 63. REUSABLE COMPONENTS

Create reusable:

```text
FormField
CheckboxField
RadioGroup
NumberField
EditableTable
TabbedPanel
Section
ComponentHeader
ToolbarButton
TreeNode
ContextMenu
```

Không duplicate form patterns quá nhiều.

---

# 64. CSS REQUIREMENTS

Use clean CSS.

Prefer CSS variables:

```css
--bg-primary
--bg-secondary
--border
--text-primary
--text-secondary
--selection
--disabled
```

Có thể support dark theme architecture sau này nhưng chưa bắt buộc.

Default theme gần JMeter/light desktop tool.

No gradients.

No excessive border radius.

Cards/panels radius nhỏ hoặc 0-4px.

Density cao.

---

# 65. README

Update README.

Include:

```text
Project purpose

How to run

npm install
npm run dev

How to build

npm run build

Current supported JMeter components

Current JMX import limitations

Current JMX export limitations

Future backend integration direction
```

Không claim feature hoàn thiện nếu chưa hoàn thiện.

---

# 66. TESTING

Ít nhất chạy:

```bash
npm run build
```

Nếu có script:

```bash
npm run lint
```

thì chạy lint.

Nếu project có:

```bash
npm run typecheck
```

thì chạy.

Nếu chưa có typecheck script, có thể chạy:

```bash
npx tsc --noEmit
```

nếu config phù hợp.

---

# 67. DO NOT STOP AT FIRST ERROR

Nếu build lỗi:

```text
fix
rerun
```

Nếu TypeScript lỗi:

```text
fix
rerun
```

Nếu dependency mismatch:

```text
fix
rerun
```

Repeat until successful hoặc gặp blocker thực sự không thể giải quyết trong môi trường.

Nếu blocker xảy ra, ghi rõ:

```text
exact command
exact error
what has already been implemented
```

Không nói chung chung.

---

# 68. FINAL QUALITY CHECK

Before finishing, manually inspect:

```text
Does Test Plan Tree work?
Can node be selected?
Does correct editor render?
Can fields be edited?
Does dirty state update?
Can component be added?
Can component be copied?
Can component be pasted?
Can component be deleted?
Can component be disabled?
Can JMX be opened?
Can JMX be exported?
Does unsupported component crash?
Does mock Run work?
Does Stop work?
Does status update?
Does build pass?
```

---

# 69. MVP ACCEPTANCE CRITERIA

Không coi task hoàn thành trừ khi:

### Functional

```text
✓ Test Plan Tree renders
✓ Node select works
✓ Expand/collapse works
✓ Context menu works
✓ Add works
✓ Delete works
✓ Copy works
✓ Paste works
✓ Duplicate works
✓ Rename works
✓ Enable/Disable works
✓ Editor updates store
✓ Open JMX works
✓ Export JMX works
✓ Unsupported component is preserved
✓ Mock Start works
✓ Mock Stop works
✓ View Results Tree mock works
✓ Summary Report mock works
```

### Technical

```text
✓ TypeScript compiles
✓ Production build passes
✓ No major console errors
✓ No duplicate node IDs
✓ No uncontrolled timer leaks
✓ No obvious broken buttons
```

### UX

```text
✓ Main UI resembles JMeter mental model
✓ Tree stays left
✓ Editor stays right
✓ Dense desktop-tool UI
✓ QA familiar with JMeter can understand it immediately
```

---

# 70. IMPORTANT PRODUCT DECISION

Nếu bạn phải lựa chọn giữa:

```text
more modern / prettier UX
```

và:

```text
closer to JMeter Desktop UX
```

trong MVP này luôn chọn:

```text
closer to JMeter Desktop UX
```

Không redesign mạnh ở phase đầu.

---

# 71. FUTURE ARCHITECTURE — PREPARE BUT DO NOT IMPLEMENT

Sau này system sẽ có backend:

```text
React Web UI
     ↓
REST API
     ↓
Java Spring Boot
     ↓
JMX Parser / Generator
     ↓
JMeter CLI Runner
     ↓
JTL Results
```

Frontend hiện tại phải tránh thiết kế khiến integration này khó.

Do đó:

- isolate JMX parsing,
- isolate file operations,
- isolate execution service,
- isolate result service.

Create interfaces where useful:

```ts
interface ExecutionService {
  start(testPlan: TestPlanNode): Promise<void>;
  stop(): Promise<void>;
}

interface ProjectService {
  openJmx(file: File): Promise<TestPlanNode>;
  exportJmx(testPlan: TestPlanNode): Promise<string>;
}
```

MVP implementation có thể local/mock.

---

# 72. IMPORTANT — DO NOT OVERENGINEER

Không cần:

```text
microfrontend
DDD
CQRS
Redux
GraphQL
WebSocket
Docker
backend
database
authentication
permissions
cloud execution
distributed testing
```

ở phase này.

Keep code simple nhưng extensible.

---

# 73. IMPLEMENTATION ORDER

Thực hiện lần lượt:

```text
1. Inspect repository

2. Verify / initialize React + Vite + TypeScript

3. Install Zustand

4. Define TestPlanNode model

5. Define JMeter component types

6. Create sample test plan

7. Build main JMeter-like layout

8. Build menu

9. Build toolbar

10. Build Test Plan Tree

11. Implement select / expand / collapse

12. Build Zustand actions

13. Build ComponentEditorRouter

14. Build Test Plan editor

15. Build Thread Group editor

16. Build HTTP Request editor

17. Build config editors

18. Build extractor/assertion editors

19. Build JSR223 editor

20. Build context menu

21. Implement Add

22. Implement Delete

23. Implement Copy/Paste

24. Implement Duplicate

25. Implement Enable/Disable

26. Implement Rename

27. Implement reorder

28. Implement basic JMX parser

29. Implement unsupported component handling

30. Implement JMX writer

31. Implement export

32. Implement mock execution

33. Implement status bar

34. Implement mock listeners

35. Implement validation

36. Implement keyboard shortcuts

37. Improve visual density

38. Update README

39. Run TypeScript checks

40. Run lint

41. Run production build

42. Fix every discovered error

43. Perform final functional inspection
```

Không bỏ qua bước cuối.

---

# 74. FINAL RESPONSE FORMAT

Khi hoàn thành implementation, response cuối phải ngắn và thực tế.

Report:

```text
Implemented:
- ...
- ...

Validation:
- npm run build: PASS
- npm run lint: PASS
- typecheck: PASS

Important files:
- ...

Known MVP limitations:
- ...

Run:
npm run dev
```

Không paste toàn bộ source code vào response nếu files đã được tạo trong repository.

Không chỉ giải thích những gì "nên làm".

Phải implement trước rồi mới report.

---

# 75. DEFINITION OF DONE

Definition of Done của task này là:

> Repository chứa một JMeter Web UI MVP thực sự chạy được trên browser, có Test Plan Tree và Component Editor tương tác giống mental model JMeter Desktop, có basic JMX import/export, mock execution/results, và production build pass.

Hãy bắt đầu bằng việc inspect repository hiện tại, sau đó triển khai trực tiếp.