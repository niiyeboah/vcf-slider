import { html, css, PropertyValues, LitElement } from 'lit';
import { query, property, state, customElement } from 'lit/decorators.js';

let hasTouched = false;

/**
 * Check if an event was triggered by touch.
 */
export const isTouch = (e: Event): e is TouchEvent => 'touches' in e;

/**
 * Prevent mobile browsers from handling mouse events (conflicting with touch ones).
 * If we detected a touch interaction before, we prefer reacting to touch events only.
 */
export const isValid = (event: Event): boolean => {
  if (hasTouched && !isTouch(event)) return false;
  if (!hasTouched) hasTouched = isTouch(event);
  return true;
};

/**
 * `<vcf-slider>` Slider web component for the Vaadin platform.
 *
 * @csspart container - Wrapper element.
 * @csspart line - Line element.
 * @csspart knob - Knob elements.
 * @csspart knob-n - Nth knob element.
 */
@customElement('vcf-slider')
export class Slider extends LitElement {
  @property({ type: Boolean, reflect: true }) labels = true;
  @property({ type: Number }) value: number | number[] = 0;
  @property({ type: Number }) ranges = 0;
  @property({ type: Number }) step = 1;
  @property({ type: Number }) min = 0;
  @property({ type: Number }) max = 100;

  @state() private knobs = 1;

  private knob?: HTMLElement;
  private originalKnobOffsetX = 0;
  private originalPointerX = 0;

  @query('#knobs') private knobsContainer?: HTMLElement;
  @query('#line') private line?: HTMLElement;
  @query('#line-color') private lineColor?: HTMLElement;

  protected static is() {
    return 'vcf-slider';
  }

  protected static get version() {
    return '1.0.5';
  }

  static get styles() {
    return css`
      :host {
        display: block;
        margin: var(--lumo-space-s) 0;
        --vcf-slider-padding: var(--lumo-space-xs);
        --vcf-slider-line-width: calc(100% - 2 * var(--vcf-slider-padding));
        --vcf-slider-line-height: var(--lumo-space-s);
        --vcf-slider-knob-size: var(--lumo-space-m);
        --vcf-slider-line-color: var(--lumo-contrast-50pct);
        --vcf-slider-line-alternate-color: var(--lumo-contrast-30pct);
        /* ALIASES */
        --l-height: var(--vcf-slider-line-height);
        --k-size: var(--vcf-slider-knob-size);
      }

      #container {
        width: var(--vcf-slider-line-width);
        padding: var(--vcf-slider-padding);
      }

      #line {
        position: relative;
        width: 100%;
        height: var(--l-height);
        border-radius: var(--lumo-border-radius-m);
        background-color: var(--lumo-contrast-30pct);
      }

      #line-color {
        position: absolute;
        top: 0;
        right: 0;
        bottom: 0;
        left: 0;
        border-radius: var(--lumo-border-radius-m);
      }

      [part~='knob'] {
        position: absolute;
        top: calc(-0.5 * var(--k-size) + calc(0.5 * var(--l-height)));
        width: var(--k-size);
        height: var(--k-size);
        border-radius: var(--lumo-border-radius-l);
        box-shadow: var(--lumo-box-shadow-s);
        user-select: none;
        background-color: var(--lumo-primary-color);
      }

      [part~='knob'].alternate {
        background-color: var(--lumo-error-color);
      }

      [part~='label'] {
        display: none;
        position: absolute;
        top: calc(-0.5 * var(--k-size) + calc(0.5 * var(--l-height)) - calc(2 * var(--lumo-space-m)));
        border-radius: var(--lumo-border-radius-s);
        box-shadow: var(--lumo-box-shadow-xs);
        background-color: var(--lumo-base-color);
        padding: 0 var(--lumo-space-s);
        font-size: var(--lumo-font-size-s);
      }

      :host([labels]) [part~='label'] {
        display: block;
      }
    `;
  }

  render() {
    return html`
      <div id="container" part="container">
        <div id="line" part="line">
          <div id="line-color" part="line-color"></div>
          <div id="knobs" part="knobs"></div>
        </div>
      </div>
    `;
  }

