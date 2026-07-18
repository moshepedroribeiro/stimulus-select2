import { Controller } from '@hotwired/stimulus';

export default class Select2Controller extends Controller {
    static targets = ['search', 'option', 'dropdown', 'selected', 'hiddenInput', 'placeholder'];
    static values = {
        multiple: { type: Boolean, default: false },
        placeholder: { type: String, default: '' },
        noResults: { type: String, default: 'Nenhum resultado encontrado' },
        clearable: { type: Boolean, default: false },
    };

    connect() {
        this._selectedValues = new Map();
        this._open = false;
        this._initFromHiddenInput();
        this._renderSelected();
        document.addEventListener('click', this._onOutsideClick);
    }

    disconnect() {
        document.removeEventListener('click', this._onOutsideClick);
    }

    toggleDropdown(event) {
        event.stopPropagation();
        if (this._open) {
            this._closeDropdown();
        } else {
            this._openDropdown();
        }
    }

    search() {
        const query = this.searchTarget.value
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '');
        let hasVisible = false;

        this.optionTargets.forEach(option => {
            const text = option.dataset.label
                .toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '');
            const matches = text.includes(query);
            option.hidden = !matches;
            if (matches) hasVisible = true;
        });

        const noResults = this.dropdownTarget.querySelector('[data-select2-no-results]');
        if (noResults) noResults.hidden = hasVisible;
    }

    selectOption(event) {
        event.stopPropagation();
        const option = event.currentTarget;
        const value = option.dataset.value;
        const label = option.dataset.label;

        if (this.multipleValue) {
            if (this._selectedValues.has(value)) {
                this._selectedValues.delete(value);
                option.classList.remove('select2-option--selected');
            } else {
                this._selectedValues.set(value, label);
                option.classList.add('select2-option--selected');
            }
            this._renderSelected();
            this._updateHiddenInputs();
        } else {
            this._selectedValues.clear();
            this._selectedValues.set(value, label);
            this.optionTargets.forEach(o => o.classList.remove('select2-option--selected'));
            option.classList.add('select2-option--selected');
            this._renderSelected();
            this._updateHiddenInputs();
            this._closeDropdown();
        }
    }

    removeTag(event) {
        event.stopPropagation();
        const value = event.currentTarget.dataset.value;
        this._selectedValues.delete(value);
        const option = this.optionTargets.find(o => o.dataset.value === value);
        if (option) option.classList.remove('select2-option--selected');
        this._renderSelected();
        this._updateHiddenInputs();
    }

    clearAll(event) {
        event.stopPropagation();
        this._selectedValues.clear();
        this.optionTargets.forEach(o => o.classList.remove('select2-option--selected'));
        this._renderSelected();
        this._updateHiddenInputs();
    }

    _openDropdown() {
        this._open = true;
        this.dropdownTarget.classList.add('select2-dropdown--open');
        this._positionDropdown();

        if (this.hasSearchTarget) {
            this.searchTarget.value = '';
            this.search();
            this.searchTarget.focus();
        }
    }

    _closeDropdown() {
        if (!this._open) return;
        this._open = false;
        this.dropdownTarget.classList.remove('select2-dropdown--open');

        if (this.hasSearchTarget) {
            this.searchTarget.value = '';
            this.search();
        }
    }

    _positionDropdown() {
        if (!this._open) return;

        const triggerRect = this.element.getBoundingClientRect();
        const dropdown = this.dropdownTarget;

        const spaceBelow = window.innerHeight - triggerRect.bottom;
        const spaceAbove = triggerRect.top;
        const maxDropdownHeight = 240;

        // Check if we need to drop up (not enough space below, but enough space above)
        if (spaceBelow < maxDropdownHeight && spaceAbove > spaceBelow) {
            dropdown.style.top = 'auto';
            dropdown.style.bottom = '100%';
            dropdown.style.marginTop = '0';
            dropdown.style.marginBottom = '4px';
        } else {
            dropdown.style.top = '100%';
            dropdown.style.bottom = 'auto';
            dropdown.style.marginTop = '4px';
            dropdown.style.marginBottom = '0';
        }
    }

    _onOutsideClick = event => {
        if (!this.element.contains(event.target)) {
            this._closeDropdown();
        }
    };

    _initFromHiddenInput() {
        this.hiddenInputTargets.forEach(input => {
            const value = input.value;
            if (!value) return;
            const option = this.optionTargets.find(o => o.dataset.value === value);
            if (option) {
                this._selectedValues.set(value, option.dataset.label);
                option.classList.add('select2-option--selected');
            }
        });
    }

    _renderSelected() {
        const container = this.selectedTarget;
        container.innerHTML = '';

        if (this._selectedValues.size === 0) {
            const placeholder = document.createElement('span');
            placeholder.className = 'select2-placeholder';
            placeholder.textContent = this.placeholderValue;
            container.appendChild(placeholder);
            return;
        }

        if (this.multipleValue) {
            this._selectedValues.forEach((label, value) => {
                const tag = document.createElement('span');
                tag.className = 'select2-tag';
                tag.innerHTML = `<span class="select2-tag__label">${label}</span><button type="button" class="select2-tag__remove" data-action="click->select2#removeTag" data-value="${value}" aria-label="Remover">&times;</button>`;
                container.appendChild(tag);
            });
        } else {
            const [, label] = [...this._selectedValues.entries()][0];
            const span = document.createElement('span');
            span.className = 'select2-single-value';
            span.textContent = label;
            container.appendChild(span);
        }
    }

    _updateHiddenInputs() {
        const name = this.element.dataset.select2Name;
        if (!name) return;

        if (!this.multipleValue) {
            // For single select, update the existing hidden input to preserve Stimulus targets/actions
            let input = this.hiddenInputTargets[0];
            if (!input) {
                input = document.createElement('input');
                input.type = 'hidden';
                input.name = name;
                input.dataset.select2Target = 'hiddenInput';
                this.element.appendChild(input);
            }

            if (this._selectedValues.size === 0) {
                input.value = '';
            } else {
                const [value] = [...this._selectedValues.keys()];
                input.value = value;
            }

            // Dispatch change event to trigger other Stimulus controllers
            input.dispatchEvent(new Event('change', { bubbles: true }));
            return;
        }

        // For multiple select, recreate inputs
        this.hiddenInputTargets.forEach(input => input.remove());

        if (this._selectedValues.size === 0) {
            const empty = document.createElement('input');
            empty.type = 'hidden';
            empty.name = name;
            empty.value = '';
            empty.dataset.select2Target = 'hiddenInput';
            this.element.appendChild(empty);

            empty.dispatchEvent(new Event('change', { bubbles: true }));
            return;
        }

        this._selectedValues.forEach((_, value) => {
            const input = document.createElement('input');
            input.type = 'hidden';
            input.name = name;
            input.value = value;
            input.dataset.select2Target = 'hiddenInput';
            this.element.appendChild(input);

            input.dispatchEvent(new Event('change', { bubbles: true }));
        });
    }
}
