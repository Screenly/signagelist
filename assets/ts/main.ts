import { initComplianceDropdown } from './compliance-dropdown'
import { FilterEngine } from './filter'
import { initGitHubStars } from './github-stars'
import { initPlatformDropdown } from './platform-dropdown'
import { initSearch } from './search'
import { initSort } from './sort'
import { initUrlSync } from './url-sync'

document.addEventListener('DOMContentLoaded', () => {
	// Mobile menu toggle
	const mobileMenuToggle = document.querySelector<HTMLButtonElement>('#mobile-menu-toggle')
	const mobileMenu = document.querySelector<HTMLDivElement>('#mobile-menu')
	const menuIconOpen = document.querySelector<SVGElement>('#menu-icon-open')
	const menuIconClose = document.querySelector<SVGElement>('#menu-icon-close')
	if (mobileMenuToggle && mobileMenu) {
		mobileMenuToggle.addEventListener('click', () => {
			const isOpen = !mobileMenu.classList.contains('hidden')
			mobileMenu.classList.toggle('hidden', isOpen)
			menuIconOpen?.classList.toggle('hidden', !isOpen)
			menuIconClose?.classList.toggle('hidden', isOpen)
			mobileMenuToggle.setAttribute('aria-expanded', String(!isOpen))
		})
	}

	// Mobile filter toggle
	const mobileFilterToggle = document.querySelector<HTMLButtonElement>('#mobile-filter-toggle')
	const mobileSecondaryFilters = document.querySelector<HTMLDivElement>('#mobile-secondary-filters')
	const filterChevron = document.querySelector<SVGElement>('#filter-chevron')
	if (mobileFilterToggle && mobileSecondaryFilters) {
		mobileFilterToggle.addEventListener('click', () => {
			const isOpen = !mobileSecondaryFilters.classList.contains('hidden')
			mobileSecondaryFilters.classList.toggle('hidden', isOpen)
			filterChevron?.classList.toggle('rotate-180', !isOpen)
			mobileFilterToggle.setAttribute('aria-expanded', String(!isOpen))
		})
	}

	initGitHubStars()

	const table = document.querySelector<HTMLTableElement>('#product-table')
	if (!table) return

	const engine = new FilterEngine(table)

	// Category buttons
	const categoryBtns = document.querySelectorAll<HTMLButtonElement>('[data-category-btn]')
	for (const btn of categoryBtns) {
		btn.addEventListener('click', () => {
			engine.setState({ category: btn.dataset.categoryBtn! })
			updateCategoryButtons(categoryBtns, engine.getState().category)
		})
	}

	// Open source / Proprietary checkboxes (desktop)
	const osCheckbox = document.querySelector<HTMLInputElement>('#filter-open-source')
	const propCheckbox = document.querySelector<HTMLInputElement>('#filter-proprietary')
	if (osCheckbox) {
		osCheckbox.addEventListener('change', () => {
			engine.setState({ showOpenSource: osCheckbox.checked })
		})
	}
	if (propCheckbox) {
		propCheckbox.addEventListener('change', () => {
			engine.setState({ showProprietary: propCheckbox.checked })
		})
	}

	// Signup filter (desktop)
	const signupCheckbox = document.querySelector<HTMLInputElement>('#filter-signup')
	if (signupCheckbox) {
		signupCheckbox.addEventListener('change', () => {
			engine.setState({ signupIsOpenOnly: signupCheckbox.checked })
		})
	}

	// Mobile filter controls — sync with desktop
	const osMobileCheckbox = document.querySelector<HTMLInputElement>('#filter-open-source-mobile')
	const propMobileCheckbox = document.querySelector<HTMLInputElement>('#filter-proprietary-mobile')
	const signupMobileCheckbox = document.querySelector<HTMLInputElement>('#filter-signup-mobile')
	if (osMobileCheckbox) {
		osMobileCheckbox.addEventListener('change', () => {
			engine.setState({ showOpenSource: osMobileCheckbox.checked })
			if (osCheckbox) osCheckbox.checked = osMobileCheckbox.checked
		})
	}
	if (propMobileCheckbox) {
		propMobileCheckbox.addEventListener('change', () => {
			engine.setState({ showProprietary: propMobileCheckbox.checked })
			if (propCheckbox) propCheckbox.checked = propMobileCheckbox.checked
		})
	}
	if (signupMobileCheckbox) {
		signupMobileCheckbox.addEventListener('change', () => {
			engine.setState({ signupIsOpenOnly: signupMobileCheckbox.checked })
			if (signupCheckbox) signupCheckbox.checked = signupMobileCheckbox.checked
		})
	}

	// Reset filters (both desktop and mobile)
	const resetBtns = document.querySelectorAll<HTMLButtonElement>(
		'#reset-filters, #reset-filters-mobile, #empty-state-reset',
	)
	for (const resetBtn of resetBtns) {
		resetBtn.addEventListener('click', () => {
			engine.setState({
				category: 'CMS',
				searchTerm: '',
				showOpenSource: true,
				showProprietary: true,
				selectedPlatforms: [],
				selectedCompliance: [],
				signupIsOpenOnly: false,
			})
			// Reset UI
			const searchInput = document.querySelector<HTMLInputElement>('#search-input')
			if (searchInput) searchInput.value = ''
			updateCategoryButtons(categoryBtns, 'CMS')
			if (osCheckbox) osCheckbox.checked = true
			if (propCheckbox) propCheckbox.checked = true
			if (signupCheckbox) signupCheckbox.checked = false
			if (osMobileCheckbox) osMobileCheckbox.checked = true
			if (propMobileCheckbox) propMobileCheckbox.checked = true
			if (signupMobileCheckbox) signupMobileCheckbox.checked = false
			// Uncheck platform checkboxes
			const platformCheckboxes = document.querySelectorAll<HTMLInputElement>('[data-platform-checkbox]')
			for (const cb of platformCheckboxes) cb.checked = false
			// Reset platform labels
			const platformLabels = document.querySelectorAll('.platform-label')
			for (const label of platformLabels) label.textContent = 'All platforms'
			// Uncheck compliance checkboxes
			const complianceCheckboxes = document.querySelectorAll<HTMLInputElement>('[data-compliance-checkbox]')
			for (const cb of complianceCheckboxes) cb.checked = false
			// Reset compliance labels
			const complianceLabels = document.querySelectorAll('.compliance-label')
			for (const label of complianceLabels) label.textContent = 'Compliance'
		})
	}

	// Show/hide reset button when filters change
	engine.onChange(() => {
		const state = engine.getState()
		const isDefault =
			state.category === 'CMS' &&
			!state.searchTerm &&
			state.showOpenSource &&
			state.showProprietary &&
			state.selectedPlatforms.length === 0 &&
			state.selectedCompliance.length === 0 &&
			!state.signupIsOpenOnly
		const allResetBtns = document.querySelectorAll('#reset-filters, #reset-filters-mobile')
		for (const btn of allResetBtns) {
			btn.classList.toggle('hidden', isDefault)
		}
	})

	initSearch(engine)
	initSort(engine)
	initUrlSync(engine)
	initPlatformDropdown(engine)
	initComplianceDropdown(engine)

	// Track outbound link clicks via PostHog
	document.addEventListener('click', (e) => {
		const link = (e.target as HTMLElement).closest<HTMLAnchorElement>('a.outbound-link')
		if (!link) return
		const product = link.dataset.product || ''
		const href = link.href
		if (typeof window.posthog?.capture === 'function') {
			window.posthog.capture('outbound_link_click', {
				product,
				url: href,
			})
		}
	})

	engine.applyFilters()
})

function updateCategoryButtons(buttons: NodeListOf<HTMLButtonElement>, activeCategory: string): void {
	for (const btn of buttons) {
		const isActive = btn.dataset.categoryBtn === activeCategory
		btn.classList.toggle('bg-primary-600', isActive)
		btn.classList.toggle('text-white', isActive)
		btn.classList.toggle('bg-white', !isActive)
		btn.classList.toggle('text-neutral-600', !isActive)
		btn.classList.toggle('ring-1', !isActive)
		btn.classList.toggle('ring-neutral-200', !isActive)
	}
}
