// src/shared/industryTemplates.js
// NOTE TO IMPLEMENTER: the `recommended_modules` keys below must match the
// actual `module_key` values already used in `org_module_activations` and
// the Marketplace registry. 

export const INDUSTRY_TEMPLATES = [
  {
    key: "it_agency",
    label: "IT & Software Services",
    description: "Software development, digital agencies, IT consulting.",
    recommended_modules: ["hr", "attendance", "leave", "payroll", "projects", "crm", "helpdesk"],
    leave_types: [
      { name: "Casual Leave", days_per_year: 12, requires_approval: true },
      { name: "Sick Leave", days_per_year: 8, requires_approval: true },
      { name: "Work From Home", days_per_year: null, requires_approval: true }
    ],
    salary_components: [
      { name: "Basic", type: "allowance" },
      { name: "HRA", type: "allowance" },
      { name: "Special Allowance", type: "allowance" },
      { name: "Provident Fund", type: "deduction" }
    ],
    departments: ["Engineering", "Design", "Sales", "Client Success", "Operations"],
    known_limitations: []
  },
  {
    key: "manufacturing",
    label: "Manufacturing",
    description: "Factories and production facilities with shift-based operations.",
    recommended_modules: ["hr", "attendance", "leave", "payroll", "inventory", "finance"],
    leave_types: [
      { name: "Casual Leave", days_per_year: 10, requires_approval: true },
      { name: "Sick Leave", days_per_year: 8, requires_approval: true },
      { name: "Compensatory Off", days_per_year: null, requires_approval: true }
    ],
    salary_components: [
      { name: "Basic", type: "allowance" },
      { name: "Overtime Allowance", type: "allowance" },
      { name: "Provident Fund", type: "deduction" },
      { name: "ESI", type: "deduction" },
      { name: "Professional Tax", type: "deduction" }
    ],
    departments: ["Production", "Quality Control", "Warehouse", "Maintenance", "Administration"],
    known_limitations: ["Rotating/on-call shift rosters are not currently supported — Attendance assumes a simpler shift pattern."]
  },
  {
    key: "retail",
    label: "Retail & Retail Chains",
    description: "Multi-location retail operations with shift-based staff.",
    recommended_modules: ["hr", "attendance", "leave", "payroll", "inventory", "finance"],
    leave_types: [
      { name: "Casual Leave", days_per_year: 10, requires_approval: true },
      { name: "Sick Leave", days_per_year: 6, requires_approval: true }
    ],
    salary_components: [
      { name: "Basic", type: "allowance" },
      { name: "Shift Allowance", type: "allowance" },
      { name: "Provident Fund", type: "deduction" }
    ],
    departments: ["Store Operations", "Merchandising", "Inventory", "Administration"],
    known_limitations: []
  },
  {
    key: "professional_services",
    label: "Professional Services & Consulting",
    description: "Billable-hours consulting, agencies, and client service firms.",
    recommended_modules: ["hr", "projects", "crm", "leave", "payroll", "finance"],
    leave_types: [
      { name: "Casual Leave", days_per_year: 12, requires_approval: true },
      { name: "Sick Leave", days_per_year: 8, requires_approval: true }
    ],
    salary_components: [
      { name: "Basic", type: "allowance" },
      { name: "HRA", type: "allowance" },
      { name: "Provident Fund", type: "deduction" }
    ],
    departments: ["Consulting", "Client Services", "Business Development", "Operations"],
    known_limitations: []
  },
  {
    key: "healthcare",
    label: "Healthcare & Clinics",
    description: "Clinics and small hospitals with clinical and administrative staff.",
    recommended_modules: ["hr", "attendance", "leave", "payroll"],
    leave_types: [
      { name: "Casual Leave", days_per_year: 10, requires_approval: true },
      { name: "Sick Leave", days_per_year: 10, requires_approval: true }
    ],
    salary_components: [
      { name: "Basic", type: "allowance" },
      { name: "Provident Fund", type: "deduction" }
    ],
    departments: ["Clinical Staff", "Nursing", "Administration", "Facilities"],
    known_limitations: [
      "Round-the-clock rotating/on-call shift rostering is not currently supported.",
      "If you need medical-supply inventory tracking, Crewly's Inventory module is general-purpose, not built for specialized medical stock rules."
    ]
  },
  {
    key: "education",
    label: "Education & Training Institutes",
    description: "Schools, coaching centers, and training institutes.",
    recommended_modules: ["hr", "attendance", "leave", "payroll"],
    leave_types: [
      { name: "Casual Leave", days_per_year: 10, requires_approval: true },
      { name: "Sick Leave", days_per_year: 6, requires_approval: true }
    ],
    salary_components: [
      { name: "Basic", type: "allowance" },
      { name: "Provident Fund", type: "deduction" }
    ],
    departments: ["Teaching Staff", "Administration", "Facilities"],
    known_limitations: [
      "Academic-calendar-aware leave policies (term breaks, long vacations) are not currently supported — leave uses a flat annual quota.",
      "Period/subject-based attendance is not currently supported — Attendance assumes one shift per day."
    ]
  },
  {
    key: "logistics",
    label: "Logistics, Distribution & Trading",
    description: "Warehousing, distribution, and trading companies.",
    recommended_modules: ["inventory", "hr", "attendance", "crm", "finance", "payroll"],
    leave_types: [
      { name: "Casual Leave", days_per_year: 10, requires_approval: true },
      { name: "Sick Leave", days_per_year: 8, requires_approval: true }
    ],
    salary_components: [
      { name: "Basic", type: "allowance" },
      { name: "Provident Fund", type: "deduction" }
    ],
    departments: ["Warehouse Operations", "Logistics", "Sales", "Administration"],
    known_limitations: []
  },
  {
    key: "construction",
    label: "Construction & Real Estate",
    description: "Site-based construction and real estate development.",
    recommended_modules: ["projects", "hr", "attendance", "inventory", "finance", "payroll"],
    leave_types: [
      { name: "Casual Leave", days_per_year: 10, requires_approval: true },
      { name: "Sick Leave", days_per_year: 8, requires_approval: true }
    ],
    salary_components: [
      { name: "Basic", type: "allowance" },
      { name: "Site Allowance", type: "allowance" },
      { name: "Provident Fund", type: "deduction" }
    ],
    departments: ["Site Operations", "Engineering", "Procurement", "Administration"],
    known_limitations: [
      "Tracking non-employee/subcontracted labor (day labor, contracted crews) is not fully supported — the current model assumes everyone is a full employee record."
    ]
  }
];
