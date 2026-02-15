import type { FilterEngine } from './filter'

export function initComplianceDropdown(engine: FilterEngine): void {
	const toggle = document.querySelector<HTMLButtonElement>('#compliance-dropdown-toggle')
	const dropdown = document.querySelector<HTMLDivElement>('#compliance-dropdown')
	if (!toggle || !dropdown) return

	// Toggle dropdown visibility
	toggle.addEventListener('click', (e) => {
		e.stopPropagation()
		const isHidden = dropdown.classList.toggle('hidden')
		toggle.setAttribute('aria-expanded', String(!isHidden))
	})

	// Close on outside click
	document.addEventListener('click', (e) => {
		if (!dropdown.contains(e.target as Node) && e.target !== toggle) {
			dropdown.classList.add('hidden')
			toggle.setAttribute('aria-expanded', 'false')
		}
	})

	// Compliance checkbox changes (desktop dropdown)
	const checkboxes = dropdown.querySelectorAll<HTMLInputElement>('[data-compliance-checkbox]')
	for (const cb of checkboxes) {
		cb.addEventListener('change', () => {
			const compliance = getSelectedCompliance(dropdown)
			// Sync mobile checkboxes
			syncComplianceCheckboxes(compliance, 'compliance-dropdown-mobile')
			engine.setState({ selectedCompliance: compliance })
			updateComplianceLabel(compliance)
		})
	}

	// Mobile dropdown
	const toggleMobile = document.querySelector<HTMLButtonElement>('#compliance-dropdown-toggle-mobile')
	const dropdownMobile = document.querySelector<HTMLDivElement>('#compliance-dropdown-mobile')
	if (toggleMobile && dropdownMobile) {
		toggleMobile.addEventListener('click', (e) => {
			e.stopPropagation()
			const isHidden = dropdownMobile.classList.toggle('hidden')
			toggleMobile.setAttribute('aria-expanded', String(!isHidden))
		})

		document.addEventListener('click', (e) => {
			if (!dropdownMobile.contains(e.target as Node) && e.target !== toggleMobile) {
				dropdownMobile.classList.add('hidden')
				toggleMobile.setAttribute('aria-expanded', 'false')
			}
		})

		const mobileCheckboxes = dropdownMobile.querySelectorAll<HTMLInputElement>('[data-compliance-checkbox]')
		for (const cb of mobileCheckboxes) {
			cb.addEventListener('change', () => {
				const compliance = getSelectedCompliance(dropdownMobile)
				// Sync desktop checkboxes
				syncComplianceCheckboxes(compliance, 'compliance-dropdown')
				engine.setState({ selectedCompliance: compliance })
				updateComplianceLabel(compliance)
			})
		}
	}

	// Init label from state
	updateComplianceLabel(engine.getState().selectedCompliance)
}

function getSelectedCompliance(container: HTMLElement): string[] {
	const checked = container.querySelectorAll<HTMLInputElement>('[data-compliance-checkbox]:checked')
	return Array.from(checked).map((cb) => cb.dataset.complianceCheckbox!)
}

function syncComplianceCheckboxes(selected: string[], containerId: string): void {
	const container = document.getElementById(containerId)
	if (!container) return
	const checkboxes = container.querySelectorAll<HTMLInputElement>('[data-compliance-checkbox]')
	for (const cb of checkboxes) {
		cb.checked = selected.includes(cb.dataset.complianceCheckbox || '')
	}
}

function updateComplianceLabel(compliance: string[]): void {
	const labels = document.querySelectorAll('.compliance-label')
	for (const label of labels) {
		if (compliance.length === 0) {
			label.textContent = 'Compliance'
		} else if (compliance.length === 1) {
			label.textContent = formatComplianceName(compliance[0])
		} else {
			label.textContent = `${compliance.length} certifications`
		}
	}
}

function formatComplianceName(key: string): string {
	const names: Record<string, string> = {
		soc2: 'SOC 2',
		iso27001: 'ISO 27001',
		hipaa: 'HIPAA',
		cra: 'CRA',
		fedramp: 'FedRAMP',
	}
	return names[key] || key
}