  updated(props: PropertyValues) {
    const { ranges, labels, step } = this;

    if (props.has('labels')) {
      this.style.paddingTop = labels ? 'var(--lumo-space-l)' : '0';
    }

    if (props.has('ranges')) {
      if (typeof ranges === 'number' && ranges >= 0) this.knobs = 2 * ranges || 1;
      else this.ranges = 0;
    }

    if (this.knobs && (props.has('ranges') || props.has('ranges') || props.has('ranges'))) {
      this.setKnobElements();
      this.setInitialValue();
    }

    if (props.has('step')) {
      if (!Number.isSafeInteger(step)) this.step = Math.round(step);
      if (step < 1) this.step = 1;
    }

    if (props.has('value')) {
      this.setLabelValues();
      this.knobIndexes.forEach(i => {
        this.setAriaValues(i);
        this.setLabelPosition(i);
        this.setKnobPostion(i);
        this.setLineColors();
      });

      // TODO
      this.dispatchEvent(new CustomEvent('change', { detail: { value: this.value } }));
    }
  }

  /** @private */
  handleEvent(e: Event) {
    const knob = e.target as HTMLElement;
    const isKnobClick = !hasTouched && (e as MouseEvent).button !== 0;
    switch (e.type) {
      case 'mousedown':
      case 'touchstart':
        e.preventDefault();
        if (!isValid(e) || isKnobClick) return;
        knob.focus();
        this.startDrag(e);
        this.dragging = true;
        break;
      case 'mousemove':
      case 'touchmove':
        this.drag(e);
        break;
      case 'mouseup':
      case 'touchend':
        this.dragging = false;
        break;
      case 'keydown':
        this.keyMove(e, Slider.getKnobIndex(knob));
        break;
    }
  }

  private addKnobEvents(knob: HTMLElement) {
    knob.addEventListener('mousedown', this);
    knob.addEventListener('touchstart', this);
    knob.addEventListener('keydown', this);
  }

  private setLabelValues() {
    const { knobIndexes, values } = this;
    knobIndexes.forEach(i => {
      const labelElement = this.labelElement(i) as HTMLElement;
      if (labelElement) labelElement.innerText = `${values[i]}`;
    });
  }

  private setAriaValues(i = 0) {
    const { values, knobs, min, max } = this;
    const knob = this.knobElement(i) as HTMLElement;
    if (knob) {
      knob.setAttribute('aria-valuenow', `${values[i]}`);
      knob.setAttribute('aria-valuemin', `${knobs === 1 ? min : this.getPrevNeighborValue(i)}`);
      knob.setAttribute('aria-valuemax', `${knobs === 1 ? max : this.getNextNeighborValue(i)}`);
    }
  }

  private get initialValue() {
    const { knobs, min, max, step } = this;
    const valueStep = (max - min) / (knobs - 1);
    const values: number[] = [];
    this.knobIndexes.forEach(i => {
      let init = Math.round(i === 0 ? min : i < knobs - 1 ? i * valueStep : max);
      init -= init % step;
      values.push(init < min ? min : init > max ? max : init);
    });
    return values;
  }

  private get values() {
    const { value } = this;
    return (Array.isArray(value) ? value : [value || 0]) as number[];
  }

  private setInitialValue() {
    this.value = this.initialValue;
    this.knobIndexes.map(i => this.setKnobPostion(i));
    this.setLineColors();
  }

  private setKnobPostion(i = 0) {
    const { min, max, values } = this;
    const lineWidth = this.lineBounds!.width;
    const knob = this.knobElement(i) as HTMLElement;
    if (knob) {
      const knobWidth = this.getBounds(knob).width;
      const position = ((values[i] - min) / (max - min)) * lineWidth - knobWidth / 2;
      knob.style.left = `${position}px`;
    }
  }

  private setLabelPosition(i = 0) {
    const { min, max, values } = this;
    const lineWidth = this.lineBounds!.width;
    const label = this.labelElement(i) as HTMLElement;
    if (label) {
      const labelWidth = this.getBounds(label).width;
      const position = ((values[i] - min) / (max - min)) * lineWidth - labelWidth / 2;
      label.style.left = `${position}px`;
    }
  }

  private setLineColors() {
    const { knobs, min, max, values } = this;
    const length = max - min;
    const lineColor = getComputedStyle(this).getPropertyValue('--vcf-slider-line-color').trim();
    const altLineColor = getComputedStyle(this).getPropertyValue('--vcf-slider-line-alternate-color').trim();
    let colors = '';
    let prevStop = '';
    const color = (i: number) => (i % 2 ? lineColor : knobs > 3 ? 'transparent' : altLineColor);
    values.forEach((value, i) => {
      const adjustedValue = value - min < 0 ? 0 : value - min;
      const stop = `${(adjustedValue / length) * 100}%`;
      if (i === 0) colors += `${knobs === 1 ? lineColor : 'transparent'} ${stop}, `;
      else colors += `${color(i)} ${prevStop} ${stop}, `;
      prevStop = stop;
    });
    colors += `transparent ${prevStop} 100%`;
    this.lineColor!.style.background = `linear-gradient(to right, ${colors})`;
  }

