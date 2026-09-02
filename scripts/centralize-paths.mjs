import fs from 'fs'

const pathMappings = [
  // Seeker
  { name: 'path_seeker_register', path: '/seeker/fe/register', desc: '1. Register Account JS' },
  { name: 'path_seeker_verify_email', path: '/seeker/seeker/verified-email?channel_code=vl24h', desc: '2.3 Admin - verified-email' },
  { name: 'path_seeker_verify_sms', path: '/seeker/seeker/verified-sms?channel_code=vl24h', desc: '2.4 Admin - verified-sms' },
  { name: 'path_seeker_approve', path: '/seeker/seeker-revision/approve?channel_code=vl24h', desc: '2.5 Admin - Approved account JS' },
  { name: 'path_seeker_login', path: '/seeker/fe/login', desc: '3. Login Account JS' },

  // CDN / Upload
  { name: 'path_cdn_upload', path: '/cdn/upload-file?channel_code=vl24h', desc: '4. Upload file CV & 2.3 Logo' },
  { name: 'path_cdn_secure_upload', path: '/api/v1/cdn/secure-upload-file?channel_code=vl24h', desc: '5.2.1 upload-file GPKD - new' },

  // Admin
  { name: 'path_admin_login', path: '/auth/admin/login', desc: 'Login Admin' },
  { name: 'path_admin_members', path: '/auth/admin/members', desc: '6.a Get code customer_care_member' },

  // Employer / RE
  { name: 'path_re_register', path: '/employer/fe/register-new', desc: '3.1 Register Account RE' },
  { name: 'path_re_login', path: '/employer/fe/login', desc: '2. Login RE' },
  { name: 'path_re_confirm_tax', path: '/employer/fe/freemium/register-employer-exist-auto', desc: '3.2 Confirm Tax Number - RE' },
  { name: 'path_re_verify_email', path: '/employer/employer/approved-email', desc: '5.1 Xác Thực email RE' },
  { name: 'path_re_edit', path: '/employer/employer/edit?channel_code=vl24h', desc: '5.2 Thêm 1 số thông tin RE để duyệt tài khoản' },
  { name: 'path_re_approve', path: '/employer/employer-revision/approve?channel_code=vl24h', desc: '5.3 Approved account RE' },
  { name: 'path_re_upload_license', path: '/employer/employer/upload-license?channel_code=vl24h', desc: '5.2.2 upload-license' },
  { name: 'path_re_change_rival_license', path: '/employer/employer/change-rival-type-license?channel_code=vl24h', desc: '5.2.3 change-rival-type-license' },
  { name: 'path_re_approved_license', path: '/employer/employer/approved-license?channel_code=vl24h', desc: '5.2.4 approved-license' },
  { name: 'path_re_list', path: '/employer/employer/list', desc: '2.1 employer/list - GET id RE PROD' },
  { name: 'path_re_detail', path: '/employer/employer/detail', desc: '2.2 employer/list - GET detail RE PROD' },
  { name: 'path_re_highlight', path: '/employer/fe/highlight-employer', desc: '2.1 & 2.2 GET thông tin company' },
  { name: 'path_re_whitelist_salary', path: '/employer/api/v1/employer/employer-whitelist-management/salary-negotiable/on?channel_code=vl24h', desc: 'Add in whitelist Employers - salary-negotiable' },

  // Jobs
  { name: 'path_job_list', path: '/employer/fe/job/get-job-list', desc: '1.1 & 1.2 List job base on province' },
  { name: 'path_job_create', path: '/employer/fe/me/job/create_new', desc: '3. Create new job' },
  { name: 'path_job_urgency_detect', path: '/employer/fe/api/v1/job-urgency-detection', desc: 'Check tin urgent - job-urgency-detection' },
  { name: 'path_job_urgent_confirm', path: '/employer/fe/api/v1/job-urgent-employer-confirm', desc: 'Confirm đồng ý là tin urgent' },
  { name: 'path_job_approve', path: '/employer/job-revision/approve?channel_code=vl24h', desc: '4. Duyệt tin đăng' },

  // Sales Order & Services
  { name: 'path_so_options_service', path: '/sales-order/fe/employer/option-service-active-v3', desc: '6. List options service' },
  { name: 'path_so_create', path: '/sales-order/sales-order/create?channel_code=vl24h', desc: '6.b Create sale order' },
  { name: 'path_so_complete', path: '/sales-order/sales-order/complete?channel_code=vl24h', desc: '7.1 Completed sale order' },
  { name: 'path_so_approve', path: '/sales-order/accountant-approve-sales-order/approve?channel_code=vl24h', desc: '7.2 Approved sale order' },
  { name: 'path_so_job_basic_create', path: '/sales-order/sales-order-job-basic/create?channel_code=vl24h', desc: '6.c vl24h.jobbox.basic create' },
  { name: 'path_so_job_box_create', path: '/sales-order/sales-order-job-box/create?channel_code=vl24h', desc: '6.1 & 6.3.3 & 6.4.3 Create job box' },
  { name: 'path_sku_detail_by_service', path: '/system/sku/detail-by-service', desc: '6.3.2, 6.4.2, 6.5.2 List hiệu ứng' },
  { name: 'path_so_price_list', path: '/sales-order/accountant-price-list/running', desc: '6.5.1 List gói dịch vụ' },
  { name: 'path_so_effect_create', path: '/sales-order/sales-order-effect/create?channel_code=vl24h', desc: '6.5.3 Create dịch vụ hiệu ứng' },
  { name: 'path_so_filter_resume_create', path: '/sales-order/sales-order-filter-resume-new/create?channel_code=vl24h', desc: '6.5.4 Mua điểm dịch vụ' },
  { name: 'path_so_banner_create', path: '/sales-order/sales-order-banner/create?channel_code=vl24h', desc: '6.5.5 & 6.5.6 Create banner' },
  { name: 'path_so_active_service', path: '/sales-order/fe/employer/active-service', desc: '7.1 - 7.8 Active services (Tin freemium, basic, siêu nhanh...)' },
]

