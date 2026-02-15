import type { FilterEngine } from './filter'

export function initPlatformDropdown(engine: FilterEngine): void {
	const toggle = document.querySelector<HTMLButtonElement>('#platform-dropdown-toggle')
	const dropdown = document.querySelector<HTMLDivElement>('#platform-dropdown')
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

	// Platform checkbox changes
	const checkboxes = dropdown.querySelectorAll<HTMLInputElement>('[data-platform-checkbox]')
	for (const cb of checkboxes) {
		cb.addEventListener('change', () => {
			const state = engine.getState()
			const platform = cb.dataset.platformCheckbox!
			let platforms: string[]

			if (cb.checked) {
				platforms = [...state.selectedPlatforms, platform]
			} else {
				platforms = state.selectedPlatforms.filter((p) => p !== platform)
			}

			engine.setState({ selectedPlatforms: platforms })
			updateToggleLabel(toggle, platforms)
		})
	}

	// Update toggle label
	updateToggleLabel(toggle, engine.getState().selectedPlatforms)
}

function updateToggleLabel(toggle: HTMLButtonElement, platforms: string[]): void {
	const label = toggle.querySelector('.platform-label')
	if (!label) return

	if (platforms.length === 0) {
		label.textContent = 'All platforms'
	} else if (platforms.length === 1) {
		label.textContent = platforms[0]
	} else {
		label.textContent = `${platforms.length} platforms`
	}
}