  private static getKnobIndex(knob: HTMLElement) {
    const idMatch = /knob-(.)/.exec(knob.getAttribute('part') || '');
    return idMatch ? Number(idMatch[1]) : 0;
  }

  private set dragging(state: boolean) {
    const toggleEvent = state ? document.addEventListener : document.removeEventListener;
    toggleEvent(hasTouched ? 'touchmove' : 'mousemove', this);
    toggleEvent(hasTouched ? 'touchend' : 'mouseup', this);
  }

  private getPointerX(e: Event) {
    return (e as MouseEvent).pageX || (e as TouchEvent).touches[0].pageX;
  }

  private startDrag = (e: Event) => {
    const { label, knobsContainer } = this;
    this.knob = e.target as HTMLElement;
    this.originalPointerX = this.getPointerX(e);
    this.originalKnobOffsetX = this.getBounds(this.knob).x - this.lineBounds!.x;

    // Move current knob and label to top
    knobsContainer?.appendChild(this.knob);
    knobsContainer?.appendChild(label);
  };

  private drag = (e: Event) => {
    const { knob, knobs, originalKnobOffsetX, originalPointerX, line, lineBounds } = this;
    if (knob && line) {
      const i = Slider.getKnobIndex(knob);
      const knobBounds = this.getBounds(knob);
      let startX = -knobBounds.width / 2;
      let endX = lineBounds!.width - knobBounds.width / 2;
      const part = `knob-${i}`;

      // Set knob limits
      switch (part) {
        case 'knob-0': {
          if (knobs > 1) {
            const toKnob = line.querySelector('[part~="knob-1"]') as HTMLElement;
            endX = this.getBounds(toKnob).x - lineBounds!.x;
          }
          break;
        }
        case `knob-${knobs - 1}`: {
          if (knobs > 1) {
            const fromKnob = line.querySelector(`[part~="knob-${knobs - 2}"]`) as HTMLElement;
            startX = this.getBounds(fromKnob).x - lineBounds!.x;
          }
          break;
        }
        default: {
          const fromKnob = line.querySelector(`[part~="knob-${i - 1}"]`) as HTMLElement;
          const toKnob = line.querySelector(`[part~="knob-${i + 1}"]`) as HTMLElement;
          startX = this.getBounds(fromKnob).x - lineBounds!.x;
          endX = this.getBounds(toKnob).x - lineBounds!.x;
        }
      }

      // Calculate knob position
      let newPositionX = originalKnobOffsetX + (this.getPointerX(e) - originalPointerX);
      const startLimit = newPositionX <= startX;
      const endLimit = newPositionX >= endX;
      newPositionX = startLimit ? startX : endLimit ? endX : newPositionX;

      // Calculate new value
      const { min, max, step, values } = this;
      const length = max - min;
      const pct = (newPositionX + knobBounds.width / 2) / lineBounds!.width;
      const value = Math.round(pct * length + min);

      // Step
      if (value === min || (value > min && Math.abs(value) % step === 0)) {
        // Set new value & knob position
        if (values[i] !== value) {
          values[i] = value;
          this.value = this.knobs === 1 ? value : [...values];
          this.setKnobPostion(i);
        }

        // Change line colors
        this.setLineColors();
      }
    }
  };

  private get label() {
    const i = this.knob ? Slider.getKnobIndex(this.knob) : 0;
    return this.labelElement(i) as HTMLElement;
  }

  private labelElement(i = 0) {
    return this.shadowRoot?.querySelector(`[part~=label-${i}]`) as HTMLElement;
  }

  private knobElement(i = 0) {
    return this.shadowRoot?.querySelector(`[part~=knob-${i}]`);
  }

  private get knobIndexes() {
    return Array.from({ length: this.knobs }, (_, i) => i);
  }

  private setKnobElements() {
    const { knobs, knobIndexes, knobsContainer } = this;
    if (knobs && knobsContainer) {
      knobsContainer.innerHTML = '';
      knobIndexes.map(i => {
        knobsContainer.appendChild(this.createKnobElement(i));
        knobsContainer.appendChild(this.createKnobLabelElement(i));
      });
    }
  }

  private createKnobElement(knobIndex: number): HTMLDivElement {
    const knobElement = document.createElement('div');
    knobElement.tabIndex = knobIndex + 1;
    knobElement.setAttribute('role', 'slider');
    knobElement.setAttribute('part', `knob knob-${knobIndex}`);
    this.addKnobEvents(knobElement);
    if (knobIndex % 2) knobElement.classList.add('alternate');
    return knobElement;
  }