function applyPathsToJmx(filePath) {
  if (!fs.existsSync(filePath)) return
  let content = fs.readFileSync(filePath, 'utf8')

  // Build the XML elements for the UDV
  const udvElementsXml = pathMappings.map(p => {
    return `\n          <elementProp name="${p.name}" elementType="Argument"><stringProp name="Argument.name">${p.name}</stringProp><stringProp name="Argument.value">${p.path.replace(/&/g, '&amp;')}</stringProp><stringProp name="Argument.desc">${p.desc.replace(/&/g, '&amp;')}</stringProp><stringProp name="Argument.metadata">=</stringProp></elementProp>`
  }).join('')

  // Clean up any path_ elements from all UDVs
  const allPathNames = [...pathMappings.map(p => p.name), 'path_job_prod_detail']
  for (const name of allPathNames) {
    const elemRegex = new RegExp(`\\s*<elementProp name="${name}"[\\s\\S]*?<\\/elementProp>`, 'g')
    content = content.replace(elemRegex, '')
  }

  // Remove existing "User Defined Variables - Paths" if any
  const existingNodeRegex = /\s*<Arguments[^>]*testname="User Defined Variables - Paths"[\s\S]*?<\/Arguments>\s*<hashTree(\/|>\s*<\/hashTree)>/g
  content = content.replace(existingNodeRegex, '')

  // Create dedicated node: "User Defined Variables - Paths"
  const dedicatedUdvXml = `\n      <Arguments guiclass="ArgumentsPanel" testclass="Arguments" testname="User Defined Variables - Paths" enabled="true"><stringProp name="comments">Quản lý tập trung toàn bộ URL Paths của các HTTP Requests</stringProp><collectionProp name="Arguments.arguments">${udvElementsXml}\n        </collectionProp></Arguments>\n      <hashTree/>`

  // Insert before first TestFragmentController or ThreadGroup
  const targetInsertRegex = /(\s*<TestFragmentController|\s*<ThreadGroup)/
  if (targetInsertRegex.test(content)) {
    content = content.replace(targetInsertRegex, `${dedicatedUdvXml}$1`)
  }

  // Replace ${path_job_prod_detail} back to original inline path
  content = content.replace(
    /<stringProp name="HTTPSampler\.path">\${path_job_prod_detail}<\/stringProp>/g,
    '<stringProp name="HTTPSampler.path">/duoc-pham/nu-nhan-vien-ban-thuoc-tay-binh-chanh-tphcm-go-cong-tien-giang-c42p122id${job_id_refer}.html</stringProp>'
  )

  // Replace all other mapped paths with ${path_...}
  for (const p of pathMappings) {
    const escapedPath = p.path.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')
    const pathRegex = new RegExp(`<stringProp\\s+name="HTTPSampler\\.path">${escapedPath}</stringProp>`, 'g')
    content = content.replace(pathRegex, `<stringProp name="HTTPSampler.path">\${${p.name}}</stringProp>`)
  }

  fs.writeFileSync(filePath, content, 'utf8')
  console.log(`Successfully updated: ${filePath}`)
}

const targetFiles = [
  'd:\\Project_Jmeter\\E2E_v2_QC (3).jmx',
  'd:\\Project_Jmeter\\E2E_v2_QC (2).jmx',
  'd:\\Project_Jmeter\\E2E_v2_QC (1).jmx',
  'd:\\Project_Jmeter\\E2E_v2_QC.jmx',
  'C:\\Users\\Admin\\Downloads\\E2E_v2_QC.jmx'
]

for (const f of targetFiles) {
  applyPathsToJmx(f)
}