  private createKnobLabelElement(knobIndex: number): HTMLDivElement {
    const labelElement = document.createElement('div');
    labelElement.setAttribute('part', `label label-${knobIndex}`);
    return labelElement;
  }

  private getPrevNeighborValue(knobIndex: number) {
    const { values, step, min } = this;
    let neighboringValue;
    neighboringValue = values[knobIndex - 1];
    const neighborPrecisionOffset = neighboringValue % step;
    if (neighborPrecisionOffset) neighboringValue += step - neighborPrecisionOffset;
    return neighboringValue || min;
  }

  private getNextNeighborValue(knobIndex: number) {
    const { values, step, max } = this;
    let neighboringValue;
    neighboringValue = values[knobIndex + 1];
    const neighborPrecisionOffset = neighboringValue % step;
    if (neighborPrecisionOffset) neighboringValue -= neighborPrecisionOffset;
    return neighboringValue || max;
  }

  private decreaseKnobValue({ knobIndex, single, first = this.min, other }: KnobValueOptions) {
    if (this.knobs === 1) {
      this.value = single;
    } else {
      if (knobIndex === 0) this.values[knobIndex] = first;
      else this.values[knobIndex] = other;
      this.requestUpdate('value', [...this.values]);
    }
  }

  private increaseKnobValue({ knobIndex, single, last = this.max, other }: KnobValueOptions) {
    if (this.knobs === 1) {
      this.value = single;
    } else {
      if (knobIndex === this.knobs - 1) this.values[knobIndex] = last;
      else this.values[knobIndex] = other;
      this.requestUpdate('value', [...this.values]);
    }
  }

  private decreaseKnobValueByStep(knobIndex: number) {
    const { min, values, step } = this;
    this.decreaseKnobValue({
      knobIndex,
      // Use the smallest number between max value and requested value.
      single: Math.max(min, values[0] - step),
      // Use the smallest number between max value and requested value.
      first: Math.max(min, values[0] - step),
      // Use the smallest number between max value, requested value, and the neighboring value.
      other: Math.max(min, values[knobIndex] - step, this.getPrevNeighborValue(knobIndex)),
    });
  }

  private decreaseKnobValueToLowest(knobIndex: number) {
    const { min } = this;
    this.decreaseKnobValue({
      knobIndex,
      single: min,
      first: min,
      // Use the biggest number between min value and the neighboring value.
      other: Math.max(min, this.getPrevNeighborValue(knobIndex)),
    });
  }

  private increaseKnobValueByStep(knobIndex: number) {
    const { step, max, values } = this;
    this.increaseKnobValue({
      knobIndex,
      // Use the smallest number between max value and requested value.
      single: Math.min(max, values[0] + step),
      // Use the smallest number between max value and requested value.
      last: Math.min(max, values[knobIndex] + step),
      // Use the smallest number between max value, requested value, and the neighboring value.
      other: Math.min(max, values[knobIndex] + step, this.getNextNeighborValue(knobIndex)),
    });
  }

  private increaseKnobValueToHighest(knobIndex: number) {
    const { max } = this;
    this.increaseKnobValue({
      knobIndex,
      single: max,
      last: max,
      // Use the smallest number between max value and the neighboring value.
      other: Math.min(this.max, this.getNextNeighborValue(knobIndex)),
    });
  }

  private keyMove(event: Event, knobIndex: number) {
    let flag = false;
    const key = (event as KeyboardEvent).key || (event as KeyboardEvent).keyCode;
    switch (key) {
      case 'ArrowLeft':
      case 37:
      case 'ArrowDown':
      case 40:
        this.decreaseKnobValueByStep(knobIndex);
        flag = true;
        break;
      case 'ArrowRight':
      case 39:
      case 'ArrowUp':
      case 38:
        this.increaseKnobValueByStep(knobIndex);
        flag = true;
        break;
      case 'Home':
      case 36:
        this.decreaseKnobValueToLowest(knobIndex);
        flag = true;
        break;
      case 'End':
      case 35:
        this.increaseKnobValueToHighest(knobIndex);
        flag = true;
        break;
      default:
        break;
    }
    if (flag) {
      event.preventDefault();
      event.stopPropagation();
    }
  }

  private getBounds(el: HTMLElement) {
    return el.getBoundingClientRect();
  }

  private get lineBounds() {
    return this.getBounds(this.line!);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'vcf-slider': Slider;
  }
}

interface KnobValueOptions {
  knobIndex: number;
  single: number;
  first?: number;
  last?: number;
  other: number;
}
